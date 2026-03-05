import nodemailer from 'nodemailer';

interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    text?: string;
}

class EmailService {
    private transporter: nodemailer.Transporter;

    constructor() {
        // Create transporter using environment variables
        this.transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        // Verify connection configuration
        this.transporter.verify((error, success) => {
            if (error) {
                console.error('SMTP Transport Verification Error:', error);
            } else {
                console.log('SMTP Transport is ready');
            }
        });
    }

    async sendEmail(options: EmailOptions): Promise<void> {
        try {
            await this.transporter.sendMail({
                from: process.env.EMAIL_FROM || 'noreply@najax.com',
                to: options.to,
                subject: options.subject,
                html: options.html,
                text: options.text,
            });
            console.log(`Email sent to ${options.to}`);
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send email');
        }
    }

    // Password Reset Email
    async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
        const resetUrl = `${process.env.BETTER_AUTH_URL}/reset-password?token=${resetToken}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #4F46E5; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 30px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Password Reset Request</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>We received a request to reset your password for your Najax POS account.</p>
                        <p>Click the button below to reset your password:</p>
                        <a href="${resetUrl}" class="button">Reset Password</a>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
                        <p><strong>This link will expire in 1 hour.</strong></p>
                        <p>If you didn't request a password reset, please ignore this email or contact support if you have concerns.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Najax POS. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Reset Your Password - Najax POS',
            html,
            text: `Reset your password by visiting: ${resetUrl}\n\nThis link will expire in 1 hour.`,
        });
    }

    // Email Verification Email
    async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
        const verifyUrl = `${process.env.BETTER_AUTH_URL}/api/auth/verify-email?token=${verificationToken}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #10B981; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 30px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #10B981; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Verify Your Email</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p>Thank you for signing up for Najax POS!</p>
                        <p>Please verify your email address by clicking the button below:</p>
                        <a href="${verifyUrl}" class="button">Verify Email</a>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #10B981;">${verifyUrl}</p>
                        <p><strong>This link will expire in 24 hours.</strong></p>
                        <p>If you didn't create an account, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Najax POS. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await this.sendEmail({
            to: email,
            subject: 'Verify Your Email - Najax POS',
            html,
            text: `Verify your email by visiting: ${verifyUrl}\n\nThis link will expire in 24 hours.`,
        });
    }

    // Staff Invitation Email
    async sendInvitationEmail(email: string, businessName: string, inviterName: string, invitationToken: string, role: string): Promise<void> {
        const inviteUrl = `${process.env.BETTER_AUTH_URL}/accept-invitation?token=${invitationToken}`;

        const html = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #F59E0B; color: white; padding: 20px; text-align: center; }
                    .content { background-color: #f9f9f9; padding: 30px; }
                    .button { display: inline-block; padding: 12px 24px; background-color: #F59E0B; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
                    .info-box { background-color: #FEF3C7; padding: 15px; border-left: 4px solid #F59E0B; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>You're Invited!</h1>
                    </div>
                    <div class="content">
                        <p>Hello,</p>
                        <p><strong>${inviterName}</strong> has invited you to join <strong>${businessName}</strong> on Najax POS.</p>
                        <div class="info-box">
                            <p><strong>Role:</strong> ${role}</p>
                            <p><strong>Business:</strong> ${businessName}</p>
                        </div>
                        <p>Click the button below to accept the invitation:</p>
                        <a href="${inviteUrl}" class="button">Accept Invitation</a>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #F59E0B;">${inviteUrl}</p>
                        <p><strong>This invitation will expire in 7 days.</strong></p>
                        <p>If you don't want to accept this invitation, you can safely ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; ${new Date().getFullYear()} Najax POS. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        await this.sendEmail({
            to: email,
            subject: `Invitation to join ${businessName} - Najax POS`,
            html,
            text: `You've been invited to join ${businessName} as ${role}.\n\nAccept invitation: ${inviteUrl}\n\nThis invitation expires in 7 days.`,
        });
    }
}

export const emailService = new EmailService();
