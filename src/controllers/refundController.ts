import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../services/auditService';

export class RefundController {
    static async processRefund(req: AuthRequest, res: Response) {
        try {
            const { saleId, items, reason } = req.body; // items: [{ productId, quantity }]
            const businessId = req.body.businessId || req.user?.activeBusinessId;
            const userId = req.user?.id;

            if (!businessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const sale = await prisma.sale.findUnique({
                where: { id: saleId },
                include: { items: true }
            });

            if (!sale || sale.businessId !== businessId) {
                return res.status(404).json({ error: 'Sale not found' });
            }

            const result = await prisma.$transaction(async (tx) => {
                let refundTotal = new Prisma.Decimal(0);
                const refundItemsData = [];

                for (const item of items) {
                    const saleItem = sale.items.find(si => si.productId === item.productId);
                    if (!saleItem) throw new Error(`Product ${item.productId} not found in original sale`);
                    if (new Prisma.Decimal(item.quantity).gt(saleItem.quantity)) {
                        throw new Error(`Refund quantity exceeds original sale quantity for product ${item.productId}`);
                    }

                    const itemRefundAmount = new Prisma.Decimal(saleItem.price).mul(item.quantity);
                    refundTotal = refundTotal.plus(itemRefundAmount);

                    refundItemsData.push({
                        productId: item.productId,
                        quantity: item.quantity,
                        amount: itemRefundAmount
                    });

                    // Update stock in the correct branch
                    if (sale.branchId) {
                        const inventory = await tx.inventoryLevel.findUnique({
                            where: { productId_branchId: { productId: item.productId, branchId: sale.branchId } }
                        });

                        if (inventory) {
                            const oldStock = inventory.stockQuantity;
                            const newStock = oldStock.plus(item.quantity);

                            await tx.inventoryLevel.update({
                                where: { id: inventory.id },
                                data: { stockQuantity: newStock }
                            });

                            // Record stock log
                            await tx.stockLog.create({
                                data: {
                                    businessId,
                                    branchId: sale.branchId,
                                    productId: item.productId,
                                    type: 'RETURN',
                                    quantity: item.quantity,
                                    oldStock: oldStock,
                                    newStock: newStock,
                                    reference: sale.id,
                                    note: `Refund for sale ${sale.id}. ${reason || ''}`
                                }
                            });
                        }
                    } else {
                        // Fallback to legacy Product.stockQuantity if no branchId
                        const product = await tx.product.findUnique({ where: { id: item.productId } });
                        if (product) {
                            await tx.product.update({
                                where: { id: item.productId },
                                data: { stockQuantity: { increment: item.quantity } }
                            });
                        }
                    }
                }

                // Create the Refund record
                const refund = await tx.refund.create({
                    data: {
                        businessId,
                        branchId: sale.branchId,
                        saleId: sale.id,
                        staffId: userId,
                        totalAmount: refundTotal,
                        reason,
                        items: {
                            create: refundItemsData
                        }
                    }
                });

                return refund;
            });

            await AuditService.logAction(
                businessId,
                userId,
                AuditAction.CREATE,
                'REFUND',
                result.id,
                `Processed refund of $${result.totalAmount} for sale ${sale.id}`
            );

            return res.status(201).json(result);
        } catch (error: any) {
            console.error('Process refund error:', error);
            return res.status(400).json({ error: error.message || 'Failed to process refund' });
        }
    }

    static async getRefunds(req: AuthRequest, res: Response) {
        try {
            const businessId = (req.query.businessId as string) || req.user?.activeBusinessId;

            if (!businessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const refunds = await prisma.refund.findMany({
                where: { businessId },
                include: {
                    sale: true,
                    items: { include: { product: true } },
                    staff: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            });

            return res.json(refunds);
        } catch (error) {
            console.error('Get refunds error:', error);
            return res.status(500).json({ error: 'Failed to fetch refunds' });
        }
    }
}
