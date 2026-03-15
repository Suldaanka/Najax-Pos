import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const getStaff = async (req: Request, res: Response) => {
    try {
        const businessId = req.query.businessId as string;
        if (!businessId) {
            return res.status(400).json({ error: 'businessId is required' });
        }

        const staff = await (prisma as any).businessMember.findMany({
            where: { businessId: businessId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(staff);
    } catch (error) {
        console.error('Get staff error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const removeStaff = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };

        // Don't allow removing the owner if we want to be safe, 
        // but for now let's just implement the delete.
        await (prisma as any).businessMember.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Remove staff error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getStaffPerformance = async (req: Request, res: Response) => {
    try {
        const businessId = (req as any).user?.activeBusinessId;
        if (!businessId) {
            return res.status(400).json({ error: 'No active business selected' });
        }

        const staffMembers = await (prisma as any).businessMember.findMany({
            where: { businessId: businessId },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        });

        const performance = await Promise.all(staffMembers.map(async (member: any) => {
            const stats = await prisma.sale.aggregate({
                where: {
                    businessId: businessId,
                    staffId: member.userId
                },
                _count: {
                    id: true
                },
                _sum: {
                    totalAmount: true
                }
            });

            return {
                id: member.id,
                userId: member.userId,
                name: member.user.name,
                email: member.user.email,
                role: member.role,
                salesCount: stats._count.id || 0,
                totalRevenue: stats._sum.totalAmount || 0
            };
        }));

        res.json(performance);
    } catch (error) {
        console.error('Get staff performance error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
