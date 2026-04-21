/**
 * Unit tests for workflow-executor.
 */
import { WorkflowExecutor, getExecutor, createExecutor } from '../workflow-executor'
import {
  createWorkflow,
  addStep,
  addEdge,
  createWorkflowRun,
  buildWorkflowContext,
} from '../workflow-engine'
import { createMessageTriggerEvent } from '../workflow-triggers'
import type {
  WorkflowStep,
  WorkflowEdge,
  TriggerStep,
  MessageStep,
  ConditionStep,
  DelayStep,
  WebhookStep,
  ApprovalStep,
  LoopStep,
  ParallelStep,
  EndStep,
  FormStep,
  ActionStep,
} from '../workflow-types'

const mkTrigger = (id = 't1'): TriggerStep =>
  ({
    id,
    type: 'trigger',
    name: 'T',
    description: '',
    position: { x: 0, y: 0 },
    config: { triggerType: 'manual' },
    metadata: {},
  }) as any

const mkMessage = (id: string, content = 'hello {{variables.name}}'): MessageStep =>
  ({
    id,
    type: 'message',
    name: 'M',
    description: '',
    position: { x: 0, y: 0 },
    config: { target: 'channel', channelId: 'c1', content, parseVariables: true },
    metadata: {},
  }) as any

const mkEdge = (id: string, source: string, target: string, handle?: string): WorkflowEdge =>
  ({ id, type: 'default', sourceId: source, targetId: target, sourceHandle: handle }) as any

const baseRun = (wf: any) => {
  const run = createWorkflowRun(wf, {})
  const ev = createMessageTriggerEvent('m1', 'c1', 'u1', 'body')
  const ctx = buildWorkflowContext(wf, run, ev)
  ctx.variables.name = 'alice'
  return { run, ctx }
}

describe('WorkflowExecutor basics', () => {
  it('exposes default config after construction', () => {
    const exec = new WorkflowExecutor()
    expect(exec).toBeInstanceOf(WorkflowExecutor)
    expect(exec.getActiveRuns()).toEqual([])
  })
  it('getExecutor returns singleton', () => {
    const a = getExecutor()
    const b = getExecutor()
    expect(a).toBe(b)
  })
  it('createExecutor returns a fresh instance', () => {
    const a = createExecutor({ maxConcurrentSteps: 5 })
    const b = createExecutor({ maxConcurrentSteps: 5 })
    expect(a).not.toBe(b)
  })
})

describe('execute — happy paths', () => {
  it('runs trigger -> message -> end and completes', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage('m1'))
    wf = addStep(wf, {
      id: 'e1',
      type: 'end',
      name: 'end',
      description: '',
      position: { x: 0, y: 0 },
      config: { status: 'success' },
      metadata: {},
    } as EndStep)
    wf = addEdge(wf, mkEdge('eA', 't1', 'm1'))
    wf = addEdge(wf, mkEdge('eB', 'm1', 'e1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)

    expect(final.status).toBe('completed')
    expect(final.completedAt).toBeTruthy()
    expect(final.stepRuns).toHaveLength(3)
    expect(final.stepRuns.every((s) => s.status === 'completed')).toBe(true)
  })

  it('interpolates variables in message content', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage('m1', 'hi {{variables.name}}'))
    wf = addEdge(wf, mkEdge('eA', 't1', 'm1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    const msgRun = final.stepRuns.find((s) => s.stepId === 'm1')!
    expect(msgRun.output?.content).toBe('hi alice')
  })

  it('invokes lifecycle callbacks (start, complete, log)', async () => {
    const started: string[] = []
    const completed: string[] = []
    const logs: string[] = []
    let runDone = false

    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor({
      onStepStart: (sr) => started.push(sr.stepType),
      onStepComplete: (sr) => completed.push(sr.stepType),
      onLog: (l) => logs.push(l.message),
      onRunComplete: () => {
        runDone = true
      },
    })
    await exec.execute(wf, run, ctx)
    expect(started).toContain('trigger')
    expect(completed).toContain('trigger')
    expect(logs.length).toBeGreaterThan(0)
    expect(runDone).toBe(true)
  })
})

describe('condition branching', () => {
  it('follows true branch when condition passes', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const cond: ConditionStep = {
      id: 'c1',
      type: 'condition',
      name: 'c',
      description: '',
      position: { x: 0, y: 0 },
      config: {
        logic: 'and',
        conditions: [{ field: 'variables.name', operator: 'equals', value: 'alice' }],
      },
      metadata: {},
    } as any
    wf = addStep(wf, cond)
    wf = addStep(wf, mkMessage('mt', 'true'))
    wf = addStep(wf, mkMessage('mf', 'false'))
    wf = addEdge(wf, mkEdge('e1', 't1', 'c1'))
    wf = addEdge(wf, mkEdge('e2', 'c1', 'mt', 'true'))
    wf = addEdge(wf, mkEdge('e3', 'c1', 'mf', 'false'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    const ids = final.stepRuns.map((s) => s.stepId)
    expect(ids).toContain('mt')
    expect(ids).not.toContain('mf')
  })
})

describe('webhook handler', () => {
  const origFetch = global.fetch
  afterEach(() => {
    global.fetch = origFetch
  })

  it('calls fetch and captures response body', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: async () => ({ ok: true }),
      text: async () => 'raw',
    }) as any

    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const webhook: WebhookStep = {
      id: 'w1',
      type: 'webhook',
      name: 'w',
      description: '',
      position: { x: 0, y: 0 },
      config: {
        url: 'https://example.com/hook',
        method: 'POST',
        body: '{"a":1}',
        bodyType: 'json',
        parseResponse: true,
        expectedStatusCodes: [200],
        responseVariableName: 'resp',
      },
      metadata: {},
    } as any
    wf = addStep(wf, webhook)
    wf = addEdge(wf, mkEdge('e1', 't1', 'w1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    const wr = final.stepRuns.find((s) => s.stepId === 'w1')!
    expect(wr.status).toBe('completed')
    expect((wr.output as any).statusCode).toBe(200)
    expect((wr.output as any).resp).toEqual({ ok: true })
    expect(global.fetch).toHaveBeenCalledWith(
      'https://example.com/hook',
      expect.objectContaining({ method: 'POST' })
    )
  })

  it('fails step on unexpected status when expectedStatusCodes is set', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 500,
      json: async () => ({}),
      text: async () => '',
    }) as any

    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const webhook: WebhookStep = {
      id: 'w1',
      type: 'webhook',
      name: 'w',
      description: '',
      position: { x: 0, y: 0 },
      config: {
        url: 'https://example.com/hook',
        method: 'GET',
        bodyType: 'json',
        parseResponse: false,
        expectedStatusCodes: [200],
      },
      metadata: {},
    } as any
    wf = addStep(wf, webhook)
    wf = addEdge(wf, mkEdge('e1', 't1', 'w1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    expect(final.status).toBe('failed')
  })

  it('catches network errors and marks step failed', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONN'))

    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const webhook: WebhookStep = {
      id: 'w1',
      type: 'webhook',
      name: 'w',
      description: '',
      position: { x: 0, y: 0 },
      config: {
        url: 'https://example.com/hook',
        method: 'GET',
        bodyType: 'json',
        parseResponse: false,
      },
      metadata: {},
    } as any
    wf = addStep(wf, webhook)
    wf = addEdge(wf, mkEdge('e1', 't1', 'w1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    expect(final.status).toBe('failed')
  })
})

describe('delay handler', () => {
  it('handles fixed delay without hanging (capped)', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const delay: DelayStep = {
      id: 'd1',
      type: 'delay',
      name: 'd',
      description: '',
      position: { x: 0, y: 0 },
      config: { delayType: 'fixed', duration: 1, durationUnit: 'seconds' },
      metadata: {},
    } as any
    wf = addStep(wf, delay)
    wf = addEdge(wf, mkEdge('e1', 't1', 'd1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    expect(final.status).toBe('completed')
    const dr = final.stepRuns.find((s) => s.stepId === 'd1')!
    expect((dr.output as any).delayedFor).toBe(1000)
  })

  it('until_time with past time yields 0 delay', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const delay: DelayStep = {
      id: 'd1',
      type: 'delay',
      name: 'd',
      description: '',
      position: { x: 0, y: 0 },
      config: {
        delayType: 'until_time',
        untilTime: new Date(Date.now() - 10_000).toISOString(),
      },
      metadata: {},
    } as any
    wf = addStep(wf, delay)
    wf = addEdge(wf, mkEdge('e1', 't1', 'd1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    expect(final.status).toBe('completed')
  })
})

describe('approval, form, loop, parallel, end, action handlers', () => {
  it('approval completes and follows approved branch', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const approval: ApprovalStep = {
      id: 'a1',
      type: 'approval',
      name: 'a',
      description: '',
      position: { x: 0, y: 0 },
      config: {
        approvalType: 'single',
        approvers: ['u1'],
        message: 'pls {{variables.name}}',
        timeoutMinutes: 60,
      },
      metadata: {},
    } as any
    wf = addStep(wf, approval)
    wf = addStep(wf, mkMessage('ok', 'ok'))
    wf = addStep(wf, mkMessage('no', 'no'))
    wf = addEdge(wf, mkEdge('e1', 't1', 'a1'))
    wf = addEdge(wf, mkEdge('e2', 'a1', 'ok', 'approved'))
    wf = addEdge(wf, mkEdge('e3', 'a1', 'no', 'rejected'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    const ids = final.stepRuns.map((s) => s.stepId)
    expect(ids).toContain('ok')
    expect(ids).not.toContain('no')
    const ar = final.stepRuns.find((s) => s.stepId === 'a1')!
    expect((ar.output as any).message).toBe('pls alice')
  })

  it('form step returns default values as response', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const form: FormStep = {
      id: 'f1',
      type: 'form',
      name: 'f',
      description: '',
      position: { x: 0, y: 0 },
      config: {
        title: 't',
        fields: [{ name: 'email', label: 'Email', type: 'email', defaultValue: 'a@b.c' }],
        target: 'trigger_source',
      },
      metadata: {},
    } as any
    wf = addStep(wf, form)
    wf = addEdge(wf, mkEdge('e1', 't1', 'f1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    const fr = final.stepRuns.find((s) => s.stepId === 'f1')!
    expect((fr.output as any).formResponse.email).toBe('a@b.c')
  })

  it('loop for_each iterates up to collection length', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const loop: LoopStep = {
      id: 'l1',
      type: 'loop',
      name: 'l',
      description: '',
      position: { x: 0, y: 0 },
      config: {
        loopType: 'for_each',
        collection: 'items',
        itemVariableName: 'it',
        indexVariableName: 'idx',
        maxIterations: 100,
      },
      metadata: {},
    } as any
    wf = addStep(wf, loop)
    wf = addEdge(wf, mkEdge('e1', 't1', 'l1'))

    const { run, ctx } = baseRun(wf)
    ctx.variables.items = ['a', 'b', 'c']
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    const lr = final.stepRuns.find((s) => s.stepId === 'l1')!
    expect((lr.output as any).iterations).toBe(3)
    expect(ctx.variables.idx).toBe(2)
    expect(ctx.variables.it).toBe('c')
  })

  it('loop for_each fails when collection is not array', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const loop: LoopStep = {
      id: 'l1',
      type: 'loop',
      name: 'l',
      description: '',
      position: { x: 0, y: 0 },
      config: { loopType: 'for_each', collection: 'missing', maxIterations: 10 },
      metadata: {},
    } as any
    wf = addStep(wf, loop)
    wf = addEdge(wf, mkEdge('e1', 't1', 'l1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    expect(final.status).toBe('failed')
  })

  it('loop count caps at maxIterations', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const loop: LoopStep = {
      id: 'l1',
      type: 'loop',
      name: 'l',
      description: '',
      position: { x: 0, y: 0 },
      config: { loopType: 'count', count: 999, maxIterations: 5 },
      metadata: {},
    } as any
    wf = addStep(wf, loop)
    wf = addEdge(wf, mkEdge('e1', 't1', 'l1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    const lr = final.stepRuns.find((s) => s.stepId === 'l1')!
    expect((lr.output as any).iterations).toBe(5)
  })

  it('parallel step reports branch count', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const par: ParallelStep = {
      id: 'p1',
      type: 'parallel',
      name: 'p',
      description: '',
      position: { x: 0, y: 0 },
      config: { branches: [{ id: 'b1', name: 'A' }, { id: 'b2', name: 'B' }], waitForAll: true },
      metadata: {},
    } as any
    wf = addStep(wf, par)
    wf = addEdge(wf, mkEdge('e1', 't1', 'p1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    const pr = final.stepRuns.find((s) => s.stepId === 'p1')!
    expect((pr.output as any).branchCount).toBe(2)
  })

  it('end step collects output variables', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const end: EndStep = {
      id: 'e1',
      type: 'end',
      name: 'e',
      description: '',
      position: { x: 0, y: 0 },
      config: { status: 'success', message: 'done', outputVariables: ['name'] },
      metadata: {},
    } as any
    wf = addStep(wf, end)
    wf = addEdge(wf, mkEdge('e', 't1', 'e1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    const er = final.stepRuns.find((s) => s.stepId === 'e1')!
    expect((er.output as any).name).toBe('alice')
    expect((er.output as any).status).toBe('success')
  })

  it('action step executes set_variable action', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const action: ActionStep = {
      id: 'ac1',
      type: 'action',
      name: 'ac',
      description: '',
      position: { x: 0, y: 0 },
      config: { actionType: 'set_variable', variableName: 'out', value: 'v' },
      metadata: {},
    } as any
    wf = addStep(wf, action)
    wf = addEdge(wf, mkEdge('e1', 't1', 'ac1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    const ar = final.stepRuns.find((s) => s.stepId === 'ac1')!
    expect(ar.status).toBe('completed')
  })
})

describe('unknown step type', () => {
  it('fails run with helpful message', async () => {
    let wf = createWorkflow('W', 'u')
    const bogus = {
      id: 'b1',
      type: 'bogus',
      name: 'b',
      description: '',
      position: { x: 0, y: 0 },
      config: {},
      metadata: {},
    } as any
    wf = addStep(wf, bogus)
    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const final = await exec.execute(wf, run, ctx)
    expect(final.status).toBe('failed')
    expect(final.error?.message).toBe('No trigger step found')
  })
})

describe('cancel + getActiveRun', () => {
  it('cancel flips a running run to cancelled', async () => {
    const exec = new WorkflowExecutor()
    // Synthesize by invoking cancel with a tracked run
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    const { run, ctx } = baseRun(wf)
    const promise = exec.execute(wf, run, ctx)
    // Immediately cancel — race-safe since we check state after await
    exec.cancel(run.id)
    await promise
    // Post-execute, run is cleaned up, so getActiveRun returns undefined
    expect(exec.getActiveRun(run.id)).toBeUndefined()
  })
})

describe('custom handler registration', () => {
  it('registerHandler overrides default', async () => {
    let wf = createWorkflow('W', 'u')
    wf = addStep(wf, mkTrigger())
    wf = addStep(wf, mkMessage('m1'))
    wf = addEdge(wf, mkEdge('e1', 't1', 'm1'))

    const { run, ctx } = baseRun(wf)
    const exec = new WorkflowExecutor()
    const spy = jest.fn().mockResolvedValue({ success: true, output: { custom: 42 } })
    exec.registerHandler('message', spy)
    const final = await exec.execute(wf, run, ctx)
    expect(spy).toHaveBeenCalled()
    const mr = final.stepRuns.find((s) => s.stepId === 'm1')!
    expect((mr.output as any).custom).toBe(42)
  })
})
