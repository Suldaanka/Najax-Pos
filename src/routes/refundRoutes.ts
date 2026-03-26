import { Router } from 'express';
import { RefundController } from '../controllers/refundController';
import { checkAuth } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', checkAuth, RefundController.processRefund);
router.get('/', checkAuth, RefundController.getRefunds);

export default router;
