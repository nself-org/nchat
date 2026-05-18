/**
 * User Directory Logic
 *
 * Functions for managing user directory operations including filtering,
 * sorting, grouping, and searching users.
 */

import {
  type UserProfile,
  type UserRole,
  type PresenceStatus,
} from "@/stores/user-store";
import { type ExtendedUserProfile } from "@/components/users/UserCard";

// ============================================================================
// Types
// ============================================================================

export interface DirectoryFilters {
  searchQuery: string;
  roleFilter: UserRole | "all";
  presenceFilter: PresenceStatus | "all";
  departmentFilter: string;
  teamFilter: string;
  locationFilter: string;
}

export interface SortOptions {
  field:
    | "displayName"
    | "username"
    | "role"
    | "presence"
    | "lastSeen"
    | "createdAt";
  direction: "asc" | "desc";
}

export interface GroupOptions {
  by: "none" | "role" | "department" | "team" | "location" | "letter";
}

export interface DirectoryStats {
  total: number;
  online: number;
  away: number;
  dnd: number;
  offline: number;
  byRole: Record<UserRole, number>;
  byDepartment: Record<string, number>;
}

// ============================================================================
// Filter Functions
// ============================================================================

/**
 * Filter users based on search query
 */
export function filterBySearch(
  users: ExtendedUserProfile[],
  query: string,
): ExtendedUserProfile[] {
  if (!query.trim()) return users;

  const normalizedQuery = query.toLowerCase().trim();

  return users.filter((user) => {
    const searchableFields = [
      user.displayName,
      user.username,
      user.email,
      user.title,
      user.department,
      user.team,
      user.bio,
      user.location,
    ];

    return searchableFields.some((field) =>
      field?.toLowerCase().includes(normalizedQuery),
    );
  });
}

/**
 * Filter users by role
 */
export function filterByRole(
  users: ExtendedUserProfile[],
  role: UserRole | "all",
): ExtendedUserProfile[] {
  if (role === "all") return users;
  return users.filter((user) => user.role === role);
}

/**
 * Filter users by presence status
 */
export function filterByPresence(
  users: ExtendedUserProfile[],
  presence: PresenceStatus | "all",
): ExtendedUserProfile[] {
  if (presence === "all") return users;
  return users.filter((user) => user.presence === presence);
}

/**
 * Filter users by department
 */
export function filterByDepartment(
  users: ExtendedUserProfile[],
  department: string,
): ExtendedUserProfile[] {
  if (!department || department === "all") return users;
  return users.filter((user) => user.department === department);
}

/**
 * Filter users by team
 */
export function filterByTeam(
  users: ExtendedUserProfile[],
  team: string,
): ExtendedUserProfile[] {
  if (!team || team === "all") return users;
  return users.filter((user) => user.team === team);
}

/**
 * Filter users by location
 */
export function filterByLocation(
  users: ExtendedUserProfile[],
  location: string,
): ExtendedUserProfile[] {
  if (!location || location === "all") return users;
  return users.filter((user) => user.location === location);
}

/**
 * Apply all filters to a user list
 */
export function applyFilters(
  users: ExtendedUserProfile[],
  filters: DirectoryFilters,
): ExtendedUserProfile[] {
  let result = [...users];

  result = filterBySearch(result, filters.searchQuery);
  result = filterByRole(result, filters.roleFilter);
  result = filterByPresence(result, filters.presenceFilter);
  result = filterByDepartment(result, filters.departmentFilter);
  result = filterByTeam(result, filters.teamFilter);
  result = filterByLocation(result, filters.locationFilter);

  return result;
}

// ============================================================================
// Sort Functions
// ============================================================================

/**
 * Get presence priority for sorting (online first)
 */
function getPresencePriority(presence: PresenceStatus): number {
  const priorities: Record<PresenceStatus, number> = {
    online: 0,
    away: 1,
    dnd: 2,
    invisible: 3,
    offline: 3,
  };
  return priorities[presence] ?? 4;
}

/**
 * Get role priority for sorting
 */
function getRolePriority(role: UserRole): number {
  const priorities: Record<UserRole, number> = {
    owner: 0,
    admin: 1,
    moderator: 2,
    member: 3,
    guest: 4,
  };
  return priorities[role] ?? 5;
}

/**
 * Sort users by specified field and direction
 */
export function sortUsers(
  users: ExtendedUserProfile[],
  options: SortOptions,
): ExtendedUserProfile[] {
  const { field, direction } = options;
  const multiplier = direction === "asc" ? 1 : -1;

  return [...users].sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case "displayName":
        comparison = a.displayName.localeCompare(b.displayName);
        break;
      case "username":
        comparison = a.username.localeCompare(b.username);
        break;
      case "role":
        comparison = getRolePriority(a.role) - getRolePriority(b.role);
        break;
      case "presence":
        comparison =
          getPresencePriority(a.presence) - getPresencePriority(b.presence);
        break;
      case "lastSeen":
        const aTime = a.lastSeenAt?.getTime() ?? 0;
        const bTime = b.lastSeenAt?.getTime() ?? 0;
        comparison = aTime - bTime;
        break;
      case "createdAt":
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      default:
        comparison = 0;
    }

    return comparison * multiplier;
  });
}

/**
 * Default sort: online users first, then by display name
 */
export function defaultSort(
  users: ExtendedUserProfile[],
): ExtendedUserProfile[] {
  return [...users].sort((a, b) => {
    const presenceDiff =
      getPresencePriority(a.presence) - getPresencePriority(b.presence);
    if (presenceDiff !== 0) return presenceDiff;
    return a.displayName.localeCompare(b.displayName);
  });
}

// ============================================================================
// Group Functions
// ============================================================================

/**
 * Group users by specified criteria
 */
export function groupUsers(
  users: ExtendedUserProfile[],
  options: GroupOptions,
): Record<string, ExtendedUserProfile[]> {
  if (options.by === "none") {
    return { "All Users": users };
  }

  const groups: Record<string, ExtendedUserProfile[]> = {};

  users.forEach((user) => {
    let key: string;

    switch (options.by) {
      case "role":
        key = user.role.charAt(0).toUpperCase() + user.role.slice(1);
        break;
      case "department":
        key = user.department || "No Department";
        break;
      case "team":
        key = user.team || "No Team";
        break;
      case "location":
        key = user.location || "No Location";
        break;
      case "letter":
        key = user.displayName.charAt(0).toUpperCase();
        break;
      default:
        key = "Other";
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(user);
  });

  // Sort keys alphabetically
  const sortedGroups: Record<string, ExtendedUserProfile[]> = {};
  Object.keys(groups)
    .sort((a, b) => a.localeCompare(b))
    .forEach((key) => {
      sortedGroups[key] = groups[key];
    });

  return sortedGroups;
}

// ============================================================================
// Statistics Functions
// ============================================================================

/**
 * Calculate directory statistics
 */
export function calculateStats(users: ExtendedUserProfile[]): DirectoryStats {
  const stats: DirectoryStats = {
    total: users.length,
    online: 0,
    away: 0,
    dnd: 0,
    offline: 0,
    byRole: {
      owner: 0,
      admin: 0,
      moderator: 0,
      member: 0,
      guest: 0,
    },
    byDepartment: {},
  };

  users.forEach((user) => {
    // Count by presence
    switch (user.presence) {
      case "online":
        stats.online++;
        break;
      case "away":
        stats.away++;
        break;
      case "dnd":
        stats.dnd++;
        break;
      case "offline":
        stats.offline++;
        break;
    }

    // Count by role
    stats.byRole[user.role]++;

    // Count by department
    if (user.department) {
      stats.byDepartment[user.department] =
        (stats.byDepartment[user.department] || 0) + 1;
    }
  });

  return stats;
}

/**
 * Extract unique departments from user list
 */
export function extractDepartments(users: ExtendedUserProfile[]): string[] {
  const departments = new Set<string>();
  users.forEach((user) => {
    if (user.department) {
      departments.add(user.department);
    }
  });
  return Array.from(departments).sort();
}

/**
 * Extract unique teams from user list
 */
export function extractTeams(users: ExtendedUserProfile[]): string[] {
  const teams = new Set<string>();
  users.forEach((user) => {
    if (user.team) {
      teams.add(user.team);
    }
  });
  return Array.from(teams).sort();
}

/**
 * Extract unique locations from user list
 */
export function extractLocations(users: ExtendedUserProfile[]): string[] {
  const locations = new Set<string>();
  users.forEach((user) => {
    if (user.location) {
      locations.add(user.location);
    }
  });
  return Array.from(locations).sort();
}
