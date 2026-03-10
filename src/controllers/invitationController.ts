import { Request, Response } from 'express';
import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/emailService';
import crypto from 'crypto';

import { fromNodeHeaders } from "better-auth/node";

export class InvitationController {
    // Invite staff member (Owner only)
    static async inviteStaff(req: Request, res: Response) {
        console.log('--- Invite Staff Debug ---');
        console.log('Body:', JSON.stringify(req.body));
        console.log('Headers:', JSON.stringify(req.headers));

        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers)
            });

            console.log('Session found:', !!session);
            if (session) console.log('User ID:', session.user.id);

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated', details: 'No session found' });
            }

            const { email, role } = req.body;
            console.log('Email:', email, 'Role:', role);

            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            // Validate role
            const validRoles = ['STAFF', 'OWNER'];
            if (role && !validRoles.includes(role)) {
                return res.status(400).json({ error: 'Invalid role', details: `Role ${role} is not valid` });
            }

            // Get user's active business
            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });

            console.log('User activeBusinessId:', user?.activeBusinessId);

            if (!user?.activeBusinessId) {
                return res.status(400).json({
                    error: 'You must have an active business to invite staff',
                    details: 'User record missing activeBusinessId'
                });
            }

            const business = await prisma.business.findUnique({
                where: { id: user.activeBusinessId }
            });

            if (!business) {
                console.log('Business not found for ID:', user.activeBusinessId);
                return res.status(400).json({ error: 'Active business not found' });
            }

            // Check if user is owner of this business
            const membership = await prisma.businessMember.findFirst({
                where: {
                    userId: user.id,
                    businessId: business.id
                }
            });

            console.log('Membership found:', !!membership, 'Role:', membership?.role);

            if (!membership || membership.role !== 'OWNER') {
                return res.status(403).json({ error: 'Only business owners can invite staff' });
            }

            // Check if user already exists in the business
            const existingMember = await prisma.businessMember.findFirst({
                where: {
                    businessId: business.id,
                    user: { email }
                }
            });

            if (existingMember) {
                return res.status(400).json({ error: 'User is already part of this business' });
            }

            // Check for pending invitation
            const existingInvitation = await prisma.invitation.findFirst({
                where: {
                    email,
                    businessId: business.id,
                    status: 'PENDING',
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });

            if (existingInvitation) {
                return res.status(400).json({ error: 'An active invitation already exists for this email' });
            }

            // Generate invitation token
            const invitationToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(invitationToken).digest('hex');
            const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            // Create invitation
            const invitation = await prisma.invitation.create({
                data: {
                    email,
                    businessId: business.id,
                    role: role || 'STAFF',
                    token: hashedToken,
                    invitedBy: user.id,
                    expiresAt
                }
            });

            // Send invitation email
            await emailService.sendInvitationEmail(
                email,
                business.name,
                user.name || user.email,
                invitationToken,
                role || 'STAFF'
            );

            return res.status(201).json({
                message: 'Invitation sent successfully',
                invitation: {
                    id: invitation.id,
                    email: invitation.email,
                    role: invitation.role,
                    expiresAt: invitation.expiresAt
                }
            });
        } catch (error) {
            console.error('Invite staff error:', error);
            return res.status(500).json({ error: 'Failed to send invitation' });
        }
    }

    // Accept invitation
    static async acceptInvitation(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers)
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { token } = req.body;

            if (!token) {
                return res.status(400).json({ error: 'Token is required' });
            }

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            // Find invitation
            const invitation = await prisma.invitation.findFirst({
                where: {
                    token: hashedToken,
                    status: 'PENDING',
                    expiresAt: {
                        gt: new Date()
                    }
                },
                include: {
                    business: true
                }
            });

            if (!invitation) {
                return res.status(400).json({ error: 'Invalid or expired invitation' });
            }

            // Get current user
            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Verify email matches
            if (user.email !== invitation.email) {
                return res.status(400).json({ error: 'This invitation is for a different email address' });
            }

            // Check if user is already part of this business
            const existingMembership = await prisma.businessMember.findFirst({
                where: {
                    userId: user.id,
                    businessId: invitation.businessId
                }
            });

            if (existingMembership) {
                return res.status(400).json({ error: 'You are already a member of this business' });
            }

            // Add user as member
            await prisma.businessMember.create({
                data: {
                    userId: user.id,
                    businessId: invitation.businessId,
                    role: invitation.role
                }
            });

            // Set as active business if they don't have one
            if (!user.activeBusinessId) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { activeBusinessId: invitation.businessId }
                });
            }

            // Mark invitation as accepted
            await prisma.invitation.update({
                where: { id: invitation.id },
                data: { status: 'ACCEPTED' }
            });

            return res.json({
                message: 'Invitation accepted successfully',
                business: {
                    id: invitation.business.id,
                    name: invitation.business.name
                },
                role: invitation.role
            });
        } catch (error) {
            console.error('Accept invitation error:', error);
            return res.status(500).json({ error: 'Failed to accept invitation' });
        }
    }

    // List pending invitations (Owner only)
    static async listInvitations(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers)
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business found' });
            }

            const membership = await prisma.businessMember.findFirst({
                where: {
                    userId: user.id,
                    businessId: user.activeBusinessId
                }
            });

            if (!membership || membership.role !== 'OWNER') {
                return res.status(403).json({ error: 'Only business owners can view invitations' });
            }

            const invitations = await prisma.invitation.findMany({
                where: {
                    businessId: user.activeBusinessId
                },
                orderBy: {
                    createdAt: 'desc'
                },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    status: true,
                    expiresAt: true,
                    createdAt: true
                }
            });

            return res.json({ invitations });
        } catch (error) {
            console.error('List invitations error:', error);
            return res.status(500).json({ error: 'Failed to list invitations' });
        }
    }

    // Revoke invitation (Owner only)
    static async revokeInvitation(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: fromNodeHeaders(req.headers)
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const invitationId = req.params.id as string;

            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business found' });
            }

            const membership = await prisma.businessMember.findFirst({
                where: {
                    userId: user.id,
                    businessId: user.activeBusinessId
                }
            });

            if (!membership || membership.role !== 'OWNER') {
                return res.status(403).json({ error: 'Only business owners can revoke invitations' });
            }

            // Find invitation
            const invitation = await prisma.invitation.findUnique({
                where: { id: invitationId }
            });

            if (!invitation) {
                return res.status(404).json({ error: 'Invitation not found' });
            }

            if (invitation.businessId !== user.activeBusinessId) {
                return res.status(403).json({ error: 'Cannot revoke invitation from another business' });
            }

            // Update invitation status
            await prisma.invitation.update({
                where: { id: invitationId },
                data: { status: 'REVOKED' }
            });

            return res.json({ message: 'Invitation revoked successfully' });
        } catch (error) {
            console.error('Revoke invitation error:', error);
            return res.status(500).json({ error: 'Failed to revoke invitation' });
        }
    }
}
