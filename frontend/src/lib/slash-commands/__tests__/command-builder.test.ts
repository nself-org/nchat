/**
 * Unit tests for CommandBuilder fluent API.
 */
import {
  CommandBuilder,
  createCommand,
  createMessageCommand,
  createWebhookCommand,
  createNavigationCommand,
} from "../command-builder";

describe("CommandBuilder — basic info", () => {
  it("normalizes trigger: strips leading slash + lowercases", () => {
    const b = new CommandBuilder("/HELP");
    expect(b.getDraft().trigger).toBe("help");
  });

  it("sets id / name / description / helpText / usage", () => {
    const draft = createCommand("foo")
      .id("custom-foo")
      .name("Foo")
      .description("does foo")
      .helpText("detailed help")
      .usage("/foo <x>")
      .getDraft();
    expect(draft.id).toBe("custom-foo");
    expect(draft.name).toBe("Foo");
    expect(draft.description).toBe("does foo");
    expect(draft.helpText).toBe("detailed help");
    expect(draft.usage).toBe("/foo <x>");
  });

  it("aliases normalize and strip slashes", () => {
    const d = createCommand("hi").aliases("/HEY", "Hello").getDraft();
    expect(d.aliases).toEqual(["hey", "hello"]);
  });

  it("category / icon / order / cooldown / enabled chain", () => {
    const d = createCommand("x")
      .category("utility")
      .icon("Star")
      .order(5)
      .cooldown(10)
      .enabled(false)
      .getDraft();
    expect(d.category).toBe("utility");
    expect(d.icon).toBe("Star");
    expect(d.order).toBe(5);
    expect(d.cooldown).toBe(10);
    expect(d.isEnabled).toBe(false);
  });
});

describe("CommandBuilder — arguments", () => {
  it("addArgument auto-assigns sequential position for positional args", () => {
    const d = createCommand("x")
      .addArgument({ name: "a", type: "string", description: "A" })
      .addArgument({ name: "b", type: "string", description: "B" })
      .getDraft();
    expect(d.arguments![0].position).toBe(0);
    expect(d.arguments![1].position).toBe(1);
  });

  it("addArgument derives id from name with underscores", () => {
    const d = createCommand("x")
      .addArgument({ name: "My Arg", type: "string", description: "" })
      .getDraft();
    expect(d.arguments![0].id).toBe("my_arg");
  });

  it("addStringArg forwards validation options", () => {
    const d = createCommand("x")
      .addStringArg("msg", "message", {
        minLength: 1,
        maxLength: 100,
        pattern: "^[a-z]+$",
        required: true,
      })
      .getDraft();
    const arg = d.arguments![0];
    expect(arg.type).toBe("string");
    expect(arg.required).toBe(true);
    expect(arg.validation?.minLength).toBe(1);
    expect(arg.validation?.maxLength).toBe(100);
    expect(arg.validation?.pattern).toBe("^[a-z]+$");
  });

  it("addNumberArg forwards min/max", () => {
    const d = createCommand("x")
      .addNumberArg("n", "n", { min: 0, max: 10, default: 5 })
      .getDraft();
    expect(d.arguments![0].type).toBe("number");
    expect(d.arguments![0].validation?.min).toBe(0);
    expect(d.arguments![0].validation?.max).toBe(10);
    expect(d.arguments![0].defaultValue).toBe(5);
  });

  it("addUserArg + addChannelArg have autocomplete sources", () => {
    const d = createCommand("x")
      .addUserArg("u", "User")
      .addChannelArg("c", "Channel", false)
      .getDraft();
    expect(d.arguments![0].type).toBe("user");
    expect(d.arguments![0].autocomplete?.source).toBe("users");
    expect(d.arguments![1].type).toBe("channel");
    expect(d.arguments![1].autocomplete?.source).toBe("channels");
    expect(d.arguments![1].required).toBe(false);
  });

  it("addChoiceArg normalizes string choices into { value, label }", () => {
    const d = createCommand("x")
      .addChoiceArg("opt", "opt", ["a", "b"])
      .getDraft();
    expect(d.arguments![0].choices).toEqual([
      { value: "a", label: "a" },
      { value: "b", label: "b" },
    ]);
  });

  it("addChoiceArg accepts structured choices untouched", () => {
    const choices = [{ value: "x", label: "X", description: "the x" }];
    const d = createCommand("x").addChoiceArg("o", "o", choices).getDraft();
    expect(d.arguments![0].choices).toEqual(choices);
  });

  it("addDurationArg / addRestArg", () => {
    const d = createCommand("x")
      .addDurationArg("dur", "duration", true)
      .addRestArg("rest", "rest of text")
      .getDraft();
    expect(d.arguments![0].type).toBe("duration");
    expect(d.arguments![0].required).toBe(true);
    expect(d.arguments![1].type).toBe("rest");
    expect(d.arguments![1].required).toBe(false);
  });

  it("addFlag does NOT set position (flag arg)", () => {
    const d = createCommand("x")
      .addFlag({
        name: "verbose",
        flag: "v",
        type: "boolean",
        description: "verbose",
      })
      .getDraft();
    expect(d.arguments![0].flag).toBe("v");
    expect(d.arguments![0].position).toBeUndefined();
  });
});

describe("CommandBuilder — permissions", () => {
  it("minRole / allowRoles / allowUsers / denyUsers / allowGuests chain", () => {
    const d = createCommand("x")
      .minRole("admin")
      .allowRoles("r1", "r2")
      .allowUsers("u1")
      .denyUsers("u2")
      .allowGuests(true)
      .getDraft();
    expect(d.permissions?.minRole).toBe("admin");
    expect(d.permissions?.allowedRoles).toEqual(["r1", "r2"]);
    expect(d.permissions?.allowedUsers).toEqual(["u1"]);
    expect(d.permissions?.deniedUsers).toEqual(["u2"]);
    expect(d.permissions?.allowGuests).toBe(true);
  });

  it("permissions() merges rather than replaces", () => {
    const d = createCommand("x")
      .minRole("admin")
      .permissions({ allowGuests: true })
      .getDraft();
    expect(d.permissions?.minRole).toBe("admin");
    expect(d.permissions?.allowGuests).toBe(true);
  });
});

describe("CommandBuilder — channels", () => {
  it("allowInChannelTypes replaces types list", () => {
    const d = createCommand("x")
      .allowInChannelTypes("public", "private")
      .getDraft();
    expect(d.channels?.allowedTypes).toEqual(["public", "private"]);
  });

  it("allowInChannels / blockInChannels / allowInThreads", () => {
    const d = createCommand("x")
      .allowInChannels("c1", "c2")
      .blockInChannels("c3")
      .allowInThreads(false)
      .getDraft();
    expect(d.channels?.allowedChannels).toEqual(["c1", "c2"]);
    expect(d.channels?.blockedChannels).toEqual(["c3"]);
    expect(d.channels?.allowInThreads).toBe(false);
  });
});

describe("CommandBuilder — response", () => {
  it("responseType / responseTemplate / ephemeral / showTyping / responseDelay", () => {
    const d = createCommand("x")
      .responseType("message")
      .responseTemplate("Hi {{name}}")
      .ephemeral(false)
      .showTyping(true)
      .responseDelay(500)
      .getDraft();
    expect(d.responseConfig?.type).toBe("message");
    expect(d.responseConfig?.template).toBe("Hi {{name}}");
    expect(d.responseConfig?.ephemeral).toBe(false);
    expect(d.responseConfig?.showTyping).toBe(true);
    expect(d.responseConfig?.delay).toBe(500);
  });
});

describe("CommandBuilder — actions", () => {
  it("sendMessage sets action + switches response to non-ephemeral message", () => {
    const d = createCommand("x").sendMessage("Hello").getDraft();
    expect(d.actionType).toBe("message");
    expect(d.action?.message).toBe("Hello");
    expect(d.responseConfig?.type).toBe("message");
    expect(d.responseConfig?.ephemeral).toBe(false);
  });

  it("updateStatus / navigate / openModal / callApi", () => {
    const d1 = createCommand("x")
      .updateStatus({ text: "brb", emoji: ":zzz:" })
      .getDraft();
    expect(d1.actionType).toBe("status");
    expect(d1.action?.status?.text).toBe("brb");

    const d2 = createCommand("x").navigate("/foo", true).getDraft();
    expect(d2.actionType).toBe("navigate");
    expect(d2.action?.navigate?.url).toBe("/foo");
    expect(d2.action?.navigate?.newTab).toBe(true);

    const d3 = createCommand("x").openModal("MyModal", { k: 1 }).getDraft();
    expect(d3.actionType).toBe("modal");
    expect(d3.action?.modal?.component).toBe("MyModal");

    const d4 = createCommand("x")
      .callApi("/api/foo", "POST", { a: 1 })
      .getDraft();
    expect(d4.actionType).toBe("api");
    expect(d4.action?.api?.endpoint).toBe("/api/foo");
  });

  it("callWebhook stores webhook config", () => {
    const d = createCommand("x")
      .callWebhook({ url: "https://h.example", method: "POST" })
      .getDraft();
    expect(d.actionType).toBe("webhook");
    expect(d.webhook?.url).toBe("https://h.example");
  });

  it("triggerWorkflow stores workflow config", () => {
    const d = createCommand("x")
      .triggerWorkflow({ workflowId: "w1" })
      .getDraft();
    expect(d.actionType).toBe("workflow");
    expect(d.workflow?.workflowId).toBe("w1");
  });
});

describe("CommandBuilder — build()", () => {
  it("generates an id when none is provided", () => {
    const cmd = createCommand("myx").name("X").description("d").build("alice");
    expect(cmd.id).toMatch(/^custom-myx-\d+$/);
    expect(cmd.createdBy).toBe("alice");
    expect(cmd.createdAt).toBeDefined();
    expect(cmd.updatedAt).toBeDefined();
    expect(cmd.isBuiltIn).toBe(false);
  });

  it("uses explicit id when provided", () => {
    const cmd = createCommand("y").id("explicit-id").build("bob");
    expect(cmd.id).toBe("explicit-id");
  });

  it("falls back name to trigger when name missing", () => {
    const cmd = createCommand("zz").build("u");
    expect(cmd.name).toBe("zz");
  });

  it("generates usage from positional args", () => {
    const cmd = createCommand("t")
      .addArgument({
        name: "q",
        type: "string",
        description: "",
        required: true,
      })
      .addArgument({
        name: "opt",
        type: "string",
        description: "",
        required: false,
      })
      .build("u");
    expect(cmd.usage).toBe("/t <q> [opt]");
  });

  it("generates usage including flags", () => {
    const cmd = createCommand("t")
      .addFlag({
        name: "from",
        flag: "from",
        type: "string",
        description: "",
        required: true,
      })
      .build("u");
    expect(cmd.usage).toContain("--from");
  });

  it("respects explicit usage override", () => {
    const cmd = createCommand("t").usage("/t --custom").build("u");
    expect(cmd.usage).toBe("/t --custom");
  });

  it("category defaults to custom", () => {
    const cmd = createCommand("t").build("u");
    expect(cmd.category).toBe("custom");
  });
});

describe("Preset factories", () => {
  it("createMessageCommand wires message + custom category", () => {
    const b = createMessageCommand("cheer", "Yay", "cheer up");
    const d = b.getDraft();
    expect(d.trigger).toBe("cheer");
    expect(d.action?.message).toBe("Yay");
    expect(d.category).toBe("custom");
  });

  it("createWebhookCommand sets integration category + webhook", () => {
    const d = createWebhookCommand(
      "deploy",
      "https://hook.example",
      "deploy",
    ).getDraft();
    expect(d.webhook?.url).toBe("https://hook.example");
    expect(d.category).toBe("integration");
  });

  it("createNavigationCommand sets utility category + navigate action", () => {
    const d = createNavigationCommand("go", "/app", "navigate").getDraft();
    expect(d.action?.navigate?.url).toBe("/app");
    expect(d.category).toBe("utility");
  });
});
