"use client";

import {
  forwardRef,
  useImperativeHandle,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
  memo,
} from "react";
import { motion, useAnimation, PanInfo, AnimatePresence } from "framer-motion";
import { X, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { createPortal } from "react-dom";

// ============================================================================
// Types
// ============================================================================

export interface BottomSheetProps {
  children: ReactNode;
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: number[]; // Array of snap points in pixels from bottom
  defaultSnapPoint?: number; // Index of default snap point
  enableDrag?: boolean;
  enableBackdrop?: boolean;
  closeOnBackdropClick?: boolean;
  showHandle?: boolean;
  showCloseButton?: boolean;
  className?: string;
  contentClassName?: string;
  preventClose?: boolean;
  onSnapPointChange?: (snapPoint: number, index: number) => void;
  hapticFeedback?: boolean;
}

export interface BottomSheetRef {
  open: () => void;
  close: () => void;
  snapTo: (index: number) => void;
  getCurrentSnapPoint: () => number;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_SNAP_POINTS = [0.9, 0.5, 0.2]; // Percentages of screen height
const VELOCITY_THRESHOLD = 500;
const CLOSE_THRESHOLD = 0.3;

// ============================================================================
// Component
// ============================================================================

/**
 * Bottom Sheet Modal Component
 *
 * A mobile-optimized modal that slides up from the bottom with snap points.
 *
 * Features:
 * - Multiple snap points (full, half, peek)
 * - Drag to dismiss
 * - Smooth animations
 * - Backdrop with click-to-close
 * - Haptic feedback
 * - Keyboard aware
 * - Safe area handling
 *
 * @example
 * ```tsx
 * const sheetRef = useRef<BottomSheetRef>(null)
 *
 * <BottomSheet
 *   ref={sheetRef}
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   snapPoints={[0.9, 0.5]}
 * >
 *   <SheetContent />
 * </BottomSheet>
 * ```
 */
export const BottomSheet = memo(
  forwardRef<BottomSheetRef, BottomSheetProps>(function BottomSheet(
    {
      children,
      isOpen,
      onClose,
      snapPoints,
      defaultSnapPoint = 0,
      enableDrag = true,
      enableBackdrop = true,
      closeOnBackdropClick = true,
      showHandle = true,
      showCloseButton = false,
      className,
      contentClassName,
      preventClose = false,
      onSnapPointChange,
      hapticFeedback = true,
    },
    ref,
  ) {
    const [currentSnapIndex, setCurrentSnapIndex] = useState(defaultSnapPoint);
    const [isDragging, setIsDragging] = useState(false);
    const [viewportHeight, setViewportHeight] = useState(0);

    const controls = useAnimation();
    const sheetRef = useRef<HTMLDivElement>(null);

    // Calculate snap points in pixels
    const snapPointsPercent = snapPoints || DEFAULT_SNAP_POINTS;
    const snapPointsPixels = snapPointsPercent.map(
      (percent) => viewportHeight * (1 - percent),
    );

    // Trigger haptic feedback
    const triggerHaptic = useCallback(() => {
      if (!hapticFeedback) return;
      if ("vibrate" in navigator) {
        navigator.vibrate(10);
      }
    }, [hapticFeedback]);

    // Snap to specific point
    const snapTo = useCallback(
      (index: number) => {
        const clampedIndex = Math.max(
          0,
          Math.min(index, snapPointsPixels.length - 1),
        );
        const snapPoint = snapPointsPixels[clampedIndex];

        controls.start({
          y: snapPoint,
          transition: {
            type: "spring",
            stiffness: 300,
            damping: 30,
          },
        });

        setCurrentSnapIndex(clampedIndex);
        onSnapPointChange?.(snapPoint, clampedIndex);
        triggerHaptic();
      },
      [snapPointsPixels, controls, onSnapPointChange, triggerHaptic],
    );

    // Open sheet
    const open = useCallback(() => {
      if (!isOpen) {
        snapTo(defaultSnapPoint);
      }
    }, [isOpen, snapTo, defaultSnapPoint]);

    // Close sheet
    const close = useCallback(() => {
      if (preventClose) return;

      controls.start({
        y: viewportHeight,
        transition: {
          type: "spring",
          stiffness: 400,
          damping: 40,
        },
      });

      setTimeout(() => {
        onClose();
      }, 300);

      triggerHaptic();
    }, [controls, viewportHeight, onClose, preventClose, triggerHaptic]);

    // Get current snap point
    const getCurrentSnapPoint = useCallback(() => {
      return currentSnapIndex;
    }, [currentSnapIndex]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      open,
      close,
      snapTo,
      getCurrentSnapPoint,
    }));

    // Handle drag
    const handleDrag = useCallback(
      (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        if (!enableDrag) return;

        const { offset } = info;
        const currentY = snapPointsPixels[currentSnapIndex];
        const newY = Math.max(0, currentY + offset.y);

        controls.set({ y: newY });
      },
      [enableDrag, snapPointsPixels, currentSnapIndex, controls],
    );

    // Handle drag start
    const handleDragStart = useCallback(() => {
      setIsDragging(true);
    }, []);

    // Handle drag end
    const handleDragEnd = useCallback(
      (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        setIsDragging(false);

        const { offset, velocity } = info;
        const currentY = snapPointsPixels[currentSnapIndex];
        const newY = currentY + offset.y;

        // Check if should close
        const closeThreshold = viewportHeight * CLOSE_THRESHOLD;
        if (
          newY > viewportHeight - closeThreshold ||
          velocity.y > VELOCITY_THRESHOLD
        ) {
          close();
          return;
        }

        // Find nearest snap point
        let nearestIndex = 0;
        let minDistance = Math.abs(newY - snapPointsPixels[0]);

        for (let i = 1; i < snapPointsPixels.length; i++) {
          const distance = Math.abs(newY - snapPointsPixels[i]);
          if (distance < minDistance) {
            minDistance = distance;
            nearestIndex = i;
          }
        }

        // Consider velocity for upward flicks
        if (velocity.y < -VELOCITY_THRESHOLD && nearestIndex > 0) {
          nearestIndex--;
        }

        snapTo(nearestIndex);
      },
      [snapPointsPixels, currentSnapIndex, viewportHeight, snapTo, close],
    );

    // Handle backdrop click
    const handleBackdropClick = useCallback(() => {
      if (closeOnBackdropClick && !preventClose) {
        close();
      }
    }, [closeOnBackdropClick, close, preventClose]);

    // Update viewport height on resize
    useEffect(() => {
      const updateHeight = () => {
        setViewportHeight(window.innerHeight);
      };

      updateHeight();
      window.addEventListener("resize", updateHeight);
      window.visualViewport?.addEventListener("resize", updateHeight);

      return () => {
        window.removeEventListener("resize", updateHeight);
        window.visualViewport?.removeEventListener("resize", updateHeight);
      };
    }, []);

    // Snap to default point when opening
    useEffect(() => {
      if (isOpen && viewportHeight > 0) {
        snapTo(defaultSnapPoint);
      }
    }, [isOpen, viewportHeight, snapTo, defaultSnapPoint]);

    // Handle Escape key
    useEffect(() => {
      if (!isOpen) return;

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === "Escape" && !preventClose) {
          close();
        }
      };

      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, close, preventClose]);

    // Prevent body scroll when open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = "hidden";
        return () => {
          document.body.style.overflow = "";
        };
      }
    }, [isOpen]);

    if (!isOpen || viewportHeight === 0) return null;

    return (
      <>
        {typeof document !== "undefined" &&
          createPortal(
            <AnimatePresence>
              {isOpen && (
                <>
                  {/* Backdrop */}
                  {enableBackdrop && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onClick={handleBackdropClick}
                      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                      style={{ touchAction: "none" }}
                    />
                  )}

                  {/* Sheet */}
                  <motion.div
                    ref={sheetRef}
                    initial={{ y: viewportHeight }}
                    animate={controls}
                    exit={{ y: viewportHeight }}
                    drag={enableDrag ? "y" : false}
                    dragConstraints={{ top: 0, bottom: viewportHeight }}
                    dragElastic={0.1}
                    onDragStart={handleDragStart}
                    onDrag={handleDrag}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "fixed bottom-0 left-0 right-0 z-50",
                      "flex max-h-[95vh] flex-col",
                      "rounded-t-3xl bg-background shadow-2xl",
                      "touch-none",
                      className,
                    )}
                    style={{
                      paddingBottom: "env(safe-area-inset-bottom)",
                    }}
                  >
                    {/* Drag handle */}
                    {showHandle && (
                      <div className="flex items-center justify-center py-3">
                        <div className="bg-muted-foreground/30 h-1.5 w-12 rounded-full" />
                      </div>
                    )}

                    {/* Close button */}
                    {showCloseButton && (
                      <button
                        onClick={close}
                        disabled={preventClose}
                        className={cn(
                          "absolute right-4 top-4 z-10",
                          "flex h-8 w-8 items-center justify-center",
                          "rounded-full bg-muted",
                          "hover:bg-muted/80 transition-colors",
                          "touch-manipulation",
                          preventClose && "cursor-not-allowed opacity-50",
                        )}
                        aria-label="Close"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}

                    {/* Content */}
                    <div
                      className={cn(
                        "flex-1 overflow-y-auto overscroll-contain px-6 pb-6",
                        contentClassName,
                      )}
                      style={{
                        WebkitOverflowScrolling: "touch",
                      }}
                    >
                      {children}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>,
            document.body,
          )}
      </>
    );
  }),
);

// ============================================================================
// Pre-configured Bottom Sheets
// ============================================================================

export interface ActionBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  actions: Array<{
    id: string;
    label: string;
    icon?: ReactNode;
    variant?: "default" | "destructive" | "ghost";
    onClick: () => void;
    disabled?: boolean;
  }>;
}

/**
 * Action Bottom Sheet
 * Pre-configured for action lists
 */
export const ActionBottomSheet = memo(function ActionBottomSheet({
  isOpen,
  onClose,
  title,
  description,
  actions,
}: ActionBottomSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.5]}
      showHandle
      closeOnBackdropClick
    >
      <div className="space-y-4">
        {(title || description) && (
          <div className="space-y-2">
            {title && <h3 className="text-lg font-semibold">{title}</h3>}
            {description && (
              <p className="text-sm text-muted-foreground">{description}</p>
            )}
          </div>
        )}

        <div className="space-y-2">
          {actions.map((action) => (
            <button
              key={action.id}
              onClick={() => {
                action.onClick();
                onClose();
              }}
              disabled={action.disabled}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-4 py-3",
                "text-left text-sm font-medium",
                "transition-colors",
                "touch-manipulation",
                "min-h-[48px]",
                !action.disabled && "active:bg-accent/80 hover:bg-accent",
                action.disabled && "cursor-not-allowed opacity-50",
                action.variant === "destructive" &&
                  !action.disabled &&
                  "text-destructive",
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              {action.icon && (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center">
                  {action.icon}
                </span>
              )}
              <span className="flex-1">{action.label}</span>
            </button>
          ))}
        </div>
      </div>
    </BottomSheet>
  );
});

export default BottomSheet;
