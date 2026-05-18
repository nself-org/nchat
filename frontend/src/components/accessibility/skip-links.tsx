"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SkipLink {
  id: string;
  label: string;
  targetId: string;
}

const defaultSkipLinks: SkipLink[] = [
  {
    id: "skip-to-main",
    label: "Skip to main content",
    targetId: "main-content",
  },
  { id: "skip-to-sidebar", label: "Skip to sidebar", targetId: "sidebar" },
  {
    id: "skip-to-input",
    label: "Skip to message input",
    targetId: "message-input",
  },
];

export interface SkipLinksProps {
  /** Custom skip links to use instead of defaults */
  links?: SkipLink[];
  /** Additional CSS classes */
  className?: string;
}

/**
 * Skip navigation links for keyboard users
 * These links are visually hidden until focused
 */
export function SkipLinks({
  links = defaultSkipLinks,
  className,
}: SkipLinksProps) {
  const handleClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
  ) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      // Set tabindex temporarily to allow focus
      const currentTabIndex = target.getAttribute("tabindex");
      if (!currentTabIndex) {
        target.setAttribute("tabindex", "-1");
      }
      target.focus();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      // Remove tabindex after blur if it wasn't there originally
      if (!currentTabIndex) {
        target.addEventListener(
          "blur",
          () => {
            target.removeAttribute("tabindex");
          },
          { once: true },
        );
      }
    }
  };

  return (
    <nav aria-label="Skip navigation" className={cn("skip-links", className)}>
      <ul className="m-0 list-none p-0">
        {links.map((link) => (
          <li key={link.id}>
            <a
              id={link.id}
              href={`#${link.targetId}`}
              onClick={(e) => handleClick(e, link.targetId)}
              className={cn(
                "sr-only focus:not-sr-only",
                "focus:fixed focus:left-4 focus:top-4 focus:z-[9999]",
                "focus:block focus:rounded-md focus:bg-primary focus:px-4 focus:py-2",
                "focus:text-primary-foreground focus:shadow-lg",
                "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                "font-medium transition-all",
              )}
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * Landmark component to mark skip link targets
 */
export interface SkipLinkTargetProps {
  id: string;
  children: React.ReactNode;
  as?: React.ElementType;
  className?: string;
}

export function SkipLinkTarget({
  id,
  children,
  as: Component = "div",
  className,
}: SkipLinkTargetProps) {
  return (
    <Component
      id={id}
      className={cn("scroll-mt-4 outline-none focus:outline-none", className)}
      tabIndex={-1}
    >
      {children}
    </Component>
  );
}

export default SkipLinks;
