import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';

export class SupplierController {
    static async getSuppliers(req: AuthRequest, res: Response) {
        try {
            const businessId = (req.query.businessId as string) || req.user?.activeBusinessId;

            if (!businessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const suppliers = await prisma.supplier.findMany({
                where: { businessId },
                orderBy: { name: 'asc' }
            });

            return res.json(suppliers);
        } catch (error) {
            console.error('Get suppliers error:', error);
            return res.status(500).json({ error: 'Failed to fetch suppliers' });
        }
    }

    static async createSupplier(req: AuthRequest, res: Response) {
        try {
            const { name, contactPerson, email, phone, address } = req.body;
            const businessId = req.body.businessId || req.user?.activeBusinessId;

            if (!businessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const supplier = await prisma.supplier.create({
                data: {
                    businessId,
                    name,
                    contactPerson,
                    email,
                    phone,
                    address
                }
            });

            return res.status(201).json(supplier);
        } catch (error) {
            console.error('Create supplier error:', error);
            return res.status(500).json({ error: 'Failed to create supplier' });
        }
    }

    static async updateSupplier(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const { name, contactPerson, email, phone, address } = req.body;

            const supplier = await prisma.supplier.update({
                where: { id: id as string },
                data: {
                    name,
                    contactPerson,
                    email,
                    phone,
                    address
                }
            });

            return res.json(supplier);
        } catch (error) {
            console.error('Update supplier error:', error);
            return res.status(500).json({ error: 'Failed to update supplier' });
        }
    }

    static async deleteSupplier(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;

            await prisma.supplier.delete({
                where: { id: id as string }
            });

            return res.status(204).send();
        } catch (error) {
            console.error('Delete supplier error:', error);
            return res.status(500).json({ error: 'Failed to delete supplier' });
        }
    }
}
