import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';

export const reportsRouter: Router = Router();

reportsRouter.use(authMiddleware);
reportsRouter.use(tenantMiddleware);

// Production Reports
reportsRouter.get('/production/daily', requirePermission('reports:read'), (_req, res) => {
  res.json({ message: 'Daily production report - coming soon' });
});

reportsRouter.get('/production/weekly', requirePermission('reports:read'), (_req, res) => {
  res.json({ message: 'Weekly production report - coming soon' });
});

reportsRouter.get('/production/monthly', requirePermission('reports:read'), (_req, res) => {
  res.json({ message: 'Monthly production report - coming soon' });
});

// Inventory Reports
reportsRouter.get('/inventory/summary', requirePermission('reports:read'), (_req, res) => {
  res.json({ message: 'Inventory summary - coming soon' });
});

reportsRouter.get('/inventory/yarn-consumption', requirePermission('reports:read'), (_req, res) => {
  res.json({ message: 'Yarn consumption report - coming soon' });
});

// Sales Reports
reportsRouter.get('/sales/summary', requirePermission('reports:read'), (_req, res) => {
  res.json({ message: 'Sales summary - coming soon' });
});

reportsRouter.get('/sales/revenue', requirePermission('reports:read'), (_req, res) => {
  res.json({ message: 'Revenue report - coming soon' });
});

// Finance Reports
reportsRouter.get('/outstanding/aging', requirePermission('reports:read'), (_req, res) => {
  res.json({ message: 'Outstanding aging report - coming soon' });
});

reportsRouter.get('/outstanding/customers', requirePermission('reports:read'), (_req, res) => {
  res.json({ message: 'Customer outstanding report - coming soon' });
});

reportsRouter.get('/outstanding/vendors', requirePermission('reports:read'), (_req, res) => {
  res.json({ message: 'Vendor outstanding report - coming soon' });
});
