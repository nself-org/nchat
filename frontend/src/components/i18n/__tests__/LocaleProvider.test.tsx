/**
 * @fileoverview Tests for LocaleProvider component
 *
 * Tests the LocaleProvider component including context provision,
 * initialization, and hook usage.
 */

import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { LocaleProvider, useLocaleContext } from "../LocaleProvider";
import { useLocaleStore } from "@/stores/locale-store";
import { act } from "@testing-library/react";

// Mock the locale store
jest.mock("@/stores/locale-store", () => ({
  useLocaleStore: jest.fn(),
  selectIsRTL: jest.fn(),
  selectLocaleConfig: jest.fn(),
}));

const mockUseLocaleStore = useLocaleStore as jest.MockedFunction<
  typeof useLocaleStore
>;

describe("LocaleProvider", () => {
  const mockInitializeLocale = jest.fn().mockResolvedValue(undefined);
  const mockSetLocale = jest.fn().mockResolvedValue(undefined);
  const mockLoadNamespace = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseLocaleStore.mockImplementation((selector) => {
      if (typeof selector === "function") {
        const state = {
          currentLocale: "en",
          isInitialized: false,
          isLoading: false,
          initializeLocale: mockInitializeLocale,
          setLocale: mockSetLocale,
          loadNamespace: mockLoadNamespace,
        };
        return selector(state as never);
      }
      return {
        currentLocale: "en",
        isInitialized: false,
        isLoading: false,
        initializeLocale: mockInitializeLocale,
        setLocale: mockSetLocale,
        loadNamespace: mockLoadNamespace,
      };
    });
  });

  describe("rendering", () => {
    it("should render children", () => {
      render(
        <LocaleProvider>
          <div data-testid="child">Child content</div>
        </LocaleProvider>,
      );

      expect(screen.getByTestId("child")).toBeInTheDocument();
    });

    it("should render multiple children", () => {
      render(
        <LocaleProvider>
          <div data-testid="child1">Child 1</div>
          <div data-testid="child2">Child 2</div>
        </LocaleProvider>,
      );

      expect(screen.getByTestId("child1")).toBeInTheDocument();
      expect(screen.getByTestId("child2")).toBeInTheDocument();
    });
  });

  describe("initialization", () => {
    it("should call initializeLocale on mount", () => {
      render(
        <LocaleProvider>
          <div>Content</div>
        </LocaleProvider>,
      );

      expect(mockInitializeLocale).toHaveBeenCalled();
    });

    it("should not call initializeLocale if already initialized", () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        if (typeof selector === "function") {
          const state = {
            currentLocale: "en",
            isInitialized: true,
            isLoading: false,
            initializeLocale: mockInitializeLocale,
            setLocale: mockSetLocale,
            loadNamespace: mockLoadNamespace,
          };
          return selector(state as never);
        }
        return {
          currentLocale: "en",
          isInitialized: true,
          isLoading: false,
          initializeLocale: mockInitializeLocale,
          setLocale: mockSetLocale,
          loadNamespace: mockLoadNamespace,
        };
      });

      render(
        <LocaleProvider>
          <div>Content</div>
        </LocaleProvider>,
      );

      expect(mockInitializeLocale).not.toHaveBeenCalled();
    });
  });

  describe("initial locale", () => {
    it("should set initial locale if provided and different", async () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        if (typeof selector === "function") {
          const state = {
            currentLocale: "en",
            isInitialized: true,
            isLoading: false,
            initializeLocale: mockInitializeLocale,
            setLocale: mockSetLocale,
            loadNamespace: mockLoadNamespace,
          };
          return selector(state as never);
        }
        return {
          currentLocale: "en",
          isInitialized: true,
          isLoading: false,
          initializeLocale: mockInitializeLocale,
          setLocale: mockSetLocale,
          loadNamespace: mockLoadNamespace,
        };
      });

      render(
        <LocaleProvider initialLocale="es">
          <div>Content</div>
        </LocaleProvider>,
      );

      await waitFor(() => {
        expect(mockSetLocale).toHaveBeenCalledWith("es");
      });
    });

    it("should not set locale if same as current", () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        if (typeof selector === "function") {
          const state = {
            currentLocale: "en",
            isInitialized: true,
            isLoading: false,
            initializeLocale: mockInitializeLocale,
            setLocale: mockSetLocale,
            loadNamespace: mockLoadNamespace,
          };
          return selector(state as never);
        }
        return {
          currentLocale: "en",
          isInitialized: true,
          isLoading: false,
          initializeLocale: mockInitializeLocale,
          setLocale: mockSetLocale,
          loadNamespace: mockLoadNamespace,
        };
      });

      render(
        <LocaleProvider initialLocale="en">
          <div>Content</div>
        </LocaleProvider>,
      );

      expect(mockSetLocale).not.toHaveBeenCalled();
    });
  });

  describe("preload namespaces", () => {
    it("should preload specified namespaces", async () => {
      mockUseLocaleStore.mockImplementation((selector) => {
        if (typeof selector === "function") {
          const state = {
            currentLocale: "en",
            isInitialized: true,
            isLoading: false,
            initializeLocale: mockInitializeLocale,
            setLocale: mockSetLocale,
            loadNamespace: mockLoadNamespace,
          };
          return selector(state as never);
        }
        return {
          currentLocale: "en",
          isInitialized: true,
          isLoading: false,
          initializeLocale: mockInitializeLocale,
          setLocale: mockSetLocale,
          loadNamespace: mockLoadNamespace,
        };
      });

      render(
        <LocaleProvider preloadNamespaces={["chat", "settings"]}>
          <div>Content</div>
        </LocaleProvider>,
      );

      await waitFor(() => {
        expect(mockLoadNamespace).toHaveBeenCalledWith("chat");
        expect(mockLoadNamespace).toHaveBeenCalledWith("settings");
      });
    });

    it("should not preload if not initialized", () => {
      render(
        <LocaleProvider preloadNamespaces={["chat"]}>
          <div>Content</div>
        </LocaleProvider>,
      );

      expect(mockLoadNamespace).not.toHaveBeenCalled();
    });
  });
});

describe("useLocaleContext", () => {
  const mockSetLocale = jest.fn().mockResolvedValue(undefined);
  const mockLoadNamespace = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseLocaleStore.mockImplementation((selector) => {
      if (typeof selector === "function") {
        const state = {
          currentLocale: "en",
          isInitialized: true,
          isLoading: false,
          initializeLocale: jest.fn(),
          setLocale: mockSetLocale,
          loadNamespace: mockLoadNamespace,
        };
        return selector(state as never);
      }
      return {
        currentLocale: "en",
        isInitialized: true,
        isLoading: false,
        initializeLocale: jest.fn(),
        setLocale: mockSetLocale,
        loadNamespace: mockLoadNamespace,
      };
    });
  });

  function TestComponent() {
    const context = useLocaleContext();
    return (
      <div>
        <span data-testid="locale">{context.locale}</span>
        <span data-testid="isRTL">{String(context.isRTL)}</span>
        <span data-testid="isLoading">{String(context.isLoading)}</span>
        <span data-testid="isInitialized">{String(context.isInitialized)}</span>
      </div>
    );
  }

  it("should provide locale context", () => {
    render(
      <LocaleProvider>
        <TestComponent />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("locale")).toHaveTextContent("en");
  });

  it("should throw error when used outside provider", () => {
    // Suppress console error for this test
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      "useLocaleContext must be used within a LocaleProvider",
    );

    consoleSpy.mockRestore();
  });

  it("should provide isRTL value", () => {
    render(
      <LocaleProvider>
        <TestComponent />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("isRTL")).toBeInTheDocument();
  });

  it("should provide isLoading value", () => {
    render(
      <LocaleProvider>
        <TestComponent />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("isLoading")).toHaveTextContent("false");
  });

  it("should provide isInitialized value", () => {
    render(
      <LocaleProvider>
        <TestComponent />
      </LocaleProvider>,
    );

    expect(screen.getByTestId("isInitialized")).toHaveTextContent("true");
  });

  it("should provide setLocale function", async () => {
    function SetLocaleTest() {
      const { setLocale } = useLocaleContext();
      return <button onClick={() => setLocale("es")}>Change</button>;
    }

    render(
      <LocaleProvider>
        <SetLocaleTest />
      </LocaleProvider>,
    );

    await act(async () => {
      screen.getByRole("button").click();
    });

    expect(mockSetLocale).toHaveBeenCalledWith("es");
  });

  it("should provide loadNamespace function", async () => {
    function LoadNamespaceTest() {
      const { loadNamespace } = useLocaleContext();
      return <button onClick={() => loadNamespace("chat")}>Load</button>;
    }

    render(
      <LocaleProvider>
        <LoadNamespaceTest />
      </LocaleProvider>,
    );

    await act(async () => {
      screen.getByRole("button").click();
    });

    expect(mockLoadNamespace).toHaveBeenCalledWith("chat");
  });
});
