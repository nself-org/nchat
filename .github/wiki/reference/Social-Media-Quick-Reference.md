# Social Media Integration - Quick Reference

Fast reference guide for developers working with social media integration.

## Quick Start

```bash
# Setup
./scripts/setup-social-media.sh

# Add credentials to .env.local
TWITTER_CLIENT_ID=xxx
TWITTER_CLIENT_SECRET=xxx
INSTAGRAM_APP_ID=xxx
INSTAGRAM_APP_SECRET=xxx
LINKEDIN_CLIENT_ID=xxx
LINKEDIN_CLIENT_SECRET=xxx
SOCIAL_MEDIA_ENCRYPTION_KEY=xxx

# Start server
pnpm dev

# Navigate to admin
http://localhost:3000/admin/social
```

## File Locations

| What        | Where                                                  |
| ----------- | ------------------------------------------------------ |
| Migration   | `.backend/migrations/012_social_media_integration.sql` |
| API Clients | `src/lib/social/*-client.ts`                           |
| API Routes  | `src/app/api/social/**`                                |
| React Hooks | `src/hooks/use-social-*.ts`                            |
| Components  | `src/components/admin/Social*.tsx`                     |
| GraphQL     | `src/graphql/social-media.ts`                          |
| Docs        | `docs/Social-Media-Integration.md`                     |

## Common Tasks

### Connect New Account

```typescript
// Frontend
import { useSocialAccounts } from '@/hooks/use-social-accounts'

const { connectAccount } = useSocialAccounts()
connectAccount('twitter') // Redirects to OAuth
```

### Create Integration

```typescript
import { useSocialIntegrations } from '@/hooks/use-social-integrations'
import { useAuth } from '@/contexts/auth-context'

const { createIntegration } = useSocialIntegrations()
const { user } = useAuth()

await createIntegration({
  accountId: 'uuid',
  channelId: 'uuid',
  autoPost: true,
  filterHashtags: ['news', 'updates'],
  filterKeywords: ['launch'],
  minEngagement: 10,
  createdBy: user.id,
})
```

### Trigger Import

```typescript
// From component
const { triggerImport } = useSocialAccounts()
const result = await triggerImport(accountId)

// From API
fetch('/api/social/poll', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ accountId: 'optional' }),
})
```

### Manual Poll (Server-side)

```typescript
import { pollAllAccounts } from '@/lib/social/poller'
import { ApolloClient } from '@apollo/client'

const result = await pollAllAccounts(apolloClient)
console.log(result)
// { fetched: 10, imported: 8, filtered: 2, posted: 5, errors: [] }
```

## Database Queries

```sql
-- List all accounts
SELECT * FROM nchat_social_accounts;

-- List integrations with channel names
SELECT
  i.*,
  c.name as channel_name,
  a.account_name
FROM nchat_social_integrations i
JOIN nchat_channels c ON i.channel_id = c.id
JOIN nchat_social_accounts a ON i.account_id = a.id;

-- Recent imports
SELECT * FROM nchat_social_posts
ORDER BY imported_at DESC
LIMIT 10;

-- Import logs
SELECT * FROM nchat_social_import_logs
ORDER BY started_at DESC
LIMIT 10;

-- Posts not yet posted to channels
SELECT * FROM nchat_social_posts
WHERE was_posted_to_channel = false;
```

## API Endpoints

```bash
# OAuth flows
GET  /api/social/{platform}/auth
GET  /api/social/{platform}/callback

# Account management
GET    /api/social/accounts
POST   /api/social/accounts
DELETE /api/social/accounts?id={uuid}

# Polling
POST /api/social/poll                    # Poll all accounts
POST /api/social/poll {"accountId":"..."} # Poll specific account
GET  /api/social/poll                    # Health check
```

## Environment Variables

```bash
# Required
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
INSTAGRAM_APP_ID=
INSTAGRAM_APP_SECRET=
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=
SOCIAL_MEDIA_ENCRYPTION_KEY=
NEXT_PUBLIC_APP_URL=
HASURA_ADMIN_SECRET=

# Optional
TWITTER_BEARER_TOKEN=
```

## Cron Job Setup

### Local (crontab)

```bash
# Edit crontab
crontab -e

# Add (polls every 5 minutes)
*/5 * * * * curl -X POST http://localhost:3000/api/social/poll
```

### Vercel (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/social/poll",
      "schedule": "*/5 * * * *"
    }
  ]
}
```

### AWS Lambda (serverless.yml)

```yaml
functions:
  socialPoll:
    handler: handler.poll
    events:
      - schedule: rate(5 minutes)
```

## TypeScript Interfaces

```typescript
import type {
  SocialAccount,
  SocialPost,
  SocialIntegration,
  SocialPlatform,
} from '@/lib/social/types'

const platform: SocialPlatform = 'twitter' | 'instagram' | 'linkedin'
```

## Filter Logic

```typescript
import { matchesFilters } from '@/lib/social/filters'

const matches = matchesFilters(post, integration)
// Returns true if post passes all filters

// Filter criteria:
// - Hashtags: OR logic (any match)
// - Keywords: OR logic (any match)
// - Min engagement: threshold
// - Exclude retweets: boolean
// - Exclude replies: boolean
```

## Rich Embed Creation

```typescript
import { createSocialEmbed, formatAsMessageContent } from '@/lib/social/embed-formatter'

const embed = createSocialEmbed(post, 'twitter')
const messageContent = formatAsMessageContent(embed)

// Post to channel
await client.mutate({
  mutation: POST_TO_CHANNEL,
  variables: {
    message: {
      channel_id: channelId,
      content: JSON.stringify(messageContent),
      type: 'social_embed',
    },
  },
})
```

## Token Encryption

```typescript
import { encryptToken, decryptToken } from '@/lib/social/encryption'

// Encrypt before storage
const encrypted = encryptToken(accessToken)

// Decrypt for API calls
const accessToken = decryptToken(encrypted)
```

## Platform Specifics

### Twitter

- **API Version**: v2
- **Cost**: $100/month (Essential)
- **Rate Limit**: 300 req/15min
- **Token Life**: 2 hours (refresh available)
- **OAuth**: PKCE flow

```typescript
import { TwitterClient } from '@/lib/social/twitter-client'
const client = new TwitterClient()
```

### Instagram

- **API**: Graph API
- **Cost**: Free
- **Rate Limit**: 200 req/hour
- **Token Life**: 60 days (long-lived)
- **Requirements**: Business Account + Facebook Page

```typescript
import { InstagramClient } from '@/lib/social/instagram-client'
const client = new InstagramClient()
```

### LinkedIn

- **API Version**: v2
- **Cost**: Free
- **Rate Limit**: Varies
- **Token Life**: 60 days (no refresh)
- **Requirements**: Marketing Developer Platform access

```typescript
import { LinkedInClient } from '@/lib/social/linkedin-client'
const client = new LinkedInClient()
```

## Debugging

### Check Import Logs

```sql
SELECT
  a.account_name,
  l.import_type,
  l.posts_fetched,
  l.posts_imported,
  l.posts_filtered,
  l.posts_posted,
  l.errors,
  l.status,
  l.started_at,
  l.completed_at
FROM nchat_social_import_logs l
JOIN nchat_social_accounts a ON l.account_id = a.id
ORDER BY l.started_at DESC
LIMIT 10;
```

### Test OAuth Flow

1. Add `console.log` in callback route
2. Check state parameter matches
3. Verify code is received
4. Test token exchange
5. Check encryption/decryption

### Test Filtering

```typescript
import { matchesFilters } from '@/lib/social/filters'

const testPost = {
  content: 'Check out our new #product launch!',
  hashtags: ['product'],
  engagement: { likes: 50 },
}

const testIntegration = {
  filter_hashtags: ['product'],
  min_engagement: 10,
}

console.log(matchesFilters(testPost, testIntegration)) // true
```

## Common Issues

| Issue                          | Solution                                                |
| ------------------------------ | ------------------------------------------------------- |
| OAuth redirect error           | Check `NEXT_PUBLIC_APP_URL` matches registered callback |
| No posts imported              | Check filters, verify account has recent posts          |
| Token expired                  | Implement refresh logic or re-authenticate              |
| Rate limit hit                 | Reduce polling frequency or implement backoff           |
| Posts not appearing in channel | Check integration `auto_post` is true                   |

## Performance Tips

1. **Poll Less Frequently**: Change from 5min to 10min for lower load
2. **Limit Posts per Poll**: Use `limit` parameter in API calls
3. **Cache Account Data**: Store in memory for duration of poll
4. **Batch Database Inserts**: Use `insert_many` instead of individual inserts
5. **Index Hashtags**: Already done in migration

## Security Checklist

- [x] Tokens encrypted at rest
- [x] OAuth state validation
- [x] Secure cookies (httpOnly, sameSite)
- [x] RLS policies active
- [x] Admin-only access
- [x] Input validation
- [x] SQL injection prevention
- [x] No secrets in client code

## Testing Commands

```bash
# Test OAuth (Twitter)
curl http://localhost:3000/api/social/twitter/auth

# Test manual import
curl -X POST http://localhost:3000/api/social/poll \
  -H "Content-Type: application/json" \
  -d '{"accountId":"uuid-here"}'

# Test health check
curl http://localhost:3000/api/social/poll

# Test account creation (server-side only)
curl -X POST http://localhost:3000/api/social/accounts \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "twitter",
    "account_id": "123",
    "account_name": "Test",
    "access_token_encrypted": "..."
  }'
```

## Resources

- [Full Documentation](../features/Social-Media-Integration.md)
- [Implementation Summary](../SOCIAL-MEDIA-IMPLEMENTATION-SUMMARY.md)
- [Twitter API Docs](https://developer.twitter.com/en/docs/twitter-api)
- [Instagram API Docs](https://developers.facebook.com/docs/instagram-api)
- [LinkedIn API Docs](https://learn.microsoft.com/en-us/linkedin/)

---

**Last Updated**: January 30, 2026
