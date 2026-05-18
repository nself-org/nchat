"use client";

/**
 * ShortcutCategory Component
 *
 * Displays a category of keyboard shortcuts with a header and list of items.
 * Supports collapsible sections and category-level actions.
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  ShortcutItem,
  ShortcutItemCompact,
  ShortcutItemProps,
} from "./shortcut-item";
import {
  ShortcutCategory as ShortcutCategoryType,
  ShortcutKey,
} from "@/lib/keyboard/shortcuts";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

// ============================================================================
// Types
// ============================================================================

export interface ShortcutData {
  id: ShortcutKey;
  label: string;
  keys: string;
  description?: string;
  isCustomized?: boolean;
  isEnabled?: boolean;
}

export interface ShortcutCategoryProps {
  /** Category name/title */
  name: ShortcutCategoryType | string;
  /** Description of the category */
  description?: string;
  /** Shortcuts in this category */
  shortcuts: ShortcutData[];
  /** Whether the category is collapsible */
  collapsible?: boolean;
  /** Whether the category is initially collapsed */
  defaultCollapsed?: boolean;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Allow customization of shortcuts */
  allowCustomize?: boolean;
  /** Callback when a shortcut edit is requested */
  onEditShortcut?: (id: ShortcutKey) => void;
  /** Callback when a shortcut reset is requested */
  onResetShortcut?: (id: ShortcutKey) => void;
  /** Callback when a shortcut toggle is requested */
  onToggleShortcut?: (id: ShortcutKey, enabled: boolean) => void;
  /** Icon to display next to category name */
  icon?: React.ReactNode;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Category Icons
// ============================================================================

const categoryIcons: Record<ShortcutCategoryType, React.ReactNode> = {
  Navigation: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
      />
    </svg>
  ),
  Messages: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  ),
  Formatting: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
      />
    </svg>
  ),
  UI: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"
      />
    </svg>
  ),
  Actions: (
    <svg
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 10V3L4 14h7v7l9-11h-7z"
      />
    </svg>
  ),
};

// ============================================================================
// ShortcutCategory Component
// ============================================================================

/**
 * Displays a category of keyboard shortcuts
 *
 * @example
 * ```tsx
 * <ShortcutCategory
 *   name="Navigation"
 *   shortcuts={[
 *     { id: 'QUICK_SWITCHER', label: 'Quick switcher', keys: 'mod+k' },
 *     { id: 'SEARCH', label: 'Search', keys: 'mod+f' },
 *   ]}
 * />
 * ```
 */
export function ShortcutCategory({
  name,
  description,
  shortcuts,
  collapsible = false,
  defaultCollapsed = false,
  compact = false,
  allowCustomize = false,
  onEditShortcut,
  onResetShortcut,
  onToggleShortcut,
  icon,
  className,
}: ShortcutCategoryProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);

  // Get default icon for known categories
  const categoryIcon =
    icon || categoryIcons[name as ShortcutCategoryType] || null;

  const enabledCount = shortcuts.filter((s) => s.isEnabled !== false).length;
  const customizedCount = shortcuts.filter((s) => s.isCustomized).length;

  return (
    <div className={cn("mb-6", className)}>
      {/* Category Header */}
      <div
        className={cn(
          "mb-3 flex items-center gap-2",
          collapsible && "cursor-pointer select-none",
        )}
        onClick={collapsible ? () => setIsCollapsed(!isCollapsed) : undefined}
        onKeyDown={
          collapsible
            ? (e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setIsCollapsed(!isCollapsed);
                }
              }
            : undefined
        }
        role={collapsible ? "button" : undefined}
        tabIndex={collapsible ? 0 : undefined}
      >
        {collapsible && (
          <span className="text-muted-foreground">
            {isCollapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </span>
        )}

        {categoryIcon && (
          <span className="text-muted-foreground">{categoryIcon}</span>
        )}

        <h3 className="text-sm font-semibold text-foreground">{name}</h3>

        <span className="text-xs text-muted-foreground">
          ({enabledCount}/{shortcuts.length})
        </span>

        {customizedCount > 0 && (
          <span className="text-xs text-primary">
            {customizedCount} customized
          </span>
        )}
      </div>

      {description && !isCollapsed && (
        <p className="mb-3 ml-6 text-xs text-muted-foreground">{description}</p>
      )}

      {/* Shortcuts List */}
      {!isCollapsed && (
        <div className="space-y-1">
          {shortcuts.map((shortcut) =>
            compact ? (
              <ShortcutItemCompact
                key={shortcut.id}
                label={shortcut.label}
                keys={shortcut.keys}
              />
            ) : (
              <ShortcutItem
                key={shortcut.id}
                id={shortcut.id}
                label={shortcut.label}
                keys={shortcut.keys}
                description={shortcut.description}
                isCustomized={shortcut.isCustomized}
                isEnabled={shortcut.isEnabled}
                allowCustomize={allowCustomize}
                onEdit={onEditShortcut}
                onReset={onResetShortcut}
                onToggle={onToggleShortcut}
              />
            ),
          )}

          {shortcuts.length === 0 && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              No shortcuts in this category
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// ShortcutCategoryList Component
// ============================================================================

export interface ShortcutCategoryListProps {
  /** Shortcuts grouped by category */
  categories: Record<ShortcutCategoryType | string, ShortcutData[]>;
  /** Order of categories to display */
  categoryOrder?: (ShortcutCategoryType | string)[];
  /** Whether categories are collapsible */
  collapsible?: boolean;
  /** Whether to show in compact mode */
  compact?: boolean;
  /** Allow customization of shortcuts */
  allowCustomize?: boolean;
  /** Callback when a shortcut edit is requested */
  onEditShortcut?: (id: ShortcutKey) => void;
  /** Callback when a shortcut reset is requested */
  onResetShortcut?: (id: ShortcutKey) => void;
  /** Callback when a shortcut toggle is requested */
  onToggleShortcut?: (id: ShortcutKey, enabled: boolean) => void;
  /** Additional class name */
  className?: string;
}

/**
 * Displays all shortcut categories in a list
 */
export function ShortcutCategoryList({
  categories,
  categoryOrder,
  collapsible = false,
  compact = false,
  allowCustomize = false,
  onEditShortcut,
  onResetShortcut,
  onToggleShortcut,
  className,
}: ShortcutCategoryListProps) {
  const defaultOrder: ShortcutCategoryType[] = [
    "Navigation",
    "Messages",
    "Formatting",
    "UI",
    "Actions",
  ];

  const order = categoryOrder || defaultOrder;

  // Get categories in order, then any remaining
  const orderedCategories = [
    ...order.filter((cat) => categories[cat]?.length > 0),
    ...Object.keys(categories).filter(
      (cat) =>
        !order.includes(cat as ShortcutCategoryType) &&
        categories[cat]?.length > 0,
    ),
  ];

  return (
    <div className={cn("space-y-2", className)}>
      {orderedCategories.map((categoryName) => (
        <ShortcutCategory
          key={categoryName}
          name={categoryName}
          shortcuts={categories[categoryName]}
          collapsible={collapsible}
          compact={compact}
          allowCustomize={allowCustomize}
          onEditShortcut={onEditShortcut}
          onResetShortcut={onResetShortcut}
          onToggleShortcut={onToggleShortcut}
        />
      ))}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export default ShortcutCategory;
