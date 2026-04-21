/**
 * Unit tests for workflow-engine.
 */
import {
  generateWorkflowId,
  generateRunId,
  createWorkflow,
  createDefaultSettings,
  validateWorkflow,
  addStep,
  updateStep,
  removeStep,
  addEdge,
  removeEdge,
  addVariable,
  updateVariable,
  removeVariable,
  updateSettings,
  updateStatus,
  publishWorkflow,
  createWorkflowRun,
  updateRunStatus,
  findMatchingWorkflows,
  getNextSteps,
  getTriggerSteps,
  getStep,
  buildExecutionOrder,
  buildWorkflowContext,
  serializeWorkflow,
  deserializeWorkflow,
  cloneWorkflow,
} from '../workflow-engine'
import { createMessageTriggerEvent } from '../workflow-triggers'
import type {
  Workflow,
  WorkflowStep,
  WorkflowEdge,
  WorkflowVariable,
  TriggerStep,
} from '../workflow-types'

const mkTrigger = (id = 't1', overrides: Partial<TriggerStep> = {}): TriggerStep =>
  ({
    id,
    type: 'trigger',
    name: 'Trigger',
    description: '',
    position: { x: 0, y: 0 },
    config: { triggerType: 'manual' },
    metadata: {},
    ...overrides,
  }) as any

const mkMessage = (id = 'm1'): WorkflowStep =>
  ({
    id,
    type: 'message',
    name: 'Msg',
    description: '',
    position: { x: 100, y: 0 },
    config: { target: 'channel', channelId: 'c1', content: 'hi', parseVariables: false },
    metadata: {},
  }) as any

const mkEnd = (id = 'e1'): WorkflowStep =>
  ({
    id,
    type: 'end',
    name: 'End',
    description: '',
    position: { x: 200, y: 0 },
    config: { status: 'success' },
    metadata: {},
  }) as any

const mkEdge = (id: string, source: string, target: string): WorkflowEdge =>
  ({ id, type: 'default', sourceId: source, targetId: target }) as any

describe('generateWorkflowId / generateRunId', () => {
  it('produces unique ids across calls', () => {
    const a = generateWorkflowId()
    const b = generateWorkflowId()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^workflow_/)
  })
  it('run id has proper prefix', () => {
    expect(generateRunId()).toMatch(/^run_/)
  })
})

describe('createWorkflow / createDefaultSettings', () => {
  it('returns draft with required fields', () => {
    const wf = createWorkflow('My WF', 'user1')
    expect(wf.name).toBe('My WF')
    expect(wf.status).toBe('draft')
    expect(wf.version).toBe(1)
    expect(wf.createdBy).toBe('user1')
    expect(wf.steps).toEqual([])
    expect(wf.edges).toEqual([])
    expect(wf.variables).toEqual([])
    expect(wf.settings).toBeDefined()
    expect(wf.createdAt).toBeTruthy()
    expect(wf.updatedAt).toBeTruthy()
  })
  it('accepts overrides', () => {
    const wf = createWorkflow('X', 'u', { description: 'desc' })
    expect(wf.description).toBe('desc')
  })
  it('default settings has expected shape', () => {
    const s = createDefaultSettings()
    expect(s.maxDuration).toBe(3600000)
    expect(s.retryOnFailure).toBe(false)
    expect(s.maxRetries).toBe(3)
    expect(s.logLevel).toBe('all')
    expect(s.notifyOnError).toBe(true)
    expect(s.timeoutAction).toBe('cancel')
    expect(s.concurrencyLimit).toBe(1)
    expect(s.tags).toEqual([])
  })
})

describe('validateWorkflow', () => {
  it('errors when name is empty', () => {
    const wf = createWorkflow('', 'u')
    const res = validateWorkflow(wf)
    expect(res.isValid).toBe(false)
    expect(res.errors.some((e) => /name is required/i.test(e.message))).toBe(true)
  })
  it('errors when no trigger present', () => {
    const wf = createWorkflow('X', 'u')
    const res = validateWorkflow(wf)
    expect(res.errors.some((e) => /trigger/i.test(e.message))).toBe(true)
  })
  it('passes with trigger + connected message + end', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage())
    wf = addStep(wf, mkEnd())
    wf = addEdge(wf, mkEdge('e1', 't1', 'm1'))
    wf = addEdge(wf, mkEdge('e2', 'm1', 'e1'))
    const res = validateWorkflow(wf)
    expect(res.isValid).toBe(true)
  })
  it('detects edge referencing missing source', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addEdge(wf, mkEdge('bad', 'ghost', 't1'))
    const res = validateWorkflow(wf)
    expect(res.errors.some((e) => /non-existent source/.test(e.message))).toBe(true)
  })
  it('detects edge referencing missing target', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addEdge(wf, mkEdge('bad', 't1', 'ghost'))
    const res = validateWorkflow(wf)
    expect(res.errors.some((e) => /non-existent target/.test(e.message))).toBe(true)
  })
  it('flags invalid variable name as error', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addVariable(wf, { id: 'v1', name: '1bad', type: 'string', defaultValue: '' } as any)
    const res = validateWorkflow(wf)
    expect(res.errors.some((e) => /must start with a letter/.test(e.message))).toBe(true)
  })
  it('flags duplicate variable names', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addVariable(wf, { id: 'v1', name: 'x', type: 'string', defaultValue: '' } as any)
    wf = addVariable(wf, { id: 'v2', name: 'x', type: 'string', defaultValue: '' } as any)
    const res = validateWorkflow(wf)
    expect(res.errors.some((e) => /Duplicate variable/.test(e.message))).toBe(true)
  })
  it('warns on disconnected non-trigger step', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage())
    const res = validateWorkflow(wf)
    expect(res.warnings.some((w) => /disconnected/.test(w.message))).toBe(true)
  })
  it('warns on cycle detection', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage('m1'))
    wf = addStep(wf, mkMessage('m2'))
    wf = addEdge(wf, mkEdge('e1', 't1', 'm1'))
    wf = addEdge(wf, mkEdge('e2', 'm1', 'm2'))
    wf = addEdge(wf, mkEdge('e3', 'm2', 'm1'))
    const res = validateWorkflow(wf)
    expect(res.warnings.some((w) => /cycle/i.test(w.message))).toBe(true)
  })
})

describe('workflow ops: add/update/remove step', () => {
  it('addStep appends', () => {
    let wf = createWorkflow('X', 'u')
    const prev = wf.updatedAt
    wf = addStep(wf, mkTrigger())
    expect(wf.steps).toHaveLength(1)
    expect(wf.updatedAt).toBeTruthy()
    expect(wf.updatedAt >= prev).toBe(true)
  })
  it('updateStep mutates one step only', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = updateStep(wf, 't1', { name: 'Renamed' })
    expect(wf.steps[0].name).toBe('Renamed')
  })
  it('updateStep leaves other steps alone', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage())
    wf = updateStep(wf, 't1', { name: 'R' })
    expect(wf.steps[1].name).toBe('Msg')
  })
  it('removeStep drops step and its edges', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage())
    wf = addEdge(wf, mkEdge('e1', 't1', 'm1'))
    wf = removeStep(wf, 'm1')
    expect(wf.steps.find((s) => s.id === 'm1')).toBeUndefined()
    expect(wf.edges).toHaveLength(0)
  })
})

describe('workflow ops: add/remove edge', () => {
  it('addEdge appends', () => {
    let wf = createWorkflow('X', 'u')
    wf = addEdge(wf, mkEdge('e1', 'a', 'b'))
    expect(wf.edges).toHaveLength(1)
  })
  it('addEdge deduplicates identical edges', () => {
    let wf = createWorkflow('X', 'u')
    wf = addEdge(wf, mkEdge('e1', 'a', 'b'))
    wf = addEdge(wf, mkEdge('e2', 'a', 'b'))
    expect(wf.edges).toHaveLength(1)
  })
  it('removeEdge drops by id', () => {
    let wf = createWorkflow('X', 'u')
    wf = addEdge(wf, mkEdge('e1', 'a', 'b'))
    wf = removeEdge(wf, 'e1')
    expect(wf.edges).toHaveLength(0)
  })
})

describe('workflow ops: variables', () => {
  const v: WorkflowVariable = { id: 'v1', name: 'x', type: 'string', defaultValue: 'hello' } as any
  it('addVariable appends', () => {
    let wf = createWorkflow('X', 'u')
    wf = addVariable(wf, v)
    expect(wf.variables).toHaveLength(1)
  })
  it('updateVariable edits in place', () => {
    let wf = createWorkflow('X', 'u')
    wf = addVariable(wf, v)
    wf = updateVariable(wf, 'v1', { defaultValue: 'bye' })
    expect(wf.variables[0].defaultValue).toBe('bye')
  })
  it('removeVariable drops by id', () => {
    let wf = createWorkflow('X', 'u')
    wf = addVariable(wf, v)
    wf = removeVariable(wf, 'v1')
    expect(wf.variables).toHaveLength(0)
  })
})

describe('updateSettings / updateStatus / publishWorkflow', () => {
  it('updateSettings merges partial', () => {
    let wf = createWorkflow('X', 'u')
    wf = updateSettings(wf, { maxRetries: 10 })
    expect(wf.settings.maxRetries).toBe(10)
    expect(wf.settings.retryOnFailure).toBe(false)
  })
  it('updateStatus to active sets publishedAt', () => {
    let wf = createWorkflow('X', 'u')
    wf = updateStatus(wf, 'active')
    expect(wf.status).toBe('active')
    expect(wf.publishedAt).toBeTruthy()
  })
  it('updateStatus does not overwrite existing publishedAt', () => {
    let wf = createWorkflow('X', 'u')
    wf = updateStatus(wf, 'active')
    const first = wf.publishedAt
    wf = updateStatus(wf, 'paused')
    wf = updateStatus(wf, 'active')
    expect(wf.publishedAt).toBe(first)
  })
  it('publishWorkflow throws when invalid', () => {
    const wf = createWorkflow('', 'u')
    expect(() => publishWorkflow(wf)).toThrow(/Cannot publish/)
  })
  it('publishWorkflow bumps version + sets active', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkEnd())
    wf = addEdge(wf, mkEdge('e1', 't1', 'e1'))
    const pub = publishWorkflow(wf)
    expect(pub.status).toBe('active')
    expect(pub.version).toBe(2)
    expect(pub.publishedAt).toBeTruthy()
  })
})

describe('workflow runs', () => {
  it('createWorkflowRun initializes variables from defaults', () => {
    let wf = createWorkflow('X', 'u')
    wf = addVariable(wf, {
      id: 'v1',
      name: 'greeting',
      type: 'string',
      defaultValue: 'hello',
    } as any)
    const run = createWorkflowRun(wf, { foo: 1 }, 'user1')
    expect(run.status).toBe('pending')
    expect(run.workflowId).toBe(wf.id)
    expect(run.variables.greeting).toBe('hello')
    expect(run.triggerData).toEqual({ foo: 1 })
    expect(run.createdBy).toBe('user1')
    expect(run.stepRuns).toEqual([])
  })
  it('updateRunStatus sets completedAt on terminal states', () => {
    let wf = createWorkflow('X', 'u')
    const run = createWorkflowRun(wf, {})
    const done = updateRunStatus(run, 'completed')
    expect(done.completedAt).toBeTruthy()
    const failed = updateRunStatus(run, 'failed', { code: 'E', message: 'boom' })
    expect(failed.error?.code).toBe('E')
    expect(failed.completedAt).toBeTruthy()
  })
  it('updateRunStatus leaves completedAt undefined for running', () => {
    const wf = createWorkflow('X', 'u')
    const run = createWorkflowRun(wf, {})
    const running = updateRunStatus(run, 'running')
    expect(running.completedAt).toBeUndefined()
  })
})

describe('findMatchingWorkflows', () => {
  it('skips inactive workflows', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger('t1', { config: { triggerType: 'manual' } as any }))
    const ev = createMessageTriggerEvent('c1', 'u1', 'm1', 'hi')
    expect(findMatchingWorkflows([wf], ev)).toEqual([])
  })
  it('returns active workflows with matching trigger', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(
      wf,
      mkTrigger('t1', {
        config: { triggerType: 'message_received' } as any,
      })
    )
    wf = addStep(wf, mkEnd())
    wf = addEdge(wf, mkEdge('e1', 't1', 'e1'))
    const pub = publishWorkflow(wf)
    const ev = createMessageTriggerEvent('m1', 'c1', 'u1', 'hi')
    const matched = findMatchingWorkflows([pub], ev)
    expect(matched).toHaveLength(1)
  })
})

describe('graph traversal', () => {
  const build = () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage('m1'))
    wf = addStep(wf, mkMessage('m2'))
    wf = addStep(wf, mkEnd())
    wf = addEdge(wf, mkEdge('e1', 't1', 'm1'))
    wf = addEdge(wf, mkEdge('e2', 'm1', 'm2'))
    wf = addEdge(wf, mkEdge('e3', 'm2', 'e1'))
    return wf
  }
  it('getNextSteps returns direct successors', () => {
    const wf = build()
    expect(getNextSteps(wf, 't1').map((s) => s.id)).toEqual(['m1'])
    expect(getNextSteps(wf, 'm1').map((s) => s.id)).toEqual(['m2'])
    expect(getNextSteps(wf, 'e1')).toEqual([])
  })
  it('getNextSteps filters by outputHandle', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage('m1'))
    wf = addStep(wf, mkMessage('m2'))
    wf = addEdge(wf, { id: 'e1', sourceId: 't1', targetId: 'm1', sourceHandle: 'a' } as any)
    wf = addEdge(wf, { id: 'e2', sourceId: 't1', targetId: 'm2', sourceHandle: 'b' } as any)
    expect(getNextSteps(wf, 't1', 'a').map((s) => s.id)).toEqual(['m1'])
    expect(getNextSteps(wf, 't1', 'b').map((s) => s.id)).toEqual(['m2'])
  })
  it('getTriggerSteps returns only triggers', () => {
    const wf = build()
    const triggers = getTriggerSteps(wf)
    expect(triggers).toHaveLength(1)
    expect(triggers[0].type).toBe('trigger')
  })
  it('getStep returns step by id or undefined', () => {
    const wf = build()
    expect(getStep(wf, 'm1')?.id).toBe('m1')
    expect(getStep(wf, 'nope')).toBeUndefined()
  })
  it('buildExecutionOrder returns topological order', () => {
    const wf = build()
    const order = buildExecutionOrder(wf)
    expect(order.indexOf('t1')).toBeLessThan(order.indexOf('m1'))
    expect(order.indexOf('m1')).toBeLessThan(order.indexOf('m2'))
    expect(order.indexOf('m2')).toBeLessThan(order.indexOf('e1'))
  })
})

describe('buildWorkflowContext', () => {
  it('includes workflow, run, trigger, channel, message info', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    const run = createWorkflowRun(wf, {})
    const ev = createMessageTriggerEvent('m1', 'c1', 'u1', 'body')
    const ctx = buildWorkflowContext(wf, run, ev)
    expect(ctx.workflowId).toBe(wf.id)
    expect(ctx.runId).toBe(run.id)
    expect(ctx.trigger.type).toBe('message_received')
    expect(ctx.channel?.id).toBe('c1')
    expect(ctx.message?.id).toBe('m1')
    expect(ctx.message?.content).toBe('body')
    expect(ctx.message?.authorId).toBe('u1')
  })
  it('omits channel + message when event has none', () => {
    const wf = createWorkflow('X', 'u')
    const run = createWorkflowRun(wf, {})
    const ev = { type: 'manual', data: {} } as any
    const ctx = buildWorkflowContext(wf, run, ev)
    expect(ctx.channel).toBeUndefined()
    expect(ctx.message).toBeUndefined()
  })
})

describe('serialization', () => {
  it('serialize round-trips through deserialize', () => {
    let wf = createWorkflow('X', 'u')
    wf = addStep(wf, mkTrigger())
    const json = serializeWorkflow(wf)
    const parsed = deserializeWorkflow(json)
    expect(parsed.id).toBe(wf.id)
    expect(parsed.steps).toHaveLength(1)
  })
  it('deserializeWorkflow throws on malformed json', () => {
    expect(() => deserializeWorkflow('{"nope":true}')).toThrow(/Invalid workflow/)
  })
})

describe('cloneWorkflow', () => {
  it('creates new ids for workflow, steps, edges, variables', () => {
    let wf = createWorkflow('Orig', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage())
    wf = addEdge(wf, mkEdge('e1', 't1', 'm1'))
    wf = addVariable(wf, { id: 'v1', name: 'x', type: 'string', defaultValue: '' } as any)
    const clone = cloneWorkflow(wf, 'Copy', 'user2')
    expect(clone.id).not.toBe(wf.id)
    expect(clone.name).toBe('Copy')
    expect(clone.createdBy).toBe('user2')
    expect(clone.status).toBe('draft')
    expect(clone.version).toBe(1)
    expect(clone.publishedAt).toBeUndefined()
    expect(clone.steps[0].id).not.toBe('t1')
    expect(clone.variables[0].id).not.toBe('v1')
  })
  it('rewrites edge source/target to new ids', () => {
    let wf = createWorkflow('Orig', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage())
    wf = addEdge(wf, mkEdge('e1', 't1', 'm1'))
    const clone = cloneWorkflow(wf, 'Copy', 'u')
    const edge = clone.edges[0]
    expect(edge.sourceId).toBe(clone.steps[0].id)
    expect(edge.targetId).toBe(clone.steps[1].id)
  })
  it('deep copies step configs', () => {
    let wf = createWorkflow('Orig', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage())
    const clone = cloneWorkflow(wf, 'Copy', 'u')
    const origMsg = wf.steps[1] as any
    const cloneMsg = clone.steps[1] as any
    cloneMsg.config.content = 'mutated'
    expect(origMsg.config.content).toBe('hi')
  })
})
