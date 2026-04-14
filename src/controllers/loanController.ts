import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export class LoanController {
    // Create or aggregate a loan
    static async createLoan(req: AuthRequest, res: Response) {
        try {
            const { customerId, totalAmount, dueDate, saleId, note, branchId } = req.body;
            const businessId = req.body.businessId || req.user?.activeBusinessId;

            if (!businessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            // Use provided branchId or fallback to main branch
            let targetBranchId = branchId;
            if (!targetBranchId) {
                const mainBranch = await prisma.branch.findFirst({
                    where: { businessId, isMain: true }
                });
                targetBranchId = mainBranch?.id;
            }

            // Check if there is an existing active loan for this customer and branch
            const existingLoan = await prisma.loan.findFirst({
                where: {
                    businessId,
                    branchId: targetBranchId,
                    customerId,
                    status: { in: ['PENDING', 'PARTIAL'] }
                }
            });

            if (existingLoan) {
                // Aggregate into existing loan
                const updatedLoan = await prisma.loan.update({
                    where: { id: existingLoan.id },
                    data: {
                        totalAmount: { increment: totalAmount },
                        status: 'PARTIAL',
                        dueDate: dueDate ? new Date(dueDate) : existingLoan.dueDate,
                        items: {
                            create: {
                                amount: totalAmount,
                                type: 'ADJUSTMENT',
                                note: note || `Added credit ${saleId ? `from sale ${saleId}` : ''}`
                            }
                        }
                    },
                    include: { items: true }
                });
                return res.status(200).json(updatedLoan);
            }

            // Create new loan if none exists
            const loan = await prisma.loan.create({
                data: {
                    businessId,
                    branchId: targetBranchId,
                    customerId,
                    totalAmount,
                    paidAmount: 0,
                    status: 'PENDING',
                    dueDate: dueDate ? new Date(dueDate) : null,
                    saleId,
                    items: {
                        create: {
                            amount: totalAmount,
                            type: 'ADJUSTMENT',
                            note: note || 'Initial credit'
                        }
                    }
                },
                include: { items: true }
            });

            return res.status(201).json(loan);
        } catch (error) {
            console.error('Create loan error:', error);
            return res.status(500).json({ error: 'Failed to create loan' });
        }
    }

    // Get all loans for the active business
    static async getLoans(req: AuthRequest, res: Response) {
        try {
            const { branchId } = req.query as { branchId?: string };
            const businessId = (req.query.businessId as string) || req.user?.activeBusinessId;

            if (!businessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const where: any = { businessId };
            if (branchId) {
                where.branchId = branchId;
            }

            const loans = await prisma.loan.findMany({
                where,
                include: {
                    customer: true,
                    items: true,
                    sale: {
                        include: {
                            items: {
                                include: {
                                    product: true
                                }
                            }
                        }
                    }
                },
                orderBy: { createdAt: 'desc' }
            });

            return res.json(loans);
        } catch (error) {
            console.error('Get loans error:', error);
            return res.status(500).json({ error: 'Failed to fetch loans' });
        }
    }

    // Record a payment for a loan
    static async recordPayment(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { amount, note, nextPaymentDate } = req.body;

            const loan = await prisma.loan.findUnique({
                where: { id }
            });

            if (!loan) {
                return res.status(404).json({ error: 'Loan not found' });
            }

            const newPaidAmount = Number(loan.paidAmount) + Number(amount);
            const status = newPaidAmount >= Number(loan.totalAmount) ? 'PAID' : 'PARTIAL';

            const updatedLoan = await prisma.loan.update({
                where: { id },
                data: {
                    paidAmount: newPaidAmount,
                    status,
                    nextPaymentDate: nextPaymentDate ? new Date(nextPaymentDate) : (loan as any).nextPaymentDate,
                    items: {
                        create: {
                            amount,
                            type: 'PAYMENT',
                            note
                        }
                    }
                },
                include: {
                    items: true
                }
            });

            return res.json(updatedLoan);
        } catch (error) {
            console.error('Record payment error:', error);
            return res.status(500).json({ error: 'Failed to record payment' });
        }
    }

    // Update loan status (e.g., mark as PAID directly)
    static async updateStatus(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            const { status } = req.body;

            const updatedLoan = await prisma.loan.update({
                where: { id },
                data: { status }
            });

            return res.json(updatedLoan);
        } catch (error) {
            console.error('Update status error:', error);
            return res.status(500).json({ error: 'Failed to update status' });
        }
    }

    // Delete a loan
    static async deleteLoan(req: AuthRequest, res: Response) {
        try {
            const id = req.params.id as string;
            await prisma.loan.delete({
                where: { id }
            });
            return res.status(204).send();
        } catch (error) {
            console.error('Delete loan error:', error);
            return res.status(500).json({ error: 'Failed to delete loan' });
        }
    }
}
