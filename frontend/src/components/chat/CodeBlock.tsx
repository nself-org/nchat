"use client";

import { memo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Copy,
  Check,
  Download,
  Maximize2,
  Code2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { logger } from "@/lib/logger";
import {
  highlightCode,
  getLanguageDisplayName,
  detectLanguage,
} from "@/lib/markdown/syntax-highlighter";

interface CodeBlockProps {
  code: string;
  language?: string;
  filename?: string;
  showLineNumbers?: boolean;
  maxHeight?: number;
  className?: string;
  onExpand?: () => void;
}

/**
 * Code block component with syntax highlighting
 * Features:
 * - Syntax highlighting for 100+ languages
 * - Line numbers (optional)
 * - Copy button
 * - Download button
 * - Expand/collapse for long code
 * - Language badge
 * - Theme support (light/dark)
 */
export const CodeBlock = memo(function CodeBlock({
  code,
  language: providedLanguage,
  filename,
  showLineNumbers = true,
  maxHeight = 500,
  className,
  onExpand,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Detect language if not provided
  const detectedLanguage =
    providedLanguage || detectLanguage(filename, code) || "plaintext";

  // Highlight code
  const { html: highlightedCode, language } = highlightCode(
    code,
    detectedLanguage,
  );

  // Get display name for language
  const languageDisplay = getLanguageDisplayName(language);

  // Count lines
  const lines = code.split("\n");
  const lineCount = lines.length;
  const shouldShowCollapse = lineCount > 20;

  // Handle copy
  const handleCopy = useCallback(() => {
    navigator.clipboard
      .writeText(code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch((error) => {
        logger.error("Failed to copy code:", error);
      });
  }, [code]);

  // Handle download
  const handleDownload = useCallback(() => {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename || `code.${language}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [code, language, filename]);

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "bg-muted/30 group relative my-2 overflow-hidden rounded-lg border",
          "hover:border-muted-foreground/20 transition-all duration-200",
          className,
        )}
      >
        {/* Header */}
        <div className="bg-muted/50 flex items-center justify-between border-b px-3 py-2">
          <div className="flex items-center gap-2">
            {/* Language badge */}
            <div className="bg-background/80 flex items-center gap-1.5 rounded-md px-2 py-1">
              <Code2 className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">
                {languageDisplay}
              </span>
            </div>

            {/* Filename */}
            {filename && (
              <span className="text-xs text-muted-foreground">{filename}</span>
            )}

            {/* Line count */}
            <span className="text-xs text-muted-foreground">
              {lineCount} {lineCount === 1 ? "line" : "lines"}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            {/* Collapse toggle */}
            {shouldShowCollapse && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="h-7 w-7 p-0"
                  >
                    {isCollapsed ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronUp className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isCollapsed ? "Expand" : "Collapse"}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Copy button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-7 w-7 p-0"
                >
                  <AnimatePresence mode="wait">
                    {copied ? (
                      <motion.div
                        key="check"
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Check className="h-4 w-4 text-green-500" />
                      </motion.div>
                    ) : (
                      <motion.div
                        key="copy"
                        initial={{ scale: 1 }}
                        exit={{ scale: 0 }}
                      >
                        <Copy className="h-4 w-4" />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? "Copied!" : "Copy code"}
              </TooltipContent>
            </Tooltip>

            {/* Download button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-7 w-7 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Download</TooltipContent>
            </Tooltip>

            {/* Expand button (optional) */}
            {onExpand && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onExpand}
                    className="h-7 w-7 p-0"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Open in modal</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* Code content */}
        <div
          className={cn(
            "relative overflow-x-auto",
            isCollapsed && "max-h-[100px]",
          )}
          style={{ maxHeight: isCollapsed ? "100px" : `${maxHeight}px` }}
        >
          <pre className="p-3">
            <code className="block font-mono text-xs leading-relaxed">
              {showLineNumbers ? (
                <CodeWithLineNumbers
                  code={code}
                  highlightedCode={highlightedCode}
                />
              ) : (
                <div
                  // sast-ignore: XSS -- highlightedCode is the output of highlight.js syntax highlighter which escapes all user content
                  dangerouslySetInnerHTML={{ __html: highlightedCode }}
                  className="hljs"
                />
              )}
            </code>
          </pre>

          {/* Fade overlay for collapsed state */}
          {isCollapsed && (
            <div className="from-muted/30 pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t to-transparent" />
          )}
        </div>
      </div>
    </TooltipProvider>
  );
});

CodeBlock.displayName = "CodeBlock";

/**
 * Code with line numbers
 */
function CodeWithLineNumbers({
  code,
  highlightedCode,
}: {
  code: string;
  highlightedCode: string;
}) {
  const lines = code.split("\n");
  const highlightedLines = highlightedCode.split("\n");

  return (
    <div className="flex">
      {/* Line numbers */}
      <div className="border-muted-foreground/10 flex select-none flex-col border-r pr-3 text-right">
        {lines.map((_, index) => (
          <div
            key={index}
            className="text-muted-foreground/50"
            style={{ minWidth: "2.5em" }}
          >
            {index + 1}
          </div>
        ))}
      </div>

      {/* Code lines */}
      <div className="flex flex-1 flex-col pl-3">
        {highlightedLines.map((line, index) => (
          <div
            key={index}
            className="hover:bg-muted/30"
            // sast-ignore: XSS -- line content is from highlight.js which escapes all user input
            dangerouslySetInnerHTML={{ __html: line || "&#8203;" }} // Zero-width space for empty lines
          />
        ))}
      </div>
    </div>
  );
}
