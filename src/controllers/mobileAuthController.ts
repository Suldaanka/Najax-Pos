import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import { prisma } from '../lib/prisma';
import { auth } from '../lib/auth';

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export class MobileAuthController {
    /**
     * Mobile Google Sign-In
     * Accepts a Google idToken obtained directly by expo-auth-session on the device,
     * verifies it with Google, and creates/finds a Better-Auth session.
     */
    static async googleMobileSignIn(req: Request, res: Response) {
        try {
            const { idToken } = req.body;

            if (!idToken) {
                return res.status(400).json({ error: 'idToken is required' });
            }

            // Verify the Google ID token
            const ticket = await googleClient.verifyIdToken({
                idToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            if (!payload || !payload.email) {
                return res.status(401).json({ error: 'Invalid Google token' });
            }

            const { email, name, sub: googleId, picture } = payload;

            // Check if user already exists
            let user = await prisma.user.findUnique({ where: { email } });

            if (!user) {
                // Create user via Better-Auth's internal API
                const signUpResult = await auth.api.signUpEmail({
                    body: {
                        email,
                        password: `google_${googleId}_${Date.now()}`, // Random password, user will use Google to login
                        name: name || email.split('@')[0],
                    },
                    headers: req.headers as any
                });
                user = signUpResult?.user as any;
            }

            if (!user) {
                return res.status(500).json({ error: 'Failed to create user' });
            }

            // Create a Better-Auth session for the user
            // We sign in them via email using a generated temp approach
            // Actually we'll create the session directly in the database
            const sessionToken = require('crypto').randomBytes(32).toString('hex');
            const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

            const session = await prisma.session.create({
                data: {
                    token: sessionToken,
                    userId: user.id,
                    expiresAt,
                    ipAddress: req.ip,
                    userAgent: req.headers['user-agent'],
                }
            });

            return res.json({
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    activeBusinessId: (user as any).activeBusinessId,
                },
                session: {
                    id: session.id,
                    token: sessionToken,
                    expiresAt,
                }
            });

        } catch (error: any) {
            console.error('Mobile Google sign-in error:', error);
            return res.status(500).json({
                error: error.message || 'Google authentication failed'
            });
        }
    }
}
