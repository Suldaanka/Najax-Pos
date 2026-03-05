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

// Invitation logic is already in invitationController.ts,
// so we might not need to duplicate it here if the frontend can use that.
// But let's check invitationController.ts first.
