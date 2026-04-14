import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { tenantMiddleware } from '../middleware/tenant';
import { requirePermission } from '../middleware/rbac';

export const salesRouter = Router();

salesRouter.use(authMiddleware);
salesRouter.use(tenantMiddleware);

// Customers
salesRouter.get('/customers', requirePermission('sales:read'), (_req, res) => {
  res.json({ message: 'List customers - coming soon' });
});

salesRouter.post('/customers', requirePermission('sales:write'), (_req, res) => {
  res.json({ message: 'Create customer - coming soon' });
});

salesRouter.get('/customers/:id', requirePermission('sales:read'), (_req, res) => {
  res.json({ message: 'Get customer - coming soon' });
});

salesRouter.get('/customers/:id/ledger', requirePermission('sales:read'), (_req, res) => {
  res.json({ message: 'Get customer ledger - coming soon' });
});

salesRouter.get('/customers/:id/orders', requirePermission('sales:read'), (_req, res) => {
  res.json({ message: 'Get customer orders - coming soon' });
});

// Sales Orders
salesRouter.get('/orders', requirePermission('sales:read'), (_req, res) => {
  res.json({ message: 'List sales orders - coming soon' });
});

salesRouter.post('/orders', requirePermission('sales:write'), (_req, res) => {
  res.json({ message: 'Create sales order - coming soon' });
});

salesRouter.get('/orders/:id', requirePermission('sales:read'), (_req, res) => {
  res.json({ message: 'Get sales order - coming soon' });
});

salesRouter.patch('/orders/:id/confirm', requirePermission('sales:write'), (_req, res) => {
  res.json({ message: 'Confirm order - coming soon' });
});

salesRouter.patch('/orders/:id/dispatch', requirePermission('sales:write'), (_req, res) => {
  res.json({ message: 'Dispatch order - coming soon' });
});

salesRouter.get('/orders/:id/invoice', requirePermission('sales:read'), (_req, res) => {
  res.json({ message: 'Generate invoice - coming soon' });
});

// Payments
salesRouter.get('/payments', requirePermission('sales:read'), (_req, res) => {
  res.json({ message: 'List payments - coming soon' });
});

salesRouter.post('/payments', requirePermission('sales:write'), (_req, res) => {
  res.json({ message: 'Record payment - coming soon' });
});
