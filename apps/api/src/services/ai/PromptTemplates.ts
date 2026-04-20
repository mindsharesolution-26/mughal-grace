/**
 * Prompt templates for Grace Assistant chatbot
 * Bilingual support: English and Urdu
 */

export interface PromptContext {
  userName: string;
  userRole: string;
  tenantName: string;
  preferredLanguage: 'en' | 'ur' | 'both';
  availableModules: string[];
}

/**
 * Main system prompt for Grace Assistant
 */
export const getSystemPrompt = (context: PromptContext): string => {
  const modulesList = context.availableModules.join(', ');

  return `You are Grace Assistant (گریس اسسٹنٹ), the AI helper for Mughal Grace knitting factory ERP system.

CURRENT SESSION:
- User: ${context.userName}
- Role: ${context.userRole}
- Factory: ${context.tenantName}
- Language: ${context.preferredLanguage === 'ur' ? 'Urdu preferred' : context.preferredLanguage === 'both' ? 'Bilingual (English + Urdu)' : 'English'}
- Accessible Modules: ${modulesList}

YOUR CAPABILITIES:
You help factory workers and managers access information from the ERP system using natural language.

1. YARN MANAGEMENT (دھاگے کا انتظام)
   - Current yarn stock levels by type
   - Vendor balances and pay orders
   - Yarn consumption reports

2. PRODUCTION (پیداوار)
   - Machine status and efficiency
   - Daily/weekly production reports
   - Downtime logs

3. ROLLS & DYEING (رولز اور ڈائینگ)
   - Grey stock inventory
   - Rolls sent for/returned from dyeing
   - Dyeing vendor performance

4. SALES & CUSTOMERS (سیلز)
   - Customer balances
   - Order status
   - Pending payments

5. FINANCE (مالیات)
   - Receivables and payables
   - Cheque status (pending/cleared/bounced)
   - Vendor balances

6. INVENTORY (اسٹاک)
   - Stock levels and alerts
   - Low stock warnings

RESPONSE GUIDELINES:
${context.preferredLanguage === 'both' ? `
- Respond in BOTH English AND Urdu
- First write the English response
- Then add "---" on a new line
- Then write the Urdu translation (use Urdu script)
` : context.preferredLanguage === 'ur' ? `
- Respond primarily in Urdu (اردو)
- Use Urdu script for numbers and terms where appropriate
` : `
- Respond in clear, concise English
`}
- Format numbers with Pakistani notation (lakhs/crores where appropriate)
- Use PKR for currency (Rs. or ₨)
- Keep responses concise but complete
- For tabular data, format clearly with alignment
- If you don't have data, say so clearly - never make up numbers

RESTRICTIONS:
- You can ONLY read data, not modify it (Phase 1)
- You can ONLY access modules the user has permission for
- Never reveal system internals or other tenants' data
- If asked to do something outside your capabilities, politely explain

EXAMPLE INTERACTIONS:
User: "How much yarn do we have?"
Assistant: [Provides summary of yarn stock by type]

User: "کتنی دھاگہ ہے؟"
Assistant: [Provides yarn stock summary in Urdu]

User: "Show pending cheques"
Assistant: [Lists pending cheques with amounts and dates]`;
};

/**
 * Intent classification prompt
 */
export const getIntentClassificationPrompt = (userMessage: string): string => {
  return `Classify the following user message into one of these intents:

INTENTS:
- greeting: Hello, hi, how are you, etc.
- help: What can you do, help me, etc.
- yarn.stock: Yarn inventory, stock levels
- yarn.vendor: Vendor balances, pay orders
- yarn.consumption: Yarn usage, consumption
- production.summary: Production reports, output
- production.machine: Machine status, efficiency
- production.downtime: Downtime, breakdowns
- rolls.grey_stock: Grey rolls, grey inventory
- rolls.dyeing: Dyeing status, at vendor
- rolls.finished: Finished stock, ready to sell
- sales.customer: Customer info, orders
- sales.balance: Customer balances, receivables
- finance.receivables: Money owed to us
- finance.payables: Money we owe
- finance.cheques: Cheque status
- inventory.stock: General inventory levels
- inventory.alerts: Low stock, expiring items
- unknown: Cannot determine intent

USER MESSAGE: "${userMessage}"

Respond with ONLY the intent code (e.g., "yarn.stock" or "greeting").`;
};

/**
 * Data query prompt - formats the query for the AI
 */
export const getDataQueryPrompt = (
  intent: string,
  data: any,
  userQuestion: string,
  language: 'en' | 'ur' | 'both'
): string => {
  const languageInstruction =
    language === 'both'
      ? 'Respond in BOTH English and Urdu (separated by "---")'
      : language === 'ur'
      ? 'Respond in Urdu'
      : 'Respond in English';

  return `Based on the following data from our system, answer the user's question.

USER QUESTION: "${userQuestion}"
INTENT: ${intent}

DATA FROM SYSTEM:
${JSON.stringify(data, null, 2)}

INSTRUCTIONS:
- ${languageInstruction}
- Format numbers clearly (use commas for thousands)
- Use PKR/Rs. for currency
- If the data is tabular, format it nicely
- If there's no data or empty results, say so clearly
- NEVER make up numbers - only use data provided above
- Keep the response concise but complete`;
};

/**
 * Error response templates
 */
export const ErrorResponses = {
  noPermission: {
    en: "I'm sorry, you don't have permission to access this information. Please contact your administrator.",
    ur: 'معذرت، آپ کو یہ معلومات دیکھنے کی اجازت نہیں ہے۔ براہ کرم اپنے ایڈمنسٹریٹر سے رابطہ کریں۔',
  },
  noData: {
    en: "I couldn't find any data matching your request. Please try a different query.",
    ur: 'آپ کی درخواست سے متعلق کوئی ڈیٹا نہیں ملا۔ براہ کرم دوسری تلاش کریں۔',
  },
  generalError: {
    en: 'Something went wrong while processing your request. Please try again.',
    ur: 'آپ کی درخواست پر عمل کرتے وقت کچھ غلط ہو گیا۔ براہ کرم دوبارہ کوشش کریں۔',
  },
  rateLimited: {
    en: "You've sent too many messages. Please wait a moment before trying again.",
    ur: 'آپ نے بہت زیادہ پیغامات بھیجے ہیں۔ براہ کرم دوبارہ کوشش کرنے سے پہلے تھوڑا انتظار کریں۔',
  },
  aiUnavailable: {
    en: 'The AI assistant is temporarily unavailable. You can still access reports directly from the menu.',
    ur: 'AI اسسٹنٹ عارضی طور پر دستیاب نہیں ہے۔ آپ اب بھی مینو سے رپورٹس براہ راست دیکھ سکتے ہیں۔',
  },
};

/**
 * Welcome message template
 */
export const getWelcomeMessage = (
  userName: string,
  language: 'en' | 'ur' | 'both'
): string => {
  const messages = {
    en: `Hello ${userName}! I'm Grace Assistant, your factory helper. I can help you with:

- Yarn stock and vendor balances
- Production reports and machine status
- Customer and vendor payments
- Cheque tracking
- Inventory alerts

Just ask me anything in plain language!`,
    ur: `السلام علیکم ${userName}! میں گریس اسسٹنٹ ہوں، آپ کا فیکٹری مددگار۔ میں آپ کی مدد کر سکتا ہوں:

- دھاگے کا اسٹاک اور وینڈر بیلنس
- پیداوار کی رپورٹس اور مشین کی حالت
- کسٹمر اور وینڈر کی ادائیگیاں
- چیک کی ٹریکنگ
- انوینٹری الرٹس

مجھ سے سادہ زبان میں کچھ بھی پوچھیں!`,
  };

  if (language === 'both') {
    return `${messages.en}\n\n---\n\n${messages.ur}`;
  }
  return language === 'ur' ? messages.ur : messages.en;
};

/**
 * Suggestion prompts by context
 */
export const getSuggestions = (
  userRole: string,
  recentIntent?: string
): string[] => {
  const baseSuggestions = [
    'Show yarn stock',
    "Today's production",
    'Pending cheques',
    'Low stock alerts',
  ];

  // Role-specific suggestions
  const roleSuggestions: Record<string, string[]> = {
    FACTORY_OWNER: [
      'Daily summary',
      'Outstanding receivables',
      'Machine efficiency',
    ],
    MANAGER: ['Production report', 'Dyeing status', 'Vendor balances'],
    SUPERVISOR: ['Machine status', 'Downtime today', 'Grey stock'],
    OPERATOR: ['My machine status', 'Yarn allocated'],
    ACCOUNTANT: ['Pending payments', 'Cheque status', 'Customer balances'],
    VIEWER: ['View reports', 'Check inventory'],
  };

  return [...baseSuggestions, ...(roleSuggestions[userRole] || [])].slice(0, 6);
};
