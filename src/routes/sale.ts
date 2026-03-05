import { Router } from 'express';
import { SaleController } from '../controllers/saleController';
import { checkAuth } from '../middlewares/authMiddleware';

const router = Router();

router.use(checkAuth);

router.post('/', SaleController.createSale);
router.get('/', SaleController.getSales);

export default router;
