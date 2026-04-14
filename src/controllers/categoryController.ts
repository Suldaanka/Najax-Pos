import { Request, Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { prisma } from '../lib/prisma';

export const getCategories = async (req: AuthRequest, res: Response) => {
    try {
        const businessId = (req.query.businessId as string) || req.user?.activeBusinessId;
        if (!businessId) {
            return res.status(400).json({ error: 'businessId is required' });
        }

        const categories = await prisma.category.findMany({
            where: { businessId },
            orderBy: { name: 'asc' }
        });
        res.json(categories);
    } catch (error) {
        console.error('Get categories error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createCategory = async (req: AuthRequest, res: Response) => {
    try {
        const { name } = req.body;
        const businessId = req.body.businessId || req.user?.activeBusinessId;

        if (!businessId || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const category = await prisma.category.create({
            data: {
                businessId,
                name,
            },
        });
        res.status(201).json(category);
    } catch (error) {
        console.error('Create category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { name } = req.body;

        const category = await prisma.category.update({
            where: { id },
            data: { name },
        });
        res.json(category);
    } catch (error) {
        console.error('Update category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        await prisma.category.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Delete category error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
