import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { validateBody } from '../middleware/validate';
import { AppError } from '../middleware/error-handler';
import { ChatService, ChatUserContext } from '../services/chat';
import { getSuggestions } from '../services/ai';

export const chatRouter: Router = Router();

// Apply authentication and tenant middleware
chatRouter.use(authMiddleware);
chatRouter.use(tenantMiddleware);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const sendMessageSchema = z.object({
  conversationId: z.number().optional(),
  content: z.string().min(1, 'Message content is required').max(1000, 'Message too long'),
});

const deleteConversationSchema = z.object({
  id: z.string().regex(/^\d+$/, 'Invalid ID format').transform(Number),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Build user context from request
 */
function buildUserContext(req: Request): ChatUserContext {
  const user = req.user!;
  const tenant = (req as any).tenant;

  // Get user's preferred language (default to both for bilingual)
  // TODO: Add language preference to user settings
  const preferredLanguage = 'both' as const;

  return {
    userId: user.userId,
    userName: user.email.split('@')[0], // Use email prefix as name
    userRole: user.role,
    permissions: user.permissions,
    tenantId: user.tenantId,
    tenantName: tenant?.name || 'Factory',
    preferredLanguage,
  };
}

// ============================================
// ROUTES
// ============================================

/**
 * POST /chat/message
 * Send a message and get AI response
 */
chatRouter.post(
  '/message',
  validateBody(sendMessageSchema),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { conversationId, content } = req.body;
      const userContext = buildUserContext(req);

      const response = await ChatService.processMessage(req.prisma!, userContext, {
        conversationId,
        content,
      });

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /chat/history
 * Get user's conversation history
 */
chatRouter.get(
  '/history',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const conversations = await ChatService.getHistory(
        req.prisma!,
        req.user!.userId,
        limit
      );

      res.json({
        success: true,
        data: conversations,
        count: conversations.length,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /chat/conversation/:id
 * Get a specific conversation with messages
 */
chatRouter.get(
  '/conversation/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        throw AppError.badRequest('Invalid conversation ID');
      }

      const conversation = await (req.prisma as any).chatConversation.findFirst({
        where: {
          id: conversationId,
          userId: req.user!.userId,
        },
        include: {
          messages: {
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!conversation) {
        throw AppError.notFound('Conversation not found');
      }

      res.json({
        success: true,
        data: conversation,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /chat/conversation/:id
 * Delete a conversation
 */
chatRouter.delete(
  '/conversation/:id',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const conversationId = parseInt(req.params.id);

      if (isNaN(conversationId)) {
        throw AppError.badRequest('Invalid conversation ID');
      }

      const deleted = await ChatService.deleteConversation(
        req.prisma!,
        conversationId,
        req.user!.userId
      );

      if (!deleted) {
        throw AppError.notFound('Conversation not found');
      }

      res.json({
        success: true,
        message: 'Conversation deleted',
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /chat/suggestions
 * Get contextual quick action suggestions
 */
chatRouter.get(
  '/suggestions',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const recentIntent = req.query.intent as string | undefined;
      const suggestions = getSuggestions(req.user!.role, recentIntent);

      res.json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /chat/status
 * Check if chat service is available
 */
chatRouter.get(
  '/status',
  async (req: Request, res: Response) => {
    const { AnthropicProvider } = await import('../services/ai');

    res.json({
      success: true,
      data: {
        available: true,
        aiConfigured: AnthropicProvider.isConfigured(),
        features: {
          bilingual: true,
          queryModules: [
            'yarn',
            'production',
            'rolls',
            'dyeing',
            'sales',
            'finance',
            'inventory',
          ],
          writeActions: false, // Phase 1: read-only
        },
      },
    });
  }
);
