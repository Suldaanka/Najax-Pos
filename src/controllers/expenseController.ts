import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { AuditService } from '../services/auditService';
import { AuditAction } from '@prisma/client';

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

        await AuditService.logAction(
            businessId,
            (req as any).user.id,
            AuditAction.CREATE,
            'EXPENSE',
            expense.id,
            `Created expense of $${amount} for ${category || 'General'}`
        );

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

        await AuditService.logAction(
            expense.businessId,
            (req as any).user.id,
            AuditAction.UPDATE,
            'EXPENSE',
            expense.id,
            `Updated expense $${amount} for ${category || 'General'}`
        );

        res.json(expense);
    } catch (error) {
        console.error('Update expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteExpense = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const expense = await prisma.expense.findUnique({ where: { id } });

        if (!expense) return res.status(404).json({ error: 'Expense not found' });

        await prisma.expense.delete({
            where: { id },
        });

        await AuditService.logAction(
            expense.businessId,
            (req as any).user.id,
            AuditAction.DELETE,
            'EXPENSE',
            expense.id,
            `Deleted expense of $${expense.amount}`
        );

        res.status(204).send();
    } catch (error) {
        console.error('Delete expense error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
