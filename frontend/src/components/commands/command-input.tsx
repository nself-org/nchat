"use client";

/**
 * CommandInput Component
 *
 * Provides input field for command arguments with inline parsing,
 * validation feedback, and autocomplete suggestions.
 *
 * @example
 * ```tsx
 * <CommandInput
 *   command={selectedCommand}
 *   value={inputValue}
 *   onChange={setInputValue}
 *   onSubmit={handleSubmit}
 *   onCancel={handleCancel}
 * />
 * ```
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SlashCommand, CommandArg } from "@/lib/commands";
import type { ParsedCommand, ArgSuggestion } from "@/lib/commands";

// ============================================================================
// Types
// ============================================================================

export interface CommandInputProps {
  /** The command being entered */
  command: SlashCommand;
  /** Current input value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when command is submitted */
  onSubmit: (value: string) => void;
  /** Callback when input is cancelled */
  onCancel: () => void;
  /** Parsed command for validation feedback */
  parsedCommand?: ParsedCommand;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Placeholder text */
  placeholder?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Additional class names */
  className?: string;
}

export interface ArgumentInputProps {
  /** The argument definition */
  arg: CommandArg;
  /** Current value */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Whether the argument has an error */
  hasError?: boolean;
  /** Error message */
  errorMessage?: string;
  /** Suggestions for the argument */
  suggestions?: ArgSuggestion[];
  /** Callback when suggestion is selected */
  onSuggestionSelect?: (suggestion: ArgSuggestion) => void;
  /** Additional class names */
  className?: string;
}

// ============================================================================
// Argument Input Component
// ============================================================================

export function ArgumentInput({
  arg,
  value,
  onChange,
  hasError = false,
  errorMessage,
  suggestions = [],
  onSuggestionSelect,
  className,
}: ArgumentInputProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Delay to allow click on suggestion
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const handleSuggestionClick = (suggestion: ArgSuggestion) => {
    onChange(suggestion.value);
    onSuggestionSelect?.(suggestion);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  // Get input type based on argument type
  const getInputType = (): string => {
    switch (arg.type) {
      case "emoji":
        return "text";
      default:
        return "text";
    }
  };

  // Get prefix based on argument type
  const getPrefix = (): string | null => {
    switch (arg.type) {
      case "user":
        return "@";
      case "channel":
        return "#";
      default:
        return null;
    }
  };

  const prefix = getPrefix();

  return (
    <div className={cn("relative", className)}>
      <label className="mb-1 block text-xs font-medium text-muted-foreground">
        {arg.name}
        {arg.required && <span className="ml-0.5 text-destructive">*</span>}
      </label>

      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          ref={inputRef}
          type={getInputType()}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={arg.placeholder || arg.description}
          className={cn(
            prefix && "pl-7",
            hasError && "border-destructive focus-visible:ring-destructive",
          )}
        />
      </div>

      {hasError && errorMessage && (
        <p className="mt-1 text-xs text-destructive">{errorMessage}</p>
      )}

      {arg.description && !hasError && (
        <p className="mt-1 text-xs text-muted-foreground">{arg.description}</p>
      )}

      {/* Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-md">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              type="button"
              className={cn(
                "w-full px-3 py-2 text-left text-sm hover:bg-accent",
                "flex items-center justify-between",
                index === 0 && "rounded-t-md",
                index === suggestions.length - 1 && "rounded-b-md",
              )}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              <span className="font-medium">{suggestion.label}</span>
              {suggestion.description && (
                <span className="text-xs text-muted-foreground">
                  {suggestion.description}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Quick Suggestion Chips
// ============================================================================

interface SuggestionChipsProps {
  suggestions: ArgSuggestion[];
  onSelect: (suggestion: ArgSuggestion) => void;
  className?: string;
}

function SuggestionChips({
  suggestions,
  onSelect,
  className,
}: SuggestionChipsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {suggestions.map((suggestion, index) => (
        <button
          key={index}
          type="button"
          onClick={() => onSelect(suggestion)}
          className={cn(
            "inline-flex items-center rounded-md px-2 py-1 text-xs",
            "hover:bg-muted/80 bg-muted text-muted-foreground",
            "transition-colors",
          )}
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function CommandInput({
  command,
  value,
  onChange,
  onSubmit,
  onCancel,
  parsedCommand,
  disabled = false,
  placeholder,
  autoFocus = true,
  className,
}: CommandInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [localValue, setLocalValue] = React.useState(value);

  // Sync local value with prop
  React.useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Auto focus on mount
  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setLocalValue(newValue);
    onChange(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      const fullCommand = `/${command.name} ${localValue}`.trim();
      onSubmit(fullCommand);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const fullCommand = `/${command.name} ${localValue}`.trim();
    onSubmit(fullCommand);
  };

  // Get validation errors
  const errors = parsedCommand?.errors || [];
  const hasErrors = errors.length > 0;

  // Build placeholder from command args
  const buildPlaceholder = (): string => {
    if (placeholder) return placeholder;
    if (command.args.length === 0) return "";

    return command.args
      .map((arg) => (arg.required ? `<${arg.name}>` : `[${arg.name}]`))
      .join(" ");
  };

  // Get quick suggestions based on first argument
  const getQuickSuggestions = (): ArgSuggestion[] => {
    if (command.args.length === 0 || localValue.trim()) return [];

    const firstArg = command.args[0];
    switch (firstArg.type) {
      case "duration":
        return [
          { value: "15m", label: "15 min", type: "duration" },
          { value: "30m", label: "30 min", type: "duration" },
          { value: "1h", label: "1 hour", type: "duration" },
          { value: "2h", label: "2 hours", type: "duration" },
        ];
      case "emoji":
        return [
          { value: ":coffee:", label: "Coffee", type: "emoji" },
          { value: ":palm_tree:", label: "Vacation", type: "emoji" },
          { value: ":house:", label: "WFH", type: "emoji" },
        ];
      default:
        return [];
    }
  };

  const quickSuggestions = getQuickSuggestions();

  return (
    <form onSubmit={handleSubmit} className={cn("space-y-3", className)}>
      {/* Command Header */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-md bg-muted px-2 py-1">
          <span className="text-muted-foreground">/</span>
          <span className="text-sm font-medium">{command.name}</span>
        </div>
        <span className="text-sm text-muted-foreground">
          {command.description}
        </span>
      </div>

      {/* Main Input */}
      {command.args.length > 0 && (
        <div className="space-y-2">
          <Input
            ref={inputRef}
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={buildPlaceholder()}
            disabled={disabled}
            className={cn(
              hasErrors && "border-destructive focus-visible:ring-destructive",
            )}
          />

          {/* Quick Suggestions */}
          <SuggestionChips
            suggestions={quickSuggestions}
            onSelect={(suggestion) => {
              setLocalValue(suggestion.value);
              onChange(suggestion.value);
            }}
          />

          {/* Error Messages */}
          {hasErrors && (
            <div className="space-y-1">
              {errors.map((error, index) => (
                <p key={index} className="text-xs text-destructive">
                  {error.message}
                </p>
              ))}
            </div>
          )}

          {/* Usage Hint */}
          <p className="font-mono text-xs text-muted-foreground">
            Usage: {command.usage}
          </p>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={
            disabled || (hasErrors && command.args.some((a) => a.required))
          }
        >
          {command.args.length === 0 ? "Execute" : "Send"}
        </Button>
      </div>
    </form>
  );
}

// ============================================================================
// Inline Command Input (for use in message input)
// ============================================================================

export interface InlineCommandInputProps {
  /** Current full input value (including /) */
  value: string;
  /** Callback when value changes */
  onChange: (value: string) => void;
  /** Callback when command is submitted */
  onSubmit: (value: string) => void;
  /** Callback when input is cancelled (Escape) */
  onCancel: () => void;
  /** Parsed command for validation */
  parsedCommand?: ParsedCommand;
  /** Additional class names */
  className?: string;
}

export function InlineCommandInput({
  value,
  onChange,
  onSubmit,
  onCancel,
  parsedCommand,
  className,
}: InlineCommandInputProps) {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(value);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  };

  const errors = parsedCommand?.errors || [];
  const hasErrors = errors.length > 0;

  return (
    <div className={cn("relative", className)}>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        className={cn(
          "max-h-[200px] min-h-[44px] w-full resize-none px-3 py-2",
          "bg-transparent text-foreground placeholder:text-muted-foreground",
          "focus:outline-none",
          hasErrors && "text-destructive",
        )}
        placeholder="Type a command..."
      />

      {/* Inline validation hint */}
      {hasErrors && (
        <div className="absolute bottom-full left-0 mb-1 rounded bg-destructive px-2 py-1 text-xs text-destructive-foreground">
          {errors[0]?.message}
        </div>
      )}

      {/* Command suggestion hint */}
      {parsedCommand?.command && !parsedCommand.isComplete && (
        <div className="absolute bottom-full left-0 mb-1 rounded bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
          {parsedCommand.command.usage}
        </div>
      )}
    </div>
  );
}

export default CommandInput;
