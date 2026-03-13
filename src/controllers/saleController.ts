import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export class SaleController {
    static async createSale(req: AuthRequest, res: Response) {
        try {
            const { customerId, totalAmount, paymentMethod, items, discountPercentage, paymentCurrency, exchangeRate, paidAmountShiling } = req.body;
            console.log('Create sale request received:', { customerId, totalAmount, paymentMethod, items_count: items?.length, discountPercentage, paymentCurrency });

            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                console.log('No active business selected for user:', req.user.id);
                return res.status(400).json({ error: 'No active business selected' });
            }

            const methodMapping: Record<string, string> = {
                "Cash": "CASH",
                "ZAAD": "ZAAD",
                "e-Dahab": "EDAHAB",
                "Loan": "OTHER"
            };

            console.log('Starting transaction for sale creation...');
            const result = await prisma.$transaction(async (tx) => {
                // 1. Create the sale
                const sale = await tx.sale.create({
                    data: {
                        businessId: user.activeBusinessId!,
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

                // 2. Update product stock
                for (const item of items) {
                    await tx.product.update({
                        where: { id: item.productId },
                        data: {
                            stockQuantity: {
                                decrement: item.quantity
                            }
                        }
                    });
                }

                // 3. Create or Update loan if payment method is Loan
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
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const sales = await prisma.sale.findMany({
                where: { businessId: user.activeBusinessId },
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

            // Delete associated sale items first
            await prisma.saleItem.deleteMany({
                where: { saleId: id }
            });

            await prisma.sale.delete({
                where: { id }
            });

            return res.status(204).send();
        } catch (error) {
            console.error('Delete sale error details:', error);
            return res.status(500).json({
                error: 'Failed to delete sale',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    }
}
