/**
 * CodeBlock Component
 *
 * Syntax-highlighted code block with:
 * - Language selector dropdown
 * - Copy button
 * - Optional line numbers
 * - Uses lowlight for syntax highlighting
 */

"use client";

import * as React from "react";
import { useCallback, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";
import {
  NodeViewContent,
  NodeViewWrapper,
  type NodeViewProps,
} from "@tiptap/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ============================================================================
// Supported Languages
// ============================================================================

export const SUPPORTED_LANGUAGES = [
  { value: "plaintext", label: "Plain Text" },
  { value: "javascript", label: "JavaScript" },
  { value: "typescript", label: "TypeScript" },
  { value: "jsx", label: "JSX" },
  { value: "tsx", label: "TSX" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "c", label: "C" },
  { value: "cpp", label: "C++" },
  { value: "csharp", label: "C#" },
  { value: "go", label: "Go" },
  { value: "rust", label: "Rust" },
  { value: "ruby", label: "Ruby" },
  { value: "php", label: "PHP" },
  { value: "swift", label: "Swift" },
  { value: "kotlin", label: "Kotlin" },
  { value: "html", label: "HTML" },
  { value: "css", label: "CSS" },
  { value: "scss", label: "SCSS" },
  { value: "json", label: "JSON" },
  { value: "yaml", label: "YAML" },
  { value: "xml", label: "XML" },
  { value: "markdown", label: "Markdown" },
  { value: "sql", label: "SQL" },
  { value: "bash", label: "Bash" },
  { value: "shell", label: "Shell" },
  { value: "dockerfile", label: "Dockerfile" },
  { value: "graphql", label: "GraphQL" },
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]["value"];

// ============================================================================
// Types
// ============================================================================

export interface CodeBlockProps extends NodeViewProps {
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
}

export interface StandaloneCodeBlockProps {
  /** Code content */
  code: string;
  /** Programming language */
  language?: SupportedLanguage;
  /** Whether to show line numbers */
  showLineNumbers?: boolean;
  /** Whether the language is editable */
  editable?: boolean;
  /** Callback when language changes */
  onLanguageChange?: (language: SupportedLanguage) => void;
  /** Additional CSS class */
  className?: string;
}

// ============================================================================
// TipTap Node View Component
// ============================================================================

export function CodeBlockNodeView({
  node,
  updateAttributes,
  extension,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const language = (node.attrs.language as SupportedLanguage) || "plaintext";

  const handleCopy = useCallback(async () => {
    const text = node.textContent;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy code:", err);
    }
  }, [node.textContent]);

  const handleLanguageChange = useCallback(
    (newLanguage: SupportedLanguage) => {
      updateAttributes({ language: newLanguage });
    },
    [updateAttributes],
  );

  const languageLabel =
    SUPPORTED_LANGUAGES.find((l) => l.value === language)?.label ||
    "Plain Text";

  return (
    <NodeViewWrapper className="code-block-wrapper">
      <div className="bg-muted/50 relative overflow-hidden rounded-lg border">
        {/* Header */}
        <div className="bg-muted/80 flex items-center justify-between border-b px-3 py-1.5">
          {/* Language selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
              >
                {languageLabel}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-[300px] overflow-auto"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.value}
                  onClick={() => handleLanguageChange(lang.value)}
                  className={cn(
                    "text-sm",
                    lang.value === language && "bg-accent",
                  )}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Copy button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 gap-1 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
          >
            {copied ? (
              <>
                <Check className="h-3 w-3" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Copy
              </>
            )}
          </Button>
        </div>

        {/* Code content */}
        <pre className="overflow-x-auto p-4 text-sm">
          <NodeViewContent as="code" className={`language-${language}`} />
        </pre>
      </div>
    </NodeViewWrapper>
  );
}

// ============================================================================
// Standalone Code Block Component
// ============================================================================

export function CodeBlock({
  code,
  language = "plaintext",
  showLineNumbers = false,
  editable = false,
  onLanguageChange,
  className,
}: StandaloneCodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      logger.error("Failed to copy code:", err);
    }
  }, [code]);

  const languageLabel =
    SUPPORTED_LANGUAGES.find((l) => l.value === language)?.label ||
    "Plain Text";

  const lines = code.split("\n");

  return (
    <div
      className={cn(
        "bg-muted/50 relative overflow-hidden rounded-lg border",
        className,
      )}
    >
      {/* Header */}
      <div className="bg-muted/80 flex items-center justify-between border-b px-3 py-1.5">
        {/* Language selector/label */}
        {editable && onLanguageChange ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 gap-1 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
              >
                {languageLabel}
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              className="max-h-[300px] overflow-auto"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <DropdownMenuItem
                  key={lang.value}
                  onClick={() => onLanguageChange(lang.value)}
                  className={cn(
                    "text-sm",
                    lang.value === language && "bg-accent",
                  )}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <span className="text-xs text-muted-foreground">{languageLabel}</span>
        )}

        {/* Copy button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-6 gap-1 px-2 text-xs font-normal text-muted-foreground hover:text-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3 w-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3 w-3" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm">
          {showLineNumbers ? (
            <code className={`language-${language}`}>
              {lines.map((line, index) => (
                <div key={index} className="flex">
                  <span className="text-muted-foreground/50 mr-4 min-w-[2ch] select-none text-right">
                    {index + 1}
                  </span>
                  <span>{line}</span>
                </div>
              ))}
            </code>
          ) : (
            <code className={`language-${language}`}>{code}</code>
          )}
        </pre>
      </div>
    </div>
  );
}

// ============================================================================
// Inline Code Component
// ============================================================================

export interface InlineCodeProps {
  children: React.ReactNode;
  className?: string;
}

export function InlineCode({ children, className }: InlineCodeProps) {
  return (
    <code
      className={cn(
        "rounded bg-muted px-1.5 py-0.5 font-mono text-sm",
        className,
      )}
    >
      {children}
    </code>
  );
}

export default CodeBlock;
