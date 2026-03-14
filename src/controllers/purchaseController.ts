import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export class PurchaseController {
    static async getPurchases(req: AuthRequest, res: Response) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const purchases = await prisma.purchase.findMany({
                where: { businessId: user.activeBusinessId },
                include: {
                    supplier: true,
                    items: {
                        include: {
                            product: true
                        }
                    }
                },
                orderBy: { date: 'desc' }
            });

            return res.json(purchases);
        } catch (error) {
            console.error('Get purchases error:', error);
            return res.status(500).json({ error: 'Failed to fetch purchases' });
        }
    }

    static async createPurchase(req: AuthRequest, res: Response) {
        try {
            const { supplierId, totalAmount, date, items } = req.body;
            
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const result = await prisma.$transaction(async (tx) => {
                // 1. Create the purchase
                const purchase = await tx.purchase.create({
                    data: {
                        businessId: user.activeBusinessId!,
                        supplierId,
                        totalAmount,
                        date: date ? new Date(date) : new Date(),
                        items: {
                            create: items.map((item: any) => ({
                                productId: item.productId || null,
                                itemName: item.itemName || null,
                                quantity: item.quantity,
                                costPrice: item.costPrice
                            }))
                        }
                    }
                });

                // 2. Update product stock and cost price (only for items with a productId)
                for (const item of items) {
                    if (item.productId) {
                        await tx.product.update({
                            where: { id: item.productId },
                            data: {
                                stockQuantity: {
                                    increment: item.quantity
                                },
                                costPrice: item.costPrice
                            }
                        });
                    }
                }

                return purchase;
            });

            return res.status(201).json(result);
        } catch (error) {
            console.error('Create purchase error:', error);
            return res.status(500).json({ error: 'Failed to create purchase' });
        }
    }

    static async deletePurchase(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;

            // In a real system, you might want to decide if deleting a purchase should revert stock
            // For now, mirroring common patterns of just deleting the record
            await prisma.$transaction([
                prisma.purchaseItem.deleteMany({ where: { purchaseId: id as string } }),
                prisma.purchase.delete({ where: { id: id as string } })
            ]);

            return res.status(204).send();
        } catch (error) {
            console.error('Delete purchase error:', error);
            return res.status(500).json({ error: 'Failed to delete purchase' });
        }
    }
}
