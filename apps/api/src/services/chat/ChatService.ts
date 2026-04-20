import { PrismaClient, ChatRole } from '@prisma/client';
import {
  AnthropicProvider,
  getSystemPrompt,
  getDataQueryPrompt,
  getWelcomeMessage,
  getSuggestions,
  ErrorResponses,
  PromptContext,
} from '../ai';
import { IntentClassifier, ChatIntent, INTENT_PERMISSIONS } from './IntentClassifier';
import { QueryExecutor, QueryResult } from './QueryExecutor';

/**
 * User context for chat session
 */
export interface ChatUserContext {
  userId: number;
  userName: string;
  userRole: string;
  permissions: string[];
  tenantId: number;
  tenantName: string;
  preferredLanguage: 'en' | 'ur' | 'both';
}

/**
 * Chat message structure
 */
export interface ChatMessageInput {
  conversationId?: number;
  content: string;
}

/**
 * Chat response structure
 */
export interface ChatResponse {
  conversationId: number;
  messageId: number;
  content: string;
  contentUrdu?: string;
  intent: string;
  suggestions: string[];
  data?: any;
  tokensUsed?: number;
  latencyMs?: number;
}

/**
 * Rate limiter (simple in-memory implementation)
 */
class RateLimiter {
  private requests = new Map<string, number[]>();
  private limits = {
    perMinute: 10,
    perHour: 60,
  };

  isAllowed(userId: number, tenantId: number): boolean {
    const key = `${tenantId}:${userId}`;
    const now = Date.now();
    const minuteAgo = now - 60 * 1000;
    const hourAgo = now - 60 * 60 * 1000;

    let timestamps = this.requests.get(key) || [];
    timestamps = timestamps.filter((t) => t > hourAgo);

    const lastMinute = timestamps.filter((t) => t > minuteAgo).length;
    const lastHour = timestamps.length;

    if (lastMinute >= this.limits.perMinute || lastHour >= this.limits.perHour) {
      return false;
    }

    timestamps.push(now);
    this.requests.set(key, timestamps);
    return true;
  }
}

/**
 * Main Chat Service
 */
class ChatServiceClass {
  private rateLimiter = new RateLimiter();

  /**
   * Process a chat message and return response
   */
  async processMessage(
    prisma: PrismaClient,
    userContext: ChatUserContext,
    message: ChatMessageInput
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    // Check rate limit
    if (!this.rateLimiter.isAllowed(userContext.userId, userContext.tenantId)) {
      return this.createErrorResponse(
        'rate_limited',
        userContext.preferredLanguage
      );
    }

    // Get or create conversation
    const conversation = await this.getOrCreateConversation(
      prisma,
      userContext,
      message.conversationId
    );

    // Save user message
    const userMessage = await this.saveMessage(prisma, conversation.id, 'USER', message.content);

    // Classify intent
    const intent = await IntentClassifier.classify(message.content);

    // Check permission
    if (!this.hasPermission(intent, userContext.permissions)) {
      const response = await this.createPermissionDeniedResponse(
        prisma,
        conversation.id,
        intent,
        userContext.preferredLanguage
      );
      return response;
    }

    // Handle special intents
    if (intent === 'greeting') {
      return await this.handleGreeting(prisma, conversation.id, userContext);
    }

    if (intent === 'help') {
      return await this.handleHelp(prisma, conversation.id, userContext);
    }

    // Execute query
    const queryResult = await QueryExecutor.execute(intent, prisma);

    // Generate AI response
    const aiResponse = await this.generateResponse(
      message.content,
      intent,
      queryResult,
      userContext
    );

    // Save assistant message
    const assistantMessage = await this.saveMessage(
      prisma,
      conversation.id,
      'ASSISTANT',
      aiResponse.content,
      aiResponse.contentUrdu,
      intent,
      aiResponse.tokensUsed,
      aiResponse.latencyMs
    );

    // Update conversation
    await this.updateConversation(prisma, conversation.id);

    return {
      conversationId: conversation.id,
      messageId: assistantMessage.id,
      content: aiResponse.content,
      contentUrdu: aiResponse.contentUrdu,
      intent,
      suggestions: getSuggestions(userContext.userRole, intent),
      data: queryResult.data,
      tokensUsed: aiResponse.tokensUsed,
      latencyMs: Date.now() - startTime,
    };
  }

  /**
   * Get conversation history
   */
  async getHistory(
    prisma: PrismaClient,
    userId: number,
    limit = 20
  ): Promise<any[]> {
    const conversations = await (prisma as any).chatConversation.findMany({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50,
        },
      },
    });

    return conversations;
  }

  /**
   * Get or create conversation
   */
  private async getOrCreateConversation(
    prisma: PrismaClient,
    userContext: ChatUserContext,
    conversationId?: number
  ) {
    if (conversationId) {
      const existing = await (prisma as any).chatConversation.findFirst({
        where: {
          id: conversationId,
          userId: userContext.userId,
        },
      });

      if (existing) {
        return existing;
      }
    }

    // Create new conversation
    return await (prisma as any).chatConversation.create({
      data: {
        userId: userContext.userId,
        language: userContext.preferredLanguage,
        lastMessageAt: new Date(),
        messageCount: 0,
      },
    });
  }

  /**
   * Save a message
   */
  private async saveMessage(
    prisma: PrismaClient,
    conversationId: number,
    role: string,
    content: string,
    contentUrdu?: string,
    intent?: string,
    tokensUsed?: number,
    latencyMs?: number
  ) {
    return await (prisma as any).chatMessage.create({
      data: {
        conversationId,
        role: role as ChatRole,
        content,
        contentUrdu,
        intent,
        tokensUsed,
        latencyMs,
      },
    });
  }

  /**
   * Update conversation stats
   */
  private async updateConversation(prisma: PrismaClient, conversationId: number) {
    await (prisma as any).chatConversation.update({
      where: { id: conversationId },
      data: {
        lastMessageAt: new Date(),
        messageCount: { increment: 2 }, // user + assistant
      },
    });
  }

  /**
   * Check if user has permission for intent
   */
  private hasPermission(intent: ChatIntent, userPermissions: string[]): boolean {
    const required = INTENT_PERMISSIONS[intent];
    if (!required) return true;
    return userPermissions.includes(required);
  }

  /**
   * Generate AI response from query result
   */
  private async generateResponse(
    userQuestion: string,
    intent: ChatIntent,
    queryResult: QueryResult,
    userContext: ChatUserContext
  ): Promise<{
    content: string;
    contentUrdu?: string;
    tokensUsed?: number;
    latencyMs?: number;
  }> {
    if (!AnthropicProvider.isConfigured()) {
      // Fallback to template response if AI not configured
      return this.generateTemplateResponse(intent, queryResult, userContext);
    }

    try {
      const promptContext: PromptContext = {
        userName: userContext.userName,
        userRole: userContext.userRole,
        tenantName: userContext.tenantName,
        preferredLanguage: userContext.preferredLanguage,
        availableModules: this.getAvailableModules(userContext.permissions),
      };

      const systemPrompt = getSystemPrompt(promptContext);
      const dataPrompt = getDataQueryPrompt(
        intent,
        queryResult.data,
        userQuestion,
        userContext.preferredLanguage
      );

      const result = await AnthropicProvider.complete(
        [{ role: 'user', content: dataPrompt }],
        {
          systemPrompt,
          model: AnthropicProvider.selectModel(intent, IntentClassifier.getComplexity(intent)),
          maxTokens: 800,
          temperature: 0.3,
        }
      );

      // Parse bilingual response
      const { english, urdu } = this.parseBilingualResponse(
        result.content,
        userContext.preferredLanguage
      );

      return {
        content: english,
        contentUrdu: urdu,
        tokensUsed: result.totalTokens,
        latencyMs: result.latencyMs,
      };
    } catch (error: any) {
      console.error('AI response generation failed:', error);
      return this.generateTemplateResponse(intent, queryResult, userContext);
    }
  }

  /**
   * Parse bilingual response (separated by ---)
   */
  private parseBilingualResponse(
    content: string,
    language: 'en' | 'ur' | 'both'
  ): { english: string; urdu?: string } {
    if (language !== 'both') {
      return { english: content };
    }

    const parts = content.split(/\n---\n/);
    if (parts.length >= 2) {
      return {
        english: parts[0].trim(),
        urdu: parts[1].trim(),
      };
    }

    return { english: content };
  }

  /**
   * Generate template response (fallback when AI unavailable)
   */
  private generateTemplateResponse(
    intent: ChatIntent,
    queryResult: QueryResult,
    userContext: ChatUserContext
  ): { content: string; contentUrdu?: string } {
    if (!queryResult.success) {
      return {
        content: ErrorResponses.generalError.en,
        contentUrdu:
          userContext.preferredLanguage !== 'en'
            ? ErrorResponses.generalError.ur
            : undefined,
      };
    }

    const summary = queryResult.summary || `Found ${queryResult.count || 0} results.`;

    let content = summary;
    if (queryResult.data && Array.isArray(queryResult.data) && queryResult.data.length > 0) {
      content += '\n\n' + this.formatDataTable(queryResult.data.slice(0, 10));
    }

    return { content };
  }

  /**
   * Format data as simple table
   */
  private formatDataTable(data: any[]): string {
    if (!data.length) return '';

    const keys = Object.keys(data[0]).filter(
      (k) => !k.includes('Id') && typeof data[0][k] !== 'object'
    );
    const headers = keys.join(' | ');
    const divider = keys.map(() => '---').join(' | ');
    const rows = data
      .map((row) =>
        keys
          .map((k) => {
            const val = row[k];
            if (val === null || val === undefined) return '-';
            if (typeof val === 'number') return val.toLocaleString();
            return String(val).substring(0, 20);
          })
          .join(' | ')
      )
      .join('\n');

    return `${headers}\n${divider}\n${rows}`;
  }

  /**
   * Get available modules based on permissions
   */
  private getAvailableModules(permissions: string[]): string[] {
    const moduleMap: Record<string, string> = {
      'yarn:read': 'Yarn',
      'production:read': 'Production',
      'rolls:read': 'Rolls',
      'dyeing:read': 'Dyeing',
      'sales:read': 'Sales',
      'finance:read': 'Finance',
      'receivables:read': 'Receivables',
      'payables:read': 'Payables',
      'cheques:read': 'Cheques',
      'inventory:read': 'Inventory',
    };

    return permissions
      .filter((p) => moduleMap[p])
      .map((p) => moduleMap[p]);
  }

  /**
   * Handle greeting intent
   */
  private async handleGreeting(
    prisma: PrismaClient,
    conversationId: number,
    userContext: ChatUserContext
  ): Promise<ChatResponse> {
    const welcomeMessage = getWelcomeMessage(
      userContext.userName,
      userContext.preferredLanguage
    );

    const { english, urdu } = this.parseBilingualResponse(
      welcomeMessage,
      userContext.preferredLanguage
    );

    const message = await this.saveMessage(
      prisma,
      conversationId,
      'ASSISTANT',
      english,
      urdu,
      'greeting'
    );

    await this.updateConversation(prisma, conversationId);

    return {
      conversationId,
      messageId: message.id,
      content: english,
      contentUrdu: urdu,
      intent: 'greeting',
      suggestions: getSuggestions(userContext.userRole),
    };
  }

  /**
   * Handle help intent
   */
  private async handleHelp(
    prisma: PrismaClient,
    conversationId: number,
    userContext: ChatUserContext
  ): Promise<ChatResponse> {
    const helpContent =
      userContext.preferredLanguage === 'ur'
        ? `میں آپ کی مدد کر سکتا ہوں:\n\n` +
          `• دھاگے کا اسٹاک دیکھیں\n` +
          `• پیداوار کی رپورٹ\n` +
          `• کسٹمر بیلنس\n` +
          `• چیک کی حالت\n` +
          `• انوینٹری الرٹس\n\n` +
          `سادہ زبان میں پوچھیں!`
        : `I can help you with:\n\n` +
          `• Check yarn stock levels\n` +
          `• View production reports\n` +
          `• Customer balances and receivables\n` +
          `• Cheque status tracking\n` +
          `• Inventory alerts\n\n` +
          `Just ask in plain language!`;

    const message = await this.saveMessage(
      prisma,
      conversationId,
      'ASSISTANT',
      helpContent,
      undefined,
      'help'
    );

    await this.updateConversation(prisma, conversationId);

    return {
      conversationId,
      messageId: message.id,
      content: helpContent,
      intent: 'help',
      suggestions: getSuggestions(userContext.userRole),
    };
  }

  /**
   * Create permission denied response
   */
  private async createPermissionDeniedResponse(
    prisma: PrismaClient,
    conversationId: number,
    intent: ChatIntent,
    language: 'en' | 'ur' | 'both'
  ): Promise<ChatResponse> {
    const content = ErrorResponses.noPermission.en;
    const contentUrdu = language !== 'en' ? ErrorResponses.noPermission.ur : undefined;

    const message = await this.saveMessage(
      prisma,
      conversationId,
      'ASSISTANT',
      content,
      contentUrdu,
      intent
    );

    return {
      conversationId,
      messageId: message.id,
      content,
      contentUrdu,
      intent,
      suggestions: [],
    };
  }

  /**
   * Create error response
   */
  private createErrorResponse(
    errorType: 'rate_limited' | 'general' | 'ai_unavailable',
    language: 'en' | 'ur' | 'both'
  ): ChatResponse {
    const errors: Record<string, { en: string; ur: string }> = {
      rate_limited: ErrorResponses.rateLimited,
      general: ErrorResponses.generalError,
      ai_unavailable: ErrorResponses.aiUnavailable,
    };

    const error = errors[errorType] || errors.general;

    return {
      conversationId: 0,
      messageId: 0,
      content: error.en,
      contentUrdu: language !== 'en' ? error.ur : undefined,
      intent: 'error',
      suggestions: [],
    };
  }

  /**
   * Delete a conversation
   */
  async deleteConversation(
    prisma: PrismaClient,
    conversationId: number,
    userId: number
  ): Promise<boolean> {
    const result = await (prisma as any).chatConversation.deleteMany({
      where: {
        id: conversationId,
        userId,
      },
    });

    return result.count > 0;
  }
}

// Export singleton instance
export const ChatService = new ChatServiceClass();
