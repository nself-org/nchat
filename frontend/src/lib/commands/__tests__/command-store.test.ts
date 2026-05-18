/**
 * Tests for Command Store
 *
 * Tests for the Zustand store managing command state, history, favorites, and effects.
 */

import { act, renderHook } from "@testing-library/react";
import {
  useCommandStore,
  selectMenuState,
  selectIsMenuOpen,
  selectMenuFilter,
  selectSelectedIndex,
  selectPreviewState,
  selectIsPreviewVisible,
  selectHistory,
  selectFavorites,
  selectCustomCommands,
  selectEnabledCustomCommands,
  selectIsExecuting,
  selectLastError,
  selectRecentCommandNames,
  selectCommandUsageCount,
} from "../command-store";

// Reset store before each test
beforeEach(() => {
  const { result } = renderHook(() => useCommandStore());
  act(() => {
    result.current.reset();
    // Clear persisted data
    result.current.clearHistory();
    result.current.favorites.forEach((f) => result.current.removeFavorite(f));
    result.current.customCommands.forEach((c) =>
      result.current.removeCustomCommand(c.name),
    );
  });
});

describe("Command Menu Actions", () => {
  describe("openMenu", () => {
    it("should open the menu", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.openMenu();
      });

      expect(result.current.menu.isOpen).toBe(true);
    });

    it("should set trigger position", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.openMenu(42);
      });

      expect(result.current.menu.triggerPosition).toBe(42);
    });

    it("should reset filter and selection", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.setFilter("test");
        result.current.setSelectedIndex(5);
        result.current.openMenu();
      });

      expect(result.current.menu.filter).toBe("");
      expect(result.current.menu.selectedIndex).toBe(0);
    });
  });

  describe("closeMenu", () => {
    it("should close the menu", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.openMenu();
        result.current.closeMenu();
      });

      expect(result.current.menu.isOpen).toBe(false);
    });

    it("should reset filter and selection", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.openMenu();
        result.current.setFilter("test");
        result.current.setSelectedIndex(3);
        result.current.closeMenu();
      });

      expect(result.current.menu.filter).toBe("");
      expect(result.current.menu.selectedIndex).toBe(0);
    });
  });

  describe("setFilter", () => {
    it("should update the filter", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.setFilter("shr");
      });

      expect(result.current.menu.filter).toBe("shr");
    });

    it("should reset selection index when filter changes", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.setSelectedIndex(5);
        result.current.setFilter("test");
      });

      expect(result.current.menu.selectedIndex).toBe(0);
    });
  });

  describe("setSelectedIndex", () => {
    it("should update the selected index", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.setSelectedIndex(3);
      });

      expect(result.current.menu.selectedIndex).toBe(3);
    });
  });

  describe("moveSelection", () => {
    it("should move selection up", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.setSelectedIndex(3);
        result.current.moveSelection("up");
      });

      expect(result.current.menu.selectedIndex).toBe(2);
    });

    it("should not go below 0", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.setSelectedIndex(0);
        result.current.moveSelection("up");
      });

      expect(result.current.menu.selectedIndex).toBe(0);
    });

    it("should move selection down", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.setSelectedIndex(0);
        result.current.moveSelection("down");
      });

      expect(result.current.menu.selectedIndex).toBe(1);
    });
  });
});

describe("Preview Actions", () => {
  describe("showPreview", () => {
    it("should show preview with parsed command and result", () => {
      const { result } = renderHook(() => useCommandStore());

      const mockParsed = { commandName: "test", valid: true } as any;
      const mockResult = { success: true, type: "message" } as any;

      act(() => {
        result.current.showPreview(mockParsed, mockResult);
      });

      expect(result.current.preview.isVisible).toBe(true);
      expect(result.current.preview.parsedCommand).toEqual(mockParsed);
      expect(result.current.preview.result).toEqual(mockResult);
      expect(result.current.preview.isLoading).toBe(false);
    });
  });

  describe("hidePreview", () => {
    it("should hide preview and clear state", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.showPreview(
          { commandName: "test" } as any,
          { success: true } as any,
        );
        result.current.hidePreview();
      });

      expect(result.current.preview.isVisible).toBe(false);
      expect(result.current.preview.parsedCommand).toBeNull();
      expect(result.current.preview.result).toBeNull();
    });
  });

  describe("setPreviewLoading", () => {
    it("should update loading state", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.setPreviewLoading(true);
      });

      expect(result.current.preview.isLoading).toBe(true);

      act(() => {
        result.current.setPreviewLoading(false);
      });

      expect(result.current.preview.isLoading).toBe(false);
    });
  });
});

describe("History Actions", () => {
  describe("addToHistory", () => {
    it("should add entry to history", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addToHistory({
          commandString: "/shrug",
          commandName: "shrug",
          executedAt: Date.now(),
          success: true,
        });
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].commandName).toBe("shrug");
    });

    it("should add new entries at the beginning", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addToHistory({
          commandString: "/first",
          commandName: "first",
          executedAt: Date.now(),
          success: true,
        });
        result.current.addToHistory({
          commandString: "/second",
          commandName: "second",
          executedAt: Date.now(),
          success: true,
        });
      });

      expect(result.current.history[0].commandName).toBe("second");
      expect(result.current.history[1].commandName).toBe("first");
    });

    it("should generate unique ids", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addToHistory({
          commandString: "/test",
          commandName: "test",
          executedAt: Date.now(),
          success: true,
        });
        result.current.addToHistory({
          commandString: "/test",
          commandName: "test",
          executedAt: Date.now(),
          success: true,
        });
      });

      expect(result.current.history[0].id).not.toBe(
        result.current.history[1].id,
      );
    });

    it("should respect max history length", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        // Add more than maxHistoryLength entries
        for (let i = 0; i < 105; i++) {
          result.current.addToHistory({
            commandString: `/cmd${i}`,
            commandName: `cmd${i}`,
            executedAt: Date.now(),
            success: true,
          });
        }
      });

      expect(result.current.history.length).toBeLessThanOrEqual(
        result.current.maxHistoryLength,
      );
    });
  });

  describe("clearHistory", () => {
    it("should clear all history", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addToHistory({
          commandString: "/test",
          commandName: "test",
          executedAt: Date.now(),
          success: true,
        });
        result.current.clearHistory();
      });

      expect(result.current.history).toHaveLength(0);
    });
  });

  describe("removeFromHistory", () => {
    it("should remove specific entry by id", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addToHistory({
          commandString: "/test1",
          commandName: "test1",
          executedAt: Date.now(),
          success: true,
        });
        result.current.addToHistory({
          commandString: "/test2",
          commandName: "test2",
          executedAt: Date.now(),
          success: true,
        });
      });

      const idToRemove = result.current.history[0].id;

      act(() => {
        result.current.removeFromHistory(idToRemove);
      });

      expect(result.current.history).toHaveLength(1);
      expect(result.current.history[0].commandName).toBe("test1");
    });
  });

  describe("getRecentCommands", () => {
    it("should return recent commands", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.addToHistory({
            commandString: `/cmd${i}`,
            commandName: `cmd${i}`,
            executedAt: Date.now(),
            success: true,
          });
        }
      });

      const recent = result.current.getRecentCommands(5);

      expect(recent).toHaveLength(5);
    });

    it("should default to 10 entries", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        for (let i = 0; i < 15; i++) {
          result.current.addToHistory({
            commandString: `/cmd${i}`,
            commandName: `cmd${i}`,
            executedAt: Date.now(),
            success: true,
          });
        }
      });

      const recent = result.current.getRecentCommands();

      expect(recent).toHaveLength(10);
    });
  });
});

describe("Favorites Actions", () => {
  describe("addFavorite", () => {
    it("should add command to favorites", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addFavorite("shrug");
      });

      expect(result.current.favorites).toContain("shrug");
    });

    it("should not add duplicates", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addFavorite("shrug");
        result.current.addFavorite("shrug");
      });

      expect(
        result.current.favorites.filter((f) => f === "shrug"),
      ).toHaveLength(1);
    });
  });

  describe("removeFavorite", () => {
    it("should remove command from favorites", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addFavorite("shrug");
        result.current.removeFavorite("shrug");
      });

      expect(result.current.favorites).not.toContain("shrug");
    });
  });

  describe("toggleFavorite", () => {
    it("should add if not in favorites", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.toggleFavorite("status");
      });

      expect(result.current.favorites).toContain("status");
    });

    it("should remove if already in favorites", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addFavorite("status");
        result.current.toggleFavorite("status");
      });

      expect(result.current.favorites).not.toContain("status");
    });
  });

  describe("isFavorite", () => {
    it("should return true for favorites", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addFavorite("shrug");
      });

      expect(result.current.isFavorite("shrug")).toBe(true);
    });

    it("should return false for non-favorites", () => {
      const { result } = renderHook(() => useCommandStore());

      expect(result.current.isFavorite("notfavorite")).toBe(false);
    });
  });
});

describe("Custom Commands Actions", () => {
  const mockCustomCommand = {
    name: "mybot",
    description: "Custom bot command",
    usage: "/mybot [action]",
    category: "custom" as const,
    args: [],
    source: "bot" as const,
    sourceId: "bot-123",
    enabled: true,
  };

  describe("addCustomCommand", () => {
    it("should add custom command", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addCustomCommand(mockCustomCommand);
      });

      expect(result.current.customCommands).toHaveLength(1);
      expect(result.current.customCommands[0].name).toBe("mybot");
      expect(result.current.customCommands[0].createdAt).toBeDefined();
    });

    it("should not add duplicate commands", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addCustomCommand(mockCustomCommand);
        result.current.addCustomCommand(mockCustomCommand);
      });

      expect(result.current.customCommands).toHaveLength(1);
    });
  });

  describe("removeCustomCommand", () => {
    it("should remove custom command by name", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addCustomCommand(mockCustomCommand);
        result.current.removeCustomCommand("mybot");
      });

      expect(result.current.customCommands).toHaveLength(0);
    });
  });

  describe("updateCustomCommand", () => {
    it("should update existing command", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addCustomCommand(mockCustomCommand);
        result.current.updateCustomCommand("mybot", {
          description: "Updated description",
        });
      });

      expect(result.current.customCommands[0].description).toBe(
        "Updated description",
      );
    });
  });

  describe("toggleCustomCommand", () => {
    it("should toggle enabled state", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addCustomCommand(mockCustomCommand);
        result.current.toggleCustomCommand("mybot");
      });

      expect(result.current.customCommands[0].enabled).toBe(false);

      act(() => {
        result.current.toggleCustomCommand("mybot");
      });

      expect(result.current.customCommands[0].enabled).toBe(true);
    });
  });

  describe("getCustomCommand", () => {
    it("should return command by name", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addCustomCommand(mockCustomCommand);
      });

      expect(result.current.getCustomCommand("mybot")).toBeDefined();
      expect(result.current.getCustomCommand("mybot")?.name).toBe("mybot");
    });

    it("should return undefined for non-existent command", () => {
      const { result } = renderHook(() => useCommandStore());

      expect(result.current.getCustomCommand("nonexistent")).toBeUndefined();
    });
  });
});

describe("Effect Actions", () => {
  describe("addPendingEffect", () => {
    it("should add pending effect", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addPendingEffect({
          commandName: "remind",
          effect: { type: "set_reminder", payload: { message: "Test" } },
          executeAt: Date.now() + 3600000,
        });
      });

      expect(result.current.pendingEffects).toHaveLength(1);
      expect(result.current.pendingEffects[0].executed).toBe(false);
    });
  });

  describe("markEffectExecuted", () => {
    it("should mark effect as executed", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addPendingEffect({
          commandName: "remind",
          effect: { type: "set_reminder", payload: {} },
        });
      });

      const effectId = result.current.pendingEffects[0].id;

      act(() => {
        result.current.markEffectExecuted(effectId);
      });

      expect(result.current.pendingEffects[0].executed).toBe(true);
    });
  });

  describe("removePendingEffect", () => {
    it("should remove effect by id", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addPendingEffect({
          commandName: "remind",
          effect: { type: "set_reminder", payload: {} },
        });
      });

      const effectId = result.current.pendingEffects[0].id;

      act(() => {
        result.current.removePendingEffect(effectId);
      });

      expect(result.current.pendingEffects).toHaveLength(0);
    });
  });

  describe("getReadyEffects", () => {
    it("should return effects ready to execute", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        // Effect ready now
        result.current.addPendingEffect({
          commandName: "test1",
          effect: { type: "set_reminder", payload: {} },
          executeAt: Date.now() - 1000, // In the past
        });
        // Effect not yet ready
        result.current.addPendingEffect({
          commandName: "test2",
          effect: { type: "set_reminder", payload: {} },
          executeAt: Date.now() + 3600000, // In the future
        });
        // Effect with no executeAt (ready immediately)
        result.current.addPendingEffect({
          commandName: "test3",
          effect: { type: "update_status", payload: {} },
        });
      });

      const readyEffects = result.current.getReadyEffects();

      expect(readyEffects).toHaveLength(2);
    });

    it("should not return executed effects", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.addPendingEffect({
          commandName: "test",
          effect: { type: "set_reminder", payload: {} },
        });
      });

      const effectId = result.current.pendingEffects[0].id;

      act(() => {
        result.current.markEffectExecuted(effectId);
      });

      const readyEffects = result.current.getReadyEffects();

      expect(readyEffects).toHaveLength(0);
    });
  });
});

describe("Execution Actions", () => {
  describe("setExecuting", () => {
    it("should update executing state", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.setExecuting(true);
      });

      expect(result.current.isExecuting).toBe(true);

      act(() => {
        result.current.setExecuting(false);
      });

      expect(result.current.isExecuting).toBe(false);
    });
  });

  describe("setError", () => {
    it("should set error message", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.setError("Something went wrong");
      });

      expect(result.current.lastError).toBe("Something went wrong");
    });

    it("should clear error with null", () => {
      const { result } = renderHook(() => useCommandStore());

      act(() => {
        result.current.setError("Error");
        result.current.setError(null);
      });

      expect(result.current.lastError).toBeNull();
    });
  });
});

describe("Reset Action", () => {
  it("should reset transient state but preserve persisted data", () => {
    const { result } = renderHook(() => useCommandStore());

    act(() => {
      result.current.openMenu();
      result.current.setFilter("test");
      result.current.setExecuting(true);
      result.current.setError("Error");
      result.current.addToHistory({
        commandString: "/test",
        commandName: "test",
        executedAt: Date.now(),
        success: true,
      });
      result.current.addFavorite("shrug");
    });

    act(() => {
      result.current.reset();
    });

    // Transient state should be reset
    expect(result.current.menu.isOpen).toBe(false);
    expect(result.current.menu.filter).toBe("");
    expect(result.current.isExecuting).toBe(false);
    expect(result.current.lastError).toBeNull();

    // Persisted data should be preserved
    expect(result.current.history.length).toBeGreaterThan(0);
    expect(result.current.favorites).toContain("shrug");
  });
});

describe("Selectors", () => {
  it("selectMenuState should return menu state", () => {
    const { result } = renderHook(() => useCommandStore());

    act(() => {
      result.current.openMenu(10);
      result.current.setFilter("test");
    });

    const menuState = selectMenuState(result.current);

    expect(menuState.isOpen).toBe(true);
    expect(menuState.filter).toBe("test");
    expect(menuState.triggerPosition).toBe(10);
  });

  it("selectIsMenuOpen should return open state", () => {
    const { result } = renderHook(() => useCommandStore());

    expect(selectIsMenuOpen(result.current)).toBe(false);

    act(() => {
      result.current.openMenu();
    });

    expect(selectIsMenuOpen(result.current)).toBe(true);
  });

  it("selectRecentCommandNames should return unique command names", () => {
    const { result } = renderHook(() => useCommandStore());

    act(() => {
      result.current.addToHistory({
        commandString: "/shrug",
        commandName: "shrug",
        executedAt: Date.now(),
        success: true,
      });
      result.current.addToHistory({
        commandString: "/shrug",
        commandName: "shrug",
        executedAt: Date.now(),
        success: true,
      });
      result.current.addToHistory({
        commandString: "/status",
        commandName: "status",
        executedAt: Date.now(),
        success: true,
      });
      result.current.addToHistory({
        commandString: "/failed",
        commandName: "failed",
        executedAt: Date.now(),
        success: false,
      });
    });

    const recentNames = selectRecentCommandNames(result.current);

    // Should only include successful commands and be unique
    expect(recentNames).toContain("shrug");
    expect(recentNames).toContain("status");
    expect(recentNames.filter((n) => n === "shrug")).toHaveLength(1);
    // Failed command should not be included
    expect(recentNames).not.toContain("failed");
  });

  it("selectCommandUsageCount should return usage count", () => {
    const { result } = renderHook(() => useCommandStore());

    act(() => {
      result.current.addToHistory({
        commandString: "/shrug",
        commandName: "shrug",
        executedAt: Date.now(),
        success: true,
      });
      result.current.addToHistory({
        commandString: "/shrug",
        commandName: "shrug",
        executedAt: Date.now(),
        success: true,
      });
      result.current.addToHistory({
        commandString: "/status",
        commandName: "status",
        executedAt: Date.now(),
        success: true,
      });
    });

    const getCount = selectCommandUsageCount(result.current);

    expect(getCount("shrug")).toBe(2);
    expect(getCount("status")).toBe(1);
    expect(getCount("unused")).toBe(0);
  });

  it("selectEnabledCustomCommands should return only enabled commands", () => {
    const { result } = renderHook(() => useCommandStore());

    act(() => {
      result.current.addCustomCommand({
        name: "enabled",
        description: "Enabled command",
        usage: "/enabled",
        category: "custom",
        args: [],
        source: "bot",
        sourceId: "bot-1",
        enabled: true,
      });
      result.current.addCustomCommand({
        name: "disabled",
        description: "Disabled command",
        usage: "/disabled",
        category: "custom",
        args: [],
        source: "bot",
        sourceId: "bot-2",
        enabled: false,
      });
    });

    const enabled = selectEnabledCustomCommands(result.current);

    expect(enabled).toHaveLength(1);
    expect(enabled[0].name).toBe("enabled");
  });
});
