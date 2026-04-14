import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { AuditService } from '../services/auditService';
import { AuditAction } from '@prisma/client';

export class BusinessController {
    // Create a new business (onboarding)
    static async createBusiness(req: AuthRequest, res: Response) {
        try {
            const { name, type, address, phone } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            // Allow users to create multiple businesses

            // Create business
            const business = await prisma.business.create({
                data: {
                    name,
                    type: type || 'SHOP',
                    address,
                    phone,
                    subscriptionStatus: 'INACTIVE',
                }
            });

            // Add user as owner in BusinessMember
            await prisma.businessMember.create({
                data: {
                    userId,
                    businessId: business.id,
                    role: 'OWNER'
                }
            });

            // Update user's activeBusinessId
            await prisma.user.update({
                where: { id: userId },
                data: {
                    activeBusinessId: business.id
                }
            });

            return res.status(201).json({
                message: 'Business created successfully',
                business
            });
        } catch (error) {
            console.error('Create business error:', error);
            return res.status(500).json({ error: 'Failed to create business' });
        }
    }

    // Get business details
    static async getBusiness(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user?.activeBusinessId) {
                return res.status(404).json({ error: 'No active business found' });
            }

            const business = await prisma.business.findUnique({
                where: { id: user.activeBusinessId },
                include: {
                    users: {
                        include: {
                            user: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    },
                    subscriptions: {
                        where: { status: 'ACTIVE' },
                        orderBy: { createdAt: 'desc' },
                        take: 1
                    }
                }
            });

            if (!business) {
                return res.status(404).json({ error: 'Business not found' });
            }

            return res.json(business);
        } catch (error) {
            console.error('Get business error:', error);
            return res.status(500).json({ error: 'Failed to get business' });
        }
    }

    // Update business details
    static async updateBusiness(req: AuthRequest, res: Response) {
        try {
            const { name, type, address, phone } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user?.activeBusinessId) {
                return res.status(404).json({ error: 'No active business found' });
            }

            const membership = await prisma.businessMember.findFirst({
                where: {
                    userId,
                    businessId: user.activeBusinessId
                }
            });

            if (!membership || membership.role !== 'OWNER') {
                return res.status(403).json({ error: 'Only business owners can update business details' });
            }

            const updatedBusiness = await prisma.business.update({
                where: { id: user.activeBusinessId },
                data: { name, type, address, phone }
            });

            return res.json({
                message: 'Business updated successfully',
                business: updatedBusiness
            });
        } catch (error) {
            console.error('Update business error:', error);
            return res.status(500).json({ error: 'Failed to update business' });
        }
    }

    // List all businesses where the user is a member
    static async listMemberBusinesses(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const memberships = await prisma.businessMember.findMany({
                where: { userId },
                include: {
                    business: true
                }
            });

            const businesses = memberships.map(m => ({
                id: m.business.id,
                name: m.business.name,
                type: m.business.type,
                role: m.role
            }));

            return res.json(businesses);
        } catch (error) {
            console.error('List member businesses error:', error);
            return res.status(500).json({ error: 'Failed to list businesses' });
        }
    }

    // Switch active business
    static async switchBusiness(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const businessId = req.body.businessId || req.user?.activeBusinessId;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            if (!businessId) {
                return res.status(400).json({ error: 'businessId is required' });
            }

            // Verify user is a member of this business
            const membership = await prisma.businessMember.findFirst({
                where: {
                    userId,
                    businessId
                }
            });

            if (!membership) {
                return res.status(403).json({ error: 'You are not a member of this business' });
            }

            // Update user's activeBusinessId
            const updatedUser = await prisma.user.update({
                where: { id: userId },
                data: {
                    activeBusinessId: businessId
                }
            });

            return res.json({
                message: 'Business switched successfully',
                activeBusinessId: updatedUser.activeBusinessId
            });
        } catch (error) {
            console.error('Switch business error:', error);
            return res.status(500).json({ error: 'Failed to switch business' });
        }
    }

    // List business users
    static async listUsers(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!user?.activeBusinessId) {
                return res.status(404).json({ error: 'No active business found' });
            }

            const users = await prisma.businessMember.findMany({
                where: { businessId: user.activeBusinessId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            emailVerified: true,
                            createdAt: true
                        }
                    }
                },
                orderBy: { createdAt: 'asc' }
            });

            return res.json({
                users: users.map(m => ({
                    ...m.user,
                    role: m.role
                }))
            });
        } catch (error) {
            console.error('List users error:', error);
            return res.status(500).json({ error: 'Failed to list users' });
        }
    }

    // Update user role (Owner only)
    static async updateUserRole(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const targetUserId = req.params.userId as string;
            const { role } = req.body;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            if (!role || !['OWNER', 'STAFF'].includes(role)) {
                return res.status(400).json({ error: 'Invalid role' });
            }

            const currentUser = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!currentUser?.activeBusinessId) {
                return res.status(404).json({ error: 'No active business found' });
            }

            const currentMembership = await prisma.businessMember.findFirst({
                where: {
                    userId,
                    businessId: currentUser.activeBusinessId
                }
            });

            if (!currentMembership || currentMembership.role !== 'OWNER') {
                return res.status(403).json({ error: 'Only business owners can update user roles' });
            }

            // Get target membership
            const targetMembership = await prisma.businessMember.findFirst({
                where: {
                    userId: targetUserId,
                    businessId: currentUser.activeBusinessId
                },
                include: { user: true }
            });

            if (!targetMembership) {
                return res.status(404).json({ error: 'User is not part of your business' });
            }

            // Prevent changing own role
            if (targetUserId === userId) {
                return res.status(400).json({ error: 'Cannot change your own role' });
            }

            // Update role
            const updatedMembership = await prisma.businessMember.update({
                where: { id: targetMembership.id },
                data: { role: role as any }
            });

            await AuditService.logAction(
                currentUser.activeBusinessId,
                userId,
                AuditAction.UPDATE,
                'STAFF',
                targetMembership.user.id,
                `Changed role of ${targetMembership.user.name} to ${role}`
            );

            return res.json({
                message: 'User role updated successfully',
                user: {
                    id: targetMembership.user.id,
                    name: targetMembership.user.name,
                    email: targetMembership.user.email,
                    role: updatedMembership.role
                }
            });
        } catch (error) {
            console.error('Update user role error:', error);
            return res.status(500).json({ error: 'Failed to update user role' });
        }
    }

    // Remove user from business (Owner only)
    static async removeUser(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const targetUserId = req.params.userId as string;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const currentUser = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!currentUser?.activeBusinessId) {
                return res.status(404).json({ error: 'No active business found' });
            }

            const currentMembership = await prisma.businessMember.findFirst({
                where: {
                    userId,
                    businessId: currentUser.activeBusinessId
                }
            });

            if (!currentMembership || currentMembership.role !== 'OWNER') {
                return res.status(403).json({ error: 'Only business owners can remove users' });
            }

            // Get target membership
            const targetMembership = await prisma.businessMember.findFirst({
                where: {
                    userId: targetUserId,
                    businessId: currentUser.activeBusinessId
                },
                include: { user: true }
            });

            if (!targetMembership) {
                return res.status(404).json({ error: 'User is not part of your business' });
            }

            // Prevent removing self
            if (targetUserId === userId) {
                return res.status(400).json({ error: 'Cannot remove yourself from the business' });
            }

            // Prevent removing another owner
            if (targetMembership.role === 'OWNER') {
                return res.status(400).json({ error: 'Cannot remove another owner. Change their role first.' });
            }

            // Remove user from business
            await prisma.businessMember.delete({
                where: { id: targetMembership.id }
            });

            // Reset activeBusinessId if it was this business
            if (targetMembership.user.activeBusinessId === currentUser.activeBusinessId) {
                await prisma.user.update({
                    where: { id: targetUserId as string },
                    data: { activeBusinessId: null }
                });
            }

            await AuditService.logAction(
                currentUser.activeBusinessId,
                userId,
                AuditAction.DELETE,
                'STAFF',
                targetMembership.user.id,
                `Removed staff member ${targetMembership.user.name} from the business`
            );

            return res.json({ message: 'User removed from business successfully' });
        } catch (error) {
            console.error('Remove user error:', error);
            return res.status(500).json({ error: 'Failed to remove user' });
        }
    }

    // Update user branch (Owner only)
    static async updateUserBranch(req: AuthRequest, res: Response) {
        try {
            const userId = req.user?.id;
            const targetUserId = req.params.userId as string;
            const { branchId } = req.body;

            if (!userId) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const currentUser = await prisma.user.findUnique({
                where: { id: userId }
            });

            if (!currentUser?.activeBusinessId) {
                return res.status(404).json({ error: 'No active business found' });
            }

            const currentMembership = await prisma.businessMember.findFirst({
                where: {
                    userId,
                    businessId: currentUser.activeBusinessId
                }
            });

            if (!currentMembership || currentMembership.role !== 'OWNER') {
                return res.status(403).json({ error: 'Only business owners can update user branches' });
            }

            // Get target membership
            const targetMembership = await prisma.businessMember.findFirst({
                where: {
                    userId: targetUserId,
                    businessId: currentUser.activeBusinessId
                },
                include: { user: true }
            });

            if (!targetMembership) {
                return res.status(404).json({ error: 'User is not part of your business' });
            }

            // Update branchId in BusinessMember
            await prisma.businessMember.update({
                where: { id: targetMembership.id },
                data: { branchId: branchId === "global" ? null : branchId }
            });

            await AuditService.logAction(
                currentUser.activeBusinessId,
                userId,
                AuditAction.UPDATE,
                'STAFF',
                targetUserId,
                `Updated branch assignment for ${targetMembership.user.name}`
            );

            return res.json({
                message: 'User branch updated successfully',
                branchId: branchId === "global" ? null : branchId
            });
        } catch (error) {
            console.error('Update user branch error:', error);
            return res.status(500).json({ error: 'Failed to update user branch' });
        }
    }
}
