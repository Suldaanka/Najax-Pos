import { Request, Response } from 'express';
import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/emailService';
import crypto from 'crypto';

export class AuthController {
    // Sign up with email and password
    static async signUp(req: Request, res: Response) {
        try {
            const { email, password, name } = req.body;

            const result = await auth.api.signUpEmail({
                body: { email, password, name },
                headers: req.headers as any
            });

            if (result && result.user) {
                // Automatically trigger verification email on signup
                try {
                    await AuthController.internalSendVerificationEmail(result.user.email);
                } catch (emailError) {
                    console.error('Failed to send initial verification email:', emailError);
                }
            }

            return res.status(201).json(result);
        } catch (error: any) {
            console.error('Sign up error:', error);
            const status = typeof error.status === 'number' ? error.status : (typeof error.statusCode === 'number' ? error.statusCode : 500);
            return res.status(status).json({
                error: error.message || 'Failed to sign up'
            });
        }
    }

    // Sign in with email and password
    static async signIn(req: Request, res: Response) {
        try {
            const { email, password } = req.body;

            const result = await auth.api.signInEmail({
                body: { email, password },
                headers: req.headers as any
            });

            return res.json(result);
        } catch (error: any) {
            console.error('Sign in error:', error);
            const status = typeof error.status === 'number' ? error.status : (typeof error.statusCode === 'number' ? error.statusCode : 500);
            return res.status(status).json({
                error: error.message || 'Failed to sign in'
            });
        }
    }

    // Get current session
    static async getSession(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: req.headers as any
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            return res.json({
                user: session.user,
                session: session.session
            });
        } catch (error: any) {
            console.error('Get session error:', error);
            const status = typeof error.status === 'number' ? error.status : (typeof error.statusCode === 'number' ? error.statusCode : 500);
            return res.status(status).json({
                error: error.message || 'Failed to get session'
            });
        }
    }

    // Sign out
    static async signOut(req: Request, res: Response) {
        try {
            await auth.api.signOut({
                headers: req.headers as any
            });

            return res.json({ message: 'Signed out successfully' });
        } catch (error: any) {
            console.error('Sign out error:', error);
            const status = typeof error.status === 'number' ? error.status : (typeof error.statusCode === 'number' ? error.statusCode : 500);
            return res.status(status).json({
                error: error.message || 'Failed to sign out'
            });
        }
    }

    // Get user profile
    static async getProfile(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: req.headers as any
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            let business = null;
            if (user.activeBusinessId) {
                business = await prisma.business.findUnique({
                    where: { id: user.activeBusinessId },
                    select: { id: true, name: true, address: true, phone: true }
                });
            }

            return res.json({
                id: user.id,
                email: user.email,
                name: user.name,
                activeBusinessId: user.activeBusinessId,
                activeBusinessName: business?.name,
                business: business
            });
        } catch (error: any) {
            console.error('Get profile error:', error);
            const status = typeof error.status === 'number' ? error.status : (typeof error.statusCode === 'number' ? error.statusCode : 500);
            return res.status(status).json({
                error: error.message || 'Failed to get profile'
            });
        }
    }

    // Update user profile
    static async updateProfile(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: req.headers as any
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { name } = req.body;

            const updatedUser = await prisma.user.update({
                where: { id: session.user.id },
                data: { name }
            });

            return res.json({
                id: updatedUser.id,
                email: updatedUser.email,
                name: updatedUser.name,
                activeBusinessId: updatedUser.activeBusinessId
            });
        } catch (error: any) {
            console.error('Update profile error:', error);
            const status = typeof error.status === 'number' ? error.status : (typeof error.statusCode === 'number' ? error.statusCode : 500);
            return res.status(status).json({
                error: error.message || 'Failed to update profile'
            });
        }
    }

    // Internal helper to send verification email
    static async internalSendVerificationEmail(email: string) {
        // Generate verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        const hashedToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        // Delete any existing verification tokens for this email
        await prisma.verification.deleteMany({
            where: {
                identifier: `email-verification:${email}`
            }
        });

        // Store token
        await prisma.verification.create({
            data: {
                identifier: `email-verification:${email}`,
                value: hashedToken,
                expiresAt
            }
        });

        // Send email
        console.log(`Sending verification email to ${email} with token: ${verificationToken.substring(0, 5)}...`);
        await emailService.sendVerificationEmail(email, verificationToken);
    }

    // Send verification email handler
    static async sendVerificationEmail(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: req.headers as any
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            if (user.emailVerified) {
                return res.status(400).json({ error: 'Email already verified' });
            }

            await AuthController.internalSendVerificationEmail(user.email);

            return res.json({ message: 'Verification email sent' });
        } catch (error: any) {
            console.error('Send verification email error:', error);
            const status = typeof error.status === 'number' ? error.status : (typeof error.statusCode === 'number' ? error.statusCode : 500);
            return res.status(status).json({
                error: error.message || 'Failed to send verification email'
            });
        }
    }

    // Verify email
    static async verifyEmail(req: Request, res: Response) {
        try {
            // Support both body (JSON) and query parameter (for email link)
            const token = (req.body?.token || req.query.token) as string;

            if (!token) {
                console.log('Verification failed: No token provided');
                return res.status(400).json({ error: 'Token is required' });
            }

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
            console.log(`Verifying token: ${token.substring(0, 5)}... (hash: ${hashedToken.substring(0, 10)}...)`);

            // Find verification record
            const verification = await prisma.verification.findFirst({
                where: {
                    value: hashedToken,
                    identifier: {
                        startsWith: 'email-verification:'
                    },
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });

            if (!verification) {
                console.log(`Verification failed: Token not found or expired for hash ${hashedToken.substring(0, 10)}...`);
                return res.status(400).json({ error: 'Invalid or expired token' });
            }

            console.log(`Verification success: Found token for identifier ${verification.identifier}`);

            // Extract email from identifier
            const email = verification.identifier.replace('email-verification:', '');

            // Update user
            await prisma.user.update({
                where: { email },
                data: { emailVerified: true }
            });

            // Delete verification token
            await prisma.verification.delete({
                where: { id: verification.id }
            });

            return res.json({ message: 'Email verified successfully' });
        } catch (error: any) {
            console.error('Verify email error:', error);
            const status = typeof error.status === 'number' ? error.status : (typeof error.statusCode === 'number' ? error.statusCode : 500);
            return res.status(status).json({
                error: error.message || 'Failed to verify email'
            });
        }
    }

    // Change password
    static async changePassword(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: req.headers as any
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { currentPassword, newPassword } = req.body;

            if (!currentPassword || !newPassword) {
                return res.status(400).json({ error: 'Current and new password are required' });
            }

            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'New password must be at least 8 characters long' });
            }

            // Get user's account
            const account = await prisma.account.findFirst({
                where: {
                    userId: session.user.id,
                    providerId: 'credential'
                }
            });

            if (!account || !account.password) {
                return res.status(400).json({ error: 'Password authentication not set up for this account' });
            }

            // Verify current password
            const bcrypt = require('bcrypt');
            const isValid = await bcrypt.compare(currentPassword, account.password);

            if (!isValid) {
                return res.status(400).json({ error: 'Current password is incorrect' });
            }

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password
            await prisma.account.update({
                where: { id: account.id },
                data: { password: hashedPassword }
            });

            return res.json({ message: 'Password changed successfully' });
        } catch (error: any) {
            console.error('Change password error:', error);
            const status = typeof error.status === 'number' ? error.status : (typeof error.statusCode === 'number' ? error.statusCode : 500);
            return res.status(status).json({
                error: error.message || 'Failed to change password'
            });
        }
    }

    // Delete account (soft delete)
    static async deleteAccount(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: req.headers as any
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            const { password } = req.body;

            // Verify password before deletion
            const account = await prisma.account.findFirst({
                where: {
                    userId: session.user.id,
                    providerId: 'credential'
                }
            });

            if (account && account.password) {
                const bcrypt = require('bcrypt');
                const isValid = await bcrypt.compare(password, account.password);

                if (!isValid) {
                    return res.status(400).json({ error: 'Password is incorrect' });
                }
            }

            // Check if user is business owner
            const user = await prisma.user.findUnique({
                where: { id: session.user.id }
            });

            if (user?.activeBusinessId) {
                const membership = await prisma.businessMember.findFirst({
                    where: {
                        userId: user.id,
                        businessId: user.activeBusinessId,
                        role: 'OWNER'
                    }
                });

                if (membership) {
                    return res.status(400).json({
                        error: 'Cannot delete account while you are a business owner. Please transfer ownership or delete the business first.'
                    });
                }
            }

            // Delete all sessions
            await prisma.session.deleteMany({
                where: { userId: session.user.id }
            });

            // Delete all accounts
            await prisma.account.deleteMany({
                where: { userId: session.user.id }
            });

            // Delete user
            await prisma.user.delete({
                where: { id: session.user.id }
            });

            return res.json({ message: 'Account deleted successfully' });
        } catch (error: any) {
            console.error('Delete account error:', error);
            const status = typeof error.status === 'number' ? error.status : (typeof error.statusCode === 'number' ? error.statusCode : 500);
            return res.status(status).json({
                error: error.message || 'Failed to delete account'
            });
        }
    }
}
