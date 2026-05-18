"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { type SocialLink } from "./UserCard";
import { Button } from "@/components/ui/button";
import {
  Github,
  Twitter,
  Linkedin,
  Instagram,
  Youtube,
  Facebook,
  Globe,
  Link as LinkIcon,
  ExternalLink,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UserLinksProps extends React.HTMLAttributes<HTMLDivElement> {
  links: SocialLink[];
  variant?: "icons" | "list" | "buttons";
}

// ============================================================================
// Helper: Get platform icon
// ============================================================================

function getPlatformIcon(platform: string): React.ReactNode {
  const normalizedPlatform = platform.toLowerCase();
  const iconProps = { className: "h-4 w-4" };

  if (normalizedPlatform.includes("github")) return <Github {...iconProps} />;
  if (
    normalizedPlatform.includes("twitter") ||
    normalizedPlatform.includes("x.com")
  )
    return <Twitter {...iconProps} />;
  if (normalizedPlatform.includes("linkedin"))
    return <Linkedin {...iconProps} />;
  if (normalizedPlatform.includes("instagram"))
    return <Instagram {...iconProps} />;
  if (normalizedPlatform.includes("youtube")) return <Youtube {...iconProps} />;
  if (normalizedPlatform.includes("facebook"))
    return <Facebook {...iconProps} />;
  if (
    normalizedPlatform.includes("website") ||
    normalizedPlatform.includes("personal")
  )
    return <Globe {...iconProps} />;
  return <LinkIcon {...iconProps} />;
}

function getPlatformColor(platform: string): string {
  const normalizedPlatform = platform.toLowerCase();

  if (normalizedPlatform.includes("github"))
    return "hover:bg-[#24292e] hover:text-white";
  if (
    normalizedPlatform.includes("twitter") ||
    normalizedPlatform.includes("x.com")
  )
    return "hover:bg-[#1DA1F2] hover:text-white";
  if (normalizedPlatform.includes("linkedin"))
    return "hover:bg-[#0077B5] hover:text-white";
  if (normalizedPlatform.includes("instagram"))
    return "hover:bg-[#E4405F] hover:text-white";
  if (normalizedPlatform.includes("youtube"))
    return "hover:bg-[#FF0000] hover:text-white";
  if (normalizedPlatform.includes("facebook"))
    return "hover:bg-[#4267B2] hover:text-white";
  return "hover:bg-primary hover:text-primary-foreground";
}

// ============================================================================
// Component
// ============================================================================

const UserLinks = React.forwardRef<HTMLDivElement, UserLinksProps>(
  ({ className, links, variant = "list", ...props }, ref) => {
    if (links.length === 0) return null;

    // Icons only variant
    if (variant === "icons") {
      return (
        <div
          ref={ref}
          className={cn("flex items-center gap-2", className)}
          {...props}
        >
          {links.map((link, index) => (
            <a
              key={index}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full bg-muted transition-colors",
                getPlatformColor(link.platform),
              )}
              title={link.platform}
            >
              {link.icon || getPlatformIcon(link.platform)}
            </a>
          ))}
        </div>
      );
    }

    // Buttons variant
    if (variant === "buttons") {
      return (
        <div
          ref={ref}
          className={cn("flex flex-wrap gap-2", className)}
          {...props}
        >
          {links.map((link, index) => (
            <Button key={index} variant="outline" size="sm" asChild>
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                {link.icon || getPlatformIcon(link.platform)}
                <span className="ml-2">{link.platform}</span>
              </a>
            </Button>
          ))}
        </div>
      );
    }

    // List variant (default)
    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {links.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-muted/50 group flex items-center gap-3 rounded-lg p-2 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
              {link.icon || getPlatformIcon(link.platform)}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{link.platform}</p>
              <p className="truncate text-xs text-muted-foreground">
                {link.url.replace(/^https?:\/\//, "")}
              </p>
            </div>
            <ExternalLink className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
          </a>
        ))}
      </div>
    );
  },
);
UserLinks.displayName = "UserLinks";

export { UserLinks };
