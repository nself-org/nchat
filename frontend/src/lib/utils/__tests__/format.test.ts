/**
 * @fileoverview Tests for Format Utilities
 */

import {
  formatDate,
  formatTime,
  formatFileSize,
  formatDuration,
  formatNumber,
  formatUserName,
  formatMessageTime,
  formatPercentage,
} from "../format";

describe("formatDate", () => {
  it("should format date with default options", () => {
    const date = new Date("2026-01-15T14:30:00");
    const result = formatDate(date);
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("should format relative time", () => {
    const now = new Date();
    const result = formatDate(now, { relative: true });
    expect(result).toBe("just now");
  });

  it("should format with time included", () => {
    const date = new Date("2026-01-15T14:30:00");
    const result = formatDate(date, { includeTime: true });
    expect(result).toBeDefined();
  });

  it("should handle invalid date", () => {
    expect(formatDate("invalid")).toBe("Invalid date");
  });

  it("should accept timestamp", () => {
    const timestamp = Date.now();
    const result = formatDate(timestamp);
    expect(result).toBeDefined();
  });

  it("should accept ISO string", () => {
    const isoString = "2026-01-15T14:30:00Z";
    const result = formatDate(isoString);
    expect(result).toBeDefined();
  });

  it("should format with different styles", () => {
    const date = new Date("2026-01-15");
    expect(formatDate(date, { style: "short" })).toBeDefined();
    expect(formatDate(date, { style: "medium" })).toBeDefined();
    expect(formatDate(date, { style: "long" })).toBeDefined();
  });
});

describe("formatTime", () => {
  it("should format time with default options", () => {
    const date = new Date("2026-01-15T14:30:00");
    const result = formatTime(date);
    expect(result).toBeDefined();
  });

  it("should format 24-hour time", () => {
    const date = new Date("2026-01-15T14:30:00");
    const result = formatTime(date, { hour12: false });
    expect(result).toBeDefined();
  });

  it("should include seconds", () => {
    const date = new Date("2026-01-15T14:30:45");
    const result = formatTime(date, { showSeconds: true });
    expect(result).toBeDefined();
  });

  it("should handle invalid time", () => {
    expect(formatTime("invalid")).toBe("Invalid time");
  });
});

describe("formatFileSize", () => {
  it("should format bytes", () => {
    expect(formatFileSize(500)).toBe("500 B");
  });

  it("should format kilobytes", () => {
    expect(formatFileSize(1024)).toBe("1 KB");
  });

  it("should format megabytes", () => {
    expect(formatFileSize(1048576)).toBe("1 MB");
  });

  it("should format gigabytes", () => {
    expect(formatFileSize(1073741824)).toBe("1 GB");
  });

  it("should handle zero", () => {
    expect(formatFileSize(0)).toBe("0 B");
  });

  it("should handle negative", () => {
    expect(formatFileSize(-100)).toBe("Invalid size");
  });

  it("should respect decimals", () => {
    expect(formatFileSize(1536, 1)).toContain("1.5");
  });
});

describe("formatDuration", () => {
  it("should format seconds", () => {
    expect(formatDuration(90)).toBe("1:30");
  });

  it("should format hours", () => {
    expect(formatDuration(3661)).toBe("1:01:01");
  });

  it("should format milliseconds", () => {
    expect(formatDuration(90000, { isMs: true })).toBe("1:30");
  });

  it("should format verbose", () => {
    expect(formatDuration(3661, { verbose: true })).toContain("hour");
    expect(formatDuration(3661, { verbose: true })).toContain("minute");
  });

  it("should handle invalid", () => {
    expect(formatDuration(-1)).toBe("Invalid duration");
  });

  it("should handle zero", () => {
    expect(formatDuration(0)).toBe("0:00");
  });

  it("should hide seconds when specified", () => {
    expect(formatDuration(90, { showSeconds: false })).toBe("1 min");
  });
});

describe("formatNumber", () => {
  it("should abbreviate thousands", () => {
    expect(formatNumber(1000)).toBe("1K");
  });

  it("should abbreviate millions", () => {
    expect(formatNumber(1000000)).toBe("1M");
  });

  it("should abbreviate billions", () => {
    expect(formatNumber(1000000000)).toBe("1B");
  });

  it("should not abbreviate small numbers", () => {
    expect(formatNumber(999)).toBe("999");
  });

  it("should handle decimals", () => {
    expect(formatNumber(1500000, { decimals: 1 })).toBe("1.5M");
  });

  it("should handle NaN", () => {
    expect(formatNumber(NaN)).toBe("NaN");
  });

  it("should handle Infinity", () => {
    expect(formatNumber(Infinity)).toBe("∞");
    expect(formatNumber(-Infinity)).toBe("-∞");
  });

  it("should not abbreviate when disabled", () => {
    const result = formatNumber(1000, { abbreviate: false });
    expect(result).toContain("1");
  });
});

describe("formatUserName", () => {
  it("should use displayName", () => {
    expect(formatUserName({ displayName: "John Doe" })).toBe("John Doe");
  });

  it("should use firstName + lastName", () => {
    expect(formatUserName({ firstName: "John", lastName: "Doe" })).toBe(
      "John Doe",
    );
  });

  it("should use username", () => {
    expect(formatUserName({ username: "johndoe" })).toBe("johndoe");
  });

  it("should use email prefix", () => {
    expect(formatUserName({ email: "john@example.com" })).toBe("john");
  });

  it("should return fallback for empty", () => {
    expect(formatUserName({})).toBe("Anonymous");
    expect(formatUserName({}, { fallback: "Unknown" })).toBe("Unknown");
  });

  it("should show initials", () => {
    expect(
      formatUserName({ displayName: "John Doe" }, { showInitials: true }),
    ).toBe("JD");
  });

  it("should truncate long names", () => {
    const longName = "A".repeat(50);
    const result = formatUserName({ displayName: longName }, { maxLength: 10 });
    expect(result.length).toBeLessThanOrEqual(10);
  });
});

describe("formatMessageTime", () => {
  it("should format today time only", () => {
    const result = formatMessageTime(new Date());
    expect(result).not.toContain("Yesterday");
  });

  it("should format yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const result = formatMessageTime(yesterday);
    expect(result).toContain("Yesterday");
  });

  it("should handle invalid", () => {
    expect(formatMessageTime("invalid")).toBe("Invalid time");
  });
});

describe("formatPercentage", () => {
  it("should format decimal as percentage", () => {
    expect(formatPercentage(0.75)).toBe("75%");
  });

  it("should format whole number", () => {
    expect(formatPercentage(75, { isWhole: true })).toBe("75%");
  });

  it("should include decimals", () => {
    expect(formatPercentage(0.756, { decimals: 1 })).toBe("75.6%");
  });

  it("should show sign", () => {
    expect(formatPercentage(0.1, { showSign: true })).toBe("+10%");
  });
});
