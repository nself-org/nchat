"use client";

import { memo, useCallback, useEffect, useRef, ReactNode } from "react";
import { motion, AnimatePresence, PanInfo, useAnimation } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useMobileStore, type DrawerPosition } from "@/lib/mobile/mobile-store";
import { useSafeArea } from "@/lib/mobile/use-viewport";

// ============================================================================
// Types
// ============================================================================

export interface MobileDrawerProps {
  isOpen?: boolean;
  position?: DrawerPosition;
  title?: string;
  showHandle?: boolean;
  showClose?: boolean;
  children?: ReactNode;
  onClose?: () => void;
  className?: string;
  contentClassName?: string;
}

// ============================================================================
// Constants
// ============================================================================

const SWIPE_THRESHOLD = 100;

const POSITION_CONFIG = {
  left: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
    dragDirection: "x" as const,
    size: { width: 280, height: "100%" },
    classes: "left-0 top-0 bottom-0",
  },
  right: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    dragDirection: "x" as const,
    size: { width: 280, height: "100%" },
    classes: "right-0 top-0 bottom-0",
  },
  bottom: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
    dragDirection: "y" as const,
    size: { width: "100%", maxHeight: "85vh" },
    classes: "left-0 right-0 bottom-0 rounded-t-2xl",
  },
};

// ============================================================================
// Component
// ============================================================================

/**
 * Configurable mobile drawer that can slide from left, right, or bottom
 * Supports touch gestures for dismissal
 */
export const MobileDrawer = memo(function MobileDrawer({
  isOpen: isOpenProp,
  position: positionProp = "bottom",
  title,
  showHandle = true,
  showClose = true,
  children,
  onClose: onCloseProp,
  className,
  contentClassName,
}: MobileDrawerProps) {
  const { drawer, closeDrawer } = useMobileStore();
  const safeArea = useSafeArea();
  const controls = useAnimation();
  const drawerRef = useRef<HTMLDivElement>(null);

  // Use props or store state
  const isOpen = isOpenProp !== undefined ? isOpenProp : drawer.isOpen;
  const position = positionProp || drawer.position;
  const onClose = onCloseProp || closeDrawer;

  const config = POSITION_CONFIG[position];

  // Handle drag
  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { dragDirection } = config;
      const offset = dragDirection === "x" ? info.offset.x : info.offset.y;

      // Only allow dragging in the close direction
      if (position === "left" && offset < 0) {
        controls.set({ x: offset });
      } else if (position === "right" && offset > 0) {
        controls.set({ x: offset });
      } else if (position === "bottom" && offset > 0) {
        controls.set({ y: offset });
      }
    },
    [config, position, controls],
  );

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { dragDirection } = config;
      const offset = dragDirection === "x" ? info.offset.x : info.offset.y;
      const velocity =
        dragDirection === "x" ? info.velocity.x : info.velocity.y;

      const shouldClose =
        (position === "left" &&
          (offset < -SWIPE_THRESHOLD || velocity < -500)) ||
        (position === "right" &&
          (offset > SWIPE_THRESHOLD || velocity > 500)) ||
        (position === "bottom" && (offset > SWIPE_THRESHOLD || velocity > 500));

      if (shouldClose) {
        onClose();
      } else {
        controls.start(config.animate);
      }
    },
    [config, position, controls, onClose],
  );

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

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

  // Calculate safe area padding
  const safePadding = {
    paddingTop: position === "bottom" ? 0 : safeArea.top,
    paddingBottom: position === "bottom" ? safeArea.bottom : 0,
    paddingLeft: position === "right" ? 0 : safeArea.left,
    paddingRight: position === "left" ? 0 : safeArea.right,
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            ref={drawerRef}
            initial={config.initial}
            animate={config.animate}
            exit={config.exit}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            drag={config.dragDirection}
            dragConstraints={{ top: 0, bottom: 0, left: 0, right: 0 }}
            dragElastic={0.1}
            onDrag={handleDrag}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed z-50",
              "bg-background shadow-2xl",
              config.classes,
              className,
            )}
            style={{
              ...config.size,
              ...safePadding,
            }}
          >
            {/* Drag handle (for bottom drawer) */}
            {showHandle && position === "bottom" && (
              <div className="flex justify-center py-3">
                <div className="bg-muted-foreground/30 h-1 w-10 rounded-full" />
              </div>
            )}

            {/* Header */}
            {(title || showClose) && (
              <div
                className={cn(
                  "flex items-center justify-between border-b px-4",
                  position === "bottom" ? "pb-3" : "h-14",
                )}
              >
                {title && <h2 className="text-lg font-semibold">{title}</h2>}
                {showClose && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={onClose}
                    className="h-8 w-8 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            )}

            {/* Content */}
            <div className={cn("flex-1 overflow-y-auto", contentClassName)}>
              {children || drawer.content}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

// ============================================================================
// Specialized Drawer Components
// ============================================================================

export interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  height?: "auto" | "half" | "full";
  className?: string;
}

/**
 * Bottom sheet variant with preset heights
 */
export const BottomSheet = memo(function BottomSheet({
  isOpen,
  onClose,
  title,
  children,
  height = "auto",
  className,
}: BottomSheetProps) {
  const heightClass = {
    auto: "max-h-[85vh]",
    half: "h-[50vh]",
    full: "h-[90vh]",
  }[height];

  return (
    <MobileDrawer
      isOpen={isOpen}
      onClose={onClose}
      position="bottom"
      title={title}
      className={cn(heightClass, className)}
    >
      {children}
    </MobileDrawer>
  );
});

export interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  side: "left" | "right";
  title?: string;
  children: ReactNode;
  width?: number;
  className?: string;
}

/**
 * Side drawer variant
 */
export const SideDrawer = memo(function SideDrawer({
  isOpen,
  onClose,
  side,
  title,
  children,
  width = 280,
  className,
}: SideDrawerProps) {
  return (
    <MobileDrawer
      isOpen={isOpen}
      onClose={onClose}
      position={side}
      title={title}
      className={className}
      contentClassName="overflow-y-auto"
    >
      {children}
    </MobileDrawer>
  );
});

// ============================================================================
// Drawer with Snap Points
// ============================================================================

export interface SnapDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  snapPoints?: number[]; // Heights in vh
  defaultSnapPoint?: number;
  title?: string;
  children: ReactNode;
  className?: string;
}

/**
 * Drawer with snap points (like Apple Maps)
 */
export const SnapDrawer = memo(function SnapDrawer({
  isOpen,
  onClose,
  snapPoints = [25, 50, 85],
  defaultSnapPoint = 1,
  title,
  children,
  className,
}: SnapDrawerProps) {
  const safeArea = useSafeArea();
  const controls = useAnimation();
  const currentSnapRef = useRef(defaultSnapPoint);

  const getCurrentHeight = () => `${snapPoints[currentSnapRef.current]}vh`;

  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const { offset, velocity } = info;

      // Determine direction
      const goingUp = velocity.y < -100 || (velocity.y < 0 && offset.y < -50);
      const goingDown = velocity.y > 100 || (velocity.y > 0 && offset.y > 50);

      let newSnap = currentSnapRef.current;

      if (goingUp && currentSnapRef.current < snapPoints.length - 1) {
        newSnap = currentSnapRef.current + 1;
      } else if (goingDown) {
        if (currentSnapRef.current > 0) {
          newSnap = currentSnapRef.current - 1;
        } else {
          // Close if at lowest snap point and swiping down
          onClose();
          return;
        }
      }

      currentSnapRef.current = newSnap;
      controls.start({ height: `${snapPoints[newSnap]}vh` });
    },
    [snapPoints, controls, onClose],
  );

  useEffect(() => {
    if (isOpen) {
      currentSnapRef.current = defaultSnapPoint;
      controls.start({ height: getCurrentHeight() });
    }
  }, [isOpen, defaultSnapPoint, controls]);

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
            dragElastic={0.1}
            onDragEnd={handleDragEnd}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-50",
              "rounded-t-2xl bg-background shadow-2xl",
              className,
            )}
            style={{
              height: getCurrentHeight(),
              paddingBottom: safeArea.bottom,
            }}
          >
            <div className="flex justify-center py-3">
              <div className="bg-muted-foreground/30 h-1 w-10 rounded-full" />
            </div>

            {title && (
              <div className="border-b px-4 pb-3">
                <h2 className="text-lg font-semibold">{title}</h2>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
});

export default MobileDrawer;
