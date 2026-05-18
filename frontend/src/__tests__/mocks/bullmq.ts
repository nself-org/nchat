/**
 * Mock for bullmq
 * This mock prevents ESM import issues in Jest
 */

export class Queue {
  name: string;
  opts: Record<string, unknown>;

  constructor(name: string, opts?: Record<string, unknown>) {
    this.name = name;
    this.opts = opts || {};
  }

  async add(name: string, data: unknown, opts?: Record<string, unknown>) {
    return {
      id: "mock-job-id",
      name,
      data,
      opts: opts || {},
      timestamp: Date.now(),
    };
  }

  async addBulk(
    jobs: Array<{
      name: string;
      data: unknown;
      opts?: Record<string, unknown>;
    }>,
  ) {
    return jobs.map((job, index) => ({
      id: `mock-job-id-${index}`,
      name: job.name,
      data: job.data,
      opts: job.opts || {},
      timestamp: Date.now(),
    }));
  }

  async getJob(jobId: string) {
    return {
      id: jobId,
      name: "mock-job",
      data: {},
      timestamp: Date.now(),
      getState: async () => "completed",
      remove: async () => {},
      retry: async () => {},
    };
  }

  async getJobs(types?: string[], start?: number, end?: number) {
    return [];
  }

  async getJobCounts() {
    return {
      waiting: 0,
      active: 0,
      completed: 0,
      failed: 0,
      delayed: 0,
      paused: 0,
    };
  }

  async pause() {}
  async resume() {}
  async close() {}
  async drain() {}
  async clean(grace: number, limit: number, type?: string) {
    return [];
  }

  async obliterate() {}

  on(event: string, callback: (...args: unknown[]) => void) {
    return this;
  }

  off(event: string, callback: (...args: unknown[]) => void) {
    return this;
  }
}

export class Worker {
  name: string;
  processor: (job: unknown) => Promise<unknown>;
  opts: Record<string, unknown>;
  private eventHandlers: Map<string, Array<(...args: unknown[]) => void>> =
    new Map();

  constructor(
    name: string,
    processor: (job: unknown) => Promise<unknown>,
    opts?: Record<string, unknown>,
  ) {
    this.name = name;
    this.processor = processor;
    this.opts = opts || {};
  }

  async run() {}
  async close() {}
  async pause() {}
  async resume() {}

  on(event: string, callback: (...args: unknown[]) => void) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event)!.push(callback);
    return this;
  }

  off(event: string, callback: (...args: unknown[]) => void) {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      const index = handlers.indexOf(callback);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
    return this;
  }
}

export class QueueScheduler {
  name: string;
  opts: Record<string, unknown>;

  constructor(name: string, opts?: Record<string, unknown>) {
    this.name = name;
    this.opts = opts || {};
  }

  async close() {}

  on(event: string, callback: (...args: unknown[]) => void) {
    return this;
  }
}

export class QueueEvents {
  name: string;
  opts: Record<string, unknown>;

  constructor(name: string, opts?: Record<string, unknown>) {
    this.name = name;
    this.opts = opts || {};
  }

  async close() {}

  on(event: string, callback: (...args: unknown[]) => void) {
    return this;
  }

  off(event: string, callback: (...args: unknown[]) => void) {
    return this;
  }
}

export class FlowProducer {
  opts: Record<string, unknown>;

  constructor(opts?: Record<string, unknown>) {
    this.opts = opts || {};
  }

  async add(flow: unknown) {
    return {
      job: {
        id: "mock-flow-job-id",
        name: "mock-flow-job",
        data: {},
      },
      children: [],
    };
  }

  async close() {}
}

export const Job = {
  fromId: async (queue: Queue, jobId: string) => ({
    id: jobId,
    name: "mock-job",
    data: {},
    timestamp: Date.now(),
    getState: async () => "completed",
    remove: async () => {},
    retry: async () => {},
  }),
};

export default {
  Queue,
  Worker,
  QueueScheduler,
  QueueEvents,
  FlowProducer,
  Job,
};
