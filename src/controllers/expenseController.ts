import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getExpenses = async (req: AuthRequest, res: Response) => {
    try {
        const businessId = req.query.businessId as string;
        if (!businessId) {
            return res.status(400).json({ error: 'businessId is required' });
        }

        const expenses = await prisma.expense.findMany({
            where: { businessId: businessId },
            include: {
                user: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        });
        res.json(expenses);
    } catch (error) {
        console.error('Get expenses error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createExpense = async (req: AuthRequest, res: Response) => {
    try {
        const { businessId, userId, amount, description, category, date } = req.body;

        if (!businessId || !userId || amount === undefined || !description) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const expense = await prisma.expense.create({
            data: {
                businessId,
                userId,
                amount,
                description,
                category,
                date: date ? new Date(date) : new Date(),
            },
        });
        res.status(201).json(expense);
    } catch (error) {
        console.error('Create expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateExpense = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { amount, description, category, date } = req.body;

        const expense = await prisma.expense.update({
            where: { id },
            data: {
                amount,
                description,
                category,
                date: date ? new Date(date) : undefined,
            },
        });
        res.json(expense);
    } catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        await prisma.expense.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
