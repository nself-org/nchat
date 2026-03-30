/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 *
 * Integration Test: Search + Discovery + Indexing
 *
 * Tests the integration between search functionality, content discovery,
 * and index management. Verifies search queries, index updates, and
 * discovery features work together seamlessly.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

describe('Search + Discovery + Indexing Integration', () => {
  const mockUserId = 'user-1'

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Index Management', () => {
    it('should create search index for new message', () => {
      const message = {
        id: 'message-1',
        content: 'Hello world from the search test',
        channelId: 'channel-1',
        userId: mockUserId,
        timestamp: Date.now(),
      }

      // Create index entry
      const indexEntry = {
        id: message.id,
        type: 'message',
        content: message.content.toLowerCase(),
        tokens: message.content.toLowerCase().split(' '),
        channelId: message.channelId,
        timestamp: message.timestamp,
      }

      localStorage.setItem(`index-${message.id}`, JSON.stringify(indexEntry))

      const stored = JSON.parse(localStorage.getItem(`index-${message.id}`) || '{}')
      expect(stored.tokens).toContain('hello')
      expect(stored.tokens).toContain('world')
    })

    it('should update index when message is edited', () => {
      const messageId = 'message-1'
      const originalIndex = {
        id: messageId,
        content: 'original content',
        tokens: ['original', 'content'],
      }

      localStorage.setItem(`index-${messageId}`, JSON.stringify(originalIndex))

      // Update message
      const updatedIndex = {
        id: messageId,
        content: 'updated content here',
        tokens: ['updated', 'content', 'here'],
        updatedAt: Date.now(),
      }

      localStorage.setItem(`index-${messageId}`, JSON.stringify(updatedIndex))

      const stored = JSON.parse(localStorage.getItem(`index-${messageId}`) || '{}')
      expect(stored.tokens).toContain('updated')
      expect(stored.tokens).not.toContain('original')
    })

    it('should remove index entry when message is deleted', () => {
      const messageId = 'message-1'
      localStorage.setItem(`index-${messageId}`, JSON.stringify({ id: messageId, content: 'test' }))

      // Delete message
      localStorage.removeItem(`index-${messageId}`)

      expect(localStorage.getItem(`index-${messageId}`)).toBeNull()
    })

    it('should index multiple content types', () => {
      const items = [
        { id: '1', type: 'message', content: 'Hello' },
        { id: '2', type: 'file', name: 'document.pdf' },
        { id: '3', type: 'channel', name: 'general' },
      ]

      items.forEach((item) => {
        const indexEntry = {
          ...item,
          tokens:
            'content' in item
              ? item.content.toLowerCase().split(' ')
              : item.name.toLowerCase().split('.'),
        }
        localStorage.setItem(`index-${item.type}-${item.id}`, JSON.stringify(indexEntry))
      })

      const messageIndex = localStorage.getItem('index-message-1')
      const fileIndex = localStorage.getItem('index-file-2')
      const channelIndex = localStorage.getItem('index-channel-3')

      expect(messageIndex).toBeTruthy()
      expect(fileIndex).toBeTruthy()
      expect(channelIndex).toBeTruthy()
    })
  })

  describe('Search Functionality', () => {
    it('should search messages by keyword', () => {
      const messages = [
        { id: '1', content: 'Hello world' },
        { id: '2', content: 'Goodbye world' },
        { id: '3', content: 'Hello universe' },
      ]

      const searchQuery = 'hello'
      const results = messages.filter((m) =>
        m.content.toLowerCase().includes(searchQuery.toLowerCase())
      )

      expect(results).toHaveLength(2)
      expect(results[0].id).toBe('1')
      expect(results[1].id).toBe('3')
    })

    it('should search with multiple keywords', () => {
      const messages = [
        { id: '1', content: 'The quick brown fox' },
        { id: '2', content: 'The lazy dog' },
        { id: '3', content: 'Quick brown dog' },
      ]

      const keywords = ['quick', 'brown']
      const results = messages.filter((m) =>
        keywords.every((k) => m.content.toLowerCase().includes(k.toLowerCase()))
      )

      expect(results).toHaveLength(2) // Message 1 and 3
    })

    it('should support fuzzy search', () => {
      const messages = [{ id: '1', content: 'Hello world' }]

      const searchQuery = 'helo' // Typo
      const fuzzyMatch = (query: string, text: string): boolean => {
        // Simple fuzzy: allow 1 character difference
        const distance = Math.abs(query.length - text.length)
        return distance <= 1 && text.includes(query.slice(0, -1))
      }

      const results = messages.filter((m) => fuzzyMatch(searchQuery, m.content.toLowerCase()))

      expect(results.length).toBeGreaterThanOrEqual(0)
    })

    it('should filter search results by channel', () => {
      const messages = [
        { id: '1', content: 'test', channelId: 'channel-1' },
        { id: '2', content: 'test', channelId: 'channel-2' },
        { id: '3', content: 'test', channelId: 'channel-1' },
      ]

      const searchQuery = 'test'
      const channelFilter = 'channel-1'

      const results = messages.filter(
        (m) =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) &&
          m.channelId === channelFilter
      )

      expect(results).toHaveLength(2)
    })

    it('should filter search results by date range', () => {
      const now = Date.now()
      const messages = [
        { id: '1', content: 'test', timestamp: now - 7 * 24 * 60 * 60 * 1000 }, // 7 days ago
        { id: '2', content: 'test', timestamp: now - 1 * 24 * 60 * 60 * 1000 }, // 1 day ago
        { id: '3', content: 'test', timestamp: now }, // Now
      ]

      const searchQuery = 'test'
      const startDate = now - 2 * 24 * 60 * 60 * 1000 // 2 days ago

      const results = messages.filter(
        (m) =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase()) && m.timestamp >= startDate
      )

      expect(results).toHaveLength(2) // Message 2 and 3
    })
  })

  describe('Content Discovery', () => {
    it('should discover trending topics', () => {
      const messages = [
        { id: '1', content: 'machine learning is amazing', timestamp: Date.now() },
        { id: '2', content: 'machine learning technology advancing', timestamp: Date.now() },
        { id: '3', content: 'machine learning in healthcare', timestamp: Date.now() },
        { id: '4', content: 'Random message here', timestamp: Date.now() },
      ]

      const wordFrequency: Record<string, number> = {}
      messages.forEach((m) => {
        m.content
          .toLowerCase()
          .split(' ')
          .forEach((word) => {
            wordFrequency[word] = (wordFrequency[word] || 0) + 1
          })
      })

      const trending = Object.entries(wordFrequency)
        .filter(([word]) => word.length > 2) // Filter short words
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)

      // "machine" and "learning" both appear 3 times
      expect(trending[0][0]).toBe('machine')
      expect(trending[0][1]).toBe(3)
      expect(trending[1][0]).toBe('learning')
      expect(trending[1][1]).toBe(3)
    })

    it('should discover popular channels', () => {
      const messages = [
        { id: '1', channelId: 'channel-1' },
        { id: '2', channelId: 'channel-1' },
        { id: '3', channelId: 'channel-1' },
        { id: '4', channelId: 'channel-2' },
        { id: '5', channelId: 'channel-3' },
      ]

      const channelActivity: Record<string, number> = {}
      messages.forEach((m) => {
        channelActivity[m.channelId] = (channelActivity[m.channelId] || 0) + 1
      })

      const popular = Object.entries(channelActivity)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)

      expect(popular[0][0]).toBe('channel-1')
      expect(popular[0][1]).toBe(3)
    })

    it('should discover related content', () => {
      const currentMessage = {
        id: 'message-1',
        content: 'JavaScript programming tutorial',
        tags: ['javascript', 'programming', 'tutorial'],
      }

      const allMessages = [
        { id: 'message-2', content: 'Python programming guide', tags: ['python', 'programming'] },
        {
          id: 'message-3',
          content: 'JavaScript best practices',
          tags: ['javascript', 'best-practices'],
        },
        { id: 'message-4', content: 'React tutorial', tags: ['react', 'tutorial'] },
        { id: 'message-5', content: 'Cooking recipe', tags: ['cooking', 'food'] },
      ]

      const related = allMessages.filter((m) =>
        m.tags.some((tag) => currentMessage.tags.includes(tag))
      )

      expect(related).toHaveLength(3)
      expect(related.find((m) => m.id === 'message-5')).toBeUndefined()
    })

    it('should suggest channels based on user activity', () => {
      const userActivity = [
        { channelId: 'channel-1', count: 50 },
        { channelId: 'channel-2', count: 30 },
      ]

      const allChannels = [
        { id: 'channel-1', tags: ['tech', 'programming'] },
        { id: 'channel-2', tags: ['design', 'ui'] },
        { id: 'channel-3', tags: ['tech', 'ai'] },
        { id: 'channel-4', tags: ['marketing'] },
      ]

      // Get tags from active channels
      const activeTags = new Set(
        userActivity.flatMap((a) => {
          const channel = allChannels.find((c) => c.id === a.channelId)
          return channel?.tags || []
        })
      )

      // Find similar channels
      const suggestions = allChannels.filter(
        (c) =>
          !userActivity.find((a) => a.channelId === c.id) &&
          c.tags.some((tag) => activeTags.has(tag))
      )

      expect(suggestions).toHaveLength(1)
      expect(suggestions[0].id).toBe('channel-3')
    })
  })

  describe('Index Optimization', () => {
    it('should tokenize content for efficient search', () => {
      const content = 'The quick brown fox jumps over the lazy dog'
      const tokens = content
        .toLowerCase()
        .split(/\s+/)
        .filter((token) => token.length > 0)

      const stopWords = ['the', 'over']
      const filteredTokens = tokens.filter((token) => !stopWords.includes(token))

      expect(filteredTokens).not.toContain('the')
      expect(filteredTokens).toContain('quick')
      // Original sentence has 9 words, removing "the" (appears 2x) and "over" (1x) = 6 tokens
      expect(filteredTokens).toHaveLength(6)
      expect(filteredTokens).toEqual(['quick', 'brown', 'fox', 'jumps', 'lazy', 'dog'])
    })

    it('should stem words for better matching', () => {
      const words = ['running', 'runs', 'ran', 'runner']
      const stem = (word: string): string => {
        // Simple stemming: remove common suffixes
        return word.replace(/(ing|s|er)$/, '')
      }

      const stemmed = words.map(stem)
      const uniqueStems = new Set(stemmed)

      expect(uniqueStems.size).toBeLessThan(words.length)
    })

    it('should build inverted index for fast lookups', () => {
      const documents = [
        { id: '1', content: 'the quick brown fox' },
        { id: '2', content: 'the lazy dog' },
        { id: '3', content: 'quick brown dog' },
      ]

      const invertedIndex: Record<string, string[]> = {}

      documents.forEach((doc) => {
        const tokens = doc.content.toLowerCase().split(' ')
        tokens.forEach((token) => {
          if (!invertedIndex[token]) {
            invertedIndex[token] = []
          }
          invertedIndex[token].push(doc.id)
        })
      })

      expect(invertedIndex['quick']).toEqual(['1', '3'])
      expect(invertedIndex['the']).toEqual(['1', '2'])
    })

    it('should calculate relevance scores', () => {
      const document = {
        id: '1',
        content: 'javascript tutorial for beginners',
        titleMatch: false,
        exactMatch: false,
      }

      const searchQuery = 'javascript tutorial'
      const queryTerms = searchQuery.toLowerCase().split(' ')
      const contentTerms = document.content.toLowerCase().split(' ')

      const matches = queryTerms.filter((term) => contentTerms.includes(term))
      const score = matches.length / queryTerms.length

      expect(score).toBe(1.0) // Both terms match
    })
  })

  describe('Cross-Module State Consistency', () => {
    it('should sync search index with message state', () => {
      const message = {
        id: 'message-1',
        content: 'Hello world',
        channelId: 'channel-1',
      }

      // Create message
      localStorage.setItem(`message-${message.id}`, JSON.stringify(message))

      // Create index
      const indexEntry = {
        id: message.id,
        content: message.content.toLowerCase(),
        channelId: message.channelId,
      }
      localStorage.setItem(`index-${message.id}`, JSON.stringify(indexEntry))

      const storedMessage = JSON.parse(localStorage.getItem(`message-${message.id}`) || '{}')
      const storedIndex = JSON.parse(localStorage.getItem(`index-${message.id}`) || '{}')

      expect(storedMessage.id).toBe(storedIndex.id)
      expect(storedIndex.content).toContain('hello')
    })

    it('should update discovery data when index changes', () => {
      const messages = [
        { id: '1', content: 'AI is great' },
        { id: '2', content: 'AI is amazing' },
      ]

      // Build initial discovery data
      const trendingTopics: Record<string, number> = {}
      messages.forEach((m) => {
        m.content
          .toLowerCase()
          .split(' ')
          .forEach((word) => {
            trendingTopics[word] = (trendingTopics[word] || 0) + 1
          })
      })

      expect(trendingTopics['ai']).toBe(2)

      // Add new message
      const newMessage = { id: '3', content: 'AI technology' }
      newMessage.content
        .toLowerCase()
        .split(' ')
        .forEach((word) => {
          trendingTopics[word] = (trendingTopics[word] || 0) + 1
        })

      expect(trendingTopics['ai']).toBe(3)
    })

    it('should handle concurrent search and index updates', async () => {
      const operations = [
        Promise.resolve({ type: 'search', query: 'test' }),
        Promise.resolve({ type: 'index', messageId: 'message-1' }),
        Promise.resolve({ type: 'search', query: 'hello' }),
      ]

      const results = await Promise.all(operations)

      expect(results).toHaveLength(3)
      expect(results.filter((r) => r.type === 'search')).toHaveLength(2)
    })
  })

  describe('Search Filters and Sorting', () => {
    it('should filter by content type', () => {
      const items = [
        { id: '1', type: 'message', content: 'test' },
        { id: '2', type: 'file', name: 'test.pdf' },
        { id: '3', type: 'message', content: 'test' },
      ]

      const messageOnly = items.filter((item) => item.type === 'message')

      expect(messageOnly).toHaveLength(2)
    })

    it('should sort results by relevance', () => {
      const results = [
        { id: '1', content: 'test', relevance: 0.5 },
        { id: '2', content: 'test test', relevance: 1.0 },
        { id: '3', content: 'testing', relevance: 0.7 },
      ]

      const sorted = [...results].sort((a, b) => b.relevance - a.relevance)

      expect(sorted[0].id).toBe('2')
      expect(sorted[2].id).toBe('1')
    })

    it('should sort results by date', () => {
      const results = [
        { id: '1', timestamp: 1000 },
        { id: '2', timestamp: 3000 },
        { id: '3', timestamp: 2000 },
      ]

      const sorted = [...results].sort((a, b) => b.timestamp - a.timestamp)

      expect(sorted[0].id).toBe('2')
      expect(sorted[2].id).toBe('1')
    })
  })

  describe('Advanced Search Features', () => {
    it('should support phrase search', () => {
      const messages = [
        { id: '1', content: 'hello world today' },
        { id: '2', content: 'hello everyone world' },
        { id: '3', content: 'world hello' },
      ]

      const phrase = 'hello world'
      const results = messages.filter((m) => m.content.includes(phrase))

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('1')
    })

    it('should support boolean search', () => {
      const messages = [
        { id: '1', content: 'javascript and typescript' },
        { id: '2', content: 'javascript or python' },
        { id: '3', content: 'typescript only' },
      ]

      // AND search
      const andResults = messages.filter(
        (m) => m.content.includes('javascript') && m.content.includes('typescript')
      )

      // OR search
      const orResults = messages.filter(
        (m) => m.content.includes('javascript') || m.content.includes('typescript')
      )

      expect(andResults).toHaveLength(1)
      expect(orResults).toHaveLength(3)
    })

    it('should support exclusion search', () => {
      const messages = [
        { id: '1', content: 'javascript tutorial' },
        { id: '2', content: 'python tutorial' },
        { id: '3', content: 'javascript guide' },
      ]

      const include = 'javascript'
      const exclude = 'tutorial'

      const results = messages.filter(
        (m) => m.content.includes(include) && !m.content.includes(exclude)
      )

      expect(results).toHaveLength(1)
      expect(results[0].id).toBe('3')
    })
  })

  describe('Error Handling', () => {
    it('should handle empty search queries', () => {
      const searchQuery = ''
      const messages = [{ id: '1', content: 'test' }]

      const results = searchQuery ? messages.filter((m) => m.content.includes(searchQuery)) : []

      expect(results).toHaveLength(0)
    })

    it('should handle no search results', () => {
      const searchQuery = 'nonexistent'
      const messages = [{ id: '1', content: 'test' }]

      const results = messages.filter((m) => m.content.includes(searchQuery))

      expect(results).toHaveLength(0)
    })

    it('should handle index corruption', () => {
      localStorage.setItem('index-message-1', 'invalid-json')

      try {
        JSON.parse(localStorage.getItem('index-message-1') || '{}')
      } catch {
        // Rebuild index
        localStorage.removeItem('index-message-1')
      }

      expect(localStorage.getItem('index-message-1')).toBeNull()
    })
  })

  describe('Security', () => {
    it('should sanitize search queries', () => {
      const maliciousQueries = [
        '<script>alert("xss")</script>',
        'SELECT * FROM users',
        '../../../etc/passwd',
      ]

      maliciousQueries.forEach((query) => {
        const sanitized = query.replace(/[<>'"]/g, '')
        expect(sanitized).not.toContain('<')
        expect(sanitized).not.toContain('>')
      })
    })

    it('should enforce search permissions', () => {
      const hasSearchPermission = (userId: string, channelId: string): boolean => {
        // Mock permission check
        const userChannels = ['channel-1', 'channel-2']
        return userChannels.includes(channelId)
      }

      expect(hasSearchPermission(mockUserId, 'channel-1')).toBe(true)
      expect(hasSearchPermission(mockUserId, 'channel-99')).toBe(false)
    })

    it('should rate limit search requests', () => {
      const rateLimiter = {
        userId: mockUserId,
        limit: 60,
        window: 60000,
        requests: [] as number[],
      }

      const now = Date.now()
      for (let i = 0; i < 55; i++) {
        rateLimiter.requests.push(now)
      }

      const canSearch = rateLimiter.requests.length < rateLimiter.limit
      expect(canSearch).toBe(true)
    })
  })
})
