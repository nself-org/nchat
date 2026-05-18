"use client";

/**
 * LinkDomain - Displays source domain for link previews
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { LinkFavicon } from "./LinkFavicon";

export interface LinkDomainProps {
  /** Domain name */
  domain: string;
  /** Favicon URL */
  favicon?: string;
  /** Site name (optional, displayed instead of domain) */
  siteName?: string;
  /** Whether the link is secure (HTTPS) */
  isSecure?: boolean;
  /** Show favicon */
  showFavicon?: boolean;
  /** Show lock icon for secure links */
  showSecureIcon?: boolean;
  /** Additional class name */
  className?: string;
}

export function LinkDomain({
  domain,
  favicon,
  siteName,
  isSecure = true,
  showFavicon = true,
  showSecureIcon = false,
  className,
}: LinkDomainProps) {
  const displayName = siteName || domain;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs text-muted-foreground",
        className,
      )}
    >
      {showFavicon && (
        <LinkFavicon src={favicon} siteName={siteName} size="sm" />
      )}

      {showSecureIcon && isSecure && (
        <svg
          className="h-3 w-3 text-green-500"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            clipRule="evenodd"
          />
        </svg>
      )}

      <span className="truncate">{displayName}</span>
    </div>
  );
}

export default LinkDomain;
