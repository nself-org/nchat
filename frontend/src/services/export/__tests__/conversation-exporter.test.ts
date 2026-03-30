/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 */

import {
  ConversationExporter,
  createDefaultExportOptions,
  type ExportOptions,
  type ExportedMessage,
  type ExportedChannel,
  type ExportedUser,
} from '../conversation-exporter'

// ============================================================================
// TEST DATA
// ============================================================================

const mockUsers: ExportedUser[] = [
  {
    id: 'user-1',
    username: 'alice',
    displayName: 'Alice Johnson',
    email: 'alice@example.com',
    avatarUrl: 'https://example.com/alice.jpg',
    role: 'admin',
  },
  {
    id: 'user-2',
    username: 'bob',
    displayName: 'Bob Smith',
    email: 'bob@example.com',
    role: 'member',
  },
]

const mockChannels: ExportedChannel[] = [
  {
    id: 'channel-1',
    name: 'general',
    slug: 'general',
    description: 'General discussion',
    type: 'public',
    isArchived: false,
    createdAt: '2024-01-01T00:00:00.000Z',
    memberCount: 10,
    messageCount: 100,
  },
  {
    id: 'channel-2',
    name: 'random',
    slug: 'random',
    type: 'public',
    isArchived: false,
    createdAt: '2024-01-02T00:00:00.000Z',
    memberCount: 8,
    messageCount: 50,
  },
]

const mockMessages: ExportedMessage[] = [
  {
    id: 'msg-1',
    channelId: 'channel-1',
    channelName: 'general',
    userId: 'user-1',
    username: 'alice',
    displayName: 'Alice Johnson',
    content: 'Hello everyone!',
    type: 'text',
    createdAt: '2024-01-15T10:00:00.000Z',
    isEdited: false,
    isDeleted: false,
    isPinned: true,
    reactions: [
      {
        emoji: '👍',
        count: 2,
        users: [
          { id: 'user-2', username: 'bob' },
          { id: 'user-1', username: 'alice' },
        ],
      },
    ],
  },
  {
    id: 'msg-2',
    channelId: 'channel-1',
    channelName: 'general',
    userId: 'user-2',
    username: 'bob',
    displayName: 'Bob Smith',
    content: 'Hi Alice!',
    type: 'text',
    createdAt: '2024-01-15T10:01:00.000Z',
    isEdited: true,
    editedAt: '2024-01-15T10:02:00.000Z',
    isDeleted: false,
    isPinned: false,
    parentId: 'msg-1',
    parentContent: 'Hello everyone!',
    parentUsername: 'alice',
    editHistory: [
      {
        content: 'Hi Alice',
        editedAt: '2024-01-15T10:02:00.000Z',
        editedBy: 'bob',
      },
    ],
  },
  {
    id: 'msg-3',
    channelId: 'channel-1',
    channelName: 'general',
    userId: 'user-1',
    username: 'alice',
    displayName: 'Alice Johnson',
    content: 'Check this out!',
    type: 'text',
    createdAt: '2024-01-15T10:05:00.000Z',
    isEdited: false,
    isDeleted: false,
    isPinned: false,
    attachments: [
      {
        id: 'att-1',
        fileName: 'document.pdf',
        fileType: 'application/pdf',
        fileSize: 1024000,
        url: 'https://example.com/document.pdf',
      },
    ],
  },
  {
    id: 'msg-4',
    channelId: 'channel-1',
    channelName: 'general',
    userId: 'user-2',
    username: 'bob',
    displayName: 'Bob Smith',
    content: 'This message was deleted',
    type: 'text',
    createdAt: '2024-01-15T10:10:00.000Z',
    isEdited: false,
    isDeleted: true,
    deletedAt: '2024-01-15T10:11:00.000Z',
    isPinned: false,
  },
  {
    id: 'msg-5',
    channelId: 'channel-2',
    channelName: 'random',
    userId: 'user-1',
    username: 'alice',
    displayName: 'Alice Johnson',
    content: 'Random message',
    type: 'text',
    createdAt: '2024-01-15T11:00:00.000Z',
    isEdited: false,
    isDeleted: false,
    isPinned: false,
  },
]

const mockExportedBy = {
  id: 'user-1',
  username: 'alice',
  email: 'alice@example.com',
}

// ============================================================================
// TESTS
// ============================================================================

describe('ConversationExporter', () => {
  describe('createDefaultExportOptions', () => {
    it('should create default options with provided channel IDs', () => {
      const options = createDefaultExportOptions(['channel-1', 'channel-2'])

      expect(options.channelIds).toEqual(['channel-1', 'channel-2'])
      expect(options.format).toBe('json')
      expect(options.scope).toBe('multiple_conversations')
      expect(options.mediaHandling).toBe('link')
      expect(options.includeThreads).toBe(true)
      expect(options.includeReactions).toBe(true)
    })

    it('should allow overriding default options', () => {
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'html',
        includeReactions: false,
        anonymizeUsers: true,
      })

      expect(options.format).toBe('html')
      expect(options.includeReactions).toBe(false)
      expect(options.anonymizeUsers).toBe(true)
      expect(options.includeThreads).toBe(true) // Default preserved
    })
  })

  describe('export - JSON format', () => {
    it('should export all messages as JSON', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1', 'channel-2'])

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.mimeType).toBe('application/json')
      expect(result.fileName).toMatch(/^nchat-export-.*\.json$/)

      const parsed = JSON.parse(result.content)
      expect(parsed.metadata).toBeDefined()
      expect(parsed.messages).toHaveLength(4) // Non-deleted messages (deleted filtered by default)
      expect(parsed.channels).toHaveLength(2)
      expect(parsed.users).toHaveLength(2)
    })

    it('should include correct metadata in JSON export', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'])

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)

      expect(parsed.metadata.exportedBy.username).toBe('alice')
      expect(parsed.metadata.format).toBe('json')
      expect(parsed.metadata.stats.totalMessages).toBeGreaterThan(0)
    })

    it('should filter messages by channel', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'])

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)
      const channelIds = new Set(parsed.messages.map((m: ExportedMessage) => m.channelId))

      expect(channelIds.has('channel-2')).toBe(false)
    })

    it('should include reactions when enabled', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        includeReactions: true,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)
      const msgWithReaction = parsed.messages.find((m: ExportedMessage) => m.id === 'msg-1')

      expect(msgWithReaction.reactions).toBeDefined()
      expect(msgWithReaction.reactions[0].emoji).toBe('👍')
    })

    it('should exclude reactions when disabled', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        includeReactions: false,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)
      const msgWithReaction = parsed.messages.find((m: ExportedMessage) => m.id === 'msg-1')

      expect(msgWithReaction.reactions).toBeUndefined()
    })
  })

  describe('export - HTML format', () => {
    it('should export as valid HTML', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'html',
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.mimeType).toBe('text/html')
      expect(result.fileName).toMatch(/\.html$/)
      expect(result.content).toContain('<!DOCTYPE html>')
      expect(result.content).toContain('<html')
      expect(result.content).toContain('</html>')
    })

    it('should include message content in HTML', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'html',
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.content).toContain('Hello everyone!')
      expect(result.content).toContain('Hi Alice!')
    })

    it('should include channel headers in HTML', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'html',
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.content).toContain('#general')
    })

    it('should include styled badges for pinned messages', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'html',
        includePins: true,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.content).toContain('Pinned')
      expect(result.content).toContain('badge-pinned')
    })

    it('should escape HTML entities in message content', async () => {
      const messagesWithHtml: ExportedMessage[] = [
        {
          ...mockMessages[0],
          content: '<script>alert("XSS")</script>',
        },
      ]

      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'html',
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: messagesWithHtml },
        mockExportedBy
      )

      expect(result.content).not.toContain('<script>')
      expect(result.content).toContain('&lt;script&gt;')
    })
  })

  describe('export - Text format', () => {
    it('should export as plain text', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'text',
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.mimeType).toBe('text/plain')
      expect(result.fileName).toMatch(/\.txt$/)
    })

    it('should include message content in text format', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'text',
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.content).toContain('Hello everyone!')
      expect(result.content).toContain('Alice Johnson')
    })

    it('should include channel separators in text format', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1', 'channel-2'], {
        format: 'text',
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.content).toContain('#general')
      expect(result.content).toContain('#random')
      expect(result.content).toContain('───')
    })

    it('should mark deleted messages appropriately', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'text',
        includeDeletedMarkers: true,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.content).toContain('[DELETED]')
    })
  })

  describe('export - CSV format', () => {
    it('should export as CSV', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'csv',
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.mimeType).toBe('text/csv')
      expect(result.fileName).toMatch(/\.csv$/)
    })

    it('should include CSV headers', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'csv',
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.content).toContain('message_id')
      expect(result.content).toContain('channel_name')
      expect(result.content).toContain('username')
      expect(result.content).toContain('content')
    })

    it('should escape CSV special characters', async () => {
      const messagesWithComma: ExportedMessage[] = [
        {
          ...mockMessages[0],
          content: 'Hello, world',
        },
      ]

      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        format: 'csv',
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: messagesWithComma },
        mockExportedBy
      )

      expect(result.content).toContain('"Hello, world"')
    })
  })

  describe('export - Date range filtering', () => {
    it('should filter messages by start date', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        dateRange: {
          start: new Date('2024-01-15T10:02:00.000Z'),
        },
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)

      // Should exclude messages before the start date
      const msgIds = parsed.messages.map((m: ExportedMessage) => m.id)
      expect(msgIds).not.toContain('msg-1')
    })

    it('should filter messages by end date', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        dateRange: {
          end: new Date('2024-01-15T10:03:00.000Z'),
        },
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)
      const msgIds = parsed.messages.map((m: ExportedMessage) => m.id)

      expect(msgIds).toContain('msg-1')
      expect(msgIds).toContain('msg-2')
      expect(msgIds).not.toContain('msg-3')
    })
  })

  describe('export - User anonymization', () => {
    it('should anonymize user data when enabled', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        anonymizeUsers: true,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)

      // Users should be anonymized
      const hasOriginalNames = parsed.users.some(
        (u: ExportedUser) => u.username === 'alice' || u.username === 'bob'
      )
      expect(hasOriginalNames).toBe(false)

      // Users should have generic names
      const hasAnonymizedNames = parsed.users.some((u: ExportedUser) =>
        u.username.startsWith('user_')
      )
      expect(hasAnonymizedNames).toBe(true)
    })

    it('should anonymize usernames in messages', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        anonymizeUsers: true,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)

      const hasOriginalUsernames = parsed.messages.some(
        (m: ExportedMessage) => m.username === 'alice' || m.username === 'bob'
      )
      expect(hasOriginalUsernames).toBe(false)
    })

    it('should remove email addresses when anonymizing', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        anonymizeUsers: true,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)

      const hasEmails = parsed.users.some((u: ExportedUser) => u.email)
      expect(hasEmails).toBe(false)
    })
  })

  describe('export - Deleted messages handling', () => {
    it('should include deleted markers when enabled', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        includeDeletedMarkers: true,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)
      const deletedMsg = parsed.messages.find((m: ExportedMessage) => m.id === 'msg-4')

      expect(deletedMsg).toBeDefined()
      expect(deletedMsg.isDeleted).toBe(true)
    })

    it('should exclude deleted messages when disabled', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        includeDeletedMarkers: false,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)
      const deletedMsg = parsed.messages.find((m: ExportedMessage) => m.id === 'msg-4')

      expect(deletedMsg).toBeUndefined()
    })
  })

  describe('export - Edit history', () => {
    it('should include edit history when enabled', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        includeEditHistory: true,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)
      const editedMsg = parsed.messages.find((m: ExportedMessage) => m.id === 'msg-2')

      expect(editedMsg.editHistory).toBeDefined()
      expect(editedMsg.editHistory).toHaveLength(1)
    })

    it('should exclude edit history when disabled', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        includeEditHistory: false,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      const parsed = JSON.parse(result.content)
      const editedMsg = parsed.messages.find((m: ExportedMessage) => m.id === 'msg-2')

      expect(editedMsg.editHistory).toBeUndefined()
    })
  })

  describe('export - Progress tracking', () => {
    it('should call progress callback during export', async () => {
      const progressUpdates: Array<{ progress: number; status: string }> = []

      const exporter = new ConversationExporter((progress) => {
        progressUpdates.push({
          progress: progress.progress,
          status: progress.status,
        })
      })

      const options = createDefaultExportOptions(['channel-1'])

      await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(progressUpdates.length).toBeGreaterThan(0)
      expect(progressUpdates[progressUpdates.length - 1].progress).toBe(100)
      expect(progressUpdates[progressUpdates.length - 1].status).toBe('completed')
    })

    it('should report getProgress correctly', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'])

      // Before export
      expect(exporter.getProgress().status).toBe('pending')

      await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      // After export
      expect(exporter.getProgress().status).toBe('completed')
      expect(exporter.getProgress().progress).toBe(100)
    })
  })

  describe('export - Statistics', () => {
    it('should include accurate statistics', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        includeDeletedMarkers: true,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.stats.totalMessages).toBeGreaterThan(0)
      expect(result.stats.fileSizeBytes).toBeGreaterThan(0)
      expect(result.stats.duration).toBeGreaterThanOrEqual(0)
    })

    it('should count reactions correctly', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        includeReactions: true,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.stats.totalReactions).toBeGreaterThan(0)
    })

    it('should count pinned messages correctly', async () => {
      const exporter = new ConversationExporter()
      const options = createDefaultExportOptions(['channel-1'], {
        includePins: true,
      })

      const result = await exporter.export(
        options,
        { channels: mockChannels, users: mockUsers, messages: mockMessages },
        mockExportedBy
      )

      expect(result.stats.totalPins).toBe(1)
    })
  })
})
