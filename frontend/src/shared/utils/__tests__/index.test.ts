/**
 * Tests for shared/utils/index.ts
 *
 * All functions are pure utilities with no framework dependencies.
 * Date-dependent functions use fixed past timestamps to avoid flakiness.
 */

import {
  formatRelativeTime,
  formatMessageTime,
  formatDateHeader,
  truncate,
  getInitials,
  stringToColor,
  formatFileSize,
  formatDuration,
  isValidEmail,
  isValidMessageLength,
  extractMentions,
  extractChannelRefs,
  extractUrls,
  debounce,
  throttle,
  sleep,
  generateId,
  deepClone,
  shallowEqual,
  groupBy,
  sortByDate,
  isMobileUserAgent,
  parseUrlParams,
  buildUrl,
  sanitizeHtml,
  getFileExtension,
  getFileType,
} from "../index";

// ---------------------------------------------------------------------------
// formatRelativeTime
// ---------------------------------------------------------------------------

describe("formatRelativeTime", () => {
  it('returns "Just now" for dates within 60 seconds', () => {
    const recent = new Date(Date.now() - 10_000);
    expect(formatRelativeTime(recent)).toBe("Just now");
  });

  it('returns "Xm ago" for dates within the past hour', () => {
    const threeMinutes = new Date(Date.now() - 3 * 60 * 1000);
    expect(formatRelativeTime(threeMinutes)).toBe("3m ago");
  });

  it('returns "Xh ago" for dates within the past day', () => {
    const twoHours = new Date(Date.now() - 2 * 60 * 60 * 1000);
    expect(formatRelativeTime(twoHours)).toBe("2h ago");
  });

  it('returns "Yesterday" for dates exactly 1 day ago', () => {
    const yesterday = new Date(Date.now() - 25 * 60 * 60 * 1000);
    expect(formatRelativeTime(yesterday)).toBe("Yesterday");
  });

  it('returns "Xd ago" for dates within the past week', () => {
    const threeDays = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    expect(formatRelativeTime(threeDays)).toBe("3d ago");
  });

  it("returns a locale date string for dates older than 7 days", () => {
    const oldDate = new Date("2020-01-01T00:00:00Z");
    const result = formatRelativeTime(oldDate);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("accepts a string date", () => {
    const recent = new Date(Date.now() - 5_000).toISOString();
    expect(formatRelativeTime(recent)).toBe("Just now");
  });
});

// ---------------------------------------------------------------------------
// formatMessageTime
// ---------------------------------------------------------------------------

describe("formatMessageTime", () => {
  it("returns a time string from a Date", () => {
    const date = new Date("2024-06-15T14:30:00");
    const result = formatMessageTime(date);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("accepts a string date", () => {
    const result = formatMessageTime("2024-06-15T09:05:00");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// formatDateHeader
// ---------------------------------------------------------------------------

describe("formatDateHeader", () => {
  it('returns "Today" for today\'s date', () => {
    const now = new Date();
    expect(formatDateHeader(now)).toBe("Today");
  });

  it('returns "Yesterday" for yesterday\'s date', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatDateHeader(yesterday)).toBe("Yesterday");
  });

  it("returns a month/day string for dates in the same year", () => {
    const thisYear = new Date();
    thisYear.setMonth(0);
    thisYear.setDate(10);
    // Only valid if today is not Jan 10
    if (
      formatDateHeader(thisYear) !== "Today" &&
      formatDateHeader(thisYear) !== "Yesterday"
    ) {
      const result = formatDateHeader(thisYear);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    }
  });

  it("returns a date string with year for old dates", () => {
    const old = new Date("2020-01-15T12:00:00");
    const result = formatDateHeader(old);
    expect(result).toMatch(/2020/);
  });
});

// ---------------------------------------------------------------------------
// truncate
// ---------------------------------------------------------------------------

describe("truncate", () => {
  it("returns text unchanged when within limit", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("returns text unchanged when equal to limit", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });

  it("truncates and appends ellipsis when over limit", () => {
    expect(truncate("hello world", 8)).toBe("hello...");
  });

  it("handles maxLength of 3 (edge: all ellipsis)", () => {
    expect(truncate("abcdef", 3)).toBe("...");
  });
});

// ---------------------------------------------------------------------------
// getInitials
// ---------------------------------------------------------------------------

describe("getInitials", () => {
  it('returns "?" for empty string', () => {
    expect(getInitials("")).toBe("?");
  });

  it("returns first two chars uppercased for single word", () => {
    expect(getInitials("alice")).toBe("AL");
  });

  it("returns first+last initials for two words", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("uses first and last words for three-word names", () => {
    expect(getInitials("Mary Jane Watson")).toBe("MW");
  });

  it("handles extra whitespace", () => {
    expect(getInitials("  Alice  ")).toBe("AL");
  });
});

// ---------------------------------------------------------------------------
// stringToColor
// ---------------------------------------------------------------------------

describe("stringToColor", () => {
  it("returns an hsl string", () => {
    const result = stringToColor("alice");
    expect(result).toMatch(/^hsl\(-?\d+, 65%, 50%\)$/);
  });

  it("returns a consistent color for the same string", () => {
    expect(stringToColor("bob")).toBe(stringToColor("bob"));
  });

  it("returns different colors for different strings", () => {
    expect(stringToColor("alice")).not.toBe(stringToColor("bob"));
  });
});

// ---------------------------------------------------------------------------
// formatFileSize
// ---------------------------------------------------------------------------

describe("formatFileSize", () => {
  it('returns "0 B" for 0 bytes', () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("formats bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("formats kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("formats megabytes", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1 MB");
  });

  it("formats gigabytes", () => {
    expect(formatFileSize(1024 * 1024 * 1024)).toBe("1 GB");
  });

  it("formats fractional values", () => {
    expect(formatFileSize(1500)).toBe("1.5 KB");
  });
});

// ---------------------------------------------------------------------------
// formatDuration
// ---------------------------------------------------------------------------

describe("formatDuration", () => {
  it("formats seconds as mm:ss", () => {
    expect(formatDuration(90)).toBe("1:30");
  });

  it("formats zero as 0:00", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("pads seconds with zero", () => {
    expect(formatDuration(65)).toBe("1:05");
  });

  it("formats hours as hh:mm:ss", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("pads minutes and seconds when hours present", () => {
    expect(formatDuration(7200)).toBe("2:00:00");
  });
});

// ---------------------------------------------------------------------------
// isValidEmail
// ---------------------------------------------------------------------------

describe("isValidEmail", () => {
  it("returns true for valid email", () => {
    expect(isValidEmail("user@example.com")).toBe(true);
  });

  it("returns false for missing @", () => {
    expect(isValidEmail("userexample.com")).toBe(false);
  });

  it("returns false for missing domain", () => {
    expect(isValidEmail("user@")).toBe(false);
  });

  it("returns false for empty string", () => {
    expect(isValidEmail("")).toBe(false);
  });

  it("returns true for subdomain email", () => {
    expect(isValidEmail("user@mail.example.co.uk")).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isValidMessageLength
// ---------------------------------------------------------------------------

describe("isValidMessageLength", () => {
  it("returns false for empty string", () => {
    expect(isValidMessageLength("")).toBe(false);
  });

  it("returns true for a normal message", () => {
    expect(isValidMessageLength("hello")).toBe(true);
  });

  it("returns true for a message at exact max length (4000)", () => {
    expect(isValidMessageLength("a".repeat(4000))).toBe(true);
  });

  it("returns false for a message over max length", () => {
    expect(isValidMessageLength("a".repeat(4001))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// extractMentions
// ---------------------------------------------------------------------------

describe("extractMentions", () => {
  it("returns empty array when no mentions", () => {
    expect(extractMentions("no mentions here")).toEqual([]);
  });

  it("extracts single mention", () => {
    expect(extractMentions("hello @alice")).toEqual(["alice"]);
  });

  it("extracts multiple mentions", () => {
    expect(extractMentions("@alice and @bob")).toEqual(["alice", "bob"]);
  });

  it("does not include the @ in the result", () => {
    const mentions = extractMentions("@alice");
    expect(mentions[0]).toBe("alice");
  });
});

// ---------------------------------------------------------------------------
// extractChannelRefs
// ---------------------------------------------------------------------------

describe("extractChannelRefs", () => {
  it("returns empty array when no channel refs", () => {
    expect(extractChannelRefs("no channels here")).toEqual([]);
  });

  it("extracts single channel ref", () => {
    expect(extractChannelRefs("see #general for more")).toEqual(["general"]);
  });

  it("extracts multiple channel refs", () => {
    expect(extractChannelRefs("#general and #random")).toEqual([
      "general",
      "random",
    ]);
  });
});

// ---------------------------------------------------------------------------
// extractUrls
// ---------------------------------------------------------------------------

describe("extractUrls", () => {
  it("returns empty array when no urls", () => {
    expect(extractUrls("no urls here")).toEqual([]);
  });

  it("extracts http url", () => {
    expect(extractUrls("visit http://example.com")).toEqual([
      "http://example.com",
    ]);
  });

  it("extracts https url", () => {
    expect(extractUrls("visit https://example.com today")).toEqual([
      "https://example.com",
    ]);
  });

  it("extracts multiple urls", () => {
    const result = extractUrls("https://example.com and https://another.org");
    expect(result).toHaveLength(2);
  });
});

// ---------------------------------------------------------------------------
// debounce
// ---------------------------------------------------------------------------

describe("debounce", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("delays function call", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    debounced();
    expect(fn).not.toHaveBeenCalled();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("resets timer on multiple calls", () => {
    const fn = jest.fn();
    const debounced = debounce(fn, 100);
    debounced();
    debounced();
    debounced();
    jest.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// throttle
// ---------------------------------------------------------------------------

describe("throttle", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("calls function immediately on first invocation", () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("ignores calls within the throttle window", () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);
    throttled();
    throttled();
    throttled();
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("allows call after throttle window expires", () => {
    const fn = jest.fn();
    const throttled = throttle(fn, 100);
    throttled();
    jest.advanceTimersByTime(100);
    throttled();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

// ---------------------------------------------------------------------------
// sleep
// ---------------------------------------------------------------------------

describe("sleep", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it("returns a promise that resolves after the given ms", async () => {
    let resolved = false;
    const p = sleep(100).then(() => {
      resolved = true;
    });
    expect(resolved).toBe(false);
    jest.advanceTimersByTime(100);
    await p;
    expect(resolved).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// generateId
// ---------------------------------------------------------------------------

describe("generateId", () => {
  it("returns a non-empty string", () => {
    expect(typeof generateId()).toBe("string");
    expect(generateId().length).toBeGreaterThan(0);
  });

  it("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => generateId()));
    expect(ids.size).toBe(20);
  });
});

// ---------------------------------------------------------------------------
// deepClone
// ---------------------------------------------------------------------------

describe("deepClone", () => {
  it("clones a plain object", () => {
    const original = { a: 1, b: { c: 2 } };
    const clone = deepClone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
  });

  it("deep clone does not share nested references", () => {
    const original = { nested: { value: 42 } };
    const clone = deepClone(original);
    clone.nested.value = 99;
    expect(original.nested.value).toBe(42);
  });

  it("clones arrays", () => {
    const original = [1, 2, 3];
    const clone = deepClone(original);
    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
  });
});

// ---------------------------------------------------------------------------
// shallowEqual
// ---------------------------------------------------------------------------

describe("shallowEqual", () => {
  it("returns true for equal objects", () => {
    expect(shallowEqual({ a: 1, b: 2 }, { a: 1, b: 2 })).toBe(true);
  });

  it("returns false for different values", () => {
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });

  it("returns false for different key counts", () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });

  it("returns true for empty objects", () => {
    expect(shallowEqual({}, {})).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// groupBy
// ---------------------------------------------------------------------------

describe("groupBy", () => {
  it("groups items by a string key", () => {
    const items = [
      { type: "a", val: 1 },
      { type: "b", val: 2 },
      { type: "a", val: 3 },
    ];
    const result = groupBy(items, "type");
    expect(result["a"]).toHaveLength(2);
    expect(result["b"]).toHaveLength(1);
  });

  it("returns empty object for empty array", () => {
    expect(groupBy([], "type" as never)).toEqual({});
  });
});

// ---------------------------------------------------------------------------
// sortByDate
// ---------------------------------------------------------------------------

describe("sortByDate", () => {
  const items = [
    { createdAt: new Date("2024-01-03"), name: "c" },
    { createdAt: new Date("2024-01-01"), name: "a" },
    { createdAt: new Date("2024-01-02"), name: "b" },
  ];

  it("sorts descending by default", () => {
    const sorted = sortByDate(items);
    expect(sorted[0].name).toBe("c");
    expect(sorted[2].name).toBe("a");
  });

  it("sorts ascending when specified", () => {
    const sorted = sortByDate(items, "asc");
    expect(sorted[0].name).toBe("a");
    expect(sorted[2].name).toBe("c");
  });

  it("does not mutate the original array", () => {
    const original = [...items];
    sortByDate(items);
    expect(items).toEqual(original);
  });
});

// ---------------------------------------------------------------------------
// isMobileUserAgent
// ---------------------------------------------------------------------------

describe("isMobileUserAgent", () => {
  it("returns true for Android user agent", () => {
    expect(
      isMobileUserAgent("Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36"),
    ).toBe(true);
  });

  it("returns true for iPhone user agent", () => {
    expect(isMobileUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0)")).toBe(
      true,
    );
  });

  it("returns false for desktop user agent", () => {
    expect(
      isMobileUserAgent(
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120",
      ),
    ).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseUrlParams
// ---------------------------------------------------------------------------

describe("parseUrlParams", () => {
  it("returns empty object for url with no query string", () => {
    expect(parseUrlParams("https://example.com")).toEqual({});
  });

  it("parses single param", () => {
    expect(parseUrlParams("https://example.com?foo=bar")).toEqual({
      foo: "bar",
    });
  });

  it("parses multiple params", () => {
    expect(parseUrlParams("https://example.com?a=1&b=2")).toEqual({
      a: "1",
      b: "2",
    });
  });

  it("decodes URL-encoded params", () => {
    expect(parseUrlParams("https://example.com?name=hello%20world")).toEqual({
      name: "hello world",
    });
  });

  it("handles param with no value", () => {
    const result = parseUrlParams("https://example.com?flag=");
    expect(result["flag"]).toBe("");
  });
});

// ---------------------------------------------------------------------------
// buildUrl
// ---------------------------------------------------------------------------

describe("buildUrl", () => {
  it("builds a url with params", () => {
    const result = buildUrl("https://example.com", { foo: "bar" });
    expect(result).toBe("https://example.com/?foo=bar");
  });

  it("handles numeric params", () => {
    const result = buildUrl("https://example.com", { page: 2 });
    expect(result).toContain("page=2");
  });

  it("handles boolean params", () => {
    const result = buildUrl("https://example.com", { active: true });
    expect(result).toContain("active=true");
  });

  it("returns base url string when no params", () => {
    const result = buildUrl("https://example.com", {});
    expect(result).toBe("https://example.com/");
  });
});

// ---------------------------------------------------------------------------
// sanitizeHtml
// ---------------------------------------------------------------------------

describe("sanitizeHtml", () => {
  it("escapes ampersand", () => {
    expect(sanitizeHtml("a & b")).toBe("a &amp; b");
  });

  it("escapes less-than", () => {
    expect(sanitizeHtml("<script>")).toBe("&lt;script&gt;");
  });

  it("escapes double quotes", () => {
    expect(sanitizeHtml('"hello"')).toBe("&quot;hello&quot;");
  });

  it("escapes single quotes", () => {
    expect(sanitizeHtml("it's")).toBe("it&#039;s");
  });

  it("returns plain text unchanged", () => {
    expect(sanitizeHtml("hello world")).toBe("hello world");
  });
});

// ---------------------------------------------------------------------------
// getFileExtension
// ---------------------------------------------------------------------------

describe("getFileExtension", () => {
  it("returns extension in lowercase", () => {
    expect(getFileExtension("file.PDF")).toBe("pdf");
  });

  it("returns last extension for multiple dots", () => {
    expect(getFileExtension("archive.tar.gz")).toBe("gz");
  });

  it("returns empty string for no extension", () => {
    expect(getFileExtension("README")).toBe("");
  });

  it("handles hidden files (dot-only prefix)", () => {
    expect(getFileExtension(".gitignore")).toBe("gitignore");
  });
});

// ---------------------------------------------------------------------------
// getFileType
// ---------------------------------------------------------------------------

describe("getFileType", () => {
  it('returns "image" for image mimeType', () => {
    expect(getFileType("image/png")).toBe("image");
  });

  it('returns "video" for video mimeType', () => {
    expect(getFileType("video/mp4")).toBe("video");
  });

  it('returns "audio" for audio mimeType', () => {
    expect(getFileType("audio/mpeg")).toBe("audio");
  });

  it('returns "document" for application mimeType', () => {
    expect(getFileType("application/pdf")).toBe("document");
  });

  it('returns "document" for text mimeType', () => {
    expect(getFileType("text/plain")).toBe("document");
  });

  it('returns "unknown" for unrecognized mimeType', () => {
    expect(getFileType("model/gltf+json")).toBe("unknown");
  });
});
