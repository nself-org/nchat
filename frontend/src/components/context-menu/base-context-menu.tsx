"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";
import { useContextMenuStore } from "@/lib/context-menu/context-menu-store";

// ============================================================================
// Types
// ============================================================================

export interface BaseContextMenuProps {
  /**
   * The content to render inside the menu
   */
  children: React.ReactNode;

  /**
   * The trigger element that will open the context menu on right-click
   */
  trigger: React.ReactNode;

  /**
   * Additional className for the menu content
   */
  className?: string;

  /**
   * Called when the menu opens
   */
  onOpenChange?: (open: boolean) => void;

  /**
   * Whether the menu is disabled
   */
  disabled?: boolean;

  /**
   * Custom modal behavior
   */
  modal?: boolean;
}

export interface ContextMenuContentProps extends React.ComponentPropsWithoutRef<
  typeof ContextMenuPrimitive.Content
> {
  /**
   * The width of the menu
   */
  minWidth?: number;
}

// ============================================================================
// Root Component
// ============================================================================

function BaseContextMenu({
  children,
  trigger,
  className,
  onOpenChange,
  disabled = false,
  modal = true,
}: BaseContextMenuProps) {
  const handleOpenChange = React.useCallback(
    (open: boolean) => {
      onOpenChange?.(open);
    },
    [onOpenChange],
  );

  return (
    <ContextMenuPrimitive.Root onOpenChange={handleOpenChange} modal={modal}>
      <ContextMenuPrimitive.Trigger disabled={disabled} asChild>
        {trigger}
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          className={cn(
            "z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
            "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
            "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            className,
          )}
        >
          {children}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}

// ============================================================================
// Standalone Content Component (for programmatic menus)
// ============================================================================

const ContextMenuContent = React.forwardRef<
  React.ElementRef<typeof ContextMenuPrimitive.Content>,
  ContextMenuContentProps
>(({ className, minWidth = 192, ...props }, ref) => (
  <ContextMenuPrimitive.Content
    ref={ref}
    style={{ minWidth }}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
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

ContextMenuContent.displayName = "ContextMenuContent";

// ============================================================================
// Positioned Menu (for store-driven menus)
// ============================================================================

interface PositionedContextMenuProps {
  /**
   * The content to render inside the menu
   */
  children: React.ReactNode;

  /**
   * Additional className for the menu content
   */
  className?: string;

  /**
   * Called when the menu closes
   */
  onClose?: () => void;
}

function PositionedContextMenu({
  children,
  className,
  onClose,
}: PositionedContextMenuProps) {
  const { isOpen, position, closeMenu } = useContextMenuStore();
  const menuRef = React.useRef<HTMLDivElement>(null);

  // Handle click outside
  React.useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        closeMenu();
        onClose?.();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
        onClose?.();
      }
    };

    // Delay adding the listener to prevent immediate close
    const timeoutId = setTimeout(() => {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscape);
    }, 0);

    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen, closeMenu, onClose]);

  if (!isOpen || !position) return null;

  return (
    <div
      ref={menuRef}
      role="menu"
      tabIndex={-1}
      className={cn(
        "fixed z-50 min-w-[12rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md",
        "animate-in fade-in-0 zoom-in-95",
        className,
      )}
      style={{
        left: position.x,
        top: position.y,
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>
  );
}

// ============================================================================
// Menu Group
// ============================================================================

const ContextMenuGroup = ContextMenuPrimitive.Group;

// ============================================================================
// Exports
// ============================================================================

export {
  BaseContextMenu,
  ContextMenuContent,
  PositionedContextMenu,
  ContextMenuGroup,
};

// Re-export primitives for advanced usage
export {
  Root as ContextMenuRoot,
  Trigger as ContextMenuTrigger,
  Portal as ContextMenuPortal,
} from "@radix-ui/react-context-menu";
