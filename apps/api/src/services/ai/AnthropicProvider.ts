import Anthropic from '@anthropic-ai/sdk';
import { config } from '../../config';

// Model types - using latest model versions
export type ClaudeModel = 'claude-3-5-haiku-latest' | 'claude-3-5-sonnet-latest' | 'claude-3-opus-latest';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AICompletionOptions {
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
}

export interface AICompletionResult {
  content: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  latencyMs: number;
}

// Default models by complexity
const DEFAULT_MODELS = {
  simple: 'claude-3-5-haiku-latest' as ClaudeModel,
  standard: 'claude-3-5-sonnet-latest' as ClaudeModel,
  complex: 'claude-3-opus-latest' as ClaudeModel,
};

// Token limits by model
const MODEL_LIMITS: Record<ClaudeModel, { input: number; output: number }> = {
  'claude-3-5-haiku-latest': { input: 200000, output: 8192 },
  'claude-3-5-sonnet-latest': { input: 200000, output: 8192 },
  'claude-3-opus-latest': { input: 200000, output: 4096 },
};

class AnthropicProviderClass {
  private client: Anthropic | null = null;
  private initialized = false;

  private getClient(): Anthropic {
    if (!this.client) {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }
      this.client = new Anthropic({ apiKey });
      this.initialized = true;
    }
    return this.client;
  }

  isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  /**
   * Complete a chat conversation
   */
  async complete(
    messages: AIMessage[],
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    const client = this.getClient();
    const startTime = Date.now();

    const model = options.model || DEFAULT_MODELS.standard;
    const maxTokens = Math.min(
      options.maxTokens || 1024,
      MODEL_LIMITS[model].output
    );

    try {
      const response = await client.messages.create({
        model,
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.3,
        system: options.systemPrompt,
        messages: messages.map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });

      const content =
        response.content[0].type === 'text' ? response.content[0].text : '';

      return {
        content,
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        latencyMs: Date.now() - startTime,
      };
    } catch (error: any) {
      // Handle rate limiting
      if (error.status === 429) {
        throw new Error('AI service rate limited. Please try again later.');
      }
      // Handle API errors
      if (error.status === 401) {
        throw new Error('AI service authentication failed. Check API key.');
      }
      throw new Error(`AI completion failed: ${error.message}`);
    }
  }

  /**
   * Simple completion for a single prompt
   */
  async simpleComplete(
    prompt: string,
    options: AICompletionOptions = {}
  ): Promise<AICompletionResult> {
    return this.complete([{ role: 'user', content: prompt }], options);
  }

  /**
   * Select the appropriate model based on query complexity
   */
  selectModel(queryType: string, complexity: number = 0.5): ClaudeModel {
    // Simple queries: greetings, help, basic lookups
    const simplePatterns = [
      'greeting',
      'help',
      'simple_lookup',
      'status_check',
    ];
    if (simplePatterns.some((p) => queryType.includes(p))) {
      return DEFAULT_MODELS.simple;
    }

    // Complex queries: analysis, multi-step reasoning, comparisons
    const complexPatterns = ['analysis', 'compare', 'trend', 'why', 'insight'];
    if (complexPatterns.some((p) => queryType.includes(p)) || complexity > 0.7) {
      return DEFAULT_MODELS.standard; // Use Sonnet for complex (Opus is expensive)
    }

    // Default: standard model
    return complexity > 0.5 ? DEFAULT_MODELS.standard : DEFAULT_MODELS.simple;
  }

  /**
   * Estimate token count for a string (rough approximation)
   */
  estimateTokens(text: string): number {
    // Rough estimate: ~4 chars per token for English
    // Urdu/Arabic script may have different ratios
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if the message fits within model limits
   */
  checkTokenLimits(
    messages: AIMessage[],
    systemPrompt: string,
    model: ClaudeModel
  ): { fits: boolean; estimatedTokens: number; limit: number } {
    const totalText =
      systemPrompt + messages.map((m) => m.content).join(' ');
    const estimatedTokens = this.estimateTokens(totalText);
    const limit = MODEL_LIMITS[model].input;

    return {
      fits: estimatedTokens < limit * 0.9, // Leave 10% buffer
      estimatedTokens,
      limit,
    };
  }
}

// Export singleton instance
export const AnthropicProvider = new AnthropicProviderClass();

// Export types
export { DEFAULT_MODELS, MODEL_LIMITS };
