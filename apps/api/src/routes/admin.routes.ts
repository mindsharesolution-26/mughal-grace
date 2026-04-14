import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/rbac';

export const adminRouter: Router = Router();

// Admin routes require SUPER_ADMIN role
adminRouter.use(authMiddleware);
adminRouter.use(requireRole('SUPER_ADMIN'));

// Tenant management
adminRouter.get('/tenants', (_req, res) => {
  res.json({ message: 'List tenants - coming soon' });
});

adminRouter.post('/tenants', (_req, res) => {
  res.json({ message: 'Create tenant - coming soon' });
});

adminRouter.get('/tenants/:id', (_req, res) => {
  res.json({ message: 'Get tenant - coming soon' });
});

adminRouter.put('/tenants/:id', (_req, res) => {
  res.json({ message: 'Update tenant - coming soon' });
});

adminRouter.delete('/tenants/:id', (_req, res) => {
  res.json({ message: 'Delete tenant - coming soon' });
});
