/**
 * Purpose:    Static content data for the Bot API docs page (/api-docs/bots). Holds the
 *             permissions list, endpoint definitions, webhook events, retry schedule, and code
 *             samples — extracted from the legacy api-docs/bots/page.tsx so the page file stays
 *             under the 300-line cap (canonical §1).
 * Inputs:     none — pure constant data.
 * Outputs:    Typed constants consumed by ApiDocsBotsPage.
 * Constraints:Data only (no JSX components beyond plain strings). SOT below.
 * SOT:        F-NCHAT-VITE-DEVTOOLS-BOTAPI-01
 */

export const BOT_PERMISSIONS: ReadonlyArray<{ name: string; desc: string }> = [
  { name: 'messages.send', desc: 'Send messages to channels' },
  { name: 'messages.read', desc: 'Read message history' },
  { name: 'channels.create', desc: 'Create new channels' },
  { name: 'channels.read', desc: 'Read channel information' },
  { name: 'reactions.add', desc: 'Add reactions to messages' },
  { name: 'users.read', desc: 'Read user information' },
]

export interface BotEndpoint {
  title: string
  description: string
  scope: string
  request?: { heading: string; code: string }
  response?: { heading: string; code: string }
  query?: string
}

export const BOT_ENDPOINTS: ReadonlyArray<BotEndpoint> = [
  {
    title: 'POST /api/bots/send-message',
    description: 'Send a message to a channel',
    scope: 'messages.send',
    request: {
      heading: 'Request Body',
      code: `{
  "channelId": "uuid",
  "content": "Hello from bot!",
  "attachments": [
    {
      "url": "https://example.com/file.pdf",
      "type": "application/pdf",
      "name": "document.pdf",
      "size": 1024
    }
  ]
}`,
    },
    response: {
      heading: 'Response',
      code: `{
  "success": true,
  "message": {
    "id": "uuid",
    "content": "Hello from bot!",
    "channelId": "uuid",
    "createdAt": "2026-01-30T12:00:00Z",
    "user": {
      "id": "uuid",
      "displayName": "My Bot",
      "avatarUrl": "https://..."
    }
  }
}`,
    },
  },
  {
    title: 'POST /api/bots/create-channel',
    description: 'Create a new channel',
    scope: 'channels.create',
    request: {
      heading: 'Request Body',
      code: `{
  "name": "bot-announcements",
  "description": "Updates from our bot",
  "isPrivate": false
}`,
    },
    response: {
      heading: 'Response',
      code: `{
  "success": true,
  "channel": {
    "id": "uuid",
    "name": "bot-announcements",
    "description": "Updates from our bot",
    "isPrivate": false,
    "createdAt": "2026-01-30T12:00:00Z"
  }
}`,
    },
  },
  {
    title: 'GET /api/bots/channel-info',
    description: 'Get channel information',
    scope: 'channels.read',
    query: '?channelId=uuid',
    response: {
      heading: 'Response',
      code: `{
  "success": true,
  "channel": {
    "id": "uuid",
    "name": "general",
    "description": "General discussion",
    "isPrivate": false,
    "stats": {
      "messageCount": 1234,
      "memberCount": 56
    }
  }
}`,
    },
  },
  {
    title: 'POST /api/bots/add-reaction',
    description: 'Add a reaction to a message',
    scope: 'reactions.add',
    request: {
      heading: 'Request Body',
      code: `{
  "messageId": "uuid",
  "emoji": "👍"
}`,
    },
  },
  {
    title: 'GET /api/bots/user-info',
    description: 'Get user information',
    scope: 'users.read',
    query: '?userId=uuid',
  },
]

export const WEBHOOK_EVENTS = [
  'message.created',
  'message.deleted',
  'channel.created',
  'user.joined',
  'reaction.added',
]

export const WEBHOOK_RETRIES = [
  'Attempt 1: Immediate',
  'Attempt 2: 2 seconds later',
  'Attempt 3: 4 seconds later',
  'Attempt 4: 8 seconds later',
  'Attempt 5: 16 seconds later',
]

export const WEBHOOK_PAYLOAD = `{
  "event": "message.created",
  "timestamp": "2026-01-30T12:00:00Z",
  "data": {
    "messageId": "uuid",
    "channelId": "uuid",
    "authorId": "uuid",
    "content": "Hello world",
    "createdAt": "2026-01-30T12:00:00Z"
  }
}`

export const WEBHOOK_VERIFY = `const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from('sha256=' + expectedSignature)
  );
}`

export const EXAMPLE_CURL = `# Send a message
curl -X POST https://your-domain.com/api/bots/send-message \\
  -H "Authorization: Bearer nbot_abc123..." \\
  -H "Content-Type: application/json" \\
  -d '{
    "channelId": "uuid",
    "content": "Hello from bot!"
  }'`

export const EXAMPLE_JS = `const BOT_TOKEN = 'nbot_abc123...';
const API_BASE = 'https://your-domain.com/api/bots';

async function sendMessage(channelId, content) {
  const response = await fetch(\`\${API_BASE}/send-message\`, {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${BOT_TOKEN}\`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ channelId, content }),
  });

  return response.json();
}

// Usage
await sendMessage('channel-uuid', 'Hello from bot!');`

export const EXAMPLE_PYTHON = `import requests

BOT_TOKEN = 'nbot_abc123...'
API_BASE = 'https://your-domain.com/api/bots'

def send_message(channel_id, content):
    response = requests.post(
        f'{API_BASE}/send-message',
        headers={
            'Authorization': f'Bearer {BOT_TOKEN}',
            'Content-Type': 'application/json',
        },
        json={
            'channelId': channel_id,
            'content': content,
        }
    )
    return response.json()

# Usage
send_message('channel-uuid', 'Hello from bot!')`
