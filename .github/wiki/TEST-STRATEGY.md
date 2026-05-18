# nchat Test Coverage Strategy

**Version**: 1.0.0
**Last Updated**: February 3, 2026
**Goal**: 100% Test Coverage
**Target Completion**: v1.0.0 Release

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Current Test State Analysis](#2-current-test-state-analysis)
3. [Unit Test Strategy](#3-unit-test-strategy)
4. [Integration Test Strategy](#4-integration-test-strategy)
5. [E2E Test Strategy](#5-e2e-test-strategy)
6. [Test Categories](#6-test-categories)
7. [Coverage Requirements](#7-coverage-requirements)
8. [Test Data Strategy](#8-test-data-strategy)
9. [CI/CD Integration](#9-cicd-integration)
10. [Performance Testing](#10-performance-testing)
11. [Test Naming Conventions](#11-test-naming-conventions)
12. [Appendices](#appendices)

---

## 1. Executive Summary

### Goal

Achieve and maintain 100% test coverage across the nchat codebase, ensuring all code paths are tested with deterministic, non-flaky tests.

### Test Pyramid

```
                    /\
                   /  \
                  / E2E \          <- 10% of tests
                 /  (31)  \
                /----------\
               / Integration \     <- 20% of tests
              /     (12)      \
             /------------------\
            /    Unit Tests      \  <- 70% of tests
           /       (267+)         \
          /------------------------\
```

### Current Coverage Summary

| Category    | Test Files | Source Files | Estimated Coverage |
| ----------- | ---------- | ------------ | ------------------ |
| Components  | 68         | ~150         | ~45%               |
| Stores      | 22         | 54           | ~40%               |
| Hooks       | 30+        | 100+         | ~30%               |
| Lib/Utils   | 9          | 25           | ~35%               |
| API Routes  | 5          | 40+          | ~12%               |
| GraphQL     | 5          | 20+          | ~25%               |
| Contexts    | 4          | 5            | ~80%               |
| Services    | 4          | 10+          | ~40%               |
| **Overall** | **267**    | **~500**     | **~35%**           |

### Gap to 100%

Approximately **400+ new tests** needed across all categories.

---

## 2. Current Test State Analysis

### 2.1 Existing Test Infrastructure

**Test Framework Stack:**

- **Unit/Integration**: Jest 29.7.0 + React Testing Library 16.2.0
- **E2E**: Playwright 1.50.1
- **Mobile E2E**: Detox 20.29.3, Appium 2.15.2
- **Accessibility**: @axe-core/playwright 4.10.2
- **Performance**: Lighthouse CI 0.15.1

**Configuration Files:**

- `/jest.config.js` - Jest configuration with Next.js integration
- `/jest.setup.js` - Test setup with mocks for Next.js, window.matchMedia
- `/playwright.config.ts` - E2E configuration for multi-browser testing
- `/src/__tests__/mocks/handlers.ts` - MSW handlers for API mocking
- `/src/__tests__/utils/test-utils.tsx` - Custom render functions and helpers

### 2.2 Existing Test Locations

```
src/
├── __tests__/
│   ├── integration/           # 12 integration test files
│   │   ├── auth-sessions-presence.integration.test.ts
│   │   ├── bot-webhooks-commands.integration.test.ts
│   │   ├── chat-flow.test.tsx
│   │   ├── file-upload-storage-media.integration.test.ts
│   │   ├── i18n-rtl-formatting.integration.test.ts
│   │   ├── messages-reactions-receipts.integration.test.ts
│   │   ├── notifications-push-badges.integration.test.ts
│   │   ├── offline-sync-cache.integration.test.ts
│   │   ├── platform-native-bridges.integration.test.ts
│   │   ├── search-discovery-indexing.integration.test.ts
│   │   └── wallet-payments-subscriptions.integration.test.ts
│   ├── mocks/
│   │   └── handlers.ts        # MSW mock handlers
│   └── utils/
│       ├── test-helpers.ts    # Test helper functions
│       └── test-utils.tsx     # Custom render utilities
├── components/**/__tests__/   # 68 component test files
├── contexts/__tests__/        # 4 context test files
├── graphql/__tests__/         # 5 GraphQL test files
├── hooks/__tests__/           # 30+ hook test files
├── lib/__tests__/             # 9 utility test files
├── services/auth/__tests__/   # 4 auth service test files
├── stores/__tests__/          # 22 store test files
└── app/api/__tests__/         # 5 API route test files

e2e/                           # 31 E2E test files
├── auth.spec.ts
├── chat.spec.ts
├── admin.spec.ts
├── calls.spec.ts
├── setup-wizard.spec.ts
├── payments.spec.ts
├── search.spec.ts
├── bots.spec.ts
├── wallet.spec.ts
├── offline.spec.ts
├── i18n.spec.ts
├── accessibility.spec.ts
├── advanced-messaging.spec.ts
├── settings.spec.ts
├── channel-management.spec.ts
├── message-sending.spec.ts
├── visual-regression.spec.ts
├── semantic-search.spec.ts
├── bot-management.spec.ts
├── moderation-workflow.spec.ts
├── ai-summarization.spec.ts
└── mobile/                    # 10 mobile-specific E2E tests
    ├── auth.spec.ts
    ├── messaging.spec.ts
    ├── channels.spec.ts
    ├── search.spec.ts
    ├── attachments.spec.ts
    ├── notifications.spec.ts
    ├── offline.spec.ts
    ├── deep-linking.spec.ts
    ├── network.spec.ts
    └── performance.spec.ts
```

### 2.3 Identified Gaps

#### Components Missing Tests

- `src/components/admin/` - Partial coverage
- `src/components/billing/` - No tests
- `src/components/compliance/` - No tests
- `src/components/polls/` - No tests
- `src/components/scheduled-messages/` - No tests
- `src/components/stickers/` - No tests
- `src/components/voice-messages/` - No tests
- `src/components/workflow/` - No tests

#### Stores Missing Tests

- `src/stores/analytics-store.ts`
- `src/stores/app-store.ts`
- `src/stores/audit-store.ts`
- `src/stores/compliance-store.ts`
- `src/stores/connection-store.ts`
- `src/stores/meeting-store.ts`
- `src/stores/offline-store.ts`
- `src/stores/payment-store.ts`
- `src/stores/preferences-store.ts`
- `src/stores/settings-store.ts`
- `src/stores/thread-store.ts`
- `src/stores/wallet-store.ts`
- `src/stores/white-label-store.ts`
- `src/stores/workflow-builder-store.ts`

#### Hooks Missing Tests

- 60+ hooks lack test coverage
- Critical gaps: `use-e2ee.ts`, `use-tokens.ts`, `use-transactions.ts`

#### API Routes Missing Tests

- 35+ API routes lack test coverage
- Critical: Payment routes, webhook routes, admin routes

---

## 3. Unit Test Strategy

### 3.1 Principles

1. **Isolation**: Each test should test one unit in isolation
2. **Determinism**: Tests must produce the same result every run
3. **Speed**: Unit tests should execute in < 100ms each
4. **Independence**: Tests should not depend on execution order
5. **Clarity**: Test names should describe the expected behavior

### 3.2 Component Testing

#### Pattern: React Testing Library + Jest

```typescript
// src/components/chat/__tests__/message-item.test.tsx
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageItem } from '../message-item'
import { createTestMessage } from '@/__tests__/utils/test-utils'

describe('MessageItem', () => {
  // Group: Rendering
  describe('rendering', () => {
    it('renders message content correctly', () => {
      const message = createTestMessage({ content: 'Hello World' })
      render(<MessageItem message={message} />)
      expect(screen.getByText('Hello World')).toBeInTheDocument()
    })

    it('renders author name', () => {
      const message = createTestMessage({
        user: { displayName: 'Test User' }
      })
      render(<MessageItem message={message} />)
      expect(screen.getByText('Test User')).toBeInTheDocument()
    })

    it('shows edited indicator when message is edited', () => {
      const message = createTestMessage({ isEdited: true })
      render(<MessageItem message={message} />)
      expect(screen.getByText(/edited/i)).toBeInTheDocument()
    })
  })

  // Group: Interactions
  describe('interactions', () => {
    it('calls onReact when reaction button is clicked', async () => {
      const user = userEvent.setup()
      const onReact = jest.fn()
      const message = createTestMessage()
      render(<MessageItem message={message} onReact={onReact} />)

      await user.click(screen.getByRole('button', { name: /react/i }))
      expect(onReact).toHaveBeenCalledWith(message.id, expect.any(String))
    })

    it('enters edit mode when edit button is clicked', async () => {
      const user = userEvent.setup()
      const message = createTestMessage()
      render(<MessageItem message={message} canEdit={true} />)

      await user.click(screen.getByRole('button', { name: /edit/i }))
      expect(screen.getByRole('textbox')).toHaveValue(message.content)
    })
  })

  // Group: Edge Cases
  describe('edge cases', () => {
    it('handles empty content gracefully', () => {
      const message = createTestMessage({ content: '' })
      render(<MessageItem message={message} />)
      expect(screen.getByTestId('message-item')).toBeInTheDocument()
    })

    it('handles very long content with truncation', () => {
      const longContent = 'a'.repeat(10000)
      const message = createTestMessage({ content: longContent })
      render(<MessageItem message={message} />)
      expect(screen.getByTestId('message-content')).toBeInTheDocument()
    })

    it('handles special characters in content', () => {
      const message = createTestMessage({ content: '<script>alert("xss")</script>' })
      render(<MessageItem message={message} />)
      expect(screen.queryByRole('script')).not.toBeInTheDocument()
    })
  })

  // Group: Accessibility
  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      const message = createTestMessage()
      render(<MessageItem message={message} />)
      expect(screen.getByRole('article')).toHaveAttribute('aria-label')
    })

    it('is keyboard navigable', async () => {
      const user = userEvent.setup()
      const message = createTestMessage()
      render(<MessageItem message={message} />)

      await user.tab()
      expect(screen.getByTestId('message-item')).toHaveFocus()
    })
  })
})
```

### 3.3 Hook Testing

#### Pattern: @testing-library/react-hooks Pattern

```typescript
// src/hooks/__tests__/use-messages.test.ts
import { renderHook, act, waitFor } from '@testing-library/react'
import { useMessages } from '../use-messages'
import { useMessageStore } from '@/stores/message-store'

// Mock the store
jest.mock('@/stores/message-store')

describe('useMessages', () => {
  const mockStore = {
    messagesByChannel: {},
    fetchMessages: jest.fn(),
    sendMessage: jest.fn(),
    isLoading: false,
    error: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useMessageStore as unknown as jest.Mock).mockReturnValue(mockStore)
  })

  describe('initialization', () => {
    it('returns empty array when no channel selected', () => {
      const { result } = renderHook(() => useMessages(null))
      expect(result.current.messages).toEqual([])
    })

    it('fetches messages when channel ID is provided', async () => {
      mockStore.fetchMessages.mockResolvedValue([])
      const { result } = renderHook(() => useMessages('channel-1'))

      await waitFor(() => {
        expect(mockStore.fetchMessages).toHaveBeenCalledWith('channel-1')
      })
    })
  })

  describe('sendMessage', () => {
    it('calls store sendMessage with correct parameters', async () => {
      mockStore.sendMessage.mockResolvedValue({ id: 'msg-1' })
      const { result } = renderHook(() => useMessages('channel-1'))

      await act(async () => {
        await result.current.sendMessage('Hello World')
      })

      expect(mockStore.sendMessage).toHaveBeenCalledWith('channel-1', 'Hello World')
    })

    it('returns the sent message', async () => {
      const sentMessage = { id: 'msg-1', content: 'Hello' }
      mockStore.sendMessage.mockResolvedValue(sentMessage)
      const { result } = renderHook(() => useMessages('channel-1'))

      let returnedMessage
      await act(async () => {
        returnedMessage = await result.current.sendMessage('Hello')
      })

      expect(returnedMessage).toEqual(sentMessage)
    })

    it('handles send failure gracefully', async () => {
      mockStore.sendMessage.mockRejectedValue(new Error('Network error'))
      const { result } = renderHook(() => useMessages('channel-1'))

      await expect(result.current.sendMessage('Hello')).rejects.toThrow('Network error')
    })
  })

  describe('loading state', () => {
    it('reflects loading state from store', () => {
      mockStore.isLoading = true
      const { result } = renderHook(() => useMessages('channel-1'))
      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('error handling', () => {
    it('exposes store errors', () => {
      mockStore.error = 'Failed to fetch'
      const { result } = renderHook(() => useMessages('channel-1'))
      expect(result.current.error).toBe('Failed to fetch')
    })
  })
})
```

### 3.4 Store Testing

#### Pattern: Zustand Store Testing

```typescript
// src/stores/__tests__/message-store.test.ts
import { act } from '@testing-library/react'
import { useMessageStore, MessageStore } from '../message-store'

describe('MessageStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    act(() => {
      useMessageStore.getState().reset()
    })
  })

  describe('initial state', () => {
    it('has empty messagesByChannel', () => {
      const state = useMessageStore.getState()
      expect(state.messagesByChannel).toEqual({})
    })

    it('has null currentChannelId', () => {
      const state = useMessageStore.getState()
      expect(state.currentChannelId).toBeNull()
    })

    it('has isLoading set to false', () => {
      const state = useMessageStore.getState()
      expect(state.isLoading).toBe(false)
    })
  })

  describe('setMessages', () => {
    it('sets messages for a channel', () => {
      const messages = [
        { id: 'msg-1', content: 'Hello' },
        { id: 'msg-2', content: 'World' },
      ]

      act(() => {
        useMessageStore.getState().setMessages('channel-1', messages)
      })

      const state = useMessageStore.getState()
      expect(state.messagesByChannel['channel-1']).toEqual(messages)
    })

    it('does not affect other channels', () => {
      const existingMessages = [{ id: 'msg-0', content: 'Existing' }]
      const newMessages = [{ id: 'msg-1', content: 'New' }]

      act(() => {
        useMessageStore.getState().setMessages('channel-1', existingMessages)
        useMessageStore.getState().setMessages('channel-2', newMessages)
      })

      const state = useMessageStore.getState()
      expect(state.messagesByChannel['channel-1']).toEqual(existingMessages)
      expect(state.messagesByChannel['channel-2']).toEqual(newMessages)
    })
  })

  describe('addMessage', () => {
    it('adds message to existing channel', () => {
      const existingMessage = { id: 'msg-1', content: 'Existing' }
      const newMessage = { id: 'msg-2', content: 'New' }

      act(() => {
        useMessageStore.getState().setMessages('channel-1', [existingMessage])
        useMessageStore.getState().addMessage('channel-1', newMessage)
      })

      const state = useMessageStore.getState()
      expect(state.messagesByChannel['channel-1']).toHaveLength(2)
      expect(state.messagesByChannel['channel-1'][1]).toEqual(newMessage)
    })

    it('creates channel array if not exists', () => {
      const newMessage = { id: 'msg-1', content: 'New' }

      act(() => {
        useMessageStore.getState().addMessage('new-channel', newMessage)
      })

      const state = useMessageStore.getState()
      expect(state.messagesByChannel['new-channel']).toEqual([newMessage])
    })

    it('prevents duplicate messages', () => {
      const message = { id: 'msg-1', content: 'Hello' }

      act(() => {
        useMessageStore.getState().addMessage('channel-1', message)
        useMessageStore.getState().addMessage('channel-1', message)
      })

      const state = useMessageStore.getState()
      expect(state.messagesByChannel['channel-1']).toHaveLength(1)
    })
  })

  describe('updateMessage', () => {
    it('updates existing message', () => {
      const message = { id: 'msg-1', content: 'Original' }

      act(() => {
        useMessageStore.getState().setMessages('channel-1', [message])
        useMessageStore.getState().updateMessage('channel-1', 'msg-1', {
          content: 'Updated',
        })
      })

      const state = useMessageStore.getState()
      expect(state.messagesByChannel['channel-1'][0].content).toBe('Updated')
    })

    it('preserves other message properties', () => {
      const message = { id: 'msg-1', content: 'Original', userId: 'user-1' }

      act(() => {
        useMessageStore.getState().setMessages('channel-1', [message])
        useMessageStore.getState().updateMessage('channel-1', 'msg-1', {
          content: 'Updated',
        })
      })

      const state = useMessageStore.getState()
      expect(state.messagesByChannel['channel-1'][0].userId).toBe('user-1')
    })

    it('handles non-existent message gracefully', () => {
      act(() => {
        useMessageStore.getState().setMessages('channel-1', [])
        useMessageStore.getState().updateMessage('channel-1', 'non-existent', {
          content: 'Updated',
        })
      })

      const state = useMessageStore.getState()
      expect(state.messagesByChannel['channel-1']).toEqual([])
    })
  })

  describe('deleteMessage', () => {
    it('removes message from channel', () => {
      const messages = [
        { id: 'msg-1', content: 'First' },
        { id: 'msg-2', content: 'Second' },
      ]

      act(() => {
        useMessageStore.getState().setMessages('channel-1', messages)
        useMessageStore.getState().deleteMessage('channel-1', 'msg-1')
      })

      const state = useMessageStore.getState()
      expect(state.messagesByChannel['channel-1']).toHaveLength(1)
      expect(state.messagesByChannel['channel-1'][0].id).toBe('msg-2')
    })
  })

  describe('addReaction', () => {
    it('adds reaction to message', () => {
      const message = { id: 'msg-1', content: 'Hello', reactions: [] }
      const reaction = { emoji: '👍', count: 1, users: ['user-1'], hasReacted: true }

      act(() => {
        useMessageStore.getState().setMessages('channel-1', [message])
        useMessageStore.getState().addReaction('channel-1', 'msg-1', reaction)
      })

      const state = useMessageStore.getState()
      expect(state.messagesByChannel['channel-1'][0].reactions).toContainEqual(reaction)
    })
  })

  describe('reset', () => {
    it('resets store to initial state', () => {
      act(() => {
        useMessageStore.getState().setMessages('channel-1', [{ id: 'msg-1' }])
        useMessageStore.getState().setCurrentChannel('channel-1')
        useMessageStore.getState().reset()
      })

      const state = useMessageStore.getState()
      expect(state.messagesByChannel).toEqual({})
      expect(state.currentChannelId).toBeNull()
    })
  })
})
```

### 3.5 Utility/Library Testing

#### Pattern: Pure Function Testing

```typescript
// src/lib/__tests__/utils.test.ts
import { cn, formatDate, truncate, sanitizeHtml } from '../utils'

describe('cn (classnames)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('handles undefined values', () => {
    expect(cn('foo', undefined, 'bar')).toBe('foo bar')
  })

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-4', 'px-6')).toBe('px-6')
  })

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })
})

describe('formatDate', () => {
  it('formats date with default format', () => {
    const date = new Date('2026-02-03T12:00:00Z')
    expect(formatDate(date)).toMatch(/Feb.*2026/)
  })

  it('handles ISO string input', () => {
    const result = formatDate('2026-02-03T12:00:00Z')
    expect(result).toBeTruthy()
  })

  it('handles timestamp input', () => {
    const result = formatDate(1738584000000)
    expect(result).toBeTruthy()
  })

  it('returns "Invalid Date" for invalid input', () => {
    expect(formatDate('not-a-date')).toBe('Invalid Date')
  })
})

describe('truncate', () => {
  it('truncates long strings', () => {
    expect(truncate('Hello World', 5)).toBe('Hello...')
  })

  it('does not truncate short strings', () => {
    expect(truncate('Hi', 10)).toBe('Hi')
  })

  it('handles exact length', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })

  it('handles empty string', () => {
    expect(truncate('', 5)).toBe('')
  })

  it('uses custom suffix', () => {
    expect(truncate('Hello World', 5, '---')).toBe('Hello---')
  })
})

describe('sanitizeHtml', () => {
  it('removes script tags', () => {
    expect(sanitizeHtml('<script>alert("xss")</script>')).not.toContain('script')
  })

  it('preserves allowed tags', () => {
    expect(sanitizeHtml('<p>Hello</p>')).toContain('<p>')
  })

  it('removes onclick attributes', () => {
    expect(sanitizeHtml('<div onclick="alert()">Click</div>')).not.toContain('onclick')
  })

  it('handles nested dangerous content', () => {
    const input = '<div><script>evil()</script><p>Safe</p></div>'
    const result = sanitizeHtml(input)
    expect(result).not.toContain('script')
    expect(result).toContain('Safe')
  })
})
```

### 3.6 API Route Testing

#### Pattern: Next.js Route Handler Testing

```typescript
// src/app/api/__tests__/messages.test.ts
import { NextRequest } from 'next/server'
import { GET, POST, DELETE } from '../messages/route'

// Mock dependencies
jest.mock('@/lib/apollo-server', () => ({
  executeQuery: jest.fn(),
  executeMutation: jest.fn(),
}))

jest.mock('@/services/auth/auth-service', () => ({
  validateToken: jest.fn(),
}))

import { executeQuery, executeMutation } from '@/lib/apollo-server'
import { validateToken } from '@/services/auth/auth-service'

describe('/api/messages', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('GET', () => {
    it('returns messages for channel', async () => {
      const messages = [{ id: 'msg-1', content: 'Hello' }]
      ;(validateToken as jest.Mock).mockResolvedValue({ userId: 'user-1' })
      ;(executeQuery as jest.Mock).mockResolvedValue({ data: { messages } })

      const request = new NextRequest('http://localhost/api/messages?channelId=ch-1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.messages).toEqual(messages)
    })

    it('returns 400 when channelId is missing', async () => {
      ;(validateToken as jest.Mock).mockResolvedValue({ userId: 'user-1' })

      const request = new NextRequest('http://localhost/api/messages')
      const response = await GET(request)

      expect(response.status).toBe(400)
    })

    it('returns 401 when not authenticated', async () => {
      ;(validateToken as jest.Mock).mockResolvedValue(null)

      const request = new NextRequest('http://localhost/api/messages?channelId=ch-1')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })

    it('handles pagination parameters', async () => {
      ;(validateToken as jest.Mock).mockResolvedValue({ userId: 'user-1' })
      ;(executeQuery as jest.Mock).mockResolvedValue({ data: { messages: [] } })

      const request = new NextRequest(
        'http://localhost/api/messages?channelId=ch-1&limit=10&offset=20'
      )
      await GET(request)

      expect(executeQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 10, offset: 20 })
      )
    })
  })

  describe('POST', () => {
    it('creates a new message', async () => {
      const newMessage = { id: 'msg-1', content: 'New message' }
      ;(validateToken as jest.Mock).mockResolvedValue({ userId: 'user-1' })
      ;(executeMutation as jest.Mock).mockResolvedValue({ data: { message: newMessage } })

      const request = new NextRequest('http://localhost/api/messages', {
        method: 'POST',
        body: JSON.stringify({ channelId: 'ch-1', content: 'New message' }),
      })
      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.message).toEqual(newMessage)
    })

    it('returns 400 for empty content', async () => {
      ;(validateToken as jest.Mock).mockResolvedValue({ userId: 'user-1' })

      const request = new NextRequest('http://localhost/api/messages', {
        method: 'POST',
        body: JSON.stringify({ channelId: 'ch-1', content: '' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('returns 400 for missing channelId', async () => {
      ;(validateToken as jest.Mock).mockResolvedValue({ userId: 'user-1' })

      const request = new NextRequest('http://localhost/api/messages', {
        method: 'POST',
        body: JSON.stringify({ content: 'Hello' }),
      })
      const response = await POST(request)

      expect(response.status).toBe(400)
    })
  })

  describe('DELETE', () => {
    it('deletes a message', async () => {
      ;(validateToken as jest.Mock).mockResolvedValue({ userId: 'user-1' })
      ;(executeMutation as jest.Mock).mockResolvedValue({ data: { success: true } })

      const request = new NextRequest('http://localhost/api/messages?id=msg-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request)

      expect(response.status).toBe(200)
    })

    it('returns 403 when user does not own message', async () => {
      ;(validateToken as jest.Mock).mockResolvedValue({ userId: 'user-1' })
      ;(executeMutation as jest.Mock).mockRejectedValue(new Error('Forbidden'))

      const request = new NextRequest('http://localhost/api/messages?id=msg-1', {
        method: 'DELETE',
      })
      const response = await DELETE(request)

      expect(response.status).toBe(403)
    })
  })
})
```

---

## 4. Integration Test Strategy

### 4.1 Principles

1. **Real Interactions**: Test actual component/store interactions
2. **Minimal Mocking**: Only mock external APIs and services
3. **Realistic Scenarios**: Tests should mirror actual user workflows
4. **Data Flow**: Verify data flows correctly through the system

### 4.2 Multi-Component Integration Tests

```typescript
// src/__tests__/integration/chat-complete-flow.test.tsx
import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useMessageStore } from '@/stores/message-store'
import { useChannelStore } from '@/stores/channel-store'
import { ChatPage } from '@/app/chat/page'
import { TestProviders } from '../utils/test-utils'

// Setup MSW for API mocking
import { setupServer } from 'msw/node'
import { handlers } from '../mocks/handlers'

const server = setupServer(...handlers)

beforeAll(() => server.listen())
afterEach(() => {
  server.resetHandlers()
  useMessageStore.getState().reset()
  useChannelStore.getState().resetChannelStore()
})
afterAll(() => server.close())

describe('Chat Page Integration', () => {
  describe('Channel Selection Flow', () => {
    it('loads and displays channels on mount', async () => {
      render(<ChatPage />, { wrapper: TestProviders })

      await waitFor(() => {
        expect(screen.getByText('general')).toBeInTheDocument()
        expect(screen.getByText('random')).toBeInTheDocument()
      })
    })

    it('loads messages when channel is selected', async () => {
      const user = userEvent.setup()
      render(<ChatPage />, { wrapper: TestProviders })

      await waitFor(() => {
        expect(screen.getByText('general')).toBeInTheDocument()
      })

      await user.click(screen.getByText('general'))

      await waitFor(() => {
        expect(screen.getByText('Welcome to the channel!')).toBeInTheDocument()
      })
    })

    it('updates URL when channel is selected', async () => {
      const user = userEvent.setup()
      render(<ChatPage />, { wrapper: TestProviders })

      await user.click(await screen.findByText('general'))

      await waitFor(() => {
        expect(window.location.pathname).toContain('/chat/general')
      })
    })
  })

  describe('Message Sending Flow', () => {
    it('sends message and displays it in the list', async () => {
      const user = userEvent.setup()
      render(<ChatPage />, { wrapper: TestProviders })

      // Select a channel
      await user.click(await screen.findByText('general'))

      // Type and send message
      const input = await screen.findByPlaceholderText(/type a message/i)
      await user.type(input, 'Hello from integration test!')
      await user.click(screen.getByRole('button', { name: /send/i }))

      // Verify message appears
      await waitFor(() => {
        expect(screen.getByText('Hello from integration test!')).toBeInTheDocument()
      })
    })

    it('clears input after sending', async () => {
      const user = userEvent.setup()
      render(<ChatPage />, { wrapper: TestProviders })

      await user.click(await screen.findByText('general'))

      const input = await screen.findByPlaceholderText(/type a message/i)
      await user.type(input, 'Test message')
      await user.click(screen.getByRole('button', { name: /send/i }))

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('shows sending indicator', async () => {
      const user = userEvent.setup()
      render(<ChatPage />, { wrapper: TestProviders })

      await user.click(await screen.findByText('general'))

      const input = await screen.findByPlaceholderText(/type a message/i)
      await user.type(input, 'Test message')

      // Don't await the click to catch the sending state
      user.click(screen.getByRole('button', { name: /send/i }))

      // Check for sending indicator (may be brief)
      // Implementation depends on UI design
    })
  })

  describe('Reactions Flow', () => {
    it('adds reaction to message', async () => {
      const user = userEvent.setup()
      render(<ChatPage />, { wrapper: TestProviders })

      await user.click(await screen.findByText('general'))

      await waitFor(() => {
        expect(screen.getByText('Welcome to the channel!')).toBeInTheDocument()
      })

      // Find and click reaction button
      const messageItem = screen.getByText('Welcome to the channel!').closest('[data-testid="message-item"]')
      const reactionButton = within(messageItem!).getByRole('button', { name: /react/i })
      await user.click(reactionButton)

      // Select emoji
      await user.click(screen.getByText('👍'))

      // Verify reaction appears
      await waitFor(() => {
        expect(within(messageItem!).getByText('👍')).toBeInTheDocument()
      })
    })
  })

  describe('Channel Switching with Message Persistence', () => {
    it('preserves messages when switching channels', async () => {
      const user = userEvent.setup()
      render(<ChatPage />, { wrapper: TestProviders })

      // Go to general, send message
      await user.click(await screen.findByText('general'))
      const input = await screen.findByPlaceholderText(/type a message/i)
      await user.type(input, 'Message in general')
      await user.click(screen.getByRole('button', { name: /send/i }))

      await waitFor(() => {
        expect(screen.getByText('Message in general')).toBeInTheDocument()
      })

      // Switch to random
      await user.click(screen.getByText('random'))

      await waitFor(() => {
        expect(screen.queryByText('Message in general')).not.toBeInTheDocument()
      })

      // Switch back to general
      await user.click(screen.getByText('general'))

      await waitFor(() => {
        expect(screen.getByText('Message in general')).toBeInTheDocument()
      })
    })
  })
})
```

### 4.3 Authentication Integration Tests

```typescript
// src/__tests__/integration/auth-flow.test.tsx
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SignInPage } from '@/app/auth/signin/page'
import { ProtectedPage } from '@/app/chat/page'
import { AuthProvider } from '@/contexts/auth-context'
import { setupServer } from 'msw/node'
import { http, HttpResponse } from 'msw'

const server = setupServer(
  http.post('/api/auth/signin', async ({ request }) => {
    const body = await request.json()
    if (body.email === 'valid@test.com') {
      return HttpResponse.json({
        user: { id: 'user-1', email: 'valid@test.com' },
        token: 'valid-token',
      })
    }
    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())

describe('Authentication Flow', () => {
  describe('Sign In', () => {
    it('successfully signs in with valid credentials', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider>
          <SignInPage />
        </AuthProvider>
      )

      await user.type(screen.getByLabelText(/email/i), 'valid@test.com')
      await user.type(screen.getByLabelText(/password/i), 'password123')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(window.location.pathname).toBe('/chat')
      })
    })

    it('shows error for invalid credentials', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider>
          <SignInPage />
        </AuthProvider>
      )

      await user.type(screen.getByLabelText(/email/i), 'invalid@test.com')
      await user.type(screen.getByLabelText(/password/i), 'wrongpassword')
      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
      })
    })

    it('validates required fields', async () => {
      const user = userEvent.setup()
      render(
        <AuthProvider>
          <SignInPage />
        </AuthProvider>
      )

      await user.click(screen.getByRole('button', { name: /sign in/i }))

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/password is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('Protected Routes', () => {
    it('redirects to login when not authenticated', async () => {
      render(
        <AuthProvider initialUser={null}>
          <ProtectedPage />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(window.location.pathname).toBe('/auth/signin')
      })
    })

    it('allows access when authenticated', async () => {
      render(
        <AuthProvider initialUser={{ id: 'user-1', email: 'test@test.com' }}>
          <ProtectedPage />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('chat-page')).toBeInTheDocument()
      })
    })
  })

  describe('Session Persistence', () => {
    it('restores session from storage', async () => {
      localStorage.setItem('auth-token', 'valid-token')

      render(
        <AuthProvider>
          <ProtectedPage />
        </AuthProvider>
      )

      await waitFor(() => {
        expect(screen.getByTestId('chat-page')).toBeInTheDocument()
      })
    })
  })
})
```

### 4.4 GraphQL Integration Tests

```typescript
// src/graphql/__tests__/operations.integration.test.ts
import { ApolloClient, InMemoryCache, HttpLink } from '@apollo/client'
import { setupServer } from 'msw/node'
import { graphql, HttpResponse } from 'msw'
import { GET_CHANNELS, GET_MESSAGES, SEND_MESSAGE, CREATE_CHANNEL } from '../queries'

const server = setupServer(
  graphql.query('GetChannels', () => {
    return HttpResponse.json({
      data: {
        channels: [
          { id: 'ch-1', name: 'general' },
          { id: 'ch-2', name: 'random' },
        ],
      },
    })
  }),
  graphql.query('GetMessages', ({ variables }) => {
    return HttpResponse.json({
      data: {
        messages: [{ id: 'msg-1', content: 'Hello', channelId: variables.channelId }],
      },
    })
  }),
  graphql.mutation('SendMessage', ({ variables }) => {
    return HttpResponse.json({
      data: {
        sendMessage: {
          id: 'msg-new',
          content: variables.content,
          channelId: variables.channelId,
        },
      },
    })
  })
)

let client: ApolloClient<any>

beforeAll(() => {
  server.listen()
  client = new ApolloClient({
    link: new HttpLink({ uri: 'http://localhost/graphql' }),
    cache: new InMemoryCache(),
  })
})

afterEach(() => {
  server.resetHandlers()
  client.clearStore()
})

afterAll(() => server.close())

describe('GraphQL Operations', () => {
  describe('Queries', () => {
    it('fetches channels', async () => {
      const { data } = await client.query({ query: GET_CHANNELS })

      expect(data.channels).toHaveLength(2)
      expect(data.channels[0].name).toBe('general')
    })

    it('fetches messages with variables', async () => {
      const { data } = await client.query({
        query: GET_MESSAGES,
        variables: { channelId: 'ch-1', limit: 50 },
      })

      expect(data.messages).toHaveLength(1)
      expect(data.messages[0].channelId).toBe('ch-1')
    })

    it('handles query errors', async () => {
      server.use(
        graphql.query('GetChannels', () => {
          return HttpResponse.json({
            errors: [{ message: 'Database error' }],
          })
        })
      )

      await expect(client.query({ query: GET_CHANNELS })).rejects.toThrow()
    })
  })

  describe('Mutations', () => {
    it('sends message', async () => {
      const { data } = await client.mutate({
        mutation: SEND_MESSAGE,
        variables: { channelId: 'ch-1', content: 'Test message' },
      })

      expect(data.sendMessage.content).toBe('Test message')
    })

    it('updates cache after mutation', async () => {
      // First fetch messages
      await client.query({
        query: GET_MESSAGES,
        variables: { channelId: 'ch-1' },
      })

      // Send new message with cache update
      await client.mutate({
        mutation: SEND_MESSAGE,
        variables: { channelId: 'ch-1', content: 'New message' },
        update: (cache, { data }) => {
          const existing = cache.readQuery({
            query: GET_MESSAGES,
            variables: { channelId: 'ch-1' },
          })
          cache.writeQuery({
            query: GET_MESSAGES,
            variables: { channelId: 'ch-1' },
            data: {
              messages: [...(existing?.messages || []), data.sendMessage],
            },
          })
        },
      })

      // Verify cache was updated
      const cached = client.readQuery({
        query: GET_MESSAGES,
        variables: { channelId: 'ch-1' },
      })

      expect(cached.messages).toHaveLength(2)
    })
  })
})
```

---

## 5. E2E Test Strategy

### 5.1 Principles

1. **User Perspective**: Tests simulate real user interactions
2. **Critical Paths**: Focus on business-critical user journeys
3. **Stability**: Implement retry mechanisms and proper waits
4. **Isolation**: Each test starts from a clean state
5. **Multi-Browser**: Test across Chrome, Firefox, Safari

### 5.2 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['list'],
    ['junit', { outputFile: 'test-results/e2e-results.xml' }],
    ...(process.env.CI ? [['github'] as const] : []),
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    viewport: { width: 1280, height: 720 },
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  projects: [
    // Setup project
    {
      name: 'setup',
      testMatch: /.*\.setup\.ts/,
    },
    // Desktop browsers
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup'],
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      dependencies: ['setup'],
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      dependencies: ['setup'],
    },
    // Mobile viewports
    {
      name: 'mobile-chrome',
      use: { ...devices['Pixel 5'] },
      dependencies: ['setup'],
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 12'] },
      dependencies: ['setup'],
    },
    // Tablet
    {
      name: 'tablet',
      use: { ...devices['iPad (gen 7)'] },
      dependencies: ['setup'],
    },
  ],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  outputDir: 'test-results/',
})
```

### 5.3 Critical User Flows

#### Authentication E2E Tests

```typescript
// e2e/auth.spec.ts
import { test, expect } from '@playwright/test'

const TEST_USER = {
  email: 'owner@nself.org',
  password: 'password123',
}

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.evaluate(() => {
      localStorage.clear()
      sessionStorage.clear()
    })
  })

  test('complete login flow', async ({ page }) => {
    await page.goto('/login')

    // Fill login form
    await page.fill('[data-testid="email-input"]', TEST_USER.email)
    await page.fill('[data-testid="password-input"]', TEST_USER.password)

    // Submit and wait for navigation
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('**/chat**', { timeout: 10000 })

    // Verify logged in state
    await expect(page.locator('[data-testid="user-avatar"]')).toBeVisible()
  })

  test('logout flow', async ({ page }) => {
    // Login first
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', TEST_USER.email)
    await page.fill('[data-testid="password-input"]', TEST_USER.password)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('**/chat**')

    // Logout
    await page.click('[data-testid="user-menu"]')
    await page.click('[data-testid="logout-button"]')

    // Verify logged out
    await page.waitForURL('**/login**')
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })

  test('session persistence', async ({ page, context }) => {
    // Login
    await page.goto('/login')
    await page.fill('[data-testid="email-input"]', TEST_USER.email)
    await page.fill('[data-testid="password-input"]', TEST_USER.password)
    await page.click('[data-testid="login-button"]')
    await page.waitForURL('**/chat**')

    // Open new tab
    const newPage = await context.newPage()
    await newPage.goto('/chat')

    // Should be logged in
    await expect(newPage.locator('[data-testid="user-avatar"]')).toBeVisible()
  })

  test('protected route redirect', async ({ page }) => {
    await page.goto('/chat')

    // Should redirect to login
    await page.waitForURL('**/login**')
    await expect(page.locator('[data-testid="login-form"]')).toBeVisible()
  })
})
```

#### Messaging E2E Tests

```typescript
// e2e/messaging.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Messaging', () => {
  test.beforeEach(async ({ page }) => {
    // Login using auth state
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
  })

  test('send text message', async ({ page }) => {
    // Select channel
    await page.click('[data-testid="channel-general"]')

    // Type and send message
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Hello from E2E test!')
    await page.click('[data-testid="send-button"]')

    // Verify message appears
    await expect(page.locator('text=Hello from E2E test!')).toBeVisible()
  })

  test('send message with keyboard shortcut', async ({ page }) => {
    await page.click('[data-testid="channel-general"]')

    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Sent with Enter key')
    await messageInput.press('Enter')

    await expect(page.locator('text=Sent with Enter key')).toBeVisible()
  })

  test('edit message', async ({ page }) => {
    await page.click('[data-testid="channel-general"]')

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Original message')
    await page.click('[data-testid="send-button"]')

    // Wait for message to appear
    const message = page.locator('text=Original message')
    await expect(message).toBeVisible()

    // Hover and click edit
    await message.hover()
    await page.click('[data-testid="edit-message-button"]')

    // Edit content
    const editInput = page.locator('[data-testid="edit-input"]')
    await editInput.clear()
    await editInput.fill('Edited message')
    await editInput.press('Enter')

    // Verify edit
    await expect(page.locator('text=Edited message')).toBeVisible()
    await expect(page.locator('text=(edited)')).toBeVisible()
  })

  test('delete message', async ({ page }) => {
    await page.click('[data-testid="channel-general"]')

    // Send message
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Message to delete')
    await page.click('[data-testid="send-button"]')

    const message = page.locator('text=Message to delete')
    await expect(message).toBeVisible()

    // Delete
    await message.hover()
    await page.click('[data-testid="delete-message-button"]')
    await page.click('[data-testid="confirm-delete"]')

    // Verify deleted
    await expect(message).not.toBeVisible()
  })

  test('add reaction', async ({ page }) => {
    await page.click('[data-testid="channel-general"]')

    // Find existing message or send one
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Message to react to')
    await page.click('[data-testid="send-button"]')

    const message = page.locator('text=Message to react to')
    await message.hover()

    // Add reaction
    await page.click('[data-testid="add-reaction-button"]')
    await page.click('text=👍')

    // Verify reaction
    await expect(page.locator('[data-testid="reaction-👍"]')).toBeVisible()
  })

  test('thread reply', async ({ page }) => {
    await page.click('[data-testid="channel-general"]')

    // Send parent message
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Parent message')
    await page.click('[data-testid="send-button"]')

    const parentMessage = page.locator('text=Parent message')
    await parentMessage.hover()

    // Open thread
    await page.click('[data-testid="reply-in-thread"]')

    // Send reply
    const threadInput = page.locator('[data-testid="thread-input"]')
    await threadInput.fill('Thread reply')
    await page.click('[data-testid="send-thread-reply"]')

    // Verify reply
    await expect(page.locator('text=Thread reply')).toBeVisible()
    await expect(page.locator('text=1 reply')).toBeVisible()
  })
})
```

#### Channel Management E2E Tests

```typescript
// e2e/channel-management.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Channel Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')
  })

  test('create new channel', async ({ page }) => {
    // Open create channel modal
    await page.click('[data-testid="create-channel-button"]')

    // Fill form
    await page.fill('[data-testid="channel-name-input"]', 'test-channel')
    await page.fill('[data-testid="channel-description-input"]', 'Test description')

    // Submit
    await page.click('[data-testid="create-channel-submit"]')

    // Verify channel created
    await expect(page.locator('[data-testid="channel-test-channel"]')).toBeVisible()
  })

  test('switch between channels', async ({ page }) => {
    await page.click('[data-testid="channel-general"]')
    await expect(page.locator('[data-testid="channel-header"]')).toContainText('general')

    await page.click('[data-testid="channel-random"]')
    await expect(page.locator('[data-testid="channel-header"]')).toContainText('random')
  })

  test('search channels', async ({ page }) => {
    await page.fill('[data-testid="channel-search"]', 'gen')

    await expect(page.locator('[data-testid="channel-general"]')).toBeVisible()
    await expect(page.locator('[data-testid="channel-random"]')).not.toBeVisible()
  })

  test('channel settings', async ({ page }) => {
    await page.click('[data-testid="channel-general"]')
    await page.click('[data-testid="channel-settings-button"]')

    // Verify settings modal
    await expect(page.locator('[data-testid="channel-settings-modal"]')).toBeVisible()
    await expect(page.locator('[data-testid="channel-name-field"]')).toHaveValue('general')
  })
})
```

### 5.4 Mobile E2E Tests

```typescript
// e2e/mobile/messaging.spec.ts
import { test, expect, devices } from '@playwright/test'

test.use(devices['iPhone 12'])

test.describe('Mobile Messaging', () => {
  test('sends message on mobile', async ({ page }) => {
    await page.goto('/chat')

    // Open channel (may need to open sidebar first on mobile)
    await page.click('[data-testid="mobile-menu-toggle"]')
    await page.click('[data-testid="channel-general"]')

    // Type message
    const messageInput = page.locator('[data-testid="message-input"]')
    await messageInput.fill('Mobile message')
    await page.click('[data-testid="send-button"]')

    await expect(page.locator('text=Mobile message')).toBeVisible()
  })

  test('swipe to reply', async ({ page }) => {
    await page.goto('/chat/general')

    // Find message
    const message = page.locator('[data-testid="message-item"]').first()

    // Simulate swipe right
    const box = await message.boundingBox()
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.mouse.down()
      await page.mouse.move(box.x + box.width, box.y + box.height / 2, { steps: 10 })
      await page.mouse.up()
    }

    // Verify reply mode
    await expect(page.locator('[data-testid="reply-preview"]')).toBeVisible()
  })

  test('pull to refresh', async ({ page }) => {
    await page.goto('/chat/general')

    // Simulate pull down
    await page.mouse.move(200, 200)
    await page.mouse.down()
    await page.mouse.move(200, 400, { steps: 10 })
    await page.mouse.up()

    // Verify refresh indicator appeared
    await expect(page.locator('[data-testid="refresh-indicator"]')).toBeVisible()
  })
})
```

### 5.5 Accessibility E2E Tests

```typescript
// e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test.describe('Accessibility', () => {
  test('login page has no accessibility violations', async ({ page }) => {
    await page.goto('/login')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('chat page has no accessibility violations', async ({ page }) => {
    await page.goto('/chat')

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .exclude('[data-testid="emoji-picker"]') // Known exception
      .analyze()

    expect(accessibilityScanResults.violations).toEqual([])
  })

  test('keyboard navigation works', async ({ page }) => {
    await page.goto('/chat')

    // Tab through main elements
    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="channel-list"]').first()).toBeFocused()

    await page.keyboard.press('Tab')
    await expect(page.locator('[data-testid="message-input"]')).toBeFocused()
  })

  test('screen reader announcements', async ({ page }) => {
    await page.goto('/chat')

    // Verify ARIA live regions exist
    await expect(page.locator('[aria-live="polite"]')).toBeVisible()

    // Send message and verify announcement
    await page.fill('[data-testid="message-input"]', 'Test message')
    await page.click('[data-testid="send-button"]')

    // Check for status announcement
    await expect(page.locator('[role="status"]')).toContainText(/sent/i)
  })
})
```

### 5.6 Visual Regression Tests

```typescript
// e2e/visual-regression.spec.ts
import { test, expect } from '@playwright/test'

test.describe('Visual Regression', () => {
  test('login page matches snapshot', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('login-page.png', {
      maxDiffPixels: 100,
    })
  })

  test('chat page matches snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Wait for messages to load
    await page.waitForSelector('[data-testid="message-list"]')

    await expect(page).toHaveScreenshot('chat-page.png', {
      maxDiffPixels: 100,
    })
  })

  test('dark mode matches snapshot', async ({ page }) => {
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    // Toggle dark mode
    await page.click('[data-testid="theme-toggle"]')
    await page.waitForTimeout(500) // Wait for transition

    await expect(page).toHaveScreenshot('chat-dark-mode.png', {
      maxDiffPixels: 100,
    })
  })

  test('mobile layout matches snapshot', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/chat')
    await page.waitForLoadState('networkidle')

    await expect(page).toHaveScreenshot('chat-mobile.png', {
      maxDiffPixels: 100,
    })
  })
})
```

---

## 6. Test Categories

### 6.1 Authentication Tests

| Test Area                  | Unit | Integration | E2E |
| -------------------------- | ---- | ----------- | --- |
| Login form validation      | Yes  | Yes         | Yes |
| Password visibility toggle | Yes  | No          | Yes |
| Login success flow         | No   | Yes         | Yes |
| Login failure handling     | Yes  | Yes         | Yes |
| Logout flow                | No   | Yes         | Yes |
| Token refresh              | Yes  | Yes         | No  |
| Session persistence        | No   | Yes         | Yes |
| 2FA verification           | Yes  | Yes         | Yes |
| OAuth flows                | No   | Yes         | Yes |
| Password reset             | Yes  | Yes         | Yes |

### 6.2 Messaging Tests

| Test Area            | Unit | Integration | E2E |
| -------------------- | ---- | ----------- | --- |
| Message rendering    | Yes  | Yes         | Yes |
| Send message         | Yes  | Yes         | Yes |
| Edit message         | Yes  | Yes         | Yes |
| Delete message       | Yes  | Yes         | Yes |
| Reactions            | Yes  | Yes         | Yes |
| Threading            | Yes  | Yes         | Yes |
| Mentions             | Yes  | Yes         | Yes |
| Rich text formatting | Yes  | No          | Yes |
| File attachments     | Yes  | Yes         | Yes |
| Link previews        | Yes  | Yes         | Yes |
| Emoji picker         | Yes  | No          | Yes |
| Message search       | Yes  | Yes         | Yes |

### 6.3 Channel Tests

| Test Area           | Unit | Integration | E2E |
| ------------------- | ---- | ----------- | --- |
| Channel list        | Yes  | Yes         | Yes |
| Create channel      | Yes  | Yes         | Yes |
| Delete channel      | Yes  | Yes         | Yes |
| Channel settings    | Yes  | Yes         | Yes |
| Member management   | Yes  | Yes         | Yes |
| Channel permissions | Yes  | Yes         | Yes |
| Private channels    | Yes  | Yes         | Yes |
| Direct messages     | Yes  | Yes         | Yes |

### 6.4 Real-time Tests

| Test Area            | Unit | Integration | E2E |
| -------------------- | ---- | ----------- | --- |
| WebSocket connection | Yes  | Yes         | Yes |
| Message subscription | No   | Yes         | Yes |
| Typing indicators    | Yes  | Yes         | Yes |
| Presence updates     | Yes  | Yes         | Yes |
| Read receipts        | Yes  | Yes         | Yes |
| Connection recovery  | No   | Yes         | Yes |

### 6.5 E2EE Tests

| Test Area           | Unit | Integration | E2E |
| ------------------- | ---- | ----------- | --- |
| Key generation      | Yes  | No          | No  |
| Key exchange        | Yes  | Yes         | No  |
| Message encryption  | Yes  | Yes         | Yes |
| Message decryption  | Yes  | Yes         | Yes |
| Key rotation        | Yes  | Yes         | No  |
| Device verification | Yes  | Yes         | Yes |

### 6.6 Billing Tests

| Test Area               | Unit | Integration | E2E |
| ----------------------- | ---- | ----------- | --- |
| Plan display            | Yes  | Yes         | Yes |
| Plan selection          | Yes  | Yes         | Yes |
| Stripe checkout         | No   | Yes         | Yes |
| Subscription management | Yes  | Yes         | Yes |
| Invoice display         | Yes  | Yes         | Yes |
| Payment methods         | Yes  | Yes         | Yes |
| Webhook processing      | No   | Yes         | No  |

### 6.7 Admin Tests

| Test Area           | Unit | Integration | E2E |
| ------------------- | ---- | ----------- | --- |
| User management     | Yes  | Yes         | Yes |
| Role management     | Yes  | Yes         | Yes |
| Analytics dashboard | Yes  | Yes         | Yes |
| Audit logs          | Yes  | Yes         | Yes |
| Moderation tools    | Yes  | Yes         | Yes |
| System settings     | Yes  | Yes         | Yes |

---

## 7. Coverage Requirements

### 7.1 Coverage Targets

| Metric             | Target | Current | Gap |
| ------------------ | ------ | ------- | --- |
| Line Coverage      | 100%   | ~35%    | 65% |
| Branch Coverage    | 100%   | ~30%    | 70% |
| Function Coverage  | 100%   | ~40%    | 60% |
| Statement Coverage | 100%   | ~35%    | 65% |

### 7.2 Jest Coverage Configuration

```javascript
// jest.config.js
module.exports = {
  // ... existing config
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/_*.{js,jsx,ts,tsx}',
    '!src/**/index.{js,ts}', // Re-exports only
    '!src/types/**/*', // Type definitions
  ],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    // Specific file thresholds (for gradual improvement)
    './src/components/**/*.tsx': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/hooks/**/*.ts': {
      branches: 95,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/stores/**/*.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
    './src/lib/**/*.ts': {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
  coverageReporters: ['text', 'text-summary', 'lcov', 'html', 'json'],
  coverageDirectory: 'coverage',
}
```

### 7.3 Coverage Reporting

```bash
# Generate coverage report
pnpm test:coverage

# Open HTML report
open coverage/lcov-report/index.html

# Check coverage thresholds
pnpm test:coverage --passWithNoTests=false
```

### 7.4 Excluding Code from Coverage

```typescript
// For code that cannot be tested (e.g., environment-specific)
/* istanbul ignore next */
function platformSpecificCode() {
  // ...
}

// For entire files (use sparingly)
/* istanbul ignore file */

// For specific branches
const value = condition ? normalPath : /* istanbul ignore next */ fallbackPath
```

---

## 8. Test Data Strategy

### 8.1 Factory Functions

```typescript
// src/__tests__/factories/index.ts
import { faker } from '@faker-js/faker'
import type { User, Message, Channel, Reaction } from '@/types'

export const createUser = (overrides?: Partial<User>): User => ({
  id: faker.string.uuid(),
  username: faker.internet.userName(),
  displayName: faker.person.fullName(),
  email: faker.internet.email(),
  avatarUrl: faker.image.avatar(),
  role: 'member',
  status: 'online',
  createdAt: faker.date.past().toISOString(),
  ...overrides,
})

export const createMessage = (overrides?: Partial<Message>): Message => ({
  id: faker.string.uuid(),
  channelId: faker.string.uuid(),
  content: faker.lorem.sentence(),
  type: 'text',
  userId: faker.string.uuid(),
  user: createUser(),
  createdAt: new Date(),
  isEdited: false,
  reactions: [],
  ...overrides,
})

export const createChannel = (overrides?: Partial<Channel>): Channel => ({
  id: faker.string.uuid(),
  name: faker.word.noun(),
  slug: faker.helpers.slugify(faker.word.noun()),
  description: faker.lorem.sentence(),
  type: 'public',
  createdBy: faker.string.uuid(),
  createdAt: faker.date.past().toISOString(),
  updatedAt: faker.date.recent().toISOString(),
  memberCount: faker.number.int({ min: 1, max: 100 }),
  isArchived: false,
  isDefault: false,
  ...overrides,
})

export const createReaction = (overrides?: Partial<Reaction>): Reaction => ({
  emoji: faker.helpers.arrayElement(['👍', '❤️', '😂', '🎉', '🤔', '👀']),
  count: faker.number.int({ min: 1, max: 10 }),
  users: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, createUser),
  hasReacted: faker.datatype.boolean(),
  ...overrides,
})
```

### 8.2 Fixtures

```typescript
// src/__tests__/fixtures/channels.ts
export const defaultChannels = [
  {
    id: 'channel-general',
    name: 'general',
    slug: 'general',
    description: 'General discussion',
    type: 'public' as const,
    isDefault: true,
    memberCount: 50,
  },
  {
    id: 'channel-random',
    name: 'random',
    slug: 'random',
    description: 'Random talk',
    type: 'public' as const,
    isDefault: false,
    memberCount: 30,
  },
  {
    id: 'channel-private',
    name: 'private',
    slug: 'private',
    description: 'Private channel',
    type: 'private' as const,
    isDefault: false,
    memberCount: 5,
  },
]

// src/__tests__/fixtures/users.ts
export const testUsers = {
  owner: {
    id: 'user-owner',
    email: 'owner@nself.org',
    username: 'owner',
    displayName: 'Owner',
    role: 'owner' as const,
  },
  admin: {
    id: 'user-admin',
    email: 'admin@nself.org',
    username: 'admin',
    displayName: 'Admin',
    role: 'admin' as const,
  },
  member: {
    id: 'user-member',
    email: 'member@nself.org',
    username: 'member',
    displayName: 'Member',
    role: 'member' as const,
  },
  guest: {
    id: 'user-guest',
    email: 'guest@nself.org',
    username: 'guest',
    displayName: 'Guest',
    role: 'guest' as const,
  },
}
```

### 8.3 MSW Handlers

```typescript
// src/__tests__/mocks/handlers.ts
import { graphql, http, HttpResponse, delay } from 'msw'

export const handlers = [
  // GraphQL handlers
  graphql.query('GetChannels', () => {
    return HttpResponse.json({
      data: { channels: defaultChannels },
    })
  }),

  graphql.query('GetMessages', ({ variables }) => {
    return HttpResponse.json({
      data: {
        messages: generateMessages(variables.channelId, variables.limit),
      },
    })
  }),

  graphql.mutation('SendMessage', async ({ variables }) => {
    await delay(100)
    return HttpResponse.json({
      data: {
        sendMessage: createMessage({
          channelId: variables.channelId,
          content: variables.content,
        }),
      },
    })
  }),

  // REST handlers
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok' })
  }),

  http.post('/api/auth/signin', async ({ request }) => {
    const body = await request.json()
    const user = testUsers[body.email.split('@')[0]]

    if (user && body.password === 'password123') {
      return HttpResponse.json({
        user,
        token: 'mock-token',
      })
    }

    return HttpResponse.json({ error: 'Invalid credentials' }, { status: 401 })
  }),
]
```

### 8.4 Database Seeding (E2E)

```typescript
// scripts/seed-test-db.ts
import { createClient } from '@supabase/supabase-js'
import { testUsers, defaultChannels } from './fixtures'

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!)

async function seedTestDatabase() {
  // Clear existing data
  await supabase.from('messages').delete().neq('id', '')
  await supabase.from('channels').delete().neq('id', '')
  await supabase.from('users').delete().neq('id', '')

  // Insert test users
  await supabase.from('users').insert(Object.values(testUsers))

  // Insert test channels
  await supabase.from('channels').insert(defaultChannels)

  // Insert test messages
  const messages = defaultChannels.flatMap((channel) =>
    Array.from({ length: 10 }, (_, i) => ({
      id: `msg-${channel.id}-${i}`,
      channelId: channel.id,
      content: `Test message ${i} in ${channel.name}`,
      userId: testUsers.member.id,
      createdAt: new Date(Date.now() - i * 60000).toISOString(),
    }))
  )
  await supabase.from('messages').insert(messages)

  console.log('Test database seeded successfully')
}

seedTestDatabase().catch(console.error)
```

---

## 9. CI/CD Integration

### 9.1 GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'

jobs:
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run unit tests with coverage
        run: pnpm test:coverage --ci --maxWorkers=4

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v4
        with:
          token: ${{ secrets.CODECOV_TOKEN }}
          files: ./coverage/lcov.info
          flags: unit
          fail_ci_if_error: true

      - name: Check coverage thresholds
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 100" | bc -l) )); then
            echo "Coverage is $COVERAGE%, below 100% threshold"
            exit 1
          fi

  integration-tests:
    name: Integration Tests
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run integration tests
        run: pnpm test --testPathPattern='integration' --ci

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [unit-tests]
    strategy:
      fail-fast: false
      matrix:
        browser: [chromium, firefox, webkit]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps ${{ matrix.browser }}

      - name: Run E2E tests
        run: pnpm test:e2e --project=${{ matrix.browser }}
        env:
          NEXT_PUBLIC_USE_DEV_AUTH: 'true'

      - name: Upload test results
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-results-${{ matrix.browser }}
          path: |
            playwright-report/
            test-results/
          retention-days: 7

  mobile-e2e:
    name: Mobile E2E Tests
    runs-on: ubuntu-latest
    needs: [unit-tests]
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    strategy:
      matrix:
        device: [mobile-chrome, mobile-safari]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps

      - name: Run mobile E2E tests
        run: pnpm test:e2e --project=${{ matrix.device }} e2e/mobile/

  visual-regression:
    name: Visual Regression
    runs-on: ubuntu-latest
    needs: [unit-tests]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps chromium

      - name: Run visual tests
        run: pnpm test:e2e --project=chromium e2e/visual-regression.spec.ts

      - name: Upload snapshots
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-regression-diff
          path: test-results/
          retention-days: 30

  accessibility:
    name: Accessibility Tests
    runs-on: ubuntu-latest
    needs: [unit-tests]
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Install Playwright
        run: pnpm exec playwright install --with-deps chromium

      - name: Run accessibility tests
        run: pnpm test:e2e --project=chromium e2e/accessibility.spec.ts

  flaky-test-detection:
    name: Flaky Test Detection
    runs-on: ubuntu-latest
    if: github.event_name == 'schedule'
    steps:
      - uses: actions/checkout@v4

      - uses: pnpm/action-setup@v4

      - uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'pnpm'

      - run: pnpm install --frozen-lockfile

      - name: Run tests multiple times
        run: |
          for i in {1..5}; do
            echo "Run $i"
            pnpm test --ci --reporters=jest-junit 2>&1 | tee -a test-runs.log
          done

      - name: Analyze flaky tests
        run: |
          grep -E "(PASS|FAIL)" test-runs.log | sort | uniq -c | sort -n
```

### 9.2 Coverage Badge

```yaml
# In README.md
[![codecov](https://codecov.io/gh/nself/nself-chat/branch/main/graph/badge.svg)](https://codecov.io/gh/nself/nself-chat)
```

### 9.3 Pre-commit Hooks

```json
// package.json
{
  "lint-staged": {
    "src/**/*.{ts,tsx}": ["eslint --fix", "prettier --write", "jest --bail --findRelatedTests"]
  }
}
```

```bash
# .husky/pre-commit
#!/bin/sh
pnpm lint-staged
```

---

## 10. Performance Testing

### 10.1 k6 Load Testing

```javascript
// k6/load-test.js
import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate, Trend } from 'k6/metrics'

const errorRate = new Rate('errors')
const messageSendDuration = new Trend('message_send_duration')

export const options = {
  stages: [
    { duration: '1m', target: 100 }, // Ramp up to 100 users
    { duration: '3m', target: 100 }, // Stay at 100 users
    { duration: '1m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 1000 }, // Stay at 1000 users
    { duration: '2m', target: 10000 }, // Ramp up to 10000 users
    { duration: '5m', target: 10000 }, // Stay at 10000 users
    { duration: '2m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    errors: ['rate<0.01'], // Error rate < 1%
    message_send_duration: ['p(95)<1000'], // 95% message sends < 1s
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const AUTH_TOKEN = __ENV.AUTH_TOKEN || 'test-token'

export function setup() {
  // Login and get token
  const loginRes = http.post(`${BASE_URL}/api/auth/signin`, {
    email: 'load-test@nself.org',
    password: 'password123',
  })

  return { token: loginRes.json('token') }
}

export default function (data) {
  const headers = {
    Authorization: `Bearer ${data.token}`,
    'Content-Type': 'application/json',
  }

  // Fetch channels
  const channelsRes = http.get(`${BASE_URL}/api/channels`, { headers })
  check(channelsRes, {
    'channels status 200': (r) => r.status === 200,
    'channels returned': (r) => r.json('channels').length > 0,
  })
  errorRate.add(channelsRes.status !== 200)

  // Fetch messages
  const messagesRes = http.get(`${BASE_URL}/api/messages?channelId=channel-general&limit=50`, {
    headers,
  })
  check(messagesRes, {
    'messages status 200': (r) => r.status === 200,
  })

  // Send message
  const startTime = new Date()
  const sendRes = http.post(
    `${BASE_URL}/api/messages`,
    JSON.stringify({
      channelId: 'channel-general',
      content: `Load test message at ${new Date().toISOString()}`,
    }),
    { headers }
  )
  messageSendDuration.add(new Date() - startTime)

  check(sendRes, {
    'send message status 201': (r) => r.status === 201,
    'message has id': (r) => r.json('id') !== undefined,
  })
  errorRate.add(sendRes.status !== 201)

  sleep(1)
}
```

### 10.2 Lighthouse CI Configuration

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/login',
        'http://localhost:3000/chat',
        'http://localhost:3000/settings',
      ],
      startServerCommand: 'pnpm start',
      startServerReadyPattern: 'ready on',
      numberOfRuns: 3,
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
}
```

### 10.3 Real User Monitoring

```typescript
// src/lib/performance.ts
import { onCLS, onFCP, onFID, onLCP, onTTFB } from 'web-vitals'

export function initPerformanceMonitoring() {
  // Report Core Web Vitals
  onCLS(sendToAnalytics)
  onFCP(sendToAnalytics)
  onFID(sendToAnalytics)
  onLCP(sendToAnalytics)
  onTTFB(sendToAnalytics)
}

function sendToAnalytics(metric: { name: string; value: number }) {
  // Send to your analytics service
  if (process.env.NODE_ENV === 'production') {
    fetch('/api/metrics', {
      method: 'POST',
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        timestamp: Date.now(),
        url: window.location.href,
      }),
    })
  }
}
```

---

## 11. Test Naming Conventions

### 11.1 File Naming

```
src/
├── components/
│   └── chat/
│       ├── message-item.tsx
│       └── __tests__/
│           └── message-item.test.tsx      # Component test
├── hooks/
│   ├── use-messages.ts
│   └── __tests__/
│       └── use-messages.test.ts           # Hook test
├── stores/
│   ├── message-store.ts
│   └── __tests__/
│       └── message-store.test.ts          # Store test
├── lib/
│   ├── utils.ts
│   └── __tests__/
│       └── utils.test.ts                  # Utility test
├── app/
│   └── api/
│       ├── messages/
│       │   └── route.ts
│       └── __tests__/
│           └── messages.test.ts           # API route test
└── __tests__/
    └── integration/
        └── chat-flow.test.tsx             # Integration test

e2e/
├── auth.spec.ts                           # E2E test
├── chat.spec.ts
└── mobile/
    └── messaging.spec.ts                  # Mobile E2E test
```

### 11.2 Test Structure (describe/it)

```typescript
describe('ComponentName', () => {
  // Setup
  beforeEach(() => {
    /* ... */
  })
  afterEach(() => {
    /* ... */
  })

  describe('rendering', () => {
    it('renders correctly with default props', () => {
      /* ... */
    })
    it('renders children', () => {
      /* ... */
    })
    it('applies custom className', () => {
      /* ... */
    })
  })

  describe('interactions', () => {
    it('calls onClick when clicked', () => {
      /* ... */
    })
    it('handles keyboard navigation', () => {
      /* ... */
    })
  })

  describe('state management', () => {
    it('updates state on input change', () => {
      /* ... */
    })
    it('resets state when props change', () => {
      /* ... */
    })
  })

  describe('error handling', () => {
    it('displays error message on failure', () => {
      /* ... */
    })
    it('recovers gracefully from errors', () => {
      /* ... */
    })
  })

  describe('edge cases', () => {
    it('handles empty data', () => {
      /* ... */
    })
    it('handles very long content', () => {
      /* ... */
    })
    it('handles special characters', () => {
      /* ... */
    })
  })

  describe('accessibility', () => {
    it('has correct ARIA attributes', () => {
      /* ... */
    })
    it('is keyboard accessible', () => {
      /* ... */
    })
  })
})
```

### 11.3 Test Naming Patterns

```typescript
// Use present tense, describe behavior
it('renders message content')
it('shows loading spinner')
it('calls onSubmit with form data')

// Use "when" for conditional behavior
it('when clicked, opens the modal')
it('when disabled, prevents interaction')

// Use "should" for expectations
it('should display error for invalid input')
it('should update URL on navigation')

// Be specific and descriptive
// Bad:
it('works')
it('handles error')

// Good:
it('renders message with formatted timestamp')
it('displays validation error when email is invalid')
it('redirects to login when session expires')
```

---

## Appendices

### A. Test Utilities Reference

```typescript
// Available utilities from src/__tests__/utils/test-utils.tsx

// Custom render with providers
import { render } from '@/__tests__/utils/test-utils'
render(<Component />, { wrapperOptions: { user, config } })

// Store utilities
import { resetStores, createMockMessageStore } from '@/__tests__/utils/test-utils'
resetStores()

// Wait helpers
import { waitForCondition, waitForStoreState } from '@/__tests__/utils/test-utils'
await waitForCondition(() => store.messages.length > 0)

// Assertion helpers
import { expectFocused, expectCount } from '@/__tests__/utils/test-utils'
expectFocused(element)
expectCount(container, '.message', 5)

// Event helpers
import { typeIntoInput, pressKey } from '@/__tests__/utils/test-utils'
await typeIntoInput(user, input, 'text')
await pressKey(user, 'Enter', { shift: true })
```

### B. Common Test Patterns

```typescript
// Testing async operations
it('fetches data on mount', async () => {
  render(<Component />)
  await waitFor(() => {
    expect(screen.getByText('Loaded')).toBeInTheDocument()
  })
})

// Testing form submission
it('submits form with correct data', async () => {
  const onSubmit = jest.fn()
  const user = userEvent.setup()
  render(<Form onSubmit={onSubmit} />)

  await user.type(screen.getByLabelText('Name'), 'John')
  await user.click(screen.getByRole('button', { name: /submit/i }))

  expect(onSubmit).toHaveBeenCalledWith({ name: 'John' })
})

// Testing error boundaries
it('catches and displays errors', () => {
  const ThrowingComponent = () => { throw new Error('Test') }
  render(
    <ErrorBoundary>
      <ThrowingComponent />
    </ErrorBoundary>
  )
  expect(screen.getByText(/something went wrong/i)).toBeInTheDocument()
})

// Testing context consumers
it('uses context value', () => {
  render(
    <ThemeProvider value={{ theme: 'dark' }}>
      <ThemeConsumer />
    </ThemeProvider>
  )
  expect(screen.getByTestId('theme')).toHaveTextContent('dark')
})
```

### C. Troubleshooting Guide

| Issue                        | Solution                                      |
| ---------------------------- | --------------------------------------------- |
| Test times out               | Increase timeout or check for missing `await` |
| State persists between tests | Add `beforeEach` cleanup                      |
| Mock not working             | Verify mock path matches import               |
| Cannot find element          | Use `findBy` for async elements               |
| Flaky tests                  | Add explicit waits, mock timers               |
| Coverage missing             | Check `collectCoverageFrom` patterns          |

### D. Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/docs/intro)
- [MSW (Mock Service Worker)](https://mswjs.io/docs/)
- [Testing Trophy (Kent C. Dodds)](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)

---

---

## Desktop Testing — Vitest + Playwright (S12, Tauri 2)

The `nchat/desktop/` workspace package uses a separate testing stack from the Next.js frontend.

### Unit Tests — Vitest

**Framework:** Vitest 2 + jsdom + React Testing Library 16

**Config:** `desktop/vitest.config.ts`

```ts
// jsdom environment, @/ alias to src/, v8 coverage
```

**Setup:** `desktop/src/test/setup.ts` — imports `@testing-library/jest-dom`, calls `mockIPC()` before each test to stub Tauri command dispatch, calls `clearMocks()` after each.

**Running:**

```bash
cd nchat/desktop
pnpm test          # run once
pnpm test:watch    # watch mode
pnpm test:coverage # v8 coverage report
```

**IPC test helpers:** `desktop/src/lib/ipc.ts` exports typed wrappers around `invoke()`. Tests import these wrappers and use `mockIPC` from `@tauri-apps/api/mocks` to stub responses.

```ts
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";

beforeEach(() => mockIPC((cmd, args) => { /* return stub */ }));
afterEach(() => clearMocks());
```

**Test file:** `desktop/src/lib/ipc.test.ts` — 4 suites:

| Suite | What it tests |
|---|---|
| `app_info` | `app_get_name` → "nChat"; `app_get_version` → semver; error propagation |
| `window_minimize` | Calls `window_minimize` channel with no args |
| `notification_show` | Passes title + body to `notification_show` |
| `update_check` | `available: true`, `available: false`, downgrade guard pass-through |

**Coverage target:** 80% branch on `src/lib/`; 100% on security-critical paths.

---

### E2E Tests — Playwright + tauri-driver

**Framework:** Playwright 1.44 + `tauri-driver` WebDriver bridge

**Config:** `desktop/playwright.config.ts` — connects to `ws://localhost:4444` (tauri-driver); `TAURI_BINARY` env override for binary path; 2 retries in CI.

**Requirements before running:**

1. Build the desktop binary: `pnpm tauri:build` in `nchat/desktop/`
2. Install tauri-driver: `cargo install tauri-driver`
3. Start tauri-driver: `tauri-driver` (separate terminal or let Playwright webServer start it)

**Running:**

```bash
cd nchat/desktop
pnpm test:e2e
```

**Test files:** `desktop/tests/e2e/`

| File | What it covers |
|---|---|
| `launch.spec.ts` | App launches; title matches `/nChat/`; `#root` visible |
| `ipc.spec.ts` | `app_get_name` → "nChat"; `app_get_version` → semver string |
| `window-controls.spec.ts` | `window_is_maximized` → boolean; `window_minimize` resolves without error |

**CI:** E2E job runs in `desktop-macos.yml` on tag push and `workflow_dispatch`. Requires a built binary — runs AFTER the build job completes.

**Note:** E2E tests invoke real Tauri commands against the compiled binary. They are not mocked. A full `pnpm tauri:build` is required before running.

---

### IPC Parity Check

Ensures the Rust handler registration in `lib.rs` stays in sync with the documented IPC channel table in `DESKTOP.md`.

```bash
cd nchat/desktop
pnpm ipc-parity
```

Script: `desktop/tests/ipc-parity.ts` — parses `src-tauri/src/lib.rs` `tauri::generate_handler![]` block, verifies all 19 expected channels are registered. `drag_start_file` is marked intentional N/A (uses Tauri drag-and-drop API directly). Exits 1 on any missing channel.

Run as a pre-PR check and in CI (macOS workflow, verification step after build).

---

## Document History

| Version | Date       | Author | Changes                             |
| ------- | ---------- | ------ | ----------------------------------- |
| 1.0.0   | 2026-02-03 | Claude | Initial comprehensive test strategy |
| 1.1.0   | 2026-05-16 | Claude | Added desktop testing section (S12 — Tauri 2 migration: Vitest + Playwright + IPC parity) |

---

_This document is maintained as part of the nchat project documentation. For questions or suggestions, please create an issue in the project repository._
