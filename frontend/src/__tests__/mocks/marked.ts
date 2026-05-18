/**
 * Marked Mock for Jest Tests
 *
 * Mocks the marked package to avoid ESM compatibility issues
 */

// Simple mock that just returns the input with basic formatting
export const marked = jest.fn((src: string, _options?: unknown) => {
  if (!src) return "";
  // Very basic markdown conversion for tests
  return src
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
});

// Synchronous parse - also add as method on marked
export const parse = marked;

// Add parse as a method on marked (marked.parse())
(marked as any).parse = jest.fn((src: string, _options?: unknown) => {
  if (!src) return "";
  return src
    .replace(/^### (.+)$/gm, "<h3>$1</h3>")
    .replace(/^## (.+)$/gm, "<h2>$1</h2>")
    .replace(/^# (.+)$/gm, "<h1>$1</h1>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/`(.+?)`/g, "<code>$1</code>")
    .replace(/\n/g, "<br>");
});

// Add options/setOptions
marked.options = jest.fn((_options: unknown) => marked);
marked.setOptions = jest.fn((_options: unknown) => marked);
marked.getDefaults = jest.fn(() => ({}));
marked.use = jest.fn((..._extensions: unknown[]) => marked);
marked.walkTokens = jest.fn((_tokens: unknown[], _callback: unknown) => {});
marked.parseInline = jest.fn((src: string, _options?: unknown) => src);

// Export defaults
export const defaults = {};
export const getDefaults = () => ({});
export const options = marked.options;
export const setOptions = marked.setOptions;
export const use = marked.use;
export const walkTokens = marked.walkTokens;
export const parseInline = marked.parseInline;

// Lexer mock
export class Lexer {
  static lex = jest.fn((src: string) => [{ type: "paragraph", text: src }]);
  lex = Lexer.lex;
}

// Parser mock
export class Parser {
  static parse = jest.fn((tokens: unknown[]) => "<p>parsed</p>");
  parse = Parser.parse;
}

// Renderer mock
export class Renderer {
  code = jest.fn((code: string) => `<pre><code>${code}</code></pre>`);
  blockquote = jest.fn((quote: string) => `<blockquote>${quote}</blockquote>`);
  heading = jest.fn(
    (text: string, level: number) => `<h${level}>${text}</h${level}>`,
  );
  paragraph = jest.fn((text: string) => `<p>${text}</p>`);
  link = jest.fn(
    (href: string, _title: string | null, text: string) =>
      `<a href="${href}">${text}</a>`,
  );
  image = jest.fn(
    (href: string, _title: string | null, text: string) =>
      `<img src="${href}" alt="${text}">`,
  );
  text = jest.fn((text: string) => text);
}

// TextRenderer mock
export class TextRenderer extends Renderer {}

// Tokenizer mock
export class Tokenizer {}

// Hooks mock
export class Hooks {}

// Marked class
export class Marked {
  parse = marked;
  parseInline = marked.parseInline;
  use = marked.use;
  setOptions = marked.setOptions;
  defaults = {};
}

export const lexer = Lexer.lex;
export const parser = Parser.parse;

export default marked;
