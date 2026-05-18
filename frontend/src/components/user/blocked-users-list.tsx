"use client";

/**
 * BlockedUsersList - Display and manage blocked users
 *
 * Shows a list of blocked users with the ability to unblock them.
 * Includes empty state when no users are blocked.
 */

import * as React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useBlock } from "@/lib/moderation/use-block";
import { cn } from "@/lib/utils";
import {
  Ban,
  Loader2,
  UserCheck,
  ShieldOff,
  RefreshCw,
  Clock,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ============================================================================
// Types
// ============================================================================

export interface BlockedUsersListProps {
  /** Maximum height for the list (scrollable) */
  maxHeight?: string | number;
  /** Show refresh button */
  showRefresh?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Additional class name */
  className?: string;
}

// ============================================================================
// Helper Components
// ============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - date.getTime());
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return "Today";
  } else if (diffDays === 1) {
    return "Yesterday";
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? "s" : ""} ago`;
  } else {
    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// ============================================================================
// Empty State Component
// ============================================================================

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
        <ShieldOff className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-2 text-lg font-semibold">No blocked users</h3>
      <p className="max-w-xs text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ============================================================================
// Blocked User Item Component
// ============================================================================

interface BlockedUserItemProps {
  user: {
    id: string;
    blockedUserId: string;
    blockedUser: {
      id: string;
      username: string;
      displayName: string;
      avatarUrl?: string;
    };
    createdAt: string;
  };
  onUnblock: (blockedUserId: string) => Promise<void>;
  isUnblocking: boolean;
}

function BlockedUserItem({
  user,
  onUnblock,
  isUnblocking,
}: BlockedUserItemProps) {
  const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);
  const [isUnblockingThis, setIsUnblockingThis] = React.useState(false);

  const handleUnblock = async () => {
    setIsUnblockingThis(true);
    try {
      await onUnblock(user.blockedUserId);
      setIsConfirmOpen(false);
    } finally {
      setIsUnblockingThis(false);
    }
  };

  return (
    <div className="hover:bg-muted/30 flex items-center justify-between gap-4 border-b p-4 transition-colors last:border-b-0">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <Avatar className="h-10 w-10 flex-shrink-0">
          <AvatarImage
            src={user.blockedUser.avatarUrl}
            alt={user.blockedUser.displayName}
          />
          <AvatarFallback>
            {getInitials(user.blockedUser.displayName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {user.blockedUser.displayName}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            @{user.blockedUser.username}
          </p>
        </div>
        <div className="hidden flex-shrink-0 items-center gap-1 text-xs text-muted-foreground sm:flex">
          <Clock className="h-3 w-3" />
          <span>Blocked {formatDate(user.createdAt)}</span>
        </div>
      </div>

      <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isUnblocking}
            className="flex-shrink-0"
          >
            {isUnblockingThis ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserCheck className="h-4 w-4" />
            )}
            <span className="ml-2 hidden sm:inline">Unblock</span>
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Unblock {user.blockedUser.displayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This user will be able to send you direct messages and you will
              see their messages in channels again.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isUnblockingThis}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleUnblock}
              disabled={isUnblockingThis}
            >
              {isUnblockingThis ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Unblocking...
                </>
              ) : (
                "Unblock"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function BlockedUsersList({
  maxHeight = 400,
  showRefresh = true,
  emptyMessage = "You haven't blocked anyone. When you block a user, they'll appear here.",
  className,
}: BlockedUsersListProps) {
  const {
    blockedUsers,
    isLoading,
    isUnblocking,
    error,
    unblockUser,
    refreshBlockedUsers,
  } = useBlock();

  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshBlockedUsers();
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Blocked Users
            </CardTitle>
            <CardDescription>
              {blockedUsers.length > 0
                ? `${blockedUsers.length} user${blockedUsers.length !== 1 ? "s" : ""} blocked`
                : "Manage users you have blocked"}
            </CardDescription>
          </div>
          {showRefresh && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleRefresh}
              disabled={isLoading || isRefreshing}
            >
              <RefreshCw
                className={cn(
                  "h-4 w-4",
                  (isLoading || isRefreshing) && "animate-spin",
                )}
              />
              <span className="sr-only">Refresh</span>
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {error && (
          <div className="bg-destructive/10 mx-4 mb-4 rounded-md p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : blockedUsers.length === 0 ? (
          <EmptyState message={emptyMessage} />
        ) : (
          <ScrollArea
            style={{
              maxHeight:
                typeof maxHeight === "number" ? `${maxHeight}px` : maxHeight,
            }}
          >
            <div className="divide-y">
              {blockedUsers.map((user) => (
                <BlockedUserItem
                  key={user.id}
                  user={user}
                  onUnblock={unblockUser}
                  isUnblocking={isUnblocking}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

export default BlockedUsersList;
