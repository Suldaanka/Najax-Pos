import { PrismaClient, AuditAction } from '@prisma/client';
import { prisma } from '../lib/prisma';

export class AuditService {
    /**
     * Logs an action performed by a user to the central Audit Log.
     * @param businessId The ID of the business the action occurred in.
     * @param userId The ID of the user performing the action.
     * @param action The type of action (CREATE, UPDATE, DELETE).
     * @param entity The type of entity being modified (e.g., 'PRODUCT', 'SALE', 'STAFF').
     * @param entityId Optional. The unique ID of the entity that was modified.
     * @param details Optional. A descriptive message or JSON payload explaining the change.
     */
    static async logAction(
        businessId: string,
        userId: string,
        action: AuditAction,
        entity: string,
        entityId?: string,
        details?: string | Record<string, any>
    ): Promise<void> {
        try {
            const formattedDetails = typeof details === 'object' ? JSON.stringify(details) : details;

            await prisma.auditLog.create({
                data: {
                    businessId,
                    userId,
                    action,
                    entity,
                    entityId,
                    details: formattedDetails,
                }
            });
        } catch (error) {
            console.error('[AuditService] Failed to log action:', error);
        }
    }
}
