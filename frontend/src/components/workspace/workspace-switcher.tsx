"use client";

/**
 * Workspace Switcher Component
 *
 * Dropdown component for switching between workspaces with:
 * - Current workspace display
 * - Recent workspaces list
 * - All workspaces list
 * - Create new workspace action
 * - Workspace search
 */

import * as React from "react";
import {
  Check,
  ChevronDown,
  Plus,
  Search,
  Building2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  useWorkspaceSwitcher,
  type WorkspaceWithMembership,
} from "@/hooks/use-workspace";
import Link from "next/link";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

interface WorkspaceSwitcherProps {
  className?: string;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
  onSettingsClick?: (workspaceId: string) => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getWorkspaceInitials(name: string): string {
  return name
    .split(" ")
    .map((word) => word[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getRoleBadgeVariant(
  role: string,
): "default" | "secondary" | "destructive" | "outline" {
  switch (role) {
    case "owner":
      return "default";
    case "admin":
      return "secondary";
    default:
      return "outline";
  }
}

// ============================================================================
// WORKSPACE ITEM COMPONENT
// ============================================================================

interface WorkspaceItemProps {
  workspace: WorkspaceWithMembership;
  isCurrent: boolean;
  onClick: () => void;
  onSettingsClick?: () => void;
}

function WorkspaceItem({
  workspace,
  isCurrent,
  onClick,
  onSettingsClick,
}: WorkspaceItemProps) {
  return (
    <DropdownMenuItem
      className={cn(
        "flex items-center gap-3 cursor-pointer py-2",
        isCurrent && "bg-accent",
      )}
      onClick={onClick}
    >
      <Avatar className="h-8 w-8">
        {workspace.workspace.iconUrl ? (
          <AvatarImage
            src={workspace.workspace.iconUrl}
            alt={workspace.workspace.name}
          />
        ) : null}
        <AvatarFallback className="text-xs">
          {getWorkspaceInitials(workspace.workspace.name)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">
            {workspace.workspace.name}
          </span>
          {isCurrent && <Check className="h-4 w-4 text-primary shrink-0" />}
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant={getRoleBadgeVariant(workspace.role)}
            className="h-4 text-[10px] px-1"
          >
            {workspace.role}
          </Badge>
          <span>{workspace.workspace.memberCount} members</span>
        </div>
      </div>

      {onSettingsClick && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onSettingsClick();
          }}
        >
          <Settings className="h-3 w-3" />
        </Button>
      )}
    </DropdownMenuItem>
  );
}

// ============================================================================
// WORKSPACE SWITCHER COMPONENT
// ============================================================================

export function WorkspaceSwitcher({
  className,
  showCreateButton = true,
  onCreateClick,
  onSettingsClick,
}: WorkspaceSwitcherProps) {
  const {
    currentWorkspace,
    workspaces,
    recentWorkspaces,
    switchWorkspace,
    loading,
  } = useWorkspaceSwitcher();

  const [isOpen, setIsOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Filter workspaces by search query
  const filteredWorkspaces = React.useMemo(() => {
    if (!searchQuery.trim()) return workspaces;
    const query = searchQuery.toLowerCase();
    return workspaces.filter(
      (w) =>
        w.workspace.name.toLowerCase().includes(query) ||
        w.workspace.slug.toLowerCase().includes(query),
    );
  }, [workspaces, searchQuery]);

  // Handle workspace selection
  const handleSelect = React.useCallback(
    (workspaceId: string) => {
      switchWorkspace(workspaceId);
      setIsOpen(false);
      setSearchQuery("");
    },
    [switchWorkspace],
  );

  // Close dropdown and reset search on open state change
  React.useEffect(() => {
    if (!isOpen) {
      setSearchQuery("");
    }
  }, [isOpen]);

  if (loading) {
    return (
      <Button
        variant="outline"
        className={cn("w-[200px] justify-between", className)}
        disabled
      >
        <div className="flex items-center gap-2">
          <Building2 className="h-4 w-4 animate-pulse" />
          <span className="text-muted-foreground">Loading...</span>
        </div>
      </Button>
    );
  }

  if (!currentWorkspace && workspaces.length === 0) {
    return (
      <Button
        variant="outline"
        className={cn("w-[200px] justify-between", className)}
        onClick={onCreateClick}
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          <span>Create Workspace</span>
        </div>
      </Button>
    );
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={isOpen}
          className={cn("w-[200px] justify-between", className)}
        >
          <div className="flex items-center gap-2 truncate">
            {currentWorkspace ? (
              <>
                <Avatar className="h-5 w-5">
                  {currentWorkspace.iconUrl ? (
                    <AvatarImage
                      src={currentWorkspace.iconUrl}
                      alt={currentWorkspace.name}
                    />
                  ) : null}
                  <AvatarFallback className="text-[10px]">
                    {getWorkspaceInitials(currentWorkspace.name)}
                  </AvatarFallback>
                </Avatar>
                <span className="truncate">{currentWorkspace.name}</span>
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4" />
                <span>Select Workspace</span>
              </>
            )}
          </div>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[280px]" align="start" sideOffset={4}>
        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search workspaces..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
        </div>

        <DropdownMenuSeparator />

        <ScrollArea className="max-h-[300px]">
          {/* Recent Workspaces */}
          {recentWorkspaces.length > 0 && !searchQuery && (
            <>
              <DropdownMenuLabel className="text-xs text-muted-foreground">
                Recent
              </DropdownMenuLabel>
              <DropdownMenuGroup>
                {recentWorkspaces.slice(0, 3).map((workspace) => (
                  <WorkspaceItem
                    key={workspace.workspace.id}
                    workspace={workspace}
                    isCurrent={currentWorkspace?.id === workspace.workspace.id}
                    onClick={() => handleSelect(workspace.workspace.id)}
                    onSettingsClick={
                      onSettingsClick
                        ? () => onSettingsClick(workspace.workspace.id)
                        : undefined
                    }
                  />
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
            </>
          )}

          {/* All Workspaces */}
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {searchQuery ? "Search Results" : "All Workspaces"}
          </DropdownMenuLabel>
          <DropdownMenuGroup>
            {filteredWorkspaces.length > 0 ? (
              filteredWorkspaces.map((workspace) => (
                <WorkspaceItem
                  key={workspace.workspace.id}
                  workspace={workspace}
                  isCurrent={currentWorkspace?.id === workspace.workspace.id}
                  onClick={() => handleSelect(workspace.workspace.id)}
                  onSettingsClick={
                    onSettingsClick
                      ? () => onSettingsClick(workspace.workspace.id)
                      : undefined
                  }
                />
              ))
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                {searchQuery ? "No workspaces found" : "No workspaces yet"}
              </div>
            )}
          </DropdownMenuGroup>
        </ScrollArea>

        {/* Create Button */}
        {showCreateButton && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={onCreateClick}
            >
              <Plus className="mr-2 h-4 w-4" />
              Create Workspace
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default WorkspaceSwitcher;
