import { Router } from 'express';
import { getStaff, removeStaff, getStaffPerformance } from '../controllers/staffController';
import { checkAuth } from '../middlewares/authMiddleware';

const router = Router();

router.get('/', getStaff);
router.get('/performance', checkAuth, getStaffPerformance);
router.delete('/:id', removeStaff);

export default router;
