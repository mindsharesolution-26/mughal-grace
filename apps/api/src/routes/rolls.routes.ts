import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';

export const rollsRouter = Router();

rollsRouter.use(authMiddleware);
rollsRouter.use(tenantMiddleware);

// Rolls CRUD
rollsRouter.get('/', requirePermission('rolls:read'), (_req, res) => {
  res.json({ message: 'List rolls - coming soon' });
});

rollsRouter.post('/', requirePermission('rolls:write'), (_req, res) => {
  res.json({ message: 'Create roll - coming soon' });
});

rollsRouter.get('/:id', requirePermission('rolls:read'), (_req, res) => {
  res.json({ message: 'Get roll details - coming soon' });
});

rollsRouter.patch('/:id/status', requirePermission('rolls:write'), (_req, res) => {
  res.json({ message: 'Update roll status - coming soon' });
});

rollsRouter.get('/:id/history', requirePermission('rolls:read'), (_req, res) => {
  res.json({ message: 'Get roll status history - coming soon' });
});

// Grey Stock
rollsRouter.get('/grey-stock/summary', requirePermission('rolls:read'), (_req, res) => {
  res.json({ message: 'Get grey stock summary - coming soon' });
});

// Finished Stock
rollsRouter.get('/finished-stock/summary', requirePermission('rolls:read'), (_req, res) => {
  res.json({ message: 'Get finished stock summary - coming soon' });
});
