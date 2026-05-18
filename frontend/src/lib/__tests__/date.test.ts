/**
 * @fileoverview Tests for Date Utilities
 */

import {
  isToday,
  isYesterday,
  isThisWeek,
  isThisYear,
  isSameDay,
  formatMessageTime,
  formatMessageTimeTooltip,
  formatRelativeTime,
  formatRelativeTimeShort,
  formatDateSeparator,
  formatDuration,
  parseDate,
  startOfDay,
  endOfDay,
} from "../date";

describe("Date Checks", () => {
  describe("isToday", () => {
    it("should return true for today", () => {
      expect(isToday(new Date())).toBe(true);
    });

    it("should return true for today as timestamp", () => {
      expect(isToday(Date.now())).toBe(true);
    });

    it("should return true for today as ISO string", () => {
      expect(isToday(new Date().toISOString())).toBe(true);
    });

    it("should return false for yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });

    it("should return false for tomorrow", () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(isToday(tomorrow)).toBe(false);
    });
  });

  describe("isYesterday", () => {
    it("should return true for yesterday", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isYesterday(yesterday)).toBe(true);
    });

    it("should return false for today", () => {
      expect(isYesterday(new Date())).toBe(false);
    });

    it("should return false for two days ago", () => {
      const twoDaysAgo = new Date();
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      expect(isYesterday(twoDaysAgo)).toBe(false);
    });
  });

  describe("isThisWeek", () => {
    it("should return true for today", () => {
      expect(isThisWeek(new Date())).toBe(true);
    });

    it("should return true for 3 days ago", () => {
      const date = new Date();
      date.setDate(date.getDate() - 3);
      expect(isThisWeek(date)).toBe(true);
    });

    it("should return false for 8 days ago", () => {
      const date = new Date();
      date.setDate(date.getDate() - 8);
      expect(isThisWeek(date)).toBe(false);
    });

    it("should return false for future dates", () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      expect(isThisWeek(future)).toBe(false);
    });
  });

  describe("isThisYear", () => {
    it("should return true for today", () => {
      expect(isThisYear(new Date())).toBe(true);
    });

    it("should return true for beginning of this year", () => {
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      expect(isThisYear(yearStart)).toBe(true);
    });

    it("should return false for last year", () => {
      const lastYear = new Date();
      lastYear.setFullYear(lastYear.getFullYear() - 1);
      expect(isThisYear(lastYear)).toBe(false);
    });
  });

  describe("isSameDay", () => {
    it("should return true for same day", () => {
      const date1 = new Date("2026-01-29T10:00:00");
      const date2 = new Date("2026-01-29T22:00:00");
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it("should return false for different days", () => {
      const date1 = new Date("2026-01-29T10:00:00");
      const date2 = new Date("2026-01-30T10:00:00");
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it("should accept various date formats", () => {
      const timestamp = Date.now();
      const isoString = new Date(timestamp).toISOString();
      const dateObj = new Date(timestamp);
      expect(isSameDay(timestamp, isoString)).toBe(true);
      expect(isSameDay(dateObj, timestamp)).toBe(true);
    });
  });
});

describe("Message Time Formatting", () => {
  describe("formatMessageTime", () => {
    it("should return time only for today", () => {
      const result = formatMessageTime(new Date());
      expect(result).toMatch(/^\d{1,2}:\d{2}\s?(AM|PM)$/i);
    });

    it('should include "Yesterday at" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = formatMessageTime(yesterday);
      expect(result).toContain("Yesterday at");
    });

    it("should include day name for this week", () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const result = formatMessageTime(threeDaysAgo);
      expect(result).toMatch(
        /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday) at/,
      );
    });
  });

  describe("formatMessageTimeTooltip", () => {
    it("should return full date and time", () => {
      const date = new Date("2026-01-15T14:30:45");
      const result = formatMessageTimeTooltip(date);
      expect(result).toContain("January");
      expect(result).toContain("15");
      expect(result).toContain("2026");
    });
  });
});

describe("Relative Time Formatting", () => {
  describe("formatRelativeTime", () => {
    it('should return "just now" for recent times', () => {
      const result = formatRelativeTime(Date.now() - 30000); // 30 seconds ago
      expect(result).toBe("just now");
    });

    it("should return minutes for recent times", () => {
      const result = formatRelativeTime(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      expect(result).toBe("5 minutes ago");
    });

    it("should return singular minute", () => {
      const result = formatRelativeTime(Date.now() - 60 * 1000); // 1 minute ago
      expect(result).toBe("1 minute ago");
    });

    it("should return hours for recent times", () => {
      const result = formatRelativeTime(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      expect(result).toBe("3 hours ago");
    });

    it("should return singular hour", () => {
      const result = formatRelativeTime(Date.now() - 60 * 60 * 1000); // 1 hour ago
      expect(result).toBe("1 hour ago");
    });

    it("should return days for recent times", () => {
      const result = formatRelativeTime(Date.now() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
      expect(result).toBe("5 days ago");
    });
  });

  describe("formatRelativeTimeShort", () => {
    it('should return "now" for very recent times', () => {
      expect(formatRelativeTimeShort(Date.now())).toBe("now");
    });

    it("should return minutes in short form", () => {
      const result = formatRelativeTimeShort(Date.now() - 5 * 60 * 1000);
      expect(result).toBe("5m");
    });

    it("should return hours in short form", () => {
      const result = formatRelativeTimeShort(Date.now() - 3 * 60 * 60 * 1000);
      expect(result).toBe("3h");
    });

    it("should return days in short form", () => {
      const result = formatRelativeTimeShort(
        Date.now() - 3 * 24 * 60 * 60 * 1000,
      );
      expect(result).toBe("3d");
    });

    it("should return weeks in short form", () => {
      const result = formatRelativeTimeShort(
        Date.now() - 2 * 7 * 24 * 60 * 60 * 1000,
      );
      expect(result).toBe("2w");
    });
  });
});

describe("Date Separator Formatting", () => {
  describe("formatDateSeparator", () => {
    it('should return "Today" for today', () => {
      expect(formatDateSeparator(new Date())).toBe("Today");
    });

    it('should return "Yesterday" for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(formatDateSeparator(yesterday)).toBe("Yesterday");
    });

    it("should return weekday and date for this year", () => {
      const date = new Date();
      date.setDate(date.getDate() - 10);
      const result = formatDateSeparator(date);
      expect(result).toMatch(
        /(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),/,
      );
    });
  });
});

describe("Duration Formatting", () => {
  describe("formatDuration", () => {
    it("should format seconds", () => {
      expect(formatDuration(5000)).toBe("0:05");
    });

    it("should format minutes and seconds", () => {
      expect(formatDuration(90000)).toBe("1:30");
    });

    it("should format hours, minutes, and seconds", () => {
      expect(formatDuration(3930000)).toBe("1:05:30");
    });

    it("should handle zero", () => {
      expect(formatDuration(0)).toBe("0:00");
    });

    it("should pad seconds", () => {
      expect(formatDuration(61000)).toBe("1:01");
    });
  });
});

describe("Parsing Utilities", () => {
  describe("parseDate", () => {
    it("should parse Date object", () => {
      const date = new Date();
      expect(parseDate(date)).toEqual(date);
    });

    it("should parse timestamp", () => {
      const timestamp = Date.now();
      const result = parseDate(timestamp);
      expect(result?.getTime()).toBe(timestamp);
    });

    it("should parse ISO string", () => {
      const isoString = "2026-01-29T10:00:00.000Z";
      const result = parseDate(isoString);
      expect(result).toBeInstanceOf(Date);
    });

    it("should return null for invalid input", () => {
      expect(parseDate(null)).toBeNull();
      expect(parseDate(undefined)).toBeNull();
      expect(parseDate("")).toBeNull();
      expect(parseDate("invalid")).toBeNull();
    });

    it("should return null for invalid Date object", () => {
      expect(parseDate(new Date("invalid"))).toBeNull();
    });
  });

  describe("startOfDay", () => {
    it("should return start of day", () => {
      const date = new Date("2026-01-29T15:30:45.123");
      const result = startOfDay(date);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it("should preserve the date", () => {
      const date = new Date("2026-01-29T15:30:45");
      const result = startOfDay(date);
      expect(result.getDate()).toBe(29);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getFullYear()).toBe(2026);
    });
  });

  describe("endOfDay", () => {
    it("should return end of day", () => {
      const date = new Date("2026-01-29T10:00:00");
      const result = endOfDay(date);
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
    });

    it("should preserve the date", () => {
      const date = new Date("2026-01-29T10:00:00");
      const result = endOfDay(date);
      expect(result.getDate()).toBe(29);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getFullYear()).toBe(2026);
    });
  });
});
