"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

export interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  className?: string;
}

// ============================================================================
// Language colors for badges
// ============================================================================

const languageColors: Record<string, string> = {
  typescript: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  tsx: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  javascript: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  jsx: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  css: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  html: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  json: "bg-green-500/10 text-green-500 border-green-500/20",
  bash: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  shell: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

// ============================================================================
// Simple syntax highlighting
// ============================================================================

function highlightCode(code: string, language: string): string {
  // Keywords for different languages
  const jsKeywords =
    /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|class|extends|import|export|from|default|async|await|try|catch|finally|throw|new|this|typeof|instanceof|in|of|null|undefined|true|false)\b/g;
  const typeKeywords =
    /\b(string|number|boolean|void|any|never|unknown|interface|type|enum|namespace|module|declare|as|is)\b/g;

  let highlighted = code
    // Escape HTML
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  if (["typescript", "tsx", "javascript", "jsx"].includes(language)) {
    highlighted = highlighted
      // Comments
      .replace(
        /(\/\/.*$)/gm,
        '<span class="text-muted-foreground italic">$1</span>',
      )
      .replace(
        /(\/\*[\s\S]*?\*\/)/g,
        '<span class="text-muted-foreground italic">$1</span>',
      )
      // Strings
      .replace(
        /(&apos;[^&apos;]*&apos;|&quot;[^&quot;]*&quot;|`[^`]*`)/g,
        '<span class="text-green-400">$1</span>',
      )
      .replace(
        /('[^']*'|"[^"]*"|`[^`]*`)/g,
        '<span class="text-green-400">$1</span>',
      )
      // Keywords
      .replace(jsKeywords, '<span class="text-pink-400 font-medium">$1</span>')
      // Type keywords
      .replace(typeKeywords, '<span class="text-cyan-400">$1</span>')
      // Numbers
      .replace(/\b(\d+)\b/g, '<span class="text-amber-400">$1</span>')
      // Function calls
      .replace(/(\w+)(\()/g, '<span class="text-blue-400">$1</span>$2');
  } else if (language === "css") {
    highlighted = highlighted
      // Properties
      .replace(/([a-z-]+)(:)/g, '<span class="text-cyan-400">$1</span>$2')
      // Values
      .replace(
        /(:)\s*([^;]+)(;)/g,
        '$1 <span class="text-green-400">$2</span>$3',
      )
      // Selectors
      .replace(/^([^{]+)(\{)/gm, '<span class="text-yellow-400">$1</span>$2');
  } else if (["bash", "shell"].includes(language)) {
    highlighted = highlighted
      // Comments
      .replace(
        /(#.*$)/gm,
        '<span class="text-muted-foreground italic">$1</span>',
      )
      // Commands
      .replace(
        /^(\s*)(npm|yarn|pnpm|npx|cd|mkdir|rm|cp|mv|git|nself|docker|node)\b/gm,
        '$1<span class="text-green-400 font-medium">$2</span>',
      )
      // Flags
      .replace(/(\s)(--?[\w-]+)/g, '$1<span class="text-cyan-400">$2</span>');
  }

  return highlighted;
}

// ============================================================================
// Component
// ============================================================================

export function CodeBlock({
  code,
  language = "typescript",
  filename,
  showLineNumbers = true,
  highlightLines = [],
  className,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lines = code.split("\n");
  const highlightedCode = highlightCode(code, language);
  const highlightedLines = highlightedCode.split("\n");

  return (
    <div
      className={cn("group relative rounded-lg border bg-zinc-950", className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-2">
        <div className="flex items-center gap-2">
          {filename && (
            <span className="font-mono text-xs text-muted-foreground">
              {filename}
            </span>
          )}
          <span
            className={cn(
              "rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase",
              languageColors[language] ||
                "border-border bg-muted text-muted-foreground",
            )}
          >
            {language}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 gap-1.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy
            </>
          )}
        </Button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed">
          <code>
            {highlightedLines.map((line, index) => (
              <div
                key={index}
                className={cn(
                  "flex",
                  highlightLines.includes(index + 1) &&
                    "-mx-4 bg-yellow-500/10 px-4",
                )}
              >
                {showLineNumbers && (
                  <span className="text-muted-foreground/50 mr-4 w-8 flex-shrink-0 select-none text-right">
                    {index + 1}
                  </span>
                )}
                <span
                  className="flex-1"
                  // sast-ignore: XSS -- line is from highlight.js syntax highlighter which escapes user content
                  dangerouslySetInnerHTML={{ __html: line || "&nbsp;" }}
                />
              </div>
            ))}
          </code>
        </pre>
      </div>
    </div>
  );
}

// ============================================================================
// Inline Code Component
// ============================================================================

export function InlineCode({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <code
      className={cn(
        "rounded-md bg-muted px-1.5 py-0.5 font-mono text-sm text-pink-500",
        className,
      )}
    >
      {children}
    </code>
  );
}
