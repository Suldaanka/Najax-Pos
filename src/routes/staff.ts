import { Router } from 'express';
import { getStaff, removeStaff } from '../controllers/staffController';

const router = Router();

router.get('/', getStaff);
router.delete('/:id', removeStaff);

export default router;
