# Troubleshooting Guide - nself-chat v0.3.0

Comprehensive troubleshooting guide for common issues and their solutions.

---

## Table of Contents

- [Installation Issues](#installation-issues)
- [Authentication Problems](#authentication-problems)
- [2FA Issues](#2fa-issues)
- [PIN Lock Problems](#pin-lock-problems)
- [Search Not Working](#search-not-working)
- [Social Media Integration](#social-media-integration)
- [Bot API Issues](#bot-api-issues)
- [Message Problems](#message-problems)
- [Performance Issues](#performance-issues)
- [Database Issues](#database-issues)
- [Common Error Messages](#common-error-messages)

---

## Installation Issues

### Issue: `pnpm install` fails with version mismatch

**Error:**

```
ERR_PNPM_UNSUPPORTED_ENGINE Unsupported environment
```

**Solution:**

```bash
# Enable corepack
corepack enable

# Activate correct pnpm version
corepack prepare pnpm@9.15.4 --activate

# Try installation again
pnpm install
```

### Issue: Node version mismatch

**Error:**

```
The engine "node" is incompatible with this module
```

**Solution:**

```bash
# Check Node version
node --version  # Should be 20.x or higher

# Install correct version using nvm
nvm install 20
nvm use 20

# Or using n
n 20
```

### Issue: Backend services won't start

**Error:**

```
Failed to connect to PostgreSQL
```

**Solution:**

```bash
# Check if Docker is running
docker ps

# Restart nself backend
cd .backend
nself stop
nself start

# Check service status
nself status

# View logs
nself logs postgres
nself logs hasura
```

### Issue: Port already in use

**Error:**

```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution:**

```bash
# Find process using port 3000
lsof -i :3000

# Kill the process
kill -9 <PID>

# Or use a different port
PORT=3001 pnpm dev
```

---

## Authentication Problems

### Issue: Cannot login - "Invalid credentials"

**Symptoms:**

- Correct password not working
- Unable to login to any account

**Solutions:**

1. **Check if using dev mode:**

```bash
# In .env.local, ensure dev mode is enabled
NEXT_PUBLIC_USE_DEV_AUTH=true
```

2. **Verify backend is running:**

```bash
cd .backend
nself status

# Should show:
# ✓ PostgreSQL running
# ✓ Hasura running
# ✓ Auth running
```

3. **Reset dev auth state:**

```javascript
// In browser console
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### Issue: Session expires too quickly

**Symptoms:**

- Logged out frequently
- Session lost on browser refresh

**Solutions:**

1. **Check cookie settings:**

```javascript
// In .env.local
NEXT_PUBLIC_SESSION_LIFETIME=86400  # 24 hours in seconds
```

2. **Verify auth token storage:**

```javascript
// In browser console
console.log(localStorage.getItem('nhost'))
// Should show auth tokens
```

### Issue: OAuth providers not working

**Symptoms:**

- Google/GitHub login fails
- Redirect loop after OAuth consent

**Solutions:**

1. **Verify OAuth credentials:**

```bash
# In .env.local
NEXT_PUBLIC_NHOST_GOOGLE_CLIENT_ID=your_client_id
NEXT_PUBLIC_NHOST_GOOGLE_CLIENT_SECRET=your_secret
```

2. **Check redirect URLs:**

- Must match exactly in OAuth provider settings
- Format: `https://your-domain.com/api/auth/callback/google`

3. **Check Nhost Auth configuration:**

```bash
cd .backend
nself logs auth
# Look for OAuth-related errors
```

---

## 2FA Issues

### Issue: QR code not displaying

**Symptoms:**

- Blank space where QR code should appear
- "Failed to generate QR code" error

**Solutions:**

1. **Check if qrcode library is installed:**

```bash
pnpm list qrcode
# Should show: qrcode@1.5.4
```

2. **Verify API endpoint:**

```bash
# Test endpoint
curl http://localhost:3000/api/auth/2fa/setup \
  -H "Authorization: Bearer YOUR_TOKEN"
```

3. **Check browser console for errors:**

```javascript
// Common issue: CORS error
// Solution: Ensure API route is properly configured
```

### Issue: 2FA codes not working

**Symptoms:**

- Valid TOTP code shows as invalid
- "Invalid verification code" error

**Solutions:**

1. **Check system time synchronization:**

```bash
# TOTP depends on accurate time
# On macOS
sudo sntp -sS time.apple.com

# On Linux
sudo ntpdate pool.ntp.org
```

2. **Verify authenticator app time:**

- Open authenticator app settings
- Ensure "Time correction for codes" is enabled
- Sync time with internet

3. **Check code timing window:**

```javascript
// In API route, verify window setting
const isValid = speakeasy.totp.verify({
  secret: userSecret,
  encoding: 'base32',
  token: userCode,
  window: 2, // Allows ±1 time step (30 seconds)
})
```

### Issue: Lost access - no backup codes

**Symptoms:**

- 2FA device lost
- Backup codes not saved
- Cannot login

**Solutions:**

1. **Use emergency password reset:**

```bash
# Admin can disable 2FA for user in database
psql -U postgres -d nself_chat
UPDATE nchat_user_2fa_settings
SET enabled = false
WHERE user_id = 'USER_ID';
```

2. **Contact administrator:**

- Admin can reset 2FA in admin dashboard
- Navigate to Admin → Users → [User] → Security → Disable 2FA

### Issue: Backup codes not downloading

**Symptoms:**

- Click "Download" but nothing happens
- Codes displayed but can't save

**Solutions:**

1. **Manually copy codes:**

- Select and copy all codes
- Save in password manager

2. **Check browser popup blocker:**

- Allow popups for your domain
- Try in incognito mode

3. **Use print function:**

- Click "Print backup codes"
- Save as PDF

---

## PIN Lock Problems

### Issue: Forgotten PIN

**Symptoms:**

- Cannot remember PIN
- Account locked after attempts

**Solutions:**

1. **Use emergency unlock:**

- Click "Forgot PIN?"
- Enter account password
- Set new PIN

2. **Admin reset (if emergency unlock fails):**

```bash
psql -U postgres -d nself_chat
DELETE FROM nchat_user_pin_settings WHERE user_id = 'USER_ID';
```

### Issue: Biometric unlock not working

**Symptoms:**

- Touch ID/Face ID prompt doesn't appear
- "Biometric authentication failed" error

**Solutions:**

1. **Check browser support:**

```javascript
// In browser console
if (window.PublicKeyCredential) {
  console.log('WebAuthn supported')
} else {
  console.log('WebAuthn not supported - use Chrome/Safari/Edge')
}
```

2. **Verify HTTPS:**

- WebAuthn requires HTTPS (except localhost)
- Check URL starts with `https://`

3. **Re-register biometric:**

- Settings → Security → PIN Lock
- Disable biometric unlock
- Enable again to re-register

### Issue: Auto-lock not triggering

**Symptoms:**

- App stays unlocked longer than expected
- Auto-lock setting doesn't save

**Solutions:**

1. **Verify auto-lock timeout:**

```javascript
// In browser console
const settings = JSON.parse(localStorage.getItem('pin_settings'))
console.log('Auto-lock timeout:', settings.autoLockTimeout)
```

2. **Check browser visibility API:**

- Auto-lock uses Page Visibility API
- Test by switching tabs

3. **Clear and reset:**

```javascript
// In browser console
localStorage.removeItem('pin_settings')
// Re-configure PIN lock in settings
```

---

## Search Not Working

### Issue: MeiliSearch not returning results

**Symptoms:**

- Search returns no results for known content
- "Search service unavailable" error

**Solutions:**

1. **Check if MeiliSearch is running:**

```bash
# Test MeiliSearch endpoint
curl http://localhost:7700/health

# Should return: {"status":"available"}
```

2. **Verify search index exists:**

```bash
curl http://localhost:7700/indexes \
  -H "Authorization: Bearer YOUR_MASTER_KEY"

# Should show "messages" index
```

3. **Re-index all messages:**

```bash
# Run indexer script
pnpm run search:reindex

# Or manually via API
curl -X POST http://localhost:3000/api/search/initialize \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Issue: Search operators not working

**Symptoms:**

- `from:@user` doesn't filter
- `in:#channel` returns wrong results

**Solutions:**

1. **Check query parser:**

```javascript
// Test in browser console
const query = 'from:@john has:file test message'
console.log('Parsed:', parseSearchQuery(query))
```

2. **Verify filter syntax:**

```javascript
// Correct
from:@john          ✓
in:#general         ✓
has:file            ✓
before:2026-01-30   ✓

// Incorrect
from: @john         ✗ (space after colon)
in: general         ✗ (missing #)
has: files          ✗ (wrong keyword)
```

### Issue: Search is slow

**Symptoms:**

- Search takes > 5 seconds
- Browser becomes unresponsive during search

**Solutions:**

1. **Check MeiliSearch performance:**

```bash
# View MeiliSearch stats
curl http://localhost:7700/stats \
  -H "Authorization: Bearer YOUR_MASTER_KEY"
```

2. **Optimize index settings:**

```javascript
// Reduce searchable attributes if too many
const indexSettings = {
  searchableAttributes: ['content', 'user.display_name', 'channel.name'],
  filterableAttributes: ['channel_id', 'user_id', 'created_at', 'type'],
}
```

3. **Use pagination:**

```javascript
// Don't load all results at once
const results = await search(query, {
  limit: 20, // Show 20 per page
  offset: page * 20,
})
```

---

## Social Media Integration

### Issue: Twitter/X OAuth fails

**Symptoms:**

- Redirect to Twitter fails
- "OAuth token invalid" error

**Solutions:**

1. **Verify OAuth credentials:**

```bash
# In .env.local
TWITTER_CLIENT_ID=your_client_id
TWITTER_CLIENT_SECRET=your_client_secret
TWITTER_BEARER_TOKEN=your_bearer_token
```

2. **Check OAuth settings in Twitter Developer Portal:**

- App permissions: Read and write
- Callback URL: `https://your-domain.com/api/social/twitter/callback`
- OAuth 2.0 enabled

3. **Test OAuth flow:**

```bash
# Test auth endpoint
curl http://localhost:3000/api/social/twitter/auth

# Should redirect to Twitter OAuth page
```

### Issue: Instagram posts not importing

**Symptoms:**

- Connected account but no posts appear
- "Failed to fetch posts" error

**Solutions:**

1. **Check Instagram Graph API credentials:**

```bash
# Verify in .env.local
INSTAGRAM_APP_ID=your_app_id
INSTAGRAM_APP_SECRET=your_app_secret
```

2. **Verify Instagram Business Account:**

- Instagram account must be Business or Creator
- Must be linked to Facebook Page
- Check Meta Business Suite settings

3. **Check API permissions:**

- Required: `instagram_basic`, `instagram_content_publish`
- Review in Meta App Dashboard

4. **Test manual import:**

```bash
# Trigger manual import
curl -X POST http://localhost:3000/api/social/instagram/import \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"account_id": "YOUR_ACCOUNT_ID"}'
```

### Issue: LinkedIn rate limiting

**Symptoms:**

- "Rate limit exceeded" error
- Posts stop importing

**Solutions:**

1. **Check rate limit headers:**

```javascript
// In API response headers
X-RateLimit-Limit: 500
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1706659200
```

2. **Implement exponential backoff:**

```javascript
// Wait until rate limit resets
const resetTime = response.headers.get('X-RateLimit-Reset')
const waitTime = resetTime * 1000 - Date.now()
await new Promise((resolve) => setTimeout(resolve, waitTime))
```

3. **Reduce polling frequency:**

```bash
# In configuration, increase interval
SOCIAL_MEDIA_POLL_INTERVAL=600000  # 10 minutes instead of 5
```

---

## Bot API Issues

### Issue: Bot token invalid

**Symptoms:**

- 401 Unauthorized error
- "Invalid bot token" message

**Solutions:**

1. **Verify token format:**

```javascript
// Correct format: nbot_<64 hex characters>
const token = 'nbot_1234567890abcdef...'
console.log('Token length:', token.length) // Should be 69

// Check token exists in database
```

2. **Check token expiration:**

```bash
psql -U postgres -d nself_chat
SELECT * FROM nchat_bot_tokens WHERE token_hash = 'HASH_OF_TOKEN';
-- Check expires_at column
```

3. **Generate new token:**

- Admin → Bots → [Your Bot] → Generate New Token
- Update your application with new token

### Issue: Missing permission error

**Symptoms:**

- 403 Forbidden
- "Bot lacks permission: messages.send"

**Solutions:**

1. **Check bot permissions:**

```bash
# View bot permissions
curl -X GET http://localhost:3000/api/bots/permissions \
  -H "Authorization: Bearer YOUR_BOT_TOKEN"
```

2. **Grant permission:**

- Admin → Bots → [Your Bot] → Permissions
- Enable required permission
- Save changes

### Issue: Webhook not receiving events

**Symptoms:**

- Webhook configured but no requests received
- Events not triggering webhook

**Solutions:**

1. **Verify webhook URL is accessible:**

```bash
# Test from server
curl -X POST https://your-webhook-url.com/webhook \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

2. **Check webhook logs:**

```bash
# View webhook delivery logs
psql -U postgres -d nself_chat
SELECT * FROM nchat_bot_webhook_logs
WHERE webhook_id = 'YOUR_WEBHOOK_ID'
ORDER BY created_at DESC
LIMIT 10;
```

3. **Verify signature:**

```javascript
// In your webhook handler
const crypto = require('crypto')

function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex')

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}
```

---

## Message Problems

### Issue: Messages not appearing

**Symptoms:**

- Message sent but doesn't show in channel
- Other users can't see message

**Solutions:**

1. **Check WebSocket connection:**

```javascript
// In browser console
console.log('WS State:', window._wsConnection?.readyState)
// 0 = CONNECTING, 1 = OPEN, 2 = CLOSING, 3 = CLOSED
```

2. **Verify message in database:**

```bash
psql -U postgres -d nself_chat
SELECT * FROM nchat_messages
WHERE id = 'MESSAGE_ID';
```

3. **Check GraphQL subscriptions:**

```javascript
// Re-establish subscription
const subscription = useSubscription(MESSAGE_SUBSCRIPTION, {
  variables: { channelId },
})
```

### Issue: Message edit history not showing

**Symptoms:**

- "(edited)" appears but no history
- Can't view previous versions

**Solutions:**

1. **Verify edit history exists:**

```bash
psql -U postgres -d nself_chat
SELECT * FROM nchat_edit_history
WHERE message_id = 'MESSAGE_ID';
```

2. **Check permissions:**

- Only message author and moderators can view edit history
- Verify user role in database

### Issue: Read receipts not updating

**Symptoms:**

- Messages marked unread when they've been read
- Read receipt checkmarks not appearing

**Solutions:**

1. **Check if feature is enabled:**

```javascript
// In app config
const config = useAppConfig()
console.log('Read receipts:', config.features.readReceipts)
```

2. **Verify read receipt tracking:**

```bash
psql -U postgres -d nself_chat
SELECT * FROM nchat_read_receipts
WHERE message_id = 'MESSAGE_ID'
AND user_id = 'USER_ID';
```

3. **Clear and re-track:**

```javascript
// Mark all channel messages as read
await markChannelAsRead(channelId)
```

---

## Performance Issues

### Issue: App is slow/laggy

**Symptoms:**

- UI freezes during typing
- Slow message loading
- High memory usage

**Solutions:**

1. **Enable virtual scrolling:**

```javascript
// In message list component
<VirtualizedMessageList messages={messages} overscan={10} itemSize={80} />
```

2. **Reduce message batch size:**

```javascript
// Load fewer messages initially
const MESSAGES_PER_PAGE = 20 // Instead of 50
```

3. **Check for memory leaks:**

```javascript
// In browser dev tools
// Performance → Memory → Take heap snapshot
// Look for detached DOM nodes
```

4. **Clear local storage:**

```javascript
// In browser console
localStorage.clear()
sessionStorage.clear()
location.reload()
```

### Issue: Image loading is slow

**Symptoms:**

- Images take long to load
- Page stutters when scrolling past images

**Solutions:**

1. **Enable lazy loading:**

```jsx
<img
  src={imageUrl}
  loading="lazy" // Native lazy loading
  alt="..."
/>
```

2. **Use Next.js Image component:**

```jsx
import Image from 'next/image'
;<Image src={imageUrl} width={800} height={600} quality={75} placeholder="blur" />
```

3. **Optimize images:**

```bash
# Use WebP format
# Compress images before upload
# Maximum recommended: 1920x1080, < 2MB
```

---

## Database Issues

### Issue: Database migrations failed

**Symptoms:**

- "Migration failed" error during setup
- Database tables missing

**Solutions:**

1. **Check migration status:**

```bash
cd .backend
nself db migrate status
```

2. **Rollback and retry:**

```bash
# Rollback last migration
nself db migrate down 1

# Re-run migrations
nself db migrate up
```

3. **Manual migration:**

```bash
# Connect to database
psql -U postgres -d nself_chat

# Check which tables exist
\dt nchat_*

# Apply missing migrations manually from .backend/migrations/
```

### Issue: Connection pool exhausted

**Symptoms:**

- "Too many clients" error
- Database queries timeout

**Solutions:**

1. **Increase connection pool:**

```bash
# In .backend/.env
POSTGRES_MAX_CONNECTIONS=100
HASURA_POOL_SIZE=20
```

2. **Close idle connections:**

```bash
psql -U postgres -d nself_chat
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE state = 'idle'
AND state_change < NOW() - INTERVAL '10 minutes';
```

3. **Restart services:**

```bash
cd .backend
nself restart postgres
nself restart hasura
```

---

## Common Error Messages

### "Network request failed"

**Cause:** Cannot reach backend API

**Solutions:**

1. Check backend is running: `nself status`
2. Verify API URL in `.env.local`
3. Check firewall/network settings

### "GraphQL error: JWTExpired"

**Cause:** Authentication token expired

**Solutions:**

1. Refresh page to get new token
2. Check token expiration settings
3. Re-login if needed

### "ECONNREFUSED"

**Cause:** Service not running or wrong port

**Solutions:**

1. Check if service is running
2. Verify port in configuration
3. Check for port conflicts

### "Module not found"

**Cause:** Missing dependency

**Solutions:**

```bash
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### "Hydration mismatch"

**Cause:** Server/client render mismatch

**Solutions:**

1. Clear browser cache
2. Check for browser extensions interfering
3. Disable SSR for problematic component

---

## Getting Help

### Check Logs

```bash
# Frontend logs
# Check browser console (F12)

# Backend logs
cd .backend
nself logs hasura
nself logs auth
nself logs postgres

# Application logs
pnpm dev  # Check terminal output
```

### Debug Mode

```bash
# Enable debug mode
DEBUG=* pnpm dev

# Or specific namespace
DEBUG=nself:* pnpm dev
```

### Report Issues

1. **GitHub Issues:** https://github.com/nself-org/nchat/issues
2. **Include:**
   - nself-chat version
   - Operating system
   - Browser version
   - Steps to reproduce
   - Error messages/logs
   - Screenshots if applicable

---

## Related Documentation

- [FAQ](FAQ.md)
- [Operations Runbook](RUNBOOK.md)
- [Installation Guide](../INSTALL.md)
- [Configuration Guide](../configuration/Configuration.md)

---

**Last Updated:** January 30, 2026 • **Version:** 0.3.0

**Still having issues?** Open an issue on [GitHub](https://github.com/nself-org/nchat/issues) or ask in [Discussions](https://github.com/nself-org/nchat/discussions).
