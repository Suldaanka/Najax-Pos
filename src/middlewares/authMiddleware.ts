
import { Request, Response, NextFunction } from "express";
import { auth } from "../lib/auth";
import { fromNodeHeaders } from "better-auth/node";

// Type definition for Request with User/Session (can be extended in d.ts)
export interface AuthRequest extends Request {
    user?: any;
    session?: any;
}

import { prisma } from "../lib/prisma";

export const checkAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers)
        });

        if (!session) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        req.user = session.user;
        req.session = session.session;

        // Fetch user role for the active business
        if (req.user.activeBusinessId) {
            const membership = await prisma.businessMember.findUnique({
                where: {
                    userId_businessId: {
                        userId: req.user.id,
                        businessId: req.user.activeBusinessId
                    }
                }
            });
            
            if (membership) {
                req.user.role = membership.role;
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
