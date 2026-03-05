import { Router } from 'express';
import { RecurringExpenseController } from '../controllers/recurringExpenseController';
import { checkAuth } from '../middlewares/authMiddleware';

const router = Router();

router.use((req, res, next) => checkAuth(req as any, res, next));

router.get('/', RecurringExpenseController.getRecurringExpenses);
router.post('/', RecurringExpenseController.createRecurringExpense);
router.put('/:id', RecurringExpenseController.updateRecurringExpense);
router.delete('/:id', RecurringExpenseController.deleteRecurringExpense);

export default router;
