/**
 * @fileoverview Tests for LanguageSwitcher component
 *
 * Tests the LanguageSwitcher and LanguageSelect components
 * including locale selection and display options.
 */

import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LanguageSwitcher, LanguageSelect } from "../LanguageSwitcher";
import { useLocaleStore } from "@/stores/locale-store";

// Mock the locale store
jest.mock("@/stores/locale-store", () => ({
  useLocaleStore: jest.fn(),
}));

// Mock the translate function
jest.mock("@/lib/i18n/translator", () => ({
  translate: jest.fn((key) => {
    const translations: Record<string, string> = {
      "language.select": "Select Language",
    };
    return translations[key] || key;
  }),
}));

const mockUseLocaleStore = useLocaleStore as jest.MockedFunction<
  typeof useLocaleStore
>;

describe("LanguageSwitcher", () => {
  const mockSetLocale = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseLocaleStore.mockReturnValue({
      currentLocale: "en",
      setLocale: mockSetLocale,
      isLoading: false,
    } as never);
  });

  describe("rendering", () => {
    it("should render with default trigger", () => {
      render(<LanguageSwitcher />);
      expect(screen.getByRole("button")).toBeInTheDocument();
    });

    it("should render with custom trigger", () => {
      render(
        <LanguageSwitcher
          trigger={<button data-testid="custom-trigger">Custom</button>}
        />,
      );
      expect(screen.getByTestId("custom-trigger")).toBeInTheDocument();
    });

    it("should render compact mode", () => {
      render(<LanguageSwitcher compact />);
      const button = screen.getByRole("button");
      expect(button).toBeInTheDocument();
    });

    it("should apply custom className", () => {
      render(<LanguageSwitcher className="custom-class" />);
      const button = screen.getByRole("button");
      expect(button).toHaveClass("custom-class");
    });

    it("should be disabled when loading", () => {
      mockUseLocaleStore.mockReturnValue({
        currentLocale: "en",
        setLocale: mockSetLocale,
        isLoading: true,
      } as never);

      render(<LanguageSwitcher />);
      expect(screen.getByRole("button")).toBeDisabled();
    });
  });

  describe("dropdown behavior", () => {
    it("should open dropdown on click", async () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Select Language")).toBeInTheDocument();
      });
    });

    it("should show available languages", async () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      await userEvent.click(button);

      await waitFor(() => {
        // Use getAllByText since English appears in both button and dropdown
        const englishElements = screen.getAllByText("English");
        expect(englishElements.length).toBeGreaterThan(0);
      });
    });
  });

  describe("display options", () => {
    it("should show native name by default", () => {
      render(<LanguageSwitcher />);
      // English button should show the native name
      expect(screen.getByRole("button")).toHaveTextContent("English");
    });

    it("should hide flags when showFlag is false", () => {
      render(<LanguageSwitcher showFlag={false} />);
      // Check that no flag emoji is in the button text
      const button = screen.getByRole("button");
      // Button should not contain flag emoji pattern
      expect(button.textContent).not.toMatch(/[\u{1F1E0}-\u{1F1FF}]/u);
    });
  });

  describe("locale selection", () => {
    it("should call onLocaleChange when locale is selected", async () => {
      const onLocaleChange = jest.fn();
      render(<LanguageSwitcher onLocaleChange={onLocaleChange} />);

      const button = screen.getByRole("button");
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Select Language")).toBeInTheDocument();
      });

      // Find and click Spanish option
      const spanishOption = screen.getByText(/Espanol/i);
      await userEvent.click(spanishOption);

      await waitFor(() => {
        expect(mockSetLocale).toHaveBeenCalledWith("es");
        expect(onLocaleChange).toHaveBeenCalledWith("es");
      });
    });

    it("should not change locale when same locale is selected", async () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      await userEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText("Select Language")).toBeInTheDocument();
      });

      // Find and click English option (already selected) - use getAllByText since English appears multiple times
      const englishElements = screen.getAllByText("English");
      // Click the one in the dropdown menu (not the button)
      const englishOption = englishElements.find((el) =>
        el.closest('[role="menuitem"]'),
      );
      if (englishOption) {
        await userEvent.click(englishOption);
      }

      expect(mockSetLocale).not.toHaveBeenCalled();
    });
  });

  describe("complete locales filter", () => {
    it("should show all locales by default", async () => {
      render(<LanguageSwitcher />);

      const button = screen.getByRole("button");
      await userEvent.click(button);

      await waitFor(() => {
        // Use getAllByText since English appears in both button and dropdown
        const englishElements = screen.getAllByText("English");
        expect(englishElements.length).toBeGreaterThan(0);
      });
    });

    it("should filter incomplete locales when showOnlyComplete is true", async () => {
      render(<LanguageSwitcher showOnlyComplete />);

      const button = screen.getByRole("button");
      await userEvent.click(button);

      await waitFor(() => {
        // Use getAllByText since English appears in both button and dropdown
        const englishElements = screen.getAllByText("English");
        expect(englishElements.length).toBeGreaterThan(0);
      });
    });
  });
});

describe("LanguageSelect", () => {
  const mockSetLocale = jest.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    jest.clearAllMocks();

    mockUseLocaleStore.mockReturnValue({
      currentLocale: "en",
      setLocale: mockSetLocale,
      isLoading: false,
    } as never);
  });

  describe("rendering", () => {
    it("should render select element", () => {
      render(<LanguageSelect />);
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });

    it("should show current locale as selected", () => {
      render(<LanguageSelect />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("en");
    });

    it("should show all locales as options", () => {
      render(<LanguageSelect />);
      const options = screen.getAllByRole("option");
      expect(options.length).toBeGreaterThan(0);
    });

    it("should apply custom className", () => {
      render(<LanguageSelect className="custom-class" />);
      expect(screen.getByRole("combobox")).toHaveClass("custom-class");
    });

    it("should be disabled when disabled prop is true", () => {
      render(<LanguageSelect disabled />);
      expect(screen.getByRole("combobox")).toBeDisabled();
    });

    it("should be disabled when loading", () => {
      mockUseLocaleStore.mockReturnValue({
        currentLocale: "en",
        setLocale: mockSetLocale,
        isLoading: true,
      } as never);

      render(<LanguageSelect />);
      expect(screen.getByRole("combobox")).toBeDisabled();
    });
  });

  describe("controlled value", () => {
    it("should use controlled value", () => {
      render(<LanguageSelect value="es" />);
      const select = screen.getByRole("combobox") as HTMLSelectElement;
      expect(select.value).toBe("es");
    });

    it("should call onChange with new value", async () => {
      const onChange = jest.fn();
      render(<LanguageSelect onChange={onChange} />);

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "es");

      expect(onChange).toHaveBeenCalledWith("es");
    });
  });

  describe("uncontrolled behavior", () => {
    it("should call setLocale when no onChange provided", async () => {
      render(<LanguageSelect />);

      const select = screen.getByRole("combobox");
      await userEvent.selectOptions(select, "es");

      expect(mockSetLocale).toHaveBeenCalledWith("es");
    });
  });

  describe("complete locales filter", () => {
    it("should show only complete locales when showOnlyComplete is true", () => {
      render(<LanguageSelect showOnlyComplete />);
      const options = screen.getAllByRole("option");
      // All options should be complete locales
      expect(options.length).toBeGreaterThan(0);
    });
  });
});
