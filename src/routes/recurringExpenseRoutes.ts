import { Router } from 'express';
import { RecurringExpenseController } from '../controllers/recurringExpenseController';
import { checkAuth, checkRole } from '../middlewares/authMiddleware';

const router = Router();

router.use((req, res, next) => checkAuth(req as any, res, next));

router.get('/', RecurringExpenseController.getRecurringExpenses);
router.post('/', checkRole(['OWNER']), RecurringExpenseController.createRecurringExpense);
router.put('/:id', checkRole(['OWNER']), RecurringExpenseController.updateRecurringExpense);
router.delete('/:id', checkRole(['OWNER']), RecurringExpenseController.deleteRecurringExpense);

export default router;
