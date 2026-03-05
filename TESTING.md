# Better-Auth Testing Guide

## Available Endpoints

Better-Auth automatically provides these endpoints at `http://localhost:5000/api/auth/`:

### Email/Password Authentication
- **Sign Up**: `POST /api/auth/sign-up/email`
- **Sign In**: `POST /api/auth/sign-in/email`
- **Sign Out**: `POST /api/auth/sign-out`

### Google OAuth
- **Sign In with Google**: `GET /api/auth/sign-in/google`
- **Callback**: `GET /api/auth/callback/google`

### Session Management
- **Get Session**: `GET /api/auth/get-session`

---

## Testing with PowerShell

### 1. Sign Up with Email/Password

```powershell
$signUpBody = @{
    email = "test@example.com"
    password = "SecurePassword123!"
    name = "Test User"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:5000/api/auth/sign-up/email" `
    -Method POST `
    -Body $signUpBody `
    -ContentType "application/json" `
    -UseBasicParsing
```

### 2. Sign In with Email/Password

```powershell
$signInBody = @{
    email = "test@example.com"
    password = "SecurePassword123!"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/sign-in/email" `
    -Method POST `
    -Body $signInBody `
    -ContentType "application/json" `
    -SessionVariable session `
    -UseBasicParsing

# View the response
$response.Content
```

### 3. Get Current Session

```powershell
Invoke-WebRequest -Uri "http://localhost:5000/api/auth/get-session" `
    -Method GET `
    -WebSession $session `
    -UseBasicParsing
```

### 4. Sign In with Google (Browser Required)

Open your browser and navigate to:
```
http://localhost:5000/api/auth/sign-in/google
```

This will redirect you to Google's OAuth consent screen.

---

## Testing with cURL (Alternative)

### Sign Up
```bash
curl -X POST http://localhost:5000/api/auth/sign-up/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123!","name":"Test User"}'
```

### Sign In
```bash
curl -X POST http://localhost:5000/api/auth/sign-in/email \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"SecurePassword123!"}'
```

---

## Testing with Postman or Thunder Client (VS Code)

1. **Create a new POST request** to `http://localhost:5000/api/auth/sign-up/email`
2. **Set Headers**: `Content-Type: application/json`
3. **Set Body** (raw JSON):
   ```json
   {
     "email": "test@example.com",
     "password": "SecurePassword123!",
     "name": "Test User"
   }
   ```
4. **Send the request**

---

## Expected Responses

### Successful Sign Up (201 Created)
```json
{
  "user": {
    "id": "clx...",
    "email": "test@example.com",
    "name": "Test User",
    "emailVerified": false
  },
  "session": {
    "token": "...",
    "expiresAt": "..."
  }
}
```

### Successful Sign In (200 OK)
```json
{
  "user": {
    "id": "clx...",
    "email": "test@example.com",
    "name": "Test User"
  },
  "session": {
    "token": "...",
    "expiresAt": "..."
  }
}
```

### Error Response (400/401)
```json
{
  "error": "Invalid credentials"
}
```
