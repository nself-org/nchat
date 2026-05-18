"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { type UserRole, type PresenceStatus } from "@/stores/user-store";
import { useUserDirectoryStore } from "@/stores/user-directory-store";
import {
  Filter,
  X,
  Users,
  Building2,
  Briefcase,
  MapPin,
  Circle,
} from "lucide-react";

// ============================================================================
// Types
// ============================================================================

export interface UserFiltersProps extends React.HTMLAttributes<HTMLDivElement> {
  departments?: string[];
  teams?: string[];
  locations?: string[];
  showDepartmentFilter?: boolean;
  showTeamFilter?: boolean;
  showLocationFilter?: boolean;
  compact?: boolean;
}

// ============================================================================
// Constants
// ============================================================================

const ROLES: { value: UserRole | "all"; label: string }[] = [
  { value: "all", label: "All Roles" },
  { value: "owner", label: "Owner" },
  { value: "admin", label: "Admin" },
  { value: "moderator", label: "Moderator" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
];

const PRESENCE_OPTIONS: {
  value: PresenceStatus | "all";
  label: string;
  color: string;
}[] = [
  { value: "all", label: "All Status", color: "" },
  { value: "online", label: "Online", color: "bg-green-500" },
  { value: "away", label: "Away", color: "bg-yellow-500" },
  { value: "dnd", label: "Do Not Disturb", color: "bg-red-500" },
  { value: "offline", label: "Offline", color: "bg-gray-500" },
];

// ============================================================================
// Component
// ============================================================================

const UserFilters = React.forwardRef<HTMLDivElement, UserFiltersProps>(
  (
    {
      className,
      departments = [],
      teams = [],
      locations = [],
      showDepartmentFilter = true,
      showTeamFilter = true,
      showLocationFilter = true,
      compact = false,
      ...props
    },
    ref,
  ) => {
    const {
      roleFilter,
      presenceFilter,
      departmentFilter,
      teamFilter,
      locationFilter,
      setRoleFilter,
      setPresenceFilter,
      setDepartmentFilter,
      setTeamFilter,
      setLocationFilter,
      clearFilters,
    } = useUserDirectoryStore();

    const activeFilterCount = [
      roleFilter !== "all",
      presenceFilter !== "all",
      departmentFilter !== "all",
      teamFilter !== "all",
      locationFilter !== "all",
    ].filter(Boolean).length;

    const hasActiveFilters = activeFilterCount > 0;

    // Compact mode - just a filter button with popover
    if (compact) {
      return (
        <div
          ref={ref}
          className={cn("flex items-center gap-2", className)}
          {...props}
        >
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" />
                Filters
                {hasActiveFilters && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-5 w-5 justify-center p-0"
                  >
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {hasActiveFilters && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearFilters}
                      className="h-auto p-1 text-muted-foreground"
                    >
                      Clear all
                    </Button>
                  )}
                </div>
                <Separator />
                <FilterContent
                  departments={departments}
                  teams={teams}
                  locations={locations}
                  showDepartmentFilter={showDepartmentFilter}
                  showTeamFilter={showTeamFilter}
                  showLocationFilter={showLocationFilter}
                  roleFilter={roleFilter}
                  presenceFilter={presenceFilter}
                  departmentFilter={departmentFilter}
                  teamFilter={teamFilter}
                  locationFilter={locationFilter}
                  setRoleFilter={setRoleFilter}
                  setPresenceFilter={setPresenceFilter}
                  setDepartmentFilter={setDepartmentFilter}
                  setTeamFilter={setTeamFilter}
                  setLocationFilter={setLocationFilter}
                />
              </div>
            </PopoverContent>
          </Popover>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-8 px-2"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      );
    }

    // Full filter bar
    return (
      <div
        ref={ref}
        className={cn(
          "bg-muted/30 flex flex-wrap items-center gap-3 rounded-lg p-4",
          className,
        )}
        {...props}
      >
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span>Filter by:</span>
        </div>

        {/* Role filter */}
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as UserRole | "all")}
        >
          <SelectTrigger className="h-9 w-[140px]">
            <Users className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Role" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Presence filter */}
        <Select
          value={presenceFilter}
          onValueChange={(value) =>
            setPresenceFilter(value as PresenceStatus | "all")
          }
        >
          <SelectTrigger className="h-9 w-[160px]">
            <Circle className="mr-2 h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {PRESENCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.color && (
                    <span
                      className={cn("h-2 w-2 rounded-full", option.color)}
                    />
                  )}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Department filter */}
        {showDepartmentFilter && departments.length > 0 && (
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="h-9 w-[160px]">
              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Team filter */}
        {showTeamFilter && teams.length > 0 && (
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="h-9 w-[140px]">
              <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Location filter */}
        {showLocationFilter && locations.length > 0 && (
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="h-9 w-[160px]">
              <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Clear filters button */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="h-9 px-3 text-muted-foreground hover:text-foreground"
          >
            <X className="mr-1 h-4 w-4" />
            Clear
          </Button>
        )}
      </div>
    );
  },
);
UserFilters.displayName = "UserFilters";

// ============================================================================
// Helper Component - Filter Content (used in popover)
// ============================================================================

interface FilterContentProps {
  departments: string[];
  teams: string[];
  locations: string[];
  showDepartmentFilter: boolean;
  showTeamFilter: boolean;
  showLocationFilter: boolean;
  roleFilter: UserRole | "all";
  presenceFilter: PresenceStatus | "all";
  departmentFilter: string;
  teamFilter: string;
  locationFilter: string;
  setRoleFilter: (value: UserRole | "all") => void;
  setPresenceFilter: (value: PresenceStatus | "all") => void;
  setDepartmentFilter: (value: string) => void;
  setTeamFilter: (value: string) => void;
  setLocationFilter: (value: string) => void;
}

function FilterContent({
  departments,
  teams,
  locations,
  showDepartmentFilter,
  showTeamFilter,
  showLocationFilter,
  roleFilter,
  presenceFilter,
  departmentFilter,
  teamFilter,
  locationFilter,
  setRoleFilter,
  setPresenceFilter,
  setDepartmentFilter,
  setTeamFilter,
  setLocationFilter,
}: FilterContentProps) {
  return (
    <div className="space-y-4">
      {/* Role */}
      <div className="space-y-2">
        <span className="text-sm font-medium" id="filter-role-label">
          Role
        </span>
        <Select
          value={roleFilter}
          onValueChange={(value) => setRoleFilter(value as UserRole | "all")}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select role" />
          </SelectTrigger>
          <SelectContent>
            {ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Status */}
      <div className="space-y-2">
        <span className="text-sm font-medium" id="filter-status-label">
          Status
        </span>
        <Select
          value={presenceFilter}
          onValueChange={(value) =>
            setPresenceFilter(value as PresenceStatus | "all")
          }
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            {PRESENCE_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                <div className="flex items-center gap-2">
                  {option.color && (
                    <span
                      className={cn("h-2 w-2 rounded-full", option.color)}
                    />
                  )}
                  {option.label}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Department */}
      {showDepartmentFilter && departments.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium" id="filter-department-label">
            Department
          </span>
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Team */}
      {showTeamFilter && teams.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium" id="filter-team-label">
            Team
          </span>
          <Select value={teamFilter} onValueChange={setTeamFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select team" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Teams</SelectItem>
              {teams.map((team) => (
                <SelectItem key={team} value={team}>
                  {team}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Location */}
      {showLocationFilter && locations.length > 0 && (
        <div className="space-y-2">
          <span className="text-sm font-medium" id="filter-location-label">
            Location
          </span>
          <Select value={locationFilter} onValueChange={setLocationFilter}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((loc) => (
                <SelectItem key={loc} value={loc}>
                  {loc}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export { UserFilters };
