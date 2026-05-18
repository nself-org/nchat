/**
 * Tests for bot-store selectors
 *
 * All selectors are pure functions that receive BotState (not BotStore).
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { BotState } from "../bot-store";
import {
  selectInstalledBots,
  selectInstalledBotsLoading,
  selectMarketplaceBots,
  selectMarketplaceLoading,
  selectFeaturedBots,
  selectCategories,
  selectSelectedBot,
  selectAddBotModalOpen,
  selectSettingsModalOpen,
  selectMarketplaceOpen,
} from "../bot-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<BotState>): BotState {
  const defaultState: BotState = {
    installedBots: [],
    installedBotsLoading: false,
    installedBotsError: null,
    marketplaceBots: [],
    marketplaceLoading: false,
    marketplaceError: null,
    marketplaceFilters: {},
    marketplaceTotalCount: 0,
    featuredBots: [],
    featuredBotsLoading: false,
    categories: [],
    categoriesLoading: false,
    selectedBot: null,
    selectedBotCommands: [],
    selectedBotReviews: [],
    selectedBotLoading: false,
    addBotModalOpen: false,
    settingsModalOpen: false,
    marketplaceOpen: false,
  } as unknown as BotState;
  return { ...defaultState, ...overrides };
}

// ---------------------------------------------------------------------------
// selectInstalledBots
// ---------------------------------------------------------------------------

describe("selectInstalledBots", () => {
  it("returns empty array by default", () => {
    expect(selectInstalledBots(makeState())).toEqual([]);
  });

  it("returns the installedBots array", () => {
    const installedBots = [{ id: "b1" } as never];
    expect(selectInstalledBots(makeState({ installedBots }))).toBe(installedBots);
  });
});

// ---------------------------------------------------------------------------
// selectInstalledBotsLoading
// ---------------------------------------------------------------------------

describe("selectInstalledBotsLoading", () => {
  it("returns false by default", () => {
    expect(selectInstalledBotsLoading(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(selectInstalledBotsLoading(makeState({ installedBotsLoading: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMarketplaceBots
// ---------------------------------------------------------------------------

describe("selectMarketplaceBots", () => {
  it("returns empty array by default", () => {
    expect(selectMarketplaceBots(makeState())).toEqual([]);
  });

  it("returns the marketplaceBots array", () => {
    const marketplaceBots = [{ id: "m1" } as never];
    expect(selectMarketplaceBots(makeState({ marketplaceBots }))).toBe(marketplaceBots);
  });
});

// ---------------------------------------------------------------------------
// selectMarketplaceLoading
// ---------------------------------------------------------------------------

describe("selectMarketplaceLoading", () => {
  it("returns false by default", () => {
    expect(selectMarketplaceLoading(makeState())).toBe(false);
  });

  it("returns true when marketplace is loading", () => {
    expect(selectMarketplaceLoading(makeState({ marketplaceLoading: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectFeaturedBots
// ---------------------------------------------------------------------------

describe("selectFeaturedBots", () => {
  it("returns empty array by default", () => {
    expect(selectFeaturedBots(makeState())).toEqual([]);
  });

  it("returns the featuredBots array", () => {
    const featuredBots = [{ id: "f1" } as never];
    expect(selectFeaturedBots(makeState({ featuredBots }))).toBe(featuredBots);
  });
});

// ---------------------------------------------------------------------------
// selectCategories
// ---------------------------------------------------------------------------

describe("selectCategories", () => {
  it("returns empty array by default", () => {
    expect(selectCategories(makeState())).toEqual([]);
  });

  it("returns the categories array", () => {
    const categories = [{ id: "c1", name: "Productivity" } as never];
    expect(selectCategories(makeState({ categories }))).toBe(categories);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedBot
// ---------------------------------------------------------------------------

describe("selectSelectedBot", () => {
  it("returns null by default", () => {
    expect(selectSelectedBot(makeState())).toBeNull();
  });

  it("returns the selected bot when set", () => {
    const selectedBot = { id: "b42", name: "HelperBot" } as never;
    expect(selectSelectedBot(makeState({ selectedBot }))).toBe(selectedBot);
  });
});

// ---------------------------------------------------------------------------
// selectAddBotModalOpen
// ---------------------------------------------------------------------------

describe("selectAddBotModalOpen", () => {
  it("returns false by default", () => {
    expect(selectAddBotModalOpen(makeState())).toBe(false);
  });

  it("returns true when add-bot modal is open", () => {
    expect(selectAddBotModalOpen(makeState({ addBotModalOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectSettingsModalOpen
// ---------------------------------------------------------------------------

describe("selectSettingsModalOpen", () => {
  it("returns false by default", () => {
    expect(selectSettingsModalOpen(makeState())).toBe(false);
  });

  it("returns true when settings modal is open", () => {
    expect(selectSettingsModalOpen(makeState({ settingsModalOpen: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectMarketplaceOpen
// ---------------------------------------------------------------------------

describe("selectMarketplaceOpen", () => {
  it("returns false by default", () => {
    expect(selectMarketplaceOpen(makeState())).toBe(false);
  });

  it("returns true when marketplace panel is open", () => {
    expect(selectMarketplaceOpen(makeState({ marketplaceOpen: true }))).toBe(true);
  });
});
