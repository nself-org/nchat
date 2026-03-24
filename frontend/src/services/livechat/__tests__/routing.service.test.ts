/**
 * Routing Service Tests
 *
 * Comprehensive tests for visitor-to-agent routing functionality.
 */

import {
  RoutingService,
  createRoutingService,
  resetRoutingService,
} from '../routing.service'
import {
  LivechatService,
  createLivechatService,
  resetLivechatService,
} from '../livechat.service'
import type { Conversation, Agent } from '../types'

describe('RoutingService', () => {
  let routingService: RoutingService
  let livechatService: LivechatService

  beforeEach(() => {
    resetLivechatService()
    resetRoutingService()
    livechatService = createLivechatService()
    routingService = createRoutingService()
  })

  afterEach(() => {
    routingService.clearAll()
    livechatService.clearAll()
  })

  // Helper to create a test conversation
  async function createTestConversation(options: {
    priority?: 'low' | 'medium' | 'high' | 'urgent'
    department?: string
    channel?: 'web_widget' | 'email'
  } = {}): Promise<Conversation> {
    const visitorResult = await livechatService.createVisitor({
      name: 'Test Visitor',
      channel: options.channel || 'web_widget',
    })

    const conversationResult = await livechatService.createConversation({
      visitorId: visitorResult.data!.id,
      channel: options.channel || 'web_widget',
      priority: options.priority || 'medium',
      department: options.department,
    })

    return conversationResult.data!
  }

  // Helper to create a test agent
  async function createTestAgent(options: {
    departments?: string[]
    skills?: string[]
    languages?: string[]
    maxConcurrent?: number
    priority?: number
    available?: boolean
  } = {}): Promise<Agent> {
    const agentResult = await livechatService.createAgent({
      userId: `user-${Date.now()}-${Math.random()}`,
      departments: options.departments || [],
      skills: options.skills || [],
      languages: options.languages || ['en'],
      maxConcurrentChats: options.maxConcurrent || 5,
      priority: options.priority || 1,
    })

    if (options.available !== false) {
      await livechatService.updateAgentStatus(agentResult.data!.id, 'available')
    }

    return agentResult.data!
  }

  // ==========================================================================
  // CONFIGURATION TESTS
  // ==========================================================================

  describe('Configuration', () => {
    describe('getConfig', () => {
      it('should return default configuration', () => {
        const config = routingService.getConfig()

        expect(config.method).toBe('auto_selection')
        expect(config.enabled).toBe(true)
        expect(config.showQueue).toBe(true)
        expect(config.assignTimeout).toBe(60)
      })
    })

    describe('updateConfig', () => {
      it('should update routing configuration', () => {
        const config = routingService.updateConfig({
          method: 'load_balancing',
          assignTimeout: 120,
        })

        expect(config.method).toBe('load_balancing')
        expect(config.assignTimeout).toBe(120)
      })

      it('should preserve unmodified settings', () => {
        const original = routingService.getConfig()

        routingService.updateConfig({ method: 'skill_based' })

        const updated = routingService.getConfig()

        expect(updated.method).toBe('skill_based')
        expect(updated.showQueue).toBe(original.showQueue)
        expect(updated.enabled).toBe(original.enabled)
      })
    })

    describe('resetConfig', () => {
      it('should reset to default configuration', () => {
        routingService.updateConfig({
          method: 'load_balancing',
          assignTimeout: 300,
        })

        routingService.resetConfig()

        const config = routingService.getConfig()

        expect(config.method).toBe('auto_selection')
        expect(config.assignTimeout).toBe(60)
      })
    })
  })

  // ==========================================================================
  // ROUTING TESTS
  // ==========================================================================

  describe('Routing', () => {
    describe('routeConversation', () => {
      it('should route to available agent', async () => {
        const agent = await createTestAgent()
        const conversation = await createTestConversation()

        const result = await routingService.routeConversation(conversation)

        expect(result.success).toBe(true)
        expect(result.data?.selectedAgentId).toBe(agent.id)
        expect(result.data?.reason).toContain('auto_selection')
      })

      it('should not route when disabled', async () => {
        routingService.updateConfig({ enabled: false })
        const agent = await createTestAgent()
        const conversation = await createTestConversation()

        const result = await routingService.routeConversation(conversation)

        expect(result.success).toBe(true)
        expect(result.data?.selectedAgentId).toBeUndefined()
        expect(result.data?.reason).toContain('disabled')
      })

      it('should handle no available agents', async () => {
        const conversation = await createTestConversation()

        const result = await routingService.routeConversation(conversation)

        expect(result.success).toBe(true)
        expect(result.data?.selectedAgentId).toBeUndefined()
        expect(result.data?.alternativeAgents).toEqual([])
      })

      it('should list alternative agents', async () => {
        const agent1 = await createTestAgent()
        const agent2 = await createTestAgent()
        const conversation = await createTestConversation()

        const result = await routingService.routeConversation(conversation)

        expect(result.data?.alternativeAgents.length).toBe(1)
        expect([agent1.id, agent2.id]).toContain(result.data?.alternativeAgents[0])
      })
    })

    describe('Auto Selection (Round Robin)', () => {
      it('should rotate between agents', async () => {
        const agent1 = await createTestAgent()
        const agent2 = await createTestAgent()

        // Make 3 routing calls to ensure we cycle through the rotation
        const conversation1 = await createTestConversation()
        const result1 = await routingService.routeConversation(conversation1)

        const conversation2 = await createTestConversation()
        const result2 = await routingService.routeConversation(conversation2)

        const conversation3 = await createTestConversation()
        const result3 = await routingService.routeConversation(conversation3)

        // With 2 agents, after 3 calls we should have used both at least once
        const selectedAgents = [
          result1.data?.selectedAgentId,
          result2.data?.selectedAgentId,
          result3.data?.selectedAgentId,
        ]
        const uniqueAgents = new Set(selectedAgents.filter(Boolean))
        expect(uniqueAgents.size).toBe(2) // Both agents should have been selected
      })

      it('should use separate rotation per department', async () => {
        const agent1 = await createTestAgent({ departments: ['sales'] })
        const agent2 = await createTestAgent({ departments: ['support'] })

        const salesConv = await createTestConversation({ department: 'sales' })
        const supportConv = await createTestConversation({ department: 'support' })

        const salesResult = await routingService.routeConversation(salesConv)
        const supportResult = await routingService.routeConversation(supportConv)

        expect(salesResult.data?.selectedAgentId).toBe(agent1.id)
        expect(supportResult.data?.selectedAgentId).toBe(agent2.id)
      })
    })

    describe('Load Balancing', () => {
      beforeEach(() => {
        routingService.updateConfig({ method: 'load_balancing' })
      })

      it('should select agent with lowest load', async () => {
        const agent1 = await createTestAgent({ maxConcurrent: 5 })
        const agent2 = await createTestAgent({ maxConcurrent: 5 })

        // Give agent1 some active chats
        const visitor = await livechatService.createVisitor({
          name: 'V',
          channel: 'web_widget',
        })
        const conv = await livechatService.createConversation({
          visitorId: visitor.data!.id,
          channel: 'web_widget',
        })
        await livechatService.assignAgent(conv.data!.id, agent1.id)

        // Route new conversation
        const testConv = await createTestConversation()
        const result = await routingService.routeConversation(testConv)

        expect(result.data?.selectedAgentId).toBe(agent2.id)
      })
    })

    describe('Priority Based', () => {
      beforeEach(() => {
        routingService.updateConfig({ method: 'priority_based' })
      })

      it('should select highest priority agent', async () => {
        const lowPriorityAgent = await createTestAgent({ priority: 1 })
        const highPriorityAgent = await createTestAgent({ priority: 10 })

        const conversation = await createTestConversation()
        const result = await routingService.routeConversation(conversation)

        expect(result.data?.selectedAgentId).toBe(highPriorityAgent.id)
      })
    })

    describe('Skill Based', () => {
      beforeEach(() => {
        routingService.updateConfig({ method: 'skill_based' })
      })

      it('should prefer agents with matching skills', async () => {
        const generalAgent = await createTestAgent({ skills: ['general'] })
        const billingAgent = await createTestAgent({ skills: ['billing', 'accounts'] })

        const visitor = await livechatService.createVisitor({
          name: 'Visitor',
          channel: 'web_widget',
        })

        const convResult = await livechatService.createConversation({
          visitorId: visitor.data!.id,
          channel: 'web_widget',
          customFields: { requiredSkills: ['billing'] },
        })

        const result = await routingService.routeConversation(convResult.data!)

        expect(result.data?.selectedAgentId).toBe(billingAgent.id)
      })

      it('should require skills when configured', async () => {
        routingService.updateConfig({
          method: 'skill_based',
          skillsMatchRequired: true,
        })

        const generalAgent = await createTestAgent({ skills: ['general'] })

        const visitor = await livechatService.createVisitor({
          name: 'Visitor',
          channel: 'web_widget',
        })

        const convResult = await livechatService.createConversation({
          visitorId: visitor.data!.id,
          channel: 'web_widget',
          customFields: { requiredSkills: ['billing'] },
        })

        const result = await routingService.routeConversation(convResult.data!)

        expect(result.data?.selectedAgentId).toBeUndefined()
      })

      it('should prefer agents with matching language when language match is required', async () => {
        routingService.updateConfig({
          method: 'skill_based',
          languageMatchRequired: true,  // Enable language matching
        })

        // Create English-only agent first (will be filtered out for Spanish-speaking visitor)
        const englishAgent = await createTestAgent({ languages: ['en'] })
        // Create agent who speaks Spanish
        const spanishAgent = await createTestAgent({ languages: ['es', 'en'] })

        const visitor = await livechatService.createVisitor({
          name: 'Visitor',
          channel: 'web_widget',
        })

        await livechatService.updateVisitor(visitor.data!.id, {
          metadata: { language: 'es' },
        })

        const convResult = await livechatService.createConversation({
          visitorId: visitor.data!.id,
          channel: 'web_widget',
        })

        // Update conversation visitor with language
        const conversation = convResult.data!
        conversation.visitor.language = 'es'

        const result = await routingService.routeConversation(conversation)

        // Spanish agent should be selected (or only Spanish-speaking agents are eligible)
        expect(result.data?.selectedAgentId).toBe(spanishAgent.id)
      })
    })

    describe('Manual Selection', () => {
      beforeEach(() => {
        routingService.updateConfig({ method: 'manual_selection' })
      })

      it('should not auto-assign in manual mode', async () => {
        await createTestAgent()
        const conversation = await createTestConversation()

        const result = await routingService.routeConversation(conversation)

        expect(result.data?.selectedAgentId).toBeUndefined()
      })
    })

    describe('Offline Action', () => {
      it('should queue when no agents available', async () => {
        routingService.updateConfig({ offlineAction: 'queue' })
        const conversation = await createTestConversation()

        const result = await routingService.routeConversation(conversation)

        expect(result.data?.metadata?.action).toBe('queued')
      })

      it('should send message when configured', async () => {
        routingService.updateConfig({
          offlineAction: 'message',
          offlineMessage: 'We are offline',
        })
        const conversation = await createTestConversation()

        const result = await routingService.routeConversation(conversation)

        expect(result.data?.metadata?.action).toBe('message_sent')

        // Verify message was sent — the routing service sends with senderType 'bot' and type 'system'
        const messagesResult = await livechatService.getMessages(conversation.id, {})
        const offlineMessage = messagesResult.data?.items.find(
          (m) => m.content === 'We are offline'
        )
        expect(offlineMessage).toBeDefined()
        expect(offlineMessage?.content).toBe('We are offline')
      })
    })
  })

  // ==========================================================================
  // ROUTING RULES TESTS
  // ==========================================================================

  describe('Routing Rules', () => {
    describe('addRule', () => {
      it('should add a routing rule', () => {
        const rule = routingService.addRule({
          name: 'VIP Rule',
          enabled: true,
          priority: 100,
          conditions: [
            { field: 'visitor_tag', operator: 'contains', value: 'vip' },
          ],
          action: {
            type: 'set_priority',
            priority: 'urgent',
          },
        })

        expect(rule.id).toBeDefined()
        expect(rule.name).toBe('VIP Rule')
      })

      it('should sort rules by priority', () => {
        routingService.addRule({
          name: 'Low Priority',
          enabled: true,
          priority: 10,
          conditions: [],
          action: { type: 'set_priority', priority: 'low' },
        })

        routingService.addRule({
          name: 'High Priority',
          enabled: true,
          priority: 100,
          conditions: [],
          action: { type: 'set_priority', priority: 'high' },
        })

        const rules = routingService.getRules()

        expect(rules[0].name).toBe('High Priority')
        expect(rules[1].name).toBe('Low Priority')
      })
    })

    describe('updateRule', () => {
      it('should update a routing rule', () => {
        const rule = routingService.addRule({
          name: 'Original',
          enabled: true,
          priority: 50,
          conditions: [],
          action: { type: 'set_priority', priority: 'medium' },
        })

        const updated = routingService.updateRule(rule.id, {
          name: 'Updated',
          enabled: false,
        })

        expect(updated?.name).toBe('Updated')
        expect(updated?.enabled).toBe(false)
      })

      it('should return null for non-existent rule', () => {
        const result = routingService.updateRule('non-existent', { name: 'Test' })

        expect(result).toBeNull()
      })
    })

    describe('deleteRule', () => {
      it('should delete a routing rule', () => {
        const rule = routingService.addRule({
          name: 'To Delete',
          enabled: true,
          priority: 50,
          conditions: [],
          action: { type: 'set_priority', priority: 'medium' },
        })

        const deleted = routingService.deleteRule(rule.id)

        expect(deleted).toBe(true)
        expect(routingService.getRules().length).toBe(0)
      })

      it('should return false for non-existent rule', () => {
        const result = routingService.deleteRule('non-existent')

        expect(result).toBe(false)
      })
    })

    describe('Rule Matching', () => {
      it('should match department condition', async () => {
        const salesAgent = await createTestAgent({ departments: ['sales'] })

        routingService.addRule({
          name: 'Sales Rule',
          enabled: true,
          priority: 100,
          conditions: [
            { field: 'department', operator: 'equals', value: 'sales' },
          ],
          action: {
            type: 'assign_agent',
            agentId: salesAgent.id,
          },
        })

        const conversation = await createTestConversation({ department: 'sales' })
        const result = await routingService.routeConversation(conversation)

        expect(result.data?.selectedAgentId).toBe(salesAgent.id)
        expect(result.data?.reason).toContain('Rule matched');
      })

      it('should match channel condition', async () => {
        const emailAgent = await createTestAgent()

        routingService.addRule({
          name: 'Email Rule',
          enabled: true,
          priority: 100,
          conditions: [
            { field: 'channel', operator: 'equals', value: 'email' },
          ],
          action: {
            type: 'assign_agent',
            agentId: emailAgent.id,
          },
        })

        const conversation = await createTestConversation({ channel: 'email' })
        const result = await routingService.routeConversation(conversation)

        expect(result.data?.selectedAgentId).toBe(emailAgent.id)
      })

      it('should match priority condition', async () => {
        const urgentAgent = await createTestAgent()

        routingService.addRule({
          name: 'Urgent Rule',
          enabled: true,
          priority: 100,
          conditions: [
            { field: 'priority', operator: 'equals', value: 'urgent' },
          ],
          action: {
            type: 'assign_agent',
            agentId: urgentAgent.id,
          },
        })

        const conversation = await createTestConversation({ priority: 'urgent' })
        const result = await routingService.routeConversation(conversation)

        expect(result.data?.selectedAgentId).toBe(urgentAgent.id)
      })

      it('should skip disabled rules', async () => {
        const agent = await createTestAgent()

        routingService.addRule({
          name: 'Disabled Rule',
          enabled: false,
          priority: 100,
          conditions: [
            { field: 'priority', operator: 'equals', value: 'high' },
          ],
          action: {
            type: 'assign_agent',
            agentId: 'specific-agent',
          },
        })

        const conversation = await createTestConversation({ priority: 'high' })
        const result = await routingService.routeConversation(conversation)

        // Should fall through to normal routing
        expect(result.data?.selectedAgentId).toBe(agent.id)
      })

      it('should match multiple conditions (AND)', async () => {
        // Create multiple agents for the VIP department
        const vipSpecialist = await createTestAgent({ departments: ['vip'], priority: 2 })
        const vipBackup = await createTestAgent({ departments: ['vip'], priority: 1 })

        routingService.addRule({
          name: 'VIP High Priority Rule',
          enabled: true,
          priority: 100,
          conditions: [
            { field: 'department', operator: 'equals', value: 'vip' },
            { field: 'priority', operator: 'equals', value: 'high' },
          ],
          action: {
            type: 'assign_agent',
            agentId: vipSpecialist.id,
          },
        })

        // Matches both conditions - should go to vipSpecialist via rule
        const vipHighConv = await createTestConversation({ department: 'vip', priority: 'high' })
        const vipHighResult = await routingService.routeConversation(vipHighConv)

        // Only matches department (not priority) - should fall through to normal routing
        const vipLowConv = await createTestConversation({ department: 'vip', priority: 'low' })
        const vipLowResult = await routingService.routeConversation(vipLowConv)

        // VIP high priority should be routed via rule to the specialist
        expect(vipHighResult.data?.selectedAgentId).toBe(vipSpecialist.id)
        expect(vipHighResult.data?.reason).toContain('Rule matched')

        // VIP low priority should NOT be routed via rule (reason shouldn't mention rule)
        expect(vipLowResult.data?.reason).not.toContain('Rule matched')
      })
    })
  })

  // ==========================================================================
  // QUEUE PROCESSING TESTS
  // ==========================================================================

  describe('Queue Processing', () => {
    describe('processQueue', () => {
      it('should assign queued conversations to available agents', async () => {
        // Create conversations first (they will be queued)
        const conv1 = await createTestConversation()
        const conv2 = await createTestConversation()

        // Now add agents
        await createTestAgent()
        await createTestAgent()

        const assignedCount = await routingService.processQueue()

        expect(assignedCount).toBe(2)
      })

      it('should process department-specific queue', async () => {
        await createTestConversation({ department: 'sales' })
        await createTestConversation({ department: 'support' })

        await createTestAgent({ departments: ['sales'] })

        const assignedCount = await routingService.processQueue('sales')

        expect(assignedCount).toBe(1)
      })
    })

    describe('onAgentAvailable', () => {
      it('should auto-assign when agent becomes available', async () => {
        const conv = await createTestConversation({ department: 'support' })

        const agent = await createTestAgent({ departments: ['support'], available: false })

        // Agent comes online
        await livechatService.updateAgentStatus(agent.id, 'available')
        const assignedCount = await routingService.onAgentAvailable(agent.id)

        expect(assignedCount).toBe(1)
      })
    })
  })

  // ==========================================================================
  // HISTORY AND STATS TESTS
  // ==========================================================================

  describe('History and Stats', () => {
    describe('getHistory', () => {
      it('should record routing decisions', async () => {
        await createTestAgent()

        const conv1 = await createTestConversation()
        await routingService.routeConversation(conv1)

        const conv2 = await createTestConversation()
        await routingService.routeConversation(conv2)

        const history = routingService.getHistory()

        expect(history.length).toBe(2)
      })

      it('should filter by conversation ID', async () => {
        await createTestAgent()

        const conv1 = await createTestConversation()
        await routingService.routeConversation(conv1)

        const conv2 = await createTestConversation()
        await routingService.routeConversation(conv2)

        const history = routingService.getHistory({ conversationId: conv1.id })

        expect(history.length).toBe(1)
        expect(history[0].conversationId).toBe(conv1.id)
      })

      it('should limit results', async () => {
        await createTestAgent()

        for (let i = 0; i < 5; i++) {
          const conv = await createTestConversation()
          await routingService.routeConversation(conv)
        }

        const history = routingService.getHistory({ limit: 3 })

        expect(history.length).toBe(3)
      })
    })

    describe('getStats', () => {
      it('should return routing statistics', async () => {
        const agent = await createTestAgent()

        const conv = await createTestConversation()
        await routingService.routeConversation(conv)

        const period = {
          start: new Date(Date.now() - 3600000),
          end: new Date(),
        }

        const stats = await routingService.getStats(period)

        expect(stats.totalRouted).toBe(1)
        expect(stats.successRate).toBe(100)
      })

      it('should track by routing method', async () => {
        await createTestAgent()

        routingService.updateConfig({ method: 'load_balancing' })
        const conv = await createTestConversation()
        await routingService.routeConversation(conv)

        const period = {
          start: new Date(Date.now() - 3600000),
          end: new Date(),
        }

        const stats = await routingService.getStats(period)

        expect(stats.byMethod['load_balancing']).toBe(1)
      })
    })
  })
})
