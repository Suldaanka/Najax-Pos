import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuditService } from '../services/auditService';
import { AuditAction, Prisma } from '@prisma/client';

export const getProducts = async (req: Request, res: Response) => {
    try {
        const businessId = req.query.businessId as string;
        if (!businessId) {
            return res.status(400).json({ error: 'businessId is required' });
        }

        const products = await prisma.product.findMany({
            where: { businessId: businessId },
            include: { 
                category: true,
                inventoryLevels: {
                    include: { branch: true }
                }
             },
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
        const { businessId, name, categoryId, costPrice, sellingPrice, stockQuantity, barcode, description, piecesPerCarton, piecesPerBag, unit, branchId } = req.body;

        if (!businessId || !name || costPrice === undefined || sellingPrice === undefined) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const product = await prisma.$transaction(async (tx) => {
            const newProduct = await tx.product.create({
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

            // Initialize inventory level for the specified branch OR the main branch
            let targetBranchId = branchId;
            if (!targetBranchId) {
                const mainBranch = await tx.branch.findFirst({
                    where: { businessId, isMain: true }
                });
                targetBranchId = mainBranch?.id;
            }

            if (targetBranchId) {
                await tx.inventoryLevel.create({
                    data: {
                        productId: newProduct.id,
                        branchId: targetBranchId,
                        stockQuantity: stockQuantity || 0
                    }
                });
            }

            return newProduct;
        });
        
        await AuditService.logAction(
            businessId,
            (req as any).user.id,
            AuditAction.CREATE,
            'PRODUCT',
            product.id,
            `Created product: ${name} (Initial Branch Stock: ${stockQuantity || 0})`
        );

        res.status(201).json(product);
    } catch (error: any) {
        console.error('Create product error:', error);
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

export const adjustStock = async (req: Request, res: Response) => {
    try {
        const { id } = req.params as { id: string };
        const { stockQuantity, branchId } = req.body;
        
        const product = await prisma.product.findUnique({ where: { id } });
        if (!product) return res.status(404).json({ error: 'Product not found' });

        let targetBranchId = branchId;
        if (!targetBranchId) {
            const mainBranch = await prisma.branch.findFirst({
                where: { businessId: product.businessId, isMain: true }
            });
            targetBranchId = mainBranch?.id;
        }

        if (!targetBranchId) {
            return res.status(400).json({ error: 'No branch specified and no main branch found' });
        }

        // Use transaction to ensure consistency
        const updatedInventory = await prisma.$transaction(async (tx) => {
            const inv = await tx.inventoryLevel.upsert({
                where: { productId_branchId: { productId: id, branchId: targetBranchId as string } },
                update: { stockQuantity },
                create: { productId: id, branchId: targetBranchId as string, stockQuantity }
            });

            // Update global product stock
            const allLevels = await tx.inventoryLevel.findMany({ where: { productId: id } });
            const totalStock = allLevels.reduce((sum, level) => sum.plus(level.stockQuantity), new Prisma.Decimal(0));
            
            await tx.product.update({
                where: { id },
                data: { stockQuantity: totalStock }
            });

            return inv;
        });

        await AuditService.logAction(
            product.businessId,
            (req as any).user.id,
            AuditAction.UPDATE,
            'PRODUCT',
            product.id,
            `Adjusted stock for ${product.name} at branch ${targetBranchId} to ${stockQuantity}`
        );

        res.json(updatedInventory);
    } catch (error: any) {
        console.error('Adjust stock error:', error);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    }
};
