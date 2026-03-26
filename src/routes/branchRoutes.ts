import { Router } from 'express';
import { BranchController } from '../controllers/branchController';
import { checkAuth, checkRole } from '../middlewares/authMiddleware';

const router = Router();

router.post('/', checkAuth, checkRole(['OWNER']), BranchController.createBranch);
router.get('/', checkAuth, BranchController.getBranches);
router.post('/transfer', checkAuth, checkRole(['OWNER']), BranchController.transferStock);

export default router;
