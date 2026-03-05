import { Request, Response } from 'express';
import { auth } from '../lib/auth';
import { prisma } from '../lib/prisma';

export class SessionController {
    // List all active sessions for current user
    static async listSessions(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: req.headers as any
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            // Get all sessions for this user
            const sessions = await prisma.session.findMany({
                where: {
                    userId: session.user.id,
                    expiresAt: {
                        gt: new Date()
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                select: {
                    id: true,
                    ipAddress: true,
                    userAgent: true,
                    createdAt: true,
                    expiresAt: true,
                    token: true
                }
            });

            // Mark current session
            const sessionsWithCurrent = sessions.map(s => ({
                ...s,
                isCurrent: s.token === session.session.token,
                token: undefined // Don't send full token to client
            }));

            return res.json({ sessions: sessionsWithCurrent });
        } catch (error) {
            console.error('List sessions error:', error);
            return res.status(500).json({ error: 'Failed to list sessions' });
        }
    }

    // Revoke a specific session
    static async revokeSession(req: Request, res: Response) {
        try {
            const sessionId = req.params.sessionId as string;

            const session = await auth.api.getSession({
                headers: req.headers as any
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            // Verify the session belongs to the current user
            const targetSession = await prisma.session.findUnique({
                where: { id: sessionId }
            });

            if (!targetSession) {
                return res.status(404).json({ error: 'Session not found' });
            }

            if (targetSession.userId !== session.user.id) {
                return res.status(403).json({ error: 'Cannot revoke another user\'s session' });
            }

            // Prevent revoking current session
            if (targetSession.token === session.session.token) {
                return res.status(400).json({ error: 'Cannot revoke current session. Use sign out instead.' });
            }

            // Delete the session
            await prisma.session.delete({
                where: { id: sessionId }
            });

            return res.json({ message: 'Session revoked successfully' });
        } catch (error) {
            console.error('Revoke session error:', error);
            return res.status(500).json({ error: 'Failed to revoke session' });
        }
    }

    // Revoke all sessions except current
    static async revokeAllSessions(req: Request, res: Response) {
        try {
            const session = await auth.api.getSession({
                headers: req.headers as any
            });

            if (!session) {
                return res.status(401).json({ error: 'Not authenticated' });
            }

            // Delete all sessions except current
            const result = await prisma.session.deleteMany({
                where: {
                    userId: session.user.id,
                    token: {
                        not: session.session.token
                    }
                }
            });

            return res.json({
                message: 'All other sessions revoked successfully',
                revokedCount: result.count
            });
        } catch (error) {
            console.error('Revoke all sessions error:', error);
            return res.status(500).json({ error: 'Failed to revoke sessions' });
        }
    }
}
