import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Prisma, AuditAction } from '@prisma/client';
import { AuditService } from '../services/auditService';

export class SaleController {
    static async createSale(req: AuthRequest, res: Response) {
        try {
            const { customerId, totalAmount, paymentMethod, items, discountPercentage, paymentCurrency, exchangeRate, paidAmountShiling, branchId } = req.body;
            console.log('Create sale request received:', { customerId, totalAmount, paymentMethod, items_count: items?.length, branchId });

            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            // Fallback to main branch if none provided (legacy support)
            let targetBranchId = branchId;
            if (!targetBranchId) {
                const mainBranch = await prisma.branch.findFirst({
                    where: { businessId: user.activeBusinessId, isMain: true }
                });
                targetBranchId = mainBranch?.id;
            }

            const methodMapping: Record<string, string> = {
                "Cash": "CASH",
                "ZAAD": "ZAAD",
                "e-Dahab": "EDAHAB",
                "Loan": "OTHER"
            };

            const result = await prisma.$transaction(async (tx) => {
                // 1. Create the sale
                const sale = await tx.sale.create({
                    data: {
                        businessId: user.activeBusinessId!,
                        branchId: targetBranchId,
                        staffId: user.id,
                        customerId: customerId === 'cash' ? null : customerId,
                        totalAmount,
                        paidAmount: paymentMethod === 'Loan' ? 0 : totalAmount,
                        type: paymentMethod === 'Loan' ? 'LOAN' : 'CASH',
                        paymentMethod: (methodMapping[paymentMethod] || 'OTHER') as any,
                        discountPercentage: discountPercentage || 0,
                        paymentCurrency: paymentCurrency || 'USD',
                        exchangeRate: exchangeRate,
                        paidAmountShiling: paidAmountShiling,
                        items: {
                            create: items.map((item: any) => ({
                                productId: item.productId,
                                quantity: item.quantity,
                                price: item.price
                            }))
                        }
                    }
                });

                // 2. Update branch-specific inventory and record logs
                for (const item of items) {
                    if (targetBranchId) {
                        // Multi-branch inventory logic
                        const inventory = await tx.inventoryLevel.findUnique({
                            where: { productId_branchId: { productId: item.productId, branchId: targetBranchId } }
                        });

                        const oldStock = inventory ? inventory.stockQuantity : new Prisma.Decimal(0);
                        const newStock = oldStock.minus(item.quantity);

                        // Update or Create inventory level
                        await tx.inventoryLevel.upsert({
                            where: { productId_branchId: { productId: item.productId, branchId: targetBranchId } },
                            create: {
                                productId: item.productId,
                                branchId: targetBranchId,
                                stockQuantity: newStock
                            },
                            update: {
                                stockQuantity: newStock
                            }
                        });

                        // Record log with branchId
                        await tx.stockLog.create({
                            data: {
                                businessId: user.activeBusinessId!,
                                branchId: targetBranchId,
                                productId: item.productId,
                                type: 'SALE',
                                quantity: item.quantity,
                                oldStock: oldStock,
                                newStock: newStock,
                                reference: sale.id,
                                note: `Sale #${sale.id.slice(-5).toUpperCase()} at Branch ${targetBranchId}`
                            }
                        });
                    } else {
                        // Legacy global inventory logic
                        const product = await tx.product.findUnique({ where: { id: item.productId } });
                        if (product) {
                            const oldStock = new Prisma.Decimal(product.stockQuantity);
                            const newStock = oldStock.minus(item.quantity);
                            await tx.product.update({
                                where: { id: item.productId },
                                data: { stockQuantity: newStock }
                            });
                            await tx.stockLog.create({
                                data: {
                                    businessId: user.activeBusinessId!,
                                    productId: item.productId,
                                    type: 'SALE',
                                    quantity: item.quantity,
                                    oldStock,
                                    newStock,
                                    reference: sale.id
                                }
                            });
                        }
                    }
                }

                // 3. Award loyalty points to customer (1 point per dollar spent)
                if (customerId && customerId !== 'cash') {
                    await tx.customer.update({
                        where: { id: customerId },
                        data: {
                            loyaltyPoints: {
                                increment: Math.floor(totalAmount)
                            }
                        }
                    });
                }

                // 4. Create or Update loan if payment method is Loan
                if (paymentMethod === 'Loan' && customerId != null) {
                    const existingLoan = await tx.loan.findFirst({
                        where: {
                            businessId: user.activeBusinessId!,
                            customerId,
                            status: { in: ['PENDING', 'PARTIAL'] }
                        }
                    });

                    if (existingLoan) {
                        await tx.loan.update({
                            where: { id: existingLoan.id },
                            data: {
                                totalAmount: { increment: totalAmount },
                                status: 'PARTIAL',
                                items: {
                                    create: {
                                        amount: totalAmount,
                                        type: 'ADJUSTMENT',
                                        note: `Credit from sale: ${sale.id}`
                                    }
                                }
                            }
                        });
                    } else {
                        await tx.loan.create({
                            data: {
                                businessId: user.activeBusinessId!,
                                customerId,
                                saleId: sale.id,
                                totalAmount,
                                paidAmount: 0,
                                status: 'PENDING',
                                dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
                                items: {
                                    create: {
                                        amount: totalAmount,
                                        type: 'ADJUSTMENT',
                                        note: `Initial credit from sale: ${sale.id}`
                                    }
                                }
                            }
                        });
                    }
                }

                return sale;
            });

            console.log('Sale created successfully:', result.id);

            await AuditService.logAction(
                user.activeBusinessId!,
                req.user.id,
                AuditAction.CREATE,
                'SALE',
                result.id,
                `Created sale for $${totalAmount} via ${paymentMethod}`
            );

            return res.status(201).json(result);
        } catch (error) {
            console.error('Create sale error details:', error);
            return res.status(500).json({
                error: 'Failed to create sale',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    static async getSales(req: AuthRequest, res: Response) {
        try {
            const { branchId } = req.query as { branchId?: string };
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const where: any = { businessId: user.activeBusinessId };
            if (branchId) {
                where.branchId = branchId;
            }

            const sales = await prisma.sale.findMany({
                where,
                include: {
                    customer: true,
                    items: {
                        include: {
                            product: true
                        }
                    },
                    staff: {
                        select: {
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return res.json(sales);
        } catch (error) {
            console.error('Get sales error:', error);
            return res.status(500).json({ error: 'Failed to fetch sales' });
        }
    }

    static async deleteSale(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            
            const sale = await prisma.sale.findUnique({
                 where: { id }
            });

            if (!sale) return res.status(404).json({ error: 'Sale not found' });

            // Delete associated sale items first
            await prisma.saleItem.deleteMany({
                where: { saleId: id }
            });

            await prisma.sale.delete({
                where: { id }
            });

            await AuditService.logAction(
                sale.businessId,
                req.user.id,
                AuditAction.DELETE,
                'SALE',
                sale.id,
                `Deleted sale of $${sale.totalAmount}`
            );

            return res.status(204).send();
        } catch (error) {
            console.error('Delete sale error details:', error);
            return res.status(500).json({
                error: 'Failed to delete sale',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }

    static async getSaleById(req: AuthRequest, res: Response) {
        try {
            let id = req.params.id as string;
            // Strip leading '#' if present
            if (id.startsWith('#')) {
                id = id.substring(1);
            }
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const includeOptions = {
                customer: true,
                items: {
                    include: {
                        product: true
                    }
                },
                staff: {
                    select: {
                        name: true,
                        email: true
                    }
                }
            };

            // 1. Try exact match first (CUID)
            let sale = await prisma.sale.findUnique({
                where: { id },
                include: includeOptions
            });

            // 2. If not found, try suffix match (e.g. last 6 characters)
            if (!sale) {
                sale = await prisma.sale.findFirst({
                    where: {
                        businessId: user.activeBusinessId,
                        id: { endsWith: id.toLowerCase() } // Handle case-insensitivity if needed, though CUIDs are lower
                    },
                    include: includeOptions
                });
            }

            if (!sale || sale.businessId !== user.activeBusinessId) {
                return res.status(404).json({ error: 'Sale not found' });
            }

            return res.json(sale);
        } catch (error) {
            console.error('Get sale by ID error:', error);
            return res.status(500).json({ error: 'Failed to fetch sale' });
        }
    }
}
