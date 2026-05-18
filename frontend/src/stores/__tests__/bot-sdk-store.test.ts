/**
 * Bot SDK Store Tests
 * Comprehensive tests for the bot SDK Zustand store
 */

import { act } from "@testing-library/react";
import {
  useBotSdkStore,
  selectInstalledBots,
  selectMarketplaceBots,
  selectFeaturedBots,
  selectFilteredInstalledBots,
  selectFilteredMarketplaceBots,
  selectBotsByStatus,
  selectOnlineBots,
  selectOfflineBots,
  selectBotsByPermission,
  selectBotById,
  selectIsInstalled,
  selectBotCount,
  selectCategories,
  createMockInstalledBot,
  createMockMarketplaceBot,
} from "../bot-sdk-store";
import type {
  InstalledBot,
  MarketplaceBot,
  BotPermission,
} from "@/lib/bot-sdk/types";

// ============================================================================
// TEST DATA
// ============================================================================

const createTestInstalledBot = (
  id: string,
  overrides: Partial<InstalledBot> = {},
): InstalledBot => ({
  id,
  name: `Bot ${id}`,
  description: "Test bot",
  version: "1.0.0",
  status: "online",
  permissions: ["read_messages", "send_messages"],
  installedAt: new Date(),
  installedBy: "user_1",
  ...overrides,
});

const createTestMarketplaceBot = (
  id: string,
  overrides: Partial<MarketplaceBot> = {},
): MarketplaceBot => ({
  id,
  name: `Marketplace Bot ${id}`,
  description: "A marketplace bot",
  version: "1.0.0",
  author: "Developer",
  category: "productivity",
  tags: ["automation"],
  rating: 4.5,
  ratingCount: 100,
  installCount: 1000,
  permissions: ["read_messages"],
  features: ["Feature 1"],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

// ============================================================================
// STORE TESTS
// ============================================================================

describe("useBotSdkStore", () => {
  beforeEach(() => {
    act(() => {
      useBotSdkStore.getState().reset();
    });
  });

  // ==========================================================================
  // INITIAL STATE TESTS
  // ==========================================================================

  describe("Initial State", () => {
    it("should have empty installed bots", () => {
      const state = useBotSdkStore.getState();
      expect(Object.keys(state.installedBots)).toHaveLength(0);
      expect(state.installedBotsOrder).toHaveLength(0);
    });

    it("should have empty marketplace bots", () => {
      const state = useBotSdkStore.getState();
      expect(Object.keys(state.marketplaceBots)).toHaveLength(0);
    });

    it("should have no selected bot", () => {
      expect(useBotSdkStore.getState().selectedBotId).toBeNull();
    });

    it("should have default filters", () => {
      const state = useBotSdkStore.getState();
      expect(state.searchQuery).toBe("");
      expect(state.categoryFilter).toBeNull();
      expect(state.statusFilter).toBe("all");
    });

    it("should have false loading states", () => {
      const state = useBotSdkStore.getState();
      expect(state.isLoadingInstalled).toBe(false);
      expect(state.isLoadingMarketplace).toBe(false);
      expect(state.isInstalling).toBeNull();
      expect(state.isUninstalling).toBeNull();
    });

    it("should have no error", () => {
      expect(useBotSdkStore.getState().error).toBeNull();
    });
  });

  // ==========================================================================
  // INSTALLED BOTS TESTS
  // ==========================================================================

  describe("setInstalledBots", () => {
    it("should set installed bots", () => {
      const bots = [
        createTestInstalledBot("bot_1"),
        createTestInstalledBot("bot_2"),
      ];

      act(() => useBotSdkStore.getState().setInstalledBots(bots));

      const state = useBotSdkStore.getState();
      expect(Object.keys(state.installedBots)).toHaveLength(2);
      expect(state.installedBotsOrder).toEqual(["bot_1", "bot_2"]);
    });

    it("should replace existing bots", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .setInstalledBots([createTestInstalledBot("old_bot")]),
      );
      act(() =>
        useBotSdkStore
          .getState()
          .setInstalledBots([createTestInstalledBot("new_bot")]),
      );

      const state = useBotSdkStore.getState();
      expect(state.installedBots["old_bot"]).toBeUndefined();
      expect(state.installedBots["new_bot"]).toBeDefined();
    });
  });

  describe("addInstalledBot", () => {
    it("should add a new bot", () => {
      const bot = createTestInstalledBot("bot_1");
      act(() => useBotSdkStore.getState().addInstalledBot(bot));

      const state = useBotSdkStore.getState();
      expect(state.installedBots["bot_1"]).toEqual(bot);
      expect(state.installedBotsOrder).toContain("bot_1");
    });

    it("should not duplicate bot in order", () => {
      const bot = createTestInstalledBot("bot_1");
      act(() => useBotSdkStore.getState().addInstalledBot(bot));
      act(() => useBotSdkStore.getState().addInstalledBot(bot));

      const state = useBotSdkStore.getState();
      expect(
        state.installedBotsOrder.filter((id) => id === "bot_1"),
      ).toHaveLength(1);
    });
  });

  describe("removeInstalledBot", () => {
    it("should remove a bot", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_1")),
      );
      act(() => useBotSdkStore.getState().removeInstalledBot("bot_1"));

      const state = useBotSdkStore.getState();
      expect(state.installedBots["bot_1"]).toBeUndefined();
      expect(state.installedBotsOrder).not.toContain("bot_1");
    });

    it("should clear selection if removed bot was selected", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_1")),
      );
      act(() => useBotSdkStore.getState().selectBot("bot_1"));
      act(() => useBotSdkStore.getState().removeInstalledBot("bot_1"));

      expect(useBotSdkStore.getState().selectedBotId).toBeNull();
    });
  });

  describe("updateInstalledBot", () => {
    it("should update bot properties", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_1")),
      );
      act(() =>
        useBotSdkStore
          .getState()
          .updateInstalledBot("bot_1", { name: "Updated Bot" }),
      );

      expect(useBotSdkStore.getState().installedBots["bot_1"].name).toBe(
        "Updated Bot",
      );
    });

    it("should not create bot if not exists", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .updateInstalledBot("nonexistent", { name: "Test" }),
      );
      expect(
        useBotSdkStore.getState().installedBots["nonexistent"],
      ).toBeUndefined();
    });
  });

  // ==========================================================================
  // BOT STATUS TESTS
  // ==========================================================================

  describe("setBotStatus", () => {
    it("should update bot status", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_1")),
      );
      act(() => useBotSdkStore.getState().setBotStatus("bot_1", "offline"));

      expect(useBotSdkStore.getState().installedBots["bot_1"].status).toBe(
        "offline",
      );
    });
  });

  describe("setBotPermissions", () => {
    it("should update bot permissions", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_1")),
      );
      act(() =>
        useBotSdkStore.getState().setBotPermissions("bot_1", ["admin"]),
      );

      expect(
        useBotSdkStore.getState().installedBots["bot_1"].permissions,
      ).toEqual(["admin"]);
    });
  });

  describe("setBotChannels", () => {
    it("should update bot channels", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_1")),
      );
      act(() =>
        useBotSdkStore.getState().setBotChannels("bot_1", ["ch_1", "ch_2"]),
      );

      expect(useBotSdkStore.getState().installedBots["bot_1"].channels).toEqual(
        ["ch_1", "ch_2"],
      );
    });
  });

  // ==========================================================================
  // MARKETPLACE TESTS
  // ==========================================================================

  describe("setMarketplaceBots", () => {
    it("should set marketplace bots", () => {
      const bots = [
        createTestMarketplaceBot("mp_1"),
        createTestMarketplaceBot("mp_2"),
      ];

      act(() => useBotSdkStore.getState().setMarketplaceBots(bots));

      const state = useBotSdkStore.getState();
      expect(Object.keys(state.marketplaceBots)).toHaveLength(2);
    });
  });

  describe("setFeaturedBots", () => {
    it("should set featured bot IDs", () => {
      act(() => useBotSdkStore.getState().setFeaturedBots(["mp_1", "mp_2"]));

      expect(useBotSdkStore.getState().featuredBots).toEqual(["mp_1", "mp_2"]);
    });
  });

  describe("setCategories", () => {
    it("should set categories", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .setCategories(["productivity", "fun", "moderation"]),
      );

      expect(useBotSdkStore.getState().categories).toEqual([
        "productivity",
        "fun",
        "moderation",
      ]);
    });
  });

  // ==========================================================================
  // SELECTION TESTS
  // ==========================================================================

  describe("selectBot", () => {
    it("should select a bot", () => {
      act(() => useBotSdkStore.getState().selectBot("bot_1"));
      expect(useBotSdkStore.getState().selectedBotId).toBe("bot_1");
    });

    it("should clear selection", () => {
      act(() => useBotSdkStore.getState().selectBot("bot_1"));
      act(() => useBotSdkStore.getState().selectBot(null));
      expect(useBotSdkStore.getState().selectedBotId).toBeNull();
    });
  });

  describe("getSelectedBot", () => {
    it("should return null when no selection", () => {
      expect(useBotSdkStore.getState().getSelectedBot()).toBeNull();
    });

    it("should return installed bot", () => {
      const bot = createTestInstalledBot("bot_1");
      act(() => useBotSdkStore.getState().addInstalledBot(bot));
      act(() => useBotSdkStore.getState().selectBot("bot_1"));

      expect(useBotSdkStore.getState().getSelectedBot()).toEqual(bot);
    });

    it("should return marketplace bot", () => {
      const bot = createTestMarketplaceBot("mp_1");
      act(() => useBotSdkStore.getState().setMarketplaceBots([bot]));
      act(() => useBotSdkStore.getState().selectBot("mp_1"));

      expect(useBotSdkStore.getState().getSelectedBot()).toEqual(bot);
    });
  });

  // ==========================================================================
  // FILTERING TESTS
  // ==========================================================================

  describe("setSearchQuery", () => {
    it("should set search query", () => {
      act(() => useBotSdkStore.getState().setSearchQuery("test"));
      expect(useBotSdkStore.getState().searchQuery).toBe("test");
    });
  });

  describe("setCategoryFilter", () => {
    it("should set category filter", () => {
      act(() => useBotSdkStore.getState().setCategoryFilter("productivity"));
      expect(useBotSdkStore.getState().categoryFilter).toBe("productivity");
    });
  });

  describe("setStatusFilter", () => {
    it("should set status filter", () => {
      act(() => useBotSdkStore.getState().setStatusFilter("online"));
      expect(useBotSdkStore.getState().statusFilter).toBe("online");
    });
  });

  describe("clearFilters", () => {
    it("should reset all filters", () => {
      act(() => {
        useBotSdkStore.getState().setSearchQuery("test");
        useBotSdkStore.getState().setCategoryFilter("productivity");
        useBotSdkStore.getState().setStatusFilter("online");
      });

      act(() => useBotSdkStore.getState().clearFilters());

      const state = useBotSdkStore.getState();
      expect(state.searchQuery).toBe("");
      expect(state.categoryFilter).toBeNull();
      expect(state.statusFilter).toBe("all");
    });
  });

  // ==========================================================================
  // LOADING STATES TESTS
  // ==========================================================================

  describe("Loading States", () => {
    it("should set loading installed", () => {
      act(() => useBotSdkStore.getState().setLoadingInstalled(true));
      expect(useBotSdkStore.getState().isLoadingInstalled).toBe(true);
    });

    it("should set loading marketplace", () => {
      act(() => useBotSdkStore.getState().setLoadingMarketplace(true));
      expect(useBotSdkStore.getState().isLoadingMarketplace).toBe(true);
    });

    it("should set installing", () => {
      act(() => useBotSdkStore.getState().setInstalling("bot_1"));
      expect(useBotSdkStore.getState().isInstalling).toBe("bot_1");
    });

    it("should set uninstalling", () => {
      act(() => useBotSdkStore.getState().setUninstalling("bot_1"));
      expect(useBotSdkStore.getState().isUninstalling).toBe("bot_1");
    });
  });

  // ==========================================================================
  // ERROR TESTS
  // ==========================================================================

  describe("setError", () => {
    it("should set error", () => {
      act(() => useBotSdkStore.getState().setError("Something went wrong"));
      expect(useBotSdkStore.getState().error).toBe("Something went wrong");
    });

    it("should clear error", () => {
      act(() => useBotSdkStore.getState().setError("Error"));
      act(() => useBotSdkStore.getState().setError(null));
      expect(useBotSdkStore.getState().error).toBeNull();
    });
  });

  // ==========================================================================
  // UTILITY TESTS
  // ==========================================================================

  describe("reset", () => {
    it("should reset to initial state", () => {
      act(() => {
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_1"));
        useBotSdkStore.getState().setSearchQuery("test");
        useBotSdkStore.getState().setError("error");
      });

      act(() => useBotSdkStore.getState().reset());

      const state = useBotSdkStore.getState();
      expect(Object.keys(state.installedBots)).toHaveLength(0);
      expect(state.searchQuery).toBe("");
      expect(state.error).toBeNull();
    });
  });

  describe("isInstalled", () => {
    it("should return true for installed bot", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_1")),
      );
      expect(useBotSdkStore.getState().isInstalled("bot_1")).toBe(true);
    });

    it("should return false for not installed bot", () => {
      expect(useBotSdkStore.getState().isInstalled("bot_1")).toBe(false);
    });
  });

  describe("getBot", () => {
    it("should get installed bot", () => {
      const bot = createTestInstalledBot("bot_1");
      act(() => useBotSdkStore.getState().addInstalledBot(bot));
      expect(useBotSdkStore.getState().getBot("bot_1")).toEqual(bot);
    });

    it("should get marketplace bot", () => {
      const bot = createTestMarketplaceBot("mp_1");
      act(() => useBotSdkStore.getState().setMarketplaceBots([bot]));
      expect(useBotSdkStore.getState().getBot("mp_1")).toEqual(bot);
    });

    it("should prioritize installed over marketplace", () => {
      const installed = createTestInstalledBot("bot_1");
      const marketplace = createTestMarketplaceBot("bot_1");

      act(() => {
        useBotSdkStore.getState().addInstalledBot(installed);
        useBotSdkStore.getState().setMarketplaceBots([marketplace]);
      });

      expect(useBotSdkStore.getState().getBot("bot_1")).toEqual(installed);
    });
  });

  describe("getBotPermissions", () => {
    it("should return bot permissions", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .addInstalledBot(
            createTestInstalledBot("bot_1", { permissions: ["admin"] }),
          ),
      );

      expect(useBotSdkStore.getState().getBotPermissions("bot_1")).toEqual([
        "admin",
      ]);
    });

    it("should return empty array for non-existent bot", () => {
      expect(
        useBotSdkStore.getState().getBotPermissions("nonexistent"),
      ).toEqual([]);
    });
  });

  describe("hasPermission", () => {
    it("should return true if bot has permission", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .addInstalledBot(
            createTestInstalledBot("bot_1", { permissions: ["send_messages"] }),
          ),
      );

      expect(
        useBotSdkStore.getState().hasPermission("bot_1", "send_messages"),
      ).toBe(true);
    });

    it("should return true for admin permission", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .addInstalledBot(
            createTestInstalledBot("bot_1", { permissions: ["admin"] }),
          ),
      );

      expect(
        useBotSdkStore.getState().hasPermission("bot_1", "send_messages"),
      ).toBe(true);
    });

    it("should return false if bot lacks permission", () => {
      act(() =>
        useBotSdkStore
          .getState()
          .addInstalledBot(
            createTestInstalledBot("bot_1", { permissions: ["read_messages"] }),
          ),
      );

      expect(
        useBotSdkStore.getState().hasPermission("bot_1", "send_messages"),
      ).toBe(false);
    });
  });
});

// ============================================================================
// SELECTOR TESTS
// ============================================================================

describe("Selectors", () => {
  beforeEach(() => {
    act(() => useBotSdkStore.getState().reset());
  });

  describe("selectInstalledBots", () => {
    it("should return installed bots in order", () => {
      act(() => {
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_1"));
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_2"));
      });

      const bots = selectInstalledBots(useBotSdkStore.getState());
      expect(bots).toHaveLength(2);
      expect(bots[0].id).toBe("bot_1");
    });
  });

  describe("selectFilteredInstalledBots", () => {
    beforeEach(() => {
      act(() => {
        useBotSdkStore.getState().addInstalledBot(
          createTestInstalledBot("bot_1", {
            name: "Alpha Bot",
            status: "online",
          }),
        );
        useBotSdkStore.getState().addInstalledBot(
          createTestInstalledBot("bot_2", {
            name: "Beta Bot",
            status: "offline",
          }),
        );
      });
    });

    it("should filter by search query", () => {
      act(() => useBotSdkStore.getState().setSearchQuery("alpha"));

      const bots = selectFilteredInstalledBots(useBotSdkStore.getState());
      expect(bots).toHaveLength(1);
      expect(bots[0].name).toBe("Alpha Bot");
    });

    it("should filter by status", () => {
      act(() => useBotSdkStore.getState().setStatusFilter("online"));

      const bots = selectFilteredInstalledBots(useBotSdkStore.getState());
      expect(bots).toHaveLength(1);
      expect(bots[0].status).toBe("online");
    });
  });

  describe("selectFilteredMarketplaceBots", () => {
    beforeEach(() => {
      act(() => {
        useBotSdkStore.getState().setMarketplaceBots([
          createTestMarketplaceBot("mp_1", {
            name: "Productivity Bot",
            category: "productivity",
            tags: ["work"],
          }),
          createTestMarketplaceBot("mp_2", {
            name: "Fun Bot",
            category: "fun",
            tags: ["games"],
          }),
        ]);
      });
    });

    it("should filter by search query", () => {
      act(() => useBotSdkStore.getState().setSearchQuery("productivity"));

      const bots = selectFilteredMarketplaceBots(useBotSdkStore.getState());
      expect(bots).toHaveLength(1);
      expect(bots[0].name).toBe("Productivity Bot");
    });

    it("should filter by tag", () => {
      act(() => useBotSdkStore.getState().setSearchQuery("games"));

      const bots = selectFilteredMarketplaceBots(useBotSdkStore.getState());
      expect(bots).toHaveLength(1);
      expect(bots[0].name).toBe("Fun Bot");
    });

    it("should filter by category", () => {
      act(() => useBotSdkStore.getState().setCategoryFilter("fun"));

      const bots = selectFilteredMarketplaceBots(useBotSdkStore.getState());
      expect(bots).toHaveLength(1);
      expect(bots[0].category).toBe("fun");
    });
  });

  describe("selectBotsByStatus", () => {
    it("should select bots by status", () => {
      act(() => {
        useBotSdkStore
          .getState()
          .addInstalledBot(
            createTestInstalledBot("bot_1", { status: "online" }),
          );
        useBotSdkStore
          .getState()
          .addInstalledBot(
            createTestInstalledBot("bot_2", { status: "offline" }),
          );
      });

      const onlineBots = selectBotsByStatus("online")(
        useBotSdkStore.getState(),
      );
      expect(onlineBots).toHaveLength(1);
    });
  });

  describe("selectOnlineBots", () => {
    it("should select online bots", () => {
      act(() => {
        useBotSdkStore
          .getState()
          .addInstalledBot(
            createTestInstalledBot("bot_1", { status: "online" }),
          );
        useBotSdkStore
          .getState()
          .addInstalledBot(
            createTestInstalledBot("bot_2", { status: "offline" }),
          );
      });

      const bots = selectOnlineBots(useBotSdkStore.getState());
      expect(bots).toHaveLength(1);
    });
  });

  describe("selectBotsByPermission", () => {
    it("should select bots by permission", () => {
      act(() => {
        useBotSdkStore
          .getState()
          .addInstalledBot(
            createTestInstalledBot("bot_1", { permissions: ["admin"] }),
          );
        useBotSdkStore
          .getState()
          .addInstalledBot(
            createTestInstalledBot("bot_2", { permissions: ["read_messages"] }),
          );
      });

      const adminBots = selectBotsByPermission("admin")(
        useBotSdkStore.getState(),
      );
      expect(adminBots).toHaveLength(1);
    });
  });

  describe("selectBotCount", () => {
    it("should return installed bot count", () => {
      act(() => {
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_1"));
        useBotSdkStore
          .getState()
          .addInstalledBot(createTestInstalledBot("bot_2"));
      });

      expect(selectBotCount(useBotSdkStore.getState())).toBe(2);
    });
  });
});

// ============================================================================
// MOCK DATA HELPER TESTS
// ============================================================================

describe("Mock Data Helpers", () => {
  describe("createMockInstalledBot", () => {
    it("should create bot with defaults", () => {
      const bot = createMockInstalledBot();
      expect(bot.id).toBeDefined();
      expect(bot.name).toBe("Test Bot");
      expect(bot.status).toBe("online");
    });

    it("should accept overrides", () => {
      const bot = createMockInstalledBot({
        name: "Custom Bot",
        status: "offline",
      });
      expect(bot.name).toBe("Custom Bot");
      expect(bot.status).toBe("offline");
    });
  });

  describe("createMockMarketplaceBot", () => {
    it("should create bot with defaults", () => {
      const bot = createMockMarketplaceBot();
      expect(bot.id).toBeDefined();
      expect(bot.category).toBe("productivity");
    });

    it("should accept overrides", () => {
      const bot = createMockMarketplaceBot({ category: "fun" });
      expect(bot.category).toBe("fun");
    });
  });
});
