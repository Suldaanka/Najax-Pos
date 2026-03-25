import { Router } from 'express';
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expenseController';
import { checkAuth, checkRole } from '../middlewares/authMiddleware';

const router = Router();

router.use(checkAuth);

router.get('/', getExpenses);
router.post('/', createExpense);
router.put('/:id', checkRole(['OWNER']), updateExpense);
router.delete('/:id', checkRole(['OWNER']), deleteExpense);

export default router;
