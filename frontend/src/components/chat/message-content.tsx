"use client";

import { useMemo, memo, useState } from "react";
import Link from "next/link";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";

interface MessageContentProps {
  content: string;
  contentHtml?: string;
  type?:
    | "text"
    | "gif"
    | "sticker"
    | "file"
    | "image"
    | "video"
    | "audio"
    | "system";
  gifUrl?: string;
  gifMetadata?: {
    width?: number;
    height?: number;
    preview?: string;
    title?: string;
  };
  sticker?: {
    id: string;
    name: string;
    file_url: string;
    thumbnail_url?: string;
  };
  mentions?: string[];
  channelMentions?: string[];
  className?: string;
}

/**
 * Message content renderer
 * Parses and renders markdown, mentions, links, and code blocks
 */
export const MessageContent = memo(function MessageContent({
  content,
  contentHtml,
  type = "text",
  gifUrl,
  gifMetadata,
  sticker,
  mentions = [],
  channelMentions = [],
  className,
}: MessageContentProps) {
  // Always call useMemo at the top level (Rules of Hooks)
  // Parse and render content
  const renderedContent = useMemo(() => {
    return parseMessageContent(content, mentions, channelMentions);
  }, [content, mentions, channelMentions]);

  // Handle GIF message
  if (type === "gif" && gifUrl) {
    return (
      <div className={cn("message-content", className)}>
        <GifContent url={gifUrl} metadata={gifMetadata} />
        {content && (
          <p className="mt-2 text-sm text-muted-foreground">{content}</p>
        )}
      </div>
    );
  }

  // Handle sticker message
  if (type === "sticker" && sticker) {
    return (
      <div className={cn("message-content", className)}>
        <StickerContent sticker={sticker} />
      </div>
    );
  }

  // If pre-rendered HTML is provided, sanitize and use it
  if (contentHtml) {
    // Sanitize HTML to prevent XSS attacks
    const sanitizedHtml = DOMPurify.sanitize(contentHtml, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "u",
        "del",
        "code",
        "pre",
        "a",
        "ul",
        "ol",
        "li",
        "blockquote",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "span",
        "div",
        "img",
      ],
      ALLOWED_ATTR: ["href", "src", "alt", "title", "class", "target", "rel"],
      ALLOWED_URI_REGEXP:
        /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
    });

    return (
      <div
        className={cn(
          "message-content prose prose-sm dark:prose-invert",
          className,
        )}
        // sast-ignore: XSS -- sanitizedHtml is the output of DOMPurify.sanitize() which removes all dangerous HTML
        dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
      />
    );
  }

  return (
    <div className={cn("message-content text-sm", className)}>
      {renderedContent}
    </div>
  );
});

/**
 * Parse message content and return React elements
 */
function parseMessageContent(
  content: string,
  mentions: string[],
  channelMentions: string[],
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let key = 0;

  // Split into lines for block-level parsing
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Check for code blocks (triple backticks)
    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;

      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }

      elements.push(
        <CodeBlock
          key={key++}
          code={codeLines.join("\n")}
          language={language}
        />,
      );
      i++; // Skip closing ```
      continue;
    }

    // Check for blockquotes
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith(">")) {
        quoteLines.push(lines[i].slice(1).trim());
        i++;
      }

      elements.push(
        <blockquote
          key={key++}
          className="border-muted-foreground/30 border-l-4 pl-3 italic text-muted-foreground"
        >
          {quoteLines.join("\n")}
        </blockquote>,
      );
      continue;
    }

    // Regular line - parse inline elements
    const inlineContent = parseInlineContent(
      line,
      mentions,
      channelMentions,
      key,
    );
    elements.push(<p key={key++}>{inlineContent}</p>);
    i++;
  }

  return elements;
}

/**
 * Parse inline content (bold, italic, code, links, mentions)
 */
function parseInlineContent(
  text: string,
  mentions: string[],
  channelMentions: string[],
  baseKey: number,
): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  let key = baseKey * 1000;

  // Regex patterns for inline elements
  const patterns = [
    // Bold **text** or __text__
    { regex: /\*\*(.+?)\*\*|__(.+?)__/g, type: "bold" },
    // Italic *text* or _text_
    { regex: /\*(.+?)\*|_(.+?)_/g, type: "italic" },
    // Strikethrough ~~text~~
    { regex: /~~(.+?)~~/g, type: "strike" },
    // Inline code `code`
    { regex: /`([^`]+)`/g, type: "code" },
    // Links [text](url)
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: "link" },
    // URLs
    { regex: /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g, type: "url" },
    // User mentions @username
    { regex: /@(\w+)/g, type: "mention" },
    // Channel mentions #channel
    { regex: /#(\w+)/g, type: "channel" },
    // Emoji :emoji_name:
    { regex: /:(\w+):/g, type: "emoji" },
  ];

  // Simple approach: find all matches and sort by position
  interface Match {
    index: number;
    length: number;
    type: string;
    content: string;
    extra?: string;
  }

  const matches: Match[] = [];

  patterns.forEach(({ regex, type }) => {
    let match;
    const clonedRegex = new RegExp(regex.source, regex.flags);

    while ((match = clonedRegex.exec(text)) !== null) {
      matches.push({
        index: match.index,
        length: match[0].length,
        type,
        content: match[1] || match[2] || match[0],
        extra: type === "link" ? match[2] : undefined,
      });
    }
  });

  // Sort by position
  matches.sort((a, b) => a.index - b.index);

  // Build output, skipping overlapping matches
  let lastIndex = 0;
  const usedRanges: Array<[number, number]> = [];

  for (const match of matches) {
    const end = match.index + match.length;

    // Check for overlap
    const overlaps = usedRanges.some(
      ([start, rangeEnd]) =>
        (match.index >= start && match.index < rangeEnd) ||
        (end > start && end <= rangeEnd),
    );

    if (overlaps) continue;

    // Add text before match
    if (match.index > lastIndex) {
      elements.push(
        <span key={key++}>{text.slice(lastIndex, match.index)}</span>,
      );
    }

    // Add formatted element
    switch (match.type) {
      case "bold":
        elements.push(<strong key={key++}>{match.content}</strong>);
        break;
      case "italic":
        elements.push(<em key={key++}>{match.content}</em>);
        break;
      case "strike":
        elements.push(<del key={key++}>{match.content}</del>);
        break;
      case "code":
        elements.push(<InlineCode key={key++}>{match.content}</InlineCode>);
        break;
      case "link":
        elements.push(
          <ExternalLink key={key++} href={match.extra!}>
            {match.content}
          </ExternalLink>,
        );
        break;
      case "url":
        elements.push(
          <ExternalLink key={key++} href={match.content}>
            {match.content}
          </ExternalLink>,
        );
        break;
      case "mention":
        elements.push(<UserMention key={key++} username={match.content} />);
        break;
      case "channel":
        elements.push(
          <ChannelMention key={key++} channelName={match.content} />,
        );
        break;
      case "emoji":
        elements.push(<Emoji key={key++} name={match.content} />);
        break;
    }

    usedRanges.push([match.index, end]);
    lastIndex = end;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    elements.push(<span key={key++}>{text.slice(lastIndex)}</span>);
  }

  return elements.length > 0 ? elements : [text];
}

/**
 * Inline code component
 */
function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-pink-500">
      {children}
    </code>
  );
}

/**
 * Code block component with syntax highlighting
 */
function CodeBlock({ code, language }: { code: string; language?: string }) {
  return (
    <div className="bg-muted/50 my-2 overflow-hidden rounded-lg border">
      {/* Header with language */}
      {language && (
        <div className="border-b bg-muted px-3 py-1.5 text-xs font-medium text-muted-foreground">
          {language}
        </div>
      )}

      {/* Code content */}
      <pre className="overflow-x-auto p-3">
        <code className="font-mono text-xs">{code}</code>
      </pre>
    </div>
  );
}

/**
 * External link component
 */
function ExternalLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  // Validate URL
  const isValidUrl = href.startsWith("http://") || href.startsWith("https://");

  if (!isValidUrl) {
    return <span>{children}</span>;
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline-offset-2 hover:underline"
    >
      {children}
    </a>
  );
}

/**
 * User mention component
 */
function UserMention({ username }: { username: string }) {
  return (
    <Link
      href={`/users/${username}`}
      className="bg-primary/10 hover:bg-primary/20 inline-flex items-center rounded px-1 py-0.5 font-medium text-primary"
    >
      @{username}
    </Link>
  );
}

/**
 * Channel mention component
 */
function ChannelMention({ channelName }: { channelName: string }) {
  return (
    <Link
      href={`/chat/${channelName}`}
      className="inline-flex items-center rounded bg-blue-500/10 px-1 py-0.5 font-medium text-blue-500 hover:bg-blue-500/20"
    >
      #{channelName}
    </Link>
  );
}

/**
 * Emoji component
 */
function Emoji({ name }: { name: string }) {
  // Simple emoji mapping - in production use a proper emoji library
  const emojiMap: Record<string, string> = {
    smile: "\u{1F642}",
    grin: "\u{1F600}",
    joy: "\u{1F602}",
    heart: "\u{2764}",
    thumbs_up: "\u{1F44D}",
    thumbs_down: "\u{1F44E}",
    fire: "\u{1F525}",
    rocket: "\u{1F680}",
    star: "\u{2B50}",
    check: "\u{2705}",
    x: "\u{274C}",
    warning: "\u{26A0}",
    tada: "\u{1F389}",
    thinking: "\u{1F914}",
    eyes: "\u{1F440}",
    clap: "\u{1F44F}",
    pray: "\u{1F64F}",
    wave: "\u{1F44B}",
  };

  const emoji = emojiMap[name];

  if (emoji) {
    return <span className="text-base">{emoji}</span>;
  }

  // Return as custom emoji placeholder
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-muted text-xs">
      :{name}:
    </span>
  );
}

/**
 * GIF content component
 */
function GifContent({
  url,
  metadata,
}: {
  url: string;
  metadata?: {
    width?: number;
    height?: number;
    preview?: string;
    title?: string;
  };
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  // Calculate dimensions (max 400px wide, maintain aspect ratio)
  const maxWidth = 400;
  const width = metadata?.width || maxWidth;
  const height = metadata?.height || 300;
  const aspectRatio = width / height;
  const displayWidth = Math.min(width, maxWidth);
  const displayHeight = displayWidth / aspectRatio;

  return (
    <div
      className="bg-muted/30 relative overflow-hidden rounded-lg border"
      style={{
        width: `${displayWidth}px`,
        height: `${displayHeight}px`,
        maxWidth: "100%",
      }}
    >
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>
      )}

      {hasError && (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <p className="text-sm">Failed to load GIF</p>
        </div>
      )}

      <img
        src={url}
        alt={metadata?.title || "GIF"}
        className={cn(
          "h-full w-full object-contain transition-opacity",
          isLoaded ? "opacity-100" : "opacity-0",
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

/**
 * Sticker content component
 */
function StickerContent({
  sticker,
}: {
  sticker: {
    id: string;
    name: string;
    file_url: string;
    thumbnail_url?: string;
  };
}) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const imageUrl = sticker.thumbnail_url || sticker.file_url;

  return (
    <div
      className="relative inline-block"
      style={{ width: "128px", height: "128px" }}
    >
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        </div>
      )}

      {hasError && (
        <div className="flex h-full items-center justify-center text-muted-foreground">
          <p className="text-xs">Error</p>
        </div>
      )}

      <img
        src={imageUrl}
        alt={sticker.name}
        className={cn(
          "h-full w-full object-contain transition-opacity",
          isLoaded ? "opacity-100" : "opacity-0",
        )}
        title={sticker.name}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
      />
    </div>
  );
}

/**
 * Render plain text (for previews, notifications, etc.)
 */
export function renderPlainText(content: string, maxLength?: number): string {
  // Remove markdown formatting
  let text = content
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "[code]")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

  // Truncate if needed
  if (maxLength && text.length > maxLength) {
    text = text.slice(0, maxLength - 3) + "...";
  }

  return text;
}
