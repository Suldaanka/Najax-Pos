import { Router } from 'express';
import { SupplierController } from '../controllers/supplierController';
import { checkAuth, checkRole } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', checkAuth, SupplierController.getSuppliers);
router.post('/', checkAuth, checkRole(['OWNER']), SupplierController.createSupplier);
router.put('/:id', checkAuth, checkRole(['OWNER']), SupplierController.updateSupplier);
router.delete('/:id', checkAuth, checkRole(['OWNER']), SupplierController.deleteSupplier);

export default router;
