/**
 * WhatsApp Routes
 * Handles webhook verification, incoming messages, and API endpoints
 */

import { Router } from 'express';
import { whatsappController } from '../controllers/whatsapp.controller';

const router = Router();

/**
 * @route GET /api/v1/whatsapp/webhook
 * @desc Webhook verification (required by Meta)
 * @access Public
 */
router.get('/webhook', whatsappController.verifyWebhook);

/**
 * @route POST /api/v1/whatsapp/webhook
 * @desc Handle incoming messages and status updates
 * @access Public (verified by Meta signature)
 */
router.post('/webhook', whatsappController.handleWebhook);

/**
 * @route POST /api/v1/whatsapp/send
 * @desc Send a message to a phone number
 * @access Private (requires auth)
 */
router.post('/send', whatsappController.sendMessage);

/**
 * @route POST /api/v1/whatsapp/send-template
 * @desc Send a template message
 * @access Private (requires auth)
 */
router.post('/send-template', whatsappController.sendTemplateMessage);

/**
 * @route GET /api/v1/whatsapp/contacts
 * @desc Get all WhatsApp contacts
 * @access Private (requires auth)
 */
router.get('/contacts', whatsappController.getContacts);

/**
 * @route GET /api/v1/whatsapp/messages
 * @desc Get message history
 * @access Private (requires auth)
 */
router.get('/messages', whatsappController.getMessages);

/**
 * @route GET /api/v1/whatsapp/settings
 * @desc Get WhatsApp settings
 * @access Private (requires auth)
 */
router.get('/settings', whatsappController.getSettings);

/**
 * @route PUT /api/v1/whatsapp/settings
 * @desc Update WhatsApp settings
 * @access Private (requires auth)
 */
router.put('/settings', whatsappController.updateSettings);

/**
 * @route POST /api/v1/whatsapp/test
 * @desc Send a test message
 * @access Private (requires auth)
 */
router.post('/test', whatsappController.sendTestMessage);

/**
 * @route POST /api/v1/whatsapp/daily-report
 * @desc Trigger daily report manually
 * @access Private (requires auth)
 */
router.post('/daily-report', whatsappController.triggerDailyReport);

export default router;
