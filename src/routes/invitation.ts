import { Router } from 'express';
import { InvitationController } from '../controllers/invitationController';
import { checkAuth } from '../middlewares/authMiddleware';

const router = Router();

// Staff Invitation System
// Mounted at /api/invitations in app.ts
router.post('/', checkAuth, InvitationController.inviteStaff);        // POST /api/invitations
router.get('/', checkAuth, InvitationController.listInvitations);     // GET /api/invitations
router.post('/accept', checkAuth, InvitationController.acceptInvitation); // POST /api/invitations/accept
router.delete('/:id', checkAuth, InvitationController.revokeInvitation); // DELETE /api/invitations/:id

export default router;
