/**
 * WhatsApp Service Exports
 */

export { whatsappClient } from './client';
export { nluService } from './nlu';
export { notificationService } from './notifications';

// Re-export types
export type {
  WhatsAppTextMessage,
  WhatsAppTemplateMessage,
  WhatsAppInteractiveMessage,
  WhatsAppApiResponse,
  WebhookMessage,
  WebhookStatus,
  TemplateComponent,
  TemplateParameter,
} from './client';

export type {
  NLUResult,
  Intent,
} from './nlu';

export type {
  NotificationType,
  OrderNotification,
  PaymentNotification,
  DailyReportData,
} from './notifications';
