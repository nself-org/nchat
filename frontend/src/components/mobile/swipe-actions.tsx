"use client";

import {
  memo,
  useRef,
  useCallback,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { motion, useAnimation, PanInfo } from "framer-motion";
import {
  Reply,
  Smile,
  Trash2,
  Pin,
  Forward,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================================================
// Types
// ============================================================================

export interface SwipeAction {
  id: string;
  icon: ReactNode;
  label: string;
  color: string;
  backgroundColor: string;
  onClick: () => void;
}

export interface SwipeActionsProps {
  children: ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  threshold?: number;
  actionWidth?: number;
  disabled?: boolean;
  onSwipeStart?: () => void;
  onSwipeEnd?: () => void;
  className?: string;
}

// ============================================================================
// Constants
// ============================================================================

const DEFAULT_THRESHOLD = 60;
const DEFAULT_ACTION_WIDTH = 72;
const MAX_OVERSWIPE = 20;

// ============================================================================
// Default Actions
// ============================================================================

export const createReplyAction = (onClick: () => void): SwipeAction => ({
  id: "reply",
  icon: <Reply className="h-5 w-5" />,
  label: "Reply",
  color: "#FFFFFF",
  backgroundColor: "#3B82F6",
  onClick,
});

export const createReactAction = (onClick: () => void): SwipeAction => ({
  id: "react",
  icon: <Smile className="h-5 w-5" />,
  label: "React",
  color: "#FFFFFF",
  backgroundColor: "#F59E0B",
  onClick,
});

export const createDeleteAction = (onClick: () => void): SwipeAction => ({
  id: "delete",
  icon: <Trash2 className="h-5 w-5" />,
  label: "Delete",
  color: "#FFFFFF",
  backgroundColor: "#EF4444",
  onClick,
});

export const createPinAction = (onClick: () => void): SwipeAction => ({
  id: "pin",
  icon: <Pin className="h-5 w-5" />,
  label: "Pin",
  color: "#FFFFFF",
  backgroundColor: "#8B5CF6",
  onClick,
});

export const createForwardAction = (onClick: () => void): SwipeAction => ({
  id: "forward",
  icon: <Forward className="h-5 w-5" />,
  label: "Forward",
  color: "#FFFFFF",
  backgroundColor: "#10B981",
  onClick,
});

export const createMoreAction = (onClick: () => void): SwipeAction => ({
  id: "more",
  icon: <MoreHorizontal className="h-5 w-5" />,
  label: "More",
  color: "#FFFFFF",
  backgroundColor: "#6B7280",
  onClick,
});

// ============================================================================
// Component
// ============================================================================

/**
 * Swipe actions container for list items
 * Supports left and right swipe gestures to reveal actions
 */
export const SwipeActions = memo(function SwipeActions({
  children,
  leftActions = [],
  rightActions = [],
  threshold = DEFAULT_THRESHOLD,
  actionWidth = DEFAULT_ACTION_WIDTH,
  disabled = false,
  onSwipeStart,
  onSwipeEnd,
  className,
}: SwipeActionsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controls = useAnimation();
  const [isRevealed, setIsRevealed] = useState<"left" | "right" | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const leftActionsWidth = leftActions.length * actionWidth;
  const rightActionsWidth = rightActions.length * actionWidth;

  // Reset position
  const resetPosition = useCallback(() => {
    controls.start({ x: 0 });
    setIsRevealed(null);
  }, [controls]);

  // Handle drag
  const handleDrag = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled) return;

      const { offset } = info;

      // Limit drag based on available actions
      let constrainedX = offset.x;

      if (offset.x > 0 && leftActions.length > 0) {
        // Swiping right to reveal left actions
        constrainedX = Math.min(offset.x, leftActionsWidth + MAX_OVERSWIPE);
      } else if (offset.x < 0 && rightActions.length > 0) {
        // Swiping left to reveal right actions
        constrainedX = Math.max(offset.x, -rightActionsWidth - MAX_OVERSWIPE);
      } else {
        constrainedX = 0;
      }

      controls.set({ x: constrainedX });
    },
    [
      disabled,
      leftActions.length,
      rightActions.length,
      leftActionsWidth,
      rightActionsWidth,
      controls,
    ],
  );

  // Handle drag start
  const handleDragStart = useCallback(() => {
    if (disabled) return;
    setIsDragging(true);
    onSwipeStart?.();
  }, [disabled, onSwipeStart]);

  // Handle drag end
  const handleDragEnd = useCallback(
    (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (disabled) return;

      setIsDragging(false);
      onSwipeEnd?.();

      const { offset, velocity } = info;
      const shouldSnap =
        Math.abs(velocity.x) > 500 || Math.abs(offset.x) > threshold;

      if (offset.x > 0 && leftActions.length > 0 && shouldSnap) {
        // Reveal left actions
        controls.start({ x: leftActionsWidth });
        setIsRevealed("left");

        // Auto-trigger if overswipe
        if (offset.x > leftActionsWidth + 10) {
          leftActions[leftActions.length - 1]?.onClick();
          setTimeout(resetPosition, 300);
        }
      } else if (offset.x < 0 && rightActions.length > 0 && shouldSnap) {
        // Reveal right actions
        controls.start({ x: -rightActionsWidth });
        setIsRevealed("right");

        // Auto-trigger if overswipe
        if (offset.x < -rightActionsWidth - 10) {
          rightActions[rightActions.length - 1]?.onClick();
          setTimeout(resetPosition, 300);
        }
      } else {
        // Reset
        resetPosition();
      }
    },
    [
      disabled,
      threshold,
      leftActions,
      rightActions,
      leftActionsWidth,
      rightActionsWidth,
      controls,
      resetPosition,
      onSwipeEnd,
    ],
  );

  // Handle action click
  const handleActionClick = useCallback(
    (action: SwipeAction) => {
      action.onClick();
      resetPosition();
    },
    [resetPosition],
  );

  // Reset on click outside
  useEffect(() => {
    if (!isRevealed) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        resetPosition();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isRevealed, resetPosition]);

  return (
    <div
      ref={containerRef}
      className={cn("relative overflow-hidden", className)}
    >
      {/* Left actions (revealed by swiping right) */}
      {leftActions.length > 0 && (
        <div
          className="absolute bottom-0 left-0 top-0 flex"
          style={{ width: leftActionsWidth }}
        >
          {leftActions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              width={actionWidth}
              onClick={() => handleActionClick(action)}
              isRevealed={isRevealed === "left"}
            />
          ))}
        </div>
      )}

      {/* Right actions (revealed by swiping left) */}
      {rightActions.length > 0 && (
        <div
          className="absolute bottom-0 right-0 top-0 flex"
          style={{ width: rightActionsWidth }}
        >
          {rightActions.map((action) => (
            <ActionButton
              key={action.id}
              action={action}
              width={actionWidth}
              onClick={() => handleActionClick(action)}
              isRevealed={isRevealed === "right"}
            />
          ))}
        </div>
      )}

      {/* Draggable content */}
      <motion.div
        animate={controls}
        drag={disabled ? false : "x"}
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className={cn(
          "relative bg-background",
          isDragging && "cursor-grabbing",
        )}
      >
        {children}
      </motion.div>
    </div>
  );
});

// ============================================================================
// Sub-components
// ============================================================================

interface ActionButtonProps {
  action: SwipeAction;
  width: number;
  isRevealed: boolean;
  onClick: () => void;
}

const ActionButton = memo(function ActionButton({
  action,
  width,
  isRevealed,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center",
        "transition-transform duration-200",
        "touch-manipulation",
      )}
      style={{
        width,
        backgroundColor: action.backgroundColor,
        color: action.color,
        transform: isRevealed ? "scale(1)" : "scale(0.9)",
      }}
    >
      {action.icon}
      <span className="mt-1 text-[10px] font-medium">{action.label}</span>
    </button>
  );
});

// ============================================================================
// Message-specific Swipe Actions
// ============================================================================

export interface MessageSwipeActionsProps {
  children: ReactNode;
  isOwn?: boolean;
  onReply?: () => void;
  onReact?: () => void;
  onDelete?: () => void;
  onMore?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * Pre-configured swipe actions for messages
 */
export const MessageSwipeActions = memo(function MessageSwipeActions({
  children,
  isOwn = false,
  onReply,
  onReact,
  onDelete,
  onMore,
  disabled = false,
  className,
}: MessageSwipeActionsProps) {
  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];

  // Reply is always available
  if (onReply) {
    leftActions.push(createReplyAction(onReply));
  }

  // React is always available
  if (onReact) {
    rightActions.push(createReactAction(onReact));
  }

  // Delete only for own messages
  if (isOwn && onDelete) {
    rightActions.push(createDeleteAction(onDelete));
  }

  // More options
  if (onMore) {
    rightActions.push(createMoreAction(onMore));
  }

  return (
    <SwipeActions
      leftActions={leftActions}
      rightActions={rightActions}
      disabled={disabled}
      className={className}
    >
      {children}
    </SwipeActions>
  );
});

// ============================================================================
// Channel/Conversation Swipe Actions
// ============================================================================

export interface ChannelSwipeActionsProps {
  children: ReactNode;
  onPin?: () => void;
  onMute?: () => void;
  onDelete?: () => void;
  onMore?: () => void;
  isPinned?: boolean;
  isMuted?: boolean;
  disabled?: boolean;
  className?: string;
}

/**
 * Pre-configured swipe actions for channel/conversation list items
 */
export const ChannelSwipeActions = memo(function ChannelSwipeActions({
  children,
  onPin,
  onMute,
  onDelete,
  onMore,
  isPinned = false,
  isMuted = false,
  disabled = false,
  className,
}: ChannelSwipeActionsProps) {
  const leftActions: SwipeAction[] = [];
  const rightActions: SwipeAction[] = [];

  // Pin action
  if (onPin) {
    leftActions.push({
      ...createPinAction(onPin),
      label: isPinned ? "Unpin" : "Pin",
      backgroundColor: isPinned ? "#6B7280" : "#8B5CF6",
    });
  }

  // Mute action
  if (onMute) {
    rightActions.push({
      id: "mute",
      icon: <Bell className="h-5 w-5" />,
      label: isMuted ? "Unmute" : "Mute",
      color: "#FFFFFF",
      backgroundColor: isMuted ? "#10B981" : "#F59E0B",
      onClick: onMute,
    });
  }

  // Delete action
  if (onDelete) {
    rightActions.push(createDeleteAction(onDelete));
  }

  // More options
  if (onMore) {
    rightActions.push(createMoreAction(onMore));
  }

  return (
    <SwipeActions
      leftActions={leftActions}
      rightActions={rightActions}
      disabled={disabled}
      className={className}
    >
      {children}
    </SwipeActions>
  );
});

// Import Bell icon that was missed
import { Bell } from "lucide-react";

export default SwipeActions;
