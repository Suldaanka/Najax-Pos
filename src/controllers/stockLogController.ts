import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export class StockLogController {
    // List logs for a specific product
    static async getProductLogs(req: AuthRequest, res: Response) {
        try {
            const { productId } = req.params;
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

            const logs = await prisma.stockLog.findMany({
                where: {
                    businessId: user.activeBusinessId,
                    productId: productId
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 100 // Limit to last 100 logs
            });

            return res.json(logs);
        } catch (error) {
            console.error('Get product logs error:', error);
            return res.status(500).json({ error: 'Failed to fetch stock logs' });
        }
    }

    // List logs for the entire business (General history)
    static async getBusinessLogs(req: AuthRequest, res: Response) {
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

            const logs = await prisma.stockLog.findMany({
                where: {
                    businessId: user.activeBusinessId
                },
                include: {
                    product: {
                        select: {
                            name: true,
                            barcode: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 50
            });

            return res.json(logs);
        } catch (error) {
            console.error('Get business logs error:', error);
            return res.status(500).json({ error: 'Failed to fetch business stock logs' });
        }
    }
}
