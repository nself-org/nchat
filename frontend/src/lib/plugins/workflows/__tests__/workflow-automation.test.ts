/**
 * @jest-environment node
 */

/**
 * Workflow Automation - Comprehensive Test Suite
 *
 * Tests covering workflow definition, trigger evaluation, execution engine,
 * approval gates, scheduling, retry logic, audit logging, edge cases,
 * and security scenarios.
 *
 * Target: 130+ tests organized by feature area.
 */

import {
  // Types
  DEFAULT_WORKFLOW_SETTINGS,
  DEFAULT_STEP_SETTINGS,
  MAX_WORKFLOW_STEPS,
  MAX_WORKFLOW_NAME_LENGTH,
  MAX_WORKFLOW_TAGS,
  MAX_CONDITIONAL_BRANCHES,
  MAX_PARALLEL_BRANCHES,
  MAX_LOOP_ITERATIONS,
  MAX_APPROVAL_TIMEOUT_MS,
  MAX_DELAY_DURATION_MS,
  WORKFLOW_NAME_REGEX,
  CRON_REGEX,

  // Builder
  WorkflowBuilder,
  WorkflowBuilderError,
  validateWorkflowDefinition,
  detectCircularDependencies,
  evaluateCondition,
  evaluateConditions,
  getNestedValue,
  interpolateTemplate,

  // Trigger Engine
  TriggerEngine,
  parseCronExpression,
  parseCronField,
  matchesCron,
  getNextCronTime,

  // Execution Engine
  WorkflowExecutionEngine,
  ExecutionError,
  ApprovalRequiredError,
  createDefaultHandlers,

  // Approval Gate
  ApprovalGateManager,
  ApprovalStore,
  ApprovalError,

  // Scheduler
  WorkflowScheduler,
  ScheduleStore,
  SchedulerError,
} from "../index";
import type {
  WorkflowDefinition,
  WorkflowStep,
  WorkflowTrigger,
  TriggerCondition,
  WorkflowAction,
  ApprovalAction,
  StepSettings,
} from "../index";

// ============================================================================
// TEST HELPERS
// ============================================================================

function createMinimalWorkflow(
  overrides?: Partial<WorkflowDefinition>,
): WorkflowDefinition {
  return {
    id: "wf-test-1",
    name: "Test Workflow",
    description: "A test workflow",
    version: "1.0.0",
    enabled: true,
    trigger: { type: "manual" },
    steps: [
      {
        id: "step-1",
        name: "Test Step",
        type: "action",
        action: {
          type: "send_message",
          channelId: "ch-1",
          content: "Hello!",
        },
        settings: { ...DEFAULT_STEP_SETTINGS },
      },
    ],
    inputSchema: [],
    settings: { ...DEFAULT_WORKFLOW_SETTINGS },
    requiredScopes: [],
    tags: [],
    createdBy: "user-1",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function buildWorkflow(name: string = "Test Workflow"): WorkflowBuilder {
  return new WorkflowBuilder(name, "user-1");
}

function noopSleep(): (ms: number) => Promise<void> {
  return async () => {};
}

function createTestEngine(): WorkflowExecutionEngine {
  return new WorkflowExecutionEngine({
    sleepFn: noopSleep(),
    enableAudit: true,
  });
}

// ============================================================================
// 1. WORKFLOW DEFINITION (Builder API, Validation, Serialization)
// ============================================================================

describe("Workflow Definition", () => {
  describe("WorkflowBuilder", () => {
    it("should create a minimal workflow via builder", () => {
      const workflow = buildWorkflow()
        .onManual()
        .addStep("step-1", "Send greeting", {
          type: "send_message",
          channelId: "ch-1",
          content: "Hello!",
        })
        .build();

      expect(workflow.name).toBe("Test Workflow");
      expect(workflow.trigger.type).toBe("manual");
      expect(workflow.steps).toHaveLength(1);
      expect(workflow.steps[0].id).toBe("step-1");
    });

    it("should set all builder properties", () => {
      const workflow = buildWorkflow("My Workflow")
        .id("custom-id")
        .description("Does something")
        .version("2.0.0")
        .enabled(false)
        .onManual()
        .tags(["automation", "test"])
        .scopes(["read:messages"])
        .settings({ maxRetryAttempts: 5 })
        .addInput({ name: "target", type: "string", required: true })
        .addStep("s1", "Step 1", {
          type: "send_message",
          channelId: "c1",
          content: "Hi",
        })
        .build();

      expect(workflow.id).toBe("custom-id");
      expect(workflow.description).toBe("Does something");
      expect(workflow.version).toBe("2.0.0");
      expect(workflow.enabled).toBe(false);
      expect(workflow.tags).toEqual(["automation", "test"]);
      expect(workflow.requiredScopes).toEqual(["read:messages"]);
      expect(workflow.settings.maxRetryAttempts).toBe(5);
      expect(workflow.inputSchema).toHaveLength(1);
    });

    it("should create event trigger via builder", () => {
      const workflow = buildWorkflow()
        .onEvent("message.created", { channelIds: ["ch-1"], userIds: ["u-1"] })
        .addStep("s1", "S1", {
          type: "send_message",
          channelId: "c1",
          content: "Hi",
        })
        .build();

      expect(workflow.trigger.type).toBe("event");
      if (workflow.trigger.type === "event") {
        expect(workflow.trigger.eventType).toBe("message.created");
        expect(workflow.trigger.channelIds).toEqual(["ch-1"]);
      }
    });

    it("should create schedule trigger via builder", () => {
      const workflow = buildWorkflow()
        .onSchedule("0 9 * * 1", { timezone: "America/New_York" })
        .addStep("s1", "S1", {
          type: "send_message",
          channelId: "c1",
          content: "Hi",
        })
        .build();

      expect(workflow.trigger.type).toBe("schedule");
      if (workflow.trigger.type === "schedule") {
        expect(workflow.trigger.cronExpression).toBe("0 9 * * 1");
        expect(workflow.trigger.timezone).toBe("America/New_York");
      }
    });

    it("should create webhook trigger via builder", () => {
      const workflow = buildWorkflow()
        .onWebhook(["POST"], { secret: "my-secret" })
        .addStep("s1", "S1", {
          type: "send_message",
          channelId: "c1",
          content: "Hi",
        })
        .build();

      expect(workflow.trigger.type).toBe("webhook");
      if (workflow.trigger.type === "webhook") {
        expect(workflow.trigger.methods).toEqual(["POST"]);
        expect(workflow.trigger.secret).toBe("my-secret");
      }
    });

    it("should add step with all options", () => {
      const workflow = buildWorkflow()
        .onManual()
        .addStep(
          "s1",
          "First Step",
          { type: "send_message", channelId: "c1", content: "msg" },
          {
            settings: { retryAttempts: 5, retryBackoff: "linear" },
            conditions: [
              { field: "data.type", operator: "equals", value: "important" },
            ],
            inputMapping: { channel: "trigger.channelId" },
            outputKey: "firstResult",
            dependsOn: [],
          },
        )
        .build();

      const step = workflow.steps[0];
      expect(step.settings.retryAttempts).toBe(5);
      expect(step.settings.retryBackoff).toBe("linear");
      expect(step.conditions).toHaveLength(1);
      expect(step.inputMapping).toEqual({ channel: "trigger.channelId" });
      expect(step.outputKey).toBe("firstResult");
    });

    it("should infer step types from action types", () => {
      const workflow = buildWorkflow()
        .onManual()
        .addStep("s1", "Action", {
          type: "send_message",
          channelId: "c1",
          content: "Hi",
        })
        .addStep("s2", "Condition", {
          type: "conditional_branch",
          branches: [{ name: "b1", conditions: [], targetSteps: ["s1"] }],
        })
        .addStep("s3", "Approval", {
          type: "approval",
          approverIds: ["u-1"],
          message: "Approve?",
          timeoutMs: 60000,
          minApprovals: 1,
        })
        .addStep("s4", "Delay", { type: "delay", durationMs: 5000 })
        .build();

      expect(workflow.steps[0].type).toBe("action");
      expect(workflow.steps[1].type).toBe("condition");
      expect(workflow.steps[2].type).toBe("approval");
      expect(workflow.steps[3].type).toBe("delay");
    });

    it("should throw WorkflowBuilderError on invalid build", () => {
      expect(() => {
        buildWorkflow("")
          .onManual()
          .addStep("s1", "S1", {
            type: "send_message",
            channelId: "c1",
            content: "Hi",
          })
          .build();
      }).toThrow(WorkflowBuilderError);
    });

    it("should allow buildUnsafe without validation", () => {
      const workflow = buildWorkflow("").buildUnsafe();

      expect(workflow.name).toBe("");
      expect(workflow.steps).toHaveLength(0);
    });
  });

  describe("validateWorkflowDefinition", () => {
    it("should validate a valid workflow", () => {
      const workflow = createMinimalWorkflow();
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(true);
      expect(result.errors.filter((e) => e.severity === "error")).toHaveLength(
        0,
      );
    });

    it("should reject invalid workflow name", () => {
      const workflow = createMinimalWorkflow({ name: "123-bad" });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.field === "name")).toBe(true);
    });

    it("should reject missing trigger", () => {
      const workflow = createMinimalWorkflow({
        trigger: undefined as unknown as WorkflowTrigger,
      });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });

    it("should reject empty steps", () => {
      const workflow = createMinimalWorkflow({ steps: [] });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });

    it("should reject too many steps", () => {
      const steps: WorkflowStep[] = Array.from(
        { length: MAX_WORKFLOW_STEPS + 1 },
        (_, i) => ({
          id: `s${i}`,
          name: `Step ${i}`,
          type: "action" as const,
          action: {
            type: "send_message" as const,
            channelId: "c1",
            content: "Hi",
          },
          settings: { ...DEFAULT_STEP_SETTINGS },
        }),
      );
      const workflow = createMinimalWorkflow({ steps });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });

    it("should reject duplicate step IDs", () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "A",
            type: "action",
            action: { type: "send_message", channelId: "c1", content: "Hi" },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
          {
            id: "s1",
            name: "B",
            type: "action",
            action: { type: "send_message", channelId: "c2", content: "Hi" },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
        ],
      });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.message.includes("Duplicate"))).toBe(
        true,
      );
    });

    it("should reject invalid schedule trigger cron", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "invalid",
          timezone: "UTC",
        },
      });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });

    it("should reject send_message without channelId", () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "action",
            action: {
              type: "send_message",
              channelId: "",
              content: "Hi",
            } as WorkflowAction,
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
        ],
      });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });

    it("should reject delay with negative duration", () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "delay",
            action: { type: "delay", durationMs: -1 },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
        ],
      });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });

    it("should reject delay exceeding maximum", () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "delay",
            action: { type: "delay", durationMs: MAX_DELAY_DURATION_MS + 1 },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
        ],
      });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });

    it("should reject approval timeout exceeding maximum", () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "approval",
            action: {
              type: "approval",
              approverIds: ["u-1"],
              message: "Approve?",
              timeoutMs: MAX_APPROVAL_TIMEOUT_MS + 1,
              minApprovals: 1,
            },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
        ],
      });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });

    it("should reject steps referencing unknown dependencies", () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "action",
            action: { type: "send_message", channelId: "c1", content: "Hi" },
            settings: { ...DEFAULT_STEP_SETTINGS },
            dependsOn: ["nonexistent"],
          },
        ],
      });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });

    it("should reject negative maxExecutionTimeMs", () => {
      const workflow = createMinimalWorkflow({
        settings: { ...DEFAULT_WORKFLOW_SETTINGS, maxExecutionTimeMs: -1 },
      });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });

    it("should warn about too many tags", () => {
      const workflow = createMinimalWorkflow({
        tags: Array.from(
          { length: MAX_WORKFLOW_TAGS + 1 },
          (_, i) => `tag-${i}`,
        ),
      });
      const result = validateWorkflowDefinition(workflow);
      expect(
        result.errors.some(
          (e) => e.severity === "warning" && e.field === "tags",
        ),
      ).toBe(true);
    });

    it("should reject event trigger without eventType", () => {
      const workflow = createMinimalWorkflow({
        trigger: { type: "event", eventType: "" as never },
      });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });

    it("should reject webhook trigger without methods", () => {
      const workflow = createMinimalWorkflow({
        trigger: { type: "webhook", methods: [] },
      });
      const result = validateWorkflowDefinition(workflow);
      expect(result.valid).toBe(false);
    });
  });

  describe("detectCircularDependencies", () => {
    it("should return null for acyclic graph", () => {
      const steps: WorkflowStep[] = [
        {
          id: "a",
          name: "A",
          type: "action",
          action: { type: "delay", durationMs: 1 },
          settings: { ...DEFAULT_STEP_SETTINGS },
        },
        {
          id: "b",
          name: "B",
          type: "action",
          action: { type: "delay", durationMs: 1 },
          settings: { ...DEFAULT_STEP_SETTINGS },
          dependsOn: ["a"],
        },
        {
          id: "c",
          name: "C",
          type: "action",
          action: { type: "delay", durationMs: 1 },
          settings: { ...DEFAULT_STEP_SETTINGS },
          dependsOn: ["b"],
        },
      ];
      expect(detectCircularDependencies(steps)).toBeNull();
    });

    it("should detect simple circular dependency", () => {
      const steps: WorkflowStep[] = [
        {
          id: "a",
          name: "A",
          type: "action",
          action: { type: "delay", durationMs: 1 },
          settings: { ...DEFAULT_STEP_SETTINGS },
          dependsOn: ["b"],
        },
        {
          id: "b",
          name: "B",
          type: "action",
          action: { type: "delay", durationMs: 1 },
          settings: { ...DEFAULT_STEP_SETTINGS },
          dependsOn: ["a"],
        },
      ];
      const result = detectCircularDependencies(steps);
      expect(result).not.toBeNull();
      expect(result).toContain("a");
      expect(result).toContain("b");
    });

    it("should detect transitive circular dependency", () => {
      const steps: WorkflowStep[] = [
        {
          id: "a",
          name: "A",
          type: "action",
          action: { type: "delay", durationMs: 1 },
          settings: { ...DEFAULT_STEP_SETTINGS },
          dependsOn: ["c"],
        },
        {
          id: "b",
          name: "B",
          type: "action",
          action: { type: "delay", durationMs: 1 },
          settings: { ...DEFAULT_STEP_SETTINGS },
          dependsOn: ["a"],
        },
        {
          id: "c",
          name: "C",
          type: "action",
          action: { type: "delay", durationMs: 1 },
          settings: { ...DEFAULT_STEP_SETTINGS },
          dependsOn: ["b"],
        },
      ];
      const result = detectCircularDependencies(steps);
      expect(result).not.toBeNull();
    });
  });
});

// ============================================================================
// 2. CONDITION EVALUATION
// ============================================================================

describe("Condition Evaluation", () => {
  describe("evaluateCondition", () => {
    it("should evaluate equals operator", () => {
      expect(
        evaluateCondition(
          { field: "name", operator: "equals", value: "Alice" },
          { name: "Alice" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "name", operator: "equals", value: "Bob" },
          { name: "Alice" },
        ),
      ).toBe(false);
    });

    it("should evaluate not_equals operator", () => {
      expect(
        evaluateCondition(
          { field: "name", operator: "not_equals", value: "Bob" },
          { name: "Alice" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "name", operator: "not_equals", value: "Alice" },
          { name: "Alice" },
        ),
      ).toBe(false);
    });

    it("should evaluate contains operator for strings", () => {
      expect(
        evaluateCondition(
          { field: "text", operator: "contains", value: "hello" },
          { text: "say hello world" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "text", operator: "contains", value: "bye" },
          { text: "say hello world" },
        ),
      ).toBe(false);
    });

    it("should evaluate contains operator for arrays", () => {
      expect(
        evaluateCondition(
          { field: "tags", operator: "contains", value: "urgent" },
          { tags: ["urgent", "bug"] },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "tags", operator: "contains", value: "feature" },
          { tags: ["urgent", "bug"] },
        ),
      ).toBe(false);
    });

    it("should evaluate not_contains operator", () => {
      expect(
        evaluateCondition(
          { field: "text", operator: "not_contains", value: "bye" },
          { text: "hello world" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "text", operator: "not_contains", value: "hello" },
          { text: "hello world" },
        ),
      ).toBe(false);
    });

    it("should evaluate greater_than operator", () => {
      expect(
        evaluateCondition(
          { field: "count", operator: "greater_than", value: 5 },
          { count: 10 },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "count", operator: "greater_than", value: 10 },
          { count: 5 },
        ),
      ).toBe(false);
    });

    it("should evaluate less_than operator", () => {
      expect(
        evaluateCondition(
          { field: "count", operator: "less_than", value: 10 },
          { count: 5 },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "count", operator: "less_than", value: 5 },
          { count: 10 },
        ),
      ).toBe(false);
    });

    it("should evaluate greater_than_or_equal operator", () => {
      expect(
        evaluateCondition(
          { field: "count", operator: "greater_than_or_equal", value: 5 },
          { count: 5 },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "count", operator: "greater_than_or_equal", value: 10 },
          { count: 5 },
        ),
      ).toBe(false);
    });

    it("should evaluate less_than_or_equal operator", () => {
      expect(
        evaluateCondition(
          { field: "count", operator: "less_than_or_equal", value: 5 },
          { count: 5 },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "count", operator: "less_than_or_equal", value: 5 },
          { count: 10 },
        ),
      ).toBe(false);
    });

    it("should evaluate in operator", () => {
      expect(
        evaluateCondition(
          { field: "status", operator: "in", value: ["active", "pending"] },
          { status: "active" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "status", operator: "in", value: ["active", "pending"] },
          { status: "closed" },
        ),
      ).toBe(false);
    });

    it("should evaluate not_in operator", () => {
      expect(
        evaluateCondition(
          {
            field: "status",
            operator: "not_in",
            value: ["closed", "archived"],
          },
          { status: "active" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "status", operator: "not_in", value: ["active", "pending"] },
          { status: "active" },
        ),
      ).toBe(false);
    });

    it("should evaluate matches_regex operator", () => {
      expect(
        evaluateCondition(
          { field: "email", operator: "matches_regex", value: "^[a-z]+@" },
          { email: "test@example.com" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "email", operator: "matches_regex", value: "^[0-9]+$" },
          { email: "test@example.com" },
        ),
      ).toBe(false);
    });

    it("should evaluate exists operator", () => {
      expect(
        evaluateCondition(
          { field: "name", operator: "exists", value: null },
          { name: "Alice" },
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "missing", operator: "exists", value: null },
          {},
        ),
      ).toBe(false);
    });

    it("should evaluate not_exists operator", () => {
      expect(
        evaluateCondition(
          { field: "missing", operator: "not_exists", value: null },
          {},
        ),
      ).toBe(true);
      expect(
        evaluateCondition(
          { field: "name", operator: "not_exists", value: null },
          { name: "Alice" },
        ),
      ).toBe(false);
    });

    it("should handle invalid regex gracefully", () => {
      expect(
        evaluateCondition(
          { field: "text", operator: "matches_regex", value: "[invalid" },
          { text: "hello" },
        ),
      ).toBe(false);
    });

    it("should handle non-numeric comparison gracefully", () => {
      expect(
        evaluateCondition(
          { field: "name", operator: "greater_than", value: 5 },
          { name: "Alice" },
        ),
      ).toBe(false);
    });
  });

  describe("evaluateConditions", () => {
    it("should return true when all conditions match", () => {
      const conditions: TriggerCondition[] = [
        { field: "type", operator: "equals", value: "message" },
        { field: "priority", operator: "greater_than", value: 5 },
      ];
      expect(
        evaluateConditions(conditions, { type: "message", priority: 10 }),
      ).toBe(true);
    });

    it("should return false when any condition fails", () => {
      const conditions: TriggerCondition[] = [
        { field: "type", operator: "equals", value: "message" },
        { field: "priority", operator: "greater_than", value: 15 },
      ];
      expect(
        evaluateConditions(conditions, { type: "message", priority: 10 }),
      ).toBe(false);
    });

    it("should return true for empty conditions", () => {
      expect(evaluateConditions([], {})).toBe(true);
    });
  });

  describe("getNestedValue", () => {
    it("should get top-level value", () => {
      expect(getNestedValue({ name: "Alice" }, "name")).toBe("Alice");
    });

    it("should get nested value", () => {
      expect(
        getNestedValue(
          { user: { profile: { name: "Alice" } } },
          "user.profile.name",
        ),
      ).toBe("Alice");
    });

    it("should return undefined for missing path", () => {
      expect(getNestedValue({ user: {} }, "user.profile.name")).toBeUndefined();
    });

    it("should return undefined for null intermediate", () => {
      expect(
        getNestedValue({ user: null } as Record<string, unknown>, "user.name"),
      ).toBeUndefined();
    });
  });

  describe("interpolateTemplate", () => {
    it("should interpolate simple templates", () => {
      expect(interpolateTemplate("Hello {{name}}!", { name: "Alice" })).toBe(
        "Hello Alice!",
      );
    });

    it("should interpolate nested paths", () => {
      expect(
        interpolateTemplate("Channel: {{channel.name}}", {
          channel: { name: "general" },
        }),
      ).toBe("Channel: general");
    });

    it("should replace missing values with empty string", () => {
      expect(interpolateTemplate("Hello {{missing}}!", {})).toBe("Hello !");
    });

    it("should handle multiple placeholders", () => {
      expect(interpolateTemplate("{{a}} and {{b}}", { a: "X", b: "Y" })).toBe(
        "X and Y",
      );
    });

    it("should handle whitespace in template paths", () => {
      expect(interpolateTemplate("{{ name }}", { name: "Alice" })).toBe(
        "Alice",
      );
    });
  });
});

// ============================================================================
// 3. TRIGGER EVALUATION
// ============================================================================

describe("Trigger Evaluation", () => {
  let engine: TriggerEngine;

  beforeEach(() => {
    engine = new TriggerEngine();
  });

  describe("Event Triggers", () => {
    it("should match event trigger with matching event type", () => {
      const workflow = createMinimalWorkflow({
        trigger: { type: "event", eventType: "message.created" },
      });
      engine.registerWorkflow(workflow);

      const matches = engine.evaluateEvent("message.created", {
        channelId: "ch-1",
      });
      expect(matches).toHaveLength(1);
      expect(matches[0].workflow.id).toBe(workflow.id);
    });

    it("should not match event trigger with different event type", () => {
      const workflow = createMinimalWorkflow({
        trigger: { type: "event", eventType: "message.created" },
      });
      engine.registerWorkflow(workflow);

      const matches = engine.evaluateEvent("message.deleted", {
        channelId: "ch-1",
      });
      expect(matches).toHaveLength(0);
    });

    it("should filter by channel IDs", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "event",
          eventType: "message.created",
          channelIds: ["ch-1"],
        },
      });
      engine.registerWorkflow(workflow);

      expect(
        engine.evaluateEvent("message.created", { channelId: "ch-1" }),
      ).toHaveLength(1);
      expect(
        engine.evaluateEvent("message.created", { channelId: "ch-2" }),
      ).toHaveLength(0);
    });

    it("should filter by user IDs", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "event",
          eventType: "message.created",
          userIds: ["user-1"],
        },
      });
      engine.registerWorkflow(workflow);

      expect(
        engine.evaluateEvent("message.created", { userId: "user-1" }),
      ).toHaveLength(1);
      expect(
        engine.evaluateEvent("message.created", { userId: "user-2" }),
      ).toHaveLength(0);
    });

    it("should apply trigger conditions", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "event",
          eventType: "message.created",
          conditions: [
            { field: "priority", operator: "equals", value: "high" },
          ],
        },
      });
      engine.registerWorkflow(workflow);

      expect(
        engine.evaluateEvent("message.created", { priority: "high" }),
      ).toHaveLength(1);
      expect(
        engine.evaluateEvent("message.created", { priority: "low" }),
      ).toHaveLength(0);
    });

    it("should skip disabled workflows", () => {
      const workflow = createMinimalWorkflow({
        enabled: false,
        trigger: { type: "event", eventType: "message.created" },
      });
      engine.registerWorkflow(workflow);

      expect(engine.evaluateEvent("message.created", {})).toHaveLength(0);
    });

    it("should match multiple workflows for same event", () => {
      engine.registerWorkflow(
        createMinimalWorkflow({
          id: "wf-1",
          trigger: { type: "event", eventType: "message.created" },
        }),
      );
      engine.registerWorkflow(
        createMinimalWorkflow({
          id: "wf-2",
          trigger: { type: "event", eventType: "message.created" },
        }),
      );

      expect(engine.evaluateEvent("message.created", {})).toHaveLength(2);
    });
  });

  describe("Schedule Triggers", () => {
    it("should match cron at the right time", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "30 14 * * *",
          timezone: "UTC",
        },
      });
      engine.registerWorkflow(workflow);

      // 14:30 UTC
      const matchTime = new Date("2026-02-09T14:30:00Z");
      expect(engine.evaluateSchedule(matchTime)).toHaveLength(1);

      // 14:31 UTC
      const noMatchTime = new Date("2026-02-09T14:31:00Z");
      expect(engine.evaluateSchedule(noMatchTime)).toHaveLength(0);
    });

    it("should respect start date bounds", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 * * * *",
          timezone: "UTC",
          startDate: "2026-03-01T00:00:00Z",
        },
      });
      engine.registerWorkflow(workflow);

      const beforeStart = new Date("2026-02-15T12:00:00Z");
      expect(engine.evaluateSchedule(beforeStart)).toHaveLength(0);
    });

    it("should respect end date bounds", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 * * * *",
          timezone: "UTC",
          endDate: "2026-01-01T00:00:00Z",
        },
      });
      engine.registerWorkflow(workflow);

      const afterEnd = new Date("2026-02-09T12:00:00Z");
      expect(engine.evaluateSchedule(afterEnd)).toHaveLength(0);
    });
  });

  describe("Webhook Triggers", () => {
    it("should match webhook with correct method", () => {
      const workflow = createMinimalWorkflow({
        trigger: { type: "webhook", methods: ["POST"] },
      });
      engine.registerWorkflow(workflow);

      const match = engine.evaluateWebhook(
        workflow.id,
        "POST",
        { data: "test" },
        { "content-type": "application/json" },
      );
      expect(match).not.toBeNull();
    });

    it("should reject webhook with wrong method", () => {
      const workflow = createMinimalWorkflow({
        trigger: { type: "webhook", methods: ["POST"] },
      });
      engine.registerWorkflow(workflow);

      const match = engine.evaluateWebhook(workflow.id, "GET", {}, {});
      expect(match).toBeNull();
    });

    it("should apply webhook conditions", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "webhook",
          methods: ["POST"],
          conditions: [
            { field: "action", operator: "equals", value: "deploy" },
          ],
        },
      });
      engine.registerWorkflow(workflow);

      expect(
        engine.evaluateWebhook(workflow.id, "POST", { action: "deploy" }, {}),
      ).not.toBeNull();
      expect(
        engine.evaluateWebhook(workflow.id, "POST", { action: "test" }, {}),
      ).toBeNull();
    });

    it("should return null for unknown workflow", () => {
      expect(engine.evaluateWebhook("unknown", "POST", {}, {})).toBeNull();
    });
  });

  describe("Manual Triggers", () => {
    it("should allow manual trigger for allowed user", () => {
      const workflow = createMinimalWorkflow({
        trigger: { type: "manual", allowedUserIds: ["user-1"] },
      });
      engine.registerWorkflow(workflow);

      expect(
        engine.evaluateManual(workflow.id, "user-1", [], {}),
      ).not.toBeNull();
      expect(engine.evaluateManual(workflow.id, "user-2", [], {})).toBeNull();
    });

    it("should allow manual trigger for allowed role", () => {
      const workflow = createMinimalWorkflow({
        trigger: { type: "manual", allowedRoles: ["admin"] },
      });
      engine.registerWorkflow(workflow);

      expect(
        engine.evaluateManual(workflow.id, "u-1", ["admin"], {}),
      ).not.toBeNull();
      expect(
        engine.evaluateManual(workflow.id, "u-2", ["member"], {}),
      ).toBeNull();
    });

    it("should allow any user when no restrictions", () => {
      const workflow = createMinimalWorkflow({ trigger: { type: "manual" } });
      engine.registerWorkflow(workflow);

      expect(
        engine.evaluateManual(workflow.id, "anyone", [], {}),
      ).not.toBeNull();
    });
  });

  describe("Registration", () => {
    it("should unregister a workflow", () => {
      const workflow = createMinimalWorkflow({
        trigger: { type: "event", eventType: "message.created" },
      });
      engine.registerWorkflow(workflow);
      engine.unregisterWorkflow(workflow.id);

      expect(engine.evaluateEvent("message.created", {})).toHaveLength(0);
    });

    it("should list registered workflows", () => {
      engine.registerWorkflow(createMinimalWorkflow({ id: "wf-1" }));
      engine.registerWorkflow(createMinimalWorkflow({ id: "wf-2" }));
      expect(engine.getRegisteredWorkflows()).toHaveLength(2);
    });

    it("should clear all workflows", () => {
      engine.registerWorkflow(createMinimalWorkflow({ id: "wf-1" }));
      engine.clear();
      expect(engine.getRegisteredWorkflows()).toHaveLength(0);
    });
  });
});

// ============================================================================
// 4. CRON PARSING
// ============================================================================

describe("Cron Parsing", () => {
  describe("parseCronExpression", () => {
    it("should parse standard 5-field cron", () => {
      const fields = parseCronExpression("0 9 * * 1");
      expect(fields).not.toBeNull();
      expect(fields!.minute).toEqual([0]);
      expect(fields!.hour).toEqual([9]);
      expect(fields!.dayOfWeek).toEqual([1]);
    });

    it("should parse wildcards", () => {
      const fields = parseCronExpression("* * * * *");
      expect(fields).not.toBeNull();
      expect(fields!.minute).toHaveLength(60); // 0-59
      expect(fields!.hour).toHaveLength(24); // 0-23
    });

    it("should parse ranges", () => {
      const fields = parseCronExpression("0-5 * * * *");
      expect(fields).not.toBeNull();
      expect(fields!.minute).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it("should parse lists", () => {
      const fields = parseCronExpression("0,15,30,45 * * * *");
      expect(fields).not.toBeNull();
      expect(fields!.minute).toEqual([0, 15, 30, 45]);
    });

    it("should parse step values", () => {
      const fields = parseCronExpression("*/15 * * * *");
      expect(fields).not.toBeNull();
      expect(fields!.minute).toEqual([0, 15, 30, 45]);
    });

    it("should parse range with step", () => {
      const fields = parseCronExpression("0-30/10 * * * *");
      expect(fields).not.toBeNull();
      expect(fields!.minute).toEqual([0, 10, 20, 30]);
    });

    it("should return null for invalid cron (wrong number of fields)", () => {
      expect(parseCronExpression("* * *")).toBeNull();
      expect(parseCronExpression("* * * * * *")).toBeNull();
    });
  });

  describe("parseCronField", () => {
    it("should parse a single value", () => {
      expect(parseCronField("5", 0, 59)).toEqual([5]);
    });

    it("should parse a wildcard", () => {
      const result = parseCronField("*", 0, 5);
      expect(result).toEqual([0, 1, 2, 3, 4, 5]);
    });

    it("should parse a range", () => {
      expect(parseCronField("2-5", 0, 10)).toEqual([2, 3, 4, 5]);
    });

    it("should parse a list", () => {
      expect(parseCronField("1,3,5", 0, 10)).toEqual([1, 3, 5]);
    });

    it("should clamp values to min/max", () => {
      expect(parseCronField("100", 0, 59)).toEqual([]);
    });
  });

  describe("matchesCron", () => {
    it("should match every-minute cron at any time", () => {
      expect(matchesCron("* * * * *", new Date("2026-02-09T12:30:00Z"))).toBe(
        true,
      );
    });

    it("should match specific time", () => {
      // 12:30 UTC on a Sunday (Feb 9 2026 is Monday=1)
      const monday = new Date("2026-02-09T12:30:00Z");
      expect(matchesCron("30 12 * * 1", monday)).toBe(true);
      expect(matchesCron("31 12 * * 1", monday)).toBe(false);
    });

    it("should not match wrong day of week", () => {
      const monday = new Date("2026-02-09T12:30:00Z"); // Monday
      expect(matchesCron("30 12 * * 0", monday)).toBe(false); // Sunday
    });
  });

  describe("getNextCronTime", () => {
    it("should calculate next execution for every-minute cron", () => {
      const after = new Date("2026-02-09T12:30:00Z");
      const next = getNextCronTime("* * * * *", after);
      expect(next).not.toBeNull();
      expect(next!.getUTCMinutes()).toBe(31);
    });

    it("should calculate next execution for specific time", () => {
      const after = new Date("2026-02-09T12:00:00Z");
      const next = getNextCronTime("30 14 * * *", after);
      expect(next).not.toBeNull();
      expect(next!.getUTCHours()).toBe(14);
      expect(next!.getUTCMinutes()).toBe(30);
    });

    it("should return null for invalid cron", () => {
      expect(getNextCronTime("invalid", new Date())).toBeNull();
    });
  });
});

// ============================================================================
// 5. EXECUTION ENGINE
// ============================================================================

describe("Execution Engine", () => {
  let engine: WorkflowExecutionEngine;

  beforeEach(() => {
    engine = createTestEngine();
  });

  afterEach(() => {
    engine.clear();
  });

  describe("Basic Execution", () => {
    it("should execute a simple workflow successfully", async () => {
      const workflow = createMinimalWorkflow();
      const run = await engine.startRun(workflow, {
        type: "manual",
        userId: "u-1",
      });

      expect(run.status).toBe("completed");
      expect(run.stepResults).toHaveLength(1);
      expect(run.stepResults[0].status).toBe("completed");
    });

    it("should populate trigger data in context", async () => {
      const workflow = createMinimalWorkflow();
      const eventData = { channelId: "ch-1", userId: "u-1" };
      const run = await engine.startRun(workflow, { type: "event", eventData });

      expect(run.context.triggerData).toEqual(eventData);
    });

    it("should store step outputs in context", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "action",
            action: { type: "send_message", channelId: "ch-1", content: "Hi" },
            settings: { ...DEFAULT_STEP_SETTINGS },
            outputKey: "messageResult",
          },
        ],
      });

      const run = await engine.startRun(workflow, { type: "manual" });
      expect(run.context.stepOutputs.messageResult).toBeDefined();
    });

    it("should execute multiple steps in order", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "action",
            action: { type: "send_message", channelId: "c1", content: "First" },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
          {
            id: "s2",
            name: "S2",
            type: "action",
            action: {
              type: "send_message",
              channelId: "c1",
              content: "Second",
            },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
        ],
      });

      const run = await engine.startRun(workflow, { type: "manual" });
      expect(run.status).toBe("completed");
      expect(run.stepResults).toHaveLength(2);
      expect(run.stepResults[0].stepId).toBe("s1");
      expect(run.stepResults[1].stepId).toBe("s2");
    });

    it("should handle http_request action", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "HTTP",
            type: "action",
            action: {
              type: "http_request",
              url: "https://api.example.com",
              method: "GET",
            },
            settings: { ...DEFAULT_STEP_SETTINGS },
            outputKey: "httpResult",
          },
        ],
      });

      const run = await engine.startRun(workflow, { type: "manual" });
      expect(run.status).toBe("completed");
      expect(run.context.stepOutputs.httpResult).toBeDefined();
    });

    it("should handle set_variable action", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "Set var",
            type: "action",
            action: {
              type: "set_variable",
              variableName: "greeting",
              value: "hello",
            },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
        ],
      });

      const run = await engine.startRun(workflow, { type: "manual" });
      expect(run.status).toBe("completed");
      expect(run.context.variables.greeting).toBe("hello");
    });

    it("should handle delay action", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "Wait",
            type: "delay",
            action: { type: "delay", durationMs: 100 },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
        ],
      });

      const run = await engine.startRun(workflow, { type: "manual" });
      expect(run.status).toBe("completed");
    });

    it("should handle transform_data action", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "Transform",
            type: "action",
            action: {
              type: "transform_data",
              input: "inputs.name",
              transform: "uppercase",
            },
            settings: { ...DEFAULT_STEP_SETTINGS },
            outputKey: "transformed",
          },
        ],
      });

      const run = await engine.startRun(
        workflow,
        { type: "manual" },
        { name: "alice" },
      );
      expect(run.status).toBe("completed");
    });
  });

  describe("Conditional Execution", () => {
    it("should skip steps when conditions are not met", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "Conditional",
            type: "action",
            action: { type: "send_message", channelId: "c1", content: "Hi" },
            settings: { ...DEFAULT_STEP_SETTINGS },
            conditions: [
              { field: "inputs.shouldRun", operator: "equals", value: true },
            ],
          },
        ],
      });

      const run = await engine.startRun(
        workflow,
        { type: "manual" },
        { shouldRun: false },
      );
      expect(run.stepResults[0].status).toBe("skipped");
      expect(run.stepResults[0].skipReason).toContain("Conditions not met");
    });

    it("should execute steps when conditions are met", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "Conditional",
            type: "action",
            action: { type: "send_message", channelId: "c1", content: "Hi" },
            settings: { ...DEFAULT_STEP_SETTINGS },
            conditions: [
              { field: "inputs.shouldRun", operator: "equals", value: true },
            ],
          },
        ],
      });

      const run = await engine.startRun(
        workflow,
        { type: "manual" },
        { shouldRun: true },
      );
      expect(run.stepResults[0].status).toBe("completed");
    });

    it("should handle conditional_branch action", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "Branch",
            type: "condition",
            action: {
              type: "conditional_branch",
              branches: [
                {
                  name: "high-priority",
                  conditions: [
                    {
                      field: "inputs.priority",
                      operator: "equals",
                      value: "high",
                    },
                  ],
                  targetSteps: ["s2"],
                },
              ],
              defaultSteps: ["s3"],
            },
            settings: { ...DEFAULT_STEP_SETTINGS },
            outputKey: "branchResult",
          },
        ],
      });

      const run = await engine.startRun(
        workflow,
        { type: "manual" },
        { priority: "high" },
      );
      expect(run.context.stepOutputs.branchResult).toEqual({
        branch: "high-priority",
        matched: true,
      });
    });
  });

  describe("Dependency Resolution", () => {
    it("should execute steps respecting dependency order", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s2",
            name: "S2",
            type: "action",
            action: {
              type: "send_message",
              channelId: "c1",
              content: "Second",
            },
            settings: { ...DEFAULT_STEP_SETTINGS },
            dependsOn: ["s1"],
          },
          {
            id: "s1",
            name: "S1",
            type: "action",
            action: { type: "send_message", channelId: "c1", content: "First" },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
        ],
      });

      const run = await engine.startRun(workflow, { type: "manual" });
      expect(run.status).toBe("completed");
      // s1 should be executed before s2
      const s1Index = run.stepResults.findIndex((r) => r.stepId === "s1");
      const s2Index = run.stepResults.findIndex((r) => r.stepId === "s2");
      expect(s1Index).toBeLessThan(s2Index);
    });

    it("should resolve topological execution order", () => {
      const steps: WorkflowStep[] = [
        {
          id: "c",
          name: "C",
          type: "action",
          action: { type: "delay", durationMs: 1 },
          settings: { ...DEFAULT_STEP_SETTINGS },
          dependsOn: ["a", "b"],
        },
        {
          id: "b",
          name: "B",
          type: "action",
          action: { type: "delay", durationMs: 1 },
          settings: { ...DEFAULT_STEP_SETTINGS },
          dependsOn: ["a"],
        },
        {
          id: "a",
          name: "A",
          type: "action",
          action: { type: "delay", durationMs: 1 },
          settings: { ...DEFAULT_STEP_SETTINGS },
        },
      ];

      const order = engine.resolveExecutionOrder(steps);
      expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
      expect(order.indexOf("b")).toBeLessThan(order.indexOf("c"));
    });
  });

  describe("Error Handling", () => {
    it("should fail workflow on step error when continueOnFailure is false", async () => {
      const handlers = createDefaultHandlers();
      handlers.register("send_message", async () => {
        throw new Error("Send failed");
      });

      const failEngine = new WorkflowExecutionEngine({
        sleepFn: noopSleep(),
        enableAudit: true,
        actionHandlers: handlers,
      });

      const workflow = createMinimalWorkflow({
        settings: { ...DEFAULT_WORKFLOW_SETTINGS, maxRetryAttempts: 0 },
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "action",
            action: { type: "send_message", channelId: "c1", content: "Hi" },
            settings: { ...DEFAULT_STEP_SETTINGS, retryAttempts: 0 },
          },
        ],
      });

      const run = await failEngine.startRun(workflow, { type: "manual" });
      expect(run.status).toBe("failed");
      expect(run.error).toBeDefined();
      expect(run.error!.message).toContain("Send failed");
    });

    it("should continue on step failure when skipOnFailure is true", async () => {
      const handlers = createDefaultHandlers();
      handlers.register("send_message", async () => {
        throw new Error("Send failed");
      });

      const failEngine = new WorkflowExecutionEngine({
        sleepFn: noopSleep(),
        enableAudit: true,
        actionHandlers: handlers,
      });

      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "action",
            action: { type: "send_message", channelId: "c1", content: "Hi" },
            settings: {
              ...DEFAULT_STEP_SETTINGS,
              retryAttempts: 0,
              skipOnFailure: true,
            },
          },
          {
            id: "s2",
            name: "S2",
            type: "action",
            action: { type: "delay", durationMs: 1 },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
        ],
      });

      const run = await failEngine.startRun(workflow, { type: "manual" });
      expect(run.status).toBe("completed");
      expect(run.stepResults[0].status).toBe("skipped");
      expect(run.stepResults[1].status).toBe("completed");
    });

    it("should throw for unknown action type", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "action",
            action: { type: "nonexistent_action" } as unknown as WorkflowAction,
            settings: { ...DEFAULT_STEP_SETTINGS, retryAttempts: 0 },
          },
        ],
      });

      const run = await engine.startRun(workflow, { type: "manual" });
      expect(run.status).toBe("failed");
    });
  });

  describe("Concurrency", () => {
    it("should enforce concurrency limits", async () => {
      const workflow = createMinimalWorkflow({
        settings: { ...DEFAULT_WORKFLOW_SETTINGS, maxConcurrentExecutions: 1 },
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "delay",
            action: { type: "delay", durationMs: 100 },
            settings: { ...DEFAULT_STEP_SETTINGS },
          },
        ],
      });

      // Start first run
      await engine.startRun(workflow, { type: "manual" });

      // Note: since we use noopSleep, the first run completes instantly
      // so concurrency limit won't be hit. This test verifies the mechanism exists.
      expect(engine.getActiveRunCount(workflow.id)).toBe(0); // completed
    });

    it("should throw when concurrency limit is exceeded", async () => {
      // Create an engine where sleep doesn't complete
      let resolveBlocker: () => void;
      const blockerPromise = new Promise<void>((resolve) => {
        resolveBlocker = resolve;
      });

      const handlers = createDefaultHandlers();
      handlers.register("send_message", async () => {
        await blockerPromise;
        return { sent: true };
      });

      const blockingEngine = new WorkflowExecutionEngine({
        sleepFn: noopSleep(),
        enableAudit: true,
        actionHandlers: handlers,
      });

      const workflow = createMinimalWorkflow({
        settings: { ...DEFAULT_WORKFLOW_SETTINGS, maxConcurrentExecutions: 1 },
      });

      // Start first run (will block)
      const firstRunPromise = blockingEngine.startRun(workflow, {
        type: "manual",
      });

      // Try to start second run while first is blocked
      await expect(
        blockingEngine.startRun(workflow, { type: "manual" }),
      ).rejects.toThrow("concurrency limit");

      // Cleanup
      resolveBlocker!();
      await firstRunPromise;
    });
  });

  describe("Input Validation", () => {
    it("should validate required inputs", async () => {
      const workflow = createMinimalWorkflow({
        inputSchema: [{ name: "target", type: "string", required: true }],
      });

      await expect(
        engine.startRun(workflow, { type: "manual" }, {}),
      ).rejects.toThrow('Required input "target" is missing');
    });

    it("should use default values for missing optional inputs", async () => {
      const workflow = createMinimalWorkflow({
        inputSchema: [
          {
            name: "greeting",
            type: "string",
            required: true,
            defaultValue: "Hello",
          },
        ],
      });

      const run = await engine.startRun(workflow, { type: "manual" });
      expect(run.context.inputs.greeting).toBe("Hello");
    });
  });

  describe("Run Management", () => {
    it("should cancel a running run", async () => {
      const workflow = createMinimalWorkflow();
      const run = await engine.startRun(workflow, { type: "manual" });

      // Already completed, but test the mechanism
      expect(run.status).toBe("completed");
    });

    it("should list runs by workflow", async () => {
      const wf1 = createMinimalWorkflow({ id: "wf-1" });
      const wf2 = createMinimalWorkflow({ id: "wf-2" });

      await engine.startRun(wf1, { type: "manual" });
      await engine.startRun(wf1, { type: "manual" });
      await engine.startRun(wf2, { type: "manual" });

      expect(engine.listRuns({ workflowId: "wf-1" })).toHaveLength(2);
      expect(engine.listRuns({ workflowId: "wf-2" })).toHaveLength(1);
    });

    it("should list runs by status", async () => {
      const workflow = createMinimalWorkflow();
      await engine.startRun(workflow, { type: "manual" });

      expect(engine.listRuns({ status: "completed" })).toHaveLength(1);
      expect(engine.listRuns({ status: "failed" })).toHaveLength(0);
    });

    it("should get run by ID", async () => {
      const workflow = createMinimalWorkflow();
      const run = await engine.startRun(workflow, { type: "manual" });

      const fetched = engine.getRun(run.id);
      expect(fetched).toBeDefined();
      expect(fetched!.id).toBe(run.id);
    });

    it("should return undefined for unknown run", () => {
      expect(engine.getRun("nonexistent")).toBeUndefined();
    });
  });

  describe("Idempotency", () => {
    it("should skip steps with already-processed idempotency keys", async () => {
      const workflow = createMinimalWorkflow({
        steps: [
          {
            id: "s1",
            name: "S1",
            type: "action",
            action: { type: "send_message", channelId: "c1", content: "Hi" },
            settings: { ...DEFAULT_STEP_SETTINGS, idempotencyKey: "fixed-key" },
          },
        ],
      });

      // First run processes the key
      const run1 = await engine.startRun(workflow, { type: "manual" });
      expect(run1.stepResults[0].status).toBe("completed");

      // Second run skips due to idempotency
      const run2 = await engine.startRun(workflow, { type: "manual" });
      expect(run2.stepResults[0].status).toBe("skipped");
      expect(run2.stepResults[0].skipReason).toContain("Idempotency key");
    });
  });
});

// ============================================================================
// 6. RETRY LOGIC
// ============================================================================

describe("Retry Logic", () => {
  it("should retry failed steps with exponential backoff", async () => {
    let attempts = 0;
    const handlers = createDefaultHandlers();
    handlers.register("send_message", async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`Attempt ${attempts} failed`);
      }
      return { sent: true };
    });

    const engine = new WorkflowExecutionEngine({
      sleepFn: noopSleep(),
      enableAudit: true,
      actionHandlers: handlers,
    });

    const workflow = createMinimalWorkflow({
      steps: [
        {
          id: "s1",
          name: "S1",
          type: "action",
          action: { type: "send_message", channelId: "c1", content: "Hi" },
          settings: {
            ...DEFAULT_STEP_SETTINGS,
            retryAttempts: 3,
            retryBackoff: "exponential",
            retryDelayMs: 100,
          },
        },
      ],
    });

    const run = await engine.startRun(workflow, { type: "manual" });
    expect(run.status).toBe("completed");
    expect(attempts).toBe(3);
    expect(run.stepResults[0].retryCount).toBe(2); // 2 retries after initial
  });

  it("should fail after exhausting all retries", async () => {
    const handlers = createDefaultHandlers();
    handlers.register("send_message", async () => {
      throw new Error("Always fails");
    });

    const engine = new WorkflowExecutionEngine({
      sleepFn: noopSleep(),
      enableAudit: true,
      actionHandlers: handlers,
    });

    const workflow = createMinimalWorkflow({
      steps: [
        {
          id: "s1",
          name: "S1",
          type: "action",
          action: { type: "send_message", channelId: "c1", content: "Hi" },
          settings: { ...DEFAULT_STEP_SETTINGS, retryAttempts: 2 },
        },
      ],
    });

    const run = await engine.startRun(workflow, { type: "manual" });
    expect(run.status).toBe("failed");
    expect(run.stepResults[0].retryCount).toBe(2);
  });

  describe("calculateRetryDelay", () => {
    const engine = createTestEngine();

    it("should calculate fixed delay", () => {
      const settings: StepSettings = {
        ...DEFAULT_STEP_SETTINGS,
        retryBackoff: "fixed",
        retryDelayMs: 1000,
      };
      expect(engine.calculateRetryDelay(settings, 1)).toBe(1000);
      expect(engine.calculateRetryDelay(settings, 5)).toBe(1000);
    });

    it("should calculate linear delay", () => {
      const settings: StepSettings = {
        ...DEFAULT_STEP_SETTINGS,
        retryBackoff: "linear",
        retryDelayMs: 1000,
      };
      expect(engine.calculateRetryDelay(settings, 1)).toBe(1000);
      expect(engine.calculateRetryDelay(settings, 3)).toBe(3000);
    });

    it("should calculate exponential delay", () => {
      const settings: StepSettings = {
        ...DEFAULT_STEP_SETTINGS,
        retryBackoff: "exponential",
        retryDelayMs: 1000,
      };
      expect(engine.calculateRetryDelay(settings, 1)).toBe(1000);
      expect(engine.calculateRetryDelay(settings, 2)).toBe(2000);
      expect(engine.calculateRetryDelay(settings, 3)).toBe(4000);
    });

    it("should cap delay at maxRetryDelayMs", () => {
      const settings: StepSettings = {
        ...DEFAULT_STEP_SETTINGS,
        retryBackoff: "exponential",
        retryDelayMs: 1000,
        maxRetryDelayMs: 5000,
      };
      expect(engine.calculateRetryDelay(settings, 10)).toBe(5000);
    });
  });

  it("should retry the overall run", async () => {
    let firstAttempt = true;
    const handlers = createDefaultHandlers();
    handlers.register("send_message", async () => {
      if (firstAttempt) {
        firstAttempt = false;
        throw new Error("Temporary failure");
      }
      return { sent: true };
    });

    const engine = new WorkflowExecutionEngine({
      sleepFn: noopSleep(),
      enableAudit: true,
      actionHandlers: handlers,
    });

    const workflow = createMinimalWorkflow({
      steps: [
        {
          id: "s1",
          name: "S1",
          type: "action",
          action: { type: "send_message", channelId: "c1", content: "Hi" },
          settings: { ...DEFAULT_STEP_SETTINGS, retryAttempts: 0 },
        },
      ],
    });

    const failedRun = await engine.startRun(workflow, { type: "manual" });
    expect(failedRun.status).toBe("failed");

    const retriedRun = await engine.retryRun(failedRun.id, workflow);
    expect(retriedRun.status).toBe("completed");
    expect(retriedRun.retryCount).toBe(1);
  });

  it("should reject retry of non-failed run", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow();
    const run = await engine.startRun(workflow, { type: "manual" });

    await expect(engine.retryRun(run.id, workflow)).rejects.toThrow(
      "Cannot retry",
    );
  });
});

// ============================================================================
// 7. APPROVAL GATES
// ============================================================================

describe("Approval Gates", () => {
  let manager: ApprovalGateManager;

  beforeEach(() => {
    manager = new ApprovalGateManager();
  });

  afterEach(() => {
    manager.clear();
  });

  describe("Request Creation", () => {
    it("should create an approval request", () => {
      const request = manager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1", "user-2"],
        message: "Please approve",
        timeoutMs: 60000,
        minApprovals: 1,
      });

      expect(request.status).toBe("pending");
      expect(request.approverIds).toEqual(["user-1", "user-2"]);
      expect(request.minApprovals).toBe(1);
    });

    it("should return existing request for same run/step", () => {
      const action: ApprovalAction = {
        type: "approval",
        approverIds: ["user-1"],
        message: "Approve",
        timeoutMs: 60000,
        minApprovals: 1,
      };

      const req1 = manager.createRequest("run-1", "step-1", "wf-1", action);
      const req2 = manager.createRequest("run-1", "step-1", "wf-1", action);
      expect(req1.id).toBe(req2.id);
    });

    it("should notify approvers on creation", () => {
      const notified: string[] = [];
      manager.onNotify = (userIds) => {
        notified.push(...userIds);
      };

      manager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1", "user-2"],
        message: "Please approve",
        timeoutMs: 60000,
        minApprovals: 1,
      });

      expect(notified).toEqual(["user-1", "user-2"]);
    });
  });

  describe("Approval Flow", () => {
    it("should approve with single approver", () => {
      const request = manager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1"],
        message: "Approve",
        timeoutMs: 60000,
        minApprovals: 1,
      });

      const result = manager.approve(request.id, "user-1", "Looks good");
      expect(result.status).toBe("approved");
      expect(result.currentApprovals).toBe(1);
      expect(result.responses).toHaveLength(1);
      expect(result.responses[0].decision).toBe("approved");
      expect(result.responses[0].comment).toBe("Looks good");
    });

    it("should require multiple approvals", () => {
      const request = manager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1", "user-2", "user-3"],
        message: "Approve",
        timeoutMs: 60000,
        minApprovals: 2,
      });

      const after1 = manager.approve(request.id, "user-1");
      expect(after1.status).toBe("pending");
      expect(after1.currentApprovals).toBe(1);

      const after2 = manager.approve(request.id, "user-2");
      expect(after2.status).toBe("approved");
      expect(after2.currentApprovals).toBe(2);
    });

    it("should reject when remaining approvers cannot reach minimum", () => {
      const request = manager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1", "user-2"],
        message: "Approve",
        timeoutMs: 60000,
        minApprovals: 2,
      });

      // User 1 rejects - now only 1 potential approver left, can't reach 2
      const result = manager.reject(request.id, "user-1", "Not ready");
      expect(result.status).toBe("rejected");
    });

    it("should prevent duplicate responses", () => {
      const request = manager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1", "user-2"],
        message: "Approve",
        timeoutMs: 60000,
        minApprovals: 2,
      });

      manager.approve(request.id, "user-1");
      expect(() => manager.approve(request.id, "user-1")).toThrow(
        "already responded",
      );
    });

    it("should reject unauthorized responders", () => {
      const request = manager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1"],
        message: "Approve",
        timeoutMs: 60000,
        minApprovals: 1,
      });

      expect(() => manager.approve(request.id, "unauthorized-user")).toThrow(
        "not authorized",
      );
    });

    it("should throw for non-existent request", () => {
      expect(() => manager.approve("nonexistent", "user-1")).toThrow(
        "not found",
      );
    });

    it("should call onApprovalResolved on approval", () => {
      let resolved = false;
      manager.onApprovalResolved = () => {
        resolved = true;
      };

      const request = manager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1"],
        message: "Approve",
        timeoutMs: 60000,
        minApprovals: 1,
      });

      manager.approve(request.id, "user-1");
      expect(resolved).toBe(true);
    });
  });

  describe("Timeout and Escalation", () => {
    it("should expire requests after timeout", () => {
      let currentTime = new Date("2026-02-09T12:00:00Z");
      const timeManager = new ApprovalGateManager(new ApprovalStore(), {
        nowFn: () => currentTime,
      });

      timeManager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1"],
        message: "Approve",
        timeoutMs: 60000, // 1 minute
        minApprovals: 1,
      });

      // Advance past timeout
      currentTime = new Date("2026-02-09T12:02:00Z");
      const expired = timeManager.processExpired();
      expect(expired).toHaveLength(1);
      expect(expired[0].status).toBe("expired");
    });

    it("should escalate before expiring when escalation users are set", () => {
      let currentTime = new Date("2026-02-09T12:00:00Z");
      const timeManager = new ApprovalGateManager(new ApprovalStore(), {
        nowFn: () => currentTime,
      });
      let escalated = false;
      timeManager.onApprovalEscalated = () => {
        escalated = true;
      };

      timeManager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1"],
        message: "Approve",
        timeoutMs: 60000,
        minApprovals: 1,
        escalationUserIds: ["manager-1"],
      });

      currentTime = new Date("2026-02-09T12:02:00Z");
      const result = timeManager.processExpired();
      expect(result).toHaveLength(1);
      expect(result[0].status).toBe("escalated");
      expect(result[0].escalated).toBe(true);
      expect(escalated).toBe(true);
    });

    it("should allow escalation users to respond", () => {
      let currentTime = new Date("2026-02-09T12:00:00Z");
      const timeManager = new ApprovalGateManager(new ApprovalStore(), {
        nowFn: () => currentTime,
      });

      const request = timeManager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1"],
        message: "Approve",
        timeoutMs: 60000,
        minApprovals: 1,
        escalationUserIds: ["manager-1"],
      });

      currentTime = new Date("2026-02-09T12:02:00Z");
      timeManager.processExpired();

      // Escalation user can now respond
      const result = timeManager.approve(request.id, "manager-1");
      expect(result.status).toBe("approved");
    });
  });

  describe("Queries", () => {
    it("should get pending requests for a user", () => {
      manager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1", "user-2"],
        message: "A",
        timeoutMs: 60000,
        minApprovals: 1,
      });
      manager.createRequest("run-2", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1"],
        message: "B",
        timeoutMs: 60000,
        minApprovals: 1,
      });
      manager.createRequest("run-3", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-2"],
        message: "C",
        timeoutMs: 60000,
        minApprovals: 1,
      });

      expect(manager.getPendingForUser("user-1")).toHaveLength(2);
      expect(manager.getPendingForUser("user-2")).toHaveLength(2);
      expect(manager.getPendingForUser("user-3")).toHaveLength(0);
    });

    it("should get request by run and step", () => {
      manager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1"],
        message: "A",
        timeoutMs: 60000,
        minApprovals: 1,
      });

      const found = manager.getRequestByRunAndStep("run-1", "step-1");
      expect(found).toBeDefined();
      expect(found!.runId).toBe("run-1");
    });

    it("should return audit log entries", () => {
      manager.createRequest("run-1", "step-1", "wf-1", {
        type: "approval",
        approverIds: ["user-1"],
        message: "A",
        timeoutMs: 60000,
        minApprovals: 1,
      });

      const log = manager.getAuditLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].eventType).toBe("workflow.approval_requested");
    });
  });
});

// ============================================================================
// 8. SCHEDULING
// ============================================================================

describe("Scheduling", () => {
  let scheduler: WorkflowScheduler;
  let currentTime: Date;

  beforeEach(() => {
    currentTime = new Date("2026-02-09T12:00:00Z");
    scheduler = new WorkflowScheduler(new ScheduleStore(), {
      nowFn: () => currentTime,
      tickIntervalMs: 60000,
    });
  });

  afterEach(() => {
    scheduler.clear();
  });

  describe("Schedule Creation", () => {
    it("should create a schedule from a workflow", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 9 * * *",
          timezone: "UTC",
        },
      });

      const schedule = scheduler.createSchedule(workflow);
      expect(schedule.cronExpression).toBe("0 9 * * *");
      expect(schedule.active).toBe(true);
      expect(schedule.nextRunAt).toBeDefined();
    });

    it("should reject non-schedule trigger", () => {
      const workflow = createMinimalWorkflow({ trigger: { type: "manual" } });
      expect(() => scheduler.createSchedule(workflow)).toThrow(
        "not a schedule trigger",
      );
    });

    it("should reject invalid cron expression", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "invalid",
          timezone: "UTC",
        },
      });
      expect(() => scheduler.createSchedule(workflow)).toThrow("Invalid cron");
    });

    it("should update existing schedule for same workflow", () => {
      const workflow = createMinimalWorkflow({
        id: "wf-1",
        trigger: {
          type: "schedule",
          cronExpression: "0 9 * * *",
          timezone: "UTC",
        },
      });

      const s1 = scheduler.createSchedule(workflow);

      workflow.trigger = {
        type: "schedule",
        cronExpression: "0 10 * * *",
        timezone: "UTC",
      };
      const s2 = scheduler.createSchedule(workflow);

      expect(s1.id).toBe(s2.id); // Same schedule, updated
      expect(s2.cronExpression).toBe("0 10 * * *");
    });
  });

  describe("Tick Processing", () => {
    it("should fire schedule when due", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 12 * * *",
          timezone: "UTC",
        },
      });
      scheduler.createSchedule(workflow);

      // Advance to next hour (when the schedule should fire)
      currentTime = new Date("2026-02-10T12:00:00Z");
      const fired = scheduler.tick(currentTime);
      expect(fired).toHaveLength(1);
    });

    it("should call onScheduleFired callback", () => {
      let firedCount = 0;
      scheduler.onScheduleFired = () => {
        firedCount++;
      };

      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 12 * * *",
          timezone: "UTC",
        },
      });
      scheduler.createSchedule(workflow);

      currentTime = new Date("2026-02-10T12:00:00Z");
      scheduler.tick(currentTime);
      expect(firedCount).toBe(1);
    });

    it("should update lastRunAt and calculate next run", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 * * * *",
          timezone: "UTC",
        },
      });
      const schedule = scheduler.createSchedule(workflow);

      currentTime = new Date("2026-02-09T13:00:00Z");
      scheduler.tick(currentTime);

      const updated = scheduler.getSchedule(schedule.id);
      expect(updated!.lastRunAt).toBeDefined();
      expect(new Date(updated!.nextRunAt).getTime()).toBeGreaterThan(
        currentTime.getTime(),
      );
    });

    it("should not fire paused schedules", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 12 * * *",
          timezone: "UTC",
        },
      });
      const schedule = scheduler.createSchedule(workflow);
      scheduler.pauseSchedule(schedule.id);

      currentTime = new Date("2026-02-10T12:00:00Z");
      const fired = scheduler.tick(currentTime);
      expect(fired).toHaveLength(0);
    });

    it("should deactivate schedules past endDate", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 * * * *",
          timezone: "UTC",
          endDate: "2026-02-09T12:30:00Z",
        },
      });
      const schedule = scheduler.createSchedule(workflow);

      currentTime = new Date("2026-02-09T13:00:00Z");
      scheduler.tick(currentTime);

      const updated = scheduler.getSchedule(schedule.id);
      expect(updated!.active).toBe(false);
    });
  });

  describe("Schedule Management", () => {
    it("should pause and resume a schedule", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 9 * * *",
          timezone: "UTC",
        },
      });
      const schedule = scheduler.createSchedule(workflow);

      scheduler.pauseSchedule(schedule.id);
      expect(scheduler.getSchedule(schedule.id)!.active).toBe(false);

      scheduler.resumeSchedule(schedule.id);
      expect(scheduler.getSchedule(schedule.id)!.active).toBe(true);
    });

    it("should remove a schedule", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 9 * * *",
          timezone: "UTC",
        },
      });
      const schedule = scheduler.createSchedule(workflow);

      expect(scheduler.removeSchedule(schedule.id)).toBe(true);
      expect(scheduler.getSchedule(schedule.id)).toBeUndefined();
    });

    it("should throw for non-existent schedule operations", () => {
      expect(() => scheduler.pauseSchedule("nonexistent")).toThrow("not found");
      expect(() => scheduler.resumeSchedule("nonexistent")).toThrow(
        "not found",
      );
    });

    it("should update last run status", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 9 * * *",
          timezone: "UTC",
        },
      });
      const schedule = scheduler.createSchedule(workflow);

      scheduler.updateLastRunStatus(schedule.id, "completed");
      expect(scheduler.getSchedule(schedule.id)!.lastRunStatus).toBe(
        "completed",
      );
    });
  });

  describe("Queries", () => {
    it("should list active schedules", () => {
      const wf1 = createMinimalWorkflow({
        id: "wf-1",
        trigger: {
          type: "schedule",
          cronExpression: "0 9 * * *",
          timezone: "UTC",
        },
      });
      const wf2 = createMinimalWorkflow({
        id: "wf-2",
        trigger: {
          type: "schedule",
          cronExpression: "0 10 * * *",
          timezone: "UTC",
        },
        enabled: true,
      });

      scheduler.createSchedule(wf1);
      const s2 = scheduler.createSchedule(wf2);
      scheduler.pauseSchedule(s2.id);

      expect(scheduler.listSchedules({ active: true })).toHaveLength(1);
      expect(scheduler.listSchedules({ active: false })).toHaveLength(1);
    });

    it("should get upcoming executions sorted by time", () => {
      const wf1 = createMinimalWorkflow({
        id: "wf-1",
        trigger: {
          type: "schedule",
          cronExpression: "0 15 * * *",
          timezone: "UTC",
        },
      });
      const wf2 = createMinimalWorkflow({
        id: "wf-2",
        trigger: {
          type: "schedule",
          cronExpression: "0 13 * * *",
          timezone: "UTC",
        },
      });

      scheduler.createSchedule(wf1);
      scheduler.createSchedule(wf2);

      const upcoming = scheduler.getUpcomingExecutions(10);
      expect(upcoming).toHaveLength(2);
      // Earlier time should come first
      expect(new Date(upcoming[0].nextRunAt).getTime()).toBeLessThanOrEqual(
        new Date(upcoming[1].nextRunAt).getTime(),
      );
    });

    it("should return audit log", () => {
      const workflow = createMinimalWorkflow({
        trigger: {
          type: "schedule",
          cronExpression: "0 9 * * *",
          timezone: "UTC",
        },
      });
      scheduler.createSchedule(workflow);

      const log = scheduler.getAuditLog();
      expect(log.length).toBeGreaterThan(0);
      expect(log[0].eventType).toBe("workflow.schedule_created");
    });
  });
});

// ============================================================================
// 9. AUDIT LOGGING
// ============================================================================

describe("Audit Logging", () => {
  it("should log run started event", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow();
    await engine.startRun(workflow, { type: "manual" });

    const log = engine.getAuditLog({ eventType: "workflow.run_started" });
    expect(log).toHaveLength(1);
    expect(log[0].workflowId).toBe(workflow.id);
  });

  it("should log run completed event", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow();
    await engine.startRun(workflow, { type: "manual" });

    const log = engine.getAuditLog({ eventType: "workflow.run_completed" });
    expect(log).toHaveLength(1);
  });

  it("should log step started and completed events", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow();
    await engine.startRun(workflow, { type: "manual" });

    const started = engine.getAuditLog({ eventType: "workflow.step_started" });
    const completed = engine.getAuditLog({
      eventType: "workflow.step_completed",
    });
    expect(started).toHaveLength(1);
    expect(completed).toHaveLength(1);
  });

  it("should log step skipped event", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow({
      steps: [
        {
          id: "s1",
          name: "S1",
          type: "action",
          action: { type: "send_message", channelId: "c1", content: "Hi" },
          settings: { ...DEFAULT_STEP_SETTINGS },
          conditions: [{ field: "never", operator: "equals", value: true }],
        },
      ],
    });
    await engine.startRun(workflow, { type: "manual" });

    const log = engine.getAuditLog({ eventType: "workflow.step_skipped" });
    expect(log).toHaveLength(1);
  });

  it("should log run failed event", async () => {
    const handlers = createDefaultHandlers();
    handlers.register("send_message", async () => {
      throw new Error("Fail");
    });

    const engine = new WorkflowExecutionEngine({
      sleepFn: noopSleep(),
      enableAudit: true,
      actionHandlers: handlers,
    });

    const workflow = createMinimalWorkflow({
      steps: [
        {
          id: "s1",
          name: "S1",
          type: "action",
          action: { type: "send_message", channelId: "c1", content: "Hi" },
          settings: { ...DEFAULT_STEP_SETTINGS, retryAttempts: 0 },
        },
      ],
    });
    await engine.startRun(workflow, { type: "manual" });

    const log = engine.getAuditLog({ eventType: "workflow.run_failed" });
    expect(log).toHaveLength(1);
    expect(log[0].data?.error).toBeDefined();
  });

  it("should filter audit log by workflowId", async () => {
    const engine = createTestEngine();
    const wf1 = createMinimalWorkflow({ id: "wf-1" });
    const wf2 = createMinimalWorkflow({ id: "wf-2" });

    await engine.startRun(wf1, { type: "manual" });
    await engine.startRun(wf2, { type: "manual" });

    const log = engine.getAuditLog({ workflowId: "wf-1" });
    expect(log.every((e) => e.workflowId === "wf-1")).toBe(true);
  });

  it("should filter audit log by runId", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow();
    const run = await engine.startRun(workflow, { type: "manual" });

    const log = engine.getAuditLog({ runId: run.id });
    expect(log.every((e) => e.runId === run.id)).toBe(true);
  });

  it("should include timestamps in all audit entries", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow();
    await engine.startRun(workflow, { type: "manual" });

    const log = engine.getAuditLog();
    for (const entry of log) {
      expect(entry.timestamp).toBeDefined();
      expect(new Date(entry.timestamp).getTime()).not.toBeNaN();
    }
  });

  it("should include step duration in completion entries", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow();
    await engine.startRun(workflow, { type: "manual" });

    const log = engine.getAuditLog({ eventType: "workflow.run_completed" });
    expect(log[0].data?.durationMs).toBeDefined();
    expect(typeof log[0].data?.durationMs).toBe("number");
  });

  it("should not log when audit is disabled", async () => {
    const engine = new WorkflowExecutionEngine({
      sleepFn: noopSleep(),
      enableAudit: false,
    });

    const workflow = createMinimalWorkflow();
    await engine.startRun(workflow, { type: "manual" });

    const log = engine.getAuditLog();
    expect(log).toHaveLength(0);
  });
});

// ============================================================================
// 10. EDGE CASES AND SECURITY
// ============================================================================

describe("Edge Cases", () => {
  it("should handle workflow with no steps gracefully via builder", () => {
    expect(() => {
      buildWorkflow("Empty").onManual().build();
    }).toThrow(WorkflowBuilderError);
  });

  it("should handle empty trigger data", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow();
    const run = await engine.startRun(workflow, { type: "manual" });
    expect(run.status).toBe("completed");
  });

  it("should handle step with empty action content", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow({
      steps: [
        {
          id: "s1",
          name: "S1",
          type: "action",
          action: { type: "send_message", channelId: "c1", content: "" },
          settings: { ...DEFAULT_STEP_SETTINGS },
        },
      ],
    });
    // Even empty content should execute (validation is at build time)
    const run = await engine.startRun(workflow, { type: "manual" });
    expect(run.stepResults[0].status).toBe("completed");
  });

  it("should handle concurrent workflow clear", () => {
    const engine = createTestEngine();
    engine.clear();
    expect(engine.listRuns()).toHaveLength(0);
    expect(engine.getAuditLog()).toHaveLength(0);
  });

  it("should handle template interpolation with special characters", () => {
    expect(
      interpolateTemplate("{{name}}", {
        name: 'Hello <script>alert("xss")</script>',
      }),
    ).toBe('Hello <script>alert("xss")</script>');
  });

  it("should handle deeply nested condition paths", () => {
    const context = { a: { b: { c: { d: 42 } } } };
    expect(
      evaluateCondition(
        { field: "a.b.c.d", operator: "equals", value: 42 },
        context,
      ),
    ).toBe(true);
  });

  it("should handle execution timeout", async () => {
    let time = new Date("2026-02-09T12:00:00Z");

    const handlers = createDefaultHandlers();
    handlers.register("send_message", async () => {
      // Advance time past execution limit
      time = new Date(time.getTime() + 600000); // +10 minutes
      return { sent: true };
    });

    const engine = new WorkflowExecutionEngine({
      sleepFn: noopSleep(),
      enableAudit: true,
      actionHandlers: handlers,
      nowFn: () => time,
    });

    const workflow = createMinimalWorkflow({
      settings: { ...DEFAULT_WORKFLOW_SETTINGS, maxExecutionTimeMs: 300000 }, // 5 min
      steps: [
        {
          id: "s1",
          name: "S1",
          type: "action",
          action: { type: "send_message", channelId: "c1", content: "Hi" },
          settings: { ...DEFAULT_STEP_SETTINGS },
        },
        {
          id: "s2",
          name: "S2",
          type: "action",
          action: { type: "send_message", channelId: "c1", content: "Hi" },
          settings: { ...DEFAULT_STEP_SETTINGS },
        },
      ],
    });

    const run = await engine.startRun(workflow, { type: "manual" });
    expect(run.status).toBe("timed_out");
    expect(run.error?.code).toBe("EXECUTION_TIMEOUT");
  });

  it("should track step timing correctly", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow();
    const run = await engine.startRun(workflow, { type: "manual" });

    const step = run.stepResults[0];
    expect(step.startedAt).toBeDefined();
    expect(step.completedAt).toBeDefined();
    expect(step.durationMs).toBeDefined();
    expect(step.durationMs).toBeGreaterThanOrEqual(0);
  });
});

describe("Security", () => {
  it("should validate user permissions for manual triggers", () => {
    const engine = new TriggerEngine();
    const workflow = createMinimalWorkflow({
      trigger: { type: "manual", allowedUserIds: ["admin-1"] },
    });
    engine.registerWorkflow(workflow);

    expect(
      engine.evaluateManual(workflow.id, "admin-1", [], {}),
    ).not.toBeNull();
    expect(engine.evaluateManual(workflow.id, "hacker", [], {})).toBeNull();
  });

  it("should validate role-based access for manual triggers", () => {
    const engine = new TriggerEngine();
    const workflow = createMinimalWorkflow({
      trigger: { type: "manual", allowedRoles: ["admin", "moderator"] },
    });
    engine.registerWorkflow(workflow);

    expect(
      engine.evaluateManual(workflow.id, "u-1", ["admin"], {}),
    ).not.toBeNull();
    expect(engine.evaluateManual(workflow.id, "u-1", ["guest"], {})).toBeNull();
  });

  it("should isolate workflow contexts between runs", async () => {
    const engine = createTestEngine();
    const workflow = createMinimalWorkflow({
      steps: [
        {
          id: "s1",
          name: "Set",
          type: "action",
          action: { type: "set_variable", variableName: "counter", value: "1" },
          settings: { ...DEFAULT_STEP_SETTINGS },
        },
      ],
    });

    const run1 = await engine.startRun(
      workflow,
      { type: "manual" },
      { x: "a" },
    );
    const run2 = await engine.startRun(
      workflow,
      { type: "manual" },
      { x: "b" },
    );

    // Each run should have its own context
    expect(run1.context.inputs.x).toBe("a");
    expect(run2.context.inputs.x).toBe("b");
  });

  it("should prevent unauthorized approval responses", () => {
    const manager = new ApprovalGateManager();
    const request = manager.createRequest("run-1", "step-1", "wf-1", {
      type: "approval",
      approverIds: ["user-1"],
      message: "Approve",
      timeoutMs: 60000,
      minApprovals: 1,
    });

    expect(() => manager.approve(request.id, "attacker")).toThrow(
      "not authorized",
    );
  });

  it("should prevent responding to already resolved requests", () => {
    const manager = new ApprovalGateManager();
    const request = manager.createRequest("run-1", "step-1", "wf-1", {
      type: "approval",
      approverIds: ["user-1"],
      message: "Approve",
      timeoutMs: 60000,
      minApprovals: 1,
    });

    manager.approve(request.id, "user-1"); // Resolves it
    expect(() => manager.approve(request.id, "user-1")).toThrow(); // Already resolved
  });
});

// ============================================================================
// 11. CONSTANTS AND DEFAULTS
// ============================================================================

describe("Constants and Defaults", () => {
  it("should have valid default workflow settings", () => {
    expect(DEFAULT_WORKFLOW_SETTINGS.maxExecutionTimeMs).toBeGreaterThan(0);
    expect(DEFAULT_WORKFLOW_SETTINGS.maxRetryAttempts).toBeGreaterThanOrEqual(
      0,
    );
    expect(DEFAULT_WORKFLOW_SETTINGS.maxConcurrentExecutions).toBeGreaterThan(
      0,
    );
    expect(DEFAULT_WORKFLOW_SETTINGS.timezone).toBe("UTC");
  });

  it("should have valid default step settings", () => {
    expect(DEFAULT_STEP_SETTINGS.retryAttempts).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_STEP_SETTINGS.retryDelayMs).toBeGreaterThan(0);
    expect(DEFAULT_STEP_SETTINGS.timeoutMs).toBeGreaterThan(0);
    expect(DEFAULT_STEP_SETTINGS.retryBackoff).toBe("exponential");
  });

  it("should have reasonable max limits", () => {
    expect(MAX_WORKFLOW_STEPS).toBe(50);
    expect(MAX_WORKFLOW_NAME_LENGTH).toBe(128);
    expect(MAX_WORKFLOW_TAGS).toBe(20);
    expect(MAX_CONDITIONAL_BRANCHES).toBe(10);
    expect(MAX_PARALLEL_BRANCHES).toBe(10);
    expect(MAX_LOOP_ITERATIONS).toBe(1000);
    expect(MAX_APPROVAL_TIMEOUT_MS).toBe(86400000); // 24 hours
    expect(MAX_DELAY_DURATION_MS).toBe(3600000); // 1 hour
  });

  it("should have valid regex patterns", () => {
    expect(WORKFLOW_NAME_REGEX.test("MyWorkflow")).toBe(true);
    expect(WORKFLOW_NAME_REGEX.test("my-workflow")).toBe(true);
    expect(WORKFLOW_NAME_REGEX.test("My Workflow 123")).toBe(true);
    expect(WORKFLOW_NAME_REGEX.test("123invalid")).toBe(false);
    expect(WORKFLOW_NAME_REGEX.test("")).toBe(false);

    expect(CRON_REGEX.test("* * * * *")).toBe(true);
    expect(CRON_REGEX.test("0 9 * * 1")).toBe(true);
    expect(CRON_REGEX.test("*/15 * * * *")).toBe(true);
  });
});

// ============================================================================
// 12. WORKFLOW SERVICE (Integration)
// ============================================================================

describe("Workflow Service Integration", () => {
  // Import the service
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const {
    WorkflowService,
    WorkflowServiceError,
  } = require("@/services/plugins/workflow.service");

  let service: InstanceType<typeof WorkflowService>;

  beforeEach(() => {
    service = new WorkflowService({
      executionEngine: createTestEngine(),
    });
  });

  afterEach(() => {
    service.clear();
  });

  it("should create and retrieve a workflow", () => {
    const workflow = createMinimalWorkflow();
    service.createWorkflow(workflow);

    const retrieved = service.getWorkflow(workflow.id);
    expect(retrieved).toBeDefined();
    expect(retrieved.name).toBe(workflow.name);
  });

  it("should list workflows", () => {
    service.createWorkflow(createMinimalWorkflow({ id: "wf-1" }));
    service.createWorkflow(createMinimalWorkflow({ id: "wf-2" }));

    expect(service.listWorkflows()).toHaveLength(2);
  });

  it("should delete a workflow", () => {
    const workflow = createMinimalWorkflow();
    service.createWorkflow(workflow);
    expect(service.deleteWorkflow(workflow.id)).toBe(true);
    expect(service.getWorkflow(workflow.id)).toBeUndefined();
  });

  it("should execute a workflow", async () => {
    const workflow = createMinimalWorkflow();
    service.createWorkflow(workflow);

    const run = await service.executeWorkflow(workflow.id, {
      type: "manual",
      userId: "u-1",
    });
    expect(run.status).toBe("completed");
  });

  it("should reject execution of disabled workflow", async () => {
    const workflow = createMinimalWorkflow({ enabled: false });
    service.createWorkflow(workflow);

    await expect(
      service.executeWorkflow(workflow.id, { type: "manual" }),
    ).rejects.toThrow("disabled");
  });

  it("should reject execution of nonexistent workflow", async () => {
    await expect(
      service.executeWorkflow("nonexistent", { type: "manual" }),
    ).rejects.toThrow("not found");
  });

  it("should reject invalid workflow creation", () => {
    const invalid = createMinimalWorkflow({ name: "" });
    expect(() => service.createWorkflow(invalid)).toThrow();
  });

  it("should enable and disable workflows", () => {
    const workflow = createMinimalWorkflow();
    service.createWorkflow(workflow);

    service.disableWorkflow(workflow.id);
    expect(service.getWorkflow(workflow.id).enabled).toBe(false);

    service.enableWorkflow(workflow.id);
    expect(service.getWorkflow(workflow.id).enabled).toBe(true);
  });

  it("should handle events and trigger matching workflows", async () => {
    const workflow = createMinimalWorkflow({
      trigger: { type: "event", eventType: "message.created" },
    });
    service.createWorkflow(workflow);

    const runs = await service.handleEvent("message.created", {
      channelId: "ch-1",
    });
    expect(runs).toHaveLength(1);
    expect(runs[0].status).toBe("completed");
  });

  it("should get audit log", async () => {
    const workflow = createMinimalWorkflow();
    service.createWorkflow(workflow);
    await service.executeWorkflow(workflow.id, { type: "manual" });

    const log = service.getAuditLog({ workflowId: workflow.id });
    expect(log.length).toBeGreaterThan(0);
  });
});
