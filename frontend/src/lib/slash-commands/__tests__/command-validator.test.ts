/**
 * Unit tests for command-validator.
 * Covers validateCommand end-to-end + isValidCommand, getValidationErrors, sanitizeTrigger.
 */
import {
  validateCommand,
  isValidCommand,
  getValidationErrors,
  sanitizeTrigger,
} from "../command-validator";
import type { CommandDraft } from "../command-types";

// Mock registry
jest.mock("../command-registry", () => ({
  getCommandByTrigger: jest.fn(),
  getBuiltInCommands: jest.fn(() => []),
}));
import { getCommandByTrigger } from "../command-registry";

const mkCmd = (over: Partial<CommandDraft> = {}): CommandDraft =>
  ({
    trigger: "mycmd",
    name: "My Command",
    description: "A reasonable description",
    actionType: "message",
    action: { message: "hello" },
    arguments: [],
    permissions: {},
    channels: {},
    responseConfig: {},
    ...over,
  }) as any;

beforeEach(() => {
  (getCommandByTrigger as jest.Mock).mockReset().mockReturnValue(null);
});

describe("validateCommand — trigger", () => {
  it("missing → error", () => {
    const res = validateCommand(mkCmd({ trigger: "" }));
    expect(res.errors.some((e) => e.code === "TRIGGER_REQUIRED")).toBe(true);
  });
  it("invalid format → error", () => {
    expect(
      validateCommand(mkCmd({ trigger: "9bad" })).errors.some(
        (e) => e.code === "TRIGGER_INVALID_FORMAT",
      ),
    ).toBe(true);
  });
  it("too short → error", () => {
    expect(
      validateCommand(mkCmd({ trigger: "a" })).errors.some(
        (e) => e.code === "TRIGGER_TOO_SHORT",
      ),
    ).toBe(true);
  });
  it("too long → error", () => {
    expect(
      validateCommand(mkCmd({ trigger: "a".repeat(40) })).errors.some(
        (e) => e.code === "TRIGGER_TOO_LONG",
      ),
    ).toBe(true);
  });
  it("reserved → warning", () => {
    const res = validateCommand(mkCmd({ trigger: "help" }));
    expect(res.warnings.some((w) => w.code === "TRIGGER_RESERVED")).toBe(true);
  });
  it("conflict with builtin → warning", () => {
    (getCommandByTrigger as jest.Mock).mockReturnValue({
      id: "x",
      isBuiltIn: true,
    });
    const res = validateCommand(mkCmd({ trigger: "mycmd" }));
    expect(
      res.warnings.some((w) => w.code === "TRIGGER_OVERRIDES_BUILTIN"),
    ).toBe(true);
  });
  it("conflict with custom → error", () => {
    (getCommandByTrigger as jest.Mock).mockReturnValue({
      id: "other",
      isBuiltIn: false,
    });
    expect(
      validateCommand(mkCmd({ trigger: "mycmd" })).errors.some(
        (e) => e.code === "TRIGGER_CONFLICT",
      ),
    ).toBe(true);
  });
  it("same id does not conflict", () => {
    (getCommandByTrigger as jest.Mock).mockReturnValue({
      id: "self",
      isBuiltIn: false,
    });
    expect(
      validateCommand(mkCmd({ trigger: "mycmd" }), {
        existingCommandId: "self",
      }).errors.some((e) => e.code === "TRIGGER_CONFLICT"),
    ).toBe(false);
  });
  it("skip conflict check", () => {
    (getCommandByTrigger as jest.Mock).mockReturnValue({
      id: "other",
      isBuiltIn: false,
    });
    expect(
      validateCommand(mkCmd({ trigger: "mycmd" }), {
        checkTriggerConflicts: false,
      }).errors.some((e) => e.code === "TRIGGER_CONFLICT"),
    ).toBe(false);
  });
});

describe("validateCommand — name", () => {
  it("missing", () => {
    expect(
      validateCommand(mkCmd({ name: "" })).errors.some(
        (e) => e.code === "NAME_REQUIRED",
      ),
    ).toBe(true);
  });
  it("short", () => {
    expect(
      validateCommand(mkCmd({ name: "a" })).errors.some(
        (e) => e.code === "NAME_TOO_SHORT",
      ),
    ).toBe(true);
  });
  it("long", () => {
    expect(
      validateCommand(mkCmd({ name: "a".repeat(60) })).errors.length,
    ).toBeGreaterThan(0);
  });
});

describe("validateCommand — description", () => {
  it("short desc", () => {
    const res = validateCommand(mkCmd({ description: "hi" }));
    expect(res.errors.length).toBeGreaterThan(0);
  });
  it("long desc", () => {
    const res = validateCommand(mkCmd({ description: "x".repeat(300) }));
    expect(res.errors.length).toBeGreaterThan(0);
  });
});

describe("validateCommand — arguments", () => {
  it("duplicate names", () => {
    const args = [
      { name: "x", description: "foo description", type: "string" } as any,
      { name: "X", description: "bar description", type: "string" } as any,
    ];
    const res = validateCommand(mkCmd({ arguments: args }));
    expect(res.errors.some((e) => e.code === "ARG_DUPLICATE_NAME")).toBe(true);
  });
  it("duplicate flags", () => {
    const args = [
      { name: "a", description: "desc 1", type: "string", flag: "f" } as any,
      { name: "b", description: "desc 2", type: "string", flag: "f" } as any,
    ];
    expect(
      validateCommand(mkCmd({ arguments: args })).errors.some(
        (e) => e.code === "ARG_DUPLICATE_FLAG",
      ),
    ).toBe(true);
  });
  it("duplicate positions", () => {
    const args = [
      { name: "a", description: "desc 1", type: "string", position: 0 } as any,
      { name: "b", description: "desc 2", type: "string", position: 0 } as any,
    ];
    expect(
      validateCommand(mkCmd({ arguments: args })).errors.some(
        (e) => e.code === "ARG_DUPLICATE_POSITION",
      ),
    ).toBe(true);
  });
  it("arg after rest", () => {
    const args = [
      { name: "r", description: "rest arg", type: "rest", position: 0 } as any,
      { name: "x", description: "regular", type: "string", position: 1 } as any,
    ];
    expect(
      validateCommand(mkCmd({ arguments: args })).errors.some(
        (e) => e.code === "ARG_AFTER_REST",
      ),
    ).toBe(true);
  });
  it("position gap → warning", () => {
    const args = [
      { name: "a", description: "desc 1", type: "string", position: 0 } as any,
      { name: "b", description: "desc 2", type: "string", position: 2 } as any,
    ];
    expect(
      validateCommand(mkCmd({ arguments: args })).warnings.some(
        (w) => w.code === "ARG_POSITION_GAP",
      ),
    ).toBe(true);
  });
  it("required after optional → warning", () => {
    const args = [
      {
        name: "a",
        description: "desc 1",
        type: "string",
        position: 0,
        required: false,
      } as any,
      {
        name: "b",
        description: "desc 2",
        type: "string",
        position: 1,
        required: true,
      } as any,
    ];
    expect(
      validateCommand(mkCmd({ arguments: args })).warnings.some(
        (w) => w.code === "ARG_REQUIRED_AFTER_OPTIONAL",
      ),
    ).toBe(true);
  });
  it("invalid name", () => {
    const args = [
      { name: "1bad", description: "some description", type: "string" } as any,
    ];
    expect(
      validateCommand(mkCmd({ arguments: args })).errors.some(
        (e) => e.code === "ARG_INVALID_NAME",
      ),
    ).toBe(true);
  });
  it("short description", () => {
    const args = [{ name: "a", description: "x", type: "string" } as any];
    expect(
      validateCommand(mkCmd({ arguments: args })).errors.some(
        (e) => e.code === "ARG_DESCRIPTION_TOO_SHORT",
      ),
    ).toBe(true);
  });
  it("choice no choices", () => {
    const args = [
      {
        name: "a",
        description: "descriptive",
        type: "choice",
        choices: [],
      } as any,
    ];
    expect(
      validateCommand(mkCmd({ arguments: args })).errors.some(
        (e) => e.code === "ARG_NO_CHOICES",
      ),
    ).toBe(true);
  });
  it("choice too many", () => {
    const args = [
      {
        name: "a",
        description: "descriptive",
        type: "choice",
        choices: new Array(26).fill({ value: "x" }),
      } as any,
    ];
    expect(
      validateCommand(mkCmd({ arguments: args })).errors.some(
        (e) => e.code === "ARG_TOO_MANY_CHOICES",
      ),
    ).toBe(true);
  });
  it("invalid min>max", () => {
    const args = [
      {
        name: "a",
        description: "descriptive",
        type: "number",
        validation: { min: 10, max: 5 },
      } as any,
    ];
    expect(
      validateCommand(mkCmd({ arguments: args })).errors.some(
        (e) => e.code === "ARG_INVALID_MIN_MAX",
      ),
    ).toBe(true);
  });
  it("invalid minLength>maxLength", () => {
    const args = [
      {
        name: "a",
        description: "descriptive",
        type: "string",
        validation: { minLength: 10, maxLength: 5 },
      } as any,
    ];
    expect(
      validateCommand(mkCmd({ arguments: args })).errors.some(
        (e) => e.code === "ARG_INVALID_LENGTH_RANGE",
      ),
    ).toBe(true);
  });
  it("bad regex pattern", () => {
    const args = [
      {
        name: "a",
        description: "descriptive",
        type: "string",
        validation: { pattern: "[" },
      } as any,
    ];
    expect(
      validateCommand(mkCmd({ arguments: args })).errors.some(
        (e) => e.code === "ARG_INVALID_PATTERN",
      ),
    ).toBe(true);
  });
});

describe("validateCommand — permissions / channels / response / action / webhook / workflow", () => {
  it("bad minRole", () => {
    expect(
      validateCommand(
        mkCmd({ permissions: { minRole: "superuser" } as any }),
      ).errors.some((e) => e.code === "PERM_INVALID_ROLE"),
    ).toBe(true);
  });
  it("bad channel type", () => {
    expect(
      validateCommand(
        mkCmd({ channels: { allowedTypes: ["bogus"] } as any }),
      ).errors.some((e) => e.code === "CHANNEL_INVALID_TYPE"),
    ).toBe(true);
  });
  it("no channel types", () => {
    expect(
      validateCommand(
        mkCmd({ channels: { allowedTypes: [] } as any }),
      ).errors.some((e) => e.code === "CHANNEL_NO_TYPES"),
    ).toBe(true);
  });
  it("bad response type", () => {
    expect(
      validateCommand(
        mkCmd({ responseConfig: { type: "bogus" } as any }),
      ).errors.some((e) => e.code === "RESPONSE_INVALID_TYPE"),
    ).toBe(true);
  });
  it("missing actionType", () => {
    expect(
      validateCommand(mkCmd({ actionType: undefined as any })).errors.some(
        (e) => e.code === "ACTION_TYPE_REQUIRED",
      ),
    ).toBe(true);
  });
  it("invalid actionType", () => {
    expect(
      validateCommand(mkCmd({ actionType: "bogus" as any })).errors.some(
        (e) => e.code === "ACTION_INVALID_TYPE",
      ),
    ).toBe(true);
  });
  it("message needs template", () => {
    expect(
      validateCommand(
        mkCmd({ actionType: "message", action: {} as any }),
      ).errors.some((e) => e.code === "ACTION_MESSAGE_REQUIRED"),
    ).toBe(true);
  });
  it("navigate needs url", () => {
    expect(
      validateCommand(
        mkCmd({ actionType: "navigate", action: { navigate: {} } as any }),
      ).errors.some((e) => e.code === "ACTION_URL_REQUIRED"),
    ).toBe(true);
  });
  it("modal needs component", () => {
    expect(
      validateCommand(
        mkCmd({ actionType: "modal", action: { modal: {} } as any }),
      ).errors.some((e) => e.code === "ACTION_COMPONENT_REQUIRED"),
    ).toBe(true);
  });
  it("api needs endpoint", () => {
    expect(
      validateCommand(
        mkCmd({ actionType: "api", action: { api: {} } as any }),
      ).errors.some((e) => e.code === "ACTION_ENDPOINT_REQUIRED"),
    ).toBe(true);
  });
  it("webhook action needs config", () => {
    expect(
      validateCommand(
        mkCmd({ actionType: "webhook", webhook: undefined } as any),
      ).errors.some((e) => e.code === "ACTION_WEBHOOK_REQUIRED"),
    ).toBe(true);
  });
  it("workflow action needs config", () => {
    expect(
      validateCommand(
        mkCmd({ actionType: "workflow", workflow: undefined } as any),
      ).errors.some((e) => e.code === "ACTION_WORKFLOW_REQUIRED"),
    ).toBe(true);
  });
  it("custom action warns", () => {
    expect(
      validateCommand(
        mkCmd({ actionType: "custom" as any, action: {} as any }),
      ).warnings.some((w) => w.code === "ACTION_CUSTOM_WARNING"),
    ).toBe(true);
  });
  it("webhook: missing url", () => {
    expect(
      validateCommand(
        mkCmd({ actionType: "webhook", webhook: {} as any }),
      ).errors.some((e) => e.code === "WEBHOOK_URL_REQUIRED"),
    ).toBe(true);
  });
  it("webhook: invalid url", () => {
    expect(
      validateCommand(
        mkCmd({ actionType: "webhook", webhook: { url: "not a url" } as any }),
      ).errors.some((e) => e.code === "WEBHOOK_INVALID_URL"),
    ).toBe(true);
  });
  it("webhook: bad method", () => {
    expect(
      validateCommand(
        mkCmd({
          actionType: "webhook",
          webhook: { url: "https://x.com", method: "BOGUS" } as any,
        }),
      ).errors.some((e) => e.code === "WEBHOOK_INVALID_METHOD"),
    ).toBe(true);
  });
  it("webhook: timeout too short", () => {
    expect(
      validateCommand(
        mkCmd({
          actionType: "webhook",
          webhook: { url: "https://x.com", timeout: 100 } as any,
        }),
      ).errors.some((e) => e.code === "WEBHOOK_TIMEOUT_TOO_SHORT"),
    ).toBe(true);
  });
  it("webhook: timeout too long", () => {
    expect(
      validateCommand(
        mkCmd({
          actionType: "webhook",
          webhook: { url: "https://x.com", timeout: 99999 } as any,
        }),
      ).errors.some((e) => e.code === "WEBHOOK_TIMEOUT_TOO_LONG"),
    ).toBe(true);
  });
  it("workflow: missing id", () => {
    expect(
      validateCommand(
        mkCmd({ actionType: "workflow", workflow: {} as any }),
      ).errors.some((e) => e.code === "WORKFLOW_ID_REQUIRED"),
    ).toBe(true);
  });
});

describe("isValidCommand / getValidationErrors / sanitizeTrigger", () => {
  it("valid command", () => {
    expect(isValidCommand(mkCmd())).toBe(true);
  });
  it("invalid command", () => {
    expect(isValidCommand(mkCmd({ trigger: "" }))).toBe(false);
  });
  it("getValidationErrors returns strings", () => {
    const msgs = getValidationErrors(mkCmd({ trigger: "" }));
    expect(msgs.length).toBeGreaterThan(0);
    expect(typeof msgs[0]).toBe("string");
  });
  it("sanitizeTrigger cleans", () => {
    expect(sanitizeTrigger("/My Cmd!")).toBe("mycmd");
    expect(sanitizeTrigger("//foo.bar")).toBe("foobar");
    expect(sanitizeTrigger("a".repeat(50))).toHaveLength(32);
  });
});
