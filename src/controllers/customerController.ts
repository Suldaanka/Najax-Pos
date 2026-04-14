import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export const getCustomers = async (req: AuthRequest, res: Response) => {
    try {
        const { branchId } = req.query as { branchId?: string };
        const businessId = (req.query.businessId as string) || req.user?.activeBusinessId;
        
        if (!businessId) {
            return res.status(400).json({ error: 'businessId is required' });
        }

        const where: any = { businessId };
        if (branchId) where.branchId = branchId;

        const customers = await prisma.customer.findMany({
            where,
            orderBy: { name: 'asc' }
        });
        res.json(customers);
    } catch (error) {
        console.error('Get customers error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const getCustomer = async (req: AuthRequest, res: Response) => {
    try {
        const id = req.params.id as string;
        const customer = await prisma.customer.findUnique({
            where: { id }
        });

        if (!customer) {
            return res.status(404).json({ error: 'Customer not found' });
        }

        res.json(customer);
    } catch (error) {
        console.error('Get customer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createCustomer = async (req: AuthRequest, res: Response) => {
    try {
        const { name, phone, branchId } = req.body;
        const businessId = req.body.businessId || req.user?.activeBusinessId;

        if (!businessId || !name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const customer = await prisma.customer.create({
            data: {
                businessId,
                name,
                phone,
                branchId,
            },
        });
        res.status(201).json(customer);
    } catch (error) {
        console.error('Create customer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const updateCustomer = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { name, phone } = req.body;

        const customer = await prisma.customer.update({
            where: { id },
            data: {
                name,
                phone,
            },
        });
        res.json(customer);
    } catch (error) {
        console.error('Update customer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteCustomer = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        await prisma.customer.delete({
            where: { id },
        });
        res.status(204).send();
    } catch (error) {
        console.error('Delete customer error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
