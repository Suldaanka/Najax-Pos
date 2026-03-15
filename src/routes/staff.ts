import { Router } from 'express';
import { getStaff, removeStaff, getStaffPerformance } from '../controllers/staffController';
import { checkAuth } from '../middlewares/authMiddleware';

const router = Router();

router.get('/performance', checkAuth, getStaffPerformance);
router.get('/', getStaff);
router.delete('/:id', removeStaff);

export default router;
