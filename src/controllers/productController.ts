import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuditService } from '../services/auditService';
import { AuditAction } from '@prisma/client';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const businessId = req.query.businessId as string;
        if (!businessId) {
            return res.status(400).json({ error: 'businessId is required' });
        }

        const products = await prisma.product.findMany({
            where: { businessId: businessId },
            include: { category: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(products);
    } catch (error) {
        console.error('Get products error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const createProduct = async (req: Request, res: Response) => {
    try {
        const { businessId, name, categoryId, costPrice, sellingPrice, stockQuantity, barcode, description, piecesPerCarton, piecesPerBag, unit } = req.body;

        if (!businessId || !name || costPrice === undefined || sellingPrice === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const product = await prisma.product.create({
            data: {
                businessId,
                name,
                categoryId: categoryId || null,
                costPrice,
                sellingPrice,
                stockQuantity: stockQuantity || 0,
                barcode: barcode || null,
                description,
                piecesPerCarton: piecesPerCarton || null,
                piecesPerBag: piecesPerBag || null,
                unit: unit || "pcs",
            },
        });
        
        await AuditService.logAction(
            businessId,
            (req as any).user.id,
            AuditAction.CREATE,
            'PRODUCT',
            product.id,
            `Created product: ${name} (Stock: ${product.stockQuantity})`
        );

        res.status(201).json(product);
    } catch (error: any) {
        console.error('Create product error:', error);
        // Better error logging for debugging
        const errorDetails = {
            message: error.message,
            code: error.code,
            meta: error.meta,
            stack: error.stack
        };
        console.error('Full Error Details:', JSON.stringify(errorDetails, null, 2));
        require('fs').writeFileSync('backend-debug.log', JSON.stringify(errorDetails, null, 2));
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};

export const updateProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { name, categoryId, costPrice, sellingPrice, stockQuantity, barcode, description, piecesPerCarton, piecesPerBag, unit } = req.body;

        const product = await prisma.product.update({
            where: { id },
            data: {
                name,
                categoryId: categoryId || null,
                costPrice,
                sellingPrice,
                stockQuantity,
                barcode: barcode || null,
                description,
                piecesPerCarton: piecesPerCarton || null,
                piecesPerBag: piecesPerBag || null,
                unit,
            },
        });

        await AuditService.logAction(
            product.businessId,
            (req as any).user.id,
            AuditAction.UPDATE,
            'PRODUCT',
            product.id,
            `Updated product: ${product.name} (Selling Price: ${product.sellingPrice})`
        );

        res.json(product);
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

export const deleteProduct = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const product = await prisma.product.findUnique({ where: { id } });
        
        await prisma.product.delete({
            where: { id },
        });

        if (product) {
            await AuditService.logAction(
                product.businessId,
                (req as any).user.id,
                AuditAction.DELETE,
                'PRODUCT',
                product.id,
                `Deleted product: ${product.name}`
            );
        }

        res.status(204).send();
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};
