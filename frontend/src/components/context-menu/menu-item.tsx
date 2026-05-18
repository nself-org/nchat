"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface MenuItemProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.Item
> {
  /**
   * Icon to display before the label
   */
  icon?: LucideIcon;

  /**
   * Keyboard shortcut hint to display
   */
  shortcut?: string;

  /**
   * Whether this is a destructive action (shows in red)
   */
  danger?: boolean;

  /**
   * Whether to add left padding for items without icons (for alignment)
   */
  inset?: boolean;
}

// ============================================================================
// Component
// ============================================================================

const MenuItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Item>,
  MenuItemProps
>(
  (
    {
      className,
      icon: Icon,
      shortcut,
      danger,
      inset,
      children,
      disabled,
      ...props
    },
    ref,
  ) => (
    <ContextMenuPrimitive.Item
      ref={ref}
      disabled={disabled}
      className={cn(
        "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
        "focus:text-accent-foreground focus:bg-accent",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        danger &&
          "focus:bg-destructive/10 text-destructive focus:text-destructive",
        inset && "pl-8",
        className,
      )}
      {...props}
    >
      {Icon && <Icon className="h-4 w-4 shrink-0" />}
      <span className="flex-1">{children}</span>
      {shortcut && (
        <span
          className={cn(
            "ml-auto text-xs tracking-widest",
            danger ? "text-destructive/70" : "text-muted-foreground",
          )}
        >
          {shortcut}
        </span>
      )}
    </ContextMenuPrimitive.Item>
  ),
);

MenuItem.displayName = "MenuItem";

// ============================================================================
// Checkbox Menu Item
// ============================================================================

export interface MenuCheckboxItemProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.CheckboxItem
> {
  /**
   * Icon to display when checked
   */
  icon?: LucideIcon;

  /**
   * Keyboard shortcut hint to display
   */
  shortcut?: string;
}

const MenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.CheckboxItem>,
  MenuCheckboxItemProps
>(({ className, icon: Icon, shortcut, children, checked, ...props }, ref) => (
  <ContextMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
      "focus:text-accent-foreground focus:bg-accent",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        {Icon ? (
          <Icon className="h-4 w-4" />
        ) : (
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    <span className="flex-1">{children}</span>
    {shortcut && (
      <span className="ml-auto text-xs tracking-widest text-muted-foreground">
        {shortcut}
      </span>
    )}
  </ContextMenuPrimitive.CheckboxItem>
));

MenuCheckboxItem.displayName = "MenuCheckboxItem";

// ============================================================================
// Radio Menu Item
// ============================================================================

export interface MenuRadioItemProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.RadioItem
> {
  /**
   * Keyboard shortcut hint to display
   */
  shortcut?: string;
}

const MenuRadioItem = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.RadioItem>,
  MenuRadioItemProps
>(({ className, shortcut, children, ...props }, ref) => (
  <ContextMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center gap-2 rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors",
      "focus:text-accent-foreground focus:bg-accent",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-4 w-4 items-center justify-center">
      <ContextMenuPrimitive.ItemIndicator>
        <svg className="h-2 w-2 fill-current" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="12" />
        </svg>
      </ContextMenuPrimitive.ItemIndicator>
    </span>
    <span className="flex-1">{children}</span>
    {shortcut && (
      <span className="ml-auto text-xs tracking-widest text-muted-foreground">
        {shortcut}
      </span>
    )}
  </ContextMenuPrimitive.RadioItem>
));

MenuRadioItem.displayName = "MenuRadioItem";

// ============================================================================
// Menu Label
// ============================================================================

export interface MenuLabelProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.Label
> {
  /**
   * Whether to add left padding (for alignment with items that have icons)
   */
  inset?: boolean;
}

const MenuLabel = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Label>,
  MenuLabelProps
>(({ className, inset, ...props }, ref) => (
  <ContextMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground",
      inset && "pl-8",
      className,
    )}
    {...props}
  />
));

MenuLabel.displayName = "MenuLabel";

// ============================================================================
// Exports
// ============================================================================

export { MenuItem, MenuCheckboxItem, MenuRadioItem, MenuLabel };
