/**
 * Unit tests for workflow-actions.
 */
import {
  actionTemplates,
  createActionStep,
  validateActionConfig,
  executeAction,
  actionCategories,
  getActionsByCategory,
  getActionTemplatesByCategory,
} from "../workflow-actions";
import type {
  ActionConfig,
  ActionStep,
  WorkflowContext,
} from "../workflow-types";

const mkCtx = (): WorkflowContext =>
  ({
    variables: {},
    user: { id: "u1" },
    channel: { id: "c1" },
  }) as any;

const mkAction = (config: any): ActionStep =>
  ({
    id: "a1",
    type: "action",
    name: "x",
    description: "",
    position: { x: 0, y: 0 },
    config,
    metadata: {},
  }) as any;

describe("actionTemplates", () => {
  it("has common actions", () => {
    expect(actionTemplates.set_variable).toBeDefined();
    expect(actionTemplates.notify).toBeDefined();
    expect(actionTemplates.add_reaction).toBeDefined();
    expect(actionTemplates.custom).toBeDefined();
  });
});

describe("createActionStep", () => {
  it("builds from template", () => {
    const s = createActionStep("set_variable");
    expect(s.type).toBe("action");
    expect(s.config.actionType).toBe("set_variable");
  });
  it("accepts overrides", () => {
    expect(createActionStep("set_variable", { name: "X" }).name).toBe("X");
  });
  it("unique ids", () => {
    expect(createActionStep("log").id).not.toBe(createActionStep("log").id);
  });
});

describe("validateActionConfig", () => {
  it("set_variable empty name", () => {
    expect(
      validateActionConfig({
        actionType: "set_variable",
        variableName: "",
      } as any).length,
    ).toBeGreaterThan(0);
  });
  it("set_variable bad name", () => {
    expect(
      validateActionConfig({
        actionType: "set_variable",
        variableName: "1bad",
      } as any).length,
    ).toBeGreaterThan(0);
  });
  it("set_variable valid", () => {
    expect(
      validateActionConfig({
        actionType: "set_variable",
        variableName: "good_name",
      } as any),
    ).toEqual([]);
  });
  it("add_reaction missing emoji", () => {
    expect(
      validateActionConfig({
        actionType: "add_reaction",
        reactionEmoji: "",
      } as any),
    ).toEqual(["Reaction emoji is required"]);
  });
  it("remove_reaction missing emoji", () => {
    expect(
      validateActionConfig({
        actionType: "remove_reaction",
        reactionEmoji: "",
      } as any),
    ).toEqual(["Reaction emoji is required"]);
  });
  it("set_topic missing channel", () => {
    expect(validateActionConfig({ actionType: "set_topic" } as any)).toEqual([
      "Target channel is required",
    ]);
  });
  it("set_topic too long", () => {
    const long = "x".repeat(251);
    expect(
      validateActionConfig({
        actionType: "set_topic",
        targetChannelId: "c",
        topic: long,
      } as any),
    ).toEqual(["Topic must be 250 characters or less"]);
  });
  it("create_channel invalid name", () => {
    expect(
      validateActionConfig({
        actionType: "create_channel",
        channelName: "Bad Name",
      } as any).length,
    ).toBeGreaterThan(0);
  });
  it("create_channel empty", () => {
    expect(
      validateActionConfig({
        actionType: "create_channel",
        channelName: "",
      } as any)[0],
    ).toMatch(/required/);
  });
  it("create_channel valid", () => {
    expect(
      validateActionConfig({
        actionType: "create_channel",
        channelName: "good-name",
      } as any),
    ).toEqual([]);
  });
  it("invite_user needs channel + users", () => {
    expect(
      validateActionConfig({ actionType: "invite_user" } as any).length,
    ).toBe(2);
    expect(
      validateActionConfig({
        actionType: "invite_user",
        targetChannelId: "c",
        inviteUserIds: ["u1"],
      } as any),
    ).toEqual([]);
  });
  it("remove_user needs both", () => {
    expect(
      validateActionConfig({ actionType: "remove_user" } as any).length,
    ).toBe(2);
  });
  it("log needs message", () => {
    expect(
      validateActionConfig({ actionType: "log", logMessage: "" } as any),
    ).toEqual(["Log message is required"]);
  });
  it("notify needs title + body", () => {
    expect(validateActionConfig({ actionType: "notify" } as any).length).toBe(
      2,
    );
  });
  it("custom needs name", () => {
    expect(
      validateActionConfig({ actionType: "custom", customAction: "" } as any),
    ).toEqual(["Custom action name is required"]);
  });
  it("other types pass", () => {
    expect(validateActionConfig({ actionType: "pin_message" } as any)).toEqual(
      [],
    );
  });
});

describe("executeAction — all branches", () => {
  it("set_variable success", async () => {
    const ctx = mkCtx();
    const res = await executeAction(
      mkAction({
        actionType: "set_variable",
        variableName: "foo",
        variableValue: "bar",
      }),
      ctx,
    );
    expect(res.success).toBe(true);
    expect(ctx.variables.foo).toBe("bar");
  });
  it("set_variable expands {{var}}", async () => {
    const ctx = mkCtx();
    ctx.variables.a = "X";
    const res = await executeAction(
      mkAction({
        actionType: "set_variable",
        variableName: "b",
        variableValue: "{{a}}",
      }),
      ctx,
    );
    expect(res.success).toBe(true);
    expect(ctx.variables.b).toBe("X");
  });
  it("set_variable expands nested {{user.id}}", async () => {
    const ctx = mkCtx();
    const res = await executeAction(
      mkAction({
        actionType: "set_variable",
        variableName: "who",
        variableValue: "{{user.id}}",
      }),
      ctx,
    );
    expect(ctx.variables.who).toBe("u1");
  });
  it("set_variable non-string value preserved", async () => {
    const ctx = mkCtx();
    await executeAction(
      mkAction({
        actionType: "set_variable",
        variableName: "n",
        variableValue: 42,
      }),
      ctx,
    );
    expect(ctx.variables.n).toBe(42);
  });
  it("set_variable missing name fails", async () => {
    const res = await executeAction(
      mkAction({ actionType: "set_variable" }),
      mkCtx(),
    );
    expect(res.success).toBe(false);
  });
  it("update_user success + missing", async () => {
    expect(
      (
        await executeAction(
          mkAction({ actionType: "update_user", targetUserId: "u2" }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (await executeAction(mkAction({ actionType: "update_user" }), mkCtx()))
        .success,
    ).toBe(false);
  });
  it("update_channel", async () => {
    expect(
      (
        await executeAction(
          mkAction({ actionType: "update_channel", targetChannelId: "c" }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (await executeAction(mkAction({ actionType: "update_channel" }), mkCtx()))
        .success,
    ).toBe(false);
  });
  it("add_reaction", async () => {
    expect(
      (
        await executeAction(
          mkAction({
            actionType: "add_reaction",
            targetMessageId: "m",
            reactionEmoji: "🎉",
          }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (await executeAction(mkAction({ actionType: "add_reaction" }), mkCtx()))
        .success,
    ).toBe(false);
  });
  it("remove_reaction", async () => {
    expect(
      (
        await executeAction(
          mkAction({
            actionType: "remove_reaction",
            targetMessageId: "m",
            reactionEmoji: "x",
          }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (
        await executeAction(
          mkAction({ actionType: "remove_reaction" }),
          mkCtx(),
        )
      ).success,
    ).toBe(false);
  });
  it("pin_message / unpin_message", async () => {
    expect(
      (
        await executeAction(
          mkAction({ actionType: "pin_message", targetMessageId: "m" }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (await executeAction(mkAction({ actionType: "pin_message" }), mkCtx()))
        .success,
    ).toBe(false);
    expect(
      (
        await executeAction(
          mkAction({ actionType: "unpin_message", targetMessageId: "m" }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (await executeAction(mkAction({ actionType: "unpin_message" }), mkCtx()))
        .success,
    ).toBe(false);
  });
  it("archive_channel", async () => {
    expect(
      (
        await executeAction(
          mkAction({ actionType: "archive_channel", targetChannelId: "c" }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (
        await executeAction(
          mkAction({ actionType: "archive_channel" }),
          mkCtx(),
        )
      ).success,
    ).toBe(false);
  });
  it("invite_user", async () => {
    expect(
      (
        await executeAction(
          mkAction({
            actionType: "invite_user",
            targetChannelId: "c",
            inviteUserIds: ["u1"],
          }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (
        await executeAction(
          mkAction({
            actionType: "invite_user",
            targetChannelId: "c",
            inviteUserIds: [],
          }),
          mkCtx(),
        )
      ).success,
    ).toBe(false);
  });
  it("remove_user", async () => {
    expect(
      (
        await executeAction(
          mkAction({
            actionType: "remove_user",
            targetChannelId: "c",
            targetUserId: "u1",
          }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (await executeAction(mkAction({ actionType: "remove_user" }), mkCtx()))
        .success,
    ).toBe(false);
  });
  it("set_topic", async () => {
    expect(
      (
        await executeAction(
          mkAction({
            actionType: "set_topic",
            targetChannelId: "c",
            topic: "hi",
          }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (await executeAction(mkAction({ actionType: "set_topic" }), mkCtx()))
        .success,
    ).toBe(false);
  });
  it("create_channel", async () => {
    expect(
      (
        await executeAction(
          mkAction({ actionType: "create_channel", channelName: "foo" }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (await executeAction(mkAction({ actionType: "create_channel" }), mkCtx()))
        .success,
    ).toBe(false);
  });
  it("log writes message", async () => {
    const res = await executeAction(
      mkAction({ actionType: "log", logLevel: "warn", logMessage: "Hi" }),
      mkCtx(),
    );
    expect(res.success).toBe(true);
    expect((res.output as any).level).toBe("warn");
  });
  it("log defaults level", async () => {
    const res = await executeAction(
      mkAction({ actionType: "log", logMessage: "x" }),
      mkCtx(),
    );
    expect((res.output as any).level).toBe("info");
  });
  it("notify", async () => {
    const res = await executeAction(
      mkAction({
        actionType: "notify",
        notificationTitle: "T",
        notificationBody: "B",
      }),
      mkCtx(),
    );
    expect(res.success).toBe(true);
  });
  it("custom", async () => {
    expect(
      (
        await executeAction(
          mkAction({
            actionType: "custom",
            customAction: "doit",
            customPayload: { a: 1 },
          }),
          mkCtx(),
        )
      ).success,
    ).toBe(true);
    expect(
      (await executeAction(mkAction({ actionType: "custom" }), mkCtx()))
        .success,
    ).toBe(false);
  });
  it("unknown action type", async () => {
    const res = await executeAction(
      mkAction({ actionType: "bogus" } as any),
      mkCtx(),
    );
    expect(res.success).toBe(false);
  });
  it("catches thrown errors", async () => {
    // Force an exception inside a handler by passing a bad context (variables = null)
    const ctx = { variables: null } as any;
    const res = await executeAction(
      mkAction({
        actionType: "set_variable",
        variableName: "x",
        variableValue: "y",
      }),
      ctx,
    );
    expect(res.success).toBe(false);
    expect(res.error).toBeDefined();
  });
});

describe("actionCategories / getActionsByCategory / getActionTemplatesByCategory", () => {
  it("categories has variables", () => {
    expect(actionCategories.some((c) => c.id === "variables")).toBe(true);
  });
  it("getActionsByCategory returns actions", () => {
    const list = getActionsByCategory("variables");
    expect(list).toContain("set_variable");
  });
  it("getActionsByCategory unknown returns empty", () => {
    expect(getActionsByCategory("nope")).toEqual([]);
  });
  it("getActionTemplatesByCategory returns full map keyed by category.name", () => {
    const m = getActionTemplatesByCategory();
    expect(Object.keys(m).length).toBeGreaterThan(0);
    const first = Object.values(m)[0];
    expect(Array.isArray(first)).toBe(true);
  });
});
