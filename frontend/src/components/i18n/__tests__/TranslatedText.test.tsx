/**
 * @fileoverview Tests for TranslatedText component
 *
 * Tests the TranslatedText component including interpolation,
 * pluralization, and rich formatting.
 */

import React from "react";
import { render, screen } from "@testing-library/react";
import { TranslatedText, T, Plural, Trans } from "../TranslatedText";
import {
  registerTranslations,
  clearTranslations,
  setCurrentLocale,
} from "@/lib/i18n/translator";

describe("TranslatedText", () => {
  beforeEach(() => {
    clearTranslations();
    setCurrentLocale("en");

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
      context_male: "He is here",
      context_female: "She is here",
      richText: "Click <link>here</link> to <bold>proceed</bold>",
    });
  });

  afterEach(() => {
    clearTranslations();
  });

  describe("basic translation", () => {
    it("should render translated text", () => {
      render(<TranslatedText i18nKey="hello" />);
      expect(screen.getByText("Hello")).toBeInTheDocument();
    });

    it("should render nested key", () => {
      render(<TranslatedText i18nKey="nested.value" />);
      expect(screen.getByText("Nested Value")).toBeInTheDocument();
    });

    it("should return key for missing translation", () => {
      render(<TranslatedText i18nKey="missing.key" />);
      expect(screen.getByText("missing.key")).toBeInTheDocument();
    });

    it("should use default value", () => {
      render(<TranslatedText i18nKey="missing" defaultValue="Default" />);
      expect(screen.getByText("Default")).toBeInTheDocument();
    });
  });

  describe("interpolation", () => {
    it("should interpolate values", () => {
      render(<TranslatedText i18nKey="greeting" values={{ name: "World" }} />);
      expect(screen.getByText("Hello, World!")).toBeInTheDocument();
    });

    it("should handle numeric values", () => {
      registerTranslations("en", "common", { count: "Count: {{value}}" });
      render(<TranslatedText i18nKey="count" values={{ value: 42 }} />);
      expect(screen.getByText("Count: 42")).toBeInTheDocument();
    });

    it("should handle boolean values", () => {
      registerTranslations("en", "common", { status: "Active: {{active}}" });
      render(<TranslatedText i18nKey="status" values={{ active: true }} />);
      expect(screen.getByText("Active: true")).toBeInTheDocument();
    });
  });

  describe("pluralization", () => {
    it("should render singular form", () => {
      render(<TranslatedText i18nKey="messages.count" count={1} />);
      expect(screen.getByText("1 message")).toBeInTheDocument();
    });

    it("should render plural form", () => {
      render(<TranslatedText i18nKey="messages.count" count={5} />);
      expect(screen.getByText("5 messages")).toBeInTheDocument();
    });

    it("should handle zero count", () => {
      render(<TranslatedText i18nKey="messages.count" count={0} />);
      expect(screen.getByText("0 messages")).toBeInTheDocument();
    });
  });

  describe("context", () => {
    it("should render male context", () => {
      render(<TranslatedText i18nKey="context" context="male" />);
      expect(screen.getByText("He is here")).toBeInTheDocument();
    });

    it("should render female context", () => {
      render(<TranslatedText i18nKey="context" context="female" />);
      expect(screen.getByText("She is here")).toBeInTheDocument();
    });
  });

  describe("element type", () => {
    it("should render as span by default", () => {
      render(<TranslatedText i18nKey="hello" />);
      const element = screen.getByText("Hello");
      expect(element.tagName).toBe("SPAN");
    });

    it("should render as custom element", () => {
      render(<TranslatedText i18nKey="hello" as="div" />);
      const element = screen.getByText("Hello");
      expect(element.tagName).toBe("DIV");
    });

    it("should render as heading", () => {
      render(<TranslatedText i18nKey="hello" as="h1" />);
      const element = screen.getByText("Hello");
      expect(element.tagName).toBe("H1");
    });

    it("should render as paragraph", () => {
      render(<TranslatedText i18nKey="hello" as="p" />);
      const element = screen.getByText("Hello");
      expect(element.tagName).toBe("P");
    });
  });

  describe("className", () => {
    it("should apply className", () => {
      render(<TranslatedText i18nKey="hello" className="test-class" />);
      const element = screen.getByText("Hello");
      expect(element).toHaveClass("test-class");
    });
  });

  describe("render function", () => {
    it("should support render function", () => {
      render(
        <TranslatedText i18nKey="hello">
          {(text) => <strong data-testid="custom">{text}</strong>}
        </TranslatedText>,
      );
      const element = screen.getByTestId("custom");
      expect(element).toHaveTextContent("Hello");
      expect(element.tagName).toBe("STRONG");
    });

    it("should pass translated text to render function", () => {
      render(
        <TranslatedText i18nKey="greeting" values={{ name: "Test" }}>
          {(text) => <span data-testid="rendered">{text}</span>}
        </TranslatedText>,
      );
      expect(screen.getByTestId("rendered")).toHaveTextContent("Hello, Test!");
    });
  });

  describe("namespace", () => {
    it("should use namespace option", () => {
      registerTranslations("en", "chat", { title: "Chat Title" });
      render(<TranslatedText i18nKey="title" ns="chat" />);
      expect(screen.getByText("Chat Title")).toBeInTheDocument();
    });
  });
});

describe("T component", () => {
  beforeEach(() => {
    clearTranslations();
    setCurrentLocale("en");
    registerTranslations("en", "common", { hello: "Hello" });
  });

  it("should be shorthand for TranslatedText", () => {
    render(<T i18nKey="hello" />);
    expect(screen.getByText("Hello")).toBeInTheDocument();
  });

  it("should pass all props", () => {
    registerTranslations("en", "common", { greeting: "Hi, {{name}}!" });
    render(
      <T
        i18nKey="greeting"
        values={{ name: "Test" }}
        as="div"
        className="custom"
      />,
    );
    const element = screen.getByText("Hi, Test!");
    expect(element.tagName).toBe("DIV");
    expect(element).toHaveClass("custom");
  });
});

describe("Plural component", () => {
  beforeEach(() => {
    clearTranslations();
    setCurrentLocale("en");
    registerTranslations("en", "common", {
      items_one: "{{count}} item",
      items_other: "{{count}} items",
    });
  });

  it("should render singular", () => {
    render(<Plural i18nKey="items" count={1} />);
    expect(screen.getByText("1 item")).toBeInTheDocument();
  });

  it("should render plural", () => {
    render(<Plural i18nKey="items" count={5} />);
    expect(screen.getByText("5 items")).toBeInTheDocument();
  });

  it("should pass additional values", () => {
    registerTranslations("en", "common", {
      items_one: "{{count}} item in {{category}}",
      items_other: "{{count}} items in {{category}}",
    });
    render(<Plural i18nKey="items" count={3} values={{ category: "cart" }} />);
    expect(screen.getByText("3 items in cart")).toBeInTheDocument();
  });

  it("should support custom element", () => {
    render(<Plural i18nKey="items" count={2} as="strong" />);
    const element = screen.getByText("2 items");
    expect(element.tagName).toBe("STRONG");
  });

  it("should support className", () => {
    render(<Plural i18nKey="items" count={1} className="item-count" />);
    expect(screen.getByText("1 item")).toHaveClass("item-count");
  });
});

describe("Trans component", () => {
  beforeEach(() => {
    clearTranslations();
    setCurrentLocale("en");
  });

  it("should render plain text", () => {
    registerTranslations("en", "common", { plain: "Plain text" });
    render(<Trans i18nKey="plain" />);
    expect(screen.getByText("Plain text")).toBeInTheDocument();
  });

  it("should render with interpolation", () => {
    registerTranslations("en", "common", { greeting: "Hello, {{name}}!" });
    render(<Trans i18nKey="greeting" values={{ name: "World" }} />);
    expect(screen.getByText("Hello, World!")).toBeInTheDocument();
  });

  it("should handle missing components gracefully", () => {
    registerTranslations("en", "common", { text: "Click <link>here</link>" });
    render(<Trans i18nKey="text" />);
    // Should render content even without component
    expect(screen.getByText(/here/)).toBeInTheDocument();
  });

  it("should use default value", () => {
    render(<Trans i18nKey="missing" defaultValue="Default text" />);
    expect(screen.getByText("Default text")).toBeInTheDocument();
  });

  it("should handle pluralization", () => {
    registerTranslations("en", "common", {
      items_one: "You have {{count}} item",
      items_other: "You have {{count}} items",
    });
    render(<Trans i18nKey="items" count={3} />);
    expect(screen.getByText("You have 3 items")).toBeInTheDocument();
  });

  it("should use namespace", () => {
    registerTranslations("en", "chat", { message: "Chat message" });
    render(<Trans i18nKey="message" ns="chat" />);
    expect(screen.getByText("Chat message")).toBeInTheDocument();
  });
});
