/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 */

import { JSONFormatter, CSVFormatter, HTMLFormatter, getFormatter } from '../formatters'
import type { ExportData, ExportedMessage } from '../types'

describe('Export Formatters', () => {
  const mockData: ExportData = {
    metadata: {
      exportId: 'test-123',
      exportedAt: new Date('2024-01-01T00:00:00.000Z'),
      exportedBy: {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
      },
      scope: 'all_messages',
      format: 'json',
      dateRange: {
        from: null,
        to: null,
      },
      stats: {
        totalMessages: 2,
        totalFiles: 0,
        totalUsers: 2,
        totalChannels: 1,
        totalReactions: 1,
        totalThreads: 0,
      },
      options: {
        scope: 'all_messages',
        format: 'json',
        includeFiles: true,
        includeReactions: true,
        includeThreads: true,
      },
    },
    messages: [
      {
        id: '1',
        channelId: 'ch-1',
        channelName: 'general',
        userId: 'user-1',
        username: 'testuser',
        displayName: 'Test User',
        content: 'Hello world',
        type: 'text',
        createdAt: '2024-01-01T12:00:00.000Z',
        updatedAt: '2024-01-01T12:00:00.000Z',
        isEdited: false,
        isDeleted: false,
        isPinned: false,
      },
      {
        id: '2',
        channelId: 'ch-1',
        channelName: 'general',
        userId: 'user-2',
        username: 'user2',
        displayName: 'User Two',
        content: 'Hi there!',
        type: 'text',
        createdAt: '2024-01-01T12:01:00.000Z',
        updatedAt: '2024-01-01T12:01:00.000Z',
        isEdited: false,
        isDeleted: false,
        isPinned: false,
        reactions: [
          {
            emoji: '👍',
            userId: 'user-1',
            username: 'testuser',
            displayName: 'Test User',
            createdAt: '2024-01-01T12:02:00.000Z',
          },
        ],
      },
    ],
    channels: [
      {
        id: 'ch-1',
        name: 'general',
        slug: 'general',
        description: 'General channel',
        type: 'public',
        isPrivate: false,
        createdAt: '2024-01-01T00:00:00.000Z',
        createdBy: {
          id: 'user-1',
          username: 'testuser',
        },
        memberCount: 2,
        messageCount: 2,
      },
    ],
    users: [
      {
        id: 'user-1',
        email: 'test@example.com',
        username: 'testuser',
        displayName: 'Test User',
        role: 'admin',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
      {
        id: 'user-2',
        email: 'user2@example.com',
        username: 'user2',
        displayName: 'User Two',
        role: 'member',
        createdAt: '2024-01-01T00:00:00.000Z',
      },
    ],
  }

  describe('JSONFormatter', () => {
    it('should format data as JSON', () => {
      const formatter = new JSONFormatter()
      const result = formatter.format(mockData)
      const parsed = JSON.parse(result)

      expect(parsed.metadata).toBeDefined()
      expect(parsed.messages).toHaveLength(2)
      expect(parsed.channels).toHaveLength(1)
      expect(parsed.users).toHaveLength(2)
    })

    it('should include all metadata fields', () => {
      const formatter = new JSONFormatter()
      const result = formatter.format(mockData)
      const parsed = JSON.parse(result)

      expect(parsed.metadata.exportId).toBe('test-123')
      expect(parsed.metadata.scope).toBe('all_messages')
      expect(parsed.metadata.stats.totalMessages).toBe(2)
    })
  })

  describe('CSVFormatter', () => {
    it('should format data as CSV', () => {
      const formatter = new CSVFormatter()
      const result = formatter.format(mockData)
      const lines = result.split('\n')

      expect(lines[0]).toContain('message_id')
      expect(lines[0]).toContain('channel_name')
      expect(lines[0]).toContain('username')
      expect(lines.length).toBe(3) // header + 2 messages
    })

    it('should escape CSV special characters', () => {
      const formatter = new CSVFormatter()
      const dataWithComma: ExportData = {
        ...mockData,
        messages: [
          {
            ...mockData.messages[0],
            content: 'Hello, world',
          },
        ],
      }

      const result = formatter.format(dataWithComma)
      expect(result).toContain('"Hello, world"')
    })

    it('should handle messages with reactions', () => {
      const formatter = new CSVFormatter()
      const result = formatter.format(mockData)
      const lines = result.split('\n')

      // Second message has 1 reaction
      expect(lines[2]).toContain('1')
    })
  })

  describe('HTMLFormatter', () => {
    it('should format data as HTML', () => {
      const formatter = new HTMLFormatter()
      const result = formatter.format(mockData)

      expect(result).toContain('<!DOCTYPE html>')
      expect(result).toContain('<html')
      expect(result).toContain('</html>')
    })

    it('should include metadata section', () => {
      const formatter = new HTMLFormatter()
      const result = formatter.format(mockData)

      expect(result).toContain('Chat Export')
      expect(result).toContain('testuser')
      expect(result).toContain('Total Messages')
    })

    it('should include all messages', () => {
      const formatter = new HTMLFormatter()
      const result = formatter.format(mockData)

      expect(result).toContain('Hello world')
      expect(result).toContain('Hi there!')
    })

    it('should support light theme', () => {
      const formatter = new HTMLFormatter()
      const result = formatter.format(mockData, {
        theme: 'light',
        includeStyles: true,
        standalone: true,
      })

      expect(result).toContain('class="light"')
    })

    it('should support dark theme', () => {
      const formatter = new HTMLFormatter()
      const result = formatter.format(mockData, {
        theme: 'dark',
        includeStyles: true,
        standalone: true,
      })

      expect(result).toContain('class="dark"')
    })

    it('should include reactions when present', () => {
      const formatter = new HTMLFormatter()
      const result = formatter.format(mockData)

      expect(result).toContain('👍')
      expect(result).toContain('reaction')
    })
  })

  describe('getFormatter factory', () => {
    it('should return JSONFormatter for json format', () => {
      const formatter = getFormatter('json')
      expect(formatter).toBeInstanceOf(JSONFormatter)
    })

    it('should return CSVFormatter for csv format', () => {
      const formatter = getFormatter('csv')
      expect(formatter).toBeInstanceOf(CSVFormatter)
    })

    it('should return HTMLFormatter for html format', () => {
      const formatter = getFormatter('html')
      expect(formatter).toBeInstanceOf(HTMLFormatter)
    })

    it('should throw error for unsupported format', () => {
      expect(() => getFormatter('invalid' as any)).toThrow('Unsupported format')
    })
  })
})
