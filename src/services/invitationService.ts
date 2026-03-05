import { prisma } from '../lib/prisma';

export class InvitationService {
    /**
     * Checks for a pending invitation for the given email and links the user to the business.
     * This logic is idempotent and can be safely called during signup or after social login.
     */
    static async handlePendingInvitation(userId: string, email: string) {
        console.log(`Checking for pending invitations for: ${email}`);

        // Find the most recent pending invitation
        const invitation = await prisma.invitation.findFirst({
            where: {
                email: email,
                status: 'PENDING',
                expiresAt: { gt: new Date() }
            },
            orderBy: {
                createdAt: 'desc'
            }
        });

        if (!invitation) {
            console.log(`No pending invitation found for ${email}`);
            return null;
        }

        console.log(`Found pending invitation for ${email} to business ${invitation.businessId}`);

        // Check if user is already a member (idempotency)
        const existingMember = await prisma.businessMember.findUnique({
            where: {
                userId_businessId: {
                    userId: userId,
                    businessId: invitation.businessId
                }
            }
        });

        if (!existingMember) {
            // Create membership
            await prisma.businessMember.create({
                data: {
                    userId: userId,
                    businessId: invitation.businessId,
                    role: invitation.role
                }
            });
            console.log(`Linked user ${userId} to business ${invitation.businessId} as ${invitation.role}`);
        } else {
            console.log(`User ${userId} is already a member of business ${invitation.businessId}`);
        }

        // Update user's active business
        await prisma.user.update({
            where: { id: userId },
            data: { activeBusinessId: invitation.businessId }
        });

        // Mark invitation as accepted
        await prisma.invitation.update({
            where: { id: invitation.id },
            data: { status: 'ACCEPTED' }
        });

        return invitation;
    }
}
