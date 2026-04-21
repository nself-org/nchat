/**
 * Unit tests for workflow-steps.
 */
import {
  stepTemplates,
  stepCategories,
  generateStepId,
  createStep,
  createTriggerStep,
  createMessageStep,
  createFormStep,
  createConditionStep,
  createDelayStep,
  createWebhookStep,
  createApprovalStep,
  createLoopStep,
  createParallelStep,
  createEndStep,
  cloneStep,
  validateStep,
  getStepTemplate,
  getStepsByCategory,
  getStepTemplatesByCategory,
  canHaveMultipleOutputs,
  canBeEntryPoint,
  canBeExitPoint,
  getOutputHandles,
  getInputHandles,
} from '../workflow-steps'
import type { WorkflowStep } from '../workflow-types'

describe('stepTemplates + stepCategories', () => {
  it('contains all 11 step types', () => {
    const types = [
      'trigger',
      'message',
      'form',
      'condition',
      'delay',
      'webhook',
      'approval',
      'action',
      'loop',
      'parallel',
      'end',
    ]
    for (const t of types) {
      expect(stepTemplates[t as keyof typeof stepTemplates]).toBeDefined()
    }
  })
  it('each template has required fields', () => {
    for (const tpl of Object.values(stepTemplates)) {
      expect(tpl.name).toBeTruthy()
      expect(tpl.icon).toBeTruthy()
      expect(tpl.color).toMatch(/^#/)
      expect(tpl.category).toBeTruthy()
    }
  })
  it('stepCategories covers triggers, logic, control', () => {
    const ids = stepCategories.map((c) => c.id)
    expect(ids).toContain('triggers')
    expect(ids).toContain('logic')
    expect(ids).toContain('control')
  })
})

describe('generateStepId', () => {
  it('prefixes with step type', () => {
    expect(generateStepId('trigger')).toMatch(/^trigger_/)
    expect(generateStepId('message')).toMatch(/^message_/)
  })
  it('produces unique ids across calls', () => {
    const a = generateStepId('condition')
    const b = generateStepId('condition')
    expect(a).not.toBe(b)
  })
})

describe('createStep + specialized constructors', () => {
  it('createStep returns typed step with defaults', () => {
    const s = createStep('message')
    expect(s.type).toBe('message')
    expect(s.name).toBe('Send Message')
    expect(s.position).toEqual({ x: 100, y: 100 })
    expect(s.metadata?.createdAt).toBeTruthy()
  })
  it('createStep accepts position + overrides', () => {
    const s = createStep('message', { x: 5, y: 10 }, { name: 'custom' })
    expect(s.position).toEqual({ x: 5, y: 10 })
    expect(s.name).toBe('custom')
  })
  it('createTriggerStep sets triggerType in config', () => {
    const t = createTriggerStep('message_received')
    expect(t.type).toBe('trigger')
    expect((t.config as any).triggerType).toBe('message_received')
  })
  it('createMessageStep applies config overrides', () => {
    const m = createMessageStep({ x: 0, y: 0 }, { content: 'yo' })
    expect(m.config.content).toBe('yo')
  })
  it('createFormStep applies config overrides', () => {
    const f = createFormStep({ x: 0, y: 0 }, { title: 'Survey' })
    expect(f.config.title).toBe('Survey')
  })
  it('createConditionStep returns condition type', () => {
    expect(createConditionStep().type).toBe('condition')
  })
  it('createDelayStep applies overrides', () => {
    const d = createDelayStep({ x: 0, y: 0 }, { duration: 5, durationUnit: 'minutes' })
    expect(d.config.duration).toBe(5)
    expect(d.config.durationUnit).toBe('minutes')
  })
  it('createWebhookStep applies overrides', () => {
    const w = createWebhookStep({ x: 0, y: 0 }, { url: 'https://x', method: 'PUT' })
    expect(w.config.url).toBe('https://x')
    expect(w.config.method).toBe('PUT')
  })
  it('createApprovalStep applies overrides', () => {
    const a = createApprovalStep({ x: 0, y: 0 }, { approvers: ['u1'] })
    expect(a.config.approvers).toEqual(['u1'])
  })
  it('createLoopStep applies overrides', () => {
    const l = createLoopStep({ x: 0, y: 0 }, { loopType: 'count', count: 10 })
    expect(l.config.loopType).toBe('count')
    expect(l.config.count).toBe(10)
  })
  it('createParallelStep applies overrides', () => {
    const p = createParallelStep({ x: 0, y: 0 }, { waitForAll: false })
    expect(p.config.waitForAll).toBe(false)
  })
  it('createEndStep applies overrides', () => {
    const e = createEndStep({ x: 0, y: 0 }, { status: 'failure' })
    expect(e.config.status).toBe('failure')
  })
})

describe('cloneStep', () => {
  it('clones with new id', () => {
    const s = createMessageStep()
    const c = cloneStep(s)
    expect(c.id).not.toBe(s.id)
    expect(c.type).toBe(s.type)
  })
  it('offsets position by default', () => {
    const s = createMessageStep({ x: 10, y: 20 })
    const c = cloneStep(s)
    expect(c.position).toEqual({ x: 60, y: 70 })
  })
  it('deep copies config (mutation does not affect source)', () => {
    const s = createMessageStep({ x: 0, y: 0 }, { content: 'orig' })
    const c = cloneStep(s)
    ;(c.config as any).content = 'changed'
    expect(s.config.content).toBe('orig')
  })
})

describe('validateStep', () => {
  it('errors on empty name', () => {
    const s = createMessageStep()
    s.name = ''
    const errs = validateStep(s)
    expect(errs.some((e) => e.message === 'Step name is required')).toBe(true)
  })
  it('errors on trigger without triggerType', () => {
    const t = {
      id: 't',
      type: 'trigger',
      name: 'T',
      description: '',
      position: { x: 0, y: 0 },
      config: {},
      metadata: {},
    } as unknown as WorkflowStep
    const errs = validateStep(t)
    expect(errs.some((e) => /Trigger type is required/.test(e.message))).toBe(true)
  })
  it('errors on keyword trigger missing keyword', () => {
    const t = {
      id: 't',
      type: 'trigger',
      name: 'T',
      description: '',
      position: { x: 0, y: 0 },
      config: { triggerType: 'keyword' },
      metadata: {},
    } as unknown as WorkflowStep
    const errs = validateStep(t)
    expect(errs.some((e) => /Keyword is required/.test(e.message))).toBe(true)
  })
  it('errors on scheduled trigger missing schedule', () => {
    const t = {
      id: 't',
      type: 'trigger',
      name: 'T',
      description: '',
      position: { x: 0, y: 0 },
      config: { triggerType: 'scheduled' },
      metadata: {},
    } as unknown as WorkflowStep
    const errs = validateStep(t)
    expect(errs.some((e) => /Schedule is required/.test(e.message))).toBe(true)
  })
  it('errors on message step with empty content', () => {
    const m = createMessageStep({ x: 0, y: 0 }, { content: '' })
    const errs = validateStep(m)
    expect(errs.some((e) => /Message content is required/.test(e.message))).toBe(true)
  })
  it('warns on message step channel target without channelId', () => {
    const m = createMessageStep({ x: 0, y: 0 }, { content: 'hi', target: 'channel' })
    const errs = validateStep(m)
    expect(errs.some((e) => e.severity === 'warning' && /Channel is required/.test(e.message))).toBe(
      true
    )
  })
  it('errors on form with no fields', () => {
    const f = createFormStep({ x: 0, y: 0 }, { title: 'Form', fields: [] })
    const errs = validateStep(f)
    expect(errs.some((e) => /at least one field/.test(e.message))).toBe(true)
  })
  it('errors on form field missing name', () => {
    const f = createFormStep({ x: 0, y: 0 }, {
      title: 'Form',
      fields: [{ name: '', label: 'L', type: 'text' }] as any,
    })
    const errs = validateStep(f)
    expect(errs.some((e) => /name is required/.test(e.message))).toBe(true)
  })
  it('errors on delay fixed with invalid duration', () => {
    const d = createDelayStep({ x: 0, y: 0 }, { delayType: 'fixed', duration: 0 })
    const errs = validateStep(d)
    expect(errs.some((e) => /Duration must be greater than 0/.test(e.message))).toBe(true)
  })
  it('errors on delay until_time missing untilTime', () => {
    const d = createDelayStep({ x: 0, y: 0 }, { delayType: 'until_time' })
    const errs = validateStep(d)
    expect(errs.some((e) => /Target time is required/.test(e.message))).toBe(true)
  })
  it('errors on webhook with empty url', () => {
    const w = createWebhookStep({ x: 0, y: 0 }, { url: '' })
    const errs = validateStep(w)
    expect(errs.some((e) => /Webhook URL is required/.test(e.message))).toBe(true)
  })
  it('errors on webhook with invalid url format', () => {
    const w = createWebhookStep({ x: 0, y: 0 }, { url: 'not a url' })
    const errs = validateStep(w)
    expect(errs.some((e) => /Invalid URL format/.test(e.message))).toBe(true)
  })
  it('accepts valid webhook url', () => {
    const w = createWebhookStep({ x: 0, y: 0 }, { url: 'https://example.com' })
    const errs = validateStep(w)
    expect(errs.filter((e) => /URL/.test(e.message))).toHaveLength(0)
  })
  it('errors on approval without approvers or roles', () => {
    const a = createApprovalStep({ x: 0, y: 0 }, { approvers: [], approverRoles: [] })
    const errs = validateStep(a)
    expect(errs.some((e) => /approver or approver role/.test(e.message))).toBe(true)
  })
  it('errors on approval with empty message', () => {
    const a = createApprovalStep({ x: 0, y: 0 }, { approvers: ['u'], message: '' })
    const errs = validateStep(a)
    expect(errs.some((e) => /Approval message is required/.test(e.message))).toBe(true)
  })
  it('errors on loop for_each missing collection', () => {
    const l = createLoopStep({ x: 0, y: 0 }, { loopType: 'for_each' })
    const errs = validateStep(l)
    expect(errs.some((e) => /Collection variable is required/.test(e.message))).toBe(true)
  })
  it('errors on loop count with invalid count', () => {
    const l = createLoopStep({ x: 0, y: 0 }, { loopType: 'count', count: 0 })
    const errs = validateStep(l)
    expect(errs.some((e) => /Count must be greater than 0/.test(e.message))).toBe(true)
  })
  it('errors on loop with maxIterations below 1', () => {
    const l = createLoopStep({ x: 0, y: 0 }, { loopType: 'count', count: 5, maxIterations: -1 })
    const errs = validateStep(l)
    expect(errs.some((e) => /Maximum iterations must be at least 1/.test(e.message))).toBe(true)
  })
  it('errors on parallel step with fewer than 2 branches', () => {
    const p = createParallelStep({ x: 0, y: 0 }, { branches: [{ id: 'b1', name: 'A' }] as any })
    const errs = validateStep(p)
    expect(errs.some((e) => /at least 2 branches/.test(e.message))).toBe(true)
  })
})

describe('step utilities', () => {
  it('getStepTemplate returns by type', () => {
    expect(getStepTemplate('message').name).toBe('Send Message')
  })
  it('getStepsByCategory returns matching types', () => {
    const steps = getStepsByCategory('logic')
    expect(steps).toEqual(expect.arrayContaining(['condition', 'loop', 'parallel']))
  })
  it('getStepsByCategory returns empty for unknown category', () => {
    expect(getStepsByCategory('nope')).toEqual([])
  })
  it('getStepTemplatesByCategory groups templates', () => {
    const grouped = getStepTemplatesByCategory()
    expect(Object.keys(grouped).length).toBe(stepCategories.length)
  })
  it('canHaveMultipleOutputs is true for condition/parallel/loop only', () => {
    expect(canHaveMultipleOutputs('condition')).toBe(true)
    expect(canHaveMultipleOutputs('parallel')).toBe(true)
    expect(canHaveMultipleOutputs('loop')).toBe(true)
    expect(canHaveMultipleOutputs('message')).toBe(false)
    expect(canHaveMultipleOutputs('trigger')).toBe(false)
  })
  it('canBeEntryPoint only true for trigger', () => {
    expect(canBeEntryPoint('trigger')).toBe(true)
    expect(canBeEntryPoint('message')).toBe(false)
  })
  it('canBeExitPoint only true for end', () => {
    expect(canBeExitPoint('end')).toBe(true)
    expect(canBeExitPoint('message')).toBe(false)
  })
  it('getOutputHandles returns correct values per type', () => {
    expect(getOutputHandles('condition')).toEqual(['true', 'false'])
    expect(getOutputHandles('approval')).toEqual(['approved', 'rejected', 'timeout'])
    expect(getOutputHandles('loop')).toEqual(['iteration', 'complete'])
    expect(getOutputHandles('parallel')).toEqual(['complete'])
    expect(getOutputHandles('end')).toEqual([])
    expect(getOutputHandles('message')).toEqual(['default'])
  })
  it('getInputHandles is empty for trigger, default otherwise', () => {
    expect(getInputHandles('trigger')).toEqual([])
    expect(getInputHandles('message')).toEqual(['default'])
    expect(getInputHandles('end')).toEqual(['default'])
  })
})
