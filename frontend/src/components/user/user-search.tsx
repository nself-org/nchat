"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  type UserProfile,
  type UserRole,
  type PresenceStatus,
  useUserStore,
  selectFilteredUsers,
  getRoleLabel,
  getPresenceLabel,
} from "@/stores/user-store";
import { MemberListItem } from "./member-list-item";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Filter, X, Users } from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UserSearchProps extends React.HTMLAttributes<HTMLDivElement> {
  onSelectUser?: (user: UserProfile) => void;
  onMessage?: (user: UserProfile) => void;
  onViewProfile?: (user: UserProfile) => void;
  placeholder?: string;
  showFilters?: boolean;
  showResults?: boolean;
  maxResults?: number;
  excludeUserIds?: string[];
  filterRoles?: UserRole[];
}

// ============================================================================
// Component
// ============================================================================

const UserSearch = React.forwardRef<HTMLDivElement, UserSearchProps>(
  (
    {
      className,
      onSelectUser,
      onMessage,
      onViewProfile,
      placeholder = "Search users...",
      showFilters = true,
      showResults = true,
      maxResults = 20,
      excludeUserIds = [],
      filterRoles,
      ...props
    },
    ref,
  ) => {
    const searchQuery = useUserStore((state) => state.searchQuery);
    const roleFilter = useUserStore((state) => state.roleFilter);
    const presenceFilter = useUserStore((state) => state.presenceFilter);
    const setSearchQuery = useUserStore((state) => state.setSearchQuery);
    const setRoleFilter = useUserStore((state) => state.setRoleFilter);
    const setPresenceFilter = useUserStore((state) => state.setPresenceFilter);
    const clearFilters = useUserStore((state) => state.clearFilters);
    const filteredUsers = useUserStore(selectFilteredUsers);

    const [showFilterPopover, setShowFilterPopover] = React.useState(false);
    const inputRef = React.useRef<HTMLInputElement>(null);

    // Filter out excluded users and apply role filter if provided
    const displayUsers = React.useMemo(() => {
      let users = filteredUsers.filter(
        (user) => !excludeUserIds.includes(user.id),
      );

      if (filterRoles && filterRoles.length > 0) {
        users = users.filter((user) => filterRoles.includes(user.role));
      }

      return users.slice(0, maxResults);
    }, [filteredUsers, excludeUserIds, filterRoles, maxResults]);

    const hasActiveFilters = roleFilter !== "all" || presenceFilter !== "all";

    const handleClearSearch = () => {
      setSearchQuery("");
      inputRef.current?.focus();
    };

    const handleClearFilters = () => {
      clearFilters();
      setShowFilterPopover(false);
    };

    const roleOptions: Array<UserRole | "all"> = [
      "all",
      "owner",
      "admin",
      "moderator",
      "member",
      "guest",
    ];

    const presenceOptions: Array<PresenceStatus | "all"> = [
      "all",
      "online",
      "away",
      "dnd",
      "offline",
    ];

    return (
      <div ref={ref} className={cn("space-y-2", className)} {...props}>
        {/* Search input */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder={placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-9"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
                onClick={handleClearSearch}
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>

          {showFilters && (
            <Popover
              open={showFilterPopover}
              onOpenChange={setShowFilterPopover}
            >
              <PopoverTrigger asChild>
                <Button
                  variant={hasActiveFilters ? "default" : "outline"}
                  size="icon"
                >
                  <Filter className="h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Filters</h4>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleClearFilters}
                      >
                        Clear
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span
                      className="text-sm font-medium"
                      id="role-filter-label"
                    >
                      Role
                    </span>
                    <Select
                      value={roleFilter}
                      onValueChange={(value) =>
                        setRoleFilter(value as UserRole | "all")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOptions.map((role) => (
                          <SelectItem key={role} value={role}>
                            {role === "all" ? "All Roles" : getRoleLabel(role)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <span
                      className="text-sm font-medium"
                      id="status-filter-label"
                    >
                      Status
                    </span>
                    <Select
                      value={presenceFilter}
                      onValueChange={(value) =>
                        setPresenceFilter(value as PresenceStatus | "all")
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {presenceOptions.map((presence) => (
                          <SelectItem key={presence} value={presence}>
                            {presence === "all"
                              ? "All Statuses"
                              : getPresenceLabel(presence)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Active filters badges */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2">
            {roleFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Role: {getRoleLabel(roleFilter)}
                <button
                  onClick={() => setRoleFilter("all")}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
            {presenceFilter !== "all" && (
              <Badge variant="secondary" className="gap-1">
                Status: {getPresenceLabel(presenceFilter)}
                <button
                  onClick={() => setPresenceFilter("all")}
                  className="ml-1 hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )}
          </div>
        )}

        {/* Results */}
        {showResults && (
          <div className="space-y-1">
            {displayUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <Users className="mb-2 h-8 w-8 opacity-50" />
                <p className="text-sm">
                  {searchQuery || hasActiveFilters
                    ? "No users found"
                    : "Search for users"}
                </p>
              </div>
            ) : (
              <ScrollArea className="max-h-64">
                <div className="space-y-1">
                  {displayUsers.map((user) => (
                    <MemberListItem
                      key={user.id}
                      user={user}
                      onClick={onSelectUser}
                      onMessage={onMessage}
                      onViewProfile={onViewProfile}
                      showProfileCard={false}
                    />
                  ))}
                </div>
              </ScrollArea>
            )}

            {/* Result count */}
            {displayUsers.length > 0 && (
              <p className="pt-2 text-center text-xs text-muted-foreground">
                Showing {displayUsers.length} of {filteredUsers.length} users
              </p>
            )}
          </div>
        )}
      </div>
    );
  },
);
UserSearch.displayName = "UserSearch";

// ============================================================================
// UserSearchInput - Minimal search input without results
// ============================================================================

export interface UserSearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> {
  value?: string;
  onChange?: (value: string) => void;
  onClear?: () => void;
}

const UserSearchInput = React.forwardRef<
  HTMLInputElement,
  UserSearchInputProps
>(({ className, value, onChange, onClear, ...props }, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e.target.value);
  };

  const handleClear = () => {
    onChange?.("");
    onClear?.();
  };

  // Extract aria-invalid to ensure proper typing with our Input component
  const { "aria-invalid": ariaInvalid, ...restProps } = props;

  return (
    <div className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={ref}
        type="text"
        value={value}
        onChange={handleChange}
        className="pl-9 pr-9"
        aria-invalid={
          ariaInvalid === true || ariaInvalid === "true"
            ? true
            : ariaInvalid === false || ariaInvalid === "false"
              ? false
              : undefined
        }
        {...restProps}
      />
      {value && (
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-1 top-1/2 h-6 w-6 -translate-y-1/2"
          onClick={handleClear}
        >
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
});
UserSearchInput.displayName = "UserSearchInput";

export { UserSearch, UserSearchInput };
