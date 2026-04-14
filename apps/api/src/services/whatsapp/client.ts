/**
 * WhatsApp Cloud API Client
 * Meta Business API integration for sending/receiving WhatsApp messages
 */

import { config } from '../../config';
import { logger } from '../../utils/logger';

// Types for WhatsApp API
export interface WhatsAppTextMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'text';
  text: {
    preview_url?: boolean;
    body: string;
  };
}

export interface WhatsAppTemplateMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'template';
  template: {
    name: string;
    language: {
      code: string;
    };
    components?: TemplateComponent[];
  };
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button';
  parameters?: TemplateParameter[];
  sub_type?: string;
  index?: number;
}

export interface TemplateParameter {
  type: 'text' | 'currency' | 'date_time' | 'image' | 'document' | 'video';
  text?: string;
  currency?: {
    fallback_value: string;
    code: string;
    amount_1000: number;
  };
  date_time?: {
    fallback_value: string;
  };
  image?: {
    link: string;
  };
}

export interface WhatsAppInteractiveMessage {
  messaging_product: 'whatsapp';
  recipient_type: 'individual';
  to: string;
  type: 'interactive';
  interactive: {
    type: 'button' | 'list';
    header?: {
      type: 'text' | 'image' | 'document' | 'video';
      text?: string;
    };
    body: {
      text: string;
    };
    footer?: {
      text: string;
    };
    action: InteractiveAction;
  };
}

export interface InteractiveAction {
  buttons?: Array<{
    type: 'reply';
    reply: {
      id: string;
      title: string;
    };
  }>;
  button?: string;
  sections?: Array<{
    title: string;
    rows: Array<{
      id: string;
      title: string;
      description?: string;
    }>;
  }>;
}

export interface WhatsAppApiResponse {
  messaging_product: string;
  contacts: Array<{
    input: string;
    wa_id: string;
  }>;
  messages: Array<{
    id: string;
  }>;
}

export interface WebhookMessage {
  from: string;
  id: string;
  timestamp: string;
  type: 'text' | 'interactive' | 'button' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'location' | 'contacts';
  text?: {
    body: string;
  };
  interactive?: {
    type: 'button_reply' | 'list_reply';
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
  };
}

export interface WebhookStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message: string;
  }>;
}

/**
 * WhatsApp Cloud API Client
 */
class WhatsAppClient {
  private baseUrl: string;
  private phoneNumberId: string;
  private accessToken: string;

  constructor() {
    this.baseUrl = config.whatsapp.apiUrl;
    this.phoneNumberId = config.whatsapp.phoneNumberId;
    this.accessToken = config.whatsapp.accessToken;
  }

  /**
   * Check if WhatsApp is configured and enabled
   */
  isEnabled(): boolean {
    return config.whatsapp.enabled;
  }

  /**
   * Make API request to WhatsApp Cloud API
   */
  private async request<T>(
    endpoint: string,
    method: 'GET' | 'POST' = 'POST',
    body?: object
  ): Promise<T> {
    if (!this.isEnabled()) {
      throw new Error('WhatsApp is not configured');
    }

    const url = `${this.baseUrl}/${this.phoneNumberId}${endpoint}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const data = await response.json() as T & { error?: { message?: string } };

    if (!response.ok) {
      logger.error('WhatsApp API error:', data);
      throw new Error(data.error?.message || 'WhatsApp API request failed');
    }

    return data;
  }

  /**
   * Send a text message
   */
  async sendTextMessage(to: string, text: string): Promise<WhatsAppApiResponse> {
    const message: WhatsAppTextMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'text',
      text: {
        preview_url: false,
        body: text,
      },
    };

    logger.info(`Sending WhatsApp text message to ${to}`);
    return this.request<WhatsAppApiResponse>('/messages', 'POST', message);
  }

  /**
   * Send a template message
   */
  async sendTemplateMessage(
    to: string,
    templateName: string,
    languageCode: string = 'en',
    components?: TemplateComponent[]
  ): Promise<WhatsAppApiResponse> {
    const message: WhatsAppTemplateMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'template',
      template: {
        name: templateName,
        language: {
          code: languageCode,
        },
        components,
      },
    };

    logger.info(`Sending WhatsApp template "${templateName}" to ${to}`);
    return this.request<WhatsAppApiResponse>('/messages', 'POST', message);
  }

  /**
   * Send an interactive message with buttons
   */
  async sendInteractiveButtons(
    to: string,
    bodyText: string,
    buttons: Array<{ id: string; title: string }>,
    headerText?: string,
    footerText?: string
  ): Promise<WhatsAppApiResponse> {
    const message: WhatsAppInteractiveMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'interactive',
      interactive: {
        type: 'button',
        header: headerText ? { type: 'text', text: headerText } : undefined,
        body: { text: bodyText },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          buttons: buttons.slice(0, 3).map((btn) => ({
            type: 'reply' as const,
            reply: {
              id: btn.id,
              title: btn.title.slice(0, 20), // Max 20 chars
            },
          })),
        },
      },
    };

    logger.info(`Sending WhatsApp interactive buttons to ${to}`);
    return this.request<WhatsAppApiResponse>('/messages', 'POST', message);
  }

  /**
   * Send an interactive list message
   */
  async sendInteractiveList(
    to: string,
    bodyText: string,
    buttonText: string,
    sections: Array<{
      title: string;
      rows: Array<{ id: string; title: string; description?: string }>;
    }>,
    headerText?: string,
    footerText?: string
  ): Promise<WhatsAppApiResponse> {
    const message: WhatsAppInteractiveMessage = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: this.formatPhoneNumber(to),
      type: 'interactive',
      interactive: {
        type: 'list',
        header: headerText ? { type: 'text', text: headerText } : undefined,
        body: { text: bodyText },
        footer: footerText ? { text: footerText } : undefined,
        action: {
          button: buttonText.slice(0, 20),
          sections: sections.map((section) => ({
            title: section.title.slice(0, 24),
            rows: section.rows.slice(0, 10).map((row) => ({
              id: row.id,
              title: row.title.slice(0, 24),
              description: row.description?.slice(0, 72),
            })),
          })),
        },
      },
    };

    logger.info(`Sending WhatsApp interactive list to ${to}`);
    return this.request<WhatsAppApiResponse>('/messages', 'POST', message);
  }

  /**
   * Mark a message as read
   */
  async markAsRead(messageId: string): Promise<void> {
    await this.request('/messages', 'POST', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    });

    logger.debug(`Marked message ${messageId} as read`);
  }

  /**
   * Get media URL from media ID
   */
  async getMediaUrl(mediaId: string): Promise<string> {
    const url = `${this.baseUrl}/${mediaId}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    const data = await response.json() as { url: string };
    return data.url;
  }

  /**
   * Download media content
   */
  async downloadMedia(mediaUrl: string): Promise<Buffer> {
    const response = await fetch(mediaUrl, {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
      },
    });

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phone: string): string {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle Pakistan numbers
    if (cleaned.startsWith('0')) {
      cleaned = '92' + cleaned.slice(1);
    }

    // Ensure it starts with country code
    if (!cleaned.startsWith('92') && cleaned.length === 10) {
      cleaned = '92' + cleaned;
    }

    return cleaned;
  }

  /**
   * Verify webhook challenge from Meta
   */
  verifyWebhook(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === config.whatsapp.verifyToken) {
      logger.info('WhatsApp webhook verified successfully');
      return challenge;
    }
    logger.warn('WhatsApp webhook verification failed');
    return null;
  }

  /**
   * Parse incoming webhook payload
   */
  parseWebhookPayload(body: any): {
    messages: WebhookMessage[];
    statuses: WebhookStatus[];
    phoneNumberId: string;
  } | null {
    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      if (!value) {
        return null;
      }

      return {
        messages: value.messages || [],
        statuses: value.statuses || [],
        phoneNumberId: value.metadata?.phone_number_id || '',
      };
    } catch (error) {
      logger.error('Error parsing webhook payload:', error);
      return null;
    }
  }
}

// Export singleton instance
export const whatsappClient = new WhatsAppClient();
