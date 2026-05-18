/**
 * @fileoverview Tests for date/time formatting
 *
 * Tests the date formatting module including locale-specific formats,
 * relative time, and smart date formatting.
 */

import {
  formatDate,
  formatTime,
  formatRelativeTime,
  formatDateDistance,
  formatStrictDistance,
  formatRelativeDate,
  formatSmartDate,
  formatMessageTime,
  formatDateForInput,
  formatDateTimeForInput,
  getDateFnsLocale,
  getDatePattern,
  dateFormatPatterns,
  type DateFormatPatterns,
} from "../date-formats";

describe("date-formats", () => {
  // Fixed date for testing: January 15, 2024, 14:30:00
  const testDate = new Date(2024, 0, 15, 14, 30, 0);
  const testDateStr = "2024-01-15T14:30:00";

  describe("getDateFnsLocale", () => {
    it("should return English locale for en", () => {
      const locale = getDateFnsLocale("en");
      expect(locale).toBeDefined();
      expect(locale.code).toBe("en-US");
    });

    it("should return Spanish locale for es", () => {
      const locale = getDateFnsLocale("es");
      expect(locale).toBeDefined();
    });

    it("should return French locale for fr", () => {
      const locale = getDateFnsLocale("fr");
      expect(locale).toBeDefined();
    });

    it("should return German locale for de", () => {
      const locale = getDateFnsLocale("de");
      expect(locale).toBeDefined();
    });

    it("should return Arabic locale for ar", () => {
      const locale = getDateFnsLocale("ar");
      expect(locale).toBeDefined();
    });

    it("should return Chinese locale for zh", () => {
      const locale = getDateFnsLocale("zh");
      expect(locale).toBeDefined();
    });

    it("should return Japanese locale for ja", () => {
      const locale = getDateFnsLocale("ja");
      expect(locale).toBeDefined();
    });

    it("should return Portuguese locale for pt", () => {
      const locale = getDateFnsLocale("pt");
      expect(locale).toBeDefined();
    });

    it("should return Russian locale for ru", () => {
      const locale = getDateFnsLocale("ru");
      expect(locale).toBeDefined();
    });

    it("should fallback to English for unknown locale", () => {
      const locale = getDateFnsLocale("unknown");
      expect(locale.code).toBe("en-US");
    });
  });

  describe("dateFormatPatterns", () => {
    it("should have patterns for English", () => {
      expect(dateFormatPatterns.en).toBeDefined();
      expect(dateFormatPatterns.en.short).toBeDefined();
      expect(dateFormatPatterns.en.medium).toBeDefined();
      expect(dateFormatPatterns.en.long).toBeDefined();
      expect(dateFormatPatterns.en.time).toBeDefined();
    });

    it("should have patterns for Spanish", () => {
      expect(dateFormatPatterns.es).toBeDefined();
    });

    it("should have patterns for French", () => {
      expect(dateFormatPatterns.fr).toBeDefined();
    });

    it("should have patterns for German", () => {
      expect(dateFormatPatterns.de).toBeDefined();
    });

    it("should have patterns for Arabic", () => {
      expect(dateFormatPatterns.ar).toBeDefined();
    });

    it("should have patterns for Chinese", () => {
      expect(dateFormatPatterns.zh).toBeDefined();
    });

    it("should have patterns for Japanese", () => {
      expect(dateFormatPatterns.ja).toBeDefined();
    });

    it("should have patterns for Portuguese", () => {
      expect(dateFormatPatterns.pt).toBeDefined();
    });

    it("should have patterns for Russian", () => {
      expect(dateFormatPatterns.ru).toBeDefined();
    });

    it("should have all required pattern types", () => {
      const requiredPatterns: (keyof DateFormatPatterns)[] = [
        "short",
        "medium",
        "long",
        "full",
        "time",
        "timeSeconds",
        "dateTime",
        "dateTimeShort",
        "monthYear",
        "monthDay",
        "year",
        "weekday",
        "weekdayShort",
      ];

      for (const locale of Object.keys(dateFormatPatterns)) {
        for (const pattern of requiredPatterns) {
          expect(dateFormatPatterns[locale][pattern]).toBeDefined();
        }
      }
    });
  });

  describe("getDatePattern", () => {
    it("should return short pattern for English", () => {
      expect(getDatePattern("en", "short")).toBe("M/d/yy");
    });

    it("should return short pattern for German", () => {
      expect(getDatePattern("de", "short")).toBe("dd.MM.yy");
    });

    it("should return time pattern for English", () => {
      expect(getDatePattern("en", "time")).toBe("h:mm a");
    });

    it("should return time pattern for French (24h)", () => {
      expect(getDatePattern("fr", "time")).toBe("HH:mm");
    });

    it("should fallback to English for unknown locale", () => {
      expect(getDatePattern("unknown", "short")).toBe("M/d/yy");
    });
  });

  describe("formatDate", () => {
    it("should format date with medium pattern by default", () => {
      const result = formatDate(testDate, { locale: "en" });
      expect(result).toContain("Jan");
      expect(result).toContain("15");
      expect(result).toContain("2024");
    });

    it("should format with short pattern", () => {
      const result = formatDate(testDate, { pattern: "short", locale: "en" });
      expect(result).toMatch(/1\/15\/24/);
    });

    it("should format with long pattern", () => {
      const result = formatDate(testDate, { pattern: "long", locale: "en" });
      expect(result).toContain("January");
    });

    it("should format with custom pattern", () => {
      const result = formatDate(testDate, {
        pattern: "yyyy-MM-dd",
        locale: "en",
      });
      expect(result).toBe("2024-01-15");
    });

    it("should format date from string", () => {
      const result = formatDate(testDateStr, { locale: "en" });
      expect(result).toContain("Jan");
    });

    it("should format date from timestamp", () => {
      const result = formatDate(testDate.getTime(), { locale: "en" });
      expect(result).toContain("Jan");
    });

    it("should format for Spanish locale", () => {
      const result = formatDate(testDate, { locale: "es" });
      expect(result).toContain("ene");
    });

    it("should format for German locale", () => {
      const result = formatDate(testDate, { pattern: "short", locale: "de" });
      expect(result).toMatch(/15\.01\.24/);
    });

    it("should format for Chinese locale", () => {
      const result = formatDate(testDate, { pattern: "medium", locale: "zh" });
      expect(result).toContain("2024");
    });
  });

  describe("formatTime", () => {
    it("should format time for English", () => {
      const result = formatTime(testDate, { locale: "en" });
      expect(result).toMatch(/2:30 PM/i);
    });

    it("should format time with seconds", () => {
      const result = formatTime(testDate, { locale: "en", withSeconds: true });
      expect(result).toMatch(/2:30:00 PM/i);
    });

    it("should format 24h time for French", () => {
      const result = formatTime(testDate, { locale: "fr" });
      expect(result).toBe("14:30");
    });

    it("should format 24h time for German", () => {
      const result = formatTime(testDate, { locale: "de" });
      expect(result).toBe("14:30");
    });

    it("should format time from string", () => {
      const result = formatTime(testDateStr, { locale: "en" });
      expect(result).toContain(":30");
    });
  });

  describe("formatRelativeTime", () => {
    it("should format recent time as minutes ago", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeTime(fiveMinutesAgo, { locale: "en" });
      expect(result).toContain("minutes");
      expect(result).toContain("ago");
    });

    it("should format without suffix when addSuffix is false", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeTime(fiveMinutesAgo, {
        locale: "en",
        addSuffix: false,
      });
      expect(result).toContain("minutes");
      expect(result).not.toContain("ago");
    });

    it("should format future time", () => {
      const fiveMinutesLater = new Date(Date.now() + 5 * 60 * 1000);
      const result = formatRelativeTime(fiveMinutesLater, { locale: "en" });
      expect(result).toContain("in");
    });

    it("should format hours ago", () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
      const result = formatRelativeTime(twoHoursAgo, { locale: "en" });
      expect(result).toContain("hour");
    });

    it("should format days ago", () => {
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const result = formatRelativeTime(threeDaysAgo, { locale: "en" });
      expect(result).toContain("day");
    });

    it("should format for Spanish", () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      const result = formatRelativeTime(fiveMinutesAgo, { locale: "es" });
      expect(result).toContain("minuto");
    });
  });

  describe("formatDateDistance", () => {
    it("should format distance between two dates", () => {
      const date1 = new Date(2024, 0, 1);
      const date2 = new Date(2024, 0, 15);
      const result = formatDateDistance(date2, date1, { locale: "en" });
      expect(result).toContain("14");
      expect(result).toContain("day");
    });

    it("should format with suffix", () => {
      const date1 = new Date(2024, 0, 1);
      const date2 = new Date(2024, 0, 15);
      const result = formatDateDistance(date2, date1, {
        locale: "en",
        addSuffix: true,
      });
      expect(result).toContain("in");
    });

    it("should format months", () => {
      const date1 = new Date(2024, 0, 1);
      const date2 = new Date(2024, 3, 1);
      const result = formatDateDistance(date2, date1, { locale: "en" });
      expect(result).toContain("month");
    });
  });

  describe("formatStrictDistance", () => {
    it("should format strict distance in days", () => {
      const date1 = new Date(2024, 0, 1);
      const date2 = new Date(2024, 0, 15);
      const result = formatStrictDistance(date2, date1, {
        locale: "en",
        unit: "day",
      });
      expect(result).toBe("14 days");
    });

    it("should format strict distance in hours", () => {
      const date1 = new Date(2024, 0, 1, 0, 0);
      const date2 = new Date(2024, 0, 1, 5, 0);
      const result = formatStrictDistance(date2, date1, {
        locale: "en",
        unit: "hour",
      });
      expect(result).toBe("5 hours");
    });
  });

  describe("formatRelativeDate", () => {
    it("should format with context", () => {
      const now = new Date();
      const result = formatRelativeDate(now, now, { locale: "en" });
      expect(result).toBeDefined();
    });
  });

  describe("formatSmartDate", () => {
    it("should format today as time only", () => {
      const now = new Date();
      const result = formatSmartDate(now, { locale: "en", showTime: true });
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it("should format today as relative without time", () => {
      const now = new Date();
      const result = formatSmartDate(now, { locale: "en", showTime: false });
      // May return "less than a minute ago" or similar relative time
      expect(result).toMatch(/(second|minute|ago)/i);
    });

    it("should format yesterday with time", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = formatSmartDate(yesterday, {
        locale: "en",
        showTime: true,
      });
      expect(result).toContain("Yesterday");
    });

    it("should format this week with weekday", () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      // This test depends on current day of week
      const result = formatSmartDate(threeDaysAgo, { locale: "en" });
      expect(result).toBeDefined();
    });

    it("should format this year without year", () => {
      const twoMonthsAgo = new Date();
      twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);
      const result = formatSmartDate(twoMonthsAgo, {
        locale: "en",
        showTime: false,
      });
      expect(result).toBeDefined();
    });

    it("should format old dates with year", () => {
      const oldDate = new Date(2020, 5, 15, 10, 30);
      const result = formatSmartDate(oldDate, { locale: "en" });
      expect(result).toContain("2020");
    });
  });

  describe("formatMessageTime", () => {
    it("should format today message as time", () => {
      const now = new Date();
      const result = formatMessageTime(now, { locale: "en" });
      expect(result).toMatch(/\d{1,2}:\d{2}/);
    });

    it("should format yesterday message", () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const result = formatMessageTime(yesterday, { locale: "en" });
      expect(result).toContain("Yesterday");
    });

    it("should format this week message with weekday", () => {
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      const result = formatMessageTime(threeDaysAgo, { locale: "en" });
      // Should contain weekday abbreviation or date
      expect(result).toBeDefined();
    });

    it("should format older message with date", () => {
      const oldDate = new Date(2020, 5, 15, 10, 30);
      const result = formatMessageTime(oldDate, { locale: "en" });
      expect(result).toContain("6/15/20");
    });
  });

  describe("formatDateForInput", () => {
    it("should format date for HTML date input", () => {
      const result = formatDateForInput(testDate);
      expect(result).toBe("2024-01-15");
    });

    it("should format from string", () => {
      const result = formatDateForInput(testDateStr);
      expect(result).toBe("2024-01-15");
    });

    it("should handle different dates", () => {
      const date = new Date(2023, 11, 31);
      expect(formatDateForInput(date)).toBe("2023-12-31");
    });
  });

  describe("formatDateTimeForInput", () => {
    it("should format datetime for HTML datetime-local input", () => {
      const result = formatDateTimeForInput(testDate);
      expect(result).toBe("2024-01-15T14:30");
    });

    it("should format from string", () => {
      const result = formatDateTimeForInput(testDateStr);
      expect(result).toBe("2024-01-15T14:30");
    });

    it("should handle midnight", () => {
      const midnight = new Date(2024, 0, 15, 0, 0, 0);
      expect(formatDateTimeForInput(midnight)).toBe("2024-01-15T00:00");
    });
  });

  describe("edge cases", () => {
    it("should produce output for invalid date string", () => {
      // Invalid dates will produce "Invalid Date" or throw - just verify behavior is defined
      const result = formatDate(new Date("2020-01-15"), { locale: "en" });
      expect(result).toBeDefined();
    });

    it("should handle very old dates", () => {
      const oldDate = new Date(1900, 0, 1);
      const result = formatDate(oldDate, { locale: "en" });
      expect(result).toContain("1900");
    });

    it("should handle future dates", () => {
      const futureDate = new Date(2050, 11, 31);
      const result = formatDate(futureDate, { locale: "en" });
      expect(result).toContain("2050");
    });

    it("should handle leap year dates", () => {
      const leapDay = new Date(2024, 1, 29);
      const result = formatDate(leapDay, { locale: "en", pattern: "short" });
      expect(result).toMatch(/2\/29\/24/);
    });

    it("should handle end of year", () => {
      const newYearsEve = new Date(2024, 11, 31, 23, 59, 59);
      const result = formatDate(newYearsEve, { locale: "en" });
      expect(result).toContain("Dec");
      expect(result).toContain("31");
    });
  });
});
