import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { InvitationService } from "../services/invitationService";
import { emailService } from "../services/emailService";
import { expo } from "@better-auth/expo";
import { idToken } from "better-auth/plugins";

const getBaseURL = () => {
    // Force backend's own domain for OAuth redirect consistency
    const rawUrl = process.env.BETTER_AUTH_URL || (process.env.NODE_ENV === "production" ? "https://najax-backend-production.up.railway.app" : "http://localhost:5000");
    const baseUrl = rawUrl.endsWith("/api/auth") ? rawUrl : (rawUrl.endsWith("/") ? `${rawUrl}api/auth` : `${rawUrl}/api/auth`);
    console.log(`[AUTH] Initializing with baseURL: ${baseUrl} (NODE_ENV: ${process.env.NODE_ENV})`);
    return baseUrl;
};

export const auth = betterAuth({
    plugins: [
        expo(),
        idToken()
    ],
    baseURL: getBaseURL(),
    trustHost: true, // Allow Railway proxy headers for accurate domain/protocol detection
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
        async sendResetPassword(data, request) {
            await emailService.sendPasswordResetEmail(data.user.email, data.token);
        },
    },
    socialProviders: {
        google: {
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
            // Redirect URI must point to the FRONTEND domain (proxied to backend via Next.js rewrites).
            // This is required because Railway's *.up.railway.app are on the public suffix list —
            // cookies cannot be shared between subdomains. Everything must flow through one domain.
            redirectURI: `${process.env.FRONTEND_URL || "https://najax-pos-frontend-production.up.railway.app"}/api/auth/callback/google`,
            authorizeQuery: {
                prompt: "select_account",
            }
        },
    },
    trustedOrigins: [
        process.env.FRONTEND_URL || "https://najax-pos-frontend-production.up.railway.app",
        process.env.BETTER_AUTH_URL || "https://najax-pos-production.up.railway.app",
        "https://najax-pos-frontend-production.up.railway.app",
        "https://najax-pos-production.up.railway.app",
        "https://najax-backend-production.up.railway.app",
        "najaxapp://",
        "najaxapp://auth/callback",
        "najaxapp://dashboard",
        "najaxapp://(tabs)/dashboard",
        "exp://",
        "exp://*",
        "http://localhost:3000",
        "http://localhost:5000",
        "http://localhost:8081",  // Expo dev server
        "http://localhost:19006", // Expo web
        "http://10.0.2.2:8081",  // Android emulator → Expo dev server
    ],
    advanced: {
        cookiePrefix: "najax",
        defaultCookieAttributes: {
            // Must be "none" for cross-subdomain cookies on Railway public suffixes
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
