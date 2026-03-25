import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { Role } from '@prisma/client';

/**
 * Update a user's role within a business.
 * Only an OWNER can change roles (enforced by middleware).
 */
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { role, businessId } = req.body as { role: Role; businessId: string };

    if (!userId || !role || !businessId) {
      return res.status(400).json({ error: 'userId, role, and businessId are required' });
    }

    // Ensure the role is a valid enum value
    if (!Object.values(Role).includes(role)) {
      return res.status(400).json({ error: 'Invalid role value' });
    }

    // Prevent removing the last OWNER of a business
    const ownersCount = await prisma.businessMember.count({
      where: { businessId, role: Role.OWNER },
    });
    const targetMember = await prisma.businessMember.findUnique({
      where: { userId_businessId: { userId: userId as string, businessId: businessId as string } },
    });
    if (!targetMember) {
      return res.status(404).json({ error: 'Business member not found' });
    }
    if (targetMember.role === Role.OWNER && role !== Role.OWNER && ownersCount <= 1) {
      return res.status(400).json({ error: 'Cannot demote the last OWNER of the business' });
    }

    const updated = await prisma.businessMember.update({
      where: { userId_businessId: { userId: userId as string, businessId: businessId as string } },
      data: { role },
    });
    res.json(updated);
  } catch (error: any) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Internal server error', detail: error?.message });
  }
};
