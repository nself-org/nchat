import {
  render,
  screen,
  act,
  waitFor,
  renderHook,
} from "@testing-library/react";
import { ReactNode } from "react";
import { AppConfigProvider, useAppConfig } from "../app-config-context";
import { defaultAppConfig } from "@/config/app-config";

const mockFetch = jest.fn();
global.fetch = mockFetch;

let mockStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: jest.fn((key: string) => mockStore[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    mockStore[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete mockStore[key];
  }),
  clear: jest.fn(() => {
    mockStore = {};
  }),
  get length() {
    return Object.keys(mockStore).length;
  },
  key: jest.fn((index: number) => Object.keys(mockStore)[index] || null),
  // Helper to reset the mock to its default implementation
  _resetGetItem: () => {
    mockLocalStorage.getItem.mockImplementation(
      (key: string) => mockStore[key] || null,
    );
  },
};

Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

function TestComponent() {
  const { config, updateConfig, resetConfig, isLoading, saveConfig } =
    useAppConfig();

  return (
    <div>
      <div data-testid="loading">{isLoading.toString()}</div>
      <div data-testid="app-name">{config.branding.appName}</div>
      <div data-testid="setup-completed">
        {config.setup.isCompleted.toString()}
      </div>
      <div data-testid="owner-name">{config.owner.name || "no owner"}</div>
      <div data-testid="theme-preset">{config.theme.preset}</div>
      <button
        onClick={() =>
          updateConfig({
            branding: { appName: "Updated App" },
          })
        }
      >
        Update Branding
      </button>
      <button
        onClick={() =>
          updateConfig({
            setup: {
              isCompleted: true,
              currentStep: 9,
              visitedSteps: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
            },
          })
        }
      >
        Complete Setup
      </button>
      <button
        onClick={() =>
          updateConfig({
            owner: { name: "John Doe", email: "john@example.com" },
          })
        }
      >
        Update Owner
      </button>
      <button onClick={() => resetConfig()}>Reset Config</button>
      <button onClick={() => saveConfig()}>Save Config</button>
    </div>
  );
}

describe("AppConfigContext", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    mockLocalStorage._resetGetItem();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it("provides config context to children", async () => {
    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    expect(screen.getByTestId("app-name")).toBeInTheDocument();
    expect(screen.getByTestId("loading")).toBeInTheDocument();
  });

  it("throws error when useAppConfig is used outside AppConfigProvider", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      "useAppConfig must be used within an AppConfigProvider",
    );

    consoleSpy.mockRestore();
  });

  it("initializes with default config", async () => {
    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("app-name")).toHaveTextContent(
      defaultAppConfig.branding.appName,
    );
    expect(screen.getByTestId("setup-completed")).toHaveTextContent("false");
    expect(screen.getByTestId("theme-preset")).toHaveTextContent("nself");
  });

  it("loads config from localStorage on mount when API fails", async () => {
    const savedConfig = {
      ...defaultAppConfig,
      branding: { ...defaultAppConfig.branding, appName: "Saved App" },
    };
    mockLocalStorage.setItem("app-config", JSON.stringify(savedConfig));

    // Mock API to fail so localStorage value is used
    mockFetch.mockRejectedValueOnce(new Error("API error"));

    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    expect(screen.getByTestId("app-name")).toHaveTextContent("Saved App");
  });

  it("updates branding config correctly", async () => {
    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const updateButton = screen.getByText("Update Branding");

    await act(async () => {
      updateButton.click();
    });

    expect(screen.getByTestId("app-name")).toHaveTextContent("Updated App");
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "app-config",
      expect.stringContaining("Updated App"),
    );
  });

  it("updates setup config correctly", async () => {
    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const completeButton = screen.getByText("Complete Setup");

    await act(async () => {
      completeButton.click();
    });

    expect(screen.getByTestId("setup-completed")).toHaveTextContent("true");
  });

  it("updates owner info correctly", async () => {
    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const updateButton = screen.getByText("Update Owner");

    await act(async () => {
      updateButton.click();
    });

    expect(screen.getByTestId("owner-name")).toHaveTextContent("John Doe");
  });

  it("resets config to default values", async () => {
    const savedConfig = {
      ...defaultAppConfig,
      branding: { ...defaultAppConfig.branding, appName: "Custom App" },
      setup: { ...defaultAppConfig.setup, isCompleted: true },
    };
    mockLocalStorage.setItem("app-config", JSON.stringify(savedConfig));

    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("app-name")).toHaveTextContent("Custom App");
    });

    const resetButton = screen.getByText("Reset Config");

    await act(async () => {
      resetButton.click();
    });

    expect(screen.getByTestId("app-name")).toHaveTextContent(
      defaultAppConfig.branding.appName,
    );
    expect(screen.getByTestId("setup-completed")).toHaveTextContent("false");
  });

  it("saves config to localStorage on update", async () => {
    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const updateButton = screen.getByText("Update Branding");

    await act(async () => {
      updateButton.click();
    });

    expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
      "app-config",
      expect.any(String),
    );
  });

  it("attempts to save to API on update", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });

    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const updateButton = screen.getByText("Update Branding");

    await act(async () => {
      updateButton.click();
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/config",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: expect.any(String),
        }),
      );
    });
  });

  it("handles API failure gracefully when updating config", async () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mockFetch.mockRejectedValue(new Error("Network error"));

    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const updateButton = screen.getByText("Update Branding");

    await act(async () => {
      updateButton.click();
    });

    expect(screen.getByTestId("app-name")).toHaveTextContent("Updated App");

    consoleSpy.mockRestore();
  });

  it("merges server config with local config", async () => {
    const localConfig = {
      ...defaultAppConfig,
      branding: { ...defaultAppConfig.branding, appName: "Local App" },
    };
    mockLocalStorage.setItem("app-config", JSON.stringify(localConfig));

    const serverConfig = {
      branding: { appName: "Server App" },
    };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => serverConfig,
    });

    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    await waitFor(() => {
      expect(screen.getByTestId("app-name")).toHaveTextContent("Server App");
    });
  });

  it("handles localStorage parse errors gracefully", async () => {
    const consoleSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    mockLocalStorage.getItem.mockReturnValue("invalid json");

    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    consoleSpy.mockRestore();
  });

  it("preserves nested config properties on partial update", async () => {
    render(
      <AppConfigProvider>
        <TestComponent />
      </AppConfigProvider>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("loading")).toHaveTextContent("false");
    });

    const updateButton = screen.getByText("Update Branding");

    await act(async () => {
      updateButton.click();
    });

    expect(screen.getByTestId("theme-preset")).toHaveTextContent("nself");
  });
});

describe("useAppConfig hook", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <AppConfigProvider>{children}</AppConfigProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    mockLocalStorage._resetGetItem();
    mockFetch.mockReset();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
  });

  it("returns config context values", async () => {
    const { result } = renderHook(() => useAppConfig(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.config).toBeDefined();
    expect(result.current.config.branding.appName).toBe(
      defaultAppConfig.branding.appName,
    );
    expect(typeof result.current.updateConfig).toBe("function");
    expect(typeof result.current.resetConfig).toBe("function");
    expect(typeof result.current.saveConfig).toBe("function");
  });

  it("updates config through hook", async () => {
    const { result } = renderHook(() => useAppConfig(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateConfig({
        branding: { appName: "Hook Updated App" },
      });
    });

    expect(result.current.config.branding.appName).toBe("Hook Updated App");
  });

  it("resets config through hook", async () => {
    const { result } = renderHook(() => useAppConfig(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      await result.current.updateConfig({
        branding: { appName: "Custom App" },
      });
    });

    expect(result.current.config.branding.appName).toBe("Custom App");

    act(() => {
      result.current.resetConfig();
    });

    expect(result.current.config.branding.appName).toBe(
      defaultAppConfig.branding.appName,
    );
  });

  it("returns updated config from updateConfig", async () => {
    const { result } = renderHook(() => useAppConfig(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    let updatedConfig;
    await act(async () => {
      updatedConfig = await result.current.updateConfig({
        owner: { name: "Test User", email: "test@example.com" },
      });
    });

    expect(updatedConfig).toBeDefined();
    expect((updatedConfig as typeof result.current.config).owner.name).toBe(
      "Test User",
    );
  });
});
