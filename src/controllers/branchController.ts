import { Response } from 'express';
import { prisma } from '../lib/prisma';
import { AuthRequest } from '../middlewares/authMiddleware';
import { AuditAction, Prisma } from '@prisma/client';
import { AuditService } from '../services/auditService';

export class BranchController {
    static async createBranch(req: AuthRequest, res: Response) {
        try {
            const { name, address, phone, isMain } = req.body;
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const branch = await prisma.branch.create({
                data: {
                    businessId: user.activeBusinessId,
                    name,
                    address,
                    phone,
                    isMain: isMain || false,
                }
            });

            await AuditService.logAction(
                user.activeBusinessId,
                user.id,
                AuditAction.CREATE,
                'BRANCH',
                branch.id,
                `Created branch: ${name}`
            );

            return res.status(201).json(branch);
        } catch (error) {
            console.error('Create branch error:', error);
            return res.status(500).json({ error: 'Failed to create branch' });
        }
    }

    static async getBranches(req: AuthRequest, res: Response) {
        try {
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const branches = await prisma.branch.findMany({
                where: { businessId: user.activeBusinessId },
                include: {
                    _count: {
                        select: { staff: true, inventoryLevels: true }
                    }
                }
            });

            return res.json(branches);
        } catch (error) {
            console.error('Get branches error:', error);
            return res.status(500).json({ error: 'Failed to fetch branches' });
        }
    }

    static async transferStock(req: AuthRequest, res: Response) {
        try {
            const { productId, fromBranchId, toBranchId, quantity, note } = req.body;
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            const qty = new Prisma.Decimal(quantity);

            const result = await prisma.$transaction(async (tx) => {
                // 1. Check source stock
                const sourceInventory = await tx.inventoryLevel.findUnique({
                    where: { productId_branchId: { productId, branchId: fromBranchId } }
                });

                if (!sourceInventory || sourceInventory.stockQuantity.lt(qty)) {
                    throw new Error('Insufficient stock in source branch');
                }

                // 2. Decrement source
                const newSourceStock = sourceInventory.stockQuantity.minus(qty);
                await tx.inventoryLevel.update({
                    where: { id: sourceInventory.id },
                    data: { stockQuantity: newSourceStock }
                });

                // 3. Increment destination
                const destInventory = await tx.inventoryLevel.upsert({
                    where: { productId_branchId: { productId, branchId: toBranchId } },
                    create: { productId, branchId: toBranchId, stockQuantity: qty },
                    update: { stockQuantity: { increment: qty } }
                });

                // 4. Log for source
                await tx.stockLog.create({
                    data: {
                        businessId: user.activeBusinessId!,
                        branchId: fromBranchId,
                        productId,
                        type: 'TRANSFER',
                        quantity: qty,
                        oldStock: sourceInventory.stockQuantity,
                        newStock: newSourceStock,
                        note: `Transfer out to branch ${toBranchId}. ${note || ''}`
                    }
                });

                // 5. Log for destination
                await tx.stockLog.create({
                    data: {
                        businessId: user.activeBusinessId!,
                        branchId: toBranchId,
                        productId,
                        type: 'TRANSFER',
                        quantity: qty,
                        oldStock: destInventory.stockQuantity.minus(qty),
                        newStock: destInventory.stockQuantity,
                        note: `Transfer in from branch ${fromBranchId}. ${note || ''}`
                    }
                });

                return { fromBranchId, toBranchId, quantity: qty.toString() };
            });

            return res.json(result);
        } catch (error: any) {
            console.error('Transfer stock error:', error);
            return res.status(400).json({ error: error.message || 'Failed to transfer stock' });
        }
    }

    static async setMainBranch(req: AuthRequest, res: Response) {
        try {
            const { id } = req.params;
            const user = await prisma.user.findUnique({
                where: { id: req.user.id }
            });

            if (!user?.activeBusinessId) {
                return res.status(400).json({ error: 'No active business selected' });
            }

            await prisma.$transaction([
                prisma.branch.updateMany({
                    where: { businessId: user.activeBusinessId, isMain: true },
                    data: { isMain: false }
                }),
                prisma.branch.update({
                    where: { id },
                    data: { isMain: true }
                })
            ]);

            return res.json({ message: 'Main branch updated successfully' });
        } catch (error) {
            console.error('Set main branch error:', error);
            return res.status(500).json({ error: 'Failed to set main branch' });
        }
    }
}
