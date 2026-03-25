import { Router } from 'express';
import { SubscriptionController } from '../controllers/subscriptionController';
import { checkAuth, checkRole } from '../middlewares/authMiddleware';

const router = Router();

// Get current subscription status
router.get('/status', checkAuth, SubscriptionController.getStatus);

// Initiate a payment (Owner only)
router.post('/pay', checkAuth, checkRole(['OWNER']), SubscriptionController.initiatePayment as any);

// Verify a pending payment (Owner only)
router.get('/verify/:id', checkAuth, checkRole(['OWNER']), SubscriptionController.verifyStatus as any);

export default router;
