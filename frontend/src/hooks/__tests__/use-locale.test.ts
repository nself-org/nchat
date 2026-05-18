/**
 * @fileoverview Tests for use-locale hook
 *
 * Tests the locale hook including locale management,
 * formatting functions, and RTL detection.
 */

import { renderHook, act, waitFor } from "@testing-library/react";
import {
  useLocale,
  useIsRTL,
  useDirection,
  useLocaleConfig,
} from "../use-locale";
import { useLocaleStore } from "@/stores/locale-store";

// Mock the locale store
jest.mock("@/stores/locale-store", () => ({
  useLocaleStore: jest.fn(),
}));

const mockUseLocaleStore = useLocaleStore as jest.MockedFunction<
  typeof useLocaleStore
>;

describe("useLocale", () => {
  const mockSetLocale = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    mockSetLocale.mockClear();

    // Default mock implementation
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "en",
        isLoading: false,
        error: null,
        setLocale: mockSetLocale,
      };
      return selector(state as never);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("locale state", () => {
    it("should return current locale", () => {
      const { result } = renderHook(() => useLocale());
      expect(result.current.locale).toBe("en");
    });

    it("should return locale config", () => {
      const { result } = renderHook(() => useLocale());
      expect(result.current.localeConfig).toBeDefined();
      expect(result.current.localeConfig?.code).toBe("en");
    });

    it("should return isRTL false for English", () => {
      const { result } = renderHook(() => useLocale());
      expect(result.current.isRTL).toBe(false);
    });

    it("should return isRTL true for Arabic", () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        const state = {
          currentLocale: "ar",
          isLoading: false,
          error: null,
          setLocale: mockSetLocale,
        };
        return selector(state as never);
      });

      const { result } = renderHook(() => useLocale());
      expect(result.current.isRTL).toBe(true);
    });

    it("should return direction ltr for English", () => {
      const { result } = renderHook(() => useLocale());
      expect(result.current.direction).toBe("ltr");
    });

    it("should return direction rtl for Arabic", () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        const state = {
          currentLocale: "ar",
          isLoading: false,
          error: null,
          setLocale: mockSetLocale,
        };
        return selector(state as never);
      });

      const { result } = renderHook(() => useLocale());
      expect(result.current.direction).toBe("rtl");
    });

    it("should return loading state", () => {
      const { result } = renderHook(() => useLocale());
      expect(result.current.isLoading).toBe(false);
    });

    it("should return error state", () => {
      const { result } = renderHook(() => useLocale());
      expect(result.current.error).toBeNull();
    });
  });

  describe("setLocale", () => {
    it("should call store setLocale", async () => {
      const { result } = renderHook(() => useLocale());

      await act(async () => {
        await result.current.setLocale("es");
      });

      expect(mockSetLocale).toHaveBeenCalledWith("es");
    });

    it("should handle multiple locale changes", async () => {
      const { result } = renderHook(() => useLocale());

      await act(async () => {
        await result.current.setLocale("es");
      });

      await act(async () => {
        await result.current.setLocale("fr");
      });

      expect(mockSetLocale).toHaveBeenCalledTimes(2);
      expect(mockSetLocale).toHaveBeenLastCalledWith("fr");
    });
  });

  describe("date formatting", () => {
    const testDate = new Date(2024, 0, 15, 14, 30, 0);

    it("should format date with locale", () => {
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatDate(testDate);
      expect(formatted).toContain("Jan");
      expect(formatted).toContain("15");
    });

    it("should format date with custom pattern", () => {
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatDate(testDate, {
        pattern: "short",
      });
      expect(formatted).toMatch(/\d{1,2}\/\d{1,2}\/\d{2}/);
    });

    it("should format time", () => {
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatTime(testDate);
      expect(formatted).toMatch(/\d{1,2}:\d{2}/);
    });

    it("should format time with seconds", () => {
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatTime(testDate, {
        withSeconds: true,
      });
      expect(formatted).toMatch(/\d{1,2}:\d{2}:\d{2}/);
    });

    it("should format relative time", () => {
      const recentDate = new Date(Date.now() - 5 * 60 * 1000);
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatRelativeTime(recentDate);
      expect(formatted).toContain("minute");
    });

    it("should format smart date", () => {
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatSmartDate(new Date());
      expect(formatted).toBeDefined();
    });

    it("should format message time", () => {
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatMessageTime(new Date());
      expect(formatted).toBeDefined();
    });

    it("should use locale for date formatting", () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        const state = {
          currentLocale: "de",
          isLoading: false,
          error: null,
          setLocale: mockSetLocale,
        };
        return selector(state as never);
      });

      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatDate(testDate, {
        pattern: "short",
      });
      // German format uses dots
      expect(formatted).toMatch(/\d{2}\.\d{2}\.\d{2}/);
    });
  });

  describe("number formatting", () => {
    it("should format number", () => {
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatNumber(1234.56);
      expect(formatted).toContain("1");
      expect(formatted).toContain("234");
    });

    it("should format currency", () => {
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatCurrency(99.99, {
        currency: "USD",
      });
      expect(formatted).toContain("$");
    });

    it("should format percent", () => {
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatPercent(0.5);
      expect(formatted).toContain("%");
    });

    it("should format compact", () => {
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatCompact(1000);
      expect(formatted).toBe("1K");
    });

    it("should format bytes", () => {
      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatBytes(1024);
      expect(formatted).toContain("KB");
    });

    it("should use locale for number formatting", () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        const state = {
          currentLocale: "de",
          isLoading: false,
          error: null,
          setLocale: mockSetLocale,
        };
        return selector(state as never);
      });

      const { result } = renderHook(() => useLocale());
      const formatted = result.current.formatNumber(1234.56);
      // German format uses comma for decimal
      expect(formatted).toContain(",");
    });
  });

  describe("loading and error states", () => {
    it("should reflect loading state", () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        const state = {
          currentLocale: "en",
          isLoading: true,
          error: null,
          setLocale: mockSetLocale,
        };
        return selector(state as never);
      });

      const { result } = renderHook(() => useLocale());
      expect(result.current.isLoading).toBe(true);
    });

    it("should reflect error state", () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        const state = {
          currentLocale: "en",
          isLoading: false,
          error: "Failed to load",
          setLocale: mockSetLocale,
        };
        return selector(state as never);
      });

      const { result } = renderHook(() => useLocale());
      expect(result.current.error).toBe("Failed to load");
    });
  });

  describe("memoization", () => {
    it("should maintain stable function references", () => {
      const { result, rerender } = renderHook(() => useLocale());
      const firstFormatDate = result.current.formatDate;
      const firstFormatNumber = result.current.formatNumber;

      rerender();

      expect(result.current.formatDate).toBe(firstFormatDate);
      expect(result.current.formatNumber).toBe(firstFormatNumber);
    });

    it("should update functions when locale changes", () => {
      let currentLocale = "en";
      mockUseLocaleStore.mockImplementation((selector) => {
        const state = {
          currentLocale,
          isLoading: false,
          error: null,
          setLocale: mockSetLocale,
        };
        return selector(state as never);
      });

      const { result, rerender } = renderHook(() => useLocale());
      const firstFormatDate = result.current.formatDate;

      currentLocale = "es";
      rerender();

      expect(result.current.formatDate).not.toBe(firstFormatDate);
    });
  });
});

describe("useIsRTL", () => {
  beforeEach(() => {
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "en",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });
  });

  it("should return false for English", () => {
    const { result } = renderHook(() => useIsRTL());
    expect(result.current).toBe(false);
  });

  it("should return true for Arabic", () => {
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "ar",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useIsRTL());
    expect(result.current).toBe(true);
  });

  it("should return false for Chinese", () => {
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "zh",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useIsRTL());
    expect(result.current).toBe(false);
  });
});

describe("useDirection", () => {
  beforeEach(() => {
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "en",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });
  });

  it("should return ltr for English", () => {
    const { result } = renderHook(() => useDirection());
    expect(result.current).toBe("ltr");
  });

  it("should return rtl for Arabic", () => {
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "ar",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useDirection());
    expect(result.current).toBe("rtl");
  });

  it("should return ltr for Spanish", () => {
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "es",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useDirection());
    expect(result.current).toBe("ltr");
  });
});

describe("useLocaleConfig", () => {
  beforeEach(() => {
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "en",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });
  });

  it("should return config for English", () => {
    const { result } = renderHook(() => useLocaleConfig());
    expect(result.current?.code).toBe("en");
    expect(result.current?.englishName).toBe("English");
  });

  it("should return config for Spanish", () => {
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "es",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useLocaleConfig());
    expect(result.current?.code).toBe("es");
    expect(result.current?.englishName).toBe("Spanish");
  });

  it("should return config for Arabic", () => {
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "ar",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useLocaleConfig());
    expect(result.current?.code).toBe("ar");
    expect(result.current?.direction).toBe("rtl");
  });

  it("should return undefined for invalid locale", () => {
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "invalid",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });

    const { result } = renderHook(() => useLocaleConfig());
    expect(result.current).toBeUndefined();
  });
});
