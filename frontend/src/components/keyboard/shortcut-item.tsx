"use client";

/**
 * ShortcutItem Component
 *
 * Displays a single keyboard shortcut with its description and key combination.
 * Supports customization indicators and recording state for rebinding.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { ShortcutKey, KeySize, KeyVariant } from "./shortcut-key";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useShortcutStore } from "@/lib/keyboard/shortcut-store";
import { ShortcutKey as ShortcutKeyType } from "@/lib/keyboard/shortcuts";
import { eventToShortcut } from "@/lib/keyboard/shortcut-utils";

// ============================================================================
// Types
// ============================================================================

export interface ShortcutItemProps {
  /** The shortcut key identifier */
  id: ShortcutKeyType;
  /** Label/description of the action */
  label: string;
  /** The key combination string */
  keys: string;
  /** Optional extended description */
  description?: string;
  /** Whether this shortcut has been customized */
  isCustomized?: boolean;
  /** Whether this shortcut is enabled */
  isEnabled?: boolean;
  /** Whether the item is currently being recorded for rebinding */
  isRecording?: boolean;
  /** Size of the key display */
  keySize?: KeySize;
  /** Variant for the key display */
  keyVariant?: KeyVariant;
  /** Allow editing/rebinding */
  allowCustomize?: boolean;
  /** Callback when edit is requested */
  onEdit?: (id: ShortcutKeyType) => void;
  /** Callback when reset is requested */
  onReset?: (id: ShortcutKeyType) => void;
  /** Callback when enable/disable is toggled */
  onToggle?: (id: ShortcutKeyType, enabled: boolean) => void;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// ShortcutItem Component
// ============================================================================

/**
 * Displays a keyboard shortcut item with action description and key combination
 *
 * @example
 * ```tsx
 * <ShortcutItem
 *   id="QUICK_SWITCHER"
 *   label="Open quick switcher"
 *   keys="mod+k"
 *   description="Quickly navigate to channels and DMs"
 * />
 * ```
 */
export function ShortcutItem({
  id,
  label,
  keys,
  description,
  isCustomized = false,
  isEnabled = true,
  isRecording = false,
  keySize = "sm",
  keyVariant = "default",
  allowCustomize = false,
  onEdit,
  onReset,
  onToggle,
  className,
}: ShortcutItemProps) {
  const [isHovered, setIsHovered] = React.useState(false);
  const [recordedKey, setRecordedKey] = React.useState<string | null>(null);

  // Handle key recording
  React.useEffect(() => {
    if (!isRecording) {
      setRecordedKey(null);
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const shortcut = eventToShortcut(event);
      if (shortcut) {
        setRecordedKey(shortcut);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isRecording]);

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2",
        "transition-colors duration-150",
        !isEnabled && "opacity-50",
        isRecording && "bg-primary/10 ring-primary/50 ring-2",
        isHovered && !isRecording && "bg-muted/50",
        className,
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Left side: Label and description */}
      <div className="min-w-0 flex-1 pr-4">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              "truncate text-sm font-medium",
              !isEnabled && "line-through",
            )}
          >
            {label}
          </span>
          {isCustomized && (
            <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
              Custom
            </Badge>
          )}
          {!isEnabled && (
            <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
              Disabled
            </Badge>
          )}
        </div>
        {description && (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {description}
          </p>
        )}
      </div>

      {/* Right side: Key combination and actions */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {/* Key display */}
        {isRecording ? (
          <div className="flex items-center gap-2">
            {recordedKey ? (
              <ShortcutKey
                keys={recordedKey}
                size={keySize}
                variant="outline"
              />
            ) : (
              <span className="animate-pulse text-sm text-muted-foreground">
                Press keys...
              </span>
            )}
          </div>
        ) : (
          <ShortcutKey
            keys={keys}
            size={keySize}
            variant={keyVariant}
            separated
          />
        )}

        {/* Action buttons (shown on hover when customization is allowed) */}
        {allowCustomize && isHovered && !isRecording && (
          <div className="ml-2 flex items-center gap-1">
            {onEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onEdit(id)}
              >
                Edit
              </Button>
            )}
            {isCustomized && onReset && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onReset(id)}
              >
                Reset
              </Button>
            )}
            {onToggle && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onToggle(id, !isEnabled)}
              >
                {isEnabled ? "Disable" : "Enable"}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ShortcutItemCompact Component
// ============================================================================

export interface ShortcutItemCompactProps {
  /** Label/description of the action */
  label: string;
  /** The key combination string */
  keys: string;
  /** Size of the key display */
  keySize?: KeySize;
  /** Additional class name */
  className?: string;
}

/**
 * Compact version of ShortcutItem for inline display
 *
 * @example
 * ```tsx
 * <ShortcutItemCompact label="Search" keys="mod+k" />
 * ```
 */
export function ShortcutItemCompact({
  label,
  keys,
  keySize = "xs",
  className,
}: ShortcutItemCompactProps) {
  return (
    <div
      className={cn("flex items-center justify-between gap-4 py-1", className)}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <ShortcutKey keys={keys} size={keySize} variant="subtle" />
    </div>
  );
}

// ============================================================================
// ShortcutItemEditable Component
// ============================================================================

export interface ShortcutItemEditableProps {
  /** The shortcut key identifier */
  id: ShortcutKeyType;
  /** Label/description of the action */
  label: string;
  /** Default key combination */
  defaultKeys: string;
  /** Current key combination (if customized) */
  currentKeys: string;
  /** Callback when keys are changed */
  onChange: (id: ShortcutKeyType, keys: string) => void;
  /** Callback when shortcut is reset to default */
  onReset: (id: ShortcutKeyType) => void;
  /** Additional class name */
  className?: string;
}

/**
 * Editable shortcut item with recording capability
 */
export function ShortcutItemEditable({
  id,
  label,
  defaultKeys,
  currentKeys,
  onChange,
  onReset,
  className,
}: ShortcutItemEditableProps) {
  const [isEditing, setIsEditing] = React.useState(false);
  const [pendingKey, setPendingKey] = React.useState<string | null>(null);
  const isCustomized = currentKeys !== defaultKeys;

  // Handle key recording
  React.useEffect(() => {
    if (!isEditing) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const shortcut = eventToShortcut(event);
      if (shortcut) {
        setPendingKey(shortcut);
      }
    };

    const handleKeyUp = () => {
      if (pendingKey) {
        onChange(id, pendingKey);
        setIsEditing(false);
        setPendingKey(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [isEditing, pendingKey, id, onChange]);

  // Cancel on escape
  React.useEffect(() => {
    if (!isEditing) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsEditing(false);
        setPendingKey(null);
      }
    };

    window.addEventListener("keydown", handleEscape, { capture: true });

    return () => {
      window.removeEventListener("keydown", handleEscape, { capture: true });
    };
  }, [isEditing]);

  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-md px-3 py-2",
        isEditing && "bg-primary/10 ring-primary/50 ring-2",
        className,
      )}
    >
      <div className="flex flex-1 items-center gap-2">
        <span className="text-sm font-medium">{label}</span>
        {isCustomized && (
          <Badge variant="secondary" className="px-1.5 py-0 text-[10px]">
            Custom
          </Badge>
        )}
      </div>

      <div className="flex items-center gap-2">
        {isEditing ? (
          <div className="flex items-center gap-2">
            {pendingKey ? (
              <ShortcutKey keys={pendingKey} size="sm" variant="outline" />
            ) : (
              <span className="animate-pulse text-sm text-muted-foreground">
                Press keys...
              </span>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                setIsEditing(false);
                setPendingKey(null);
              }}
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <ShortcutKey keys={currentKeys} size="sm" separated />
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => setIsEditing(true)}
            >
              Edit
            </Button>
            {isCustomized && (
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs"
                onClick={() => onReset(id)}
              >
                Reset
              </Button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default ShortcutItem;
