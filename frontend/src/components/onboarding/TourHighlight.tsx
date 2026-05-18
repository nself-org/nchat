"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import {
  getElementPosition,
  type ElementPosition,
} from "@/lib/onboarding/tour-manager";

interface TourHighlightProps {
  targetSelector: string;
  padding?: number;
  isActive?: boolean;
  onClick?: () => void;
}

export function TourHighlight({
  targetSelector,
  padding = 8,
  isActive = true,
  onClick,
}: TourHighlightProps) {
  const [position, setPosition] = useState<ElementPosition | null>(null);

  useEffect(() => {
    if (!isActive) {
      setPosition(null);
      return;
    }

    const updatePosition = () => {
      const pos = getElementPosition(targetSelector);
      setPosition(pos);
    };

    // Initial position
    updatePosition();

    // Update on scroll and resize
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);

    // Also observe DOM changes
    const observer = new MutationObserver(updatePosition);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    });

    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
      observer.disconnect();
    };
  }, [targetSelector, isActive]);

  if (!isActive || !position) return null;

  const highlightStyle = {
    top: position.top - padding,
    left: position.left - padding,
    width: position.width + padding * 2,
    height: position.height + padding * 2,
  };

  return (
    <>
      {/* Spotlight cutout */}
      <div
        className="pointer-events-none fixed inset-0 z-[9998]"
        style={{
          background: `radial-gradient(circle at ${position.left + position.width / 2}px ${
            position.top + position.height / 2
          }px, transparent ${Math.max(position.width, position.height) / 2 + padding}px, rgba(0, 0, 0, 0.7) ${
            Math.max(position.width, position.height) / 2 + padding + 50
          }px)`,
        }}
      />

      {/* Highlight border */}
      <div
        className={cn(
          "pointer-events-none fixed z-[9999]",
          "rounded-lg border-2 border-primary",
          "shadow-[0_0_0_4px_rgba(59,130,246,0.3)]",
          "transition-all duration-300 ease-out",
        )}
        style={highlightStyle}
      >
        {/* Pulsing animation */}
        <div className="absolute inset-0 animate-ping rounded-lg border-2 border-primary opacity-75" />
      </div>

      {/* Click area */}
      {onClick && (
        <button
          type="button"
          onClick={onClick}
          className="fixed z-[10000] cursor-pointer"
          style={highlightStyle}
          aria-label="Click highlighted element"
        />
      )}
    </>
  );
}
