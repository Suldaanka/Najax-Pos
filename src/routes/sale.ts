import { Router } from 'express';
import { SaleController } from '../controllers/saleController';
import { checkAuth, checkRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(checkAuth);

router.post('/', SaleController.createSale);
router.get('/', SaleController.getSales);
router.delete('/:id', checkRole(['OWNER']), SaleController.deleteSale);

export default router;
