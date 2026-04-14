/**
 * WhatsApp Controller
 * Handles all WhatsApp-related HTTP requests
 */

import { Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { whatsappClient } from '../services/whatsapp/client';
import { nluService } from '../services/whatsapp/nlu';
import { notificationService } from '../services/whatsapp/notifications';
import { logger } from '../utils/logger';
import { getAdminClient } from '../middleware/tenant';

// Get prisma from request (tenant) or use admin client for webhooks
const getPrisma = (req: Request): PrismaClient => {
  return req.prisma || getAdminClient();
};

/**
 * Verify webhook (GET request from Meta)
 */
const verifyWebhook = async (req: Request, res: Response) => {
  try {
    const mode = req.query['hub.mode'] as string;
    const token = req.query['hub.verify_token'] as string;
    const challenge = req.query['hub.challenge'] as string;

    const result = whatsappClient.verifyWebhook(mode, token, challenge);

    if (result) {
      res.status(200).send(result);
    } else {
      res.status(403).send('Forbidden');
    }
  } catch (error) {
    logger.error('Webhook verification error:', error);
    res.status(500).send('Error');
  }
};

/**
 * Handle incoming webhook (POST from Meta)
 */
const handleWebhook = async (req: Request, res: Response) => {
  try {
    // Always respond quickly to Meta
    res.status(200).send('EVENT_RECEIVED');

    const payload = whatsappClient.parseWebhookPayload(req.body);

    if (!payload) {
      logger.warn('Invalid webhook payload received');
      return;
    }

    const prisma = getAdminClient();

    // Process messages asynchronously
    for (const message of payload.messages) {
      await processIncomingMessage(prisma, message);
    }

    // Process status updates
    for (const status of payload.statuses) {
      await processStatusUpdate(prisma, status);
    }
  } catch (error) {
    logger.error('Webhook handling error:', error);
  }
};

/**
 * Process an incoming message
 */
async function processIncomingMessage(prisma: PrismaClient, message: any) {
  try {
    const phoneNumber = message.from;
    const messageId = message.id;

    // Mark as read
    await whatsappClient.markAsRead(messageId);

    // Get or create contact
    let contact = await (prisma as any).whatsAppContact?.findUnique({
      where: { phoneNumber },
    });

    if (!contact) {
      contact = await (prisma as any).whatsAppContact?.create({
        data: {
          phoneNumber,
          waId: phoneNumber,
          name: message.profile?.name || null,
        },
      });
    }

    if (!contact) {
      logger.warn('WhatsApp models not available in this schema');
      return;
    }

    // Update last message time
    await (prisma as any).whatsAppContact?.update({
      where: { id: contact.id },
      data: { lastMessageAt: new Date() },
    });

    // Get message text
    let text = '';
    if (message.type === 'text') {
      text = message.text?.body || '';
    } else if (message.type === 'interactive') {
      text = message.interactive?.button_reply?.title ||
             message.interactive?.list_reply?.title || '';
    }

    // Store incoming message
    await (prisma as any).whatsAppMessage?.create({
      data: {
        contactId: contact.id,
        direction: 'INBOUND',
        messageType: message.type,
        content: { text, raw: message },
        waMessageId: messageId,
        status: 'DELIVERED',
      },
    });

    // Check if query bot is enabled before processing
    const settings = await (prisma as any).whatsAppSettings?.findFirst();
    if (!settings?.queryBotEnabled) {
      logger.info('Query bot disabled, skipping NLU processing');
      return;
    }

    // Process with NLU
    const nluResult = nluService.parseQuery(text);
    const language = nluResult.language;

    // Generate response
    let response: string;

    if (nluResult.intent === 'help') {
      response = nluService.generateResponse('help', language);
    } else if (nluResult.intent === 'greeting') {
      response = language === 'ur'
        ? 'Hello! I am the Mughal Grace assistant. How can I help you?'
        : 'Hello! I am the Mughal Grace assistant. How can I help you?';
    } else if (nluResult.intent === 'stock_check') {
      response = await handleStockQuery(prisma, nluResult.entities, language);
    } else if (nluResult.intent === 'production_summary') {
      response = await handleProductionQuery(prisma, nluResult.entities, language);
    } else if (nluResult.intent === 'order_status') {
      response = await handleOrderQuery(prisma, nluResult.entities, language);
    } else if (nluResult.intent === 'sales_summary') {
      response = await handleSalesQuery(prisma, nluResult.entities, language);
    } else {
      response = nluService.generateResponse(nluResult.intent, language, null);
    }

    // Send response
    const sentMessage = await whatsappClient.sendTextMessage(phoneNumber, response);

    // Store outgoing message
    await (prisma as any).whatsAppMessage?.create({
      data: {
        contactId: contact.id,
        direction: 'OUTBOUND',
        messageType: 'text',
        content: { text: response },
        waMessageId: sentMessage.messages?.[0]?.id,
        status: 'SENT',
        sentAt: new Date(),
      },
    });

    logger.info(`Processed message from ${phoneNumber}, intent: ${nluResult.intent}`);
  } catch (error) {
    logger.error('Error processing incoming message:', error);
  }
}

/**
 * Handle stock check query
 */
async function handleStockQuery(prisma: PrismaClient, entities: any, language: 'en' | 'ur'): Promise<string> {
  try {
    const yarnCode = entities.yarnCode;

    if (yarnCode) {
      const yarn = await (prisma as any).yarnType?.findFirst({
        where: {
          code: { contains: yarnCode, mode: 'insensitive' },
          isActive: true,
        },
      });

      if (yarn) {
        const stock = await (prisma as any).rawMaterialInventory?.findFirst({
          where: { yarnTypeId: yarn.id },
          orderBy: { lastUpdated: 'desc' },
        });

        const currentStock = stock ? Number(stock.quantityKg) : 0;

        if (language === 'ur') {
          return `Stock: ${yarn.code} (${yarn.name}) - ${currentStock.toLocaleString()} kg`;
        }
        return `Stock: ${yarn.code} (${yarn.name}) - ${currentStock.toLocaleString()} kg`;
      } else {
        return language === 'ur'
          ? `Yarn code "${yarnCode}" not found`
          : `Yarn code "${yarnCode}" not found`;
      }
    }

    const items = await (prisma as any).yarnType?.findMany({
      where: { isActive: true },
      take: 5,
    });

    let response = 'Stock Status:\n\n';
    for (const item of items || []) {
      response += `- ${item.code}: ${item.name}\n`;
    }
    response += '\nSend a specific yarn code for details.';
    return response;
  } catch (error) {
    logger.error('Error handling stock query:', error);
    return 'Error fetching stock information';
  }
}

/**
 * Handle production query
 */
async function handleProductionQuery(prisma: PrismaClient, _entities: any, _language: 'en' | 'ur'): Promise<string> {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const productionLogs = await (prisma as any).productionLog?.findMany({
      where: {
        date: { gte: startOfDay },
      },
    }) || [];

    const totalRolls = productionLogs.reduce((sum: number, log: any) => sum + (log.rollsProduced || 0), 0);
    const totalWeight = productionLogs.reduce((sum: number, log: any) => sum + Number(log.totalWeightKg || 0), 0);

    const machines = await (prisma as any).machine?.findMany({
      where: { isActive: true },
    }) || [];
    const runningMachines = machines.filter((m: any) => m.currentStatus === 'RUNNING').length;

    return `Today's Production:\n- Rolls: ${totalRolls.toLocaleString()}\n- Weight: ${totalWeight.toLocaleString()} kg\n- Machines: ${runningMachines}/${machines.length} running`;
  } catch (error) {
    logger.error('Error handling production query:', error);
    return 'Error fetching production information';
  }
}

/**
 * Handle order query
 */
async function handleOrderQuery(prisma: PrismaClient, entities: any, _language: 'en' | 'ur'): Promise<string> {
  try {
    const orderNumber = entities.orderNumber;

    if (orderNumber) {
      const order = await (prisma as any).salesOrder?.findFirst({
        where: { orderNumber },
        include: { customer: true },
      });

      if (order) {
        return `Order ${order.orderNumber}:\n- Customer: ${order.customer.name}\n- Status: ${order.status}\n- Amount: PKR ${Number(order.totalAmount).toLocaleString()}`;
      } else {
        return `Order "${orderNumber}" not found`;
      }
    }

    const recentOrders = await (prisma as any).salesOrder?.findMany({
      take: 5,
      orderBy: { orderDate: 'desc' },
      include: { customer: true },
    }) || [];

    let response = 'Recent Orders:\n\n';
    for (const order of recentOrders) {
      response += `- ${order.orderNumber}: ${order.customer.name} - ${order.status}\n`;
    }
    return response;
  } catch (error) {
    logger.error('Error handling order query:', error);
    return 'Error fetching order information';
  }
}

/**
 * Handle sales query
 */
async function handleSalesQuery(prisma: PrismaClient, _entities: any, _language: 'en' | 'ur'): Promise<string> {
  try {
    const today = new Date();
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);

    const orders = await (prisma as any).salesOrder?.findMany({
      where: {
        orderDate: { gte: startOfDay },
      },
    }) || [];

    const totalOrders = orders.length;
    const totalValue = orders.reduce((sum: number, order: any) => sum + Number(order.totalAmount || 0), 0);

    const payments = await (prisma as any).customerPayment?.findMany({
      where: {
        paymentDate: { gte: startOfDay },
      },
    }) || [];
    const totalPayments = payments.reduce((sum: number, p: any) => sum + Number(p.amount || 0), 0);

    return `Today's Sales:\n- Orders: ${totalOrders}\n- Value: PKR ${totalValue.toLocaleString()}\n- Payments: PKR ${totalPayments.toLocaleString()}`;
  } catch (error) {
    logger.error('Error handling sales query:', error);
    return 'Error fetching sales information';
  }
}

/**
 * Process status update
 */
async function processStatusUpdate(prisma: PrismaClient, status: any) {
  try {
    const waMessageId = status.id;
    const newStatus = status.status.toUpperCase();

    const message = await (prisma as any).whatsAppMessage?.findFirst({
      where: { waMessageId },
    });

    if (message) {
      const updateData: any = { status: newStatus };

      if (newStatus === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      } else if (newStatus === 'READ') {
        updateData.readAt = new Date();
      } else if (newStatus === 'FAILED') {
        updateData.errorMessage = status.errors?.[0]?.message || 'Unknown error';
      }

      await (prisma as any).whatsAppMessage?.update({
        where: { id: message.id },
        data: updateData,
      });

      logger.debug(`Updated message ${waMessageId} status to ${newStatus}`);
    }
  } catch (error) {
    logger.error('Error processing status update:', error);
  }
}

/**
 * Send a text message
 */
const sendMessage = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, message } = req.body;
    const prisma = getPrisma(req);

    if (!phoneNumber || !message) {
      return res.status(400).json({ error: 'Phone number and message are required' });
    }

    const result = await whatsappClient.sendTextMessage(phoneNumber, message);

    // Store in database if WhatsApp models exist
    try {
      let contact = await (prisma as any).whatsAppContact?.findUnique({
        where: { phoneNumber },
      });

      if (!contact) {
        contact = await (prisma as any).whatsAppContact?.create({
          data: { phoneNumber, waId: phoneNumber },
        });
      }

      if (contact) {
        await (prisma as any).whatsAppMessage?.create({
          data: {
            contactId: contact.id,
            direction: 'OUTBOUND',
            messageType: 'text',
            content: { text: message },
            waMessageId: result.messages?.[0]?.id,
            status: 'SENT',
            sentAt: new Date(),
          },
        });
      }
    } catch (dbError) {
      logger.warn('Could not store message in database:', dbError);
    }

    return res.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (error: any) {
    logger.error('Error sending message:', error);
    return res.status(500).json({ error: error.message || 'Failed to send message' });
  }
};

/**
 * Send a template message
 */
const sendTemplateMessage = async (req: Request, res: Response) => {
  try {
    const { phoneNumber, templateName, languageCode, components } = req.body;

    if (!phoneNumber || !templateName) {
      return res.status(400).json({ error: 'Phone number and template name are required' });
    }

    const result = await whatsappClient.sendTemplateMessage(
      phoneNumber,
      templateName,
      languageCode || 'en',
      components
    );

    return res.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (error: any) {
    logger.error('Error sending template message:', error);
    return res.status(500).json({ error: error.message || 'Failed to send template message' });
  }
};

/**
 * Get all contacts
 */
const getContacts = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);

    const contacts = await (prisma as any).whatsAppContact?.findMany({
      orderBy: { lastMessageAt: 'desc' },
      include: {
        messages: {
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    }) || [];

    res.json(contacts);
  } catch (error: any) {
    logger.error('Error fetching contacts:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch contacts' });
  }
};

/**
 * Get message history
 */
const getMessages = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const { contactId, limit = 50, offset = 0 } = req.query;

    const where: any = {};
    if (contactId) {
      where.contactId = parseInt(contactId as string);
    }

    const messages = await (prisma as any).whatsAppMessage?.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit as string),
      skip: parseInt(offset as string),
      include: {
        contact: {
          select: { phoneNumber: true, name: true },
        },
      },
    }) || [];

    res.json(messages);
  } catch (error: any) {
    logger.error('Error fetching messages:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch messages' });
  }
};

/**
 * Get WhatsApp settings
 */
const getSettings = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);

    let settings = await (prisma as any).whatsAppSettings?.findFirst();

    if (!settings) {
      // Return default settings (don't create if model doesn't exist)
      settings = {
        id: 0,
        isEnabled: false,
        dailyReportEnabled: false,
        dailyReportTime: '18:00',
        dailyReportRecipients: [],
        orderNotifications: true,
        paymentReminders: true,
        queryBotEnabled: true,
      };
    }

    res.json(settings);
  } catch (error: any) {
    logger.error('Error fetching settings:', error);
    // Return defaults on error
    res.json({
      id: 0,
      isEnabled: false,
      dailyReportEnabled: false,
      dailyReportTime: '18:00',
      dailyReportRecipients: [],
      orderNotifications: true,
      paymentReminders: true,
      queryBotEnabled: true,
    });
  }
};

/**
 * Update WhatsApp settings
 */
const updateSettings = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const {
      isEnabled,
      phoneNumberId,
      businessAccountId,
      dailyReportEnabled,
      dailyReportTime,
      dailyReportRecipients,
      orderNotifications,
      paymentReminders,
      queryBotEnabled,
    } = req.body;

    let settings = await (prisma as any).whatsAppSettings?.findFirst();

    if (settings) {
      settings = await (prisma as any).whatsAppSettings?.update({
        where: { id: settings.id },
        data: {
          isEnabled,
          phoneNumberId,
          businessAccountId,
          dailyReportEnabled,
          dailyReportTime,
          dailyReportRecipients,
          orderNotifications,
          paymentReminders,
          queryBotEnabled,
        },
      });
    } else {
      settings = await (prisma as any).whatsAppSettings?.create({
        data: {
          isEnabled: isEnabled ?? false,
          phoneNumberId,
          businessAccountId,
          dailyReportEnabled: dailyReportEnabled ?? false,
          dailyReportTime: dailyReportTime ?? '18:00',
          dailyReportRecipients: dailyReportRecipients ?? [],
          orderNotifications: orderNotifications ?? true,
          paymentReminders: paymentReminders ?? true,
          queryBotEnabled: queryBotEnabled ?? true,
        },
      });
    }

    res.json(settings || { success: true });
  } catch (error: any) {
    logger.error('Error updating settings:', error);
    res.status(500).json({ error: error.message || 'Failed to update settings' });
  }
};

/**
 * Send test message
 */
const sendTestMessage = async (req: Request, res: Response) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const testMessage = `Test Message

This is a test message from Mughal Grace WhatsApp Integration.

If you received this message, your WhatsApp setup is working correctly!

Mughal Grace ERP System`;

    const result = await whatsappClient.sendTextMessage(phoneNumber, testMessage);

    return res.json({ success: true, messageId: result.messages?.[0]?.id });
  } catch (error: any) {
    logger.error('Error sending test message:', error);
    return res.status(500).json({ error: error.message || 'Failed to send test message' });
  }
};

/**
 * Trigger daily report manually
 */
const triggerDailyReport = async (req: Request, res: Response) => {
  try {
    const prisma = getPrisma(req);
    const { phoneNumber, language = 'en' } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const reportData = await notificationService.generateDailyReportData(prisma);
    const success = await notificationService.sendDailyReport(
      phoneNumber,
      reportData,
      language as 'en' | 'ur'
    );

    if (success) {
      return res.json({ success: true, message: 'Daily report sent successfully' });
    } else {
      return res.status(500).json({ error: 'Failed to send daily report' });
    }
  } catch (error: any) {
    logger.error('Error triggering daily report:', error);
    return res.status(500).json({ error: error.message || 'Failed to trigger daily report' });
  }
};

export const whatsappController = {
  verifyWebhook,
  handleWebhook,
  sendMessage,
  sendTemplateMessage,
  getContacts,
  getMessages,
  getSettings,
  updateSettings,
  sendTestMessage,
  triggerDailyReport,
};
