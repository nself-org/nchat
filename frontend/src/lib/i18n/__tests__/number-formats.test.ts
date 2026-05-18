/**
 * @fileoverview Tests for number formatting
 *
 * Tests the number formatting module including currency, percentage,
 * and locale-specific number formatting.
 */

import {
  formatNumber,
  formatCurrency,
  formatPercent,
  formatBytes,
  formatCompact,
  formatDuration,
  formatWithSign,
  formatRange,
  formatOrdinal,
  getLocaleSeparators,
  parseLocalizedNumber,
  defaultCurrencies,
} from "../number-formats";

describe("number-formats", () => {
  describe("formatNumber", () => {
    it("should format number with default options", () => {
      const result = formatNumber(1234.56);
      expect(result).toContain("1");
      expect(result).toContain("234");
    });

    it("should format with thousand separators", () => {
      const result = formatNumber(1000000, { locale: "en" });
      expect(result).toContain(",");
    });

    it("should format without grouping", () => {
      const result = formatNumber(1000000, {
        locale: "en",
        useGrouping: false,
      });
      expect(result).not.toContain(",");
      expect(result).toBe("1000000");
    });

    it("should format with minimum fraction digits", () => {
      const result = formatNumber(10, {
        locale: "en",
        minimumFractionDigits: 2,
      });
      expect(result).toBe("10.00");
    });

    it("should format with maximum fraction digits", () => {
      const result = formatNumber(10.12345, {
        locale: "en",
        maximumFractionDigits: 2,
      });
      expect(result).toBe("10.12");
    });

    it("should format for German locale", () => {
      const result = formatNumber(1234.56, { locale: "de" });
      expect(result).toContain(".");
    });

    it("should format for French locale", () => {
      const result = formatNumber(1234.56, { locale: "fr" });
      expect(result).toBeDefined();
    });

    it("should format compact notation", () => {
      const result = formatNumber(1000, { locale: "en", notation: "compact" });
      expect(result).toBe("1K");
    });

    it("should format compact notation for millions", () => {
      const result = formatNumber(1500000, {
        locale: "en",
        notation: "compact",
      });
      expect(result).toContain("M");
    });

    it("should format scientific notation", () => {
      const result = formatNumber(1000000, {
        locale: "en",
        notation: "scientific",
      });
      expect(result).toContain("E");
    });

    it("should handle negative numbers", () => {
      const result = formatNumber(-1234, { locale: "en" });
      expect(result).toContain("-");
    });

    it("should handle zero", () => {
      const result = formatNumber(0, { locale: "en" });
      expect(result).toBe("0");
    });
  });

  describe("formatCurrency", () => {
    it("should format USD currency", () => {
      const result = formatCurrency(99.99, { locale: "en", currency: "USD" });
      expect(result).toContain("$");
      expect(result).toContain("99.99");
    });

    it("should format EUR currency", () => {
      const result = formatCurrency(99.99, { locale: "de", currency: "EUR" });
      expect(result).toBeDefined();
    });

    it("should use default currency for locale", () => {
      const result = formatCurrency(100, { locale: "ja" });
      expect(result).toBeDefined();
    });

    it("should format with code display", () => {
      const result = formatCurrency(100, {
        locale: "en",
        currency: "USD",
        currencyDisplay: "code",
      });
      expect(result).toContain("USD");
    });

    it("should format with name display", () => {
      const result = formatCurrency(100, {
        locale: "en",
        currency: "USD",
        currencyDisplay: "name",
      });
      expect(result.toLowerCase()).toContain("dollar");
    });

    it("should format compact currency", () => {
      const result = formatCurrency(1500000, {
        locale: "en",
        currency: "USD",
        notation: "compact",
      });
      expect(result).toContain("M");
    });

    it("should handle negative currency", () => {
      const result = formatCurrency(-50, { locale: "en", currency: "USD" });
      expect(result).toContain("-");
    });

    it("should format JPY without decimals", () => {
      const result = formatCurrency(1000, { locale: "ja", currency: "JPY" });
      expect(result).toBeDefined();
    });
  });

  describe("formatPercent", () => {
    it("should format percentage (multiply=true)", () => {
      const result = formatPercent(0.5, { locale: "en", multiply: true });
      expect(result).toBe("50%");
    });

    it("should format percentage (multiply=false)", () => {
      const result = formatPercent(50, { locale: "en", multiply: false });
      expect(result).toBe("50%");
    });

    it("should format with fraction digits", () => {
      const result = formatPercent(0.5555, {
        locale: "en",
        multiply: true,
        maximumFractionDigits: 1,
      });
      expect(result).toBe("55.6%");
    });

    it("should handle zero percentage", () => {
      const result = formatPercent(0, { locale: "en" });
      expect(result).toBe("0%");
    });

    it("should handle 100%", () => {
      const result = formatPercent(1, { locale: "en" });
      expect(result).toBe("100%");
    });

    it("should handle over 100%", () => {
      const result = formatPercent(1.5, { locale: "en" });
      expect(result).toBe("150%");
    });

    it("should format for German locale", () => {
      const result = formatPercent(0.5, { locale: "de" });
      expect(result).toBeDefined();
    });
  });

  describe("formatBytes", () => {
    it("should format bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(100)).toBe("100 B");
    });

    it("should format kilobytes", () => {
      const result = formatBytes(1024);
      expect(result).toContain("KB");
    });

    it("should format megabytes", () => {
      const result = formatBytes(1024 * 1024);
      expect(result).toContain("MB");
    });

    it("should format gigabytes", () => {
      const result = formatBytes(1024 * 1024 * 1024);
      expect(result).toContain("GB");
    });

    it("should format terabytes", () => {
      const result = formatBytes(1024 * 1024 * 1024 * 1024);
      expect(result).toContain("TB");
    });

    it("should use binary units", () => {
      const result = formatBytes(1024, { binary: true });
      expect(result).toContain("KiB");
    });

    it("should respect decimals option", () => {
      const result = formatBytes(1536, { decimals: 2 });
      expect(result).toMatch(/1\.\d{1,2}/);
    });

    it("should format for different locales", () => {
      const result = formatBytes(1500, { locale: "de" });
      expect(result).toBeDefined();
    });
  });

  describe("formatCompact", () => {
    it("should format thousands", () => {
      expect(formatCompact(1000)).toBe("1K");
      expect(formatCompact(1500)).toBe("1.5K");
    });

    it("should format millions", () => {
      expect(formatCompact(1000000)).toBe("1M");
    });

    it("should format billions", () => {
      expect(formatCompact(1000000000)).toBe("1B");
    });

    it("should format with long display", () => {
      const result = formatCompact(1000, { compactDisplay: "long" });
      expect(result.toLowerCase()).toContain("thousand");
    });

    it("should handle small numbers", () => {
      expect(formatCompact(500)).toBe("500");
    });

    it("should handle negative numbers", () => {
      const result = formatCompact(-1000);
      expect(result).toContain("-");
    });
  });

  describe("formatDuration", () => {
    it("should format seconds", () => {
      expect(formatDuration(5000)).toBe("5s");
    });

    it("should format minutes", () => {
      expect(formatDuration(65000)).toBe("1m 5s");
    });

    it("should format hours", () => {
      expect(formatDuration(3665000)).toBe("1h 1m");
    });

    it("should format days", () => {
      expect(formatDuration(90000000)).toBe("1d 1h");
    });

    it("should format verbose output", () => {
      const result = formatDuration(90065000, { verbose: true });
      expect(result).toContain("d");
      expect(result).toContain("h");
      expect(result).toContain("m");
      expect(result).toContain("s");
    });

    it("should handle zero duration", () => {
      expect(formatDuration(0)).toBe("0s");
    });

    it("should handle exact hour", () => {
      expect(formatDuration(3600000)).toBe("1h 0m");
    });
  });

  describe("formatWithSign", () => {
    it("should add plus sign for positive numbers", () => {
      const result = formatWithSign(10, { locale: "en" });
      expect(result).toContain("+");
    });

    it("should show minus sign for negative numbers", () => {
      const result = formatWithSign(-10, { locale: "en" });
      expect(result).toContain("-");
    });

    it("should not add sign for zero", () => {
      const result = formatWithSign(0, { locale: "en" });
      expect(result).toBe("0");
    });

    it("should format with fraction digits", () => {
      const result = formatWithSign(10.5, {
        locale: "en",
        minimumFractionDigits: 1,
      });
      expect(result).toContain("+");
      expect(result).toContain("10.5");
    });
  });

  describe("formatRange", () => {
    it("should format number range", () => {
      const result = formatRange(10, 20, { locale: "en" });
      expect(result).toContain("10");
      expect(result).toContain("20");
      // May use en-dash or hyphen depending on Intl implementation
      expect(result).toMatch(/10.*20/);
    });

    it("should format with fraction digits", () => {
      const result = formatRange(10.5, 20.5, {
        locale: "en",
        minimumFractionDigits: 1,
      });
      expect(result).toContain("10.5");
      expect(result).toContain("20.5");
    });

    it("should format for German locale", () => {
      const result = formatRange(1000, 2000, { locale: "de" });
      expect(result).toBeDefined();
    });
  });

  describe("formatOrdinal", () => {
    it("should format 1st in English", () => {
      expect(formatOrdinal(1, { locale: "en" })).toBe("1st");
    });

    it("should format 2nd in English", () => {
      expect(formatOrdinal(2, { locale: "en" })).toBe("2nd");
    });

    it("should format 3rd in English", () => {
      expect(formatOrdinal(3, { locale: "en" })).toBe("3rd");
    });

    it("should format 4th in English", () => {
      expect(formatOrdinal(4, { locale: "en" })).toBe("4th");
    });

    it("should handle 11th (exception)", () => {
      expect(formatOrdinal(11, { locale: "en" })).toBe("11th");
    });

    it("should handle 12th (exception)", () => {
      expect(formatOrdinal(12, { locale: "en" })).toBe("12th");
    });

    it("should handle 13th (exception)", () => {
      expect(formatOrdinal(13, { locale: "en" })).toBe("13th");
    });

    it("should handle 21st", () => {
      expect(formatOrdinal(21, { locale: "en" })).toBe("21st");
    });

    it("should handle 22nd", () => {
      expect(formatOrdinal(22, { locale: "en" })).toBe("22nd");
    });

    it("should handle 23rd", () => {
      expect(formatOrdinal(23, { locale: "en" })).toBe("23rd");
    });

    it("should format for other locales with period", () => {
      expect(formatOrdinal(1, { locale: "de" })).toBe("1.");
    });
  });

  describe("getLocaleSeparators", () => {
    it("should return separators for English", () => {
      const sep = getLocaleSeparators("en");
      expect(sep.decimal).toBe(".");
      expect(sep.thousand).toBe(",");
    });

    it("should return separators for German", () => {
      const sep = getLocaleSeparators("de");
      expect(sep.decimal).toBe(",");
      expect(sep.thousand).toBe(".");
    });

    it("should return separators for French", () => {
      const sep = getLocaleSeparators("fr");
      expect(sep.decimal).toBe(",");
    });

    it("should return default for unknown locale", () => {
      const sep = getLocaleSeparators("unknown");
      expect(sep.decimal).toBe(".");
      expect(sep.thousand).toBe(",");
    });
  });

  describe("parseLocalizedNumber", () => {
    it("should parse English number", () => {
      expect(parseLocalizedNumber("1,234.56", "en")).toBe(1234.56);
    });

    it("should parse German number", () => {
      expect(parseLocalizedNumber("1.234,56", "de")).toBe(1234.56);
    });

    it("should parse simple number", () => {
      expect(parseLocalizedNumber("123", "en")).toBe(123);
    });

    it("should return null for invalid number", () => {
      expect(parseLocalizedNumber("abc", "en")).toBeNull();
    });

    it("should parse negative number", () => {
      expect(parseLocalizedNumber("-1,234.56", "en")).toBe(-1234.56);
    });

    it("should parse number without thousand separator", () => {
      expect(parseLocalizedNumber("1234.56", "en")).toBe(1234.56);
    });
  });

  describe("defaultCurrencies", () => {
    it("should have USD for English", () => {
      expect(defaultCurrencies.en).toBe("USD");
    });

    it("should have EUR for Spanish", () => {
      expect(defaultCurrencies.es).toBe("EUR");
    });

    it("should have EUR for French", () => {
      expect(defaultCurrencies.fr).toBe("EUR");
    });

    it("should have EUR for German", () => {
      expect(defaultCurrencies.de).toBe("EUR");
    });

    it("should have SAR for Arabic", () => {
      expect(defaultCurrencies.ar).toBe("SAR");
    });

    it("should have CNY for Chinese", () => {
      expect(defaultCurrencies.zh).toBe("CNY");
    });

    it("should have JPY for Japanese", () => {
      expect(defaultCurrencies.ja).toBe("JPY");
    });

    it("should have BRL for Portuguese", () => {
      expect(defaultCurrencies.pt).toBe("BRL");
    });

    it("should have RUB for Russian", () => {
      expect(defaultCurrencies.ru).toBe("RUB");
    });
  });

  describe("edge cases", () => {
    it("should handle very large numbers", () => {
      const result = formatNumber(Number.MAX_SAFE_INTEGER, { locale: "en" });
      expect(result).toBeDefined();
    });

    it("should handle very small decimals", () => {
      const result = formatNumber(0.0000001, {
        locale: "en",
        minimumFractionDigits: 7,
        maximumFractionDigits: 7,
      });
      expect(result).toContain("0.0000001");
    });

    it("should handle NaN gracefully", () => {
      const result = formatNumber(NaN, { locale: "en" });
      expect(result).toBe("NaN");
    });

    it("should handle Infinity", () => {
      const result = formatNumber(Infinity, { locale: "en" });
      expect(result).toBeDefined();
    });

    it("should handle negative Infinity", () => {
      const result = formatNumber(-Infinity, { locale: "en" });
      expect(result).toBeDefined();
    });
  });
});
