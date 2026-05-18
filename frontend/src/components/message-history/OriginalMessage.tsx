"use client";

import { FileText, User, Clock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatMessageTime, formatMessageTimeTooltip } from "@/lib/date";
import type { MessageVersion } from "@/lib/message-history";

export interface OriginalMessageProps {
  /** The original version of the message */
  version: MessageVersion;
  /** Current message content for comparison */
  currentContent?: string;
  /** Whether to show the full content */
  showFullContent?: boolean;
  /** Maximum characters to show in preview */
  maxPreviewLength?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Displays the original version of a message.
 * Used in edit history views to show what the message looked like initially.
 */
export function OriginalMessage({
  version,
  currentContent,
  showFullContent = false,
  maxPreviewLength = 200,
  className,
}: OriginalMessageProps) {
  const { content, editedBy, createdAt } = version;

  const displayContent = showFullContent
    ? content
    : content.length > maxPreviewLength
      ? `${content.slice(0, maxPreviewLength)}...`
      : content;

  const hasChanges = currentContent && currentContent !== content;

  return (
    <div className={cn("rounded-lg border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">Original Message</span>
          <Badge variant="secondary" className="text-xs">
            Version 1
          </Badge>
        </div>
        {hasChanges && (
          <Badge variant="outline" className="text-xs">
            {Math.abs(content.length - (currentContent?.length ?? 0))} char
            {content.length > (currentContent?.length ?? 0)
              ? " shorter"
              : " longer"}{" "}
            now
          </Badge>
        )}
      </div>

      {/* Author info */}
      <div className="flex items-center gap-3 border-b px-4 py-2 text-sm">
        <Avatar className="h-6 w-6">
          <AvatarImage src={editedBy.avatarUrl} alt={editedBy.displayName} />
          <AvatarFallback>
            <User className="h-3 w-3" />
          </AvatarFallback>
        </Avatar>
        <span className="font-medium">{editedBy.displayName}</span>
        <span className="text-muted-foreground">posted</span>
        <span
          className="text-muted-foreground"
          title={formatMessageTimeTooltip(createdAt)}
        >
          {formatMessageTime(createdAt)}
        </span>
      </div>

      {/* Content */}
      <div className="p-4">
        <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
          {displayContent}
        </pre>
        {!showFullContent && content.length > maxPreviewLength && (
          <p className="mt-2 text-sm text-muted-foreground">
            Showing first {maxPreviewLength} of {content.length} characters
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Compact original message preview.
 */
export interface OriginalMessagePreviewProps {
  /** The original content */
  content: string;
  /** When it was created */
  createdAt: Date;
  /** Maximum length */
  maxLength?: number;
  /** Additional CSS classes */
  className?: string;
}

export function OriginalMessagePreview({
  content,
  createdAt,
  maxLength = 100,
  className,
}: OriginalMessagePreviewProps) {
  const preview =
    content.length > maxLength ? `${content.slice(0, maxLength)}...` : content;

  return (
    <div className={cn("space-y-1 text-sm", className)}>
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-3 w-3" />
        <span>Original ({formatMessageTime(createdAt)})</span>
      </div>
      <p className="bg-muted/50 rounded-md p-2 italic text-muted-foreground">
        &quot;{preview}&quot;
      </p>
    </div>
  );
}

/**
 * Original vs current comparison card.
 */
export interface OriginalVsCurrentProps {
  /** Original version */
  original: MessageVersion;
  /** Current content */
  currentContent: string;
  /** Additional CSS classes */
  className?: string;
}

export function OriginalVsCurrent({
  original,
  currentContent,
  className,
}: OriginalVsCurrentProps) {
  const originalLength = original.content.length;
  const currentLength = currentContent.length;
  const lengthDiff = currentLength - originalLength;
  const percentChange =
    originalLength > 0
      ? Math.round((Math.abs(lengthDiff) / originalLength) * 100)
      : 100;

  return (
    <div className={cn("grid gap-4 md:grid-cols-2", className)}>
      {/* Original */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Original</span>
          <span className="text-xs text-muted-foreground">
            {originalLength} chars
          </span>
        </div>
        <div className="bg-muted/30 min-h-[100px] rounded-md border p-3">
          <pre className="whitespace-pre-wrap font-mono text-sm">
            {original.content || (
              <span className="italic text-muted-foreground">
                Empty message
              </span>
            )}
          </pre>
        </div>
        <div className="text-xs text-muted-foreground">
          {formatMessageTime(original.createdAt)}
        </div>
      </div>

      {/* Current */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium">Current</span>
          <span className="text-xs text-muted-foreground">
            {currentLength} chars
          </span>
        </div>
        <div className="bg-muted/30 min-h-[100px] rounded-md border p-3">
          <pre className="whitespace-pre-wrap font-mono text-sm">
            {currentContent || (
              <span className="italic text-muted-foreground">
                Empty message
              </span>
            )}
          </pre>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {lengthDiff !== 0 && (
            <span
              className={cn(lengthDiff > 0 ? "text-green-600" : "text-red-600")}
            >
              {lengthDiff > 0 ? "+" : ""}
              {lengthDiff} chars ({percentChange}%)
            </span>
          )}
          {lengthDiff === 0 && (
            <span className="text-muted-foreground">Same length</span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Quick view of original message inline.
 */
export interface InlineOriginalProps {
  /** Original content */
  originalContent: string;
  /** Label text */
  label?: string;
  /** Additional CSS classes */
  className?: string;
}

export function InlineOriginal({
  originalContent,
  label = "Originally said",
  className,
}: InlineOriginalProps) {
  return (
    <div
      className={cn(
        "border-muted-foreground/30 bg-muted/30 rounded-md border-l-2 py-2 pl-3 pr-2",
        className,
      )}
    >
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-sm italic text-muted-foreground">
        &quot;{originalContent}&quot;
      </p>
    </div>
  );
}
