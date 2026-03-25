import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export class AuditController {
    /**
     * Gets a paginated list of all audit logs for a specific business.
     */
    static async getLogs(req: AuthRequest, res: Response) {
        try {
            const businessId = req.query.businessId as string;
            
            if (!businessId) {
                return res.status(400).json({ error: 'businessId is required' });
            }

            // Verify the user is querying their own active business
            if (req.user.activeBusinessId !== businessId) {
                return res.status(403).json({ error: 'You do not have permission to view these logs.' });
            }

            // Pagination parameters
            const limit = parseInt(req.query.limit as string) || 50;
            const page = parseInt(req.query.page as string) || 1;
            const skip = (page - 1) * limit;

            const logs = await prisma.auditLog.findMany({
                where: { businessId },
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            image: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: limit,
                skip: skip
            });

            const totalCount = await prisma.auditLog.count({
                where: { businessId }
            });

            return res.json({
                data: logs,
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit)
                }
            });
        } catch (error) {
            console.error('[AuditController] Get logs error:', error);
            return res.status(500).json({ error: 'Failed to fetch audit logs' });
        }
    }
}
