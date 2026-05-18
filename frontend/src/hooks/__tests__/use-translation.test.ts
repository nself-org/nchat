/**
 * @fileoverview Tests for use-translation hook
 *
 * Tests the translation hook including namespace support,
 * interpolation, and integration with locale store.
 */

import { renderHook, act } from "@testing-library/react";
import {
  useTranslation,
  createNamespacedUseTranslation,
  useCommonTranslation,
  useChatTranslation,
  useSettingsTranslation,
  useAdminTranslation,
  useAuthTranslation,
  useErrorsTranslation,
} from "../use-translation";
import { useLocaleStore } from "@/stores/locale-store";
import {
  registerTranslations,
  clearTranslations,
  setCurrentLocale,
} from "@/lib/i18n/translator";

// Mock the locale store
jest.mock("@/stores/locale-store", () => ({
  useLocaleStore: jest.fn(),
}));

const mockUseLocaleStore = useLocaleStore as jest.MockedFunction<
  typeof useLocaleStore
>;

describe("useTranslation", () => {
  beforeEach(() => {
    clearTranslations();
    setCurrentLocale("en");

    // Register test translations
    registerTranslations("en", "common", {
      hello: "Hello",
      greeting: "Hello, {{name}}!",
      nested: {
        value: "Nested Value",
      },
      messages: {
        count_one: "{{count}} message",
        count_other: "{{count}} messages",
      },
    });

    registerTranslations("en", "chat", {
      title: "Chat",
      send: "Send Message",
      typing: "{{name}} is typing...",
    });

    registerTranslations("es", "common", {
      hello: "Hola",
      greeting: "Hola, {{name}}!",
    });

    // Default mock implementation
    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "en",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("basic translation", () => {
    it("should translate simple key", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.t("hello")).toBe("Hello");
    });

    it("should return current locale", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.locale).toBe("en");
    });

    it("should return loading state", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.isLoading).toBe(false);
    });

    it("should return error state", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.error).toBeNull();
    });

    it("should translate nested key", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.t("nested.value")).toBe("Nested Value");
    });

    it("should return key for missing translation", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.t("missing.key")).toBe("missing.key");
    });
  });

  describe("namespace support", () => {
    it("should use default namespace", () => {
      const { result } = renderHook(() => useTranslation("chat"));
      expect(result.current.t("title")).toBe("Chat");
    });

    it("should allow namespace in key", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.t("chat:title")).toBe("Chat");
    });

    it("should override namespace in options", () => {
      const { result } = renderHook(() => useTranslation("common"));
      expect(result.current.t("title", { ns: "chat" })).toBe("Chat");
    });

    it("should use ns option", () => {
      const { result } = renderHook(() =>
        useTranslation(undefined, { ns: "chat" }),
      );
      expect(result.current.t("send")).toBe("Send Message");
    });
  });

  describe("interpolation", () => {
    it("should interpolate values", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.t("greeting", { values: { name: "World" } })).toBe(
        "Hello, World!",
      );
    });

    it("should accept values directly", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.t("greeting", { name: "World" })).toBe(
        "Hello, World!",
      );
    });

    it("should interpolate in namespaced translations", () => {
      const { result } = renderHook(() => useTranslation("chat"));
      expect(result.current.t("typing", { values: { name: "Alice" } })).toBe(
        "Alice is typing...",
      );
    });
  });

  describe("pluralization", () => {
    it("should handle count=1", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.t("messages.count", { count: 1 })).toBe(
        "1 message",
      );
    });

    it("should handle count>1", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.t("messages.count", { count: 5 })).toBe(
        "5 messages",
      );
    });

    it("should handle count=0", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.t("messages.count", { count: 0 })).toBe(
        "0 messages",
      );
    });
  });

  describe("exists function", () => {
    it("should return true for existing key", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.exists("hello")).toBe(true);
    });

    it("should return false for missing key", () => {
      const { result } = renderHook(() => useTranslation());
      expect(result.current.exists("missing")).toBe(false);
    });

    it("should check in specified namespace", () => {
      const { result } = renderHook(() => useTranslation("chat"));
      expect(result.current.exists("title")).toBe(true);
      expect(result.current.exists("hello")).toBe(false);
    });
  });

  describe("key prefix", () => {
    it("should prepend key prefix", () => {
      const { result } = renderHook(() =>
        useTranslation("common", { keyPrefix: "nested" }),
      );
      expect(result.current.t("value")).toBe("Nested Value");
    });

    it("should work with exists function", () => {
      const { result } = renderHook(() =>
        useTranslation("common", { keyPrefix: "nested" }),
      );
      expect(result.current.exists("value")).toBe(true);
    });
  });

  describe("loading states", () => {
    it("should reflect loading state from store", () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        const state = {
          currentLocale: "en",
          isLoading: true,
          error: null,
        };
        return selector(state as never);
      });

      const { result } = renderHook(() => useTranslation());
      expect(result.current.isLoading).toBe(true);
    });

    it("should reflect error state from store", () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        const state = {
          currentLocale: "en",
          isLoading: false,
          error: "Failed to load translations",
        };
        return selector(state as never);
      });

      const { result } = renderHook(() => useTranslation());
      expect(result.current.error).toBe("Failed to load translations");
    });
  });

  describe("locale changes", () => {
    it("should return updated locale", () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        const state = {
          currentLocale: "es",
          isLoading: false,
          error: null,
        };
        return selector(state as never);
      });

      const { result } = renderHook(() => useTranslation());
      expect(result.current.locale).toBe("es");
    });
  });
});

describe("createNamespacedUseTranslation", () => {
  beforeEach(() => {
    clearTranslations();
    setCurrentLocale("en");

    registerTranslations("en", "custom", {
      key: "Custom Value",
    });

    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "en",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });
  });

  it("should create namespaced hook", () => {
    const useCustomTranslation = createNamespacedUseTranslation("custom");
    const { result } = renderHook(() => useCustomTranslation());
    expect(result.current.t("key")).toBe("Custom Value");
  });

  it("should accept options", () => {
    registerTranslations("en", "custom", {
      prefix: { nested: "Prefixed Value" },
    });

    const useCustomTranslation = createNamespacedUseTranslation("custom");
    const { result } = renderHook(() =>
      useCustomTranslation({ keyPrefix: "prefix" }),
    );
    expect(result.current.t("nested")).toBe("Prefixed Value");
  });
});

describe("namespace-specific hooks", () => {
  beforeEach(() => {
    clearTranslations();
    setCurrentLocale("en");

    registerTranslations("en", "common", { commonKey: "Common" });
    registerTranslations("en", "chat", { chatKey: "Chat" });
    registerTranslations("en", "settings", { settingsKey: "Settings" });
    registerTranslations("en", "admin", { adminKey: "Admin" });
    registerTranslations("en", "auth", { authKey: "Auth" });
    registerTranslations("en", "errors", { errorsKey: "Errors" });

    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "en",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });
  });

  it("useCommonTranslation should use common namespace", () => {
    const { result } = renderHook(() => useCommonTranslation());
    expect(result.current.t("commonKey")).toBe("Common");
  });

  it("useChatTranslation should use chat namespace", () => {
    const { result } = renderHook(() => useChatTranslation());
    expect(result.current.t("chatKey")).toBe("Chat");
  });

  it("useSettingsTranslation should use settings namespace", () => {
    const { result } = renderHook(() => useSettingsTranslation());
    expect(result.current.t("settingsKey")).toBe("Settings");
  });

  it("useAdminTranslation should use admin namespace", () => {
    const { result } = renderHook(() => useAdminTranslation());
    expect(result.current.t("adminKey")).toBe("Admin");
  });

  it("useAuthTranslation should use auth namespace", () => {
    const { result } = renderHook(() => useAuthTranslation());
    expect(result.current.t("authKey")).toBe("Auth");
  });

  it("useErrorsTranslation should use errors namespace", () => {
    const { result } = renderHook(() => useErrorsTranslation());
    expect(result.current.t("errorsKey")).toBe("Errors");
  });

  it("namespace hooks should accept keyPrefix option", () => {
    registerTranslations("en", "common", {
      prefix: { value: "Prefixed" },
    });

    const { result } = renderHook(() =>
      useCommonTranslation({ keyPrefix: "prefix" }),
    );
    expect(result.current.t("value")).toBe("Prefixed");
  });
});

describe("memoization", () => {
  beforeEach(() => {
    clearTranslations();
    setCurrentLocale("en");
    registerTranslations("en", "common", { hello: "Hello" });

    mockUseLocaleStore.mockImplementation((selector) => {
      const state = {
        currentLocale: "en",
        isLoading: false,
        error: null,
      };
      return selector(state as never);
    });
  });

  it("should maintain stable t function reference", () => {
    const { result, rerender } = renderHook(() => useTranslation());
    const firstT = result.current.t;

    rerender();
    expect(result.current.t).toBe(firstT);
  });

  it("should update t function when namespace changes", () => {
    const { result, rerender } = renderHook(({ ns }) => useTranslation(ns), {
      initialProps: { ns: "common" },
    });
    const firstT = result.current.t;

    rerender({ ns: "chat" });
    expect(result.current.t).not.toBe(firstT);
  });

  it("should maintain stable exists function reference", () => {
    const { result, rerender } = renderHook(() => useTranslation());
    const firstExists = result.current.exists;

    rerender();
    expect(result.current.exists).toBe(firstExists);
  });
});
