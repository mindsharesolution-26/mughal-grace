import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';

export const productionRouter = Router();

productionRouter.use(authMiddleware);
productionRouter.use(tenantMiddleware);

// Machines
productionRouter.get('/machines', requirePermission('production:read'), (_req, res) => {
  res.json({ message: 'List machines - coming soon' });
});

productionRouter.post('/machines', requirePermission('production:write'), (_req, res) => {
  res.json({ message: 'Create machine - coming soon' });
});

productionRouter.get('/machines/:id', requirePermission('production:read'), (_req, res) => {
  res.json({ message: 'Get machine details - coming soon' });
});

productionRouter.patch('/machines/:id/status', requirePermission('production:write'), (_req, res) => {
  res.json({ message: 'Update machine status - coming soon' });
});

// Shifts
productionRouter.get('/shifts', requirePermission('production:read'), (_req, res) => {
  res.json({ message: 'List shifts - coming soon' });
});

productionRouter.post('/shifts', requirePermission('production:write'), (_req, res) => {
  res.json({ message: 'Create shift - coming soon' });
});

// Production Logs
productionRouter.get('/logs', requirePermission('production:read'), (_req, res) => {
  res.json({ message: 'List production logs - coming soon' });
});

productionRouter.post('/logs', requirePermission('production:write'), (_req, res) => {
  res.json({ message: 'Create production log - coming soon' });
});

productionRouter.get('/logs/:id', requirePermission('production:read'), (_req, res) => {
  res.json({ message: 'Get production log - coming soon' });
});

productionRouter.post('/logs/:id/consumption', requirePermission('production:write'), (_req, res) => {
  res.json({ message: 'Record yarn consumption - coming soon' });
});

productionRouter.post('/logs/:id/complete', requirePermission('production:write'), (_req, res) => {
  res.json({ message: 'Complete production log - coming soon' });
});

// Downtime
productionRouter.get('/downtime', requirePermission('production:read'), (_req, res) => {
  res.json({ message: 'List downtime logs - coming soon' });
});

productionRouter.post('/downtime', requirePermission('production:write'), (_req, res) => {
  res.json({ message: 'Log downtime - coming soon' });
});

productionRouter.post('/downtime/:id/resolve', requirePermission('production:write'), (_req, res) => {
  res.json({ message: 'Resolve downtime - coming soon' });
});
