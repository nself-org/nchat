# ɳChat ID.me Plugin

**Plugin Name**: `idme`
**Version**: 1.0.0
**Category**: Authentication
**Status**: Production Ready
**Priority**: MEDIUM

---

## Overview

The ID.me Plugin enables identity verification and specialized login for military members, veterans, first responders, students, teachers, and other affiliation groups. It integrates ID.me's OAuth 2.0 authentication and identity verification services.

---

## Features

### Core Features

- ✅ **OAuth 2.0 Authentication** - Secure login with ID.me
- ✅ **Identity Verification** - Real-time identity proofing
- ✅ **Group Affiliation** - Military, student, teacher verification
- ✅ **Credential Verification** - Secure document verification
- ✅ **Profile Integration** - Import user profile data
- ✅ **Scoped Access** - Request specific data permissions

### Supported Affiliation Groups

- ✅ **Military** - Active duty, veterans, families
- ✅ **First Responders** - Police, fire, EMS, nurses
- ✅ **Students** - K-12, college, university
- ✅ **Teachers** - K-12, college, university
- ✅ **Government** - Federal, state, local employees
- ✅ **Healthcare** - Medical professionals

---

## Installation

### Prerequisites

- ID.me developer account (https://developer.id.me)
- OAuth application credentials
- HTTPS enabled (required for OAuth)

### Setup ID.me Application

1. **Create Developer Account**:
   - Visit https://developer.id.me
   - Sign up for developer access
   - Create new application

2. **Configure OAuth Application**:
   - Application Name: `ɳChat`
   - Redirect URI: `https://yourdomain.com/api/auth/oauth/callback`
   - Scopes: `openid`, `profile`, `email`, `military`, `student`, `teacher`

3. **Get Credentials**:
   - Client ID: `your_client_id`
   - Client Secret: `your_client_secret`

### Install Plugin

```bash
cd /Users/admin/Sites/nself-nchat/backend
nself plugin install idme
```

### Configuration

Add to `backend/.env.plugins`:

```bash
# ID.me Plugin
IDME_ENABLED=true
IDME_CLIENT_ID=your_client_id_here
IDME_CLIENT_SECRET=your_client_secret_here
IDME_REDIRECT_URI=https://${BASE_DOMAIN}/api/auth/oauth/callback
IDME_SCOPE=openid,profile,email,military,student,teacher
IDME_ENVIRONMENT=sandbox  # or 'production'

# Optional: Group-specific scopes
IDME_VERIFY_MILITARY=true
IDME_VERIFY_STUDENT=true
IDME_VERIFY_TEACHER=true
IDME_VERIFY_FIRST_RESPONDER=true
```

Add to frontend `.env.local`:

```bash
NEXT_PUBLIC_IDME_ENABLED=true
```

### Start Service

```bash
nself restart
```

---

## OAuth Flow

### 1. Authorization Request

```bash
GET /api/auth/oauth/authorize?provider=idme
```

**Response:**

```json
{
  "authUrl": "https://api.id.me/oauth/authorize?client_id=xxx&redirect_uri=xxx&scope=openid+profile+email&state=xxx"
}
```

### 2. User Authorization

User is redirected to ID.me to:

- Log in with ID.me account
- Verify identity (if first time)
- Grant permissions to your app

### 3. Callback

```bash
GET /api/auth/oauth/callback?provider=idme&code=xxx&state=xxx
```

**Backend Process:**

1. Exchange code for access token
2. Fetch user profile
3. Verify group affiliations
4. Create/update user account
5. Create session
6. Redirect to app

---

## API Endpoints

### Get Authorization URL

```bash
GET /api/auth/oauth/authorize?provider=idme
```

**Response:**

```json
{
  "authUrl": "https://api.id.me/oauth/authorize?...",
  "state": "random-state-string"
}
```

### Handle OAuth Callback

```bash
GET /api/auth/oauth/callback?provider=idme&code=xxx&state=xxx
```

**Success Response:**

- Redirects to `/` with session cookie

**Error Response:**

- Redirects to `/login?error=oauth_failed`

### Get User Profile

```bash
GET /api/auth/profile
Authorization: Bearer <access-token>
```

**Response:**

```json
{
  "id": "idme-user-id",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "verified": true,
  "groups": [
    {
      "type": "military",
      "status": "veteran",
      "branch": "army",
      "verified": true
    },
    {
      "type": "student",
      "institution": "MIT",
      "verified": true
    }
  ],
  "verificationDate": "2026-02-03T12:00:00Z"
}
```

### Disconnect ID.me

```bash
POST /api/auth/oauth/disconnect
Authorization: Bearer <access-token>
Content-Type: application/json

{
  "provider": "idme"
}
```

---

## Frontend Integration

### Login Button

```typescript
import { useAuth } from '@/contexts/auth-context'

function LoginPage() {
  const { loginWithOAuth } = useAuth()

  const handleIDmeLogin = async () => {
    try {
      await loginWithOAuth('idme')
      // User will be redirected to ID.me
    } catch (error) {
      console.error('ID.me login failed:', error)
    }
  }

  return (
    <button onClick={handleIDmeLogin} className="idme-button">
      <img src="/logos/idme.svg" alt="ID.me" />
      Sign in with ID.me
    </button>
  )
}
```

### Check Verification Status

```typescript
import { useUser } from '@/hooks/use-user'

function ProfileBadges() {
  const { user } = useUser()

  const militaryVerified = user?.groups?.some(
    (g) => g.type === 'military' && g.verified
  )

  const studentVerified = user?.groups?.some(
    (g) => g.type === 'student' && g.verified
  )

  return (
    <div>
      {militaryVerified && (
        <Badge variant="military">
          <Shield /> Military Verified
        </Badge>
      )}
      {studentVerified && (
        <Badge variant="student">
          <GraduationCap /> Student Verified
        </Badge>
      )}
    </div>
  )
}
```

### Custom Verification Flow

```typescript
import { IDmeProvider } from '@/services/auth/providers/idme.provider'

const idmeProvider = new IDmeProvider()

// Request specific verification
const authUrl = await idmeProvider.getAuthorizationUrl({
  scopes: ['military', 'student'],
  affiliationRequired: true,
})

// Redirect user
window.location.href = authUrl
```

---

## Scopes and Permissions

### Basic Scopes

| Scope     | Description                   | Required |
| --------- | ----------------------------- | -------- |
| `openid`  | OpenID Connect authentication | Yes      |
| `profile` | Basic profile information     | Yes      |
| `email`   | Email address                 | Yes      |

### Affiliation Scopes

| Scope             | Description                  | Group Type      |
| ----------------- | ---------------------------- | --------------- |
| `military`        | Military verification        | Military        |
| `student`         | Student verification         | Student         |
| `teacher`         | Teacher verification         | Teacher         |
| `first_responder` | First responder verification | First Responder |
| `government`      | Government employee          | Government      |
| `healthcare`      | Healthcare professional      | Healthcare      |

---

## Verification Levels

### Identity Verification

ID.me provides different levels of identity verification:

1. **Level 1 (IAL1)**: Basic email verification
2. **Level 2 (IAL2)**: Government ID verification
3. **Level 3 (IAL3)**: In-person identity proofing

### Group Verification

Each affiliation group requires specific documentation:

- **Military**: DD-214, military ID, VA card
- **Student**: Student ID, enrollment letter
- **Teacher**: School email, teaching license
- **First Responder**: Department ID, certification

---

## Use Cases

### Military Community Chat

```typescript
// Require military verification for channel access
const militaryChannel = {
  name: 'Military Only',
  access: {
    requireVerification: true,
    allowedGroups: ['military'],
  },
}

// Check access in middleware
if (!user.groups?.some((g) => g.type === 'military' && g.verified)) {
  return res.status(403).json({ error: 'Military verification required' })
}
```

### Student Discount Access

```typescript
// Grant student role for discounts
if (user.groups?.some((g) => g.type === 'student' && g.verified)) {
  user.roles.push('student')
  user.discountEligible = true
}
```

### Teacher Resources

```typescript
// Teacher-only content
if (user.groups?.some((g) => g.type === 'teacher' && g.verified)) {
  user.roles.push('educator')
  user.accessLevel = 'premium'
}
```

---

## Testing

### Test Accounts

ID.me provides test accounts in sandbox mode:

```bash
# Sandbox credentials
Email: military+test@id.me
Password: (provided by ID.me)
Group: Military (verified)

Email: student+test@id.me
Password: (provided by ID.me)
Group: Student (verified)
```

### Integration Test

```typescript
describe('ID.me OAuth', () => {
  it('should redirect to ID.me authorization', async () => {
    const response = await fetch('/api/auth/oauth/authorize?provider=idme')
    const data = await response.json()

    expect(data.authUrl).toContain('id.me')
    expect(data.authUrl).toContain('client_id')
  })

  it('should handle callback with code', async () => {
    const response = await fetch(
      '/api/auth/oauth/callback?provider=idme&code=test-code&state=test-state'
    )

    expect([200, 302]).toContain(response.status)
  })
})
```

---

## Troubleshooting

### OAuth Redirect Mismatch

**Problem**: "redirect_uri mismatch" error

**Solutions:**

1. Verify redirect URI in ID.me dashboard matches exactly
2. Check protocol (must be HTTPS in production)
3. Ensure no trailing slashes

### Verification Required Error

**Problem**: User not verified for requested scope

**Solutions:**

1. Check if user completed verification
2. Request correct scope
3. Guide user through verification process

### Invalid Client Credentials

**Problem**: "invalid_client" error

**Solutions:**

1. Verify Client ID and Secret are correct
2. Check environment (sandbox vs production)
3. Ensure credentials are in correct `.env` file

---

## Security

### Best Practices

1. **HTTPS Only**: Always use HTTPS in production
2. **State Parameter**: Validate state to prevent CSRF
3. **Token Storage**: Store tokens securely (encrypted)
4. **Scope Limitation**: Request minimum required scopes
5. **Session Expiry**: Implement proper session management

### Token Security

```typescript
// Store tokens encrypted
import { encrypt, decrypt } from '@/lib/crypto'

const encryptedToken = encrypt(accessToken, process.env.ENCRYPTION_KEY)
await db.user.update({
  where: { id: user.id },
  data: { idmeToken: encryptedToken },
})

// Decrypt when needed
const accessToken = decrypt(user.idmeToken, process.env.ENCRYPTION_KEY)
```

---

## Monitoring

### Track Verification Events

```typescript
import { captureEvent } from '@/lib/analytics'

// Track verification success
captureEvent('idme_verification_success', {
  userId: user.id,
  groupType: 'military',
  verificationLevel: 'IAL2',
})

// Track verification failure
captureEvent('idme_verification_failed', {
  userId: user.id,
  error: error.message,
})
```

### Audit Logs

```typescript
await auditLog.create({
  event: 'idme_verification',
  userId: user.id,
  metadata: {
    groups: user.groups,
    verifiedAt: new Date(),
  },
})
```

---

## Changelog

### Version 1.0.0 (2026-02-03)

- Initial release
- OAuth 2.0 authentication
- Military, student, teacher verification
- Profile integration
- Group-based access control

---

## Support

- **ID.me Developer Portal**: https://developer.id.me
- **ID.me Support**: support@id.me
- **Documentation**: https://developer.id.me/documentation
- **nself Discord**: https://discord.gg/nself

---

## Related Documentation

- [Installation Guide](./INSTALLATION-GUIDE.md)
- [Integration Guide](./INTEGRATION-GUIDE.md)
- [Plugin System Overview](./README.md)
- [Auth Configuration](../configuration/Authentication.md)
