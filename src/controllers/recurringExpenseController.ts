import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export class RecurringExpenseController {
    static async getRecurringExpenses(req: AuthRequest, res: Response) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const recurringExpenses = await prisma.recurringExpense.findMany({
                where: { businessId: user.activeBusinessId },
                orderBy: { name: 'asc' }
            });

            res.json(recurringExpenses);
        } catch (error) {
            console.error('Get recurring expenses error:', error);
            res.status(500).json({ error: 'Failed to fetch recurring expenses' });
        }
    }

    static async createRecurringExpense(req: AuthRequest, res: Response) {
        try {
            const { name, amount } = req.body;
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const recurringExpense = await prisma.recurringExpense.create({
                data: {
                    name,
                    amount,
                    businessId: user.activeBusinessId
                }
            });

            res.status(201).json(recurringExpense);
        } catch (error) {
            console.error('Create recurring expense error:', error);
            res.status(500).json({ error: 'Failed to create recurring expense' });
        }
    }

    static async updateRecurringExpense(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { name, amount } = req.body;

            const recurringExpense = await prisma.recurringExpense.update({
                where: { id },
                data: { name, amount }
            });

            res.json(recurringExpense);
        } catch (error) {
            console.error('Update recurring expense error:', error);
            res.status(500).json({ error: 'Failed to update recurring expense' });
        }
    }

    static async deleteRecurringExpense(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;

            await prisma.recurringExpense.delete({
                where: { id }
            });

            res.status(204).send();
        } catch (error) {
            console.error('Delete recurring expense error:', error);
            res.status(500).json({ error: 'Failed to delete recurring expense' });
        }
    }
}
