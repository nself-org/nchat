"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { UserCard, type ExtendedUserProfile } from "./UserCard";
import { UserSearch } from "./UserSearch";
import { UserFilters } from "./UserFilters";
import { useUserDirectoryStore } from "@/stores/user-directory-store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  LayoutGrid,
  LayoutList,
  Users,
  RefreshCw,
  UserPlus,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UserDirectoryProps extends React.HTMLAttributes<HTMLDivElement> {
  users: ExtendedUserProfile[];
  departments?: string[];
  teams?: string[];
  locations?: string[];
  isLoading?: boolean;
  error?: string | null;
  onUserClick?: (user: ExtendedUserProfile) => void;
  onMessage?: (user: ExtendedUserProfile) => void;
  onCall?: (user: ExtendedUserProfile) => void;
  onRefresh?: () => void;
  onInvite?: () => void;
  showHeader?: boolean;
  showFilters?: boolean;
  showSearch?: boolean;
  title?: string;
  description?: string;
}

type ViewMode = "grid" | "list";

// ============================================================================
// Component
// ============================================================================

const UserDirectory = React.forwardRef<HTMLDivElement, UserDirectoryProps>(
  (
    {
      className,
      users,
      departments = [],
      teams = [],
      locations = [],
      isLoading = false,
      error = null,
      onUserClick,
      onMessage,
      onCall,
      onRefresh,
      onInvite,
      showHeader = true,
      showFilters = true,
      showSearch = true,
      title = "People",
      description = "Browse and connect with team members",
      ...props
    },
    ref,
  ) => {
    const [viewMode, setViewMode] = React.useState<ViewMode>("grid");
    const {
      searchQuery,
      roleFilter,
      presenceFilter,
      departmentFilter,
      teamFilter,
      locationFilter,
    } = useUserDirectoryStore();

    // Filter users based on current filters
    const filteredUsers = React.useMemo(() => {
      let result = [...users];

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        result = result.filter(
          (user) =>
            user.displayName.toLowerCase().includes(query) ||
            user.username.toLowerCase().includes(query) ||
            user.email.toLowerCase().includes(query) ||
            user.title?.toLowerCase().includes(query) ||
            user.department?.toLowerCase().includes(query),
        );
      }

      // Role filter
      if (roleFilter !== "all") {
        result = result.filter((user) => user.role === roleFilter);
      }

      // Presence filter
      if (presenceFilter !== "all") {
        result = result.filter((user) => user.presence === presenceFilter);
      }

      // Department filter
      if (departmentFilter !== "all") {
        result = result.filter((user) => user.department === departmentFilter);
      }

      // Team filter
      if (teamFilter !== "all") {
        result = result.filter((user) => user.team === teamFilter);
      }

      // Location filter
      if (locationFilter !== "all") {
        result = result.filter((user) => user.location === locationFilter);
      }

      // Sort: online users first, then by name
      result.sort((a, b) => {
        const presenceOrder: Record<string, number> = {
          online: 0,
          away: 1,
          dnd: 2,
          invisible: 3,
          offline: 3,
        };
        const presenceDiff =
          presenceOrder[a.presence] - presenceOrder[b.presence];
        if (presenceDiff !== 0) return presenceDiff;
        return a.displayName.localeCompare(b.displayName);
      });

      return result;
    }, [
      users,
      searchQuery,
      roleFilter,
      presenceFilter,
      departmentFilter,
      teamFilter,
      locationFilter,
    ]);

    // Group users by first letter for list view
    const groupedUsers = React.useMemo(() => {
      const groups: Record<string, ExtendedUserProfile[]> = {};
      filteredUsers.forEach((user) => {
        const letter = user.displayName.charAt(0).toUpperCase();
        if (!groups[letter]) {
          groups[letter] = [];
        }
        groups[letter].push(user);
      });
      return groups;
    }, [filteredUsers]);

    // Count online users
    const onlineCount = users.filter((u) => u.presence === "online").length;

    return (
      <div
        ref={ref}
        className={cn("flex h-full flex-col", className)}
        {...props}
      >
        {/* Header */}
        {showHeader && (
          <div className="flex-shrink-0 border-b">
            <div className="space-y-4 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {description}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {onInvite && (
                    <Button onClick={onInvite} size="sm">
                      <UserPlus className="mr-2 h-4 w-4" />
                      Invite
                    </Button>
                  )}
                  {onRefresh && (
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={onRefresh}
                      disabled={isLoading}
                    >
                      <RefreshCw
                        className={cn("h-4 w-4", isLoading && "animate-spin")}
                      />
                    </Button>
                  )}
                </div>
              </div>

              {/* Stats bar */}
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{users.length} members</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  <span>{onlineCount} online</span>
                </div>
              </div>
            </div>

            {/* Search and filters */}
            <div className="space-y-4 px-6 pb-4">
              {showSearch && (
                <div className="flex items-center gap-4">
                  <UserSearch className="flex-1" />
                  <Tabs
                    value={viewMode}
                    onValueChange={(v) => setViewMode(v as ViewMode)}
                  >
                    <TabsList className="h-9">
                      <TabsTrigger value="grid" className="px-3">
                        <LayoutGrid className="h-4 w-4" />
                      </TabsTrigger>
                      <TabsTrigger value="list" className="px-3">
                        <LayoutList className="h-4 w-4" />
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
              )}
              {showFilters && (
                <UserFilters
                  departments={departments}
                  teams={teams}
                  locations={locations}
                  compact
                />
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {/* Loading state */}
            {isLoading && (
              <div
                className={cn(
                  viewMode === "grid"
                    ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                    : "space-y-2",
                )}
              >
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton
                    key={i}
                    className={viewMode === "grid" ? "h-48" : "h-16"}
                  />
                ))}
              </div>
            )}

            {/* Error state */}
            {error && !isLoading && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="mb-4 text-destructive">{error}</p>
                {onRefresh && (
                  <Button variant="outline" onClick={onRefresh}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Button>
                )}
              </div>
            )}

            {/* Empty state */}
            {!isLoading && !error && filteredUsers.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">No users found</h3>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {searchQuery
                    ? `No users match "${searchQuery}". Try adjusting your search or filters.`
                    : "No users match the current filters."}
                </p>
              </div>
            )}

            {/* Grid view */}
            {!isLoading &&
              !error &&
              filteredUsers.length > 0 &&
              viewMode === "grid" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredUsers.map((user) => (
                    <UserCard
                      key={user.id}
                      user={user}
                      variant="default"
                      onViewProfile={() => onUserClick?.(user)}
                      onMessage={() => onMessage?.(user)}
                      onCall={() => onCall?.(user)}
                    />
                  ))}
                </div>
              )}

            {/* List view */}
            {!isLoading &&
              !error &&
              filteredUsers.length > 0 &&
              viewMode === "list" && (
                <div className="space-y-6">
                  {Object.entries(groupedUsers).map(([letter, letterUsers]) => (
                    <div key={letter}>
                      <h3 className="sticky top-0 mb-2 bg-background py-1 text-sm font-medium text-muted-foreground">
                        {letter}
                      </h3>
                      <div className="space-y-1">
                        {letterUsers.map((user) => (
                          <UserCard
                            key={user.id}
                            user={user}
                            variant="compact"
                            onViewProfile={() => onUserClick?.(user)}
                            onMessage={() => onMessage?.(user)}
                            onCall={() => onCall?.(user)}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
          </div>
        </ScrollArea>
      </div>
    );
  },
);
UserDirectory.displayName = "UserDirectory";

export { UserDirectory };
