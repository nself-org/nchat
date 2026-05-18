# Performance Monitoring Library

Production-ready performance monitoring system with Web Vitals tracking, custom metrics, and real-time analytics.

## Quick Start

### 1. Initialize (Auto-enabled)

The performance monitor automatically initializes when imported in the browser.

```typescript
import { performanceMonitor } from "@/lib/performance/monitor";

// Already initialized! Start recording metrics immediately.
```

### 2. Use in Components

```typescript
import { usePerformance } from '@/hooks/use-performance';

function MyComponent() {
  const { snapshot, score } = usePerformance();

  return (
    <div>
      <p>Performance Score: {score.overall}</p>
      <p>LCP: {snapshot.webVitals.lcp}ms</p>
    </div>
  );
}
```

## Features

### Web Vitals (Automatic)

- **LCP** - Largest Contentful Paint
- **CLS** - Cumulative Layout Shift
- **TTFB** - Time to First Byte
- **FCP** - First Contentful Paint
- **INP** - Interaction to Next Paint (replaces deprecated FID)

### Custom Metrics

- API response times (auto-tracked)
- WebSocket latency
- Component render times
- Memory usage (Chrome/Edge)
- Long task detection
- Error rates

### Analytics

- Real-time performance scoring (0-100)
- Statistical analysis (min, max, avg, P95, P99)
- Trend detection (improving/degrading)
- Performance warnings
- Time-series data

## Core APIs

### Recording Metrics

```typescript
import { performanceMonitor } from "@/lib/performance/monitor";

// Record custom metric
performanceMonitor.recordCustomMetric({
  name: "data-processing-time",
  value: 250,
  unit: "ms",
  tags: { operation: "parse-json" },
});

// Record error
performanceMonitor.recordError(error, {
  context: "user-action",
});
```

### Performance Utilities

```typescript
import { measurePerformanceAsync } from "@/lib/performance/monitor";

// Measure async function
const result = await measurePerformanceAsync(
  "fetch-data",
  async () => {
    return await fetchData();
  },
  { endpoint: "/api/data" },
);
```

### React Hooks

```typescript
// Main hook
const { snapshot, score, stats, trends, warnings, refresh, reset } =
  usePerformance();

// Component render tracking
const { renderCount } = useRenderPerformance("MyComponent");

// API tracking
const { recordApiCall } = useApiPerformance();

// WebSocket tracking
const { recordLatency, recordMessage } = useWebSocketPerformance();

// Warnings
const { warnings, criticalWarnings, activeWarnings, clearWarning } =
  usePerformanceWarnings();

// Time-series data
const timeSeries = usePerformanceTimeSeries("api-response-time", 3600000);
```

## File Structure

```
src/lib/performance/
├── README.md              # This file
├── monitor.ts             # Core monitoring system (600+ lines)
└── metrics.ts             # Analysis utilities (500+ lines)

src/hooks/
└── use-performance.ts     # React hooks (300+ lines)

src/components/
└── admin/
    └── PerformanceMonitor.tsx  # Admin dashboard (700+ lines)
```

## Integration Examples

### API Route

```typescript
// src/app/api/example/route.ts
import { measurePerformanceAsync } from "@/lib/performance/monitor";

export async function GET() {
  return measurePerformanceAsync(
    "api-get-example",
    async () => {
      const data = await fetchData();
      return NextResponse.json(data);
    },
    { endpoint: "/api/example", method: "GET" },
  );
}
```

### GraphQL

```typescript
// src/lib/apollo-client.ts
import { ApolloLink } from "@apollo/client";
import { performanceMonitor } from "@/lib/performance/monitor";

const performanceLink = new ApolloLink((operation, forward) => {
  const start = performance.now();

  return forward(operation).map((response) => {
    performanceMonitor.recordCustomMetric({
      name: "graphql-query-time",
      value: performance.now() - start,
      unit: "ms",
      tags: { operation: operation.operationName },
    });
    return response;
  });
});
```

### Component Performance

```typescript
import { Profiler } from 'react';
import { recordRenderTime } from '@/lib/performance/monitor';

function App() {
  return (
    <Profiler
      id="App"
      onRender={(id, phase, actualDuration) => {
        recordRenderTime(id, phase, actualDuration);
      }}
    >
      <YourApp />
    </Profiler>
  );
}
```

## Performance Warnings

Automatic detection of:

- **Slow Operations**: Tasks > 100ms
- **Memory Leaks**: Usage > 80%
- **High Error Rate**: Errors > 5%
- **Poor Web Vitals**: Metrics in "poor" range
- **Slow APIs**: Response time > 2s

## Data Persistence

- **LocalStorage**: Last 1000 metrics (~100KB)
- **Sentry**: All metrics (when configured)
- **Session**: Active warnings only

## Browser Support

| Browser | Web Vitals | Memory API | Overall |
| ------- | ---------- | ---------- | ------- |
| Chrome  | ✅         | ✅         | Full    |
| Edge    | ✅         | ✅         | Full    |
| Firefox | ✅         | ❌         | Good    |
| Safari  | ✅         | ❌         | Good    |

## Performance Impact

- **Overhead**: < 1% of total execution time
- **Memory**: ~500KB (includes metrics storage)
- **Network**: None (all client-side except Sentry)

## Configuration

No configuration required. Monitoring starts automatically.

Optional environment variables:

```bash
# Disable Sentry integration
NEXT_PUBLIC_SENTRY_DSN=

# Custom release version
NEXT_PUBLIC_RELEASE_VERSION=1.0.0
```

## TypeScript Types

All types are fully typed and exported:

```typescript
import type {
  PerformanceMetric,
  CustomMetric,
  PerformanceSnapshot,
  PerformanceWarning,
  PerformanceScore,
  MetricStats,
  MetricTrend,
} from "@/lib/performance/monitor";
```

## Testing

```typescript
import { performanceMonitor } from "@/lib/performance/monitor";

describe("Performance", () => {
  beforeEach(() => {
    performanceMonitor.reset();
  });

  it("should track custom metrics", () => {
    performanceMonitor.recordCustomMetric({
      name: "test-metric",
      value: 100,
      unit: "ms",
    });

    const metrics = performanceMonitor.getCustomMetrics();
    expect(metrics).toHaveLength(1);
    expect(metrics[0].value).toBe(100);
  });
});
```

## Resources

- [Full Documentation](../../../docs/Performance-Monitoring.md)
- [Integration Examples](../../../docs/examples/performance-integration.tsx)
- [Admin Dashboard](../../components/admin/PerformanceMonitor.tsx)
- [Web Vitals Reference](https://web.dev/vitals/)

## License

Same as parent project (nself-chat)
