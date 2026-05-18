# AI Infrastructure Layer - v0.7.0

Complete AI infrastructure for nself-chat with enterprise-grade features including cost tracking, rate limiting, caching, and monitoring.

## Overview

The AI infrastructure provides a robust foundation for integrating AI features into nself-chat with:

- **Multiple AI Providers**: OpenAI and Anthropic (Claude) support
- **Advanced Error Handling**: Retry logic, exponential backoff, and model fallback
- **Cost Management**: Per-user/org token tracking, budget limits, and spending alerts
- **Rate Limiting**: Token bucket algorithm with Redis backend
- **Response Caching**: Intelligent caching with configurable TTL
- **Request Queuing**: Priority-based queue with batch processing
- **Admin Dashboard**: Real-time monitoring and configuration

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Application Layer                        │
│  (Message Summarization, Search, Chat Completions, etc.)   │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│                 AI Infrastructure Layer                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Rate Limiter │  │ Cost Tracker │  │ Request Queue│     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                  │                  │             │
│  ┌──────▼──────────────────▼──────────────────▼────────┐   │
│  │           Response Cache (Redis)                     │   │
│  └──────┬───────────────────────────────────────────────┘   │
│         │                                                    │
│  ┌──────▼──────────┐          ┌──────────────────┐         │
│  │  OpenAI Client  │          │ Anthropic Client │         │
│  │  - Streaming    │          │  - Claude 3.5    │         │
│  │  - Retry logic  │          │  - Streaming     │         │
│  │  - Fallback     │          │  - Error handling│         │
│  └──────┬──────────┘          └──────┬───────────┘         │
└─────────┼─────────────────────────────┼────────────────────┘
          │                             │
          ▼                             ▼
    OpenAI API                   Anthropic API
```

## Components

### 1. AI Providers

#### OpenAI Client (`providers/openai-client.ts`)

Advanced OpenAI integration with:

- **Models**: GPT-4 Turbo, GPT-4o, GPT-4o Mini, GPT-3.5 Turbo
- **Streaming**: Server-sent events for real-time responses
- **Retry Logic**: Exponential backoff with jitter
- **Model Fallback**: Automatic fallback to cheaper models on failure
- **Error Categorization**: Authentication, rate limit, timeout, network errors
- **Timeout Handling**: Configurable request timeouts with abort controller

**Usage:**

```typescript
import { getOpenAIClient } from "@/lib/ai/providers/openai-client";

const client = getOpenAIClient();

// Chat completion
const response = await client.createChatCompletion({
  messages: [
    { role: "system", content: "You are a helpful assistant." },
    { role: "user", content: "Hello!" },
  ],
  temperature: 0.7,
  maxTokens: 500,
});

// Streaming
for await (const chunk of client.createChatCompletionStream({ messages })) {
  console.log(chunk.choices[0]?.delta?.content);
}
```

#### Anthropic Client (`providers/anthropic-client.ts`)

Claude 3.5 integration with:

- **Models**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 family
- **Streaming**: Real-time streaming with event handling
- **Error Handling**: Retry logic with longer delays for rate limits
- **Message Conversion**: Helper utilities for message format conversion

**Usage:**

```typescript
import { getAnthropicClient } from "@/lib/ai/providers/anthropic-client";

const client = getAnthropicClient();

// Create message
const response = await client.createMessage({
  messages: [{ role: "user", content: "Hello!" }],
  system: "You are a helpful assistant.",
  maxTokens: 1024,
});

// Streaming
for await (const event of client.createMessageStream({ messages })) {
  if (event.type === "content_block_delta") {
    console.log(event.delta?.text);
  }
}
```

### 2. Rate Limiter (`rate-limiter.ts`)

Redis-backed distributed rate limiting with:

- **Token Bucket Algorithm**: Smooth rate limiting with burst capacity
- **Sliding Window**: Alternative algorithm for strict limits
- **Multi-Level Limits**: Per-user, per-org, and per-endpoint limits
- **Rate Limit Headers**: Standard HTTP headers for client feedback

**Default Limits:**
| Feature | User Limit | Org Limit | Window |
|---------|-----------|-----------|---------|
| Summarization | 50 req | 500 req | 1 hour |
| Search | 20 req | 1000 req | 1 min / 1 hour |
| Chat | 10 req | 1000 req | 1 min / 1 hour |
| Embeddings | 30 req | 5000 req | 1 min / 1 hour |

**Usage:**

```typescript
import {
  getSummarizeUserLimiter,
  checkAIRateLimit,
} from "@/lib/ai/rate-limiter";

// Check rate limit
const limiter = getSummarizeUserLimiter();
const result = await limiter.checkUserLimit(userId, "summarize");

if (!result.allowed) {
  return Response.json(
    { error: "Rate limit exceeded" },
    {
      status: 429,
      headers: getRateLimitHeaders(result),
    },
  );
}

// Or use helper
const rateLimitResult = await checkAIRateLimit({
  userId,
  orgId,
  endpoint: "summarize",
  userLimiter: getSummarizeUserLimiter(),
  orgLimiter: getSummarizeOrgLimiter(),
});
```

### 3. Cost Tracker (`cost-tracker.ts`)

Comprehensive cost tracking and budget management:

- **Token Tracking**: Input/output tokens for all requests
- **Cost Calculation**: Real-time cost calculation per model
- **Budget Alerts**: Configurable alerts at spending thresholds
- **Reporting**: Daily, weekly, and monthly cost reports
- **Top Users**: Identify highest spenders

**Model Pricing (Jan 2026):**
| Model | Input (per 1K) | Output (per 1K) |
|-------|---------------|-----------------|
| GPT-4 Turbo | $0.01 | $0.03 |
| GPT-4o | $0.005 | $0.015 |
| GPT-4o Mini | $0.00015 | $0.0006 |
| Claude 3.5 Sonnet | $0.003 | $0.015 |
| Claude 3.5 Haiku | $0.0008 | $0.004 |

**Usage:**

```typescript
import { getCostTracker } from "@/lib/ai/cost-tracker";

const tracker = getCostTracker();

// Track usage
await tracker.trackUsage(
  "summarize",
  "gpt-4o-mini",
  {
    inputTokens: 500,
    outputTokens: 200,
    totalTokens: 700,
  },
  {
    userId,
    orgId,
    requestId,
  },
);

// Get stats
const stats = await tracker.getUserStats(userId, startDate, endDate);
console.log("Total cost:", stats.totalCost);

// Create budget alert
await tracker.createBudgetAlert({
  name: "Monthly Budget",
  orgId,
  limit: 1000,
  period: "monthly",
  notifyAt: [50, 75, 90, 100],
  enabled: true,
});
```

### 4. Request Queue (`request-queue.ts`)

Priority-based request queue with:

- **Priority Levels**: Critical, High, Normal, Low, Background
- **Batch Processing**: Process multiple requests concurrently
- **Dead Letter Queue**: Failed requests for manual inspection
- **Metrics**: Queue length, processing time, success/failure rates

**Usage:**

```typescript
import { getQueue, RequestPriority } from '@/lib/ai/request-queue'

// Create queue with processor
const queue = getQueue('summarization', async (request) => {
  // Process request
  return await summarize(request.payload)
})

// Enqueue request
const requestId = await queue.enqueue(
  { messages: [...] },
  {
    priority: RequestPriority.HIGH,
    userId,
    maxAttempts: 3,
    timeout: 30000,
  }
)

// Start processing
queue.start()

// Get metrics
const metrics = await queue.getMetrics()
console.log('Queue length:', metrics.totalQueued)
```

### 5. Response Cache (`response-cache.ts`)

Intelligent caching with:

- **Hash-Based Keys**: Automatic key generation from request payload
- **TTL Configuration**: Different TTLs per operation type
- **Hit Rate Tracking**: Monitor cache effectiveness
- **Batch Operations**: Get/set multiple entries efficiently

**Cache TTLs:**
| Operation | TTL | Rationale |
|-----------|-----|-----------|
| Chat | 5 min | Responses change frequently |
| Summarization | 30 min | Summaries remain valid |
| Search | 1 hour | Search results stable |
| Embeddings | 2 hours | Embeddings rarely change |
| Translation | 24 hours | Translations are static |

**Usage:**

```typescript
import { getSummarizationCache, cached } from "@/lib/ai/response-cache";

const cache = getSummarizationCache();

// Manual caching
const cached = await cache.getByPayload(request);
if (cached) return cached;

const result = await summarize(request);
await cache.setByPayload(request, result);

// Decorator pattern
class SummarizationService {
  @cached(getSummarizationCache(), { ttl: 1800 })
  async summarize(messages: Message[]) {
    return await this.doSummarize(messages);
  }
}
```

## Admin Dashboard

### Usage Dashboard (`components/admin/ai/AIUsageDashboard.tsx`)

Real-time metrics dashboard showing:

- **Cost Overview**: Total spending, average per request
- **Usage Metrics**: Request counts, token usage
- **Queue Status**: Queued, processing, completed, failed
- **Cache Performance**: Hit rates, cache size
- **Charts**: By model, by endpoint, trends

**Access:** `/admin/ai/usage`

### Configuration Panel (`components/admin/ai/AIConfigPanel.tsx`)

Manage AI configuration:

- **Providers**: Enable/disable OpenAI and Anthropic
- **Models**: Select default and fallback models
- **Rate Limits**: Configure per-user and per-org limits
- **Budgets**: Set daily and monthly spending limits
- **Cache**: Configure TTLs per operation

**Access:** `/admin/ai/config`

## API Routes

### GET /api/admin/ai/usage

Get AI usage statistics

**Query Parameters:**

- `period`: `daily` | `monthly` (default: `daily`)
- `userId`: Filter by user ID
- `orgId`: Filter by organization ID
- `date`: ISO date string (default: today)

**Response:**

```json
{
  "success": true,
  "data": {
    "usage": {
      "totalRequests": 1234,
      "totalTokens": 567890,
      "totalCost": 12.34,
      "averageCostPerRequest": 0.01,
      "byModel": { ... },
      "byEndpoint": { ... }
    },
    "queues": [...],
    "cache": { ... }
  }
}
```

### GET /api/admin/ai/costs

Get cost analysis

**Query Parameters:**

- `startDate`: ISO date string (required)
- `endDate`: ISO date string (required)
- `userId`: Filter by user ID
- `orgId`: Filter by organization ID

### GET /api/admin/ai/limits

Get rate limit status

**Query Parameters:**

- `userId`: Filter by user ID
- `orgId`: Filter by organization ID
- `endpoint`: Filter by endpoint

### DELETE /api/admin/ai/limits

Reset rate limits

**Query Parameters:**

- `endpoint`: Endpoint to reset (required)
- `userId`: Reset for specific user
- `orgId`: Reset for specific org

### GET /api/admin/ai/config

Get AI configuration

### POST /api/admin/ai/config

Update AI configuration

**Body:**

```json
{
  "openai": { ... },
  "anthropic": { ... },
  "rateLimits": { ... },
  "cache": { ... },
  "budgets": { ... }
}
```

## Environment Variables

```bash
# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_ORGANIZATION=org-...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...

# Redis (for rate limiting and caching)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

## Cost Optimization Recommendations

### 1. Use Appropriate Models

- **Summarization**: GPT-4o Mini ($0.00015 input)
- **Search**: Text-embedding-3-small ($0.00002)
- **Chat**: GPT-4o Mini for simple, GPT-4o for complex
- **Analysis**: Claude 3.5 Haiku ($0.0008)

### 2. Enable Caching

- Cache summarizations for 30+ minutes
- Cache search results for 1+ hour
- Cache embeddings for 2+ hours
- Monitor hit rates and adjust TTLs

### 3. Implement Rate Limits

- Prevent abuse with per-user limits
- Set org-level caps for cost control
- Use burst capacity for legitimate spikes

### 4. Set Budget Alerts

- Daily limits for quick feedback
- Monthly limits for cost control
- Alert at 75% to take action before exceeding

### 5. Monitor Usage

- Review daily reports
- Identify top users
- Analyze cost by feature
- Optimize high-cost operations

## Monitoring and Alerting

### Metrics to Track

- **Cost**: Daily/monthly spending, cost per user
- **Usage**: Request counts, token usage
- **Performance**: Average response time, queue length
- **Errors**: Failed requests, rate limit hits
- **Cache**: Hit rate, cache size

### Alert Thresholds

- Budget at 50%, 75%, 90%, 100%
- Queue length > 100 requests
- Error rate > 5%
- Cache hit rate < 50%

## Best Practices

### 1. Error Handling

```typescript
try {
  const result = await client.createChatCompletion(request);
  return result;
} catch (error) {
  if (error instanceof OpenAIError) {
    switch (error.type) {
      case OpenAIErrorType.RATE_LIMIT:
        // Wait and retry
        break;
      case OpenAIErrorType.INVALID_REQUEST:
        // Log and alert
        break;
      default:
      // Fallback to alternative provider
    }
  }
  throw error;
}
```

### 2. Cost Tracking

Always track usage for billing and monitoring:

```typescript
const result = await client.createChatCompletion(request);

await costTracker.trackUsage(
  "chat",
  model,
  {
    inputTokens: result.usage.promptTokens,
    outputTokens: result.usage.completionTokens,
    totalTokens: result.usage.totalTokens,
  },
  { userId, orgId, requestId },
);
```

### 3. Rate Limiting

Check limits before expensive operations:

```typescript
const rateLimit = await checkAIRateLimit({
  userId,
  orgId,
  endpoint: "summarize",
  userLimiter,
  orgLimiter,
});

if (!rateLimit.allowed) {
  throw new Error("Rate limit exceeded");
}
```

### 4. Caching

Use caching for idempotent operations:

```typescript
const cacheKey = hashPayload(request);
const cached = await cache.get(cacheKey);
if (cached) return cached;

const result = await expensiveOperation(request);
await cache.set(cacheKey, result, { ttl: 1800 });
return result;
```

## Testing

### Unit Tests

```typescript
describe("CostTracker", () => {
  it("calculates cost correctly", () => {
    const tracker = new CostTracker();
    const cost = tracker.calculateCost("gpt-4o-mini", {
      inputTokens: 1000,
      outputTokens: 500,
      totalTokens: 1500,
    });
    expect(cost.totalCost).toBe(0.45); // $0.15 + $0.30
  });
});
```

### Integration Tests

```typescript
describe("Rate Limiter", () => {
  it("enforces user limits", async () => {
    const limiter = new RateLimiter({ maxRequests: 10, windowMs: 60000 });

    // Make 10 requests
    for (let i = 0; i < 10; i++) {
      const result = await limiter.checkLimit("user-123");
      expect(result.allowed).toBe(true);
    }

    // 11th request should be blocked
    const result = await limiter.checkLimit("user-123");
    expect(result.allowed).toBe(false);
  });
});
```

## Troubleshooting

### High Costs

1. Check top users: `GET /api/admin/ai/costs`
2. Review usage by model
3. Verify caching is enabled
4. Lower budget limits if needed

### Rate Limit Errors

1. Check current limits: `GET /api/admin/ai/limits`
2. Reset limits if appropriate: `DELETE /api/admin/ai/limits`
3. Increase limits in configuration
4. Implement user-facing retry logic

### Cache Not Working

1. Verify Redis connection
2. Check cache configuration
3. Monitor hit rates
4. Adjust TTLs based on use case

### Queue Backing Up

1. Check queue metrics
2. Increase concurrency
3. Review failed requests in DLQ
4. Scale processing workers

## Future Enhancements

- [ ] API key rotation system
- [ ] Multi-region failover
- [ ] A/B testing framework
- [ ] Model performance tracking
- [ ] Automatic cost optimization
- [ ] User-facing rate limit UI
- [ ] Webhook notifications for budgets
- [ ] Advanced analytics dashboard
- [ ] Cost forecasting
- [ ] Custom model fine-tuning

## Support

For issues or questions:

1. Check this documentation
2. Review error logs in Sentry
3. Check Redis connectivity
4. Verify API keys are valid
5. Contact support@nself.org
