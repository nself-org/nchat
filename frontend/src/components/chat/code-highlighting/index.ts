/**
 * Code highlighting components and utilities
 *
 * Export all code-related components for easy importing
 */

export { InlineCode } from "../InlineCode";
export { CodeBlock } from "../CodeBlock";
export { CodeSnippetModal, CodeSnippetSuggestions } from "../CodeSnippetModal";
export type { CodeSnippet } from "../CodeSnippetModal";

// Re-export syntax highlighter utilities
export {
  highlightCode,
  detectLanguage,
  getSupportedLanguages,
  getLanguageDisplayName,
  isLanguageSupported,
  normalizeLanguage,
  lowlight,
} from "@/lib/markdown/syntax-highlighter";

export type { LanguageInfo } from "@/lib/markdown/syntax-highlighter";
