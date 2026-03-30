/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 */

import {
  ConversationImporter,
  parseWhatsAppExport,
  parseTelegramExport,
  parseNchatExport,
  detectImportFormat,
  createDefaultImportOptions,
  estimateImportTime,
  type ImportOptions,
  type ParsedImportData,
  type ImportResult,
} from '../conversation-importer'

// ============================================================================
// TEST DATA
// ============================================================================

const whatsappExportSample = `[15/01/2024, 10:00:00] Alice: Hello everyone!
[15/01/2024, 10:01:00] Bob: Hi Alice!
[15/01/2024, 10:02:00] Alice: How are you?
[15/01/2024, 10:03:00] Bob: I'm doing great, thanks!
[15/01/2024, 10:04:00] Alice: <Media omitted>
[15/01/2024, 10:05:00] System: Alice added Charlie`

const whatsappExportAltFormat = `15/01/2024, 10:00 - Alice: Hello everyone!
15/01/2024, 10:01 - Bob: Hi Alice!
15/01/2024, 10:02 - Alice: How are you?`

const telegramExportSample = JSON.stringify({
  name: 'Test Group',
  type: 'private_group',
  id: 12345,
  messages: [
    {
      id: 1,
      type: 'message',
      date: '2024-01-15T10:00:00',
      from: 'Alice',
      from_id: 'user123',
      text: 'Hello everyone!',
    },
    {
      id: 2,
      type: 'message',
      date: '2024-01-15T10:01:00',
      from: 'Bob',
      from_id: 'user456',
      text: 'Hi Alice!',
      reply_to_message_id: 1,
    },
    {
      id: 3,
      type: 'message',
      date: '2024-01-15T10:02:00',
      from: 'Alice',
      from_id: 'user123',
      text: [
        'Check this ',
        { type: 'bold', text: 'important' },
        ' message',
      ],
    },
    {
      id: 4,
      type: 'service',
      date: '2024-01-15T10:03:00',
      from: 'Alice',
      from_id: 'user123',
      action: 'create_group',
    },
    {
      id: 5,
      type: 'message',
      date: '2024-01-15T10:04:00',
      from: 'Alice',
      from_id: 'user123',
      text: 'Photo caption',
      media_type: 'photo',
      file: 'photos/photo.jpg',
    },
  ],
})

const nchatExportSample = JSON.stringify({
  metadata: {
    exportId: 'test-123',
    exportedAt: '2024-01-15T12:00:00.000Z',
    exportedBy: {
      id: 'user-1',
      username: 'alice',
      email: 'alice@example.com',
    },
    format: 'json',
    scope: 'all_messages',
    stats: {
      totalMessages: 3,
      totalFiles: 0,
      totalUsers: 2,
      totalChannels: 1,
      totalReactions: 1,
      totalThreads: 0,
    },
  },
  users: [
    { id: 'user-1', username: 'alice', displayName: 'Alice' },
    { id: 'user-2', username: 'bob', displayName: 'Bob' },
  ],
  channels: [
    { id: 'channel-1', name: 'general', type: 'public' },
  ],
  messages: [
    {
      id: 'msg-1',
      channelId: 'channel-1',
      userId: 'user-1',
      content: 'Hello!',
      type: 'text',
      createdAt: '2024-01-15T10:00:00.000Z',
    },
    {
      id: 'msg-2',
      channelId: 'channel-1',
      userId: 'user-2',
      content: 'Hi there!',
      type: 'text',
      createdAt: '2024-01-15T10:01:00.000Z',
      reactions: [{ emoji: '👍', users: [{ id: 'user-1' }] }],
    },
  ],
})

// ============================================================================
// TESTS
// ============================================================================

describe('Import Format Detection', () => {
  describe('detectImportFormat', () => {
    it('should detect WhatsApp format with brackets', () => {
      expect(detectImportFormat(whatsappExportSample)).toBe('whatsapp')
    })

    it('should detect WhatsApp format with dashes', () => {
      expect(detectImportFormat(whatsappExportAltFormat)).toBe('whatsapp')
    })

    it('should detect Telegram format', () => {
      expect(detectImportFormat(telegramExportSample)).toBe('telegram')
    })

    it('should detect nchat format', () => {
      expect(detectImportFormat(nchatExportSample)).toBe('nchat')
    })

    it('should detect Slack format', () => {
      const slackExport = JSON.stringify({
        channels: [{ id: 'C123', name: 'general' }],
        users: [{ id: 'U123', name: 'alice' }],
      })
      expect(detectImportFormat(slackExport)).toBe('slack')
    })

    it('should detect Discord format', () => {
      const discordExport = JSON.stringify({
        guild: { id: '123', name: 'Test Server' },
        messages: [{ id: '1', author: { id: 'u1', name: 'Alice' }, content: 'Hello' }],
      })
      expect(detectImportFormat(discordExport)).toBe('discord')
    })

    it('should return generic for unknown JSON format', () => {
      const unknownJson = JSON.stringify({ data: 'unknown' })
      expect(detectImportFormat(unknownJson)).toBe('generic')
    })

    it('should return generic for unrecognized text', () => {
      expect(detectImportFormat('random text content')).toBe('generic')
    })
  })
})

describe('WhatsApp Parser', () => {
  describe('parseWhatsAppExport', () => {
    it('should parse messages correctly', () => {
      const result = parseWhatsAppExport(whatsappExportSample)

      expect(result.platform).toBe('whatsapp')
      expect(result.messages.length).toBeGreaterThan(0)
    })

    it('should extract user names', () => {
      const result = parseWhatsAppExport(whatsappExportSample)

      const usernames = result.users.map((u) => u.username)
      expect(usernames).toContain('Alice')
      expect(usernames).toContain('Bob')
    })

    it('should identify system messages', () => {
      const result = parseWhatsAppExport(whatsappExportSample)

      const systemMessages = result.messages.filter((m) => m.type === 'system')
      expect(systemMessages.length).toBeGreaterThan(0)
    })

    it('should identify media messages', () => {
      const result = parseWhatsAppExport(whatsappExportSample)

      const mediaMessages = result.messages.filter((m) => m.type === 'media')
      expect(mediaMessages.length).toBeGreaterThan(0)
    })

    it('should parse timestamps correctly', () => {
      const result = parseWhatsAppExport(whatsappExportSample)

      expect(result.messages[0].createdAt).toBeDefined()
      const date = new Date(result.messages[0].createdAt)
      expect(date.getFullYear()).toBe(2024)
      expect(date.getMonth()).toBe(0) // January
      expect(date.getDate()).toBe(15)
    })

    it('should parse alternative WhatsApp format', () => {
      const result = parseWhatsAppExport(whatsappExportAltFormat)

      expect(result.platform).toBe('whatsapp')
      expect(result.messages.length).toBe(3)
    })

    it('should handle multi-line messages', () => {
      const multiLineExport = `[15/01/2024, 10:00:00] Alice: This is line 1
This is line 2
This is line 3
[15/01/2024, 10:01:00] Bob: Next message`

      const result = parseWhatsAppExport(multiLineExport)

      const aliceMsg = result.messages.find((m) =>
        m.content.includes('line 1')
      )
      expect(aliceMsg?.content).toContain('line 2')
      expect(aliceMsg?.content).toContain('line 3')
    })

    it('should create single channel for WhatsApp export', () => {
      const result = parseWhatsAppExport(whatsappExportSample)

      expect(result.channels).toHaveLength(1)
      expect(result.channels[0].name).toBe('WhatsApp Import')
    })
  })
})

describe('Telegram Parser', () => {
  describe('parseTelegramExport', () => {
    it('should parse messages correctly', () => {
      const result = parseTelegramExport(telegramExportSample)

      expect(result.platform).toBe('telegram')
      expect(result.messages.length).toBe(5)
    })

    it('should extract channel info', () => {
      const result = parseTelegramExport(telegramExportSample)

      expect(result.channels).toHaveLength(1)
      expect(result.channels[0].name).toBe('Test Group')
      expect(result.channels[0].type).toBe('group')
    })

    it('should extract user names', () => {
      const result = parseTelegramExport(telegramExportSample)

      const usernames = result.users.map((u) => u.username)
      expect(usernames).toContain('Alice')
      expect(usernames).toContain('Bob')
    })

    it('should handle formatted text arrays', () => {
      const result = parseTelegramExport(telegramExportSample)

      const msgWithFormat = result.messages.find((m) =>
        m.content.includes('important')
      )
      expect(msgWithFormat?.content).toContain('Check this')
      expect(msgWithFormat?.content).toContain('important')
      expect(msgWithFormat?.content).toContain('message')
    })

    it('should identify reply relationships', () => {
      const result = parseTelegramExport(telegramExportSample)

      const replyMsg = result.messages.find((m) =>
        m.content.includes('Hi Alice')
      )
      expect(replyMsg?.parentId).toBe('telegram_1')
    })

    it('should identify media messages', () => {
      const result = parseTelegramExport(telegramExportSample)

      const mediaMessages = result.messages.filter((m) => m.type === 'media')
      expect(mediaMessages.length).toBe(1)
      expect(mediaMessages[0].attachments).toHaveLength(1)
    })

    it('should identify service/system messages', () => {
      const result = parseTelegramExport(telegramExportSample)

      const systemMessages = result.messages.filter((m) => m.type === 'system')
      expect(systemMessages.length).toBe(1)
    })
  })
})

describe('nchat Parser', () => {
  describe('parseNchatExport', () => {
    it('should parse nchat export correctly', () => {
      const result = parseNchatExport(nchatExportSample)

      expect(result.platform).toBe('nchat')
      expect(result.users).toHaveLength(2)
      expect(result.channels).toHaveLength(1)
      expect(result.messages).toHaveLength(2)
    })

    it('should preserve user data', () => {
      const result = parseNchatExport(nchatExportSample)

      const alice = result.users.find((u) => u.username === 'alice')
      expect(alice?.externalId).toBe('user-1')
      expect(alice?.displayName).toBe('Alice')
    })

    it('should preserve channel data', () => {
      const result = parseNchatExport(nchatExportSample)

      expect(result.channels[0].externalId).toBe('channel-1')
      expect(result.channels[0].name).toBe('general')
    })

    it('should preserve message data', () => {
      const result = parseNchatExport(nchatExportSample)

      const msg = result.messages[0]
      expect(msg.externalId).toBe('msg-1')
      expect(msg.content).toBe('Hello!')
      expect(msg.channelId).toBe('channel-1')
    })

    it('should throw on invalid format', () => {
      const invalidExport = JSON.stringify({ data: 'invalid' })

      expect(() => parseNchatExport(invalidExport)).toThrow()
    })
  })
})

describe('ConversationImporter', () => {
  describe('parseImport', () => {
    it('should automatically detect and parse WhatsApp', () => {
      const importer = new ConversationImporter()
      const result = importer.parseImport(whatsappExportSample)

      expect(result.platform).toBe('whatsapp')
      expect(result.messages.length).toBeGreaterThan(0)
    })

    it('should automatically detect and parse Telegram', () => {
      const importer = new ConversationImporter()
      const result = importer.parseImport(telegramExportSample)

      expect(result.platform).toBe('telegram')
    })

    it('should automatically detect and parse nchat', () => {
      const importer = new ConversationImporter()
      const result = importer.parseImport(nchatExportSample)

      expect(result.platform).toBe('nchat')
    })
  })

  describe('validateData', () => {
    it('should validate data with messages', () => {
      const importer = new ConversationImporter()
      const data = importer.parseImport(whatsappExportSample)
      const options = createDefaultImportOptions('whatsapp')

      const result = importer.validateData(data, options)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should fail validation when no messages', () => {
      const importer = new ConversationImporter()
      const emptyData: ParsedImportData = {
        platform: 'whatsapp',
        users: [],
        channels: [],
        messages: [],
      }
      const options = createDefaultImportOptions('whatsapp')

      const result = importer.validateData(emptyData, options)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })

    it('should warn about orphaned messages', () => {
      const importer = new ConversationImporter()
      const data: ParsedImportData = {
        platform: 'generic',
        users: [],
        channels: [{ externalId: 'ch1', name: 'Channel 1', type: 'public' }],
        messages: [
          {
            externalId: 'msg1',
            channelId: 'ch2', // Non-existent channel
            userId: 'user1',
            content: 'Hello',
            type: 'text',
            createdAt: new Date().toISOString(),
          },
        ],
      }
      const options = createDefaultImportOptions('generic', {
        createMissingChannels: false,
      })

      const result = importer.validateData(data, options)

      expect(result.warnings.length).toBeGreaterThan(0)
      expect(result.warnings[0].code).toBe('ORPHANED_MESSAGES')
    })
  })

  describe('import', () => {
    it('should track progress during import', async () => {
      const progressUpdates: Array<{ progress: number; phase: string }> = []

      const importer = new ConversationImporter((progress) => {
        progressUpdates.push({
          progress: progress.progress,
          phase: progress.phase,
        })
      })

      const data = importer.parseImport(whatsappExportSample)
      const options = createDefaultImportOptions('whatsapp')

      await importer.import(data, options)

      expect(progressUpdates.length).toBeGreaterThan(0)
    })

    it('should return import statistics', async () => {
      const importer = new ConversationImporter()
      const data = importer.parseImport(whatsappExportSample)
      const options = createDefaultImportOptions('whatsapp')

      const result = await importer.import(data, options)

      expect(result.stats).toBeDefined()
      expect(result.stats.messagesImported).toBeDefined()
      expect(result.stats.duration).toBeGreaterThanOrEqual(0)
    })

    it('should map user IDs correctly', async () => {
      const importer = new ConversationImporter()
      const data = importer.parseImport(whatsappExportSample)
      const options = createDefaultImportOptions('whatsapp')

      const result = await importer.import(data, options)

      expect(Object.keys(result.userIdMap).length).toBeGreaterThan(0)
    })

    it('should handle cancellation', () => {
      const importer = new ConversationImporter()

      importer.cancel()

      expect(importer.getProgress().status).toBe('cancelled')
    })
  })

  describe('getMappings', () => {
    it('should return ID mappings after import', async () => {
      const importer = new ConversationImporter()
      const data = importer.parseImport(whatsappExportSample)
      const options = createDefaultImportOptions('whatsapp')

      await importer.import(data, options)
      const mappings = importer.getMappings()

      expect(mappings.userIdMap).toBeDefined()
      expect(mappings.channelIdMap).toBeDefined()
      expect(mappings.messageIdMap).toBeDefined()
    })
  })
})

describe('Utility Functions', () => {
  describe('createDefaultImportOptions', () => {
    it('should create default options for platform', () => {
      const options = createDefaultImportOptions('whatsapp')

      expect(options.platform).toBe('whatsapp')
      expect(options.createMissingChannels).toBe(true)
      expect(options.importMedia).toBe(true)
      expect(options.conflictResolution).toBe('skip')
    })

    it('should allow overriding defaults', () => {
      const options = createDefaultImportOptions('telegram', {
        createMissingChannels: false,
        conflictResolution: 'overwrite',
      })

      expect(options.createMissingChannels).toBe(false)
      expect(options.conflictResolution).toBe('overwrite')
      expect(options.importMedia).toBe(true) // Default preserved
    })
  })

  describe('estimateImportTime', () => {
    it('should estimate time based on data size', () => {
      const data: ParsedImportData = {
        platform: 'whatsapp',
        users: [{ externalId: 'u1', username: 'alice', displayName: 'Alice' }],
        channels: [{ externalId: 'c1', name: 'channel', type: 'public' }],
        messages: Array.from({ length: 100 }, (_, i) => ({
          externalId: `msg${i}`,
          channelId: 'c1',
          userId: 'u1',
          content: 'Hello',
          type: 'text' as const,
          createdAt: new Date().toISOString(),
        })),
      }

      const estimate = estimateImportTime(data)

      expect(estimate).toBeGreaterThan(0)
    })

    it('should return higher estimate for more data', () => {
      const smallData: ParsedImportData = {
        platform: 'whatsapp',
        users: [],
        channels: [],
        messages: Array.from({ length: 10 }, (_, i) => ({
          externalId: `msg${i}`,
          channelId: 'c1',
          userId: 'u1',
          content: 'Hello',
          type: 'text' as const,
          createdAt: new Date().toISOString(),
        })),
      }

      const largeData: ParsedImportData = {
        platform: 'whatsapp',
        users: [],
        channels: [],
        messages: Array.from({ length: 1000 }, (_, i) => ({
          externalId: `msg${i}`,
          channelId: 'c1',
          userId: 'u1',
          content: 'Hello',
          type: 'text' as const,
          createdAt: new Date().toISOString(),
        })),
      }

      expect(estimateImportTime(largeData)).toBeGreaterThan(
        estimateImportTime(smallData)
      )
    })

    it('should account for attachments', () => {
      const withoutAttachments: ParsedImportData = {
        platform: 'whatsapp',
        users: [],
        channels: [],
        messages: [
          {
            externalId: 'msg1',
            channelId: 'c1',
            userId: 'u1',
            content: 'Hello',
            type: 'text',
            createdAt: new Date().toISOString(),
          },
        ],
      }

      const withAttachments: ParsedImportData = {
        platform: 'whatsapp',
        users: [],
        channels: [],
        messages: [
          {
            externalId: 'msg1',
            channelId: 'c1',
            userId: 'u1',
            content: 'Hello',
            type: 'media',
            createdAt: new Date().toISOString(),
            attachments: [
              { type: 'image', fileName: 'photo.jpg', url: 'http://example.com' },
            ],
          },
        ],
      }

      expect(estimateImportTime(withAttachments)).toBeGreaterThan(
        estimateImportTime(withoutAttachments)
      )
    })
  })
})
