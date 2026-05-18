/**
 * Tests for activity-filters.
 */

import {
  filterByCategory,
  filterByTypes,
  filterByChannels,
  filterByUsers,
  filterByReadStatus,
  filterByPriority,
  filterByDateRange,
  filterBySearchQuery,
  applyFilters,
  ACTIVITY_TYPE_TO_CATEGORY,
  getTypesForCategory,
  getCategoryLabel,
  getAllCategories,
  getCategoriesWithActivities,
  getUnreadCountByCategory,
  getCountsByCategory,
  QUICK_FILTERS,
  getQuickFilter,
  combineFilters,
  hasActiveFilters,
  clearFilters,
} from "../activity-filters";

const actor = { id: "u1", displayName: "Alice", username: "alice" };
const channel = (id: string, name: string) => ({
  id,
  name,
  slug: name,
  type: "public" as const,
});
const msg = (content = "hello") => ({
  id: "m",
  content,
  userId: "u1",
  channelId: "c1",
  createdAt: "2024-01-10",
});

const mkActivity = (overrides: any = {}): any => ({
  id: Math.random().toString(),
  type: "message",
  category: "all",
  priority: "normal",
  actor,
  createdAt: "2024-01-15T12:00:00Z",
  isRead: false,
  channel: channel("c1", "general"),
  message: msg(),
  ...overrides,
});

describe("filter primitives", () => {
  const acts = [
    mkActivity({ type: "mention", category: "mentions" }),
    mkActivity({
      type: "reaction",
      category: "reactions",
      isRead: true,
      priority: "high",
    }),
    mkActivity({
      type: "file_shared",
      category: "files",
      file: {
        id: "f1",
        name: "report.pdf",
        type: "pdf",
        mimeType: "application/pdf",
        size: 100,
        url: "",
      },
    }),
  ];

  it("filterByCategory all returns all", () => {
    expect(filterByCategory(acts, "all")).toHaveLength(acts.length);
  });
  it("filterByCategory filters", () => {
    expect(filterByCategory(acts, "files")).toHaveLength(1);
  });
  it("filterByTypes empty returns all", () => {
    expect(filterByTypes(acts, [])).toHaveLength(acts.length);
  });
  it("filterByTypes filters", () => {
    expect(filterByTypes(acts, ["mention"])).toHaveLength(1);
  });
  it("filterByChannels empty returns all", () => {
    expect(filterByChannels(acts, [])).toHaveLength(acts.length);
  });
  it("filterByChannels filters by id", () => {
    expect(filterByChannels(acts, ["c1"])).toHaveLength(acts.length);
    expect(filterByChannels(acts, ["c2"])).toHaveLength(0);
  });
  it("filterByUsers empty returns all", () => {
    expect(filterByUsers(acts, [])).toHaveLength(acts.length);
  });
  it("filterByUsers filters by actor.id", () => {
    expect(filterByUsers(acts, ["u1"])).toHaveLength(acts.length);
    expect(filterByUsers(acts, ["u2"])).toHaveLength(0);
  });
  it("filterByReadStatus", () => {
    expect(filterByReadStatus(acts, true)).toHaveLength(1);
    expect(filterByReadStatus(acts, false)).toHaveLength(2);
  });
  it("filterByPriority", () => {
    expect(filterByPriority(acts, ["high"])).toHaveLength(1);
    expect(filterByPriority(acts, [])).toHaveLength(acts.length);
  });
  it("filterByDateRange from/to", () => {
    const inRange = filterByDateRange(acts, "2024-01-01", "2024-01-31");
    expect(inRange).toHaveLength(acts.length);
    const outOfRange = filterByDateRange(acts, "2024-02-01", "2024-02-28");
    expect(outOfRange).toHaveLength(0);
  });
});

describe("filterBySearchQuery", () => {
  const acts = [
    mkActivity({
      actor: { id: "u1", displayName: "Alice", username: "alice" },
    }),
    mkActivity({ channel: channel("c2", "random") }),
    mkActivity({ type: "system", title: "Welcome to nchat", body: "info" }),
    mkActivity({
      type: "task_assigned",
      task: { id: "t", title: "Fix bug", status: "pending" },
    }),
    mkActivity({
      type: "file_shared",
      file: {
        name: "report.pdf",
        id: "f",
        type: "pdf",
        mimeType: "x",
        size: 0,
        url: "",
      },
    }),
  ];
  it("returns all for empty query", () => {
    expect(filterBySearchQuery(acts, "   ")).toHaveLength(acts.length);
  });
  it("matches actor name", () => {
    expect(filterBySearchQuery(acts, "Alice").length).toBeGreaterThan(0);
  });
  it("matches channel name", () => {
    expect(filterBySearchQuery(acts, "random").length).toBeGreaterThan(0);
  });
  it("matches system title", () => {
    expect(filterBySearchQuery(acts, "welcome").length).toBeGreaterThan(0);
  });
  it("matches task title", () => {
    expect(filterBySearchQuery(acts, "fix bug").length).toBe(1);
  });
  it("matches file name", () => {
    expect(filterBySearchQuery(acts, "report").length).toBeGreaterThan(0);
  });
  it("no matches", () => {
    expect(filterBySearchQuery(acts, "zzzzz")).toHaveLength(0);
  });
});

describe("applyFilters", () => {
  const acts = [
    mkActivity({
      type: "mention",
      category: "mentions",
      priority: "high",
      isRead: false,
    }),
    mkActivity({
      type: "reaction",
      category: "reactions",
      priority: "low",
      isRead: true,
    }),
  ];
  it("applies multiple filters", () => {
    const r = applyFilters(acts, {
      category: "mentions",
      priority: ["high"],
      isRead: false,
    });
    expect(r).toHaveLength(1);
  });
  it("empty filters returns all", () => {
    expect(applyFilters(acts, {})).toHaveLength(2);
  });
});

describe("category helpers", () => {
  it("ACTIVITY_TYPE_TO_CATEGORY has all types", () => {
    expect(ACTIVITY_TYPE_TO_CATEGORY.mention).toBe("mentions");
    expect(ACTIVITY_TYPE_TO_CATEGORY.system).toBe("all");
  });
  it("getTypesForCategory all", () => {
    const r = getTypesForCategory("all");
    expect(r.length).toBeGreaterThan(5);
  });
  it("getTypesForCategory specific", () => {
    expect(getTypesForCategory("channels")).toEqual(
      expect.arrayContaining([
        "channel_created",
        "channel_archived",
        "channel_unarchived",
      ]),
    );
  });
  it("getCategoryLabel known", () => {
    expect(getCategoryLabel("mentions")).toBe("Mentions");
  });
  it("getAllCategories returns 10", () => {
    expect(getAllCategories()).toHaveLength(10);
  });
  it("getCategoriesWithActivities always includes all", () => {
    expect(getCategoriesWithActivities([])).toContain("all");
  });
});

describe("count helpers", () => {
  const acts = [
    mkActivity({ category: "mentions", isRead: false }),
    mkActivity({ category: "mentions", isRead: true }),
    mkActivity({ category: "files", isRead: false }),
  ];
  it("getUnreadCountByCategory", () => {
    expect(getUnreadCountByCategory(acts, "mentions")).toBe(1);
    expect(getUnreadCountByCategory(acts, "all")).toBe(2);
  });
  it("getCountsByCategory", () => {
    const c = getCountsByCategory(acts);
    expect(c.mentions.total).toBe(2);
    expect(c.mentions.unread).toBe(1);
    expect(c.files.total).toBe(1);
    expect(c.all.unread).toBe(2);
  });
});

describe("quick filters and combinators", () => {
  it("QUICK_FILTERS unread", () => {
    expect(QUICK_FILTERS.unread).toEqual({ isRead: false });
  });
  it("getQuickFilter returns correct", () => {
    expect(getQuickFilter("mentions").category).toBe("mentions");
  });
  it("combineFilters concatenates arrays", () => {
    const r = combineFilters({ types: ["mention"] }, { types: ["reaction"] });
    expect(r.types).toEqual(["mention", "reaction"]);
  });
  it("hasActiveFilters true when category not all", () => {
    expect(hasActiveFilters({ category: "mentions" })).toBe(true);
  });
  it("hasActiveFilters false when empty or all", () => {
    expect(hasActiveFilters({})).toBe(false);
    expect(hasActiveFilters({ category: "all" })).toBe(false);
  });
  it("hasActiveFilters true when search query set", () => {
    expect(hasActiveFilters({ searchQuery: "x" })).toBe(true);
    expect(hasActiveFilters({ searchQuery: "   " })).toBe(false);
  });
  it("clearFilters returns empty", () => {
    expect(clearFilters()).toEqual({});
  });
});
