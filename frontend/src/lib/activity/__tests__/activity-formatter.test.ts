/**
 * Tests for activity-formatter.
 */

import {
  formatActorName,
  formatActorNames,
  getActivityVerb,
  formatActivityText,
  formatAggregatedActivityText,
  formatActivityDescription,
  truncateText,
  formatFileSize,
  formatCallDuration,
  getActivityEmoji,
  getActivityActionUrl,
} from "../activity-formatter";

const actor = (overrides: any = {}) => ({
  id: "u1",
  displayName: "Alice",
  username: "alice",
  ...overrides,
});

const channel = (overrides: any = {}) => ({
  id: "c1",
  name: "general",
  slug: "general",
  type: "public" as const,
  ...overrides,
});

const messageCtx = (overrides: any = {}) => ({
  id: "m1",
  content: "hello world",
  contentPreview: "hello world",
  userId: "u1",
  channelId: "c1",
  createdAt: "2024-01-01T00:00:00Z",
  ...overrides,
});

describe("formatActorName", () => {
  it("uses displayName", () => {
    expect(formatActorName(actor())).toBe("Alice");
  });
  it("falls back to username", () => {
    expect(formatActorName(actor({ displayName: "" }))).toBe("alice");
  });
  it("falls back to Unknown user", () => {
    expect(
      formatActorName({ id: "x", displayName: "", username: "" } as any),
    ).toBe("Unknown user");
  });
});

describe("formatActorNames", () => {
  it("Someone when empty", () => {
    expect(
      formatActorNames({ actors: [], totalCount: 0, hasMore: false }),
    ).toBe("Someone");
  });
  it("single actor", () => {
    expect(
      formatActorNames({ actors: [actor()], totalCount: 1, hasMore: false }),
    ).toBe("Alice");
  });
  it("two actors", () => {
    const r = formatActorNames({
      actors: [actor(), actor({ displayName: "Bob" })],
      totalCount: 2,
      hasMore: false,
    });
    expect(r).toBe("Alice and Bob");
  });
  it('three with "1 other"', () => {
    const r = formatActorNames(
      {
        actors: [actor(), actor({ displayName: "Bob" })],
        totalCount: 3,
        hasMore: true,
      },
      2,
    );
    expect(r).toBe("Alice, Bob, and 1 other");
  });
  it("many others", () => {
    const r = formatActorNames(
      {
        actors: [actor(), actor({ displayName: "Bob" })],
        totalCount: 5,
        hasMore: true,
      },
      2,
    );
    expect(r).toBe("Alice, Bob, and 3 others");
  });
});

describe("getActivityVerb and getActivityEmoji", () => {
  it("known verb", () => {
    expect(getActivityVerb("mention")).toBe("mentioned you");
  });
  it('unknown verb falls back to "activity"', () => {
    expect(getActivityVerb("nope" as any)).toBe("activity");
  });
  it("emoji exists for known type", () => {
    expect(typeof getActivityEmoji("mention")).toBe("string");
  });
  it("emoji fallback for unknown", () => {
    expect(getActivityEmoji("nope" as any)).toBe("");
  });
});

describe("formatActivityText", () => {
  const base = {
    id: "a",
    category: "all" as const,
    priority: "normal" as const,
    actor: actor(),
    createdAt: "2024-01-01",
    isRead: false,
  };
  it("message", () => {
    const t = formatActivityText({
      ...base,
      type: "message",
      message: messageCtx(),
      channel: channel(),
    } as any);
    expect(t).toContain("Alice");
    expect(t).toContain("#general");
  });
  it("reaction", () => {
    const t = formatActivityText({
      ...base,
      type: "reaction",
      emoji: "👍",
      message: messageCtx(),
      channel: channel(),
    } as any);
    expect(t).toContain("👍");
  });
  it("mention everyone", () => {
    const t = formatActivityText({
      ...base,
      type: "mention",
      mentionType: "everyone",
      message: messageCtx(),
      channel: channel(),
    } as any);
    expect(t).toContain("@everyone");
  });
  it("member_joined", () => {
    const t = formatActivityText({
      ...base,
      type: "member_joined",
      channel: channel(),
    } as any);
    expect(t).toContain("joined");
  });
  it("member_left kicked", () => {
    const t = formatActivityText({
      ...base,
      type: "member_left",
      channel: channel(),
      removedBy: actor(),
      reason: "kicked",
    } as any);
    expect(t).toContain("removed");
  });
  it("file_shared", () => {
    const t = formatActivityText({
      ...base,
      type: "file_shared",
      file: {
        id: "f",
        name: "doc.pdf",
        type: "pdf",
        mimeType: "application/pdf",
        size: 100,
        url: "",
      },
      channel: channel(),
    } as any);
    expect(t).toContain("doc.pdf");
  });
  it("call_started video", () => {
    const t = formatActivityText({
      ...base,
      type: "call_started",
      call: { id: "cl", type: "video" },
      channel: channel(),
    } as any);
    expect(t).toContain("video call");
  });
  it("call_ended with duration", () => {
    const t = formatActivityText({
      ...base,
      type: "call_ended",
      call: { id: "cl", type: "voice", duration: 125 },
      channel: channel(),
    } as any);
    expect(t).toContain("Call ended");
  });
  it("system uses title", () => {
    const t = formatActivityText({
      ...base,
      type: "system",
      title: "Welcome",
      body: "Body",
    } as any);
    expect(t).toBe("Welcome");
  });
  it("unknown type default", () => {
    const t = formatActivityText({ ...base, type: "nonsense" } as any);
    expect(t).toContain("performed an action");
  });
});

describe("formatAggregatedActivityText", () => {
  const actors = {
    actors: [actor(), actor({ displayName: "Bob" })],
    totalCount: 2,
    hasMore: false,
  };
  it("reaction with emojis", () => {
    const r = formatAggregatedActivityText({
      id: "a",
      type: "reaction",
      category: "reactions",
      priority: "normal",
      actors,
      activities: [],
      count: 2,
      latestAt: "",
      earliestAt: "",
      isRead: false,
      metadata: { emojis: ["👍", "🎉"] },
    } as any);
    expect(r).toContain("👍");
  });
  it("mention count > 1", () => {
    const r = formatAggregatedActivityText({
      id: "a",
      type: "mention",
      category: "mentions",
      priority: "normal",
      actors,
      activities: [],
      count: 3,
      latestAt: "",
      earliestAt: "",
      isRead: false,
    } as any);
    expect(r).toContain("3 mentions");
  });
  it("reply count == 1", () => {
    const r = formatAggregatedActivityText({
      id: "a",
      type: "reply",
      category: "threads",
      priority: "normal",
      actors,
      activities: [],
      count: 1,
      latestAt: "",
      earliestAt: "",
      isRead: false,
    } as any);
    expect(r).toContain("replied");
  });
  it("file_shared fileCount", () => {
    const r = formatAggregatedActivityText({
      id: "a",
      type: "file_shared",
      category: "files",
      priority: "normal",
      actors,
      activities: [],
      count: 3,
      latestAt: "",
      earliestAt: "",
      isRead: false,
      metadata: { fileCount: 3 },
    } as any);
    expect(r).toContain("3 files");
  });
  it("member_joined with count > 1", () => {
    const r = formatAggregatedActivityText({
      id: "a",
      type: "member_joined",
      category: "members",
      priority: "normal",
      actors,
      activities: [],
      count: 4,
      latestAt: "",
      earliestAt: "",
      isRead: false,
    } as any);
    expect(r).toContain("4 people joined");
  });
});

describe("formatActivityDescription", () => {
  it("message preview", () => {
    const d = formatActivityDescription({
      type: "message",
      message: messageCtx({ contentPreview: "preview text" }),
    } as any);
    expect(d).toBe("preview text");
  });
  it("file", () => {
    const d = formatActivityDescription({
      type: "file_shared",
      file: { name: "x.pdf", size: 1024 },
    } as any);
    expect(d).toContain("x.pdf");
    expect(d).toContain("KB");
  });
  it("system body", () => {
    const d = formatActivityDescription({ type: "system", body: "sys" } as any);
    expect(d).toBe("sys");
  });
  it("unknown returns empty", () => {
    const d = formatActivityDescription({ type: "nope" } as any);
    expect(d).toBe("");
  });
});

describe("helpers", () => {
  it("truncateText shorter", () => {
    expect(truncateText("hi", 5)).toBe("hi");
  });
  it("truncateText trim with ellipsis", () => {
    expect(truncateText("hello world", 8)).toBe("hello...");
  });
  it("formatFileSize 0", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });
  it("formatFileSize KB and MB", () => {
    expect(formatFileSize(1024)).toContain("KB");
    expect(formatFileSize(1024 * 1024)).toContain("MB");
  });
  it("formatCallDuration seconds", () => {
    expect(formatCallDuration(45)).toBe("45s");
  });
  it("formatCallDuration minutes", () => {
    expect(formatCallDuration(125)).toBe("2m 5s");
  });
  it("formatCallDuration hours", () => {
    expect(formatCallDuration(3900)).toContain("h");
  });
});

describe("getActivityActionUrl", () => {
  const base = {
    id: "a",
    category: "all" as const,
    priority: "normal" as const,
    actor: actor(),
    createdAt: "",
    isRead: false,
  };
  it("message -> channel/message url", () => {
    const u = getActivityActionUrl({
      ...base,
      type: "message",
      channel: channel(),
      message: messageCtx(),
    } as any);
    expect(u).toContain("/chat/general?message=m1");
  });
  it("task url", () => {
    const u = getActivityActionUrl({
      ...base,
      type: "task_assigned",
      task: { id: "t1", title: "T", status: "pending" },
    } as any);
    expect(u).toBe("/tasks/t1");
  });
  it("system returns actionUrl", () => {
    const u = getActivityActionUrl({
      ...base,
      type: "system",
      actionUrl: "/x",
      title: "",
      body: "",
    } as any);
    expect(u).toBe("/x");
  });
  it("reminder_due returns null", () => {
    const u = getActivityActionUrl({
      ...base,
      type: "reminder_due",
      reminderText: "r",
    } as any);
    expect(u).toBeNull();
  });
});
