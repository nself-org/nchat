/**
 * Tests for activity-aggregator.
 */

import {
  aggregateActivities,
  isAggregatedActivity,
  flattenAggregatedActivities,
  getAllActivityIds,
  getUnreadCount,
  splitByReadStatus,
  reaggregateAfterRead,
} from "../activity-aggregator";

const actor = (id: string, name: string) => ({
  id,
  displayName: name,
  username: name.toLowerCase(),
});
const ch = {
  id: "c1",
  name: "general",
  slug: "general",
  type: "public" as const,
};
const msg = {
  id: "m1",
  content: "hi",
  userId: "u1",
  channelId: "c1",
  createdAt: "2024-01-15T10:00:00Z",
};

const reaction = (
  id: string,
  userId: string,
  emoji: string,
  time: string,
  isRead = false,
): any => ({
  id,
  type: "reaction",
  category: "reactions",
  priority: "normal",
  actor: actor(userId, userId.toUpperCase()),
  createdAt: time,
  isRead,
  emoji,
  message: msg,
  channel: ch,
});

const channelMsg = (id: string, userId: string, time: string): any => ({
  id,
  type: "message",
  category: "all",
  priority: "normal",
  actor: actor(userId, userId.toUpperCase()),
  createdAt: time,
  isRead: false,
  channel: ch,
  message: { ...msg, id },
});

describe("aggregateActivities", () => {
  it("returns [] for no activities", () => {
    expect(aggregateActivities([])).toEqual([]);
  });

  it("does not aggregate non-aggregatable types", () => {
    const items = [
      channelMsg("m1", "u1", "2024-01-15T10:00:00Z"),
      channelMsg("m2", "u2", "2024-01-15T10:05:00Z"),
    ];
    const r = aggregateActivities(items);
    expect(r.every((i) => !isAggregatedActivity(i))).toBe(true);
    expect(r).toHaveLength(2);
  });

  it("aggregates same-message reactions", () => {
    const items = [
      reaction("r1", "u1", "👍", "2024-01-15T10:00:00Z"),
      reaction("r2", "u2", "🎉", "2024-01-15T10:02:00Z"),
    ];
    const r = aggregateActivities(items);
    expect(r).toHaveLength(1);
    expect(isAggregatedActivity(r[0])).toBe(true);
    if (isAggregatedActivity(r[0])) {
      expect(r[0].count).toBe(2);
      expect(r[0].metadata?.emojis).toEqual(
        expect.arrayContaining(["👍", "🎉"]),
      );
    }
  });

  it("does not aggregate beyond window", () => {
    const items = [
      reaction("r1", "u1", "👍", "2024-01-15T10:00:00Z"),
      reaction("r2", "u2", "🎉", "2024-01-15T13:00:00Z"),
    ];
    const r = aggregateActivities(items, { windowMinutes: 60 });
    expect(r).toHaveLength(2);
  });

  it("respects maxActivities", () => {
    const items = [
      reaction("r1", "u1", "👍", "2024-01-15T10:00:00Z"),
      reaction("r2", "u2", "🎉", "2024-01-15T10:01:00Z"),
      reaction("r3", "u3", "❤️", "2024-01-15T10:02:00Z"),
    ];
    const r = aggregateActivities(items, { maxActivities: 2 });
    const agg = r.find((i) => isAggregatedActivity(i)) as any;
    expect(agg?.count).toBe(2);
  });

  it("keeps single activity when only one", () => {
    const r = aggregateActivities([
      reaction("r1", "u1", "👍", "2024-01-15T10:00:00Z"),
    ]);
    expect(r).toHaveLength(1);
    expect(isAggregatedActivity(r[0])).toBe(false);
  });

  it("sorts aggregated activities by newest first", () => {
    const r = aggregateActivities([
      reaction("r1", "u1", "👍", "2024-01-15T10:00:00Z"),
      reaction("r2", "u2", "🎉", "2024-01-15T10:30:00Z"),
    ]);
    const agg = r[0] as any;
    expect(new Date(agg.latestAt) >= new Date(agg.earliestAt)).toBe(true);
  });
});

describe("isAggregatedActivity", () => {
  it("true for object with activities array", () => {
    expect(isAggregatedActivity({ activities: [] } as any)).toBe(true);
  });
  it("false for single activity", () => {
    expect(isAggregatedActivity(channelMsg("m1", "u1", "2024-01-15"))).toBe(
      false,
    );
  });
});

describe("flattenAggregatedActivities", () => {
  it("flattens mix of individual and aggregated", () => {
    const items = [
      reaction("r1", "u1", "👍", "2024-01-15T10:00:00Z"),
      reaction("r2", "u2", "🎉", "2024-01-15T10:02:00Z"),
      channelMsg("m1", "u3", "2024-01-15T11:00:00Z"),
    ];
    const agg = aggregateActivities(items);
    const flat = flattenAggregatedActivities(agg);
    expect(flat).toHaveLength(3);
  });
  it("returns all for all-individual input", () => {
    const items = [
      channelMsg("m1", "u1", "2024-01-15"),
      channelMsg("m2", "u2", "2024-01-15"),
    ];
    expect(flattenAggregatedActivities(items)).toHaveLength(2);
  });
});

describe("getAllActivityIds", () => {
  it("returns all ids across aggregated and individual", () => {
    const items = [
      reaction("r1", "u1", "👍", "2024-01-15T10:00:00Z"),
      reaction("r2", "u2", "🎉", "2024-01-15T10:02:00Z"),
    ];
    const agg = aggregateActivities(items);
    const ids = getAllActivityIds(agg);
    expect(ids).toEqual(expect.arrayContaining(["r1", "r2"]));
  });
});

describe("getUnreadCount", () => {
  it("counts individual unread", () => {
    expect(getUnreadCount([channelMsg("m1", "u1", "2024-01-15")])).toBe(1);
  });
  it("counts unread inside aggregated", () => {
    const items = [
      reaction("r1", "u1", "👍", "2024-01-15T10:00:00Z", false),
      reaction("r2", "u2", "🎉", "2024-01-15T10:02:00Z", true),
    ];
    const agg = aggregateActivities(items);
    expect(getUnreadCount(agg)).toBe(1);
  });
  it("zero when all read", () => {
    const items = [
      reaction("r1", "u1", "👍", "2024-01-15T10:00:00Z", true),
      reaction("r2", "u2", "🎉", "2024-01-15T10:02:00Z", true),
    ];
    expect(getUnreadCount(aggregateActivities(items))).toBe(0);
  });
});

describe("splitByReadStatus", () => {
  it("splits into read/unread", () => {
    const items = [
      reaction("r1", "u1", "👍", "2024-01-15T10:00:00Z", false),
      reaction("r2", "u2", "🎉", "2024-01-15T10:02:00Z", true),
    ];
    const s = splitByReadStatus(aggregateActivities(items));
    expect(s.read).toHaveLength(1);
    expect(s.unread).toHaveLength(1);
  });
});

describe("reaggregateAfterRead", () => {
  it("marks ids as read then re-aggregates", () => {
    const items = [
      reaction("r1", "u1", "👍", "2024-01-15T10:00:00Z", false),
      reaction("r2", "u2", "🎉", "2024-01-15T10:02:00Z", false),
    ];
    const initial = aggregateActivities(items);
    const updated = reaggregateAfterRead(initial, ["r1"]);
    const flat = flattenAggregatedActivities(updated);
    const r1 = flat.find((a) => a.id === "r1");
    expect(r1?.isRead).toBe(true);
  });
});
