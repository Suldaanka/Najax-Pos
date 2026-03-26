import { Router } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct, adjustStock } from '../controllers/productController';

import { checkAuth, checkRole } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', checkAuth, getProducts);
router.post('/', checkAuth, checkRole(['OWNER']), createProduct);
router.put('/:id', checkAuth, checkRole(['OWNER']), updateProduct);
router.patch('/:id/adjust-stock', checkAuth, checkRole(['OWNER']), adjustStock);
router.delete('/:id', checkAuth, checkRole(['OWNER']), deleteProduct);

export default router;
