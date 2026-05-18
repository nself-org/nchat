"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface MenuSubmenuProps {
  children: React.ReactNode;
}

export interface MenuSubmenuTriggerProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.SubTrigger
> {
  /**
   * Icon to display before the label
   */
  icon?: LucideIcon;

  /**
   * Whether to add left padding (for alignment)
   */
  inset?: boolean;
}

export interface MenuSubmenuContentProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.SubContent
> {}

// ============================================================================
// Components
// ============================================================================

const MenuSubmenu = ContextMenuPrimitive.Sub;

const MenuSubmenuTrigger = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubTrigger>,
  MenuSubmenuTriggerProps
>(({ className, icon: Icon, inset, children, ...props }, ref) => (
  <ContextMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors",
      "focus:text-accent-foreground focus:bg-accent",
      "data-[state=open]:text-accent-foreground data-[state=open]:bg-accent",
      inset && "pl-8",
      className,
    )}
    {...props}
  >
    {Icon && <Icon className="h-4 w-4 shrink-0" />}
    <span className="flex-1">{children}</span>
    <ChevronRight className="ml-auto h-4 w-4" />
  </ContextMenuPrimitive.SubTrigger>
));

MenuSubmenuTrigger.displayName = "MenuSubmenuTrigger";

const MenuSubmenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.SubContent>,
  MenuSubmenuContentProps
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className,
    )}
    {...props}
  />
));

MenuSubmenuContent.displayName = "MenuSubmenuContent";

// ============================================================================
// Radio Group
// ============================================================================

const MenuRadioGroup = ContextMenuPrimitive.RadioGroup;

// ============================================================================
// Exports
// ============================================================================

export { MenuSubmenu, MenuSubmenuTrigger, MenuSubmenuContent, MenuRadioGroup };
