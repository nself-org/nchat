/**
 * @jest-environment node
 */

/**
 * Bot API Routes Tests
 *
 * Comprehensive test suite for all Bot API routes:
 * - GET/POST /api/bots
 * - GET/PUT/DELETE /api/bots/[id]
 * - POST /api/bots/[id]/enable
 * - GET /api/bots/[id]/logs
 * - GET/POST /api/bots/templates
 * - POST /api/bots/templates/[id]/instantiate
 *
 * Tests cover:
 * - Request validation
 * - CRUD operations
 * - Error responses
 * - Success responses with correct format
 * - Filtering and pagination
 */

import { NextRequest } from 'next/server'
import { GET as botsGet, POST as botsPost } from '../bots/route'
import { GET as botGet, PUT as botPut, DELETE as botDelete } from '../bots/[id]/route'
import { POST as botEnablePost } from '../bots/[id]/enable/route'
import { GET as botLogsGet } from '../bots/[id]/logs/route'
import { GET as templatesGet, POST as templatesPost } from '../bots/templates/route'
import { POST as templateInstantiate } from '../bots/templates/[id]/instantiate/route'

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  })),
}))

// Mock auth middleware — getAuthenticatedUser must return a valid user object
// so that route handlers pass their auth check before processing requests.
jest.mock('@/lib/api/middleware', () => ({
  getAuthenticatedUser: jest.fn().mockResolvedValue({
    id: 'test-user-id',
    email: 'test@example.com',
    displayName: 'Test User',
    role: 'admin',
  }),
  getClientIp: jest.fn(() => '127.0.0.1'),
}))

// Mock bot templates
jest.mock('@/lib/bots/templates', () => ({
  allTemplates: [
    {
      id: 'template-1',
      name: 'Welcome Bot',
      description: 'Welcomes new users',
      category: 'utility',
      code: 'console.log("Welcome!")',
      defaultConfig: {},
    },
    {
      id: 'template-2',
      name: 'Moderator Bot',
      description: 'Moderates content',
      category: 'moderation',
      code: 'console.log("Moderating...")',
      defaultConfig: {},
    },
  ],
  getTemplate: jest.fn((id: string) => {
    if (id === 'template-1') {
      return {
        id: 'template-1',
        name: 'Welcome Bot',
        description: 'Welcomes new users',
        category: 'utility',
        code: 'console.log("Welcome!")',
        defaultConfig: { greeting: 'Hello!' },
      }
    }
    return null
  }),
  getTemplatesByCategory: jest.fn((category: string) => {
    if (category === 'utility') {
      return [
        {
          id: 'template-1',
          name: 'Welcome Bot',
          description: 'Welcomes new users',
          category: 'utility',
          code: 'console.log("Welcome!")',
          defaultConfig: {},
        },
      ]
    }
    return []
  }),
  getFeaturedTemplates: jest.fn(() => [
    {
      id: 'template-1',
      name: 'Welcome Bot',
      description: 'Welcomes new users',
      category: 'utility',
      code: 'console.log("Welcome!")',
      defaultConfig: {},
    },
  ]),
}))

describe('Bot API Routes', () => {
  // ====================================
  // GET /api/bots
  // ====================================
  describe('GET /api/bots', () => {
    it('should return all bots', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots')

      const response = await botsGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.count).toBeDefined()
    })

    it('should filter bots by enabled status', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots?enabled=true')

      const response = await botsGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should filter bots by template_id', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots?template_id=template-1')

      const response = await botsGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should filter bots by created_by', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots?created_by=user-1')

      const response = await botsGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should handle multiple filters', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/bots?enabled=true&template_id=template-1'
      )

      const response = await botsGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ====================================
  // POST /api/bots
  // ====================================
  describe('POST /api/bots', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await botsPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing required fields')
      expect(data.fields).toContain('name')
      expect(data.fields).toContain('description')
      expect(data.fields).toContain('code')
    })

    it('should successfully create a bot', async () => {
      const botData = {
        name: 'Test Bot',
        description: 'A test bot',
        code: 'console.log("test")',
        version: '1.0.0',
        created_by: 'user-1',
      }

      const request = new NextRequest('http://localhost:3000/api/bots', {
        method: 'POST',
        body: JSON.stringify(botData),
      })

      const response = await botsPost(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.name).toBe('Test Bot')
      expect(data.data.id).toBeDefined()
      expect(data.message).toBe('Bot created successfully')
    })

    it('should use default values for optional fields', async () => {
      const botData = {
        name: 'Test Bot',
        description: 'A test bot',
        code: 'console.log("test")',
      }

      const request = new NextRequest('http://localhost:3000/api/bots', {
        method: 'POST',
        body: JSON.stringify(botData),
      })

      const response = await botsPost(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.version).toBe('1.0.0')
      expect(data.data.enabled).toBe(true)
      expect(data.data.sandbox_enabled).toBe(true)
      expect(data.data.rate_limit_per_minute).toBe(60)
      expect(data.data.timeout_ms).toBe(5000)
    })

    it('should create bot with custom config', async () => {
      const botData = {
        name: 'Custom Bot',
        description: 'Bot with custom config',
        code: 'console.log("custom")',
        config: { apiKey: 'secret', webhookUrl: 'https://example.com' },
      }

      const request = new NextRequest('http://localhost:3000/api/bots', {
        method: 'POST',
        body: JSON.stringify(botData),
      })

      const response = await botsPost(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.config).toEqual(botData.config)
    })
  })

  // ====================================
  // GET /api/bots/[id]
  // ====================================
  describe('GET /api/bots/[id]', () => {
    it('should return 404 if bot not found', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/nonexistent')
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await botGet(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bot not found')
    })

    it('should return bot if found', async () => {
      // First create a bot
      const createRequest = new NextRequest('http://localhost:3000/api/bots', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Bot',
          description: 'A test bot',
          code: 'console.log("test")',
        }),
      })
      const createResponse = await botsPost(createRequest)
      const createData = await createResponse.json()
      const botId = createData.data.id

      // Now get the bot
      const request = new NextRequest(`http://localhost:3000/api/bots/${botId}`)
      const params = Promise.resolve({ id: botId })

      const response = await botGet(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.id).toBe(botId)
    })
  })

  // ====================================
  // PUT /api/bots/[id]
  // ====================================
  describe('PUT /api/bots/[id]', () => {
    it('should return 404 if bot not found', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/nonexistent', {
        method: 'PUT',
        body: JSON.stringify({ name: 'Updated Name' }),
      })
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await botPut(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bot not found')
    })

    it('should successfully update bot', async () => {
      // Create a bot first
      const createRequest = new NextRequest('http://localhost:3000/api/bots', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Bot',
          description: 'A test bot',
          code: 'console.log("test")',
        }),
      })
      const createResponse = await botsPost(createRequest)
      const createData = await createResponse.json()
      const botId = createData.data.id

      // Update the bot
      const updateRequest = new NextRequest(`http://localhost:3000/api/bots/${botId}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: 'Updated Bot Name',
          description: 'Updated description',
        }),
      })
      const params = Promise.resolve({ id: botId })

      const response = await botPut(updateRequest, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.name).toBe('Updated Bot Name')
      expect(data.data.description).toBe('Updated description')
      expect(data.message).toBe('Bot updated successfully')
    })

    it('should only update provided fields', async () => {
      // Create a bot first
      const createRequest = new NextRequest('http://localhost:3000/api/bots', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Bot',
          description: 'Original description',
          code: 'console.log("test")',
        }),
      })
      const createResponse = await botsPost(createRequest)
      const createData = await createResponse.json()
      const botId = createData.data.id

      // Update only name
      const updateRequest = new NextRequest(`http://localhost:3000/api/bots/${botId}`, {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name' }),
      })
      const params = Promise.resolve({ id: botId })

      const response = await botPut(updateRequest, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.name).toBe('New Name')
      expect(data.data.description).toBe('Original description')
    })
  })

  // ====================================
  // DELETE /api/bots/[id]
  // ====================================
  describe('DELETE /api/bots/[id]', () => {
    it('should return 404 if bot not found', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/nonexistent', {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await botDelete(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Bot not found')
    })

    it('should successfully delete bot', async () => {
      // Create a bot first
      const createRequest = new NextRequest('http://localhost:3000/api/bots', {
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Bot',
          description: 'A test bot',
          code: 'console.log("test")',
        }),
      })
      const createResponse = await botsPost(createRequest)
      const createData = await createResponse.json()
      const botId = createData.data.id

      // Delete the bot
      const deleteRequest = new NextRequest(`http://localhost:3000/api/bots/${botId}`, {
        method: 'DELETE',
      })
      const params = Promise.resolve({ id: botId })

      const response = await botDelete(deleteRequest, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.message).toBe('Bot deleted successfully')

      // Verify bot is deleted
      const getRequest = new NextRequest(`http://localhost:3000/api/bots/${botId}`)
      const getResponse = await botGet(getRequest, { params })
      const getData = await getResponse.json()

      expect(getResponse.status).toBe(404)
    })
  })

  // ====================================
  // POST /api/bots/[id]/enable
  // ====================================
  describe('POST /api/bots/[id]/enable', () => {
    it('should return 400 if enabled field is missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/bot-1/enable', {
        method: 'POST',
        body: JSON.stringify({}),
      })
      const params = Promise.resolve({ id: 'bot-1' })

      const response = await botEnablePost(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Invalid request')
    })

    it('should return 400 if enabled is not a boolean', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/bot-1/enable', {
        method: 'POST',
        body: JSON.stringify({ enabled: 'true' }),
      })
      const params = Promise.resolve({ id: 'bot-1' })

      const response = await botEnablePost(request, { params })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.message).toContain('must be a boolean')
    })

    it('should successfully enable bot', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/bot-1/enable', {
        method: 'POST',
        body: JSON.stringify({ enabled: true }),
      })
      const params = Promise.resolve({ id: 'bot-1' })

      const response = await botEnablePost(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.enabled).toBe(true)
      expect(data.message).toContain('enabled')
    })

    it('should successfully disable bot', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/bot-1/enable', {
        method: 'POST',
        body: JSON.stringify({ enabled: false }),
      })
      const params = Promise.resolve({ id: 'bot-1' })

      const response = await botEnablePost(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.enabled).toBe(false)
      expect(data.message).toContain('disabled')
    })
  })

  // ====================================
  // GET /api/bots/[id]/logs
  // ====================================
  describe('GET /api/bots/[id]/logs', () => {
    it('should return bot logs with default pagination', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/bot-1/logs')
      const params = Promise.resolve({ id: 'bot-1' })

      const response = await botLogsGet(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.pagination).toBeDefined()
      expect(data.pagination.limit).toBe(50)
      expect(data.pagination.offset).toBe(0)
    })

    it('should support custom limit and offset', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/bots/bot-1/logs?limit=10&offset=20'
      )
      const params = Promise.resolve({ id: 'bot-1' })

      const response = await botLogsGet(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.pagination.limit).toBe(10)
      expect(data.pagination.offset).toBe(20)
    })

    it('should support event_type filter', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/bots/bot-1/logs?event_type=message_received'
      )
      const params = Promise.resolve({ id: 'bot-1' })

      const response = await botLogsGet(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })

    it('should support success filter', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/bot-1/logs?success=true')
      const params = Promise.resolve({ id: 'bot-1' })

      const response = await botLogsGet(request, { params })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
    })
  })

  // ====================================
  // GET /api/bots/templates
  // ====================================
  describe('GET /api/bots/templates', () => {
    it('should return all templates', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/templates')

      const response = await templatesGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(Array.isArray(data.data)).toBe(true)
      expect(data.count).toBe(2)
    })

    it('should filter templates by category', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/templates?category=utility')

      const response = await templatesGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.count).toBe(1)
    })

    it('should return featured templates', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/templates?featured=true')

      const response = await templatesGet(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.count).toBe(1)
    })
  })

  // ====================================
  // POST /api/bots/templates
  // ====================================
  describe('POST /api/bots/templates', () => {
    it('should return 400 if required fields are missing', async () => {
      const request = new NextRequest('http://localhost:3000/api/bots/templates', {
        method: 'POST',
        body: JSON.stringify({}),
      })

      const response = await templatesPost(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Missing required fields')
      expect(data.fields).toContain('id')
      expect(data.fields).toContain('name')
      expect(data.fields).toContain('code')
    })

    it('should successfully create custom template', async () => {
      const templateData = {
        id: 'custom-template-1',
        name: 'Custom Template',
        description: 'A custom template',
        category: 'custom',
        code: 'console.log("custom")',
        icon: '🤖',
      }

      const request = new NextRequest('http://localhost:3000/api/bots/templates', {
        method: 'POST',
        body: JSON.stringify(templateData),
      })

      const response = await templatesPost(request)
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.id).toBe('custom-template-1')
      expect(data.data.is_system).toBe(false)
      expect(data.message).toBe('Template created successfully')
    })
  })

  // ====================================
  // POST /api/bots/templates/[id]/instantiate
  // ====================================
  describe('POST /api/bots/templates/[id]/instantiate', () => {
    it('should return 404 if template not found', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/bots/templates/nonexistent/instantiate',
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      )
      const params = Promise.resolve({ id: 'nonexistent' })

      const response = await templateInstantiate(request, { params })
      const data = await response.json()

      expect(response.status).toBe(404)
      expect(data.success).toBe(false)
      expect(data.error).toBe('Template not found')
    })

    it('should successfully instantiate bot from template', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/bots/templates/template-1/instantiate',
        {
          method: 'POST',
          body: JSON.stringify({
            name: 'My Welcome Bot',
            created_by: 'user-1',
          }),
        }
      )
      const params = Promise.resolve({ id: 'template-1' })

      const response = await templateInstantiate(request, { params })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data).toBeDefined()
      expect(data.data.template_id).toBe('template-1')
      expect(data.data.name).toBe('My Welcome Bot')
      expect(data.message).toBe('Bot created from template successfully')
    })

    it('should use template defaults if name not provided', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/bots/templates/template-1/instantiate',
        {
          method: 'POST',
          body: JSON.stringify({}),
        }
      )
      const params = Promise.resolve({ id: 'template-1' })

      const response = await templateInstantiate(request, { params })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.name).toBe('Welcome Bot')
      expect(data.data.description).toBe('Welcomes new users')
    })

    it('should merge custom config with template defaults', async () => {
      const request = new NextRequest(
        'http://localhost:3000/api/bots/templates/template-1/instantiate',
        {
          method: 'POST',
          body: JSON.stringify({
            config: { greeting: 'Hi there!', customField: 'value' },
          }),
        }
      )
      const params = Promise.resolve({ id: 'template-1' })

      const response = await templateInstantiate(request, { params })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.config.greeting).toBe('Hi there!')
      expect(data.data.config.customField).toBe('value')
    })
  })
})
