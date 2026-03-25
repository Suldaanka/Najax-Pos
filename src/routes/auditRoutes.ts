import { Router } from 'express';
import { AuditController } from '../controllers/auditController';
import { checkAuth, checkRole } from '../middlewares/authMiddleware';

const router = Router();

// Only OWNERS can view the audit logs for their business
router.get('/', checkAuth, checkRole(['OWNER']), AuditController.getLogs);

export default router;
