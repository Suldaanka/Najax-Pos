# Najax POS API Documentation

Base URL: `http://localhost:5000`

---

## Authentication Endpoints

### Better-Auth Endpoints (Automatic)

#### Sign Up with Email
```http
POST /api/auth/sign-up/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

**Response (201 Created):**
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "John Doe",
    "emailVerified": false
  },
  "session": {
    "token": "...",
    "expiresAt": "2026-02-08T12:00:00.000Z"
  }
}
```

#### Sign In with Email
```http
POST /api/auth/sign-in/email
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "token": "...",
    "expiresAt": "2026-02-08T12:00:00.000Z"
  }
}
```

#### Sign In with Google
```http
GET /api/auth/sign-in/google
```
Redirects to Google OAuth consent screen.

#### Google OAuth Callback
```http
GET /api/auth/callback/google
```
Handles the OAuth callback from Google.

---

### Custom Auth Endpoints

#### Sign Up (Manual/Explicit)
```http
POST /api/sign-up
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

#### Sign In (Manual/Explicit)
```http
POST /api/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Get Current Session
```http
GET /api/session
```

**Response (200 OK):**
```json
{
  "user": {
    "id": "clx...",
    "email": "user@example.com",
    "name": "John Doe"
  },
  "session": {
    "id": "...",
    "token": "...",
    "expiresAt": "2026-02-08T12:00:00.000Z"
  }
}
```

#### Sign Out
```http
POST /api/signout
```

**Response (200 OK):**
```json
{
  "message": "Signed out successfully"
}
```

#### Get User Profile
```http
GET /api/profile
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "clx...",
  "email": "user@example.com",
  "name": "John Doe",
  "role": "OWNER",
  "business": {
    "id": "clx...",
    "name": "My Pharmacy",
    "address": "123 Main St",
    "phone": "+252612345678"
  }
}
```

#### Update User Profile
```http
PUT /api/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith"
}
```

**Response (200 OK):**
```json
{
  "id": "clx...",
  "email": "user@example.com",
  "name": "John Smith",
  "role": "OWNER"
}
```

---

## Password Reset

#### Request Password Reset
```http
POST /api/auth/password-reset/request
Content-Type: application/json

{
  "email": "user@example.com"
}
```

**Response (200 OK):**
```json
{
  "message": "If an account with that email exists, a password reset link has been sent."
}
```

#### Verify Reset Token
```http
POST /api/auth/password-reset/verify
Content-Type: application/json

{
  "token": "reset-token-from-email"
}
```

**Response (200 OK):**
```json
{
  "valid": true,
  "message": "Token is valid"
}
```

#### Reset Password
```http
POST /api/auth/password-reset/reset
Content-Type: application/json

{
  "token": "reset-token-from-email",
  "newPassword": "NewSecurePassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password reset successfully"
}
```

---

## Email Verification

#### Send Verification Email
```http
POST /api/auth/verify-email/send
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Verification email sent"
}
```

#### Verify Email
```http
POST /api/auth/verify-email
Content-Type: application/json

{
  "token": "verification-token-from-email"
}
```

**Response (200 OK):**
```json
{
  "message": "Email verified successfully"
}
```

---

## Session Management

#### List All Sessions
```http
GET /api/sessions
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "sessions": [
    {
      "id": "session-id-1",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "createdAt": "2026-02-07T12:00:00.000Z",
      "expiresAt": "2026-02-08T12:00:00.000Z",
      "isCurrent": true
    },
    {
      "id": "session-id-2",
      "ipAddress": "192.168.1.2",
      "userAgent": "Chrome/...",
      "createdAt": "2026-02-06T12:00:00.000Z",
      "expiresAt": "2026-02-07T12:00:00.000Z",
      "isCurrent": false
    }
  ]
}
```

#### Revoke Specific Session
```http
DELETE /api/sessions/:sessionId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Session revoked successfully"
}
```

#### Revoke All Sessions (Except Current)
```http
DELETE /api/sessions/all
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "All other sessions revoked successfully",
  "revokedCount": 3
}
```

---

## Account Security

#### Change Password
```http
POST /api/auth/change-password
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Password changed successfully"
}
```

#### Delete Account
```http
DELETE /api/auth/account
Authorization: Bearer <token>
Content-Type: application/json

{
  "password": "YourPassword123!"
}
```

**Response (200 OK):**
```json
{
  "message": "Account deleted successfully"
}
```

---

## Business Management Endpoints

All business endpoints require authentication.

#### Create Business (Onboarding)
```http
POST /api/business
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "My Pharmacy",
  "address": "123 Main St, Mogadishu",
  "phone": "+252612345678"
}
```

**Response (201 Created):**
```json
{
  "message": "Business created successfully",
  "business": {
    "id": "clx...",
    "name": "My Pharmacy",
    "address": "123 Main St, Mogadishu",
    "phone": "+252612345678",
    "subscriptionStatus": "INACTIVE",
    "createdAt": "2026-02-07T12:00:00.000Z"
  }
}
```

#### Get Business Details
```http
GET /api/business
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "id": "clx...",
  "name": "My Pharmacy",
  "address": "123 Main St, Mogadishu",
  "phone": "+252612345678",
  "subscriptionStatus": "ACTIVE",
  "subscriptionExpiry": "2026-03-07T12:00:00.000Z",
  "users": [
    {
      "id": "clx...",
      "name": "John Doe",
      "email": "user@example.com",
      "role": "OWNER"
    }
  ],
  "subscriptions": [
    {
      "id": "clx...",
      "plan": "PRO",
      "status": "ACTIVE",
      "startDate": "2026-02-07T12:00:00.000Z",
      "endDate": "2026-03-07T12:00:00.000Z"
    }
  ]
}
```

#### Update Business (Owner Only)
```http
PUT /api/business
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Updated Pharmacy Name",
  "address": "456 New St, Mogadishu",
  "phone": "+252612345679"
}
```

**Response (200 OK):**
```json
{
  "message": "Business updated successfully",
  "business": {
    "id": "clx...",
    "name": "Updated Pharmacy Name",
    "address": "456 New St, Mogadishu",
    "phone": "+252612345679"
  }
}
```

---

## User Management (Multi-tenant)

### Staff Invitation System

#### Invite Staff Member (Owner Only)
```http
POST /api/business/invite
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": "staff@example.com",
  "role": "STAFF"
}
```

**Response (201 Created):**
```json
{
  "message": "Invitation sent successfully",
  "invitation": {
    "id": "inv-id",
    "email": "staff@example.com",
    "role": "STAFF",
    "expiresAt": "2026-02-14T12:00:00.000Z"
  }
}
```

#### Accept Invitation
```http
POST /api/business/invite/accept
Authorization: Bearer <token>
Content-Type: application/json

{
  "token": "invitation-token-from-email"
}
```

**Response (200 OK):**
```json
{
  "message": "Invitation accepted successfully",
  "business": {
    "id": "clx...",
    "name": "My Pharmacy"
  },
  "role": "STAFF"
}
```

#### List Pending Invitations (Owner Only)
```http
GET /api/business/invitations
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "invitations": [
    {
      "id": "inv-id-1",
      "email": "staff1@example.com",
      "role": "STAFF",
      "status": "PENDING",
      "expiresAt": "2026-02-14T12:00:00.000Z",
      "createdAt": "2026-02-07T12:00:00.000Z"
    },
    {
      "id": "inv-id-2",
      "email": "staff2@example.com",
      "role": "STAFF",
      "status": "ACCEPTED",
      "expiresAt": "2026-02-14T12:00:00.000Z",
      "createdAt": "2026-02-06T12:00:00.000Z"
    }
  ]
}
```

#### Revoke Invitation (Owner Only)
```http
DELETE /api/business/invite/:id
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "Invitation revoked successfully"
}
```

### User Role Management

#### List Business Users
```http
GET /api/business/users
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "users": [
    {
      "id": "user-id-1",
      "name": "John Doe",
      "email": "owner@example.com",
      "role": "OWNER",
      "emailVerified": true,
      "createdAt": "2026-01-01T12:00:00.000Z"
    },
    {
      "id": "user-id-2",
      "name": "Jane Smith",
      "email": "staff@example.com",
      "role": "STAFF",
      "emailVerified": true,
      "createdAt": "2026-02-07T12:00:00.000Z"
    }
  ]
}
```

#### Update User Role (Owner Only)
```http
PUT /api/business/users/:userId/role
Authorization: Bearer <token>
Content-Type: application/json

{
  "role": "OWNER"
}
```

**Response (200 OK):**
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": "user-id",
    "name": "Jane Smith",
    "email": "staff@example.com",
    "role": "OWNER"
  }
}
```

#### Remove User from Business (Owner Only)
```http
DELETE /api/business/users/:userId
Authorization: Bearer <token>
```

**Response (200 OK):**
```json
{
  "message": "User removed from business successfully"
}
```

---

## Health Check

#### Server Health
```http
GET /health
```

**Response (200 OK):**
```json
{
  "status": "OK",
  "timestamp": "2026-02-07T12:00:00.000Z"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation error message"
}
```

### 401 Unauthorized
```json
{
  "error": "Not authenticated"
}
```

### 403 Forbidden
```json
{
  "error": "Insufficient permissions"
}
```

### 404 Not Found
```json
{
  "error": "Resource not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error message"
}
```

---

## Authentication Flow

### New User Registration
1. **Sign Up**: `POST /api/auth/sign-up/email`
2. **Verify Email**: `POST /api/auth/verify-email` (optional but recommended)
3. **Create Business**: `POST /api/business` (becomes OWNER)
4. **Use the app**: Access all features based on subscription status

### OAuth Registration
1. **Sign In with Google**: `GET /api/auth/sign-in/google`
2. **Create Business**: `POST /api/business` (becomes OWNER)
3. **Use the app**: Access all features based on subscription status

### Staff Onboarding
1. **Owner invites staff**: `POST /api/business/invite`
2. **Staff receives email** with invitation link
3. **Staff signs up**: `POST /api/auth/sign-up/email` (if new user)
4. **Staff accepts invitation**: `POST /api/business/invite/accept`
5. **Staff can access business**: Based on assigned role

### Password Reset Flow
1. **Request reset**: `POST /api/auth/password-reset/request`
2. **User receives email** with reset link
3. **Verify token** (optional): `POST /api/auth/password-reset/verify`
4. **Reset password**: `POST /api/auth/password-reset/reset`

---

## Notes

- All authenticated endpoints require the session token/cookie from Better-Auth
- Business creation automatically assigns the user as OWNER
- Subscription status must be ACTIVE for full API access (to be implemented)
- Role-based access control (RBAC) is enforced on certain endpoints
- Password reset tokens expire after 1 hour
- Email verification tokens expire after 24 hours
- Invitation tokens expire after 7 days
- Only OWNER role can invite staff, update roles, and remove users
- Users cannot change their own role or remove themselves
- Email service must be configured in `.env` for password reset and invitations to work

