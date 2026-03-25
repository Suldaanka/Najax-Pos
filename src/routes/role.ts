import { Router } from 'express';
import { updateUserRole } from '../controllers/roleController';
import { checkAuth, checkRole } from '../middlewares/authMiddleware';

const router = Router();

// Update role of a user within a business. Only OWNER can perform.
router.put('/:userId', checkAuth, checkRole(['OWNER']), updateUserRole);

export default router;
