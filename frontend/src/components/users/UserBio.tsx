"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface UserBioProps extends React.HTMLAttributes<HTMLDivElement> {
  bio: string;
  maxLength?: number;
  expandable?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const UserBio = React.forwardRef<HTMLDivElement, UserBioProps>(
  ({ className, bio, maxLength = 300, expandable = true, ...props }, ref) => {
    const [isExpanded, setIsExpanded] = React.useState(false);
    const shouldTruncate = bio.length > maxLength && expandable;
    const displayText =
      shouldTruncate && !isExpanded ? bio.slice(0, maxLength) + "..." : bio;

    // Parse bio for links and mentions
    const parsedBio = React.useMemo(() => {
      // Simple URL regex
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      // Mention regex (@username)
      const mentionRegex = /@(\w+)/g;

      // HTML-escape user content before inserting into innerHTML to prevent XSS
      const escaped = displayText
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

      let result = escaped;

      // Replace URLs with links (URLs were already escaped, unescape them for href)
      result = result.replace(
        urlRegex,
        '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>',
      );

      // Replace mentions
      result = result.replace(
        mentionRegex,
        '<span class="text-primary font-medium">@$1</span>',
      );

      return result;
    }, [displayText]);

    return (
      <div ref={ref} className={cn("text-sm", className)} {...props}>
        <p
          className="whitespace-pre-wrap break-words text-muted-foreground"
          // sast-ignore: XSS -- parsedBio is HTML-escaped before URL/mention substitution; no raw user HTML passes through
          dangerouslySetInnerHTML={{ __html: parsedBio }}
        />
        {shouldTruncate && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-2 text-sm font-medium text-primary hover:underline"
          >
            {isExpanded ? "Show less" : "Show more"}
          </button>
        )}
      </div>
    );
  },
);
UserBio.displayName = "UserBio";

export { UserBio };
