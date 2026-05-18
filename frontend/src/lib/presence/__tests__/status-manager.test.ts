/**
 * Tests for StatusManager and utility helpers.
 */

jest.mock("@/lib/logger", () => ({
  logger: { error: jest.fn(), info: jest.fn(), warn: jest.fn() },
}));

import {
  StatusManager,
  createStatusManager,
  isValidStatus,
  sanitizeCustomStatusText,
  sanitizeCustomStatusEmoji,
  createCustomStatus,
  type StatusStorage,
} from "../status-manager";

class MemStorage implements StatusStorage {
  data = new Map<string, any>();
  async save(k: string, v: any) {
    this.data.set(k, v);
  }
  async load(k: string) {
    return this.data.get(k) ?? null;
  }
  async remove(k: string) {
    this.data.delete(k);
  }
}

const mkManager = (overrides: any = {}) =>
  new StatusManager({
    userId: "u1",
    storage: new MemStorage(),
    settings: {
      autoAway: { enabled: false, timeout: 5, setStatus: "away" },
      idleDetection: { enabled: false, timeout: 5 },
      privacy: {
        showLastSeen: true,
        showTypingIndicator: true,
        shareActivityStatus: true,
      },
      dndSchedule: {
        enabled: false,
        startTime: "22:00",
        endTime: "08:00",
        days: [0, 1, 2, 3, 4, 5, 6],
      },
    },
    ...overrides,
  });

afterEach(() => {
  jest.useRealTimers();
});

describe("isValidStatus", () => {
  it("accepts valid values", () => {
    expect(isValidStatus("online")).toBe(true);
    expect(isValidStatus("dnd")).toBe(true);
    expect(isValidStatus("invisible")).toBe(true);
  });
  it("rejects invalid values", () => {
    expect(isValidStatus("blah")).toBe(false);
    expect(isValidStatus("")).toBe(false);
  });
});

describe("sanitizeCustomStatusText", () => {
  it("trims and truncates to 100", () => {
    const longStr = "x".repeat(200);
    expect(sanitizeCustomStatusText(longStr)).toHaveLength(100);
  });
  it("trims whitespace", () => {
    expect(sanitizeCustomStatusText("  hi  ")).toBe("hi");
  });
});

describe("sanitizeCustomStatusEmoji", () => {
  it("extracts first emoji", () => {
    expect(sanitizeCustomStatusEmoji("📅 meeting")).toBe("📅");
  });
  it("returns empty for plain text", () => {
    expect(sanitizeCustomStatusEmoji("abc")).toBe("");
  });
});

describe("createCustomStatus", () => {
  it("returns custom with sanitized text and emoji", () => {
    const s = createCustomStatus("  hello  ", "📅 extra");
    expect(s.text).toBe("hello");
    expect(s.emoji).toBe("📅");
    expect(s.expiresAt).toBeNull();
  });
  it("sets expiresAt from duration", () => {
    const s = createCustomStatus("hi", "📅", "30m");
    expect(s.expiresAt).toBeInstanceOf(Date);
    expect(s.expiresAt!.getTime()).toBeGreaterThan(Date.now());
  });
});

describe("StatusManager setStatus + events", () => {
  it("initial status defaults to online", () => {
    const m = mkManager();
    expect(m.getStatus()).toBe("online");
    m.destroy();
  });

  it("setStatus fires event with previous + new", async () => {
    const onStatusChange = jest.fn();
    const m = mkManager({ onStatusChange });
    await m.setStatus("away");
    expect(onStatusChange).toHaveBeenCalled();
    const event = onStatusChange.mock.calls[0][0];
    expect(event.previousStatus).toBe("online");
    expect(event.newStatus).toBe("away");
    expect(event.userId).toBe("u1");
    m.destroy();
  });

  it("setStatus no-op when same status", async () => {
    const onStatusChange = jest.fn();
    const m = mkManager({ onStatusChange });
    await m.setStatus("online");
    expect(onStatusChange).not.toHaveBeenCalled();
    m.destroy();
  });

  it("restorePreviousStatus goes back", async () => {
    const m = mkManager();
    await m.setStatus("dnd");
    await m.restorePreviousStatus();
    expect(m.getStatus()).toBe("online");
    m.destroy();
  });
});

describe("StatusManager custom status", () => {
  it("setCustomStatus fires callback and stores value", async () => {
    const cb = jest.fn();
    const m = mkManager({ onCustomStatusChange: cb });
    await m.setCustomStatus({
      text: "In meeting",
      emoji: "📅",
      expiresAt: null,
    });
    expect(m.getCustomStatus()?.text).toBe("In meeting");
    expect(cb).toHaveBeenCalled();
    m.destroy();
  });

  it("clearCustomStatus sets to null", async () => {
    const m = mkManager();
    await m.setCustomStatus({ text: "hi" });
    await m.clearCustomStatus();
    expect(m.getCustomStatus()).toBeNull();
    m.destroy();
  });

  it("isCustomStatusExpired false when no custom", () => {
    const m = mkManager();
    expect(m.isCustomStatusExpired()).toBe(false);
    m.destroy();
  });

  it("isCustomStatusExpired true when past expiry", async () => {
    const m = mkManager();
    await m.setCustomStatus({
      text: "x",
      expiresAt: new Date(Date.now() - 1000),
    });
    expect(m.isCustomStatusExpired()).toBe(true);
    m.destroy();
  });

  it("applyPreset sets emoji+text from presets", async () => {
    const m = mkManager();
    await m.applyPreset("in_meeting");
    const cs = m.getCustomStatus();
    expect(cs?.activity).toBe("in_meeting");
    expect(cs?.emoji).toBe("📅");
    m.destroy();
  });

  it("applyPreset rejects unknown activity", async () => {
    const m = mkManager();
    await expect(m.applyPreset("not_real" as any)).rejects.toThrow(
      /Unknown activity/,
    );
    m.destroy();
  });
});

describe("transitions", () => {
  it("from offline can only go to online", async () => {
    const m = mkManager({ initialStatus: "offline" });
    expect(m.canTransitionTo("online")).toBe(true);
    expect(m.canTransitionTo("away")).toBe(false);
    expect(m.getAllowedTransitions()).toEqual(["online"]);
    m.destroy();
  });
  it("from online can go to all statuses", () => {
    const m = mkManager();
    expect(m.canTransitionTo("away")).toBe(true);
    expect(m.getAllowedTransitions()).toHaveLength(5);
    m.destroy();
  });
});

describe("privacy", () => {
  it("getPublicStatus maps invisible to offline", async () => {
    const m = mkManager();
    await m.setStatus("invisible");
    expect(m.getPublicStatus()).toBe("offline");
    m.destroy();
  });
  it("getPublicStatus returns real status when visible", () => {
    const m = mkManager();
    expect(m.getPublicStatus()).toBe("online");
    m.destroy();
  });
  it("getPublicCustomStatus null when not sharing", async () => {
    const m = mkManager({
      settings: {
        autoAway: { enabled: false, timeout: 5, setStatus: "away" },
        idleDetection: { enabled: false, timeout: 5 },
        privacy: {
          showLastSeen: true,
          showTypingIndicator: true,
          shareActivityStatus: false,
        },
        dndSchedule: {
          enabled: false,
          startTime: "22:00",
          endTime: "08:00",
          days: [],
        },
      },
    });
    await m.setCustomStatus({ text: "x" });
    expect(m.getPublicCustomStatus()).toBeNull();
    m.destroy();
  });
  it("shouldShowLastSeen reflects settings", () => {
    const m = mkManager();
    expect(m.shouldShowLastSeen()).toBe(true);
    m.destroy();
  });
});

describe("DND schedule", () => {
  it("shouldBeDndNow false when disabled", () => {
    const m = mkManager();
    expect(m.shouldBeDndNow()).toBe(false);
    m.destroy();
  });
});

describe("factory + destroy", () => {
  it("createStatusManager returns an instance", () => {
    const m = createStatusManager({ userId: "u1", storage: new MemStorage() });
    expect(m).toBeInstanceOf(StatusManager);
    m.destroy();
  });
  it("destroy clears timers without throwing", () => {
    const m = mkManager();
    expect(() => m.destroy()).not.toThrow();
  });
});
