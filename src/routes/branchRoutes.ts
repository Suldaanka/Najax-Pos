import { Router } from 'express';
import { BranchController } from '../controllers/branchController';
import { checkAuth } from '../middlewares/authMiddleware';
import { checkRole } from '../middlewares/roleMiddleware';

const router = Router();

router.post('/', checkAuth, checkRole(['OWNER']), BranchController.createBranch);
router.get('/', checkAuth, BranchController.getBranches);
router.post('/transfer', checkAuth, checkRole(['OWNER']), BranchController.transferStock);

export default router;
