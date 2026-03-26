import { Router } from 'express';
import { BusinessController } from '../controllers/businessController';
import { InvitationController } from '../controllers/invitationController';
import { checkAuth, checkRole } from '../middlewares/authMiddleware';

const router = Router();

// All business routes require authentication
router.use(checkAuth);

// Business management
router.post('/', BusinessController.createBusiness);
router.get('/', BusinessController.getBusiness);
router.get('/my-businesses', BusinessController.listMemberBusinesses);
router.post('/switch-business', BusinessController.switchBusiness);
router.put('/', checkRole(['OWNER']), BusinessController.updateBusiness);

// User Management
router.get('/users', BusinessController.listUsers);
router.put('/users/:userId/role', checkRole(['OWNER']), BusinessController.updateUserRole);
router.put('/users/:userId/branch', checkRole(['OWNER']), BusinessController.updateUserBranch);
router.delete('/users/:userId', checkRole(['OWNER']), BusinessController.removeUser);

// Staff Invitation System
router.post('/invite', checkRole(['OWNER']), InvitationController.inviteStaff);
router.post('/invite/accept', InvitationController.acceptInvitation);
router.get('/invitations', checkRole(['OWNER']), InvitationController.listInvitations);
router.delete('/invite/:id', checkRole(['OWNER']), InvitationController.revokeInvitation);

export default router;
