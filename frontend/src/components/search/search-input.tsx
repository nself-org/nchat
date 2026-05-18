"use client";

import * as React from "react";
import { Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

export interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange" | "size"
> {
  /** Current search query value */
  value: string;
  /** Callback when search value changes */
  onChange: (value: string) => void;
  /** Callback when search is submitted (Enter key) */
  onSubmit?: () => void;
  /** Whether the search is loading */
  isLoading?: boolean;
  /** Keyboard shortcut hint to display */
  shortcutHint?: string;
  /** Whether to show the clear button */
  showClear?: boolean;
  /** Custom icon to use instead of search icon */
  icon?: React.ReactNode;
  /** Size variant */
  size?: "sm" | "md" | "lg";
  /** Whether to auto-focus on mount */
  autoFocus?: boolean;
}

// ============================================================================
// Component
// ============================================================================

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onSubmit,
      isLoading = false,
      shortcutHint,
      showClear = true,
      icon,
      size = "md",
      autoFocus = false,
      className,
      placeholder = "Search...",
      ...props
    },
    ref,
  ) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Merge refs
    React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    // Auto-focus on mount
    React.useEffect(() => {
      if (autoFocus && inputRef.current) {
        inputRef.current.focus();
      }
    }, [autoFocus]);

    // Handle keyboard events
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter" && onSubmit) {
        e.preventDefault();
        onSubmit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        onChange("");
        inputRef.current?.blur();
      }
    };

    // Handle clear
    const handleClear = () => {
      onChange("");
      inputRef.current?.focus();
    };

    // Size classes
    const sizeClasses = {
      sm: "h-8 text-sm",
      md: "h-10 text-sm",
      lg: "h-12 text-base",
    };

    const iconSizeClasses = {
      sm: "h-4 w-4",
      md: "h-4 w-4",
      lg: "h-5 w-5",
    };

    const paddingClasses = {
      sm: "pl-8 pr-8",
      md: "pl-10 pr-10",
      lg: "pl-12 pr-12",
    };

    return (
      <div className={cn("relative w-full", className)}>
        {/* Left icon */}
        <div
          className={cn(
            "pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground",
            size === "lg" && "left-4",
          )}
        >
          {isLoading ? (
            <Loader2 className={cn(iconSizeClasses[size], "animate-spin")} />
          ) : icon ? (
            icon
          ) : (
            <Search className={iconSizeClasses[size]} />
          )}
        </div>

        {/* Input */}
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className={cn(
            sizeClasses[size],
            paddingClasses[size],
            "bg-muted/50 border-transparent focus:border-input focus:bg-background",
            "transition-colors duration-200",
          )}
          aria-invalid={
            props["aria-invalid"] === true || props["aria-invalid"] === "true"
              ? true
              : undefined
          }
          {...(({ "aria-invalid": _, ...rest }) => rest)(props)}
        />

        {/* Right side: clear button or shortcut hint */}
        <div
          className={cn(
            "absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1",
            size === "lg" && "right-4",
          )}
        >
          {value && showClear ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleClear}
              className="h-5 w-5 rounded-full hover:bg-muted"
              aria-label="Clear search"
            >
              <X className="h-3 w-3" />
            </Button>
          ) : shortcutHint && !value ? (
            <kbd
              className={cn(
                "pointer-events-none inline-flex items-center gap-1 rounded border",
                "bg-muted px-1.5 font-mono font-medium text-muted-foreground",
                size === "sm" ? "text-[10px]" : "text-xs",
              )}
            >
              {shortcutHint}
            </kbd>
          ) : null}
        </div>
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";

// ============================================================================
// Compact Search Input (for inline use)
// ============================================================================

export interface CompactSearchInputProps extends SearchInputProps {
  /** Whether the input is expanded */
  expanded?: boolean;
  /** Callback when expansion state changes */
  onExpandedChange?: (expanded: boolean) => void;
}

export const CompactSearchInput = React.forwardRef<
  HTMLInputElement,
  CompactSearchInputProps
>(({ expanded = false, onExpandedChange, className, ...props }, ref) => {
  const [isExpanded, setIsExpanded] = React.useState(expanded);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

  const handleExpand = () => {
    setIsExpanded(true);
    onExpandedChange?.(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleCollapse = () => {
    if (!props.value) {
      setIsExpanded(false);
      onExpandedChange?.(false);
    }
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    handleCollapse();
    props.onBlur?.(e);
  };

  if (!isExpanded) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={handleExpand}
        className={cn("h-9 w-9", className)}
        aria-label="Open search"
      >
        <Search className="h-4 w-4" />
      </Button>
    );
  }

  return (
    <div className={cn("relative", className)}>
      <SearchInput
        ref={inputRef}
        size="sm"
        {...props}
        onBlur={handleBlur}
        className={cn(
          "w-48 transition-all duration-200",
          !isExpanded && "w-0 opacity-0",
        )}
      />
    </div>
  );
});

CompactSearchInput.displayName = "CompactSearchInput";

export default SearchInput;
