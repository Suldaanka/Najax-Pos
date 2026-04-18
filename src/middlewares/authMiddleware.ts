import { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma";

export interface AuthRequest extends Request {
    user?: any;
    session?: any;
}

/**
 * Direct token validation middleware.
 * 
 * Instead of relying on better-auth's auth.api.getSession() which requires
 * the expo() plugin to correctly parse mobile headers (which has been
 * unreliable), we directly query the Prisma Session table using the raw
 * token from the request. This works regardless of how the token is sent.
 *
 * Token sources (checked in order):
 * 1. `x-session-token` header   (better-auth/expo standard)
 * 2. `Authorization: Bearer`    (standard REST pattern)
 */
export const checkAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        // Extract token from multiple possible headers
        let token: string | null = null;

        const xSessionToken = req.headers['x-session-token'];
        if (xSessionToken && typeof xSessionToken === 'string') {
            token = xSessionToken;
        } else {
            const authHeader = req.headers['authorization'];
            if (authHeader && authHeader.startsWith('Bearer ')) {
                token = authHeader.replace('Bearer ', '').trim();
            }
        }

        if (!token) {
            console.warn(`[AUTH] No token in request to ${req.path}`);
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Direct DB lookup — no dependency on better-auth session parsing
        const sessionRecord = await prisma.session.findUnique({
            where: { token },
            include: { user: true }
        });

        if (!sessionRecord) {
            console.warn(`[AUTH] No session found for token (first 8): ${token.substring(0, 8)}...`);
            return res.status(401).json({ error: "Unauthorized" });
        }

        // Check session expiry
        if (sessionRecord.expiresAt < new Date()) {
            console.warn(`[AUTH] Session expired for user ${sessionRecord.userId}`);
            return res.status(401).json({ error: "Session expired" });
        }

        const dbUser = sessionRecord.user;
        if (!dbUser) {
            return res.status(401).json({ error: "User not found" });
        }

        req.user = dbUser;
        req.session = sessionRecord;

        // Fetch user role and business name for the active business
        if (req.user.activeBusinessId) {
            const membership = await prisma.businessMember.findUnique({
                where: {
                    userId_businessId: {
                        userId: req.user.id,
                        businessId: req.user.activeBusinessId
                    }
                },
                include: {
                    business: {
                        select: { name: true }
                    }
                }
            });

            if (membership) {
                req.user.role = membership.role;
                req.user.activeBusinessName = membership.business.name;
            }
        }

        next();
    } catch (error: any) {
        console.error("Auth Middleware Error:", error?.message || error);
        res.status(500).json({ error: "Internal Server Error", detail: error?.message });
    }
};

export const checkRole = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ error: "Forbidden: Insufficient Permissions" });
        }
        next();
    };
};
