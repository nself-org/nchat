"use client";

/**
 * SemanticSearchToggle Component
 *
 * Toggle switch for enabling/disabling semantic (AI-powered) search.
 * Shows tooltip explaining the feature.
 *
 * @module components/search/SemanticSearchToggle
 */

import React from "react";
import { Sparkles, Zap, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ============================================================================
// Types
// ============================================================================

export interface SemanticSearchToggleProps {
  /** Whether semantic search is enabled */
  enabled: boolean;
  /** Callback when toggle changes */
  onToggle: (enabled: boolean) => void;
  /** Whether the toggle is disabled */
  disabled?: boolean;
  /** Show compact version (icon only) */
  compact?: boolean;
  /** Show help tooltip */
  showHelp?: boolean;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Component
// ============================================================================

export function SemanticSearchToggle({
  enabled,
  onToggle,
  disabled = false,
  compact = false,
  showHelp = true,
  className,
}: SemanticSearchToggleProps) {
  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={() => !disabled && onToggle(!enabled)}
              disabled={disabled}
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                enabled
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent",
                disabled && "cursor-not-allowed opacity-50",
                className,
              )}
            >
              <Sparkles className="h-4 w-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p>{enabled ? "Semantic search ON" : "Enable semantic search"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="flex items-center gap-2">
        <Switch
          id="semantic-search"
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
        <Label
          htmlFor="semantic-search"
          className={cn(
            "flex cursor-pointer items-center gap-1.5 text-sm",
            disabled && "cursor-not-allowed opacity-50",
          )}
        >
          <Sparkles
            className={cn(
              "h-4 w-4",
              enabled ? "text-primary" : "text-muted-foreground",
            )}
          />
          <span className="font-medium">Semantic Search</span>
        </Label>
      </div>

      {showHelp && (
        <Popover>
          <PopoverTrigger asChild>
            <button className="rounded-full p-0.5 text-muted-foreground hover:text-foreground">
              <HelpCircle className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="start">
            <div className="space-y-3">
              <div className="flex items-start gap-2">
                <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div>
                  <h4 className="text-sm font-semibold">Semantic Search</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Uses AI to understand the meaning of your search query, not
                    just exact keyword matches.
                  </p>
                </div>
              </div>

              <div className="space-y-2 rounded-lg bg-muted p-3">
                <div className="flex items-start gap-2">
                  <Zap className="mt-0.5 h-4 w-4 shrink-0 text-yellow-500" />
                  <div>
                    <p className="text-xs font-medium">Example</p>
                    <p className="text-xs text-muted-foreground">
                      Searching &quot;project deadline&quot; will also find
                      messages about &quot;due date&quot;, &quot;timeline&quot;,
                      or &quot;completion date&quot;.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium">Best for:</p>
                <ul className="space-y-1 text-xs text-muted-foreground">
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    Finding related discussions
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    Conceptual searches
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="h-1 w-1 rounded-full bg-primary" />
                    Natural language queries
                  </li>
                </ul>
              </div>

              <p className="text-[10px] text-muted-foreground">
                Note: Semantic search may be slower than standard search.
              </p>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// ============================================================================
// Find Similar Component
// ============================================================================

export interface FindSimilarButtonProps {
  /** Message ID to find similar messages for */
  messageId: string;
  /** Callback when clicked */
  onClick: (messageId: string) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
}

export function FindSimilarButton({
  messageId,
  onClick,
  disabled = false,
  className,
}: FindSimilarButtonProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => onClick(messageId)}
            disabled={disabled}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
              "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground",
              disabled && "cursor-not-allowed opacity-50",
              className,
            )}
          >
            <Sparkles className="h-3 w-3" />
            <span>Find similar</span>
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Find semantically similar messages</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default SemanticSearchToggle;
