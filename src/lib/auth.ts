import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";
import { InvitationService } from "../services/invitationService";
import { expo } from "@better-auth/expo";

export const auth = betterAuth({
    plugins: [expo()],
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5000",
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
        process.env.FRONTEND_URL || "http://localhost:3000",
        process.env.BETTER_AUTH_URL || "http://localhost:5000",
        "http://10.95.253.240:5000",
        "exp://10.95.253.240:8081",
        "najaxapp://"
    ],
    advanced: {
        cookiePrefix: "najax",
        crossSubDomainCookies: {
            enabled: true,
        },
        defaultCookieAttributes: {
            sameSite: "none",
            secure: true, // none requires secure: true, but we're on localhost
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
    }
});
