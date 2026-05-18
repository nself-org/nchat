"use client";

import { memo, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  useMobileStore,
  type ActionSheetOption,
} from "@/lib/mobile/mobile-store";
import { useSafeArea } from "@/lib/mobile/use-viewport";

// ============================================================================
// Types
// ============================================================================

export interface MobileActionSheetProps {
  title?: string;
  message?: string;
  options?: ActionSheetOption[];
  cancelLabel?: string;
  showCancel?: boolean;
  onSelect?: (index: number) => void;
  onCancel?: () => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SWIPE_THRESHOLD = 100;

// ============================================================================
// Component
// ============================================================================

/**
 * iOS-style action sheet that slides up from the bottom
 * Supports swipe to dismiss
 */
export const MobileActionSheet = memo(function MobileActionSheet({
  title,
  message,
  options,
  cancelLabel = "Cancel",
  showCancel = true,
  onSelect,
  onCancel,
  className,
}: MobileActionSheetProps) {
  const { actionSheet, hideActionSheet } = useMobileStore();
  const safeArea = useSafeArea();
  const controls = useAnimation();
  const sheetRef = useRef<HTMLDivElement>(null);

  // Use provided options or store options
  const sheetOptions = options || actionSheet.options;
  const handleSelect = onSelect || actionSheet.onSelect;

  const isOpen =
    options !== undefined ? options.length > 0 : actionSheet.isOpen;

  // Handle selection
  const handleOptionSelect = useCallback(
    (index: number) => {
      handleSelect?.(index);
      if (!options) {
        hideActionSheet();
      }
      onCancel?.();
    },
    [handleSelect, options, hideActionSheet, onCancel],
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (!options) {
      hideActionSheet();
    }
    onCancel?.();
  }, [options, hideActionSheet, onCancel]);

  // Handle drag
  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 0) {
        controls.set({ y: info.offset.y });
      }
    },
    [controls],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > SWIPE_THRESHOLD || info.velocity.y > 500) {
        handleCancel();
      } else {
        controls.start({ y: 0 });
      }
    },
    [controls, handleCancel],
  );

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        handleCancel();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleCancel]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={handleCancel}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Action sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "rounded-t-2xl bg-background",
              "shadow-2xl",
              className,
            )}
            style={{
              paddingBottom: safeArea.bottom || 8,
            }}
          >
            {/* Drag handle */}
            <div className="flex justify-center py-3">
              <div className="bg-muted-foreground/30 h-1 w-10 rounded-full" />
            </div>

            {/* Header */}
            {(title || message) && (
              <div className="border-b px-6 pb-4 text-center">
                {title && <h3 className="text-base font-semibold">{title}</h3>}
                {message && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {message}
                  </p>
                )}
              </div>
            )}

            {/* Options */}
            <div className="px-4 py-2">
              {sheetOptions.map((option, index) => (
                <ActionSheetButton
                  key={index}
                  option={option}
                  onClick={() => handleOptionSelect(index)}
                  isFirst={index === 0}
                  isLast={index === sheetOptions.length - 1}
                />
              ))}
            </div>

            {/* Cancel button */}
            {showCancel && (
              <div className="px-4 pb-2">
                <Button
                  variant="outline"
                  onClick={handleCancel}
                  className={cn(
                    "h-12 w-full",
                    "rounded-xl",
                    "font-semibold",
                    "touch-manipulation",
                  )}
                >
                  {cancelLabel}
                </Button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

// ============================================================================
// Sub-components
// ============================================================================

interface ActionSheetButtonProps {
  option: ActionSheetOption;
  onClick: () => void;
  isFirst?: boolean;
  isLast?: boolean;
}

const ActionSheetButton = memo(function ActionSheetButton({
  option,
  onClick,
  isFirst,
  isLast,
}: ActionSheetButtonProps) {
  return (
    <button
      onClick={onClick}
      disabled={option.disabled}
      className={cn(
        "flex w-full items-center justify-center gap-3",
        "h-14 px-4",
        "bg-muted/30 hover:bg-muted/50",
        "transition-colors duration-150",
        "touch-manipulation",
        "disabled:cursor-not-allowed disabled:opacity-50",
        option.destructive && "text-destructive",
        isFirst && "rounded-t-xl",
        isLast && "rounded-b-xl",
        !isLast && "border-border/50 border-b",
      )}
    >
      {option.icon && <span className="shrink-0">{option.icon}</span>}
      <span className="font-medium">{option.label}</span>
    </button>
  );
});

// ============================================================================
// Standalone Action Sheet
// ============================================================================

export interface StandaloneActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  options: ActionSheetOption[];
  cancelLabel?: string;
  onSelect: (index: number) => void;
}

/**
 * Standalone action sheet not connected to the store
 * For use in specific components
 */
export const StandaloneActionSheet = memo(function StandaloneActionSheet({
  isOpen,
  onClose,
  title,
  message,
  options,
  cancelLabel = "Cancel",
  onSelect,
}: StandaloneActionSheetProps) {
  const safeArea = useSafeArea();
  const controls = useAnimation();

  const handleOptionSelect = useCallback(
    (index: number) => {
      onSelect(index);
      onClose();
    },
    [onSelect, onClose],
  );

  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > 0) {
        controls.set({ y: info.offset.y });
      }
    },
    [controls],
  );

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.offset.y > SWIPE_THRESHOLD || info.velocity.y > 500) {
        onClose();
      } else {
        controls.start({ y: 0 });
      }
    },
    [controls, onClose],
  );

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-background shadow-2xl"
            style={{ paddingBottom: safeArea.bottom || 8 }}
          >
            <div className="flex justify-center py-3">
              <div className="bg-muted-foreground/30 h-1 w-10 rounded-full" />
            </div>

            {(title || message) && (
              <div className="border-b px-6 pb-4 text-center">
                {title && <h3 className="text-base font-semibold">{title}</h3>}
                {message && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {message}
                  </p>
                )}
              </div>
            )}

            <div className="px-4 py-2">
              {options.map((option, index) => (
                <ActionSheetButton
                  key={index}
                  option={option}
                  onClick={() => handleOptionSelect(index)}
                  isFirst={index === 0}
                  isLast={index === options.length - 1}
                />
              ))}
            </div>

            <div className="px-4 pb-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="h-12 w-full touch-manipulation rounded-xl font-semibold"
              >
                {cancelLabel}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default MobileActionSheet;
