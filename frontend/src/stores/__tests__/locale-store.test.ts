/**
 * @fileoverview Tests for locale store
 *
 * Tests the Zustand store for locale management including
 * initialization, locale switching, and namespace loading.
 */

import { act } from "@testing-library/react";
import {
  useLocaleStore,
  selectCurrentLocale,
  selectLocaleConfig,
  selectIsRTL,
  selectIsLocaleLoading,
  selectLocaleError,
  selectIsNamespaceLoaded,
} from "../locale-store";
import {
  clearTranslations,
  setCurrentLocale,
  registerTranslations,
} from "@/lib/i18n/translator";
import { clearDetectionCache } from "@/lib/i18n/language-detector";

// Mock the dynamic import
jest.mock("@/locales/en/common.json", () => ({ hello: "Hello" }), {
  virtual: true,
});
jest.mock("@/locales/en/chat.json", () => ({ send: "Send" }), {
  virtual: true,
});
jest.mock("@/locales/es/common.json", () => ({ hello: "Hola" }), {
  virtual: true,
});
jest.mock("@/locales/es/chat.json", () => ({ send: "Enviar" }), {
  virtual: true,
});

// Mock document
Object.defineProperty(document, "documentElement", {
  value: {
    dir: "",
    lang: "",
  },
  writable: true,
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock cookie
Object.defineProperty(document, "cookie", {
  value: "",
  writable: true,
});

describe("useLocaleStore", () => {
  beforeEach(() => {
    // Reset store state
    act(() => {
      useLocaleStore.setState({
        currentLocale: "en",
        isInitialized: false,
        loadedNamespaces: {},
        isLoading: false,
        error: null,
        preferredLocale: null,
        useBrowserDetection: true,
      });
    });

    clearTranslations();
    setCurrentLocale("en");
    clearDetectionCache();
    localStorageMock.getItem.mockReturnValue(null);
    jest.clearAllMocks();
  });

  describe("initial state", () => {
    it("should have default locale set to en", () => {
      const state = useLocaleStore.getState();
      expect(state.currentLocale).toBe("en");
    });

    it("should not be initialized by default", () => {
      const state = useLocaleStore.getState();
      expect(state.isInitialized).toBe(false);
    });

    it("should have empty loaded namespaces", () => {
      const state = useLocaleStore.getState();
      expect(state.loadedNamespaces).toEqual({});
    });

    it("should not be loading by default", () => {
      const state = useLocaleStore.getState();
      expect(state.isLoading).toBe(false);
    });

    it("should have no error by default", () => {
      const state = useLocaleStore.getState();
      expect(state.error).toBeNull();
    });

    it("should have no preferred locale by default", () => {
      const state = useLocaleStore.getState();
      expect(state.preferredLocale).toBeNull();
    });

    it("should have browser detection enabled by default", () => {
      const state = useLocaleStore.getState();
      expect(state.useBrowserDetection).toBe(true);
    });
  });

  describe("setUseBrowserDetection", () => {
    it("should toggle browser detection", () => {
      act(() => {
        useLocaleStore.getState().setUseBrowserDetection(false);
      });

      expect(useLocaleStore.getState().useBrowserDetection).toBe(false);

      act(() => {
        useLocaleStore.getState().setUseBrowserDetection(true);
      });

      expect(useLocaleStore.getState().useBrowserDetection).toBe(true);
    });
  });

  describe("clearError", () => {
    it("should clear error state", () => {
      act(() => {
        useLocaleStore.setState({ error: "Test error" });
      });

      expect(useLocaleStore.getState().error).toBe("Test error");

      act(() => {
        useLocaleStore.getState().clearError();
      });

      expect(useLocaleStore.getState().error).toBeNull();
    });
  });

  describe("selectors", () => {
    describe("selectCurrentLocale", () => {
      it("should return current locale", () => {
        const state = useLocaleStore.getState();
        expect(selectCurrentLocale(state)).toBe("en");
      });

      it("should return updated locale", () => {
        act(() => {
          useLocaleStore.setState({ currentLocale: "es" });
        });

        const state = useLocaleStore.getState();
        expect(selectCurrentLocale(state)).toBe("es");
      });
    });

    describe("selectLocaleConfig", () => {
      it("should return config for English", () => {
        const state = useLocaleStore.getState();
        const config = selectLocaleConfig(state);
        expect(config?.code).toBe("en");
        expect(config?.englishName).toBe("English");
      });

      it("should return config for Arabic", () => {
        act(() => {
          useLocaleStore.setState({ currentLocale: "ar" });
        });

        const state = useLocaleStore.getState();
        const config = selectLocaleConfig(state);
        expect(config?.code).toBe("ar");
        expect(config?.direction).toBe("rtl");
      });
    });

    describe("selectIsRTL", () => {
      it("should return false for English", () => {
        const state = useLocaleStore.getState();
        expect(selectIsRTL(state)).toBe(false);
      });

      it("should return true for Arabic", () => {
        act(() => {
          useLocaleStore.setState({ currentLocale: "ar" });
        });

        const state = useLocaleStore.getState();
        expect(selectIsRTL(state)).toBe(true);
      });

      it("should return false for Spanish", () => {
        act(() => {
          useLocaleStore.setState({ currentLocale: "es" });
        });

        const state = useLocaleStore.getState();
        expect(selectIsRTL(state)).toBe(false);
      });
    });

    describe("selectIsLocaleLoading", () => {
      it("should return loading state", () => {
        const state = useLocaleStore.getState();
        expect(selectIsLocaleLoading(state)).toBe(false);

        act(() => {
          useLocaleStore.setState({ isLoading: true });
        });

        const updatedState = useLocaleStore.getState();
        expect(selectIsLocaleLoading(updatedState)).toBe(true);
      });
    });

    describe("selectLocaleError", () => {
      it("should return error state", () => {
        const state = useLocaleStore.getState();
        expect(selectLocaleError(state)).toBeNull();

        act(() => {
          useLocaleStore.setState({ error: "Error message" });
        });

        const updatedState = useLocaleStore.getState();
        expect(selectLocaleError(updatedState)).toBe("Error message");
      });
    });

    describe("selectIsNamespaceLoaded", () => {
      it("should return false for unloaded namespace", () => {
        const state = useLocaleStore.getState();
        expect(selectIsNamespaceLoaded(state, "common")).toBe(false);
      });

      it("should return true for loaded namespace", () => {
        act(() => {
          useLocaleStore.setState({
            loadedNamespaces: { en: ["common"] },
          });
        });

        const state = useLocaleStore.getState();
        expect(selectIsNamespaceLoaded(state, "common")).toBe(true);
      });

      it("should check specific locale", () => {
        act(() => {
          useLocaleStore.setState({
            loadedNamespaces: { en: ["common"], es: ["chat"] },
          });
        });

        const state = useLocaleStore.getState();
        expect(selectIsNamespaceLoaded(state, "common", "en")).toBe(true);
        expect(selectIsNamespaceLoaded(state, "common", "es")).toBe(false);
        expect(selectIsNamespaceLoaded(state, "chat", "es")).toBe(true);
      });
    });
  });

  describe("state transitions", () => {
    it("should update currentLocale", () => {
      act(() => {
        useLocaleStore.setState({ currentLocale: "es" });
      });

      expect(useLocaleStore.getState().currentLocale).toBe("es");
    });

    it("should update loadedNamespaces", () => {
      act(() => {
        useLocaleStore.setState({
          loadedNamespaces: {
            en: ["common", "chat"],
            es: ["common"],
          },
        });
      });

      const state = useLocaleStore.getState();
      expect(state.loadedNamespaces.en).toContain("common");
      expect(state.loadedNamespaces.en).toContain("chat");
      expect(state.loadedNamespaces.es).toContain("common");
    });

    it("should update preferredLocale", () => {
      act(() => {
        useLocaleStore.setState({ preferredLocale: "fr" });
      });

      expect(useLocaleStore.getState().preferredLocale).toBe("fr");
    });

    it("should handle multiple state updates", () => {
      act(() => {
        useLocaleStore.setState({
          currentLocale: "ja",
          isLoading: true,
          preferredLocale: "ja",
        });
      });

      const state = useLocaleStore.getState();
      expect(state.currentLocale).toBe("ja");
      expect(state.isLoading).toBe(true);
      expect(state.preferredLocale).toBe("ja");
    });
  });

  describe("locale code types", () => {
    const localeCodes = ["en", "es", "fr", "de", "ar", "zh", "ja", "pt", "ru"];

    localeCodes.forEach((code) => {
      it(`should accept locale code: ${code}`, () => {
        act(() => {
          useLocaleStore.setState({ currentLocale: code as "en" });
        });

        expect(useLocaleStore.getState().currentLocale).toBe(code);
      });
    });
  });

  describe("RTL locales", () => {
    it("should identify Arabic as RTL", () => {
      act(() => {
        useLocaleStore.setState({ currentLocale: "ar" });
      });

      expect(selectIsRTL(useLocaleStore.getState())).toBe(true);
    });

    it("should identify LTR locales correctly", () => {
      const ltrLocales = ["en", "es", "fr", "de", "zh", "ja", "pt", "ru"];

      ltrLocales.forEach((locale) => {
        act(() => {
          useLocaleStore.setState({ currentLocale: locale as "en" });
        });

        expect(selectIsRTL(useLocaleStore.getState())).toBe(false);
      });
    });
  });

  describe("locale configs", () => {
    it("should return English config", () => {
      act(() => {
        useLocaleStore.setState({ currentLocale: "en" });
      });

      const config = selectLocaleConfig(useLocaleStore.getState());
      expect(config?.englishName).toBe("English");
      expect(config?.direction).toBe("ltr");
    });

    it("should return Spanish config", () => {
      act(() => {
        useLocaleStore.setState({ currentLocale: "es" });
      });

      const config = selectLocaleConfig(useLocaleStore.getState());
      expect(config?.englishName).toBe("Spanish");
      expect(config?.direction).toBe("ltr");
    });

    it("should return Chinese config", () => {
      act(() => {
        useLocaleStore.setState({ currentLocale: "zh" });
      });

      const config = selectLocaleConfig(useLocaleStore.getState());
      expect(config?.englishName).toBe("Chinese (Simplified)");
      expect(config?.script).toBe("Hans");
    });

    it("should return Japanese config", () => {
      act(() => {
        useLocaleStore.setState({ currentLocale: "ja" });
      });

      const config = selectLocaleConfig(useLocaleStore.getState());
      expect(config?.englishName).toBe("Japanese");
      expect(config?.script).toBe("Jpan");
    });

    it("should return Russian config", () => {
      act(() => {
        useLocaleStore.setState({ currentLocale: "ru" });
      });

      const config = selectLocaleConfig(useLocaleStore.getState());
      expect(config?.englishName).toBe("Russian");
      expect(config?.script).toBe("Cyrl");
    });
  });

  describe("error handling", () => {
    it("should set and clear error", () => {
      act(() => {
        useLocaleStore.setState({ error: "Test error" });
      });

      expect(useLocaleStore.getState().error).toBe("Test error");

      act(() => {
        useLocaleStore.getState().clearError();
      });

      expect(useLocaleStore.getState().error).toBeNull();
    });

    it("should handle error state with locale", () => {
      act(() => {
        useLocaleStore.setState({
          currentLocale: "es",
          error: "Failed to load Spanish translations",
        });
      });

      const state = useLocaleStore.getState();
      expect(state.currentLocale).toBe("es");
      expect(state.error).toBe("Failed to load Spanish translations");
    });
  });

  describe("loading states", () => {
    it("should track loading state", () => {
      act(() => {
        useLocaleStore.setState({ isLoading: true });
      });

      expect(useLocaleStore.getState().isLoading).toBe(true);

      act(() => {
        useLocaleStore.setState({ isLoading: false });
      });

      expect(useLocaleStore.getState().isLoading).toBe(false);
    });

    it("should track initialization state", () => {
      expect(useLocaleStore.getState().isInitialized).toBe(false);

      act(() => {
        useLocaleStore.setState({ isInitialized: true });
      });

      expect(useLocaleStore.getState().isInitialized).toBe(true);
    });
  });

  describe("namespace tracking", () => {
    it("should track loaded namespaces per locale", () => {
      act(() => {
        useLocaleStore.setState({
          loadedNamespaces: {
            en: ["common", "chat", "settings"],
            es: ["common"],
          },
        });
      });

      const state = useLocaleStore.getState();
      expect(state.loadedNamespaces.en).toHaveLength(3);
      expect(state.loadedNamespaces.es).toHaveLength(1);
    });

    it("should add namespace to existing locale", () => {
      act(() => {
        useLocaleStore.setState({
          loadedNamespaces: { en: ["common"] },
        });
      });

      act(() => {
        const current = useLocaleStore.getState().loadedNamespaces;
        useLocaleStore.setState({
          loadedNamespaces: {
            ...current,
            en: [...(current.en || []), "chat"],
          },
        });
      });

      expect(useLocaleStore.getState().loadedNamespaces.en).toContain("common");
      expect(useLocaleStore.getState().loadedNamespaces.en).toContain("chat");
    });
  });
});
