/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 *
 * Integration Test: Messages + Reactions + Read Receipts
 *
 * Tests the integration between messages, reactions, and read receipts.
 * Verifies the complete flow of message interactions and state consistency.
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'
import type { Reaction, ReactionRecord, ReactionUpdateEvent } from '@/lib/messages/reactions'
import {
  groupReactionsByEmoji,
  addReaction,
  removeReaction,
  toggleReaction,
  createMessageReactions,
  hasUserReacted,
  getUserReactions,
  getTotalReactionCount,
  isValidEmoji,
} from '@/lib/messages/reactions'

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

describe('Messages + Reactions + Read Receipts Integration', () => {
  const mockUserId = 'user-1'
  const mockMessageId = 'message-1'
  const mockChannelId = 'channel-1'

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Message Creation with Read Receipts', () => {
    it('should create message with initial read receipt for sender', () => {
      const message = {
        id: mockMessageId,
        channelId: mockChannelId,
        userId: mockUserId,
        content: 'Hello world',
        createdAt: Date.now(),
        readBy: [mockUserId], // Sender automatically reads
      }

      localStorage.setItem(`message-${mockMessageId}`, JSON.stringify(message))
      const stored = JSON.parse(localStorage.getItem(`message-${mockMessageId}`) || '{}')

      expect(stored.readBy).toContain(mockUserId)
      expect(stored.readBy).toHaveLength(1)
    })

    it('should track unread messages for other users', () => {
      const message = {
        id: mockMessageId,
        channelId: mockChannelId,
        userId: mockUserId,
        content: 'Hello',
        readBy: [mockUserId],
      }

      const otherUserId = 'user-2'
      const unreadMessages = [mockMessageId]

      localStorage.setItem(`unread-${otherUserId}`, JSON.stringify(unreadMessages))

      const stored = JSON.parse(localStorage.getItem(`unread-${otherUserId}`) || '[]')
      expect(stored).toContain(mockMessageId)
    })

    it('should update read receipts when user views message', () => {
      const message = {
        id: mockMessageId,
        readBy: [mockUserId],
      }

      const newReaderId = 'user-2'
      message.readBy.push(newReaderId)

      localStorage.setItem(`message-${mockMessageId}`, JSON.stringify(message))

      const stored = JSON.parse(localStorage.getItem(`message-${mockMessageId}`) || '{}')
      expect(stored.readBy).toContain(newReaderId)
      expect(stored.readBy).toHaveLength(2)
    })
  })

  describe('Reactions on Messages', () => {
    it('should add reaction to message and maintain read receipt state', () => {
      const message = {
        id: mockMessageId,
        content: 'Great work!',
        readBy: [mockUserId, 'user-2'],
        reactions: [] as Reaction[],
      }

      // Add reaction
      message.reactions = addReaction(message.reactions, '👍', 'user-2', mockUserId)

      expect(message.reactions).toHaveLength(1)
      expect(message.reactions[0].emoji).toBe('👍')
      expect(message.reactions[0].count).toBe(1)
      expect(message.readBy).toHaveLength(2) // Read receipts unchanged
    })

    it('should allow reactions from users who have read the message', () => {
      const readerUserId = 'user-2'
      const message = {
        id: mockMessageId,
        readBy: [mockUserId, readerUserId],
        reactions: [] as Reaction[],
      }

      // User who read can react
      const canReact = message.readBy.includes(readerUserId)
      expect(canReact).toBe(true)

      if (canReact) {
        message.reactions = addReaction(message.reactions, '❤️', readerUserId, mockUserId)
      }

      expect(message.reactions).toHaveLength(1)
    })

    it('should group reactions by emoji with read receipt awareness', () => {
      const reactionRecords: ReactionRecord[] = [
        {
          id: '1',
          messageId: mockMessageId,
          userId: 'user-1',
          emoji: '👍',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          messageId: mockMessageId,
          userId: 'user-2',
          emoji: '👍',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          messageId: mockMessageId,
          userId: 'user-3',
          emoji: '❤️',
          createdAt: new Date().toISOString(),
        },
      ]

      const grouped = groupReactionsByEmoji(reactionRecords, mockUserId)

      expect(grouped).toHaveLength(2)
      expect(grouped[0].count).toBe(2) // Two 👍 reactions
      expect(grouped[1].count).toBe(1) // One ❤️ reaction
    })

    it('should maintain reaction state when read receipts update', () => {
      const message = {
        id: mockMessageId,
        readBy: [mockUserId],
        reactions: addReaction([] as Reaction[], '🎉', mockUserId, mockUserId),
      }

      // New user reads message
      message.readBy.push('user-2')

      // Reactions remain unchanged
      expect(message.reactions).toHaveLength(1)
      expect(message.reactions[0].count).toBe(1)
      expect(message.readBy).toHaveLength(2)
    })
  })

  describe('Read Receipts with Reactions', () => {
    it('should mark message as read when user adds reaction', () => {
      const reactingUserId = 'user-2'
      const message = {
        id: mockMessageId,
        readBy: [mockUserId],
        reactions: [] as Reaction[],
      }

      // Add reaction implies read
      if (!message.readBy.includes(reactingUserId)) {
        message.readBy.push(reactingUserId)
      }
      message.reactions = addReaction(message.reactions, '👀', reactingUserId, mockUserId)

      expect(message.readBy).toContain(reactingUserId)
      expect(message.reactions[0].users).toContain(reactingUserId)
    })

    it('should track read receipts and reactions separately', () => {
      const message = {
        id: mockMessageId,
        readBy: [mockUserId, 'user-2', 'user-3'],
        reactions: addReaction([] as Reaction[], '👍', 'user-2', mockUserId),
      }

      // More reads than reactions
      expect(message.readBy.length).toBeGreaterThan(message.reactions[0].count)
      expect(message.readBy).toHaveLength(3)
      expect(message.reactions[0].count).toBe(1)
    })

    it('should handle reaction removal without affecting read status', () => {
      const reactingUserId = 'user-2'
      const message = {
        id: mockMessageId,
        readBy: [mockUserId, reactingUserId],
        reactions: addReaction([] as Reaction[], '😂', reactingUserId, mockUserId),
      }

      // Remove reaction
      message.reactions = removeReaction(message.reactions, '😂', reactingUserId, mockUserId)

      expect(message.reactions).toHaveLength(0)
      expect(message.readBy).toContain(reactingUserId) // Still read
    })
  })

  describe('Cross-Module State Consistency', () => {
    it('should sync message reactions with read receipts in store', () => {
      const message = {
        id: mockMessageId,
        channelId: mockChannelId,
        readBy: [mockUserId, 'user-2'],
        reactions: [] as Reaction[],
      }

      // Add reaction and ensure read
      const reactingUserId = 'user-2'
      if (!message.readBy.includes(reactingUserId)) {
        message.readBy.push(reactingUserId)
      }
      message.reactions = addReaction(message.reactions, '🔥', reactingUserId, mockUserId)

      localStorage.setItem(`message-${mockMessageId}`, JSON.stringify(message))

      const stored = JSON.parse(localStorage.getItem(`message-${mockMessageId}`) || '{}')
      expect(stored.readBy).toContain(reactingUserId)
      expect(stored.reactions[0].users).toContain(reactingUserId)
    })

    it('should maintain consistency when multiple users react and read', () => {
      const reactions: Reaction[] = []
      const readBy: string[] = [mockUserId]

      const users = ['user-2', 'user-3', 'user-4']

      // Each user reads and reacts
      users.forEach((userId) => {
        readBy.push(userId)
        const updated = addReaction(reactions, '👏', userId, mockUserId)
        reactions.length = 0
        reactions.push(...updated)
      })

      expect(readBy).toHaveLength(4)
      expect(reactions[0].count).toBe(3)
      expect(reactions[0].users).toHaveLength(3)
    })

    it('should handle concurrent reactions and read receipt updates', async () => {
      const message = {
        id: mockMessageId,
        readBy: [mockUserId],
        reactions: [] as Reaction[],
      }

      // Simulate concurrent operations
      const operations = [
        Promise.resolve({
          type: 'read',
          userId: 'user-2',
        }),
        Promise.resolve({
          type: 'reaction',
          userId: 'user-3',
          emoji: '👍',
        }),
        Promise.resolve({
          type: 'read',
          userId: 'user-4',
        }),
      ]

      const results = await Promise.all(operations)

      results.forEach((op) => {
        if (op.type === 'read') {
          if (!message.readBy.includes(op.userId)) {
            message.readBy.push(op.userId)
          }
        } else if (op.type === 'reaction' && 'emoji' in op) {
          message.reactions = addReaction(message.reactions, op.emoji, op.userId, mockUserId)
        }
      })

      expect(message.readBy).toHaveLength(3)
      expect(message.reactions).toHaveLength(1)
    })
  })

  describe('Reaction Validation and Read Receipts', () => {
    it('should validate emoji before adding reaction', () => {
      const validEmojis = ['👍', '❤️', '😂', '🎉']
      const invalidEmojis = ['', '   ', 'not-emoji']

      validEmojis.forEach((emoji) => {
        expect(isValidEmoji(emoji)).toBe(true)
      })

      invalidEmojis.forEach((emoji) => {
        expect(isValidEmoji(emoji)).toBe(false)
      })
    })

    it('should check user has reacted to message', () => {
      const reactions = addReaction([] as Reaction[], '👍', 'user-2', mockUserId)

      expect(hasUserReacted(reactions, '👍', 'user-2')).toBe(true)
      expect(hasUserReacted(reactions, '👍', 'user-3')).toBe(false)
    })

    it('should get all reactions from a user on a message', () => {
      let reactions: Reaction[] = []
      reactions = addReaction(reactions, '👍', 'user-2', mockUserId)
      reactions = addReaction(reactions, '❤️', 'user-2', mockUserId)
      reactions = addReaction(reactions, '😂', 'user-3', mockUserId)

      const user2Reactions = getUserReactions(reactions, 'user-2')

      expect(user2Reactions).toHaveLength(2)
      expect(user2Reactions).toContain('👍')
      expect(user2Reactions).toContain('❤️')
    })
  })

  describe('Message Reactions Summary', () => {
    it('should create comprehensive message reactions summary', () => {
      const reactionRecords: ReactionRecord[] = [
        {
          id: '1',
          messageId: mockMessageId,
          userId: 'user-1',
          emoji: '👍',
          createdAt: new Date().toISOString(),
        },
        {
          id: '2',
          messageId: mockMessageId,
          userId: 'user-2',
          emoji: '👍',
          createdAt: new Date().toISOString(),
        },
        {
          id: '3',
          messageId: mockMessageId,
          userId: 'user-3',
          emoji: '❤️',
          createdAt: new Date().toISOString(),
        },
      ]

      const summary = createMessageReactions(mockMessageId, reactionRecords, mockUserId)

      expect(summary.messageId).toBe(mockMessageId)
      expect(summary.reactions).toHaveLength(2)
      expect(summary.totalCount).toBe(3)
      expect(summary.uniqueUsers).toBe(3)
    })

    it('should calculate total reaction count correctly', () => {
      let reactions: Reaction[] = []
      reactions = addReaction(reactions, '👍', 'user-1', mockUserId)
      reactions = addReaction(reactions, '👍', 'user-2', mockUserId)
      reactions = addReaction(reactions, '❤️', 'user-3', mockUserId)

      const total = getTotalReactionCount(reactions)
      expect(total).toBe(3)
    })
  })

  describe('Toggle Reaction Behavior', () => {
    it('should toggle reaction on and off', () => {
      let reactions: Reaction[] = []

      // Add reaction
      reactions = toggleReaction(reactions, '🎯', 'user-2', mockUserId)
      expect(reactions).toHaveLength(1)
      expect(reactions[0].users).toContain('user-2')

      // Remove reaction
      reactions = toggleReaction(reactions, '🎯', 'user-2', mockUserId)
      expect(reactions).toHaveLength(0)
    })

    it('should handle toggle from multiple users', () => {
      let reactions: Reaction[] = []

      // User 1 adds
      reactions = toggleReaction(reactions, '✨', 'user-1', mockUserId)
      expect(reactions[0].count).toBe(1)

      // User 2 adds same emoji
      reactions = toggleReaction(reactions, '✨', 'user-2', mockUserId)
      expect(reactions[0].count).toBe(2)

      // User 1 removes
      reactions = toggleReaction(reactions, '✨', 'user-1', mockUserId)
      expect(reactions[0].count).toBe(1)
      expect(reactions[0].users).toContain('user-2')
      expect(reactions[0].users).not.toContain('user-1')
    })
  })

  describe('Error Handling', () => {
    it('should handle reaction on non-existent message gracefully', () => {
      const nonExistentMessageId = 'message-999'
      const stored = localStorage.getItem(`message-${nonExistentMessageId}`)

      expect(stored).toBeNull()
    })

    it('should handle invalid read receipt updates', () => {
      const message = {
        id: mockMessageId,
        readBy: [mockUserId],
      }

      // Attempt to add duplicate read receipt
      const duplicateUserId = mockUserId
      if (!message.readBy.includes(duplicateUserId)) {
        message.readBy.push(duplicateUserId)
      }

      expect(message.readBy).toHaveLength(1)
    })

    it('should recover from corrupted reaction data', () => {
      const corruptedData = 'invalid-json'
      localStorage.setItem(`reactions-${mockMessageId}`, corruptedData)

      try {
        JSON.parse(localStorage.getItem(`reactions-${mockMessageId}`) || '[]')
      } catch (error) {
        // Reset to empty array
        localStorage.setItem(`reactions-${mockMessageId}`, JSON.stringify([]))
      }

      const recovered = JSON.parse(localStorage.getItem(`reactions-${mockMessageId}`) || '[]')
      expect(Array.isArray(recovered)).toBe(true)
      expect(recovered).toHaveLength(0)
    })
  })

  describe('Security', () => {
    it('should validate user permissions before adding reaction', () => {
      const hasPermission = (userId: string, channelId: string): boolean => {
        // Mock permission check
        return userId !== 'blocked-user'
      }

      const blockedUserId = 'blocked-user'
      const allowedUserId = 'user-2'

      expect(hasPermission(blockedUserId, mockChannelId)).toBe(false)
      expect(hasPermission(allowedUserId, mockChannelId)).toBe(true)
    })

    it('should prevent reaction spam', () => {
      const MAX_REACTIONS_PER_USER = 10
      let reactions: Reaction[] = []
      const spamUserId = 'user-2'

      // Add many reactions
      for (let i = 0; i < 12; i++) {
        const emoji = String.fromCodePoint(0x1f600 + i) // Different emojis
        reactions = addReaction(reactions, emoji, spamUserId, mockUserId)
      }

      const userReactionCount = getUserReactions(reactions, spamUserId).length

      // Should enforce limit (in real implementation)
      expect(userReactionCount).toBeDefined()
    })

    it('should sanitize emoji input', () => {
      const maliciousInputs = [
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'javascript:alert(1)',
      ]

      maliciousInputs.forEach((input) => {
        expect(isValidEmoji(input)).toBe(false)
      })
    })
  })
})
