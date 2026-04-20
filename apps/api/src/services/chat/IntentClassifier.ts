import { AnthropicProvider, getIntentClassificationPrompt } from '../ai';

/**
 * Intent types for the chatbot
 */
export type ChatIntent =
  | 'greeting'
  | 'help'
  | 'yarn.stock'
  | 'yarn.vendor'
  | 'yarn.consumption'
  | 'production.summary'
  | 'production.machine'
  | 'production.downtime'
  | 'rolls.grey_stock'
  | 'rolls.dyeing'
  | 'rolls.finished'
  | 'sales.customer'
  | 'sales.balance'
  | 'finance.receivables'
  | 'finance.payables'
  | 'finance.cheques'
  | 'inventory.stock'
  | 'inventory.alerts'
  | 'needles.status'
  | 'needles.damage'
  | 'unknown';

/**
 * Intent to permission mapping
 */
export const INTENT_PERMISSIONS: Record<string, string> = {
  'yarn.stock': 'yarn:read',
  'yarn.vendor': 'yarn:read',
  'yarn.consumption': 'yarn:read',
  'production.summary': 'production:read',
  'production.machine': 'production:read',
  'production.downtime': 'production:read',
  'rolls.grey_stock': 'rolls:read',
  'rolls.dyeing': 'dyeing:read',
  'rolls.finished': 'rolls:read',
  'sales.customer': 'sales:read',
  'sales.balance': 'receivables:read',
  'finance.receivables': 'receivables:read',
  'finance.payables': 'payables:read',
  'finance.cheques': 'cheques:read',
  'inventory.stock': 'inventory:read',
  'inventory.alerts': 'inventory:read',
  'needles.status': 'inventory:read',
  'needles.damage': 'inventory:read',
};

/**
 * Rule-based pattern matching for common queries
 * This reduces AI API calls for simple/common queries
 */
const INTENT_PATTERNS: Array<{ patterns: RegExp[]; intent: ChatIntent }> = [
  // Greetings
  {
    patterns: [
      /^(hi|hello|hey|سلام|السلام علیکم|ہیلو)\b/i,
      /^(good\s*(morning|afternoon|evening))/i,
    ],
    intent: 'greeting',
  },
  // Help
  {
    patterns: [
      /\b(help|مدد|کیا کر سکتے|what can you do)\b/i,
      /^(how|کیسے)\s+(do|can|to)/i,
    ],
    intent: 'help',
  },
  // Yarn Stock
  {
    patterns: [
      /\b(yarn|دھاگ[اے]?)\s*(stock|اسٹاک|inventory|balance)/i,
      /\b(how much|کتن[ای]?)\s*(yarn|دھاگ)/i,
      /\bshow\s*(yarn|thread)\b/i,
    ],
    intent: 'yarn.stock',
  },
  // Yarn Vendor
  {
    patterns: [
      /\b(yarn|دھاگ[اے]?)\s*(vendor|supplier|وینڈر)/i,
      /\b(pay\s*order|پے آرڈر)/i,
    ],
    intent: 'yarn.vendor',
  },
  // Production Summary
  {
    patterns: [
      /\b(production|پیداوار)\s*(summary|report|رپورٹ)/i,
      /\b(today'?s?|آج)\s*(production|output|پیداوار)/i,
      /\b(daily|weekly|monthly)\s*production\b/i,
    ],
    intent: 'production.summary',
  },
  // Machine Status
  {
    patterns: [
      /\b(machine|مشین)\s*(status|condition|حالت)/i,
      /\bwhich\s*machines?\s*(are|is)/i,
      /\b(machine|مشین)\s*(efficiency|کارکردگی)/i,
    ],
    intent: 'production.machine',
  },
  // Downtime
  {
    patterns: [
      /\b(downtime|breakdown|خرابی|بند)/i,
      /\bmachine.*(down|stopped|رکی)/i,
    ],
    intent: 'production.downtime',
  },
  // Grey Stock
  {
    patterns: [
      /\b(grey|gray|گرے)\s*(stock|rolls|رولز)/i,
      /\b(unfinished|raw)\s*rolls\b/i,
    ],
    intent: 'rolls.grey_stock',
  },
  // Dyeing Status
  {
    patterns: [
      /\b(dyeing|dying|ڈائینگ)\s*(status|orders?)/i,
      /\brolls?\s*(at|in|for)\s*dyeing\b/i,
      /\b(sent|returned)\s*(for|from)\s*dyeing\b/i,
    ],
    intent: 'rolls.dyeing',
  },
  // Finished Stock
  {
    patterns: [
      /\b(finished|ready|تیار)\s*(stock|rolls|اسٹاک)/i,
      /\bready\s*to\s*sell\b/i,
    ],
    intent: 'rolls.finished',
  },
  // Customer Info
  {
    patterns: [
      /\b(customer|کسٹمر)\s*(info|list|details)/i,
      /\b(show|list)\s*customers?\b/i,
    ],
    intent: 'sales.customer',
  },
  // Customer Balance / Receivables
  {
    patterns: [
      /\b(customer|کسٹمر)\s*(balance|بیلنس|owes?)/i,
      /\breceivables?\b/i,
      /\b(who|کون)\s*owes?\s*(us|money)/i,
      /\boutstanding\s*(from|amount)/i,
    ],
    intent: 'finance.receivables',
  },
  // Payables
  {
    patterns: [
      /\b(payables?|we\s*owe|vendor\s*balance)/i,
      /\b(ادائیگی|وینڈر بیلنس)/i,
      /\bhow\s*much\s*(do\s*)?we\s*owe\b/i,
    ],
    intent: 'finance.payables',
  },
  // Cheques
  {
    patterns: [
      /\b(cheque|check|چیک)\s*(status|pending|cleared|bounced)/i,
      /\b(pending|معلق)\s*(cheque|check|چیک)/i,
      /\bshow\s*(cheque|check)s?\b/i,
    ],
    intent: 'finance.cheques',
  },
  // Inventory / Stock
  {
    patterns: [
      /\b(inventory|stock|اسٹاک)\s*(level|status)/i,
      /\b(low|کم)\s*stock\b/i,
      /\bstock\s*alert/i,
    ],
    intent: 'inventory.stock',
  },
  // Inventory Alerts
  {
    patterns: [
      /\b(alert|warning|expir)/i,
      /\b(reorder|minimum)\s*stock\b/i,
    ],
    intent: 'inventory.alerts',
  },
  // Needles
  {
    patterns: [
      /\b(needle|سوئی)\s*(status|count|allocated)/i,
      /\bneedles?\s*(on|in)\s*machine/i,
    ],
    intent: 'needles.status',
  },
  // Needle Damage
  {
    patterns: [
      /\b(needle|سوئی)\s*(damage|broken|ٹوٹی)/i,
      /\bdamaged?\s*needles?\b/i,
    ],
    intent: 'needles.damage',
  },
];

/**
 * Intent Classifier Service
 * Uses rule-based matching first, falls back to AI for complex queries
 */
class IntentClassifierClass {
  private intentCache = new Map<string, { intent: ChatIntent; timestamp: number }>();
  private cacheTTL = 5 * 60 * 1000; // 5 minutes

  /**
   * Classify user message intent
   * @param message User's input message
   * @param useAIFallback Whether to use AI for unmatched patterns
   */
  async classify(message: string, useAIFallback = true): Promise<ChatIntent> {
    const normalizedMessage = message.trim().toLowerCase();

    // Check cache first
    const cached = this.intentCache.get(normalizedMessage);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.intent;
    }

    // Try rule-based classification first
    const ruleIntent = this.classifyByRules(normalizedMessage);
    if (ruleIntent !== 'unknown') {
      this.cacheIntent(normalizedMessage, ruleIntent);
      return ruleIntent;
    }

    // Fall back to AI classification if enabled
    if (useAIFallback && AnthropicProvider.isConfigured()) {
      try {
        const aiIntent = await this.classifyByAI(message);
        this.cacheIntent(normalizedMessage, aiIntent);
        return aiIntent;
      } catch (error) {
        console.error('AI intent classification failed:', error);
        return 'unknown';
      }
    }

    return 'unknown';
  }

  /**
   * Rule-based intent classification
   */
  private classifyByRules(message: string): ChatIntent {
    for (const { patterns, intent } of INTENT_PATTERNS) {
      for (const pattern of patterns) {
        if (pattern.test(message)) {
          return intent;
        }
      }
    }
    return 'unknown';
  }

  /**
   * AI-based intent classification (for complex queries)
   */
  private async classifyByAI(message: string): Promise<ChatIntent> {
    const prompt = getIntentClassificationPrompt(message);

    const result = await AnthropicProvider.simpleComplete(prompt, {
      model: 'claude-3-haiku-20240307', // Use cheap model for classification
      maxTokens: 50,
      temperature: 0,
    });

    const intent = result.content.trim().toLowerCase() as ChatIntent;

    // Validate intent is in our list
    const validIntents: ChatIntent[] = [
      'greeting', 'help', 'yarn.stock', 'yarn.vendor', 'yarn.consumption',
      'production.summary', 'production.machine', 'production.downtime',
      'rolls.grey_stock', 'rolls.dyeing', 'rolls.finished',
      'sales.customer', 'sales.balance',
      'finance.receivables', 'finance.payables', 'finance.cheques',
      'inventory.stock', 'inventory.alerts',
      'needles.status', 'needles.damage',
      'unknown',
    ];

    return validIntents.includes(intent) ? intent : 'unknown';
  }

  /**
   * Cache intent for reuse
   */
  private cacheIntent(message: string, intent: ChatIntent): void {
    this.intentCache.set(message, { intent, timestamp: Date.now() });

    // Clean old cache entries periodically
    if (this.intentCache.size > 1000) {
      const now = Date.now();
      for (const [key, value] of this.intentCache.entries()) {
        if (now - value.timestamp > this.cacheTTL) {
          this.intentCache.delete(key);
        }
      }
    }
  }

  /**
   * Get the required permission for an intent
   */
  getRequiredPermission(intent: ChatIntent): string | null {
    return INTENT_PERMISSIONS[intent] || null;
  }

  /**
   * Check if user has permission for the intent
   */
  hasPermission(intent: ChatIntent, userPermissions: string[]): boolean {
    const required = this.getRequiredPermission(intent);
    if (!required) return true; // No permission needed (greeting, help, etc.)
    return userPermissions.includes(required);
  }

  /**
   * Get complexity score for an intent (used for model selection)
   */
  getComplexity(intent: ChatIntent): number {
    const complexIntents = ['production.summary', 'finance.receivables', 'finance.payables'];
    const simpleIntents = ['greeting', 'help', 'unknown'];

    if (simpleIntents.includes(intent)) return 0.1;
    if (complexIntents.includes(intent)) return 0.7;
    return 0.5;
  }
}

// Export singleton instance
export const IntentClassifier = new IntentClassifierClass();
