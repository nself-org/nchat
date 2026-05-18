/**
 * Unit tests for command-executor.
 */
import { executeCommand } from "../command-executor";
import {
  registerCommand,
  resetRegistry,
  initializeRegistry,
} from "../command-registry";
import type { SlashCommand } from "../command-types";

function makeCmd(overrides: Partial<SlashCommand> = {}): SlashCommand {
  return {
    id: "c",
    trigger: "t",
    name: "T",
    description: "",
    category: "custom",
    arguments: [],
    permissions: { minRole: "guest", allowGuests: true },
    channels: {
      allowedTypes: ["public", "private", "direct", "group"],
      allowInThreads: true,
    },
    responseConfig: { type: "message", ephemeral: false, showTyping: false },
    actionType: "message",
    action: { type: "message", message: "hello" },
    isEnabled: true,
    isBuiltIn: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: "test",
    ...overrides,
  } as SlashCommand;
}

function ctx(overrides: Record<string, unknown> = {}) {
  return {
    userId: "u1",
    username: "alice",
    displayName: "Alice",
    channelId: "ch1",
    channelName: "general",
    channelType: "public" as const,
    userRole: "member" as const,
    threadId: undefined,
    ...overrides,
  };
}

describe("executeCommand — input parsing + guards", () => {
  beforeEach(() => resetRegistry());

  it("rejects missing slash", async () => {
    const r = await executeCommand("hello", ctx());
    expect(r.success).toBe(false);
    expect(r.error).toContain("Invalid command format");
  });

  it("rejects unknown trigger", async () => {
    const r = await executeCommand("/nope", ctx());
    expect(r.success).toBe(false);
    expect(r.error).toContain("Unknown command");
  });

  it("rejects disabled commands", async () => {
    registerCommand(
      makeCmd({ id: "d", trigger: "disabled", isEnabled: false }),
    );
    const r = await executeCommand("/disabled", ctx());
    expect(r.success).toBe(false);
    expect(r.error).toContain("disabled");
  });

  it("permission check denies low-role user", async () => {
    registerCommand(
      makeCmd({
        id: "admin-cmd",
        trigger: "admincmd",
        permissions: { minRole: "admin", allowGuests: false },
      }),
    );
    const r = await executeCommand("/admincmd", ctx({ userRole: "member" }));
    expect(r.success).toBe(false);
    expect(r.error).toMatch(/admin/);
  });

  it("channel check denies wrong channel type", async () => {
    registerCommand(
      makeCmd({
        id: "dm-only",
        trigger: "dmonly",
        channels: { allowedTypes: ["direct"], allowInThreads: true },
      }),
    );
    const r = await executeCommand("/dmonly", ctx({ channelType: "public" }));
    expect(r.success).toBe(false);
    expect(r.error).toContain("public");
  });
});

describe("executeCommand — message action", () => {
  beforeEach(() => resetRegistry());

  it("executes message with template interpolation", async () => {
    registerCommand(
      makeCmd({
        id: "greet",
        trigger: "greet",
        actionType: "message",
        action: {
          type: "message",
          message: "Hi {{username}} in {{channelName}}",
        },
        responseConfig: {
          type: "message",
          ephemeral: false,
          showTyping: false,
        },
      }),
    );
    const r = await executeCommand("/greet", ctx());
    expect(r.success).toBe(true);
    expect(r.response?.content).toBe("Hi alice in general");
  });

  it("strips unresolved template vars", async () => {
    registerCommand(
      makeCmd({
        id: "clean",
        trigger: "clean",
        action: { type: "message", message: "Hi {{unknown}} end" },
        responseConfig: {
          type: "message",
          ephemeral: false,
          showTyping: false,
        },
      }),
    );
    const r = await executeCommand("/clean", ctx());
    expect(r.success).toBe(true);
    expect(r.response?.content).not.toContain("{{");
  });

  it("missing message template returns error", async () => {
    registerCommand(
      makeCmd({
        id: "nomsg",
        trigger: "nomsg",
        action: { type: "message" },
        responseConfig: {
          type: "message",
          ephemeral: false,
          showTyping: false,
        },
      }),
    );
    const r = await executeCommand("/nomsg", ctx());
    expect(r.success).toBe(false);
    expect(r.error).toContain("No message template");
  });
});

describe("executeCommand — navigate action", () => {
  beforeEach(() => resetRegistry());

  it("emits navigate side-effect with URL", async () => {
    registerCommand(
      makeCmd({
        id: "go",
        trigger: "go",
        actionType: "navigate",
        action: {
          type: "navigate",
          navigate: { url: "/settings", newTab: false },
        },
      }),
    );
    const r = await executeCommand("/go", ctx());
    expect(r.success).toBe(true);
    expect(r.sideEffects?.[0].type).toBe("navigate");
    expect((r.sideEffects?.[0].payload as any).url).toBe("/settings");
  });

  it("missing navigate config errors", async () => {
    registerCommand(
      makeCmd({
        id: "nav0",
        trigger: "nav0",
        actionType: "navigate",
        action: { type: "navigate" },
      }),
    );
    const r = await executeCommand("/nav0", ctx());
    expect(r.success).toBe(false);
  });
});

describe("executeCommand — modal action", () => {
  beforeEach(() => resetRegistry());

  it("emits open_modal side-effect", async () => {
    registerCommand(
      makeCmd({
        id: "m",
        trigger: "m",
        actionType: "modal",
        action: {
          type: "modal",
          modal: { component: "MyModal", props: { foo: 1 } },
        },
      }),
    );
    const r = await executeCommand("/m", ctx());
    expect(r.success).toBe(true);
    expect(r.sideEffects?.[0].type).toBe("open_modal");
    expect((r.sideEffects?.[0].payload as any).component).toBe("MyModal");
  });
});

describe("executeCommand — status action", () => {
  beforeEach(() => resetRegistry());

  it("emits update_status side-effect with interpolated text", async () => {
    registerCommand(
      makeCmd({
        id: "st",
        trigger: "st",
        actionType: "status",
        action: {
          type: "status",
          status: { text: "Hi {{username}}", emoji: ":wave:" },
        },
      }),
    );
    const r = await executeCommand("/st", ctx());
    expect(r.success).toBe(true);
    const se = r.sideEffects?.[0];
    expect(se?.type).toBe("update_status");
    expect((se?.payload as any).text).toBe("Hi alice");
    expect((se?.payload as any).emoji).toBe(":wave:");
  });
});

describe("executeCommand — workflow action", () => {
  beforeEach(() => resetRegistry());

  it("emits workflow side-effect", async () => {
    registerCommand(
      makeCmd({
        id: "wf",
        trigger: "wf",
        actionType: "workflow",
        workflow: { workflowId: "w1", waitForCompletion: true },
        action: { type: "workflow" },
      } as any),
    );
    const r = await executeCommand("/wf", ctx());
    expect(r.success).toBe(true);
    expect(r.sideEffects?.[0].type).toBe("workflow");
    expect((r.sideEffects?.[0].payload as any).workflowId).toBe("w1");
  });
});

describe("executeCommand — built-in help/shortcuts", () => {
  beforeEach(() => resetRegistry());

  it("/help opens help modal via side-effect", async () => {
    initializeRegistry();
    const r = await executeCommand("/help", ctx({ userRole: "guest" }));
    expect(r.success).toBe(true);
    expect(r.sideEffects?.[0].type).toBe("open_modal");
    expect((r.sideEffects?.[0].payload as any).component).toBe(
      "CommandHelpModal",
    );
  });

  it("/help <cmd> returns description for known command", async () => {
    initializeRegistry();
    const r = await executeCommand(
      "/help shortcuts",
      ctx({ userRole: "guest" }),
    );
    expect(r.success).toBe(true);
    expect(r.response?.content).toContain("/shortcuts");
  });

  it("/shortcuts opens shortcuts modal", async () => {
    initializeRegistry();
    const r = await executeCommand("/shortcuts", ctx({ userRole: "guest" }));
    expect(r.success).toBe(true);
    expect((r.sideEffects?.[0].payload as any).component).toBe(
      "KeyboardShortcutsModal",
    );
  });
});

describe("executeCommand — built-in misc", () => {
  beforeEach(() => resetRegistry());

  it("/active emits update_status side-effect", async () => {
    initializeRegistry();
    const r = await executeCommand("/active", ctx());
    expect(r.success).toBe(true);
    expect(r.sideEffects?.[0].type).toBe("update_status");
    expect((r.sideEffects?.[0].payload as any).text).toBe("Active");
  });

  it("/apps navigates to /apps", async () => {
    initializeRegistry();
    const r = await executeCommand("/apps", ctx());
    expect(r.success).toBe(true);
    expect((r.sideEffects?.[0].payload as any).url).toBe("/apps");
  });

  it("/settings navigates with section", async () => {
    initializeRegistry();
    const r = await executeCommand("/settings privacy", ctx());
    expect(r.success).toBe(true);
    expect((r.sideEffects?.[0].payload as any).url).toBe("/settings/privacy");
  });

  it("/shrug returns text emoji message", async () => {
    initializeRegistry();
    const r = await executeCommand("/shrug hmm", ctx());
    expect(r.success).toBe(true);
    expect(r.response?.content).toContain("hmm");
  });

  it("/me formats action text in italics", async () => {
    initializeRegistry();
    const r = await executeCommand("/me waves", ctx());
    expect(r.success).toBe(true);
    expect(r.response?.content).toMatch(/^_.*waves_$/);
  });

  it("/leave has navigate side-effect to /chat", async () => {
    initializeRegistry();
    const r = await executeCommand("/leave", ctx());
    expect(r.success).toBe(true);
    const nav = r.sideEffects?.find((s) => s.type === "navigate");
    expect((nav?.payload as any).url).toBe("/chat");
  });
});

describe("executeCommand — webhook action", () => {
  beforeEach(() => {
    resetRegistry();
    global.fetch = jest.fn();
  });
  afterEach(() => {
    (global.fetch as jest.Mock).mockReset();
  });

  it("sends POST and returns mapped message", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ result: { text: "ok from hook" } }),
    });
    registerCommand(
      makeCmd({
        id: "h",
        trigger: "h",
        actionType: "webhook",
        webhook: {
          url: "https://hook.example",
          method: "POST",
          responseMapping: { messagePath: "result.text" },
        },
        action: { type: "webhook" },
      } as any),
    );
    const r = await executeCommand("/h", ctx());
    expect(r.success).toBe(true);
    expect(r.response?.content).toBe("ok from hook");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://hook.example",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("returns error on non-OK response", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    });
    registerCommand(
      makeCmd({
        id: "h2",
        trigger: "h2",
        actionType: "webhook",
        webhook: { url: "https://hook.example", method: "POST" },
        action: { type: "webhook" },
      } as any),
    );
    const r = await executeCommand("/h2", ctx());
    expect(r.success).toBe(false);
    expect(r.error).toContain("500");
  });
});

describe("executeCommand — api action", () => {
  beforeEach(() => {
    resetRegistry();
    global.fetch = jest.fn();
  });

  it("successful api returns message from data", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ message: "done" }),
    });
    registerCommand(
      makeCmd({
        id: "a",
        trigger: "a",
        actionType: "api",
        action: { type: "api", api: { endpoint: "/api/x", method: "POST" } },
      }),
    );
    const r = await executeCommand("/a", ctx());
    expect(r.success).toBe(true);
    expect(r.response?.content).toBe("done");
  });

  it("failed api surfaces error", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      json: async () => ({ error: "boom" }),
    });
    registerCommand(
      makeCmd({
        id: "afail",
        trigger: "afail",
        actionType: "api",
        action: { type: "api", api: { endpoint: "/api/x" } },
      }),
    );
    const r = await executeCommand("/afail", ctx());
    expect(r.success).toBe(false);
    expect(r.error).toContain("boom");
  });
});

describe("executeCommand — custom action", () => {
  beforeEach(() => resetRegistry());

  it("custom js action is not yet implemented", async () => {
    registerCommand(
      makeCmd({
        id: "cus",
        trigger: "cus",
        actionType: "custom",
        action: { type: "custom" },
      }),
    );
    const r = await executeCommand("/cus", ctx());
    expect(r.success).toBe(false);
    expect(r.error).toContain("not yet implemented");
  });
});
