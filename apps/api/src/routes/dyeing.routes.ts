import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';

export const dyeingRouter = Router();

dyeingRouter.use(authMiddleware);
dyeingRouter.use(tenantMiddleware);

// Dyeing Vendors
dyeingRouter.get('/vendors', requirePermission('dyeing:read'), (_req, res) => {
  res.json({ message: 'List dyeing vendors - coming soon' });
});

dyeingRouter.post('/vendors', requirePermission('dyeing:write'), (_req, res) => {
  res.json({ message: 'Create dyeing vendor - coming soon' });
});

dyeingRouter.get('/vendors/:id', requirePermission('dyeing:read'), (_req, res) => {
  res.json({ message: 'Get dyeing vendor - coming soon' });
});

dyeingRouter.get('/vendors/:id/performance', requirePermission('dyeing:read'), (_req, res) => {
  res.json({ message: 'Get vendor performance metrics - coming soon' });
});

// Dyeing Orders
dyeingRouter.get('/orders', requirePermission('dyeing:read'), (_req, res) => {
  res.json({ message: 'List dyeing orders - coming soon' });
});

dyeingRouter.post('/orders', requirePermission('dyeing:write'), (_req, res) => {
  res.json({ message: 'Create dyeing order (send rolls) - coming soon' });
});

dyeingRouter.get('/orders/:id', requirePermission('dyeing:read'), (_req, res) => {
  res.json({ message: 'Get dyeing order - coming soon' });
});

dyeingRouter.post('/orders/:id/receive', requirePermission('dyeing:write'), (_req, res) => {
  res.json({ message: 'Receive from dyeing - coming soon' });
});

dyeingRouter.get('/orders/:id/weight-analysis', requirePermission('dyeing:read'), (_req, res) => {
  res.json({ message: 'Get weight gain/loss analysis - coming soon' });
});
