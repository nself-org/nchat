# AI-Powered Features

nself-chat includes powerful AI features for message summarization and smart search. These features gracefully degrade when AI API keys are not provided, ensuring the app remains functional in all configurations.

## Table of Contents

1. [Overview](#overview)
2. [Configuration](#configuration)
3. [Message Summarization](#message-summarization)
4. [Smart Search](#smart-search)
5. [API Routes](#api-routes)
6. [Usage Examples](#usage-examples)
7. [Graceful Degradation](#graceful-degradation)
8. [Performance Considerations](#performance-considerations)

---

## Overview

### Features

- **Message Summarization**
  - Channel digests
  - Thread summaries
  - Catch-up summaries for missed messages
  - Key points extraction
  - Topic detection
  - Decision tracking

- **Smart Search**
  - Semantic search with embeddings
  - Natural language queries
  - Context-aware results
  - Advanced filtering
  - Multiple ranking strategies

### Supported AI Providers

| Provider      | Summarization       | Semantic Search           | Configuration           |
| ------------- | ------------------- | ------------------------- | ----------------------- |
| **OpenAI**    | ✅ GPT-4o-mini      | ✅ text-embedding-3-small | API key required        |
| **Anthropic** | ✅ Claude 3.5 Haiku | ⚠️ Fallback to local      | API key required        |
| **Local**     | ⚠️ Basic summary    | ⚠️ Keyword search         | No configuration needed |

> **Note**: Anthropic doesn't currently provide a dedicated embeddings API, so semantic search falls back to local embeddings when using Anthropic for summarization.

---

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# OpenAI Configuration (Recommended)
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_OPENAI_API_KEY=sk-...  # For client-side features

# Anthropic Configuration (Alternative)
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...  # For client-side features

# Optional: Custom endpoints
# OPENAI_ENDPOINT=https://api.openai.com/v1
# ANTHROPIC_ENDPOINT=https://api.anthropic.com/v1
```

### Provider Selection

The system automatically selects the best available provider:

1. **OpenAI** - If `OPENAI_API_KEY` is set (best for semantic search)
2. **Anthropic** - If `ANTHROPIC_API_KEY` is set
3. **Local** - Fallback if no API keys are configured

### Security Best Practices

1. **Never commit API keys** to version control
2. Use separate keys for development and production
3. Set up API key rotation policies
4. Monitor usage to detect anomalies
5. Use environment-specific keys (`NEXT_PUBLIC_*` for client-side)

---

## Message Summarization

### Library API

Located at: `/Users/admin/Sites/nself-chat/src/lib/ai/message-summarizer.ts`

```typescript
import { getMessageSummarizer, type Message } from '@/lib/ai/message-summarizer'

const summarizer = getMessageSummarizer()

// Check availability
if (summarizer.available()) {
  console.log(`Using provider: ${summarizer.getProvider()}`)
}
```

### Summary Types

#### 1. Brief Summary

Quick 1-2 sentence overview of messages:

```typescript
const summary = await summarizer.summarizeMessages(messages, {
  style: 'brief',
  maxLength: 200,
})
```

#### 2. Channel Digest

Comprehensive overview with key points and topics:

```typescript
const digest = await summarizer.generateChannelDigest(messages)

console.log(digest)
// {
//   summary: "Discussion about...",
//   keyPoints: ["Point 1", "Point 2"],
//   messageCount: 45,
//   participantCount: 8,
//   timeRange: { start: Date, end: Date },
//   topics: ["Feature X", "Bug Y"]
// }
```

#### 3. Thread Summary

Summary of a conversation thread:

```typescript
const threadSummary = await summarizer.summarizeThread(messages)

console.log(threadSummary)
// {
//   summary: "Thread about...",
//   participantCount: 4,
//   messageCount: 12,
//   keyDecisions: ["Decision 1", "Decision 2"]
// }
```

#### 4. Catch-up Summary

Summary of messages you missed:

```typescript
const catchUp = await summarizer.generateCatchUpSummary(messages)
// "You missed 23 messages. Here's what happened:\n\n• Point 1\n• Point 2"
```

### Summary Options

```typescript
interface SummaryOptions {
  maxLength?: number // Max tokens (default: 500)
  style?: 'brief' | 'detailed' | 'bullets'
  includeKeyPoints?: boolean
  language?: string // Future: multi-language support
}
```

### UI Component

Located at: `/Users/admin/Sites/nself-chat/src/components/chat/MessageSummary.tsx`

```tsx
import { MessageSummary } from '@/components/chat/MessageSummary'

function MyComponent() {
  return (
    <MessageSummary
      messages={messages}
      type="digest"
      autoGenerate={false}
      onSummaryGenerated={(summary) => console.log(summary)}
    />
  )
}
```

**Props:**

| Prop                 | Type                                           | Default      | Description             |
| -------------------- | ---------------------------------------------- | ------------ | ----------------------- |
| `messages`           | `Message[]`                                    | **required** | Messages to summarize   |
| `type`               | `'brief' \| 'digest' \| 'thread' \| 'catchup'` | `'brief'`    | Summary type            |
| `className`          | `string`                                       | -            | Additional CSS classes  |
| `autoGenerate`       | `boolean`                                      | `false`      | Auto-generate on mount  |
| `onSummaryGenerated` | `(summary: string) => void`                    | -            | Callback when generated |

---

## Smart Search

### Library API

Located at: `/Users/admin/Sites/nself-chat/src/lib/ai/smart-search.ts`

```typescript
import { getSmartSearch, type SearchableMessage } from '@/lib/ai/smart-search'

const search = getSmartSearch()

// Check availability
console.log(`Semantic search: ${search.getProvider() !== 'local'}`)
```

### Search API

```typescript
const results = await search.search('discussion about authentication bug', messages, {
  limit: 20,
  threshold: 0.7,
  includeContext: true,
  contextSize: 2,
  filters: {
    channelId: 'channel-123',
    userId: 'user-456',
    dateFrom: new Date('2025-01-01'),
    dateTo: new Date('2025-01-31'),
    hasThread: true,
  },
  rankBy: 'hybrid', // 'relevance' | 'date' | 'hybrid'
})
```

### Search Result Structure

```typescript
interface SearchResult {
  message: SearchableMessage // The matched message
  score: number // Relevance score (0-1)
  matchType: 'semantic' | 'keyword' | 'exact'
  highlights?: string[] // Highlighted excerpts
  context?: {
    // Surrounding messages
    before?: SearchableMessage[]
    after?: SearchableMessage[]
  }
}
```

### Ranking Strategies

| Strategy      | Description                             | Best For                      |
| ------------- | --------------------------------------- | ----------------------------- |
| **relevance** | Sort by similarity score                | Finding most relevant content |
| **date**      | Sort by recency                         | Finding recent mentions       |
| **hybrid**    | Combine relevance (70%) + recency (30%) | Balanced results              |

### Semantic vs. Keyword Search

**Semantic Search** (OpenAI embeddings):

- Understands meaning and context
- Finds conceptually similar messages
- Handles synonyms and paraphrasing
- Example: "login issues" matches "authentication problems"

**Keyword Search** (Fallback):

- Exact and partial word matching
- Fast and reliable
- No API costs
- Example: "login issues" matches only "login" or "issues"

### UI Component

Located at: `/Users/admin/Sites/nself-chat/src/components/search/SmartSearch.tsx`

```tsx
import { SmartSearch } from '@/components/search/SmartSearch'

function MyComponent() {
  return (
    <SmartSearch
      messages={messages}
      onMessageClick={(message) => console.log('Clicked:', message)}
      placeholder="Search with AI..."
      showFilters={true}
      autoFocus={false}
    />
  )
}
```

**Props:**

| Prop             | Type                                   | Default                        | Description            |
| ---------------- | -------------------------------------- | ------------------------------ | ---------------------- |
| `messages`       | `SearchableMessage[]`                  | **required**                   | Searchable messages    |
| `onMessageClick` | `(message: SearchableMessage) => void` | -                              | Click handler          |
| `placeholder`    | `string`                               | `'Search messages with AI...'` | Input placeholder      |
| `className`      | `string`                               | -                              | Additional CSS classes |
| `showFilters`    | `boolean`                              | `true`                         | Show filter controls   |
| `autoFocus`      | `boolean`                              | `false`                        | Auto-focus on mount    |

**Features:**

- Debounced search (300ms)
- Keyboard navigation (arrow keys, Enter, Escape)
- Advanced filtering UI
- Context display
- Match type indicators

---

## API Routes

### POST /api/ai/summarize

Generate message summaries server-side.

**Request:**

```json
{
  "messages": [
    {
      "id": "msg-1",
      "content": "Hello world",
      "userId": "user-1",
      "userName": "Alice",
      "createdAt": "2025-01-31T12:00:00Z"
    }
  ],
  "type": "brief",
  "options": {
    "style": "detailed",
    "includeKeyPoints": true
  }
}
```

**Response:**

```json
{
  "success": true,
  "summary": "Discussion about...",
  "digest": {
    /* ChannelDigest */
  },
  "threadSummary": {
    /* ThreadSummary */
  },
  "provider": "openai"
}
```

**Limits:**

- Maximum 500 messages per request
- Rate limiting recommended

### POST /api/ai/search

Perform semantic search server-side.

**Request:**

```json
{
  "query": "authentication bug",
  "messages": [
    /* SearchableMessage[] */
  ],
  "options": {
    "limit": 20,
    "threshold": 0.7,
    "rankBy": "hybrid"
  }
}
```

**Response:**

```json
{
  "success": true,
  "results": [
    /* SearchResult[] */
  ],
  "count": 15,
  "provider": "openai",
  "isSemanticSearch": true
}
```

**Limits:**

- Maximum 10,000 messages per request
- Query minimum: 2 characters

### GET /api/ai/status

Check AI feature availability.

**Response:**

```json
{
  "summarization": {
    "available": true,
    "provider": "openai"
  },
  "search": {
    "available": true,
    "provider": "openai",
    "semantic": true
  },
  "cacheStats": {
    "size": 42,
    "maxSize": 1000
  }
}
```

---

## Usage Examples

### Example 1: Daily Digest

Generate a digest of the day's activity:

```typescript
import { getMessageSummarizer } from '@/lib/ai/message-summarizer'

async function generateDailyDigest(channelId: string) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const messages = await fetchMessages({
    channelId,
    dateFrom: today,
  })

  const summarizer = getMessageSummarizer()
  const digest = await summarizer.generateChannelDigest(messages)

  return digest
}
```

### Example 2: Smart Search Integration

Add search to your chat UI:

```tsx
'use client'

import { useState } from 'react'
import { SmartSearch } from '@/components/search/SmartSearch'
import { useMessages } from '@/hooks/use-messages'

export function ChatSearch() {
  const { messages } = useMessages()
  const [selectedMessage, setSelectedMessage] = useState(null)

  const searchableMessages = messages.map((msg) => ({
    id: msg.id,
    content: msg.content,
    userId: msg.userId,
    userName: msg.user.name,
    channelId: msg.channelId,
    channelName: msg.channel.name,
    createdAt: msg.createdAt,
    threadId: msg.threadId,
  }))

  return (
    <SmartSearch
      messages={searchableMessages}
      onMessageClick={(msg) => {
        setSelectedMessage(msg)
        // Jump to message in chat
        scrollToMessage(msg.id)
      }}
    />
  )
}
```

### Example 3: Thread Auto-Summary

Automatically summarize threads when they reach a certain length:

```tsx
import { MessageSummary } from '@/components/chat/MessageSummary'

export function ThreadView({ threadMessages }: { threadMessages: Message[] }) {
  const shouldShowSummary = threadMessages.length > 10

  return (
    <div>
      {shouldShowSummary && (
        <MessageSummary messages={threadMessages} type="thread" autoGenerate={true} />
      )}

      <MessageList messages={threadMessages} />
    </div>
  )
}
```

### Example 4: Catch-Up on Return

Show users what they missed:

```typescript
import { getMessageSummarizer } from '@/lib/ai/message-summarizer'

async function getCatchUpSummary(userId: string, channelId: string) {
  const lastSeen = await getLastSeenTimestamp(userId, channelId)

  const missedMessages = await fetchMessages({
    channelId,
    dateFrom: lastSeen,
    dateTo: new Date(),
  })

  if (missedMessages.length === 0) {
    return null
  }

  const summarizer = getMessageSummarizer()
  return await summarizer.generateCatchUpSummary(missedMessages)
}
```

---

## Graceful Degradation

### No API Keys Configured

When no AI API keys are configured, the system automatically falls back to local implementations:

**Summarization:**

- Generates basic statistical summaries
- Shows participant count, message count, time range
- Displays recent messages

**Search:**

- Uses keyword-based search
- Supports exact phrase matching
- Includes partial word matching

**User Experience:**

- All UI components work normally
- Badge shows "Basic" instead of "AI"
- No error messages shown to users
- Slightly reduced quality but full functionality

### API Failures

The system handles API failures gracefully:

```typescript
try {
  const summary = await summarizer.summarizeMessages(messages)
  // Use AI summary
} catch (error) {
  // Automatically falls back to local summary
  const fallbackSummary = localSummarize(messages)
}
```

**Failure Scenarios:**

- API rate limits exceeded
- Network connectivity issues
- Invalid API keys
- Service outages

**Automatic Recovery:**

- Falls back to local implementations
- Logs errors to Sentry
- No user-visible errors
- Seamless experience

---

## Performance Considerations

### Caching

**Embedding Cache:**

- Stores up to 1,000 recent embeddings
- LRU eviction policy
- Based on first 100 characters
- Reduces API calls by ~70%

```typescript
const search = getSmartSearch()

// Check cache stats
const stats = search.getCacheStats()
console.log(`Cache: ${stats.size}/${stats.maxSize}`)

// Clear cache if needed
search.clearCache()
```

### Rate Limiting

**Recommended Limits:**

| Feature       | Requests/min | Requests/hour |
| ------------- | ------------ | ------------- |
| Summarization | 10           | 100           |
| Search        | 30           | 300           |

**Implementation:**

```typescript
// Example rate limiter (implement in middleware)
import { Ratelimit } from '@upstash/ratelimit'

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '1 m'),
})

// In API route
const { success } = await ratelimit.limit(userId)
if (!success) {
  return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
}
```

### Cost Optimization

**OpenAI Costs (Approximate):**

| Operation     | Model                  | Cost per 1K tokens                  |
| ------------- | ---------------------- | ----------------------------------- |
| Summarization | gpt-4o-mini            | $0.00015 (input) + $0.0006 (output) |
| Embeddings    | text-embedding-3-small | $0.00002                            |

**Tips to Reduce Costs:**

1. **Limit message count**: Only summarize last N messages
2. **Cache aggressively**: Store summaries in database
3. **Use smaller models**: `gpt-4o-mini` vs `gpt-4`
4. **Batch requests**: Combine multiple summaries
5. **Set max_tokens**: Limit output length

```typescript
// Example: Limit to recent messages
const recentMessages = messages.slice(-50) // Last 50 messages only
const summary = await summarizer.summarizeMessages(recentMessages)
```

### Client vs. Server

**Client-Side AI:**

- Fast for interactive features
- Requires exposing API keys (use `NEXT_PUBLIC_*`)
- Harder to rate limit
- Good for: Real-time search

**Server-Side AI:**

- Better security (no exposed keys)
- Easy to rate limit
- Better caching opportunities
- Good for: Batch summarization, scheduled digests

---

## Troubleshooting

### Common Issues

**1. "AI features not working"**

- Check API keys are set in `.env.local`
- Verify keys are valid
- Check `/api/ai/status` endpoint

**2. "Semantic search not available"**

- OpenAI key required for embeddings
- Anthropic doesn't support embeddings yet
- Falls back to keyword search automatically

**3. "Rate limit exceeded"**

- Implement caching
- Reduce request frequency
- Consider upgrading API plan

**4. "Summaries are low quality"**

- Using local fallback (no API key)
- Configure OpenAI or Anthropic API key
- Increase `maxLength` in options

### Debug Mode

Enable debug logging:

```typescript
// Add to your component
useEffect(() => {
  const summarizer = getMessageSummarizer()
  console.log('Summarizer:', {
    available: summarizer.available(),
    provider: summarizer.getProvider(),
  })

  const search = getSmartSearch()
  console.log('Search:', {
    available: search.available(),
    provider: search.getProvider(),
    semantic: search.getProvider() !== 'local',
  })
}, [])
```

---

## Future Enhancements

Planned features for future releases:

- [ ] Multi-language support
- [ ] Custom AI model configuration
- [ ] Fine-tuned models for domain-specific chat
- [ ] Sentiment analysis
- [ ] Auto-moderation with AI
- [ ] Image understanding in messages
- [ ] Voice message transcription
- [ ] Real-time translation
- [ ] Suggested replies
- [ ] Question answering over chat history

---

## Related Documentation

- [Architecture Overview](../../CLAUDE.md)
- [API Documentation](../../api/API.md)
- [Deployment Guide](../../../.claude/implementation/DEPLOYMENT.md)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)

---

## Support

For issues or questions about AI features:

1. Check this documentation
2. Review [Common Issues](../../../.claude/COMMON-ISSUES.md)
3. Open an issue on GitHub
4. Contact support@nself.org

---

**Last Updated**: January 31, 2026
**Version**: 1.0.0
