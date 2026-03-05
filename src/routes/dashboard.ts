import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { checkAuth } from '../middlewares/authMiddleware';

const router = Router();

// Protect all dashboard routes
router.use(checkAuth);

router.get('/', DashboardController.getDashboardStats);

export default router;
