/**
 * Bot Runtime Tests
 * Tests for bot loading, execution, event routing, and lifecycle management
 */

import {
  BotRuntime,
  BotInstance,
  createRuntime,
  getRuntime,
  setRuntime,
  createBot,
} from "../bot-runtime";
import { createMockServices } from "../bot-api";
import type {
  BotManifest,
  BotConfig,
  MessageContext,
  UserContext,
  ReactionContext,
} from "../bot-types";

// Mock services
const mockServices = createMockServices();

describe("BotRuntime", () => {
  let runtime: BotRuntime;

  beforeEach(() => {
    runtime = new BotRuntime(mockServices);
  });

  describe("Bot Registration", () => {
    it("should register a bot with manifest", () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "A test bot",
        version: "1.0.0",
        permissions: ["read_messages", "send_messages"],
      };

      const bot = runtime.register(manifest);
      expect(bot).toBeInstanceOf(BotInstance);
      expect(bot.manifest.id).toBe("test-bot");
    });

    it("should register bot with config", () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: ["read_messages"],
      };

      const config: Partial<BotConfig> = {
        enabled: false,
        channels: ["ch-1", "ch-2"],
        settings: { color: "blue" },
      };

      const bot = runtime.register(manifest, config);
      expect(bot.config.enabled).toBe(false);
      expect(bot.config.channels).toEqual(["ch-1", "ch-2"]);
      expect(bot.config.settings?.color).toBe("blue");
    });

    it("should execute setup function on registration", () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const setupSpy = jest.fn();
      runtime.register(manifest, undefined, setupSpy);

      expect(setupSpy).toHaveBeenCalled();
    });

    it("should register built-in help command", () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const bot = runtime.register(manifest);
      expect(bot.commands.has("help")).toBe(true);
    });

    it("should store bot in registry", () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      runtime.register(manifest);
      const retrieved = runtime.get("test-bot");

      expect(retrieved).toBeDefined();
      expect(retrieved?.manifest.id).toBe("test-bot");
    });
  });

  describe("Bot Unregistration", () => {
    it("should unregister bot by ID", () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      runtime.register(manifest);
      const result = runtime.unregister("test-bot");

      expect(result).toBe(true);
      expect(runtime.get("test-bot")).toBeUndefined();
    });

    it("should stop bot on unregister", () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const bot = runtime.register(manifest);
      bot.start();

      runtime.unregister("test-bot");
      expect(bot.state.status).toBe("inactive");
    });

    it("should return false when unregistering non-existent bot", () => {
      const result = runtime.unregister("non-existent");
      expect(result).toBe(false);
    });
  });

  describe("Bot Retrieval", () => {
    it("should get bot by ID", () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      runtime.register(manifest);
      const bot = runtime.get("test-bot");

      expect(bot).toBeDefined();
      expect(bot?.manifest.id).toBe("test-bot");
    });

    it("should return undefined for non-existent bot", () => {
      const bot = runtime.get("non-existent");
      expect(bot).toBeUndefined();
    });

    it("should get all bots", () => {
      const manifests: BotManifest[] = [
        {
          id: "bot-1",
          name: "Bot 1",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
        {
          id: "bot-2",
          name: "Bot 2",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
        {
          id: "bot-3",
          name: "Bot 3",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
      ];

      manifests.forEach((m) => runtime.register(m));
      const allBots = runtime.getAll();

      expect(allBots).toHaveLength(3);
    });

    it("should get only active bots", () => {
      const manifests: BotManifest[] = [
        {
          id: "bot-1",
          name: "Bot 1",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
        {
          id: "bot-2",
          name: "Bot 2",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
      ];

      const bot1 = runtime.register(manifests[0], { enabled: true });
      const bot2 = runtime.register(manifests[1], { enabled: false });

      bot1.start();

      const activeBots = runtime.getActive();
      expect(activeBots).toHaveLength(1);
      expect(activeBots[0].manifest.id).toBe("bot-1");
    });
  });

  describe("Bot Lifecycle", () => {
    it("should start all enabled bots", () => {
      const manifests: BotManifest[] = [
        {
          id: "bot-1",
          name: "Bot 1",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
        {
          id: "bot-2",
          name: "Bot 2",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
      ];

      const bot1 = runtime.register(manifests[0], { enabled: true });
      const bot2 = runtime.register(manifests[1], { enabled: false });

      runtime.startAll();

      expect(bot1.state.status).toBe("active");
      expect(bot2.state.status).not.toBe("active");
    });

    it("should stop all bots", () => {
      const manifests: BotManifest[] = [
        {
          id: "bot-1",
          name: "Bot 1",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
        {
          id: "bot-2",
          name: "Bot 2",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
      ];

      const bot1 = runtime.register(manifests[0]);
      const bot2 = runtime.register(manifests[1]);

      bot1.start();
      bot2.start();

      runtime.stopAll();

      expect(bot1.state.status).toBe("inactive");
      expect(bot2.state.status).toBe("inactive");
    });
  });

  describe("Event Dispatching", () => {
    it("should dispatch message to active bots", async () => {
      const handler = jest.fn();
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const bot = runtime.register(manifest, undefined, (b) => {
        b.onMessage(handler);
      });
      bot.start();

      const ctx: MessageContext = {
        message: {
          messageId: "msg-1",
          channelId: "ch-1",
          userId: "user-1",
          content: "test",
          type: "text",
        },
        channel: { id: "ch-1", name: "general", type: "public" },
        user: { id: "user-1", displayName: "Test User" },
        isCommand: false,
        isMention: false,
        isThread: false,
        isDirect: false,
      };

      await runtime.dispatchMessage(ctx);
      expect(handler).toHaveBeenCalled();
    });

    it("should not dispatch to inactive bots", async () => {
      const handler = jest.fn();
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const bot = runtime.register(manifest, undefined, (b) => {
        b.onMessage(handler);
      });
      bot.stop();

      const ctx: MessageContext = {
        message: {
          messageId: "msg-1",
          channelId: "ch-1",
          userId: "user-1",
          content: "test",
          type: "text",
        },
        channel: { id: "ch-1", name: "general", type: "public" },
        user: { id: "user-1", displayName: "Test User" },
        isCommand: false,
        isMention: false,
        isThread: false,
        isDirect: false,
      };

      await runtime.dispatchMessage(ctx);
      expect(handler).not.toHaveBeenCalled();
    });

    it("should dispatch user join to active bots", async () => {
      const handler = jest.fn();
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const bot = runtime.register(manifest, undefined, (b) => {
        b.onUserJoin(handler);
      });
      bot.start();

      const ctx: UserContext = {
        user: {
          userId: "user-1",
          channelId: "ch-1",
          displayName: "New User",
        },
        channel: { id: "ch-1", name: "general", type: "public" },
      };

      await runtime.dispatchUserJoin(ctx);
      expect(handler).toHaveBeenCalled();
    });

    it("should dispatch user leave to active bots", async () => {
      const handler = jest.fn();
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const bot = runtime.register(manifest, undefined, (b) => {
        b.onUserLeave(handler);
      });
      bot.start();

      const ctx: UserContext = {
        user: {
          userId: "user-1",
          channelId: "ch-1",
          displayName: "Leaving User",
        },
        channel: { id: "ch-1", name: "general", type: "public" },
      };

      await runtime.dispatchUserLeave(ctx);
      expect(handler).toHaveBeenCalled();
    });

    it("should dispatch reaction to active bots", async () => {
      const handler = jest.fn();
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const bot = runtime.register(manifest, undefined, (b) => {
        b.onReaction(handler);
      });
      bot.start();

      const ctx: ReactionContext = {
        reaction: {
          messageId: "msg-1",
          channelId: "ch-1",
          userId: "user-1",
          emoji: "👍",
          action: "add",
        },
        message: {
          messageId: "msg-1",
          channelId: "ch-1",
          userId: "user-2",
          content: "Test",
          type: "text",
        },
        user: {
          id: "user-1",
          displayName: "Test User",
        },
      };

      await runtime.dispatchReaction(ctx);
      expect(handler).toHaveBeenCalled();
    });

    it("should collect responses from multiple bots", async () => {
      const manifest1: BotManifest = {
        id: "bot-1",
        name: "Bot 1",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };
      const manifest2: BotManifest = {
        id: "bot-2",
        name: "Bot 2",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const bot1 = runtime.register(manifest1, undefined, (b) => {
        b.onMessage(() => ({ content: "Response 1" }));
      });
      const bot2 = runtime.register(manifest2, undefined, (b) => {
        b.onMessage(() => ({ content: "Response 2" }));
      });

      bot1.start();
      bot2.start();

      const ctx: MessageContext = {
        message: {
          messageId: "msg-1",
          channelId: "ch-1",
          userId: "user-1",
          content: "test",
          type: "text",
        },
        channel: { id: "ch-1", name: "general", type: "public" },
        user: { id: "user-1", displayName: "Test User" },
        isCommand: false,
        isMention: false,
        isThread: false,
        isDirect: false,
      };

      const responses = await runtime.dispatchMessage(ctx);
      expect(responses).toHaveLength(2);
      expect(responses[0].content).toBe("Response 1");
      expect(responses[1].content).toBe("Response 2");
    });
  });

  describe("Error Handling", () => {
    it("should handle errors in message handler", async () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const bot = runtime.register(manifest, undefined, (b) => {
        b.onMessage(() => {
          throw new Error("Handler error");
        });
      });
      bot.start();

      const ctx: MessageContext = {
        message: {
          messageId: "msg-1",
          channelId: "ch-1",
          userId: "user-1",
          content: "test",
          type: "text",
        },
        channel: { id: "ch-1", name: "general", type: "public" },
        user: { id: "user-1", displayName: "Test User" },
        isCommand: false,
        isMention: false,
        isThread: false,
        isDirect: false,
      };

      await runtime.dispatchMessage(ctx);
      expect(bot.state.stats.errorsCount).toBe(1);
      expect(bot.state.errorMessage).toBe("Handler error");
    });

    it("should continue dispatching after error in one bot", async () => {
      const manifest1: BotManifest = {
        id: "bot-1",
        name: "Bot 1",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };
      const manifest2: BotManifest = {
        id: "bot-2",
        name: "Bot 2",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const handler2 = jest.fn(() => ({ content: "Success" }));

      const bot1 = runtime.register(manifest1, undefined, (b) => {
        b.onMessage(() => {
          throw new Error("Error");
        });
      });
      const bot2 = runtime.register(manifest2, undefined, (b) => {
        b.onMessage(handler2);
      });

      bot1.start();
      bot2.start();

      const ctx: MessageContext = {
        message: {
          messageId: "msg-1",
          channelId: "ch-1",
          userId: "user-1",
          content: "test",
          type: "text",
        },
        channel: { id: "ch-1", name: "general", type: "public" },
        user: { id: "user-1", displayName: "Test User" },
        isCommand: false,
        isMention: false,
        isThread: false,
        isDirect: false,
      };

      await runtime.dispatchMessage(ctx);
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe("Runtime Statistics", () => {
    it("should track total bots", () => {
      const manifests: BotManifest[] = [
        {
          id: "bot-1",
          name: "Bot 1",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
        {
          id: "bot-2",
          name: "Bot 2",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
      ];

      manifests.forEach((m) => runtime.register(m));
      const stats = runtime.getStats();

      expect(stats.totalBots).toBe(2);
    });

    it("should track active bots", () => {
      const manifests: BotManifest[] = [
        {
          id: "bot-1",
          name: "Bot 1",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
        {
          id: "bot-2",
          name: "Bot 2",
          description: "",
          version: "1.0.0",
          permissions: [],
        },
      ];

      const bot1 = runtime.register(manifests[0]);
      runtime.register(manifests[1]);

      bot1.start();

      const stats = runtime.getStats();
      expect(stats.activeBots).toBe(1);
    });

    it("should track messages processed", async () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const bot = runtime.register(manifest, undefined, (b) => {
        b.onMessage(() => {});
      });
      bot.start();

      const ctx: MessageContext = {
        message: {
          messageId: "msg-1",
          channelId: "ch-1",
          userId: "user-1",
          content: "test",
          type: "text",
        },
        channel: { id: "ch-1", name: "general", type: "public" },
        user: { id: "user-1", displayName: "Test User" },
        isCommand: false,
        isMention: false,
        isThread: false,
        isDirect: false,
      };

      await runtime.dispatchMessage(ctx);
      await runtime.dispatchMessage(ctx);

      const stats = runtime.getStats();
      expect(stats.totalMessagesProcessed).toBe(2);
    });

    it("should track commands executed", async () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
        commands: [{ name: "test", description: "Test" }],
      };

      const bot = runtime.register(manifest, undefined, (b) => {
        b.commands.register({ name: "test", description: "Test" }, () => ({
          content: "OK",
        }));
      });
      bot.start();

      const ctx: MessageContext = {
        message: {
          messageId: "msg-1",
          channelId: "ch-1",
          userId: "user-1",
          content: "/test",
          type: "text",
        },
        channel: { id: "ch-1", name: "general", type: "public" },
        user: { id: "user-1", displayName: "Test User" },
        isCommand: true,
        command: { name: "test", args: {}, rawArgs: "", prefix: "/" },
        isMention: false,
        isThread: false,
        isDirect: false,
      };

      await runtime.dispatchMessage(ctx);

      const stats = runtime.getStats();
      expect(stats.totalCommandsExecuted).toBeGreaterThan(0);
    });

    it("should track errors", async () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const bot = runtime.register(manifest, undefined, (b) => {
        b.onMessage(() => {
          throw new Error("Test error");
        });
      });
      bot.start();

      const ctx: MessageContext = {
        message: {
          messageId: "msg-1",
          channelId: "ch-1",
          userId: "user-1",
          content: "test",
          type: "text",
        },
        channel: { id: "ch-1", name: "general", type: "public" },
        user: { id: "user-1", displayName: "Test User" },
        isCommand: false,
        isMention: false,
        isThread: false,
        isDirect: false,
      };

      await runtime.dispatchMessage(ctx);

      const stats = runtime.getStats();
      expect(stats.totalErrors).toBe(1);
    });
  });

  describe("Global Runtime", () => {
    it("should create global runtime with getRuntime", () => {
      const runtime1 = getRuntime();
      const runtime2 = getRuntime();

      expect(runtime1).toBe(runtime2); // Should be singleton
    });

    it("should allow setting custom runtime", () => {
      const customRuntime = createRuntime(mockServices);
      setRuntime(customRuntime);

      const retrieved = getRuntime();
      expect(retrieved).toBe(customRuntime);
    });
  });

  describe("Factory Functions", () => {
    it("should create bot with createBot factory", () => {
      const bot = createBot("factory-bot", {
        name: "Factory Bot",
        description: "Created with factory",
      });

      expect(bot.manifest.id).toBe("factory-bot");
      expect(bot.manifest.name).toBe("Factory Bot");
    });

    it("should support setup function in createBot", () => {
      const setupSpy = jest.fn();

      createBot(
        "factory-bot",
        {
          name: "Factory Bot",
        },
        setupSpy,
      );

      expect(setupSpy).toHaveBeenCalled();
    });
  });
});

describe("BotInstance", () => {
  let runtime: BotRuntime;

  beforeEach(() => {
    runtime = new BotRuntime(mockServices);
  });

  describe("Channel Restrictions", () => {
    it("should allow all channels when no restrictions", async () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const handler = jest.fn();
      const bot = runtime.register(manifest, {}, (b) => {
        b.onMessage(handler);
      });
      bot.start();

      const ctx: MessageContext = {
        message: {
          messageId: "msg-1",
          channelId: "any-channel",
          userId: "user-1",
          content: "test",
          type: "text",
        },
        channel: { id: "any-channel", name: "any", type: "public" },
        user: { id: "user-1", displayName: "Test User" },
        isCommand: false,
        isMention: false,
        isThread: false,
        isDirect: false,
      };

      await bot.handleMessage(ctx);
      expect(handler).toHaveBeenCalled();
    });

    it("should restrict to specified channels", async () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const handler = jest.fn();
      const bot = runtime.register(
        manifest,
        { channels: ["allowed-channel"] },
        (b) => {
          b.onMessage(handler);
        },
      );
      bot.start();

      const allowedCtx: MessageContext = {
        message: {
          messageId: "msg-1",
          channelId: "allowed-channel",
          userId: "user-1",
          content: "test",
          type: "text",
        },
        channel: { id: "allowed-channel", name: "allowed", type: "public" },
        user: { id: "user-1", displayName: "Test User" },
        isCommand: false,
        isMention: false,
        isThread: false,
        isDirect: false,
      };

      const disallowedCtx: MessageContext = {
        ...allowedCtx,
        message: { ...allowedCtx.message, channelId: "disallowed-channel" },
        channel: {
          id: "disallowed-channel",
          name: "disallowed",
          type: "public",
        },
      };

      await bot.handleMessage(allowedCtx);
      expect(handler).toHaveBeenCalledTimes(1);

      await bot.handleMessage(disallowedCtx);
      expect(handler).toHaveBeenCalledTimes(1); // Still 1, not called for disallowed
    });
  });

  describe("Cleanup", () => {
    it("should register cleanup functions", () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const cleanupSpy = jest.fn();
      const bot = runtime.register(manifest);

      bot.registerCleanup(cleanupSpy);
      bot.stop();

      expect(cleanupSpy).toHaveBeenCalled();
    });

    it("should call all cleanup functions on stop", () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const cleanup1 = jest.fn();
      const cleanup2 = jest.fn();
      const bot = runtime.register(manifest);

      bot.registerCleanup(cleanup1);
      bot.registerCleanup(cleanup2);
      bot.stop();

      expect(cleanup1).toHaveBeenCalled();
      expect(cleanup2).toHaveBeenCalled();
    });

    it("should handle errors in cleanup functions", () => {
      const manifest: BotManifest = {
        id: "test-bot",
        name: "Test Bot",
        description: "Test",
        version: "1.0.0",
        permissions: [],
      };

      const goodCleanup = jest.fn();
      const badCleanup = jest.fn(() => {
        throw new Error("Cleanup error");
      });

      const bot = runtime.register(manifest);
      bot.registerCleanup(badCleanup);
      bot.registerCleanup(goodCleanup);

      // Should not throw
      expect(() => bot.stop()).not.toThrow();
      expect(goodCleanup).toHaveBeenCalled();
    });
  });
});
