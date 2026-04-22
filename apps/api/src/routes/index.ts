import { Router } from 'express';
import { authRouter } from './auth.routes';
import { adminRouter } from './admin.routes';
import { yarnRouter } from './yarn.routes';
import { productsRouter } from './products.routes';
import { productionRouter } from './production.routes';
import { rollsRouter } from './rolls.routes';
import { dyeingRouter } from './dyeing.routes';
import { salesRouter } from './sales.routes';
import { reportsRouter } from './reports.routes';
import { settingsRouter } from './settings.routes';
import whatsappRouter from './whatsapp.routes';
import { payablesRouter } from './payables.routes';
import { receivablesRouter } from './receivables.routes';
import { chequesRouter } from './cheques.routes';
import { usersRouter } from './users.routes';
import { needlesRouter } from './needles.routes';
import { machinesRouter } from './machines.routes';
import { inventoryRouter } from './inventory.routes';
import { fabricsRouter } from './fabrics.routes';
import { chatRouter } from './chat.routes';
import { importRouter } from './import.routes';

export const apiRouter: Router = Router();

// Public routes
apiRouter.use('/auth', authRouter);

// Protected routes (tenant-scoped)
apiRouter.use('/admin', adminRouter);
apiRouter.use('/yarn', yarnRouter);
apiRouter.use('/products', productsRouter);
apiRouter.use('/production', productionRouter);
apiRouter.use('/rolls', rollsRouter);
apiRouter.use('/dyeing', dyeingRouter);
apiRouter.use('/sales', salesRouter);
apiRouter.use('/reports', reportsRouter);
apiRouter.use('/settings', settingsRouter);
apiRouter.use('/whatsapp', whatsappRouter);
apiRouter.use('/payables', payablesRouter);
apiRouter.use('/receivables', receivablesRouter);
apiRouter.use('/cheques', chequesRouter);
apiRouter.use('/users', usersRouter);
apiRouter.use('/needles', needlesRouter);
apiRouter.use('/machines', machinesRouter);
apiRouter.use('/inventory', inventoryRouter);
apiRouter.use('/fabrics', fabricsRouter);
apiRouter.use('/chat', chatRouter);
apiRouter.use('/import', importRouter);
