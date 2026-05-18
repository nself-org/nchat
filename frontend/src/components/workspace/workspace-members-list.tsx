"use client";

/**
 * Workspace Members List Component
 *
 * Displays and manages workspace members with:
 * - Member search
 * - Role filtering
 * - Role management
 * - Member removal
 * - Invite management
 */

import * as React from "react";
import {
  Search,
  MoreHorizontal,
  Shield,
  ShieldCheck,
  ShieldAlert,
  User,
  UserX,
  UserPlus,
  Copy,
  Link2,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  useWorkspaceMembers,
  useMemberManagement,
  type WorkspaceMember,
} from "@/hooks/use-workspace";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WorkspaceMembersListProps {
  workspaceId: string;
  currentUserId: string;
  currentUserRole: string;
  className?: string;
}

type MemberRole = "owner" | "admin" | "moderator" | "member" | "guest";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getRoleIcon(role: string) {
  switch (role) {
    case "owner":
      return <ShieldAlert className="h-4 w-4 text-yellow-500" />;
    case "admin":
      return <ShieldCheck className="h-4 w-4 text-blue-500" />;
    case "moderator":
      return <Shield className="h-4 w-4 text-green-500" />;
    default:
      return <User className="h-4 w-4 text-muted-foreground" />;
  }
}

function getRoleBadgeVariant(
  role: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "owner":
      return "default";
    case "admin":
      return "secondary";
    case "moderator":
      return "outline";
    default:
      return "outline";
  }
}

function canManageRole(currentRole: string, targetRole: string): boolean {
  const hierarchy: Record<string, number> = {
    owner: 4,
    admin: 3,
    moderator: 2,
    member: 1,
    guest: 0,
  };
  return hierarchy[currentRole] > hierarchy[targetRole];
}

function getAvailableRoles(
  currentRole: string,
): Array<"admin" | "moderator" | "member" | "guest"> {
  if (currentRole === "owner") {
    return ["admin", "moderator", "member", "guest"];
  }
  if (currentRole === "admin") {
    return ["moderator", "member", "guest"];
  }
  return [];
}

// ============================================================================
// MEMBER ITEM COMPONENT
// ============================================================================

interface MemberItemProps {
  member: WorkspaceMember;
  currentUserId: string;
  currentUserRole: string;
  onUpdateRole: (
    userId: string,
    role: "admin" | "moderator" | "member" | "guest",
  ) => Promise<void>;
  onRemove: (userId: string) => Promise<void>;
  onDeactivate: (userId: string) => Promise<void>;
}

function MemberItem({
  member,
  currentUserId,
  currentUserRole,
  onUpdateRole,
  onRemove,
  onDeactivate,
}: MemberItemProps) {
  const isCurrentUser = member.userId === currentUserId;
  const canManage =
    canManageRole(currentUserRole, member.role) && !isCurrentUser;
  const availableRoles = getAvailableRoles(currentUserRole);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 group">
      <Avatar className="h-10 w-10">
        {member.user?.avatarUrl ? (
          <AvatarImage
            src={member.user.avatarUrl}
            alt={member.user.displayName}
          />
        ) : null}
        <AvatarFallback>
          {member.user?.displayName?.slice(0, 2).toUpperCase() || "U"}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {member.nickname || member.user?.displayName || "Unknown User"}
          </span>
          {isCurrentUser && (
            <Badge variant="outline" className="h-4 text-[10px]">
              You
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>@{member.user?.username || "unknown"}</span>
          {member.user?.email && (
            <>
              <span className="text-muted-foreground/50">·</span>
              <span className="truncate">{member.user.email}</span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Badge variant={getRoleBadgeVariant(member.role)} className="gap-1">
          {getRoleIcon(member.role)}
          {member.role}
        </Badge>

        {canManage && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100"
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Member Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />

              {availableRoles.length > 0 && (
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>
                    <Shield className="mr-2 h-4 w-4" />
                    Change Role
                  </DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    {availableRoles.map((role) => (
                      <DropdownMenuItem
                        key={role}
                        onClick={() => onUpdateRole(member.userId, role)}
                      >
                        {getRoleIcon(role)}
                        <span className="ml-2 capitalize">{role}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
              )}

              <DropdownMenuItem
                onClick={() => onDeactivate(member.userId)}
                className="text-orange-600"
              >
                <UserX className="mr-2 h-4 w-4" />
                Deactivate
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={() => onRemove(member.userId)}
                className="text-destructive"
              >
                <UserX className="mr-2 h-4 w-4" />
                Remove from Workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// INVITE LINK DIALOG COMPONENT
// ============================================================================

interface InviteLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}

function InviteLinkDialog({
  open,
  onOpenChange,
  workspaceId,
}: InviteLinkDialogProps) {
  const { toast } = useToast();
  const { createInvite, isProcessing } = useMemberManagement(workspaceId);
  const [inviteUrl, setInviteUrl] = React.useState<string | null>(null);
  const [expiresIn, setExpiresIn] = React.useState<string>("7d");

  const handleCreateInvite = async () => {
    const result = await createInvite({
      expiresIn: expiresIn as
        | "30m"
        | "1h"
        | "6h"
        | "12h"
        | "1d"
        | "7d"
        | "never",
    });
    if (result) {
      setInviteUrl(result.url);
    }
  };

  const handleCopyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl);
      toast({
        title: "Link copied",
        description: "Invite link has been copied to clipboard.",
      });
    }
  };

  const handleReset = () => {
    setInviteUrl(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite Members</DialogTitle>
          <DialogDescription>
            Create an invite link to share with others.
          </DialogDescription>
        </DialogHeader>

        {!inviteUrl ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Link Expires</label>
              <Select value={expiresIn} onValueChange={setExpiresIn}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30m">30 minutes</SelectItem>
                  <SelectItem value="1h">1 hour</SelectItem>
                  <SelectItem value="6h">6 hours</SelectItem>
                  <SelectItem value="12h">12 hours</SelectItem>
                  <SelectItem value="1d">1 day</SelectItem>
                  <SelectItem value="7d">7 days</SelectItem>
                  <SelectItem value="never">Never</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
              <Link2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={inviteUrl}
                readOnly
                className="border-0 bg-transparent p-0 h-auto"
              />
              <Button variant="ghost" size="icon" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        <DialogFooter>
          {inviteUrl ? (
            <>
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Create New
              </Button>
              <Button onClick={handleCopyLink}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Link
              </Button>
            </>
          ) : (
            <Button onClick={handleCreateInvite} disabled={isProcessing}>
              {isProcessing ? "Creating..." : "Create Invite Link"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function WorkspaceMembersList({
  workspaceId,
  currentUserId,
  currentUserRole,
  className,
}: WorkspaceMembersListProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [roleFilter, setRoleFilter] = React.useState<string>("all");
  const [showInviteDialog, setShowInviteDialog] = React.useState(false);

  const { members, loading, error, refetch } = useWorkspaceMembers(
    workspaceId,
    {
      role: roleFilter === "all" ? undefined : roleFilter,
      limit: 100,
    },
  );

  const { updateMemberRole, removeMember, deactivateMember, isProcessing } =
    useMemberManagement(workspaceId);

  // Filter members by search query
  const filteredMembers = React.useMemo(() => {
    if (!searchQuery.trim()) return members;
    const query = searchQuery.toLowerCase();
    return members.filter(
      (m) =>
        m.user?.displayName?.toLowerCase().includes(query) ||
        m.user?.username?.toLowerCase().includes(query) ||
        m.user?.email?.toLowerCase().includes(query) ||
        m.nickname?.toLowerCase().includes(query),
    );
  }, [members, searchQuery]);

  // Group members by role
  const groupedMembers = React.useMemo(() => {
    const groups: Record<string, WorkspaceMember[]> = {
      owner: [],
      admin: [],
      moderator: [],
      member: [],
      guest: [],
    };
    filteredMembers.forEach((member) => {
      if (groups[member.role]) {
        groups[member.role].push(member);
      } else {
        groups.member.push(member);
      }
    });
    return groups;
  }, [filteredMembers]);

  const handleUpdateRole = async (
    userId: string,
    role: "admin" | "moderator" | "member" | "guest",
  ) => {
    await updateMemberRole(userId, role);
    refetch();
  };

  const handleRemove = async (userId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this member from the workspace?",
    );
    if (confirmed) {
      await removeMember(userId);
      refetch();
    }
  };

  const handleDeactivate = async (userId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to deactivate this member? They will be removed but can rejoin later.",
    );
    if (confirmed) {
      await deactivateMember(userId);
      refetch();
    }
  };

  const canInvite = ["owner", "admin", "moderator"].includes(currentUserRole);

  if (error) {
    return (
      <div className="p-4 text-center text-destructive">
        Failed to load members. Please try again.
      </div>
    );
  }

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Header */}
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Members ({members.length})</h2>
          {canInvite && (
            <Button size="sm" onClick={() => setShowInviteDialog(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search members..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="All roles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="owner">Owner</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="guest">Guest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Member List */}
      <ScrollArea className="flex-1">
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 p-3 animate-pulse"
              >
                <div className="h-10 w-10 rounded-full bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-muted rounded" />
                  <div className="h-3 w-24 bg-muted rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            {searchQuery
              ? "No members found matching your search."
              : "No members in this workspace."}
          </div>
        ) : (
          <div className="p-4 space-y-6">
            {Object.entries(groupedMembers).map(
              ([role, roleMembers]) =>
                roleMembers.length > 0 && (
                  <div key={role}>
                    <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                      {getRoleIcon(role)}
                      <span className="capitalize">{role}s</span>
                      <span className="text-xs">({roleMembers.length})</span>
                    </h3>
                    <div className="space-y-1">
                      {roleMembers.map((member) => (
                        <MemberItem
                          key={member.id}
                          member={member}
                          currentUserId={currentUserId}
                          currentUserRole={currentUserRole}
                          onUpdateRole={handleUpdateRole}
                          onRemove={handleRemove}
                          onDeactivate={handleDeactivate}
                        />
                      ))}
                    </div>
                  </div>
                ),
            )}
          </div>
        )}
      </ScrollArea>

      {/* Invite Dialog */}
      <InviteLinkDialog
        open={showInviteDialog}
        onOpenChange={setShowInviteDialog}
        workspaceId={workspaceId}
      />
    </div>
  );
}

export default WorkspaceMembersList;
