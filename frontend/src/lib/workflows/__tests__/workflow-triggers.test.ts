/**
 * Unit tests for workflow-triggers.
 */
import {
  triggerTemplates,
  createTriggerStep,
  validateTriggerConfig,
  validateScheduleConfig,
  validateCronExpression,
  matchTriggerFilters,
  shouldTriggerFire,
  createMessageTriggerEvent,
  createMemberJoinEvent,
  createScheduledTriggerEvent,
  createWebhookTriggerEvent,
  createManualTriggerEvent,
  describeCronExpression,
  getNextCronRun,
} from "../workflow-triggers";
import type { TriggerFilter, WorkflowContext } from "../workflow-types";

describe("triggerTemplates", () => {
  it("has all trigger types", () => {
    const keys = Object.keys(triggerTemplates);
    expect(keys).toContain("message_received");
    expect(keys).toContain("scheduled");
    expect(keys).toContain("webhook");
    expect(keys).toContain("keyword");
    expect(keys).toContain("mention");
    expect(keys).toContain("slash_command");
  });
});

describe("createTriggerStep", () => {
  it("builds from template", () => {
    const s = createTriggerStep("message_received");
    expect(s.type).toBe("trigger");
    expect(s.config.triggerType).toBe("message_received");
  });
  it("accepts overrides", () => {
    const s = createTriggerStep("keyword", { name: "Custom" });
    expect(s.name).toBe("Custom");
  });
  it("unique ids", () => {
    expect(createTriggerStep("manual").id).not.toBe(
      createTriggerStep("manual").id,
    );
  });
});

describe("validateTriggerConfig", () => {
  it("keyword missing", () => {
    expect(
      validateTriggerConfig({ triggerType: "keyword", keyword: "" } as any),
    ).toEqual(["Keyword is required"]);
  });
  it("keyword whitespace only", () => {
    expect(
      validateTriggerConfig({ triggerType: "keyword", keyword: "  " } as any),
    ).toHaveLength(1);
  });
  it("keyword valid", () => {
    expect(
      validateTriggerConfig({
        triggerType: "keyword",
        keyword: "deploy",
      } as any),
    ).toEqual([]);
  });
  it("scheduled missing", () => {
    expect(validateTriggerConfig({ triggerType: "scheduled" } as any)).toEqual([
      "Schedule configuration is required",
    ]);
  });
  it("slash_command missing leading /", () => {
    expect(
      validateTriggerConfig({
        triggerType: "slash_command",
        slashCommand: "foo",
      } as any),
    ).toEqual(["Slash command must start with /"]);
  });
  it("slash_command valid", () => {
    expect(
      validateTriggerConfig({
        triggerType: "slash_command",
        slashCommand: "/foo",
      } as any),
    ).toEqual([]);
  });
  it("other types pass", () => {
    expect(validateTriggerConfig({ triggerType: "webhook" } as any)).toEqual(
      [],
    );
  });
});

describe("validateScheduleConfig", () => {
  it("once missing datetime", () => {
    expect(validateScheduleConfig({ type: "once" } as any)).toEqual([
      "Datetime is required for one-time schedules",
    ]);
  });
  it("once bad datetime", () => {
    expect(
      validateScheduleConfig({ type: "once", datetime: "garbage" } as any),
    ).toEqual(["Invalid datetime format"]);
  });
  it("once past datetime", () => {
    const past = new Date(Date.now() - 86400000).toISOString();
    expect(
      validateScheduleConfig({ type: "once", datetime: past } as any),
    ).toEqual(["Scheduled time must be in the future"]);
  });
  it("once future datetime", () => {
    const future = new Date(Date.now() + 86400000).toISOString();
    expect(
      validateScheduleConfig({ type: "once", datetime: future } as any),
    ).toEqual([]);
  });
  it("recurring missing cron", () => {
    expect(validateScheduleConfig({ type: "recurring" } as any)).toEqual([
      "Cron expression is required for recurring schedules",
    ]);
  });
  it("recurring valid cron", () => {
    expect(
      validateScheduleConfig({ type: "recurring", cron: "0 9 * * 1-5" } as any),
    ).toEqual([]);
  });
});

describe("validateCronExpression", () => {
  it("rejects wrong parts", () => {
    expect(validateCronExpression("1 2 3")).toEqual([
      "Cron expression must have 5 or 6 parts",
    ]);
  });
  it("accepts 5-part", () => {
    expect(validateCronExpression("0 9 * * 1-5")).toEqual([]);
  });
  it("accepts 6-part", () => {
    expect(validateCronExpression("0 0 9 * * 1-5")).toEqual([]);
  });
  it("rejects out-of-range", () => {
    expect(validateCronExpression("99 9 * * *").length).toBeGreaterThan(0);
    expect(validateCronExpression("0 25 * * *").length).toBeGreaterThan(0);
  });
  it("handles range", () => {
    expect(validateCronExpression("0 9-17 * * *")).toEqual([]);
    expect(validateCronExpression("0 9-99 * * *").length).toBeGreaterThan(0);
  });
  it("handles step syntax", () => {
    expect(validateCronExpression("*/15 * * * *")).toEqual([]);
    expect(validateCronExpression("*/abc * * * *").length).toBeGreaterThan(0);
  });
  it("accepts named day/month values", () => {
    expect(validateCronExpression("0 9 * JAN MON")).toEqual([]);
  });
  it("rejects bogus minute/hour values", () => {
    expect(validateCronExpression("abc * * * *").length).toBeGreaterThan(0);
  });
});

describe("matchTriggerFilters", () => {
  const ctx: WorkflowContext = {
    message: { content: "hello deploy" },
    user: { id: "u1" },
  } as any;
  it("no filters matches", () => {
    expect(matchTriggerFilters([], ctx)).toBe(true);
  });
  it("equals match", () => {
    const f: TriggerFilter = {
      field: "user.id",
      operator: "equals",
      value: "u1",
    } as any;
    expect(matchTriggerFilters([f], ctx)).toBe(true);
  });
  it("not_equals", () => {
    const f: TriggerFilter = {
      field: "user.id",
      operator: "not_equals",
      value: "u2",
    } as any;
    expect(matchTriggerFilters([f], ctx)).toBe(true);
  });
  it("contains + startsWith + endsWith", () => {
    const c1: TriggerFilter = {
      field: "message.content",
      operator: "contains",
      value: "dep",
    } as any;
    const c2: TriggerFilter = {
      field: "message.content",
      operator: "startsWith",
      value: "HE",
    } as any;
    const c3: TriggerFilter = {
      field: "message.content",
      operator: "endsWith",
      value: "OY",
    } as any;
    expect(matchTriggerFilters([c1], ctx)).toBe(true);
    expect(matchTriggerFilters([c2], ctx)).toBe(true);
    expect(matchTriggerFilters([c3], ctx)).toBe(true);
  });
  it("matches regex", () => {
    const f: TriggerFilter = {
      field: "message.content",
      operator: "matches",
      value: "^hello",
    } as any;
    expect(matchTriggerFilters([f], ctx)).toBe(true);
  });
  it("invalid regex → false", () => {
    const f: TriggerFilter = {
      field: "message.content",
      operator: "matches",
      value: "[",
    } as any;
    expect(matchTriggerFilters([f], ctx)).toBe(false);
  });
  it("missing field → false", () => {
    const f: TriggerFilter = {
      field: "nope.x",
      operator: "equals",
      value: "x",
    } as any;
    expect(matchTriggerFilters([f], ctx)).toBe(false);
  });
  it("unknown operator → false", () => {
    const f: TriggerFilter = {
      field: "user.id",
      operator: "bogus" as any,
      value: "u1",
    } as any;
    expect(matchTriggerFilters([f], ctx)).toBe(false);
  });
});

describe("shouldTriggerFire", () => {
  const base = (overrides: any = {}) =>
    ({
      id: "t1",
      type: "trigger",
      name: "x",
      description: "x",
      position: { x: 0, y: 0 },
      config: { triggerType: "message_received", ...overrides.config },
      metadata: {},
      ...overrides,
    }) as any;

  it("triggerType mismatch", () => {
    expect(
      shouldTriggerFire(base({ config: { triggerType: "manual" } }), {
        id: "e",
        type: "webhook",
        timestamp: "",
      } as any),
    ).toBe(false);
  });
  it("channel mismatch", () => {
    expect(
      shouldTriggerFire(
        base({ config: { triggerType: "message_received", channelId: "c1" } }),
        {
          id: "e",
          type: "message_received",
          timestamp: "",
          channelId: "c2",
        } as any,
      ),
    ).toBe(false);
  });
  it("user mismatch", () => {
    expect(
      shouldTriggerFire(
        base({ config: { triggerType: "message_received", userId: "u1" } }),
        {
          id: "e",
          type: "message_received",
          timestamp: "",
          userId: "u2",
        } as any,
      ),
    ).toBe(false);
  });
  it("keyword match / miss", () => {
    const t = base({ config: { triggerType: "keyword", keyword: "DEPLOY" } });
    expect(
      shouldTriggerFire(t, {
        id: "e",
        type: "keyword",
        timestamp: "",
        data: { content: "please deploy" },
      } as any),
    ).toBe(true);
    expect(
      shouldTriggerFire(t, {
        id: "e",
        type: "keyword",
        timestamp: "",
        data: { content: "no" },
      } as any),
    ).toBe(false);
    expect(
      shouldTriggerFire(t, { id: "e", type: "keyword", timestamp: "" } as any),
    ).toBe(false);
  });
  it("slash_command", () => {
    const t = base({
      config: { triggerType: "slash_command", slashCommand: "/foo" },
    });
    expect(
      shouldTriggerFire(t, {
        id: "e",
        type: "slash_command",
        timestamp: "",
        data: { command: "/foo" },
      } as any),
    ).toBe(true);
    expect(
      shouldTriggerFire(t, {
        id: "e",
        type: "slash_command",
        timestamp: "",
        data: { command: "/bar" },
      } as any),
    ).toBe(false);
  });
  it("mention type", () => {
    const t = base({ config: { triggerType: "mention", mentionType: "user" } });
    expect(
      shouldTriggerFire(t, {
        id: "e",
        type: "mention",
        timestamp: "",
        data: { mentionType: "user" },
      } as any),
    ).toBe(true);
    expect(
      shouldTriggerFire(t, {
        id: "e",
        type: "mention",
        timestamp: "",
        data: { mentionType: "everyone" },
      } as any),
    ).toBe(false);
  });
  it("all good returns true", () => {
    const t = base({ config: { triggerType: "message_received" } });
    expect(
      shouldTriggerFire(t, {
        id: "e",
        type: "message_received",
        timestamp: "",
      } as any),
    ).toBe(true);
  });
});

describe("event factories", () => {
  it("message event", () => {
    const e = createMessageTriggerEvent("m1", "c1", "u1", "hi", { extra: 1 });
    expect(e.type).toBe("message_received");
    expect(e.messageId).toBe("m1");
    expect(e.data?.content).toBe("hi");
    expect(e.data?.extra).toBe(1);
  });
  it("member join event", () => {
    expect(createMemberJoinEvent("u1", "c1").type).toBe("member_joined");
  });
  it("scheduled event", () => {
    expect(
      createScheduledTriggerEvent("w1", {
        type: "recurring",
        cron: "* * * * *",
      } as any).type,
    ).toBe("scheduled");
  });
  it("webhook event", () => {
    expect(
      createWebhookTriggerEvent({ a: 1 }, { h: "v" }).data?.payload,
    ).toEqual({ a: 1 });
  });
  it("manual event", () => {
    const e = createManualTriggerEvent("u1", "c1", { k: "v" });
    expect(e.type).toBe("manual");
    expect(e.userId).toBe("u1");
  });
});

describe("describeCronExpression", () => {
  it("invalid", () => {
    expect(describeCronExpression("1 2")).toBe("Invalid cron expression");
  });
  it("hourly", () => {
    expect(describeCronExpression("0 * * * *")).toContain("hour");
  });
  it("daily midnight", () => {
    expect(describeCronExpression("0 0 * * *")).toContain("midnight");
  });
  it("weekday 9am", () => {
    expect(describeCronExpression("0 9 * * 1-5")).toContain("weekday");
  });
  it("monday 9am", () => {
    expect(describeCronExpression("0 9 * * 1")).toContain("Monday");
  });
  it("generic", () => {
    expect(describeCronExpression("5 10 * * *")).toContain("minute 5");
  });
});

describe("getNextCronRun", () => {
  it("returns null for invalid", () => {
    expect(getNextCronRun("1 2 3")).toBe(null);
  });
  it("returns a Date", () => {
    expect(getNextCronRun("0 9 * * *")).toBeInstanceOf(Date);
  });
  it("rolls forward when past", () => {
    const now = new Date("2025-01-01T12:00:00Z");
    const next = getNextCronRun("0 0 * * *", now);
    expect(next).toBeInstanceOf(Date);
  });
  it("accepts wildcard", () => {
    expect(getNextCronRun("* * * * *")).toBeInstanceOf(Date);
  });
});
