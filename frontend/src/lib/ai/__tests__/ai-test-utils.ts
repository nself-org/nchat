/**
 * AI Test Utilities
 * Shared test helpers for AI features
 */

import type { Message } from "../message-summarizer";
import type { SearchableMessage } from "../smart-search";

// ============================================================================
// Mock Data Generators
// ============================================================================

/**
 * Generate mock message for testing
 */
export function createMockMessage(overrides?: Partial<Message>): Message {
  return {
    id: `msg-${Date.now()}-${Math.random()}`,
    content: "This is a test message",
    userId: "user-123",
    userName: "Test User",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate mock searchable message
 */
export function createMockSearchableMessage(
  overrides?: Partial<SearchableMessage>,
): SearchableMessage {
  return {
    id: `msg-${Date.now()}-${Math.random()}`,
    content: "This is a test message",
    userId: "user-123",
    userName: "Test User",
    channelId: "channel-1",
    channelName: "general",
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Generate a thread of messages for testing
 */
export function createMockThread(
  messageCount: number,
  options?: {
    startTime?: Date;
    participants?: string[];
    contentPrefix?: string;
  },
): Message[] {
  const messages: Message[] = [];
  const startTime = options?.startTime || new Date(Date.now() - 3600000); // 1 hour ago
  const participants = options?.participants || ["user-1", "user-2", "user-3"];

  for (let i = 0; i < messageCount; i++) {
    const timestamp = new Date(startTime.getTime() + i * 60000); // 1 minute apart
    const userId = participants[i % participants.length];

    messages.push({
      id: `msg-${i}`,
      content: `${options?.contentPrefix || "Message"} ${i + 1}`,
      userId,
      userName: `User ${userId}`,
      createdAt: timestamp.toISOString(),
    });
  }

  return messages;
}

/**
 * Create a conversation thread with realistic content
 */
export function createRealisticThread(): Message[] {
  return [
    {
      id: "msg-1",
      content: "Hey team, we need to discuss the new feature release",
      userId: "user-1",
      userName: "Alice",
      createdAt: new Date("2024-01-30T10:00:00Z").toISOString(),
    },
    {
      id: "msg-2",
      content: "Sure, what's the timeline?",
      userId: "user-2",
      userName: "Bob",
      createdAt: new Date("2024-01-30T10:01:00Z").toISOString(),
    },
    {
      id: "msg-3",
      content:
        "We need to ship by end of week. The main tasks are: 1) Fix the authentication bug, 2) Add new dashboard widgets, 3) Write documentation",
      userId: "user-1",
      userName: "Alice",
      createdAt: new Date("2024-01-30T10:02:00Z").toISOString(),
    },
    {
      id: "msg-4",
      content: "I can take the auth bug. Bob, can you handle the widgets?",
      userId: "user-3",
      userName: "Charlie",
      createdAt: new Date("2024-01-30T10:03:00Z").toISOString(),
    },
    {
      id: "msg-5",
      content: "Sounds good! I will work on the dashboard widgets today",
      userId: "user-2",
      userName: "Bob",
      createdAt: new Date("2024-01-30T10:04:00Z").toISOString(),
    },
    {
      id: "msg-6",
      content:
        "Great! I'll handle the documentation once the features are done",
      userId: "user-1",
      userName: "Alice",
      createdAt: new Date("2024-01-30T10:05:00Z").toISOString(),
    },
    {
      id: "msg-7",
      content: "Perfect, we have a plan. Thanks everyone!",
      userId: "user-1",
      userName: "Alice",
      createdAt: new Date("2024-01-30T10:06:00Z").toISOString(),
    },
  ];
}

// ============================================================================
// Mock AI API Responses
// ============================================================================

/**
 * Mock OpenAI chat completion response
 */
export function createMockOpenAIResponse(
  content: string,
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  },
) {
  return {
    id: "chatcmpl-123",
    object: "chat.completion",
    created: Date.now(),
    model: "gpt-4-turbo-preview",
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
        },
        finish_reason: "stop",
      },
    ],
    usage: usage || {
      prompt_tokens: 50,
      completion_tokens: 20,
      total_tokens: 70,
    },
  };
}

/**
 * Mock OpenAI embeddings response
 */
export function createMockOpenAIEmbedding(dimension: number = 1536) {
  return {
    object: "list",
    data: [
      {
        object: "embedding",
        embedding: Array(dimension)
          .fill(0)
          .map(() => Math.random() - 0.5),
        index: 0,
      },
    ],
    model: "text-embedding-3-small",
    usage: {
      prompt_tokens: 8,
      total_tokens: 8,
    },
  };
}

/**
 * Mock Anthropic messages response
 */
export function createMockAnthropicResponse(
  content: string,
  usage?: {
    input_tokens: number;
    output_tokens: number;
  },
) {
  return {
    id: "msg-123",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: content,
      },
    ],
    model: "claude-3-5-haiku-20241022",
    stop_reason: "end_turn",
    usage: usage || {
      input_tokens: 50,
      output_tokens: 20,
    },
  };
}

// ============================================================================
// Mock Fetch Setup
// ============================================================================

/**
 * Setup mock fetch for OpenAI API
 */
export function setupMockOpenAI(responses: {
  chat?: string;
  embedding?: number[];
}) {
  const mockFetch = jest.fn();

  mockFetch.mockImplementation((url: string, options: any) => {
    if (url.includes("/chat/completions")) {
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve(
            createMockOpenAIResponse(responses.chat || "Test response"),
          ),
      });
    } else if (url.includes("/embeddings")) {
      const embedding =
        responses.embedding ||
        Array(1536)
          .fill(0)
          .map(() => Math.random());
      return Promise.resolve({
        ok: true,
        json: () =>
          Promise.resolve({
            object: "list",
            data: [{ object: "embedding", embedding, index: 0 }],
            model: "text-embedding-3-small",
            usage: { prompt_tokens: 8, total_tokens: 8 },
          }),
      });
    }

    return Promise.reject(new Error("Unknown endpoint"));
  });

  global.fetch = mockFetch;
  return mockFetch;
}

/**
 * Setup mock fetch for Anthropic API
 */
export function setupMockAnthropic(response: string) {
  const mockFetch = jest.fn();

  mockFetch.mockResolvedValue({
    ok: true,
    json: () => Promise.resolve(createMockAnthropicResponse(response)),
  });

  global.fetch = mockFetch;
  return mockFetch;
}

/**
 * Setup mock fetch that fails
 */
export function setupMockAPIError(
  statusCode: number = 500,
  message: string = "API Error",
) {
  const mockFetch = jest.fn();

  mockFetch.mockResolvedValue({
    ok: false,
    status: statusCode,
    statusText: message,
    json: () => Promise.resolve({ error: message }),
  });

  global.fetch = mockFetch;
  return mockFetch;
}

// ============================================================================
// Test Assertions
// ============================================================================

/**
 * Assert that a TL;DR is valid
 */
export function assertValidTldr(
  tldr: string,
  options?: {
    minLength?: number;
    maxLength?: number;
  },
) {
  expect(tldr).toBeTruthy();
  expect(typeof tldr).toBe("string");
  expect(tldr.length).toBeGreaterThan(options?.minLength || 10);
  if (options?.maxLength) {
    expect(tldr.length).toBeLessThanOrEqual(options.maxLength);
  }
}

/**
 * Assert that key points are valid
 */
export function assertValidKeyPoints(
  keyPoints: string[],
  options?: {
    minCount?: number;
    maxCount?: number;
  },
) {
  expect(keyPoints).toBeTruthy();
  expect(Array.isArray(keyPoints)).toBe(true);
  expect(keyPoints.length).toBeGreaterThanOrEqual(options?.minCount || 1);
  if (options?.maxCount) {
    expect(keyPoints.length).toBeLessThanOrEqual(options.maxCount);
  }
  keyPoints.forEach((point) => {
    expect(point).toBeTruthy();
    expect(typeof point).toBe("string");
  });
}

/**
 * Assert that action items are valid
 */
export function assertValidActionItems(actionItems: any[]) {
  expect(actionItems).toBeTruthy();
  expect(Array.isArray(actionItems)).toBe(true);
  actionItems.forEach((item) => {
    expect(item).toHaveProperty("id");
    expect(item).toHaveProperty("description");
    expect(item).toHaveProperty("status");
    expect(item).toHaveProperty("priority");
    expect(["pending", "in-progress", "completed"]).toContain(item.status);
    expect(["low", "medium", "high"]).toContain(item.priority);
  });
}

/**
 * Assert that search results are valid
 */
export function assertValidSearchResults(
  results: any[],
  options?: {
    minScore?: number;
    hasHighlights?: boolean;
  },
) {
  expect(results).toBeTruthy();
  expect(Array.isArray(results)).toBe(true);
  results.forEach((result) => {
    expect(result).toHaveProperty("message");
    expect(result).toHaveProperty("score");
    expect(result).toHaveProperty("matchType");
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    if (options?.minScore) {
      expect(result.score).toBeGreaterThanOrEqual(options.minScore);
    }
    if (options?.hasHighlights) {
      expect(result).toHaveProperty("highlights");
    }
  });
}

/**
 * Assert that embedding is valid
 */
export function assertValidEmbedding(
  embedding: number[],
  expectedDim?: number,
) {
  expect(embedding).toBeTruthy();
  expect(Array.isArray(embedding)).toBe(true);
  if (expectedDim) {
    expect(embedding.length).toBe(expectedDim);
  }
  embedding.forEach((val) => {
    expect(typeof val).toBe("number");
    expect(isNaN(val)).toBe(false);
  });
}

// ============================================================================
// Environment Helpers
// ============================================================================

/**
 * Setup test environment variables for AI
 */
export function setupAITestEnv(
  provider: "openai" | "anthropic" | "local" = "local",
) {
  const originalEnv = { ...process.env };

  if (provider === "openai") {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.NEXT_PUBLIC_OPENAI_API_KEY = "test-openai-key";
  } else if (provider === "anthropic") {
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY = "test-anthropic-key";
  }

  return () => {
    process.env = originalEnv;
  };
}

/**
 * Clear all AI-related environment variables
 */
export function clearAITestEnv() {
  delete process.env.OPENAI_API_KEY;
  delete process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY;
}

// ============================================================================
// Performance Helpers
// ============================================================================

/**
 * Measure execution time of async function
 */
export async function measureExecutionTime<T>(
  fn: () => Promise<T>,
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;
  return { result, duration };
}

/**
 * Assert that function completes within time limit
 */
export async function assertCompletesWithin<T>(
  fn: () => Promise<T>,
  maxDuration: number,
  message?: string,
): Promise<T> {
  const { result, duration } = await measureExecutionTime(fn);
  expect(duration).toBeLessThan(maxDuration);
  return result;
}
