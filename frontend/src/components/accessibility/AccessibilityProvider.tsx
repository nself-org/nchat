"use client";

import { AccessibilityProvider as A11yProvider } from "@/contexts/accessibility-context";
import { useEffect } from "react";

/**
 * Accessibility Provider Wrapper
 *
 * Wraps the application with accessibility context and initializes
 * global accessibility features.
 */

interface AccessibilityProviderProps {
  children: React.ReactNode;
}

export function AccessibilityProvider({
  children,
}: AccessibilityProviderProps) {
  useEffect(() => {
    // Initialize skip links
    const skipLinks = [
      { id: "main-content", label: "Skip to main content" },
      { id: "sidebar", label: "Skip to navigation" },
      { id: "message-input", label: "Skip to message input" },
    ];

    const container = document.createElement("div");
    container.className = "skip-links";
    container.setAttribute("role", "navigation");
    container.setAttribute("aria-label", "Skip links");

    skipLinks.forEach(({ id, label }) => {
      const link = document.createElement("a");
      link.href = `#${id}`;
      link.className = "skip-link";
      link.textContent = label;

      link.addEventListener("click", (e) => {
        e.preventDefault();
        const target = document.getElementById(id);
        if (target) {
          target.setAttribute("tabindex", "-1");
          target.focus();
          target.scrollIntoView({ behavior: "smooth" });

          target.addEventListener(
            "blur",
            () => {
              target.removeAttribute("tabindex");
            },
            { once: true },
          );
        }
      });

      container.appendChild(link);
    });

    document.body.insertBefore(container, document.body.firstChild);

    return () => {
      container.remove();
    };
  }, []);

  return <A11yProvider>{children}</A11yProvider>;
}
