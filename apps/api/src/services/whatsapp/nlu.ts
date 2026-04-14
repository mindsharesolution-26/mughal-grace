/**
 * Natural Language Understanding Service for WhatsApp Query Bot
 * Supports English and Urdu queries
 */

import { logger } from '../../utils/logger';

// Intent types
export type Intent =
  | 'stock_check'
  | 'order_status'
  | 'production_summary'
  | 'sales_summary'
  | 'payment_status'
  | 'help'
  | 'greeting'
  | 'unknown';

// Entity types
export interface Entity {
  type: 'yarn_code' | 'order_number' | 'date' | 'quantity' | 'customer_name' | 'vendor_name';
  value: string;
  original: string;
}

// Parse result
export interface ParseResult {
  intent: Intent;
  entities: Entity[];
  language: 'en' | 'ur';
  confidence: number;
  originalText: string;
}

// Intent patterns (English and Urdu)
const INTENT_PATTERNS: Record<Intent, RegExp[]> = {
  stock_check: [
    // English
    /(?:what(?:'s| is)?|check|show|get|tell me)?\s*(?:the\s+)?stock\s*(?:of|for)?\s*(.+)?/i,
    /how much\s+(.+)?\s*(?:do we have|in stock|available)?/i,
    /(?:yarn|cotton|polyester)\s*(?:stock|inventory)/i,
    /(?:stock|inventory)\s*(?:check|status|level)/i,
    // Urdu (Romanized)
    /kitna\s+(.+)?\s*(?:hai|baqi|stock)/i,
    /(.+)\s*ka\s*stock/i,
    /stock\s*(?:batao|dekhao)/i,
  ],
  order_status: [
    // English
    /(?:what(?:'s| is)?|check|show|get)?\s*(?:the\s+)?(?:status|update)\s*(?:of|for)?\s*order\s*#?\s*(\w+)?/i,
    /order\s*#?\s*(\w+)\s*(?:status|update|where)/i,
    /where\s+is\s+(?:my\s+)?order\s*#?\s*(\w+)?/i,
    /track(?:ing)?\s+order\s*#?\s*(\w+)?/i,
    // Urdu (Romanized)
    /order\s*(?:#?\s*)?(\w+)?\s*(?:ka|ki)\s*(?:status|halat)/i,
    /order\s*(?:kahan|kya)\s*(?:hai|hua)/i,
  ],
  production_summary: [
    // English
    /(?:what(?:'s| is)?|show|get|give me)?\s*(?:today(?:'s)?|daily|current)?\s*production\s*(?:summary|report|status|update)?/i,
    /how\s+(?:much|many)\s+(?:did we|have we)?\s*produc(?:e|ed)\s*(?:today)?/i,
    /production\s*(?:numbers|stats|figures)/i,
    // Urdu (Romanized)
    /(?:aaj|kal)\s*(?:ki|ka)\s*production/i,
    /production\s*(?:batao|dekhao|report)/i,
    /kitna\s*(?:bana|produce)/i,
  ],
  sales_summary: [
    // English
    /(?:what(?:'s| is)?|show|get|give me)?\s*(?:today(?:'s)?|daily|current)?\s*sales\s*(?:summary|report|status)?/i,
    /how\s+(?:much|many)\s+(?:did we|have we)?\s*(?:sell|sold)\s*(?:today)?/i,
    /sales\s*(?:numbers|stats|figures)/i,
    // Urdu (Romanized)
    /(?:aaj|kal)\s*(?:ki|ka)\s*sale/i,
    /(?:bikri|sale)\s*(?:batao|dekhao|report)/i,
    /kitna\s*(?:becha|bikka)/i,
  ],
  payment_status: [
    // English
    /(?:what(?:'s| is)?|check|show)?\s*(?:pending\s+)?payment(?:s)?\s*(?:status|due)?/i,
    /(?:outstanding|receivable|payable)\s*(?:balance|amount|payment)/i,
    /who\s+owes\s+(?:us|money)/i,
    /(?:customer|vendor)\s*(?:balance|payment|due)/i,
    // Urdu (Romanized)
    /(?:baqi|pending)\s*(?:payment|paisa|raqam)/i,
    /(?:lena|dena)\s*(?:hai|baqi)/i,
    /kisne\s*(?:dena|lena)\s*hai/i,
  ],
  help: [
    // English
    /^(?:help|menu|options|commands|what can you do)$/i,
    /how\s+(?:do|can)\s+(?:i|you)\s+(?:use|help)/i,
    /^(?:\?|help\s*me)$/i,
    // Urdu (Romanized)
    /^(?:madad|help)$/i,
    /kya\s+(?:kar\s+)?sakte\s+(?:ho|hai)/i,
  ],
  greeting: [
    // English
    /^(?:hi|hello|hey|good\s*(?:morning|afternoon|evening)|assalam|salam)/i,
    // Urdu (Romanized)
    /^(?:assalam\s*o?\s*alaikum|salam|aoa|adaab)/i,
  ],
  unknown: [],
};

// Yarn code patterns
const YARN_CODE_PATTERN = /\b(?:COT|POL|VIS|PC|CVC|TC|RAY|LIN|WOL|SLK|ACR|NYL|SPX)-?\d+[A-Z]?-?[A-Z]{0,3}\b/gi;

// Order number patterns
const ORDER_NUMBER_PATTERN = /\b(?:ORD|SO|PO|INV)-?\d{4,10}\b/gi;

// Date patterns
const DATE_PATTERNS = [
  /\b(?:today|tomorrow|yesterday)\b/i,
  /\b(?:aaj|kal|parso)\b/i,
  /\b\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}\b/,
  /\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:st|nd|rd|th)?\b/i,
];

// Language detection patterns
const URDU_PATTERNS = [
  /\b(?:hai|baqi|batao|dekhao|kitna|kya|kahan|aaj|kal|ka|ki|ke|ko|se|ne|mein)\b/i,
  /\b(?:assalam|salam|aoa|adaab|shukriya|mehrbani)\b/i,
];

/**
 * Natural Language Understanding Service
 */
class NLUService {
  /**
   * Parse a user query and extract intent and entities
   */
  parseQuery(text: string): ParseResult {
    const originalText = text.trim();
    const normalizedText = this.normalizeText(originalText);
    const language = this.detectLanguage(normalizedText);

    // Extract entities first
    const entities = this.extractEntities(normalizedText);

    // Detect intent
    const { intent, confidence } = this.detectIntent(normalizedText, entities);

    const result: ParseResult = {
      intent,
      entities,
      language,
      confidence,
      originalText,
    };

    logger.debug('NLU Parse Result:', result);
    return result;
  }

  /**
   * Normalize text for processing
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s\-#@]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Detect language (English or Urdu)
   */
  private detectLanguage(text: string): 'en' | 'ur' {
    let urduScore = 0;

    for (const pattern of URDU_PATTERNS) {
      if (pattern.test(text)) {
        urduScore++;
      }
    }

    return urduScore >= 2 ? 'ur' : 'en';
  }

  /**
   * Detect intent from text
   */
  private detectIntent(
    text: string,
    entities: Entity[]
  ): { intent: Intent; confidence: number } {
    // Check each intent pattern
    for (const [intent, patterns] of Object.entries(INTENT_PATTERNS)) {
      for (const pattern of patterns) {
        if (pattern.test(text)) {
          return {
            intent: intent as Intent,
            confidence: 0.8,
          };
        }
      }
    }

    // Infer intent from entities
    if (entities.some((e) => e.type === 'yarn_code')) {
      return { intent: 'stock_check', confidence: 0.6 };
    }

    if (entities.some((e) => e.type === 'order_number')) {
      return { intent: 'order_status', confidence: 0.6 };
    }

    return { intent: 'unknown', confidence: 0 };
  }

  /**
   * Extract entities from text
   */
  private extractEntities(text: string): Entity[] {
    const entities: Entity[] = [];

    // Extract yarn codes
    const yarnMatches = text.match(YARN_CODE_PATTERN);
    if (yarnMatches) {
      for (const match of yarnMatches) {
        entities.push({
          type: 'yarn_code',
          value: match.toUpperCase(),
          original: match,
        });
      }
    }

    // Extract order numbers
    const orderMatches = text.match(ORDER_NUMBER_PATTERN);
    if (orderMatches) {
      for (const match of orderMatches) {
        entities.push({
          type: 'order_number',
          value: match.toUpperCase(),
          original: match,
        });
      }
    }

    // Extract dates
    for (const pattern of DATE_PATTERNS) {
      const dateMatch = text.match(pattern);
      if (dateMatch) {
        entities.push({
          type: 'date',
          value: this.normalizeDate(dateMatch[0]),
          original: dateMatch[0],
        });
        break;
      }
    }

    return entities;
  }

  /**
   * Normalize date string
   */
  private normalizeDate(dateStr: string): string {
    const lower = dateStr.toLowerCase();

    if (lower === 'today' || lower === 'aaj') {
      return new Date().toISOString().split('T')[0];
    }

    if (lower === 'yesterday' || lower === 'kal') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      return yesterday.toISOString().split('T')[0];
    }

    if (lower === 'tomorrow') {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return tomorrow.toISOString().split('T')[0];
    }

    // Try to parse other date formats
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      return parsed.toISOString().split('T')[0];
    }

    return dateStr;
  }

  /**
   * Generate response based on intent (bilingual support)
   */
  generateResponse(intent: Intent, language: 'en' | 'ur', data?: any): string {
    const responses: Record<Intent, { en: string; ur: string }> = {
      greeting: {
        en: "Hello! I'm your Mughal Grace assistant. How can I help you today?\n\nYou can ask me about:\n- Stock levels (e.g., \"stock of COT-40S\")\n- Order status (e.g., \"order ORD-12345 status\")\n- Production summary\n- Sales report\n- Payment status\n\nType 'help' for more options.",
        ur: "السلام علیکم! میں مغل گریس اسسٹنٹ ہوں۔ میں آپ کی کیسے مدد کر سکتا ہوں؟\n\nآپ مجھ سے پوچھ سکتے ہیں:\n- اسٹاک لیول (مثلاً \"COT-40S کا stock\")\n- آرڈر اسٹیٹس (مثلاً \"ORD-12345 کا status\")\n- پروڈکشن رپورٹ\n- سیلز رپورٹ\n- پیمنٹ اسٹیٹس\n\nمزید آپشنز کے لیے 'help' لکھیں۔",
      },
      help: {
        en: "*Available Commands:*\n\n📦 *Stock Check*\n- \"stock of COT-40S\"\n- \"how much cotton 30s\"\n\n📋 *Order Status*\n- \"order ORD-12345 status\"\n- \"track order 12345\"\n\n🏭 *Reports*\n- \"production summary\"\n- \"sales report\"\n- \"pending payments\"\n\nJust type your question naturally!",
        ur: "*دستیاب کمانڈز:*\n\n📦 *اسٹاک چیک*\n- \"COT-40S کا stock\"\n- \"cotton 30s kitna hai\"\n\n📋 *آرڈر اسٹیٹس*\n- \"ORD-12345 کا status\"\n- \"order 12345 kahan hai\"\n\n🏭 *رپورٹس*\n- \"production batao\"\n- \"sale report\"\n- \"pending payment\"\n\nاپنا سوال آسان الفاظ میں لکھیں!",
      },
      stock_check: {
        en: data
          ? `*Stock Report:*\n\n${data}`
          : 'Please specify which yarn you want to check. Example: "stock of COT-40S"',
        ur: data
          ? `*اسٹاک رپورٹ:*\n\n${data}`
          : 'براہ کرم بتائیں کس یارن کا اسٹاک چیک کرنا ہے۔ مثال: "COT-40S کا stock"',
      },
      order_status: {
        en: data
          ? `*Order Status:*\n\n${data}`
          : 'Please provide an order number. Example: "order ORD-12345 status"',
        ur: data
          ? `*آرڈر اسٹیٹس:*\n\n${data}`
          : 'براہ کرم آرڈر نمبر دیں۔ مثال: "ORD-12345 کا status"',
      },
      production_summary: {
        en: data
          ? `*Production Summary:*\n\n${data}`
          : 'Fetching production data...',
        ur: data
          ? `*پروڈکشن رپورٹ:*\n\n${data}`
          : 'پروڈکشن ڈیٹا حاصل ہو رہا ہے...',
      },
      sales_summary: {
        en: data ? `*Sales Summary:*\n\n${data}` : 'Fetching sales data...',
        ur: data
          ? `*سیلز رپورٹ:*\n\n${data}`
          : 'سیلز ڈیٹا حاصل ہو رہا ہے...',
      },
      payment_status: {
        en: data
          ? `*Payment Status:*\n\n${data}`
          : 'Fetching payment information...',
        ur: data
          ? `*پیمنٹ اسٹیٹس:*\n\n${data}`
          : 'پیمنٹ کی معلومات حاصل ہو رہی ہیں...',
      },
      unknown: {
        en: "I'm not sure what you're asking. Try asking about:\n- Stock levels\n- Order status\n- Production summary\n- Sales report\n\nType 'help' to see all options.",
        ur: "معاف کیجیے، سمجھ نہیں آیا۔ آپ پوچھ سکتے ہیں:\n- اسٹاک لیول\n- آرڈر اسٹیٹس\n- پروڈکشن رپورٹ\n- سیلز رپورٹ\n\n'help' لکھیں سب آپشنز دیکھنے کے لیے۔",
      },
    };

    return responses[intent][language];
  }

  /**
   * Format stock data for WhatsApp message
   */
  formatStockResponse(stocks: Array<{ code: string; name: string; quantity: number; unit: string }>): string {
    if (!stocks.length) {
      return 'No stock data found.';
    }

    return stocks
      .map((s) => `• ${s.code}: ${s.quantity.toLocaleString()} ${s.unit}\n  ${s.name}`)
      .join('\n\n');
  }

  /**
   * Format order status for WhatsApp message
   */
  formatOrderResponse(order: {
    orderNumber: string;
    status: string;
    date: string;
    customer?: string;
    items?: Array<{ name: string; quantity: number }>;
    total?: number;
  }): string {
    let response = `📋 *Order: ${order.orderNumber}*\n`;
    response += `Status: ${order.status}\n`;
    response += `Date: ${order.date}\n`;

    if (order.customer) {
      response += `Customer: ${order.customer}\n`;
    }

    if (order.items?.length) {
      response += '\n*Items:*\n';
      response += order.items.map((i) => `• ${i.name} x ${i.quantity}`).join('\n');
    }

    if (order.total) {
      response += `\n\n*Total: PKR ${order.total.toLocaleString()}*`;
    }

    return response;
  }

  /**
   * Format production summary for WhatsApp message
   */
  formatProductionResponse(data: {
    date: string;
    totalRolls: number;
    totalWeight: number;
    machinesRunning: number;
    efficiency: number;
    topProducts?: Array<{ name: string; quantity: number }>;
  }): string {
    let response = `🏭 *Production Summary*\n`;
    response += `Date: ${data.date}\n\n`;
    response += `📊 *Stats:*\n`;
    response += `• Total Rolls: ${data.totalRolls.toLocaleString()}\n`;
    response += `• Total Weight: ${data.totalWeight.toLocaleString()} kg\n`;
    response += `• Machines Running: ${data.machinesRunning}\n`;
    response += `• Efficiency: ${data.efficiency}%`;

    if (data.topProducts?.length) {
      response += '\n\n📈 *Top Products:*\n';
      response += data.topProducts.map((p) => `• ${p.name}: ${p.quantity}`).join('\n');
    }

    return response;
  }
}

// Export singleton instance
export const nluService = new NLUService();
