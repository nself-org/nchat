/**
 * Markdown Renderer Component
 *
 * Renders TipTap JSON or markdown as formatted React components.
 * Supports:
 * - All markdown formatting (bold, italic, etc.)
 * - Syntax highlighting for code blocks
 * - Link preview and auto-detection
 * - @mentions and #channels as clickable links
 * - Emoji rendering
 * - Image embedding
 * - Sanitized HTML output
 */

"use client";

import * as React from "react";
import { useMemo } from "react";
import type { JSONContent } from "@tiptap/core";
import { cn } from "@/lib/utils";
import { jsonToHtml, jsonToMarkdown, markdownToJson } from "./parser";
import { lowlight } from "@/components/editor/editor-extensions";

// ============================================================================
// Types
// ============================================================================

export interface MarkdownRendererProps {
  /** Content to render (JSON or markdown string) */
  content: JSONContent | string;
  /** Additional CSS class */
  className?: string;
  /** Whether to sanitize HTML */
  sanitize?: boolean;
  /** Callback when a mention is clicked */
  onMentionClick?: (userId: string, username: string) => void;
  /** Callback when a channel is clicked */
  onChannelClick?: (channelId: string, channelName: string) => void;
  /** Callback when a link is clicked */
  onLinkClick?: (url: string) => void;
  /** Whether to show syntax highlighting in code blocks */
  syntaxHighlighting?: boolean;
  /** Whether to render in compact mode (smaller text) */
  compact?: boolean;
}

// ============================================================================
// Main Component
// ============================================================================

export function MarkdownRenderer({
  content,
  className,
  sanitize = true,
  onMentionClick,
  onChannelClick,
  onLinkClick,
  syntaxHighlighting = true,
  compact = false,
}: MarkdownRendererProps) {
  // Convert content to JSON if it's a string
  const jsonContent = useMemo(() => {
    if (typeof content === "string") {
      return markdownToJson(content);
    }
    return content;
  }, [content]);

  // Render the JSON content
  return (
    <div
      className={cn(
        "markdown-renderer prose prose-sm dark:prose-invert max-w-none",
        compact && "prose-xs",
        className,
      )}
    >
      {jsonContent.content?.map((node, index) => (
        <MarkdownNode
          key={index}
          node={node}
          onMentionClick={onMentionClick}
          onChannelClick={onChannelClick}
          onLinkClick={onLinkClick}
          syntaxHighlighting={syntaxHighlighting}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Node Renderer
// ============================================================================

interface MarkdownNodeProps {
  node: JSONContent;
  onMentionClick?: (userId: string, username: string) => void;
  onChannelClick?: (channelId: string, channelName: string) => void;
  onLinkClick?: (url: string) => void;
  syntaxHighlighting?: boolean;
}

function MarkdownNode({
  node,
  onMentionClick,
  onChannelClick,
  onLinkClick,
  syntaxHighlighting,
}: MarkdownNodeProps) {
  switch (node.type) {
    case "paragraph":
      return (
        <p className="my-2 first:mt-0 last:mb-0">
          {node.content?.map((child, index) => (
            <MarkdownNode
              key={index}
              node={child}
              onMentionClick={onMentionClick}
              onChannelClick={onChannelClick}
              onLinkClick={onLinkClick}
              syntaxHighlighting={syntaxHighlighting}
            />
          ))}
        </p>
      );

    case "heading":
      return (
        <Heading level={node.attrs?.level || 1}>
          {node.content?.map((child, index) => (
            <MarkdownNode
              key={index}
              node={child}
              onMentionClick={onMentionClick}
              onChannelClick={onChannelClick}
              onLinkClick={onLinkClick}
              syntaxHighlighting={syntaxHighlighting}
            />
          ))}
        </Heading>
      );

    case "codeBlock":
      return (
        <CodeBlock
          language={node.attrs?.language || "plaintext"}
          code={node.content?.[0]?.text || ""}
          syntaxHighlighting={syntaxHighlighting}
        />
      );

    case "blockquote":
      return (
        <blockquote className="border-muted-foreground/20 my-4 border-l-4 pl-4 italic">
          {node.content?.map((child, index) => (
            <MarkdownNode
              key={index}
              node={child}
              onMentionClick={onMentionClick}
              onChannelClick={onChannelClick}
              onLinkClick={onLinkClick}
              syntaxHighlighting={syntaxHighlighting}
            />
          ))}
        </blockquote>
      );

    case "bulletList":
      return (
        <ul className="my-4 list-disc space-y-1 pl-6">
          {node.content?.map((child, index) => (
            <MarkdownNode
              key={index}
              node={child}
              onMentionClick={onMentionClick}
              onChannelClick={onChannelClick}
              onLinkClick={onLinkClick}
              syntaxHighlighting={syntaxHighlighting}
            />
          ))}
        </ul>
      );

    case "orderedList":
      return (
        <ol className="my-4 list-decimal space-y-1 pl-6">
          {node.content?.map((child, index) => (
            <MarkdownNode
              key={index}
              node={child}
              onMentionClick={onMentionClick}
              onChannelClick={onChannelClick}
              onLinkClick={onLinkClick}
              syntaxHighlighting={syntaxHighlighting}
            />
          ))}
        </ol>
      );

    case "listItem":
      return (
        <li>
          {node.content?.map((child, index) => (
            <MarkdownNode
              key={index}
              node={child}
              onMentionClick={onMentionClick}
              onChannelClick={onChannelClick}
              onLinkClick={onLinkClick}
              syntaxHighlighting={syntaxHighlighting}
            />
          ))}
        </li>
      );

    case "horizontalRule":
      return <hr className="my-6 border-border" />;

    case "hardBreak":
      return <br />;

    case "image":
      return (
        <img
          src={node.attrs?.src || ""}
          alt={node.attrs?.alt || ""}
          title={node.attrs?.title}
          className="my-4 h-auto max-w-full rounded-lg"
        />
      );

    case "text":
      return <TextNode node={node} onLinkClick={onLinkClick} />;

    case "mention":
      return (
        <Mention
          userId={node.attrs?.id || ""}
          username={node.attrs?.label || "unknown"}
          onClick={onMentionClick}
        />
      );

    case "channelMention":
      return (
        <ChannelMention
          channelId={node.attrs?.id || ""}
          channelName={node.attrs?.label || "unknown"}
          onClick={onChannelClick}
        />
      );

    case "emojiMention":
      return (
        <span className="emoji">{node.attrs?.id || node.attrs?.label}</span>
      );

    default:
      return null;
  }
}

// ============================================================================
// Text Node with Marks
// ============================================================================

interface TextNodeProps {
  node: JSONContent;
  onLinkClick?: (url: string) => void;
}

function TextNode({ node, onLinkClick }: TextNodeProps) {
  let content: React.ReactNode = node.text || "";

  if (node.marks && node.marks.length > 0) {
    // Apply marks in reverse order to nest them correctly
    for (const mark of [...node.marks].reverse()) {
      switch (mark.type) {
        case "bold":
          content = <strong className="font-bold">{content}</strong>;
          break;

        case "italic":
          content = <em className="italic">{content}</em>;
          break;

        case "underline":
          content = <u className="underline">{content}</u>;
          break;

        case "strike":
          content = <s className="line-through">{content}</s>;
          break;

        case "code":
          content = (
            <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-sm">
              {content}
            </code>
          );
          break;

        case "link":
          const href = mark.attrs?.href || "";
          content = (
            <a
              href={href}
              className="hover:text-primary/80 cursor-pointer text-primary underline"
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => {
                if (onLinkClick) {
                  e.preventDefault();
                  onLinkClick(href);
                }
              }}
            >
              {content}
            </a>
          );
          break;
      }
    }
  }

  return <>{content}</>;
}

// ============================================================================
// Heading Component
// ============================================================================

interface HeadingProps {
  level: number;
  children: React.ReactNode;
}

function Heading({ level, children }: HeadingProps) {
  const Tag = `h${Math.min(level, 6)}` as keyof React.JSX.IntrinsicElements;

  const className = cn(
    "font-bold my-4 first:mt-0 last:mb-0",
    level === 1 && "text-3xl",
    level === 2 && "text-2xl",
    level === 3 && "text-xl",
    level === 4 && "text-lg",
    level === 5 && "text-base",
    level === 6 && "text-sm",
  );

  return React.createElement(Tag, { className }, children);
}

// ============================================================================
// Code Block with Syntax Highlighting
// ============================================================================

interface CodeBlockProps {
  language: string;
  code: string;
  syntaxHighlighting?: boolean;
}

function CodeBlock({
  language,
  code,
  syntaxHighlighting = true,
}: CodeBlockProps) {
  const highlighted = useMemo(() => {
    if (!syntaxHighlighting) return null;

    try {
      const result = lowlight.highlight(language, code);
      return result;
    } catch {
      return null;
    }
  }, [language, code, syntaxHighlighting]);

  if (highlighted && syntaxHighlighting) {
    return (
      <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4">
        <code className={`language-${language}`}>
          {renderHighlightedCode(
            highlighted.children as Array<{
              type: string;
              value?: string;
              children?: unknown[];
            }>,
          )}
        </code>
      </pre>
    );
  }

  return (
    <pre className="my-4 overflow-x-auto rounded-lg bg-muted p-4">
      <code className={`language-${language}`}>{code}</code>
    </pre>
  );
}

/**
 * Render highlighted code from lowlight
 */
function renderHighlightedCode(
  nodes: Array<{ type: string; value?: string; children?: unknown[] }>,
): React.ReactNode {
  return nodes.map((node, index) => {
    if (node.type === "text") {
      return node.value;
    }

    if (node.type === "element" && node.children) {
      const className = (node as { properties?: { className?: string[] } })
        .properties?.className?.[0];
      return (
        <span key={index} className={className}>
          {renderHighlightedCode(
            node.children as Array<{
              type: string;
              value?: string;
              children?: unknown[];
            }>,
          )}
        </span>
      );
    }

    return null;
  });
}

// ============================================================================
// Mention Component
// ============================================================================

interface MentionProps {
  userId: string;
  username: string;
  onClick?: (userId: string, username: string) => void;
}

function Mention({ userId, username, onClick }: MentionProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(userId, username);
    }
  };

  const className = cn(
    "mention mention-user bg-primary/10 inline-flex items-center rounded px-1.5 py-0.5 font-medium text-primary transition-colors",
    onClick && "hover:bg-primary/20 cursor-pointer",
  );

  if (onClick) {
    return (
      <span
        className={className}
        data-id={userId}
        onClick={() => onClick(userId, username)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        @{username}
      </span>
    );
  }

  return (
    <span className={className} data-id={userId}>
      @{username}
    </span>
  );
}

// ============================================================================
// Channel Mention Component
// ============================================================================

interface ChannelMentionProps {
  channelId: string;
  channelName: string;
  onClick?: (channelId: string, channelName: string) => void;
}

function ChannelMention({
  channelId,
  channelName,
  onClick,
}: ChannelMentionProps) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick?.(channelId, channelName);
    }
  };

  const className = cn(
    "mention mention-channel text-accent-foreground inline-flex items-center rounded bg-accent px-1.5 py-0.5 font-medium transition-colors",
    onClick && "hover:bg-accent/80 cursor-pointer",
  );

  if (onClick) {
    return (
      <span
        className={className}
        data-id={channelId}
        onClick={() => onClick(channelId, channelName)}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
      >
        #{channelName}
      </span>
    );
  }

  return (
    <span className={className} data-id={channelId}>
      #{channelName}
    </span>
  );
}

// ============================================================================
// Preview Mode Component
// ============================================================================

export interface MarkdownPreviewProps extends MarkdownRendererProps {
  /** Show a toggle button to switch between preview and raw mode */
  showToggle?: boolean;
  /** Initial mode */
  initialMode?: "preview" | "raw";
}

export function MarkdownPreview({
  content,
  showToggle = true,
  initialMode = "preview",
  ...props
}: MarkdownPreviewProps) {
  const [mode, setMode] = React.useState<"preview" | "raw">(initialMode);

  const rawContent = useMemo(() => {
    if (typeof content === "string") {
      return content;
    }
    return jsonToMarkdown(content);
  }, [content]);

  if (mode === "raw") {
    return (
      <div className="relative">
        {showToggle && (
          <button
            onClick={() => setMode("preview")}
            className="hover:bg-muted/80 absolute right-2 top-2 rounded bg-muted px-3 py-1 text-xs"
          >
            Preview
          </button>
        )}
        <pre className="overflow-x-auto rounded-lg bg-muted p-4 font-mono text-sm">
          {rawContent}
        </pre>
      </div>
    );
  }

  return (
    <div className="relative">
      {showToggle && (
        <button
          onClick={() => setMode("raw")}
          className="hover:bg-muted/80 absolute right-2 top-2 z-10 rounded bg-muted px-3 py-1 text-xs"
        >
          Raw
        </button>
      )}
      <MarkdownRenderer content={content} {...props} />
    </div>
  );
}

// ============================================================================
// Compact Renderer (for message previews)
// ============================================================================

export interface CompactMarkdownRendererProps {
  content: JSONContent | string;
  maxLength?: number;
  className?: string;
}

export function CompactMarkdownRenderer({
  content,
  maxLength = 100,
  className,
}: CompactMarkdownRendererProps) {
  const jsonContent = useMemo(() => {
    if (typeof content === "string") {
      return markdownToJson(content);
    }
    return content;
  }, [content]);

  // Get plain text for truncation
  const plainText = useMemo(() => {
    const getText = (node: JSONContent): string => {
      if (node.type === "text") return node.text || "";
      if (node.content) {
        return node.content.map(getText).join(" ");
      }
      return "";
    };
    return getText(jsonContent);
  }, [jsonContent]);

  const truncated = plainText.length > maxLength;
  const displayText = truncated
    ? plainText.substring(0, maxLength).trim() + "..."
    : plainText;

  return (
    <div
      className={cn("line-clamp-2 text-sm text-muted-foreground", className)}
    >
      {displayText}
    </div>
  );
}

// ============================================================================
// Export
// ============================================================================

export default MarkdownRenderer;
