import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { emailService } from '../services/emailService';
import crypto from 'crypto';

export class PasswordResetController {
    // Request password reset
    static async requestPasswordReset(req: Request, res: Response) {
        try {
            const { email } = req.body;

            if (!email) {
                return res.status(400).json({ error: 'Email is required' });
            }

            // Find user by email
            const user = await prisma.user.findUnique({
                where: { email }
            });

            // Don't reveal if user exists or not (security best practice)
            if (!user) {
                return res.json({
                    message: 'If an account with that email exists, a password reset link has been sent.'
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');
            const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

            // Store token in Verification table
            await prisma.verification.create({
                data: {
                    identifier: `password-reset:${email}`,
                    value: hashedToken,
                    expiresAt
                }
            });

            // Send email
            await emailService.sendPasswordResetEmail(email, resetToken);

            return res.json({
                message: 'If an account with that email exists, a password reset link has been sent.'
            });
        } catch (error) {
            console.error('Request password reset error:', error);
            return res.status(500).json({ error: 'Failed to process password reset request' });
        }
    }

    // Verify reset token
    static async verifyResetToken(req: Request, res: Response) {
        try {
            const { token } = req.body;

            if (!token) {
                return res.status(400).json({ error: 'Token is required' });
            }

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            // Find verification record
            const verification = await prisma.verification.findFirst({
                where: {
                    value: hashedToken,
                    identifier: {
                        startsWith: 'password-reset:'
                    },
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });

            if (!verification) {
                return res.status(400).json({ error: 'Invalid or expired token' });
            }

            return res.json({
                valid: true,
                message: 'Token is valid'
            });
        } catch (error) {
            console.error('Verify reset token error:', error);
            return res.status(500).json({ error: 'Failed to verify token' });
        }
    }

    // Reset password
    static async resetPassword(req: Request, res: Response) {
        try {
            const { token, newPassword } = req.body;

            if (!token || !newPassword) {
                return res.status(400).json({ error: 'Token and new password are required' });
            }

            // Validate password strength
            if (newPassword.length < 8) {
                return res.status(400).json({ error: 'Password must be at least 8 characters long' });
            }

            const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

            // Find verification record
            const verification = await prisma.verification.findFirst({
                where: {
                    value: hashedToken,
                    identifier: {
                        startsWith: 'password-reset:'
                    },
                    expiresAt: {
                        gt: new Date()
                    }
                }
            });

            if (!verification) {
                return res.status(400).json({ error: 'Invalid or expired token' });
            }

            // Extract email from identifier
            const email = verification.identifier.replace('password-reset:', '');

            // Find user
            const user = await prisma.user.findUnique({
                where: { email }
            });

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            // Hash the new password using Better-Auth's method
            const bcrypt = require('bcrypt');
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update password in Account table (Better-Auth stores passwords here)
            await prisma.account.updateMany({
                where: {
                    userId: user.id,
                    providerId: 'credential' // Better-Auth uses 'credential' for email/password
                },
                data: {
                    password: hashedPassword
                }
            });

            // Delete the verification token
            await prisma.verification.delete({
                where: { id: verification.id }
            });

            return res.json({
                message: 'Password reset successfully'
            });
        } catch (error) {
            console.error('Reset password error:', error);
            return res.status(500).json({ error: 'Failed to reset password' });
        }
    }
}
