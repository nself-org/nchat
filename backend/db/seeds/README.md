# Database Seed Data

This directory contains SQL seed files for populating the database with demo data for local development and staging environments.

## ⚠️ Important

**NEVER run these seeds in production!** These are for development and staging only.

## Seed Files

| File | Purpose | When to Run |
|------|---------|-------------|
| `01_users_and_roles.sql` | Demo users with various roles | After users sign up |

## Demo Users

### User Accounts (Role Hierarchy)

Roles are listed in **descending order of access** (top = most access):

| # | Email | Password | Role | Access Level |
|---|-------|----------|------|--------------|
| 1 | owner@nself.org | `password` | **Owner** | Top level - Cannot be removed, hardcoded all access |
| 2 | admin@nself.org | `password` | **Admin** | High-level administration (below owner) |
| 3 | mod@nself.org | `password` | **Moderator** | Content moderation |
| 4 | support@nself.org | `password` | **Support** | User support with limited admin |
| 5 | helper@nself.org | `password` | **Helper** | Community helper with limited mod |
| 6 | user@nself.org | `password` | *(no role)* | Regular user - No special permissions |

### Permission Breakdown

**1. Owner** (Highest Authority)
- ✅ Full access to EVERYTHING (cannot be restricted)
- ✅ Cannot be removed by anyone
- ✅ Hardcoded system-level access
- ✅ Manage billing and subscriptions
- ✅ Configure app settings
- ✅ Assign/revoke any role
- ✅ Delete any content
- ✅ Ban/unban users

**2. Admin** (High-Level Administration)
- ✅ Manage users (create, edit, disable)
- ✅ Create and delete channels
- ✅ Delete any messages
- ✅ Ban users
- ✅ View analytics
- ✅ Manage integrations
- ❌ Cannot access billing settings
- ❌ Cannot remove owner

**3. Moderator** (Content Moderation)
- ✅ Delete messages
- ✅ Pin messages
- ✅ Warn users
- ✅ Timeout users (temporary ban)
- ✅ Manage channel settings
- ❌ Cannot delete channels
- ❌ Cannot permanently ban users
- ❌ Cannot manage users

**4. Support** (User Support)
- ✅ View all channels
- ✅ Send messages anywhere
- ✅ Pin messages
- ✅ Warn users (soft moderation)
- ✅ Send DMs to help users
- ❌ Cannot delete messages
- ❌ Cannot timeout/ban users
- ❌ Cannot manage channels

**5. Helper** (Community Helper)
- ✅ Send messages
- ✅ Pin messages (highlight important info)
- ✅ Join any public channel
- ✅ Upload files
- ✅ React to messages
- ✅ Edit/delete own messages
- ❌ Cannot moderate other users
- ❌ Cannot delete others' messages
- ❌ Cannot warn/timeout users

**6. User** (Regular Account - No Special Role)
- ✅ Send messages
- ✅ Join public channels
- ✅ Upload files
- ✅ React to messages
- ✅ Edit/delete own messages
- ❌ No moderation capabilities
- ❌ No admin capabilities

## Setup Instructions

### 1. Create User Accounts

Users must first sign up through the application or via Nhost Auth API:

**Option A: Via UI (Recommended)**
1. Start the backend: `cd backend && nself start`
2. Start the frontend: `cd frontend && pnpm dev`
3. Visit http://localhost:3000
4. Sign up for each user account:
   - Email: owner@nself.org, Password: password
   - Email: admin@nself.org, Password: password
   - Email: mod@nself.org, Password: password
   - Email: support@nself.org, Password: password
   - Email: helper@nself.org, Password: password
   - Email: user@nself.org, Password: password

**Option B: Via Script (Automated)**
```bash
cd backend
./scripts/create-demo-users.sh
```

### 2. Run Seed File

After users are created, assign roles:

```bash
cd backend
nself exec postgres psql -U postgres -d nchat < db/seeds/01_users_and_roles.sql
```

Or use the seed script:

```bash
cd backend
./scripts/seed.sh
```

### 3. Verify Seed Data

```bash
cd backend
nself exec postgres psql -U postgres -d nchat
```

Then run:
```sql
SELECT
    u.email,
    aur.role,
    aur.app_id
FROM auth.users u
LEFT JOIN public.app_user_roles aur ON u.id = aur.user_id
WHERE u.email LIKE '%@nself.org'
ORDER BY u.email;
```

## Showcase Features

These demo users demonstrate:

### 1. **Multi-Role Access Control**
- Different users have different permissions
- Owner can do everything
- Moderator has limited but powerful abilities
- Regular user has basic access

### 2. **Real-Time Features**
- Login as multiple users in different browsers
- See typing indicators when others are typing
- Watch messages appear in real-time
- See presence status (online/offline)

### 3. **Authentication Variety**
- Email/password authentication (all demo users)
- OAuth ready (11 providers configured)
- Magic links (passwordless login)
- Two-factor authentication (can be enabled)

### 4. **Monorepo SSO**
When deployed in a monorepo with multiple apps:
- Users log in once across all apps
- Same account, different roles per app
- Example: Owner in ɳChat, Member in Example App

### 5. **GraphQL Subscriptions**
- Real-time message delivery
- Typing indicators
- Presence updates
- Notification delivery

## Environment-Specific Setup

### Local Development
```
Domain: chat.local.nself.org
Also available: http://localhost:3000
Purpose: Local development and testing
```

### Staging
```
Domain: chat.staging.nself.org
Purpose: Demo for clients and team
Note: Should have HTTP basic auth enabled
```

### Production
```
Domain: chat.nself.org (Vercel)
Purpose: Public demo
Note: Do NOT seed these users in production
```

## Testing Scenarios

### Scenario 1: Role-Based Permissions
1. Login as `user@nself.org` → Try to delete another user's message → ❌ Denied
2. Login as `mod@nself.org` → Try to delete any message → ✅ Success
3. Login as `admin@nself.org` → Try to delete a channel → ✅ Success
4. Login as `owner@nself.org` → Try to access billing → ✅ Success

### Scenario 2: Real-Time Features
1. Login as `user@nself.org` in Browser 1
2. Login as `helper@nself.org` in Browser 2
3. Start typing in Browser 1 → See typing indicator in Browser 2
4. Send message in Browser 1 → See it appear instantly in Browser 2

### Scenario 3: SSO Across Apps (Monorepo Only)
1. Login to ɳChat as `admin@nself.org`
2. Visit Example App → Already logged in (SSO)
3. Check role in Example App → Might be different (per-app RBAC)

## Resetting Seed Data

To completely reset and re-seed:

```bash
cd backend

# Stop services
nself stop

# Reset database (WARNING: Deletes all data)
nself exec postgres psql -U postgres -d nchat -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Run migrations
nself db migrate up

# Recreate users via UI or script
./scripts/create-demo-users.sh

# Run seeds
./scripts/seed.sh
```

## Troubleshooting

### Users Not Found
**Problem**: Seed script reports "User not found"
**Solution**: Users must be created first via signup. Run Option A or B above.

### Roles Not Assigned
**Problem**: Users can login but have no permissions
**Solution**: Re-run the seed file after confirming users exist in auth.users

### Duplicate Key Errors
**Problem**: Seed fails with "duplicate key violation"
**Solution**: Roles already assigned. This is safe to ignore.

## Security Notes

### For Development (chat.local.nself.org)
- ✅ Use these demo credentials freely
- ✅ Share with dev team
- ✅ Reset anytime

### For Staging (chat.staging.nself.org)
- ⚠️ Enable HTTP basic auth on nginx
- ⚠️ Share staging access password with team only
- ⚠️ Do NOT expose publicly without protection

### For Production (chat.nself.org)
- ❌ Do NOT seed these users
- ❌ Do NOT use "password" as password
- ❌ Do NOT use demo@nself.org accounts
- ✅ Create real admin accounts with strong passwords
- ✅ Enable 2FA for all admin accounts

## Support

Having issues with seeding?
1. Check that backend is running: `nself status`
2. Verify users exist: `nself exec postgres psql -U postgres -d nchat -c "SELECT email FROM auth.users;"`
3. Check logs: `nself logs postgres`
4. See troubleshooting guide: [../SETUP.md](../SETUP.md)
