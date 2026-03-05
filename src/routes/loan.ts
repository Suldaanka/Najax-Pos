import { Router } from 'express';
import { LoanController } from '../controllers/loanController';
import { checkAuth } from '../middlewares/authMiddleware';

const router = Router();

router.use(checkAuth);

router.post('/', LoanController.createLoan);
router.get('/', LoanController.getLoans);
router.post('/:id/payments', LoanController.recordPayment);
router.put('/:id/status', LoanController.updateStatus);
router.delete('/:id', LoanController.deleteLoan);

export default router;
