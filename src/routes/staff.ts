import { Router } from 'express';
import { getStaff, removeStaff, getStaffPerformance } from '../controllers/staffController';
import { checkAuth, checkRole } from '../middlewares/authMiddleware';

const router = Router();

router.get('/performance', checkAuth, getStaffPerformance);
router.get('/', checkAuth, getStaff);
router.delete('/:id', checkAuth, checkRole(['OWNER']), removeStaff);

export default router;
