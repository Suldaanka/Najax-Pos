import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { InvitationService } from "../services/invitationService";
import { expo } from "@better-auth/expo";

const getBaseURL = () => {
    // The baseURL MUST include the path where Better Auth is mounted (/api/auth)
    const rawUrl = process.env.BETTER_AUTH_URL || (process.env.NODE_ENV === "production" ? "https://najax-pos-production.up.railway.app" : "http://localhost:5000");
    return rawUrl.endsWith("/api/auth") ? rawUrl : (rawUrl.endsWith("/") ? `${rawUrl}api/auth` : `${rawUrl}/api/auth`);
};

export const auth = betterAuth({
    plugins: [expo()],
    baseURL: getBaseURL(),
    trustHost: true,
    secret: process.env.BETTER_AUTH_SECRET,
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    databaseHooks: {
        user: {
            create: {
                after: async (user) => {
                    await InvitationService.handlePendingInvitation(user.id, user.email);
                }
            }
        }
    },
    emailAndPassword: {
        enabled: true,
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        },
    },
    trustedOrigins: [
        process.env.FRONTEND_URL || "https://najax-pos-frontend-production.up.railway.app",
        process.env.BETTER_AUTH_URL || "https://najax-pos-production.up.railway.app",
        "https://najax-pos-frontend-production.up.railway.app",
        "https://najax-pos-production.up.railway.app",
        "https://zingy-dasik-cc0f46.netlify.app",
        "najaxapp://",
        "najaxapp://dashboard",
        "najaxapp://(tabs)/dashboard",
        "exp://",
        "exp://*",
        "http://localhost:3000",
        "http://localhost:5000",
    ],
    advanced: {
        cookiePrefix: "najax",
        defaultCookieAttributes: {
            // Must be "none" for cross-domain cookies (Netlify -> Railway)
            sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
            secure: process.env.NODE_ENV === "production",
            httpOnly: true,
        }
    },
    user: {
        additionalFields: {
            activeBusinessId: {
                type: "string",
                required: false,
                input: false,
            }
        }
    },
    debug: true
});
