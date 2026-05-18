"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface MenuSeparatorProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.Separator
> {}

// ============================================================================
// Component
// ============================================================================

const MenuSeparator = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Separator>,
  MenuSeparatorProps
>(({ className, ...props }, ref) => (
  <ContextMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-border", className)}
    {...props}
  />
));

MenuSeparator.displayName = "MenuSeparator";

// ============================================================================
// Exports
// ============================================================================

export { MenuSeparator };
