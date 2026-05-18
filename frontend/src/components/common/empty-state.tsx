"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Hash,
  Search,
  Users,
  FileX,
  Inbox,
  Bell,
  Star,
  FolderOpen,
  type LucideIcon,
} from "lucide-react";

// ============================================================================
// Variants
// ============================================================================

const emptyStateVariants = cva(
  "flex flex-col items-center justify-center text-center",
  {
    variants: {
      size: {
        sm: "py-8 px-4",
        md: "py-12 px-6",
        lg: "py-16 px-8",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const iconContainerVariants = cva(
  "flex items-center justify-center rounded-full bg-muted mb-4",
  {
    variants: {
      size: {
        sm: "h-12 w-12",
        md: "h-16 w-16",
        lg: "h-20 w-20",
      },
    },
    defaultVariants: {
      size: "md",
    },
  },
);

const iconVariants = cva("text-muted-foreground", {
  variants: {
    size: {
      sm: "h-6 w-6",
      md: "h-8 w-8",
      lg: "h-10 w-10",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

// ============================================================================
// Types
// ============================================================================

export type EmptyStateType =
  | "no-messages"
  | "no-channels"
  | "no-results"
  | "no-members"
  | "no-files"
  | "no-notifications"
  | "no-starred"
  | "no-folder"
  | "custom";

export interface EmptyStateProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof emptyStateVariants> {
  type?: EmptyStateType;
  icon?: LucideIcon;
  title?: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline" | "secondary";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

// ============================================================================
// Preset Configurations
// ============================================================================

const PRESETS: Record<
  Exclude<EmptyStateType, "custom">,
  {
    icon: LucideIcon;
    title: string;
    description: string;
  }
> = {
  "no-messages": {
    icon: MessageSquare,
    title: "No messages yet",
    description: "Start the conversation by sending a message",
  },
  "no-channels": {
    icon: Hash,
    title: "No channels",
    description: "Create a channel to start collaborating with your team",
  },
  "no-results": {
    icon: Search,
    title: "No results found",
    description:
      "Try adjusting your search or filters to find what you're looking for",
  },
  "no-members": {
    icon: Users,
    title: "No members",
    description: "Invite people to join and start collaborating",
  },
  "no-files": {
    icon: FileX,
    title: "No files",
    description: "Files shared in this conversation will appear here",
  },
  "no-notifications": {
    icon: Bell,
    title: "All caught up",
    description: "You have no new notifications",
  },
  "no-starred": {
    icon: Star,
    title: "No starred items",
    description: "Star important messages and channels to find them here",
  },
  "no-folder": {
    icon: FolderOpen,
    title: "This folder is empty",
    description: "Add files or subfolders to organize your content",
  },
};

// ============================================================================
// Component
// ============================================================================

export function EmptyState({
  type = "custom",
  icon: CustomIcon,
  title: customTitle,
  description: customDescription,
  action,
  secondaryAction,
  size,
  className,
  ...props
}: EmptyStateProps) {
  const preset = type !== "custom" ? PRESETS[type] : null;
  const Icon = CustomIcon || preset?.icon || Inbox;
  const title = customTitle || preset?.title || "Nothing here";
  const description =
    customDescription || preset?.description || "There's nothing to display";

  return (
    <div
      className={cn(emptyStateVariants({ size }), className)}
      data-testid="empty-state"
      role="status"
      aria-label={title}
      {...props}
    >
      <div
        className={iconContainerVariants({ size })}
        data-testid="empty-state-icon"
      >
        <Icon className={iconVariants({ size })} />
      </div>

      <h3
        className={cn(
          "font-semibold text-foreground",
          size === "sm" && "text-sm",
          size === "lg" && "text-xl",
        )}
        data-testid="empty-state-title"
      >
        {title}
      </h3>

      <p
        className={cn(
          "mt-1 max-w-sm text-muted-foreground",
          size === "sm" && "text-xs",
          size === "lg" && "text-base",
        )}
        data-testid="empty-state-description"
      >
        {description}
      </p>

      {(action || secondaryAction) && (
        <div
          className="mt-6 flex flex-col items-center gap-3 sm:flex-row"
          data-testid="empty-state-actions"
        >
          {action && (
            <Button
              onClick={action.onClick}
              variant={action.variant}
              size={size === "sm" ? "sm" : "default"}
              data-testid="empty-state-action"
            >
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              variant="ghost"
              onClick={secondaryAction.onClick}
              size={size === "sm" ? "sm" : "default"}
              data-testid="empty-state-secondary-action"
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Convenience Components
// ============================================================================

export function NoMessagesState(props: Omit<EmptyStateProps, "type">) {
  return <EmptyState type="no-messages" {...props} />;
}

export function NoChannelsState(props: Omit<EmptyStateProps, "type">) {
  return <EmptyState type="no-channels" {...props} />;
}

export function NoResultsState(props: Omit<EmptyStateProps, "type">) {
  return <EmptyState type="no-results" {...props} />;
}

export function NoMembersState(props: Omit<EmptyStateProps, "type">) {
  return <EmptyState type="no-members" {...props} />;
}

export function NoFilesState(props: Omit<EmptyStateProps, "type">) {
  return <EmptyState type="no-files" {...props} />;
}

export function NoNotificationsState(props: Omit<EmptyStateProps, "type">) {
  return <EmptyState type="no-notifications" {...props} />;
}

export function NoStarredState(props: Omit<EmptyStateProps, "type">) {
  return <EmptyState type="no-starred" {...props} />;
}

export { PRESETS as EMPTY_STATE_PRESETS };
