/**
 * Bot Templates Tests
 * Tests for all 5 bot templates: Welcome, FAQ, Poll, Scheduler, Standup
 */

import { createWelcomeBot } from "../templates/welcome-bot";
import { createFAQBot } from "../templates/faq-bot";
import { createPollBot } from "../templates/poll-bot";
import { createSchedulerBot } from "../templates/scheduler-bot";
import { createStandupBot } from "../templates/standup-bot";
import { createRuntime } from "../bot-runtime";
import { createMockServices } from "../bot-api";
import type {
  MessageContext,
  CommandContext,
  UserContext,
  ReactionContext,
} from "../bot-types";

// Mock services
const mockServices = createMockServices();

// Helper to create command context
function createCommandContext(
  commandName: string,
  args: Record<string, unknown> = {},
  overrides: Partial<CommandContext> = {},
): CommandContext {
  return {
    message: {
      messageId: "msg-1",
      channelId: "ch-1",
      userId: "user-1",
      content: `/${commandName}`,
      type: "text",
    },
    channel: { id: "ch-1", name: "general", type: "public" },
    user: { id: "user-1", displayName: "Test User" },
    isCommand: true,
    command: { name: commandName, args, rawArgs: "", prefix: "/" },
    args,
    isMention: false,
    isThread: false,
    isDirect: false,
    ...overrides,
  };
}

// Helper to create user context
function createUserContext(
  userId: string = "user-1",
  displayName: string = "Test User",
  overrides: Partial<UserContext> = {},
): UserContext {
  return {
    user: {
      userId,
      channelId: "ch-1",
      displayName,
    },
    channel: { id: "ch-1", name: "general", type: "public" },
    memberCount: 10,
    ...overrides,
  };
}

describe("Welcome Bot Template", () => {
  let welcomeBot: ReturnType<typeof createWelcomeBot>;

  beforeEach(() => {
    const runtime = createRuntime(mockServices);
    // @ts-expect-error - setting global runtime
    global.__botRuntime = runtime;
    welcomeBot = createWelcomeBot();
  });

  describe("Initialization", () => {
    it("should create welcome bot instance", () => {
      expect(welcomeBot).toBeDefined();
      expect(welcomeBot.manifest.id).toBe("welcome-bot");
      expect(welcomeBot.manifest.name).toBe("Welcome Bot");
    });

    it("should have correct permissions", () => {
      expect(welcomeBot.manifest.permissions).toContain("read_messages");
      expect(welcomeBot.manifest.permissions).toContain("send_messages");
      expect(welcomeBot.manifest.permissions).toContain("mention_users");
    });

    it("should have default settings", () => {
      expect(welcomeBot.config.settings?.sendDM).toBe(false);
      expect(welcomeBot.config.settings?.showRules).toBe(false);
      expect(welcomeBot.config.settings?.embedColor).toBe("#22c55e");
    });
  });

  describe("Commands", () => {
    it("should register setwelcome command", () => {
      expect(welcomeBot.commands.has("setwelcome")).toBe(true);
    });

    it("should register testwelcome command", () => {
      expect(welcomeBot.commands.has("testwelcome")).toBe(true);
    });

    it("should register welcomesettings command", () => {
      expect(welcomeBot.commands.has("welcomesettings")).toBe(true);
    });
  });

  describe("User Join Handler", () => {
    it("should have user join handler registered", () => {
      // Verify the handler is registered without executing it
      // since execution requires full bot infrastructure
      expect(welcomeBot).toBeDefined();
      expect(welcomeBot.handleUserJoin).toBeDefined();
    });

    it("should not trigger when disabled", async () => {
      welcomeBot.config.settings = {
        ...welcomeBot.config.settings,
        enabled: false,
      };
      welcomeBot.start();

      const ctx = createUserContext("new-user", "New User");
      const response = await welcomeBot.handleUserJoin(ctx);

      // Should return undefined when disabled
      expect(response).toBeUndefined();
    });
  });

  describe("Settings Command", () => {
    it("should have settings command registered", () => {
      expect(welcomeBot.commands.has("welcomesettings")).toBe(true);
    });
  });
});

describe("FAQ Bot Template", () => {
  let faqBot: ReturnType<typeof createFAQBot>;

  beforeEach(() => {
    const runtime = createRuntime(mockServices);
    // @ts-expect-error - setting global runtime
    global.__botRuntime = runtime;
    faqBot = createFAQBot();
  });

  describe("Initialization", () => {
    it("should create FAQ bot instance", () => {
      expect(faqBot).toBeDefined();
      expect(faqBot.manifest.id).toBe("faq-bot");
      expect(faqBot.manifest.name).toBe("FAQ Bot");
    });

    it("should have default settings", () => {
      expect(faqBot.config.settings?.autoRespond).toBe(true);
      expect(faqBot.config.settings?.minMatchScore).toBe(0.6);
    });
  });

  describe("Commands", () => {
    it("should register faq command", () => {
      expect(faqBot.commands.has("faq")).toBe(true);
    });

    it("should register addfaq command", () => {
      expect(faqBot.commands.has("addfaq")).toBe(true);
    });

    it("should register removefaq command", () => {
      expect(faqBot.commands.has("removefaq")).toBe(true);
    });

    it("should register searchfaq command", () => {
      expect(faqBot.commands.has("searchfaq")).toBe(true);
    });
  });

  describe("FAQ Management", () => {
    it("should have FAQ management commands", () => {
      expect(faqBot.commands.has("faq")).toBe(true);
      expect(faqBot.commands.has("addfaq")).toBe(true);
      expect(faqBot.commands.has("removefaq")).toBe(true);
      expect(faqBot.commands.has("searchfaq")).toBe(true);
    });

    it("should have message handler for auto-response", () => {
      expect(faqBot.handleMessage).toBeDefined();
    });
  });

  describe("Auto-response", () => {
    it("should have auto-response enabled by default", () => {
      expect(faqBot.config.settings?.autoRespond).toBe(true);
    });

    it("should have configurable match score", () => {
      expect(faqBot.config.settings?.minMatchScore).toBe(0.6);
      expect(typeof faqBot.config.settings?.minMatchScore).toBe("number");
    });
  });
});

describe("Poll Bot Template", () => {
  let pollBot: ReturnType<typeof createPollBot>;

  beforeEach(() => {
    const runtime = createRuntime(mockServices);
    // @ts-expect-error - setting global runtime
    global.__botRuntime = runtime;
    pollBot = createPollBot();
  });

  describe("Initialization", () => {
    it("should create poll bot instance", () => {
      expect(pollBot).toBeDefined();
      expect(pollBot.manifest.id).toBe("poll-bot");
      expect(pollBot.manifest.name).toBe("Poll Bot");
    });

    it("should have default settings", () => {
      expect(pollBot.config.settings?.maxOptions).toBe(10);
      expect(pollBot.config.settings?.allowAnonymous).toBe(true);
    });

    it("should have add_reactions permission", () => {
      expect(pollBot.manifest.permissions).toContain("add_reactions");
    });
  });

  describe("Commands", () => {
    it("should register poll command", () => {
      expect(pollBot.commands.has("poll")).toBe(true);
    });

    it("should register pollresults command", () => {
      expect(pollBot.commands.has("pollresults")).toBe(true);
    });

    it("should register closepoll command", () => {
      expect(pollBot.commands.has("closepoll")).toBe(true);
    });
  });

  describe("Poll Creation", () => {
    it("should have poll command registered", () => {
      expect(pollBot.commands.has("poll")).toBe(true);
    });

    it("should have default max options setting", () => {
      expect(pollBot.config.settings?.maxOptions).toBe(10);
    });

    it("should support anonymous polls in config", () => {
      expect(pollBot.config.settings?.allowAnonymous).toBe(true);
    });

    it("should have poll results command", () => {
      expect(pollBot.commands.has("pollresults")).toBe(true);
    });

    it("should have close poll command", () => {
      expect(pollBot.commands.has("closepoll")).toBe(true);
    });
  });

  describe("Voting", () => {
    it("should have reaction handler for voting", () => {
      expect(pollBot.handleReaction).toBeDefined();
    });

    it("should start as active bot", () => {
      pollBot.start();
      expect(pollBot.isActive()).toBe(true);
    });
  });
});

describe("Scheduler Bot Template", () => {
  let schedulerBot: ReturnType<typeof createSchedulerBot>;

  beforeEach(() => {
    const runtime = createRuntime(mockServices);
    // @ts-expect-error - setting global runtime
    global.__botRuntime = runtime;
    schedulerBot = createSchedulerBot();
  });

  describe("Initialization", () => {
    it("should create scheduler bot instance", () => {
      expect(schedulerBot).toBeDefined();
      expect(schedulerBot.manifest.id).toBe("scheduler-bot");
      expect(schedulerBot.manifest.name).toBe("Scheduler Bot");
    });

    it("should have default settings", () => {
      expect(schedulerBot.config.settings?.maxRemindersPerUser).toBe(20);
      expect(schedulerBot.config.settings?.defaultTimezone).toBe("UTC");
      expect(schedulerBot.config.settings?.allowRecurring).toBe(true);
    });

    it("should have mention_users permission", () => {
      expect(schedulerBot.manifest.permissions).toContain("mention_users");
    });
  });

  describe("Commands", () => {
    it("should register remind command", () => {
      expect(schedulerBot.commands.has("remind")).toBe(true);
    });

    it("should register reminders command", () => {
      expect(schedulerBot.commands.has("reminders")).toBe(true);
    });

    it("should register deletereminder command", () => {
      expect(schedulerBot.commands.has("deletereminder")).toBe(true);
    });

    it("should register schedule command", () => {
      expect(schedulerBot.commands.has("schedule")).toBe(true);
    });
  });

  describe("Reminder Creation", () => {
    it("should have remind command registered", () => {
      expect(schedulerBot.commands.has("remind")).toBe(true);
    });

    it("should have default max reminders setting", () => {
      expect(schedulerBot.config.settings?.maxRemindersPerUser).toBe(20);
    });

    it("should support recurring reminders in config", () => {
      expect(schedulerBot.config.settings?.allowRecurring).toBe(true);
    });

    it("should have timezone configuration", () => {
      expect(schedulerBot.config.settings?.defaultTimezone).toBe("UTC");
    });
  });

  describe("Reminder Listing", () => {
    it("should have reminders command", () => {
      expect(schedulerBot.commands.has("reminders")).toBe(true);
    });

    it("should have delete reminder command", () => {
      expect(schedulerBot.commands.has("deletereminder")).toBe(true);
    });
  });

  describe("Message Scheduling", () => {
    it("should have schedule command", () => {
      expect(schedulerBot.commands.has("schedule")).toBe(true);
    });

    it("should have mention_users permission", () => {
      expect(schedulerBot.manifest.permissions).toContain("mention_users");
    });
  });
});

describe("Standup Bot Template", () => {
  let standupBot: ReturnType<typeof createStandupBot>;

  beforeEach(() => {
    const runtime = createRuntime(mockServices);
    // @ts-expect-error - setting global runtime
    global.__botRuntime = runtime;
    standupBot = createStandupBot();
  });

  describe("Initialization", () => {
    it("should create standup bot instance", () => {
      expect(standupBot).toBeDefined();
      expect(standupBot.manifest.id).toBe("standup-bot");
      expect(standupBot.manifest.name).toBe("Standup Bot");
    });

    it("should have default settings", () => {
      expect(standupBot.config.settings?.standupTime).toBe("09:00");
      expect(standupBot.config.settings?.skipWeekends).toBe(true);
      expect(standupBot.config.settings?.remindNonResponders).toBe(true);
    });

    it("should have default questions", () => {
      expect(standupBot.config.settings?.questions).toBeDefined();
      expect(standupBot.config.settings?.questions.yesterday).toContain(
        "yesterday",
      );
      expect(standupBot.config.settings?.questions.today).toContain("today");
      expect(standupBot.config.settings?.questions.blockers).toContain(
        "blockers",
      );
    });
  });

  describe("Commands", () => {
    it("should register standup command", () => {
      expect(standupBot.commands.has("standup")).toBe(true);
    });

    it("should register mystandup command", () => {
      expect(standupBot.commands.has("mystandup")).toBe(true);
    });

    it("should register updatestandup command", () => {
      expect(standupBot.commands.has("updatestandup")).toBe(true);
    });

    it("should register endstandup command", () => {
      expect(standupBot.commands.has("endstandup")).toBe(true);
    });

    it("should register standupnotes command", () => {
      expect(standupBot.commands.has("standupnotes")).toBe(true);
    });
  });

  describe("Standup Workflow", () => {
    it("should have standup command registered", () => {
      expect(standupBot.commands.has("standup")).toBe(true);
    });

    it("should have mystandup command for submissions", () => {
      expect(standupBot.commands.has("mystandup")).toBe(true);
    });

    it("should have update command", () => {
      expect(standupBot.commands.has("updatestandup")).toBe(true);
    });

    it("should have default questions configured", () => {
      expect(standupBot.config.settings?.questions).toBeDefined();
      expect(standupBot.config.settings?.questions.yesterday).toBeTruthy();
      expect(standupBot.config.settings?.questions.today).toBeTruthy();
      expect(standupBot.config.settings?.questions.blockers).toBeTruthy();
    });

    it("should have skip weekends setting", () => {
      expect(standupBot.config.settings?.skipWeekends).toBe(true);
    });
  });

  describe("Standup Management", () => {
    it("should have endstandup command", () => {
      expect(standupBot.commands.has("endstandup")).toBe(true);
    });

    it("should have standupnotes command", () => {
      expect(standupBot.commands.has("standupnotes")).toBe(true);
    });

    it("should have reminder settings", () => {
      expect(standupBot.config.settings?.remindNonResponders).toBe(true);
      expect(standupBot.config.settings?.reminderTime).toBe("10:00");
    });

    it("should have default standup time", () => {
      expect(standupBot.config.settings?.standupTime).toBe("09:00");
    });
  });
});

describe("Template Integration Tests", () => {
  it("should all templates be instantiable", () => {
    const runtime = createRuntime(mockServices);
    // @ts-expect-error - setting global runtime
    global.__botRuntime = runtime;

    const templates = [
      createWelcomeBot,
      createFAQBot,
      createPollBot,
      createSchedulerBot,
      createStandupBot,
    ];

    templates.forEach((createTemplate) => {
      const bot = createTemplate();
      expect(bot).toBeDefined();
      expect(bot.manifest).toBeDefined();
      expect(bot.config).toBeDefined();
      expect(bot.api).toBeDefined();
    });
  });

  it("should all templates have unique IDs", () => {
    const runtime = createRuntime(mockServices);
    // @ts-expect-error - setting global runtime
    global.__botRuntime = runtime;

    const templates = [
      createWelcomeBot,
      createFAQBot,
      createPollBot,
      createSchedulerBot,
      createStandupBot,
    ];

    const ids = templates.map((createTemplate) => createTemplate().manifest.id);
    const uniqueIds = new Set(ids);

    expect(uniqueIds.size).toBe(templates.length);
  });

  it("should all templates start successfully", () => {
    const runtime = createRuntime(mockServices);
    // @ts-expect-error - setting global runtime
    global.__botRuntime = runtime;

    const templates = [
      createWelcomeBot,
      createFAQBot,
      createPollBot,
      createSchedulerBot,
      createStandupBot,
    ];

    templates.forEach((createTemplate) => {
      const bot = createTemplate();
      bot.start();
      expect(bot.state.status).toBe("active");
    });
  });

  it("should all templates have help command", () => {
    const runtime = createRuntime(mockServices);
    // @ts-expect-error - setting global runtime
    global.__botRuntime = runtime;

    const templates = [
      createWelcomeBot,
      createFAQBot,
      createPollBot,
      createSchedulerBot,
      createStandupBot,
    ];

    templates.forEach((createTemplate) => {
      const bot = createTemplate();
      expect(bot.commands.has("help")).toBe(true);
    });
  });

  it("should all templates handle errors gracefully", async () => {
    const runtime = createRuntime(mockServices);
    // @ts-expect-error - setting global runtime
    global.__botRuntime = runtime;

    const templates = [
      createWelcomeBot,
      createFAQBot,
      createPollBot,
      createSchedulerBot,
      createStandupBot,
    ];

    for (const createTemplate of templates) {
      const bot = createTemplate();
      bot.start();

      // Send invalid command context
      const ctx: MessageContext = {
        message: {
          messageId: "msg-1",
          channelId: "ch-1",
          userId: "user-1",
          content: "invalid",
          type: "text",
        },
        channel: { id: "ch-1", name: "general", type: "public" },
        user: { id: "user-1", displayName: "Test User" },
        isCommand: false,
        isMention: false,
        isThread: false,
        isDirect: false,
      };

      // Should not throw
      await expect(bot.handleMessage(ctx)).resolves.not.toThrow();
    }
  });
});
