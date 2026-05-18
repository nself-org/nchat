import { render, screen, act, renderHook } from "@testing-library/react";
import { ThemeProvider, useTheme } from "../theme-context";
import { ReactNode } from "react";

// Test component to access theme context
function TestComponent() {
  const { theme, setTheme, themeConfig, updateThemeConfig } = useTheme();

  return (
    <div>
      <div data-testid="theme">{theme}</div>
      <div data-testid="primary-color">{themeConfig.primary}</div>
      <div data-testid="secondary-color">{themeConfig.secondary}</div>
      <div data-testid="accent-color">{themeConfig.accent}</div>
      <button onClick={() => setTheme("dark")}>Set Dark</button>
      <button onClick={() => setTheme("light")}>Set Light</button>
      <button onClick={() => setTheme("system")}>Set System</button>
      <button onClick={() => updateThemeConfig({ primary: "#FF0000" })}>
        Update Primary
      </button>
      <button onClick={() => updateThemeConfig({ secondary: "#00FF00" })}>
        Update Secondary
      </button>
      <button onClick={() => updateThemeConfig({ accent: "#0000FF" })}>
        Update Accent
      </button>
      <button
        onClick={() =>
          updateThemeConfig({
            primary: "#111111",
            secondary: "#222222",
            accent: "#333333",
          })
        }
      >
        Update All Colors
      </button>
    </div>
  );
}

describe("ThemeContext", () => {
  beforeEach(() => {
    // Reset document classes
    document.documentElement.className = "";
    // Reset CSS variables
    document.documentElement.style.cssText = "";
  });

  it("provides theme context to children", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toBeInTheDocument();
    expect(screen.getByTestId("primary-color")).toBeInTheDocument();
  });

  it("throws error when useTheme is used outside ThemeProvider", () => {
    const consoleSpy = jest
      .spyOn(console, "error")
      .mockImplementation(() => {});

    expect(() => render(<TestComponent />)).toThrow(
      "useTheme must be used within a ThemeProvider",
    );

    consoleSpy.mockRestore();
  });

  it("initializes with system theme", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("theme")).toHaveTextContent("system");
  });

  it("initializes with default theme colors", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(screen.getByTestId("primary-color")).toHaveTextContent("#5865F2");
    expect(screen.getByTestId("secondary-color")).toHaveTextContent("#7B68EE");
    expect(screen.getByTestId("accent-color")).toHaveTextContent("#00BFA5");
  });

  it("changes theme to dark", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const setDarkButton = screen.getByText("Set Dark");

    act(() => {
      setDarkButton.click();
    });

    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
    expect(document.documentElement).toHaveClass("dark");
  });

  it("changes theme to light", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const setLightButton = screen.getByText("Set Light");

    act(() => {
      setLightButton.click();
    });

    expect(screen.getByTestId("theme")).toHaveTextContent("light");
    expect(document.documentElement).toHaveClass("light");
  });

  it("applies system theme based on media query", () => {
    // Mock dark mode preference
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === "(prefers-color-scheme: dark)",
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    // System theme should apply dark mode
    expect(document.documentElement).toHaveClass("dark");
  });

  it("updates theme configuration", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const updateButton = screen.getByText("Update Primary");

    act(() => {
      updateButton.click();
    });

    expect(screen.getByTestId("primary-color")).toHaveTextContent("#FF0000");
    // Other colors should remain unchanged
    expect(screen.getByTestId("secondary-color")).toHaveTextContent("#7B68EE");
    expect(screen.getByTestId("accent-color")).toHaveTextContent("#00BFA5");
  });

  it("applies CSS variables for theme colors", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const styles = document.documentElement.style;
    expect(styles.getPropertyValue("--primary")).toBe("#5865F2");
    expect(styles.getPropertyValue("--secondary")).toBe("#7B68EE");
    expect(styles.getPropertyValue("--accent")).toBe("#00BFA5");
  });

  it("updates CSS variables when theme config changes", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const updateButton = screen.getByText("Update Primary");

    act(() => {
      updateButton.click();
    });

    const styles = document.documentElement.style;
    expect(styles.getPropertyValue("--primary")).toBe("#FF0000");
  });

  it("removes previous theme class when switching themes", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const setDarkButton = screen.getByText("Set Dark");
    const setLightButton = screen.getByText("Set Light");

    act(() => {
      setDarkButton.click();
    });

    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).not.toHaveClass("light");

    act(() => {
      setLightButton.click();
    });

    expect(document.documentElement).toHaveClass("light");
    expect(document.documentElement).not.toHaveClass("dark");
  });

  it("preserves theme config across theme changes", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const updateButton = screen.getByText("Update Primary");
    const setDarkButton = screen.getByText("Set Dark");

    act(() => {
      updateButton.click();
    });

    expect(screen.getByTestId("primary-color")).toHaveTextContent("#FF0000");

    act(() => {
      setDarkButton.click();
    });

    // Color config should persist after theme change
    expect(screen.getByTestId("primary-color")).toHaveTextContent("#FF0000");
  });
});

describe("useTheme hook", () => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <ThemeProvider>{children}</ThemeProvider>
  );

  it("returns theme context values", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    expect(result.current.theme).toBe("system");
    expect(result.current.themeConfig).toEqual({
      primary: "#5865F2",
      secondary: "#7B68EE",
      accent: "#00BFA5",
    });
    expect(typeof result.current.setTheme).toBe("function");
    expect(typeof result.current.updateThemeConfig).toBe("function");
  });

  it("updates theme through hook", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.setTheme("dark");
    });

    expect(result.current.theme).toBe("dark");
  });

  it("updates theme config through hook", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.updateThemeConfig({ primary: "#00FF00" });
    });

    expect(result.current.themeConfig.primary).toBe("#00FF00");
    expect(result.current.themeConfig.secondary).toBe("#7B68EE");
  });

  it("updates multiple theme config properties at once", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => {
      result.current.updateThemeConfig({
        primary: "#AAAAAA",
        secondary: "#BBBBBB",
        accent: "#CCCCCC",
      });
    });

    expect(result.current.themeConfig.primary).toBe("#AAAAAA");
    expect(result.current.themeConfig.secondary).toBe("#BBBBBB");
    expect(result.current.themeConfig.accent).toBe("#CCCCCC");
  });
});

describe("ThemeContext additional tests", () => {
  beforeEach(() => {
    document.documentElement.className = "";
    document.documentElement.style.cssText = "";
  });

  it("updates secondary color correctly", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const updateButton = screen.getByText("Update Secondary");

    act(() => {
      updateButton.click();
    });

    expect(screen.getByTestId("secondary-color")).toHaveTextContent("#00FF00");
    expect(screen.getByTestId("primary-color")).toHaveTextContent("#5865F2");
    expect(screen.getByTestId("accent-color")).toHaveTextContent("#00BFA5");
  });

  it("updates accent color correctly", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const updateButton = screen.getByText("Update Accent");

    act(() => {
      updateButton.click();
    });

    expect(screen.getByTestId("accent-color")).toHaveTextContent("#0000FF");
    expect(screen.getByTestId("primary-color")).toHaveTextContent("#5865F2");
    expect(screen.getByTestId("secondary-color")).toHaveTextContent("#7B68EE");
  });

  it("updates all colors at once", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const updateButton = screen.getByText("Update All Colors");

    act(() => {
      updateButton.click();
    });

    expect(screen.getByTestId("primary-color")).toHaveTextContent("#111111");
    expect(screen.getByTestId("secondary-color")).toHaveTextContent("#222222");
    expect(screen.getByTestId("accent-color")).toHaveTextContent("#333333");
  });

  it("applies CSS variables for all updated colors", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const updateButton = screen.getByText("Update All Colors");

    act(() => {
      updateButton.click();
    });

    const styles = document.documentElement.style;
    expect(styles.getPropertyValue("--primary")).toBe("#111111");
    expect(styles.getPropertyValue("--secondary")).toBe("#222222");
    expect(styles.getPropertyValue("--accent")).toBe("#333333");
  });

  it("handles multiple sequential theme changes", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const setDarkButton = screen.getByText("Set Dark");
    const setLightButton = screen.getByText("Set Light");
    const setSystemButton = screen.getByText("Set System");

    act(() => {
      setDarkButton.click();
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");

    act(() => {
      setLightButton.click();
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("light");

    act(() => {
      setSystemButton.click();
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("system");

    act(() => {
      setDarkButton.click();
    });
    expect(screen.getByTestId("theme")).toHaveTextContent("dark");
  });

  it("handles light mode media query preference", () => {
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === "(prefers-color-scheme: light)",
      media: query,
      onchange: null,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));

    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    expect(document.documentElement).toHaveClass("light");
  });

  it("renders children correctly", () => {
    render(
      <ThemeProvider>
        <div data-testid="child-element">Child Content</div>
      </ThemeProvider>,
    );

    expect(screen.getByTestId("child-element")).toBeInTheDocument();
    expect(screen.getByTestId("child-element")).toHaveTextContent(
      "Child Content",
    );
  });

  it("maintains theme config when same values are applied", () => {
    render(
      <ThemeProvider>
        <TestComponent />
      </ThemeProvider>,
    );

    const updateButton = screen.getByText("Update Primary");

    act(() => {
      updateButton.click();
    });

    expect(screen.getByTestId("primary-color")).toHaveTextContent("#FF0000");

    act(() => {
      updateButton.click();
    });

    expect(screen.getByTestId("primary-color")).toHaveTextContent("#FF0000");
    expect(screen.getByTestId("secondary-color")).toHaveTextContent("#7B68EE");
  });
});
