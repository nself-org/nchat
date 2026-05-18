# AI Message Summarization System (v0.7.0)

Complete AI-powered message analysis and summarization suite for nself-chat (nchat).

## Overview

This system provides comprehensive AI-driven features for analyzing chat conversations, generating summaries, tracking sentiment, and creating structured meeting notes. It supports multiple AI providers with automatic fallback to local implementations.

## Files

| File                    | Purpose                   | Key Features                                            |
| ----------------------- | ------------------------- | ------------------------------------------------------- |
| `message-summarizer.ts` | Core summarization engine | Multi-message summaries, quality scoring, cost tracking |
| `thread-summarizer.ts`  | Thread analysis           | TL;DR, action items, participant summaries              |
| `channel-digest.ts`     | Channel summaries         | Daily/weekly digests, trending topics, highlights       |
| `sentiment-analyzer.ts` | Sentiment analysis        | Mood detection, emotion classification, team morale     |
| `meeting-notes.ts`      | Meeting documentation     | Auto-generated notes, decisions, transcripts            |
| `smart-search.ts`       | Semantic search           | Embeddings-based search, natural language queries       |
| `examples.ts`           | Usage examples            | 12 comprehensive examples                               |

## Quick Start

### Thread Summarization

```typescript
import { getThreadSummarizer } from "@/lib/ai/thread-summarizer";

const summarizer = getThreadSummarizer();
const result = await summarizer.summarizeThread(messages, {
  includeActionItems: true,
  includeParticipants: true,
});

console.log(result.tldr);
console.log(result.actionItems);
console.log(`Quality: ${result.qualityScore}%`);
```

### Channel Digest

```typescript
import { getChannelDigestGenerator } from "@/lib/ai/channel-digest";

const generator = getChannelDigestGenerator();
const digest = await generator.generateDigest("channel-123", messages, {
  period: "daily",
  maxTopMessages: 5,
});

console.log(digest.digest);
console.log(digest.topMessages);
console.log(digest.statistics);
```

### Sentiment Analysis

```typescript
import { getSentimentAnalyzer } from "@/lib/ai/sentiment-analyzer";

const analyzer = getSentimentAnalyzer();

// Single message
const result = await analyzer.analyzeMessage(message);
console.log(result.sentiment); // 'positive'
console.log(result.emotion); // 'joy'

// Trend analysis
const trend = await analyzer.analyzeTrends(messages);
console.log(trend.trend); // 'improving'

// Team morale
const morale = await analyzer.generateMoraleReport(messages, period);
console.log(morale.recommendations);
```

### Meeting Notes

```typescript
import { getMeetingNotesGenerator } from "@/lib/ai/meeting-notes";

const generator = getMeetingNotesGenerator();
const notes = await generator.generateNotes(messages, {
  extractAgenda: true,
  templateStyle: "detailed",
});

console.log(notes.formattedNotes); // Markdown
console.log(notes.decisions);
console.log(notes.actionItems);
```

## Configuration

Add API keys to `.env.local`:

```bash
# Primary provider (OpenAI GPT-4 Turbo)
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_OPENAI_API_KEY=sk-...

# Fallback provider (Claude 3.5 Haiku)
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_ANTHROPIC_API_KEY=sk-ant-...
```

## AI Providers

### Primary: OpenAI GPT-4 Turbo

- Model: `gpt-4-turbo-preview`
- Best for: High-quality summaries, complex analysis
- Cost: ~$0.01/1K input, ~$0.03/1K output tokens

### Fallback: Claude 3.5 Haiku

- Model: `claude-3-5-haiku-20241022`
- Best for: Fast, cost-effective analysis
- Cost: ~$0.00025/1K input, ~$0.00125/1K output tokens

### Local: Rule-Based

- No API key required
- Free, basic analysis
- Good for development/testing

## Features

### Thread Summarization

- ✅ TL;DR generation (max 200 chars)
- ✅ Key points extraction (3-5 points)
- ✅ Action items with priorities
- ✅ Participant summaries with contributions
- ✅ Sentiment detection (positive/negative/neutral/mixed)
- ✅ Resolution status tracking
- ✅ Quality scoring (0-100)
- ✅ Cost tracking

### Channel Digest

- ✅ Daily/weekly/custom periods
- ✅ Top messages identification
- ✅ Key highlights extraction
- ✅ Trending topics detection
- ✅ Activity statistics
- ✅ Sentiment distribution
- ✅ Most active user tracking
- ✅ Rate limiting (100/hour, 1000/day)
- ✅ Next digest scheduling

### Sentiment Analysis

- ✅ 4 sentiment types (positive, negative, neutral, mixed)
- ✅ 8 emotion categories (joy, sadness, anger, fear, surprise, disgust, trust, anticipation)
- ✅ Confidence scoring (0-100)
- ✅ Sentiment score (-1 to 1)
- ✅ Toxicity detection (0-100)
- ✅ Trend analysis (improving/declining/stable)
- ✅ Volatility measurement
- ✅ Team morale reporting
- ✅ Actionable recommendations

### Meeting Notes

- ✅ Auto-generated titles
- ✅ Executive summaries
- ✅ Participant tracking with speaking time
- ✅ Agenda extraction
- ✅ Decision identification with impact levels
- ✅ Action item extraction
- ✅ Discussion topic segmentation
- ✅ Transcript formatting (full/condensed/summary)
- ✅ Multiple templates (simple/detailed/executive/technical)
- ✅ Markdown export

## API Routes

### POST /api/ai/summarize

Generate message summaries.

```typescript
// Request
{
  "messages": Message[],
  "type": "brief" | "digest" | "thread" | "catchup" | "meeting-notes",
  "options": {
    "style": "brief" | "detailed" | "bullets",
    "includeKeyPoints": true,
    "maxLength": 500
  }
}

// Response
{
  "success": true,
  "summary": "...",
  "provider": "openai",
  "qualityScore": 85,
  "costInfo": {
    "totalCost": 0.0045,
    "requestCount": 12
  }
}
```

### POST /api/ai/sentiment

Analyze sentiment and emotions.

```typescript
// Request
{
  "message": Message,
  "type": "single" | "trend" | "morale",
  "options": {
    "includeEmotions": true,
    "detectToxicity": true
  }
}

// Response
{
  "success": true,
  "result": {
    "sentiment": "positive",
    "emotion": "joy",
    "confidence": 85,
    "score": 0.75,
    "context": { ... }
  }
}
```

### POST /api/ai/digest

Generate channel digests.

```typescript
// Request
{
  "channelId": "channel-123",
  "messages": Message[],
  "options": {
    "period": "daily" | "weekly",
    "maxTopMessages": 5,
    "maxHighlights": 5
  }
}

// Response
{
  "success": true,
  "digest": {
    "digest": "...",
    "topMessages": [...],
    "highlights": [...],
    "statistics": { ... }
  }
}
```

## UI Components

### ThreadSummaryPanel

Comprehensive thread summary display with interactive action items.

```tsx
import { ThreadSummaryPanel } from "@/components/chat/ThreadSummaryPanel";
<ThreadSummaryPanel
  messages={messages}
  threadId="thread-123"
  autoGenerate={true}
  onActionItemClick={(id) => handleAction(id)}
/>;
```

**Features:**

- TL;DR with quality badge
- Expandable key points
- Interactive action items
- Participant cards
- Copy/download functionality

### ChannelDigestView

Multi-tab channel digest viewer.

```tsx
import { ChannelDigestView } from "@/components/chat/ChannelDigestView";
<ChannelDigestView
  channelId="channel-123"
  channelName="#general"
  messages={messages}
  period="daily"
  onMessageClick={(id) => navigateToMessage(id)}
/>;
```

**Features:**

- 4 tabs: Overview, Highlights, Topics, Stats
- Top messages with scores
- Highlight cards with type icons
- Trending topics with trend indicators
- Sentiment distribution charts
- Activity statistics

## Cost Tracking

Monitor AI API costs:

```typescript
const summarizer = getMessageSummarizer();
const costs = summarizer.getCostStats();

console.log(`Total cost: $${costs.totalCost.toFixed(4)}`);
console.log(`Requests: ${costs.requestCount}`);
```

**Cost Estimates:**

- Brief summary (10 messages): ~$0.002
- Thread summary (50 messages): ~$0.008
- Channel digest (200 messages): ~$0.020
- Meeting notes (100 messages): ~$0.015

## Rate Limiting

Built-in rate limits:

- **Message Summarizer:** 100/hour per key
- **Channel Digest:** 100/hour, 1000/day per channel
- **Sentiment Analyzer:** Unlimited (cached)

```typescript
if (!summarizer.checkRateLimit("user-123")) {
  console.log("Rate limit exceeded");
}
```

## Error Handling

Automatic fallback chain: OpenAI → Anthropic → Local

```typescript
try {
  const result = await summarizer.summarizeThread(messages);
} catch (error) {
  // Automatically falls back to local analysis
  // Error logged to Sentry
}
```

## Performance Optimization

### Parallel Processing

- Multiple components generated in parallel
- 50-70% faster than sequential processing

### Caching

- Embedding cache: 1,000 entries (LRU eviction)
- Smart search caches query embeddings

### Token Management

- Automatic transcript truncation
- Smart message sampling for large threads
- Context window optimization

## Examples

See `examples.ts` for 12 comprehensive examples:

1. Basic message summarization
2. Channel digest generation
3. Thread summary
4. Catch-up summary
5. Basic search
6. Advanced search with filters
7. Check AI availability
8. Daily digest automation
9. Search with result ranking
10. API route usage
11. Error handling
12. Cache management

## Testing

```bash
# Unit tests
pnpm test src/lib/ai/

# E2E tests
pnpm test:e2e e2e/ai-features.spec.ts
```

## Troubleshooting

### No API Keys

- System falls back to local (rule-based) analysis
- Set environment variables for AI features

### Rate Limit Exceeded

- Wait 1 hour for reset
- Upgrade API plan
- Use local fallback

### Low Quality Scores

- Use at least 5 messages
- Ensure sufficient content per message
- Check language compatibility

### High Costs

- Monitor with `getCostStats()`
- Use Claude Haiku for cost-sensitive ops
- Set `maxLength` limits
- Implement caching

## Migration from v0.6.x

```typescript
// Old
const summarizer = getMessageSummarizer({ model: "gpt-4o-mini" });

// New (uses GPT-4 Turbo automatically)
const summarizer = getMessageSummarizer();

// New thread summarizer
import { getThreadSummarizer } from "@/lib/ai/thread-summarizer";
const result = await getThreadSummarizer().summarizeThread(messages);

// Cost tracking
const costs = summarizer.getCostStats();
```

## Roadmap

- [ ] Multilingual support
- [ ] Custom model fine-tuning
- [ ] Real-time sentiment tracking
- [ ] Voice transcript integration
- [ ] Automated digest scheduling
- [ ] Calendar integration for meetings
- [ ] Export to Notion/Confluence/Slack

## Support

- GitHub Issues: https://github.com/nself/nself-chat/issues
- Documentation: `/docs/`
- Examples: `src/lib/ai/examples.ts`

## License

Part of nself-chat (nchat) - MIT License
