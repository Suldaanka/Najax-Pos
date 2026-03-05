import { Router } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { AuthController } from "../controllers/authController";
import { MobileAuthController } from "../controllers/mobileAuthController";
import { PasswordResetController } from "../controllers/passwordResetController";
import { SessionController } from "../controllers/sessionController";
import { checkAuth } from "../middlewares/authMiddleware";

const router = Router();

// --- CUSTOM ROUTES (Must be before Better-Auth to avoid interception) ---

// Explicit Sign Up / Sign In
router.post("/sign-up", AuthController.signUp);
router.post("/sign-in", AuthController.signIn);

// Mobile-specific: Accept Google idToken directly (no browser redirect needed)
router.post("/google-mobile", MobileAuthController.googleMobileSignIn);

// Mobile OAuth callback - redirects to app deep link with session token
router.get("/mobile-callback", async (req, res) => {
    try {
        // Get the session using Better-Auth
        const session = await auth.api.getSession({
            headers: req.headers as any
        });

        if (!session || !session.session) {
            return res.redirect(`najax://auth/callback?error=no_session`);
        }

        // Redirect to app with the session token
        const token = session.session.token;
        return res.redirect(`najax://auth/callback?token=${token}`);
    } catch (err: any) {
        console.error('Mobile callback error:', err);
        return res.redirect(`najax://auth/callback?error=${encodeURIComponent(err.message)}`);
    }
});

// Password Reset
router.post("/auth/password-reset/request", PasswordResetController.requestPasswordReset);
router.post("/auth/password-reset/verify", PasswordResetController.verifyResetToken);
router.post("/auth/password-reset/reset", PasswordResetController.resetPassword);

// Email Verification
router.post("/auth/verify-email/send", checkAuth, AuthController.sendVerificationEmail);
router.post("/auth/verify-email", AuthController.verifyEmail);
router.get("/auth/verify-email", AuthController.verifyEmail); // Support link clicks

// Account Security
router.post("/auth/change-password", checkAuth, AuthController.changePassword);
router.delete("/auth/account", checkAuth, AuthController.deleteAccount);

// --- BETTER-AUTH MIDDLEWARE ---
// NOTE: Better Auth is now handled directly in app.ts as a catch-all on /api/auth/*
// See app.ts: app.all('/api/auth/*', toNodeHandler(auth))
// This avoids the express.json() conflict described in the Better Auth docs.

// --- OTHER APP ROUTES ---

// Session Management
router.get("/sessions", checkAuth, SessionController.listSessions);
router.delete("/sessions/:sessionId", checkAuth, SessionController.revokeSession);
router.delete("/sessions/all", checkAuth, SessionController.revokeAllSessions);

// Custom auth endpoints
router.get("/session", AuthController.getSession);
router.post("/signout", AuthController.signOut);
router.get("/profile", checkAuth, AuthController.getProfile);
router.put("/profile", checkAuth, AuthController.updateProfile);

export default router;
