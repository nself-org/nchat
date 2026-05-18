"use client";

import {
  useState,
  useRef,
  useCallback,
  useEffect,
  ReactNode,
  memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

// ============================================================================
// Types
// ============================================================================

export interface MenuItem {
  id: string;
  label: string;
  icon?: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface LongPressMenuProps {
  children: ReactNode;
  items: MenuItem[];
  duration?: number;
  disabled?: boolean;
  hapticFeedback?: boolean;
  className?: string;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
}

interface Position {
  x: number;
  y: number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_DURATION = 500; // 500ms long press
const MENU_WIDTH = 240;
const MENU_ITEM_HEIGHT = 48;
const MENU_PADDING = 8;

// ============================================================================
// Component
// ============================================================================

/**
 * Long-press context menu for mobile
 *
 * Features:
 * - Customizable long-press duration
 * - Haptic feedback support
 * - Smart positioning (avoids screen edges)
 * - Touch-friendly menu items (48dp min)
 * - Backdrop dismiss
 * - Keyboard accessible
 *
 * @example
 * ```tsx
 * <LongPressMenu
 *   items={[
 *     { id: 'reply', label: 'Reply', icon: <Reply />, onClick: handleReply },
 *     { id: 'delete', label: 'Delete', destructive: true, onClick: handleDelete },
 *   ]}
 * >
 *   <MessageItem message={message} />
 * </LongPressMenu>
 * ```
 */
export const LongPressMenu = memo(function LongPressMenu({
  children,
  items,
  duration = DEFAULT_DURATION,
  disabled = false,
  hapticFeedback = true,
  className,
  onLongPressStart,
  onLongPressEnd,
}: LongPressMenuProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState<Position>({ x: 0, y: 0 });
  const [touchStartPos, setTouchStartPos] = useState<Position | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Trigger haptic feedback
  const triggerHaptic = useCallback(() => {
    if (!hapticFeedback) return;

    // Use Haptic Feedback API if available (iOS Safari, Chrome Android)
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }

    // iOS Haptic Feedback API
    if ("HapticFeedback" in window) {
      const haptic = (window as any).HapticFeedback;
      if (haptic && typeof haptic.impact === "function") {
        haptic.impact({ style: "medium" });
      }
    }
  }, [hapticFeedback]);

  // Calculate menu position (avoid screen edges)
  const calculateMenuPosition = useCallback(
    (x: number, y: number): Position => {
      const menuHeight = items.length * MENU_ITEM_HEIGHT + MENU_PADDING * 2;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let posX = x;
      let posY = y;

      // Adjust X to keep menu on screen
      if (posX + MENU_WIDTH > viewportWidth - 16) {
        posX = viewportWidth - MENU_WIDTH - 16;
      }
      if (posX < 16) {
        posX = 16;
      }

      // Adjust Y to keep menu on screen
      if (posY + menuHeight > viewportHeight - 16) {
        posY = viewportHeight - menuHeight - 16;
      }
      if (posY < 16) {
        posY = 16;
      }

      return { x: posX, y: posY };
    },
    [items.length],
  );

  // Handle touch start
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (disabled || items.length === 0) return;

      const touch = e.touches[0];
      const pos = { x: touch.clientX, y: touch.clientY };
      setTouchStartPos(pos);

      // Start long press timer
      timerRef.current = setTimeout(() => {
        triggerHaptic();
        const menuPos = calculateMenuPosition(pos.x, pos.y);
        setMenuPosition(menuPos);
        setIsMenuOpen(true);
        onLongPressStart?.();
      }, duration);
    },
    [
      disabled,
      items.length,
      duration,
      triggerHaptic,
      calculateMenuPosition,
      onLongPressStart,
    ],
  );

  // Handle touch move (cancel if moved too much)
  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartPos) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);

      // Cancel if moved more than 10px
      if (deltaX > 10 || deltaY > 10) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        setTouchStartPos(null);
      }
    },
    [touchStartPos],
  );

  // Handle touch end
  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setTouchStartPos(null);
    onLongPressEnd?.();
  }, [onLongPressEnd]);

  // Handle menu item click
  const handleMenuItemClick = useCallback(
    (item: MenuItem) => {
      if (item.disabled) return;

      item.onClick();
      setIsMenuOpen(false);
      triggerHaptic();
    },
    [triggerHaptic],
  );

  // Close menu
  const closeMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  // Keyboard support
  useEffect(() => {
    if (!isMenuOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        closeMenu();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMenuOpen, closeMenu]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn("touch-manipulation select-none", className)}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onContextMenu={(e) => {
          // Prevent default context menu on long press
          if (touchStartPos) {
            e.preventDefault();
          }
        }}
      >
        {children}
      </div>

      {/* Portal menu */}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {isMenuOpen && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={closeMenu}
                  className="fixed inset-0 z-50 bg-black/20 backdrop-blur-sm"
                  style={{ touchAction: "none" }}
                />

                {/* Menu */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.9, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -10 }}
                  transition={{ duration: 0.15, ease: "easeOut" }}
                  className="fixed z-50 rounded-lg border bg-popover shadow-lg"
                  style={{
                    left: menuPosition.x,
                    top: menuPosition.y,
                    width: MENU_WIDTH,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="py-2">
                    {items.map((item, index) => (
                      <LongPressMenuItem
                        key={item.id}
                        item={item}
                        onClick={() => handleMenuItemClick(item)}
                        isLast={index === items.length - 1}
                      />
                    ))}
                  </div>
                </motion.div>
              </>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
});

// ============================================================================
// Sub-components
// ============================================================================

interface LongPressMenuItemProps {
  item: MenuItem;
  onClick: () => void;
  isLast: boolean;
}

const LongPressMenuItem = memo(function LongPressMenuItem({
  item,
  onClick,
  isLast,
}: LongPressMenuItemProps) {
  return (
    <button
      onClick={onClick}
      disabled={item.disabled}
      className={cn(
        "flex w-full items-center gap-3 px-4 py-3",
        "touch-manipulation select-none",
        "text-left text-sm font-medium",
        "transition-colors",
        "focus:bg-accent focus:outline-none",
        !item.disabled && "hover:bg-accent active:bg-accent",
        item.disabled && "cursor-not-allowed opacity-50",
        item.destructive && !item.disabled && "text-destructive",
        !isLast && "border-b border-border",
      )}
      style={{
        minHeight: MENU_ITEM_HEIGHT,
        WebkitTapHighlightColor: "transparent",
      }}
    >
      {item.icon && (
        <span className="flex h-5 w-5 shrink-0 items-center justify-center">
          {item.icon}
        </span>
      )}
      <span className="flex-1">{item.label}</span>
    </button>
  );
});

// ============================================================================
// Hook Version
// ============================================================================

export interface UseLongPressOptions {
  duration?: number;
  hapticFeedback?: boolean;
  onLongPressStart?: () => void;
  onLongPressEnd?: () => void;
}

export interface UseLongPressReturn {
  handlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: () => void;
    onContextMenu: (e: React.MouseEvent) => void;
  };
}

/**
 * Hook for handling long-press gestures
 *
 * @example
 * ```tsx
 * const { handlers } = useLongPress({
 *   onLongPressStart: () => setShowMenu(true),
 *   duration: 500,
 * })
 *
 * <div {...handlers}>Long press me</div>
 * ```
 */
export function useLongPress(
  callback: (position: Position) => void,
  options: UseLongPressOptions = {},
): UseLongPressReturn {
  const {
    duration = DEFAULT_DURATION,
    hapticFeedback = true,
    onLongPressStart,
    onLongPressEnd,
  } = options;

  const [touchStartPos, setTouchStartPos] = useState<Position | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerHaptic = useCallback(() => {
    if (!hapticFeedback) return;
    if ("vibrate" in navigator) {
      navigator.vibrate(10);
    }
  }, [hapticFeedback]);

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      const touch = e.touches[0];
      const pos = { x: touch.clientX, y: touch.clientY };
      setTouchStartPos(pos);

      timerRef.current = setTimeout(() => {
        triggerHaptic();
        callback(pos);
        onLongPressStart?.();
      }, duration);
    },
    [duration, triggerHaptic, callback, onLongPressStart],
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartPos) return;

      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchStartPos.x);
      const deltaY = Math.abs(touch.clientY - touchStartPos.y);

      if (deltaX > 10 || deltaY > 10) {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
        }
        setTouchStartPos(null);
      }
    },
    [touchStartPos],
  );

  const handleTouchEnd = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    setTouchStartPos(null);
    onLongPressEnd?.();
  }, [onLongPressEnd]);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      if (touchStartPos) {
        e.preventDefault();
      }
    },
    [touchStartPos],
  );

  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  return {
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd,
      onContextMenu: handleContextMenu,
    },
  };
}

export default LongPressMenu;
