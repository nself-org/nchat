"use client";

/**
 * InviteList Component - Display and manage active invites
 *
 * Shows a list of active invites with usage count, expiration,
 * and revoke functionality.
 */

import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Link2,
  Clock,
  Users,
  MoreHorizontal,
  Copy,
  Trash2,
  Ban,
  ExternalLink,
  RefreshCw,
  AlertCircle,
  Check,
  QrCode as QrCodeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  useInvite,
  formatTimeUntilExpiry,
  getRemainingUses,
  isInviteExpired,
  hasReachedMaxUses,
  buildInviteLink,
  copyInviteLinkToClipboard,
  type InviteInfo,
} from "@/lib/invite";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// ============================================================================
// Types
// ============================================================================

export interface InviteListProps {
  /** Channel ID to load invites for (optional) */
  channelId?: string;
  /** Load workspace invites instead of channel invites */
  loadWorkspaceInvites?: boolean;
  /** Maximum height for the list */
  maxHeight?: string | number;
  /** Custom class name */
  className?: string;
  /** Show create button */
  showCreateButton?: boolean;
  /** Called when create button is clicked */
  onCreateClick?: () => void;
  /** Show empty state */
  showEmptyState?: boolean;
}

// ============================================================================
// Invite Item Component
// ============================================================================

interface InviteItemProps {
  invite: InviteInfo;
  onRevoke: (id: string) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
}

function InviteItem({ invite, onRevoke, onDelete }: InviteItemProps) {
  const [copied, setCopied] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isExpired = isInviteExpired(invite.expiresAt);
  const isMaxUsed = hasReachedMaxUses(invite.maxUses, invite.useCount);
  const isInactive = !invite.isActive || isExpired || isMaxUsed;

  const expiresIn = invite.expiresAt
    ? formatTimeUntilExpiry(invite.expiresAt)
    : null;
  const remainingUses =
    invite.maxUses !== null
      ? getRemainingUses(invite.maxUses, invite.useCount)
      : null;

  // Handle copy
  const handleCopy = useCallback(async () => {
    const success = await copyInviteLinkToClipboard(invite.code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [invite.code]);

  // Handle revoke
  const handleRevoke = useCallback(async () => {
    setIsRevoking(true);
    try {
      await onRevoke(invite.id);
    } finally {
      setIsRevoking(false);
      setRevokeDialogOpen(false);
    }
  }, [invite.id, onRevoke]);

  // Handle delete
  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(invite.id);
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  }, [invite.id, onDelete]);

  // Get status badge
  const getStatusBadge = () => {
    if (!invite.isActive) {
      return <Badge variant="secondary">Revoked</Badge>;
    }
    if (isExpired) {
      return <Badge variant="secondary">Expired</Badge>;
    }
    if (isMaxUsed) {
      return <Badge variant="secondary">Max uses reached</Badge>;
    }
    return <Badge variant="default">Active</Badge>;
  };

  return (
    <>
      <div
        className={cn(
          "flex items-start gap-4 border-b p-4 transition-colors last:border-b-0",
          isInactive && "bg-muted/30 opacity-60",
        )}
      >
        {/* Icon */}
        <div
          className={cn(
            "rounded-xl p-2",
            isInactive ? "bg-muted" : "bg-primary/10",
          )}
        >
          <Link2
            className={cn(
              "h-5 w-5",
              isInactive ? "text-muted-foreground" : "text-primary",
            )}
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 space-y-1">
          {/* Code and Status */}
          <div className="flex flex-wrap items-center gap-2">
            <code className="rounded bg-muted px-2 py-0.5 font-mono text-sm">
              {invite.code}
            </code>
            {getStatusBadge()}
          </div>

          {/* Metadata */}
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {/* Creator */}
            <div className="flex items-center gap-1.5">
              <Avatar className="h-4 w-4">
                <AvatarImage src={invite.creatorAvatarUrl || undefined} />
                <AvatarFallback className="text-[8px]">
                  {invite.creatorName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span>{invite.creatorName}</span>
            </div>

            {/* Uses */}
            <div className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              <span>
                {invite.useCount}
                {invite.maxUses !== null && ` / ${invite.maxUses}`} uses
              </span>
            </div>

            {/* Expiration */}
            {expiresIn && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>{isExpired ? "Expired" : `Expires in ${expiresIn}`}</span>
              </div>
            )}
            {!invite.expiresAt && (
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                <span>Never expires</span>
              </div>
            )}
          </div>

          {/* Channel */}
          {invite.channelName && (
            <div className="text-sm text-muted-foreground">
              Channel:{" "}
              <span className="font-medium">#{invite.channelName}</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopy}
                  disabled={isInactive}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {copied ? "Copied!" : "Copy link"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleCopy} disabled={isInactive}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  window.open(buildInviteLink(invite.code), "_blank")
                }
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                Open Link
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {invite.isActive && (
                <DropdownMenuItem
                  onClick={() => setRevokeDialogOpen(true)}
                  className="text-amber-600"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Revoke
                </DropdownMenuItem>
              )}
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Revoke Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Invite Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke this invite link? Anyone with this
              link will no longer be able to join.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={isRevoking}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isRevoking ? "Revoking..." : "Revoke"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invite Link</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete this invite link? This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="hover:bg-destructive/90 bg-destructive"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// Empty State Component
// ============================================================================

interface EmptyStateProps {
  showCreateButton?: boolean;
  onCreateClick?: () => void;
}

function EmptyState({ showCreateButton, onCreateClick }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 rounded-full bg-muted p-4">
        <Link2 className="h-8 w-8 text-muted-foreground" />
      </div>
      <h3 className="mb-1 text-lg font-semibold">No invite links</h3>
      <p className="max-w-sm text-sm text-muted-foreground">
        Create an invite link to share with others and let them join.
      </p>
      {showCreateButton && (
        <Button className="mt-4" onClick={onCreateClick}>
          <Link2 className="mr-2 h-4 w-4" />
          Create Invite Link
        </Button>
      )}
    </div>
  );
}

// ============================================================================
// Loading Skeleton Component
// ============================================================================

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-start gap-4">
          <Skeleton className="h-10 w-10 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-48" />
          </div>
          <Skeleton className="h-8 w-8 rounded" />
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function InviteList({
  channelId,
  loadWorkspaceInvites = false,
  maxHeight = 400,
  className,
  showCreateButton = true,
  onCreateClick,
  showEmptyState = true,
}: InviteListProps) {
  const {
    loadChannelInvites,
    loadWorkspaceInvites: loadWorkspace,
    activeInvites,
    isLoadingInvites,
    invitesError,
    revokeInvite,
    deleteInvite,
  } = useInvite();

  // Load invites on mount
  useEffect(() => {
    if (loadWorkspaceInvites) {
      loadWorkspace();
    } else if (channelId) {
      loadChannelInvites(channelId);
    }
  }, [channelId, loadWorkspaceInvites, loadChannelInvites, loadWorkspace]);

  // Refresh handler
  const handleRefresh = useCallback(() => {
    if (loadWorkspaceInvites) {
      loadWorkspace();
    } else if (channelId) {
      loadChannelInvites(channelId);
    }
  }, [channelId, loadWorkspaceInvites, loadChannelInvites, loadWorkspace]);

  // Error state
  if (invitesError) {
    return (
      <div className={cn("rounded-xl border bg-card", className)}>
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <div className="bg-destructive/10 mb-4 rounded-full p-4">
            <AlertCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="mb-1 text-lg font-semibold">Failed to load invites</h3>
          <p className="mb-4 max-w-sm text-sm text-muted-foreground">
            {invitesError}
          </p>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-xl border bg-card", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b p-4">
        <div>
          <h3 className="font-semibold">Invite Links</h3>
          <p className="text-sm text-muted-foreground">
            {activeInvites.length} invite{activeInvites.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleRefresh}
                  disabled={isLoadingInvites}
                >
                  <RefreshCw
                    className={cn(
                      "h-4 w-4",
                      isLoadingInvites && "animate-spin",
                    )}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Refresh</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {showCreateButton && (
            <Button size="sm" onClick={onCreateClick}>
              <Link2 className="mr-2 h-4 w-4" />
              Create
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      {isLoadingInvites ? (
        <LoadingSkeleton />
      ) : activeInvites.length === 0 && showEmptyState ? (
        <EmptyState
          showCreateButton={showCreateButton}
          onCreateClick={onCreateClick}
        />
      ) : (
        <ScrollArea style={{ maxHeight }}>
          <div>
            {activeInvites.map((invite) => (
              <InviteItem
                key={invite.id}
                invite={invite}
                onRevoke={revokeInvite}
                onDelete={deleteInvite}
              />
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}

export default InviteList;
