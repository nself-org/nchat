/**
 * Organization Chart Logic
 *
 * Functions for building and managing organization chart data structures
 * including hierarchy building, navigation, and layout calculations.
 */

import { type ExtendedUserProfile } from "@/components/users/UserCard";
import { type OrgNode } from "@/components/users/OrganizationChart";

// ============================================================================
// Types
// ============================================================================

export interface OrgRelationship {
  userId: string;
  managerId: string | null;
}

export interface OrgChartOptions {
  expandDepth?: number;
  sortByName?: boolean;
  includeVacant?: boolean;
}

export interface OrgChartStats {
  totalNodes: number;
  maxDepth: number;
  directReportCounts: Record<string, number>;
  averageSpan: number;
}

// ============================================================================
// Build Functions
// ============================================================================

/**
 * Build organization chart tree from user list and relationships
 */
export function buildOrgChart(
  users: ExtendedUserProfile[],
  relationships: OrgRelationship[],
  options: OrgChartOptions = {},
): OrgNode | null {
  const { expandDepth = Infinity, sortByName = true } = options;

  // Create user lookup map
  const userMap = new Map<string, ExtendedUserProfile>();
  users.forEach((user) => userMap.set(user.id, user));

  // Create relationship lookup (userId -> managerId)
  const managerMap = new Map<string, string | null>();
  relationships.forEach((rel) => managerMap.set(rel.userId, rel.managerId));

  // Find root user (no manager)
  const rootRelation = relationships.find((rel) => rel.managerId === null);
  if (!rootRelation) return null;

  const rootUser = userMap.get(rootRelation.userId);
  if (!rootUser) return null;

  // Build tree recursively
  function buildNode(userId: string, depth: number): OrgNode | null {
    const user = userMap.get(userId);
    if (!user) return null;

    // Find direct reports
    const directReportIds = relationships
      .filter((rel) => rel.managerId === userId)
      .map((rel) => rel.userId);

    // Build direct report nodes
    let directReports: OrgNode[] = directReportIds
      .map((id) => buildNode(id, depth + 1))
      .filter((node): node is OrgNode => node !== null);

    // Sort by name if requested
    if (sortByName) {
      directReports = directReports.sort((a, b) =>
        a.user.displayName.localeCompare(b.user.displayName),
      );
    }

    return {
      user,
      directReports,
      isExpanded: depth < expandDepth,
    };
  }

  return buildNode(rootRelation.userId, 0);
}

/**
 * Build org chart from flat hierarchy data (title-based)
 */
export function buildOrgChartFromTitles(
  users: ExtendedUserProfile[],
  hierarchyOrder: string[] = ["owner", "admin", "moderator", "member", "guest"],
): OrgNode | null {
  if (users.length === 0) return null;

  // Group users by role
  const usersByRole = new Map<string, ExtendedUserProfile[]>();
  users.forEach((user) => {
    const role = user.role || "member";
    if (!usersByRole.has(role)) {
      usersByRole.set(role, []);
    }
    usersByRole.get(role)!.push(user);
  });

  // Find top-level users based on hierarchy
  let rootRole: string | undefined;
  for (const role of hierarchyOrder) {
    if (usersByRole.has(role) && usersByRole.get(role)!.length > 0) {
      rootRole = role;
      break;
    }
  }

  if (!rootRole) return null;

  const rootUsers = usersByRole.get(rootRole)!;
  if (rootUsers.length === 0) return null;

  // Build simple hierarchy based on roles
  function buildNodeForRole(roleIndex: number): OrgNode[] {
    if (roleIndex >= hierarchyOrder.length) return [];

    const role = hierarchyOrder[roleIndex];
    const roleUsers = usersByRole.get(role) || [];

    return roleUsers.map((user) => ({
      user,
      directReports: buildNodeForRole(roleIndex + 1),
      isExpanded: true,
    }));
  }

  // If single root, use them
  if (rootUsers.length === 1) {
    const rootIndex = hierarchyOrder.indexOf(rootRole);
    return {
      user: rootUsers[0],
      directReports: buildNodeForRole(rootIndex + 1),
      isExpanded: true,
    };
  }

  // Multiple roots - create virtual root
  return {
    user: rootUsers[0],
    directReports: rootUsers.slice(1).map((user) => ({
      user,
      directReports: [],
      isExpanded: true,
    })),
    isExpanded: true,
  };
}

// ============================================================================
// Navigation Functions
// ============================================================================

/**
 * Find a user's node in the org chart
 */
export function findNodeByUserId(
  root: OrgNode,
  userId: string,
): OrgNode | null {
  if (root.user.id === userId) return root;

  for (const child of root.directReports) {
    const found = findNodeByUserId(child, userId);
    if (found) return found;
  }

  return null;
}

/**
 * Get the path to a user (list of ancestor nodes)
 */
export function getPathToUser(root: OrgNode, userId: string): OrgNode[] {
  function findPath(node: OrgNode, path: OrgNode[]): OrgNode[] | null {
    const currentPath = [...path, node];

    if (node.user.id === userId) {
      return currentPath;
    }

    for (const child of node.directReports) {
      const result = findPath(child, currentPath);
      if (result) return result;
    }

    return null;
  }

  return findPath(root, []) || [];
}

/**
 * Get all ancestors of a user
 */
export function getAncestors(
  root: OrgNode,
  userId: string,
): ExtendedUserProfile[] {
  const path = getPathToUser(root, userId);
  return path.slice(0, -1).map((node) => node.user);
}

/**
 * Get all descendants of a user
 */
export function getDescendants(node: OrgNode): ExtendedUserProfile[] {
  const descendants: ExtendedUserProfile[] = [];

  function collect(n: OrgNode) {
    n.directReports.forEach((child) => {
      descendants.push(child.user);
      collect(child);
    });
  }

  collect(node);
  return descendants;
}

/**
 * Get siblings (users with same manager)
 */
export function getSiblings(
  root: OrgNode,
  userId: string,
): ExtendedUserProfile[] {
  const path = getPathToUser(root, userId);

  if (path.length < 2) return [];

  const parent = path[path.length - 2];
  return parent.directReports
    .filter((node) => node.user.id !== userId)
    .map((node) => node.user);
}

// ============================================================================
// Manipulation Functions
// ============================================================================

/**
 * Toggle expansion state of a node
 */
export function toggleNodeExpansion(root: OrgNode, userId: string): OrgNode {
  if (root.user.id === userId) {
    return { ...root, isExpanded: !root.isExpanded };
  }

  return {
    ...root,
    directReports: root.directReports.map((child) =>
      toggleNodeExpansion(child, userId),
    ),
  };
}

/**
 * Expand all nodes to a certain depth
 */
export function expandToDepth(root: OrgNode, depth: number): OrgNode {
  function expand(node: OrgNode, currentDepth: number): OrgNode {
    return {
      ...node,
      isExpanded: currentDepth < depth,
      directReports: node.directReports.map((child) =>
        expand(child, currentDepth + 1),
      ),
    };
  }

  return expand(root, 0);
}

/**
 * Expand all nodes
 */
export function expandAll(root: OrgNode): OrgNode {
  return expandToDepth(root, Infinity);
}

/**
 * Collapse all nodes
 */
export function collapseAll(root: OrgNode): OrgNode {
  return expandToDepth(root, 0);
}

/**
 * Expand path to a specific user
 */
export function expandPathToUser(root: OrgNode, userId: string): OrgNode {
  const path = getPathToUser(root, userId);
  const pathIds = new Set(path.map((node) => node.user.id));

  function expandInPath(node: OrgNode): OrgNode {
    return {
      ...node,
      isExpanded: pathIds.has(node.user.id),
      directReports: node.directReports.map(expandInPath),
    };
  }

  return expandInPath(root);
}

// ============================================================================
// Statistics Functions
// ============================================================================

/**
 * Calculate organization chart statistics
 */
export function calculateOrgStats(root: OrgNode): OrgChartStats {
  const directReportCounts: Record<string, number> = {};
  let totalNodes = 0;
  let maxDepth = 0;
  let totalReports = 0;
  let nodesWithReports = 0;

  function traverse(node: OrgNode, depth: number) {
    totalNodes++;
    maxDepth = Math.max(maxDepth, depth);

    const reportCount = node.directReports.length;
    directReportCounts[node.user.id] = reportCount;

    if (reportCount > 0) {
      totalReports += reportCount;
      nodesWithReports++;
    }

    node.directReports.forEach((child) => traverse(child, depth + 1));
  }

  traverse(root, 0);

  return {
    totalNodes,
    maxDepth,
    directReportCounts,
    averageSpan: nodesWithReports > 0 ? totalReports / nodesWithReports : 0,
  };
}

/**
 * Get depth of a specific user
 */
export function getUserDepth(root: OrgNode, userId: string): number {
  const path = getPathToUser(root, userId);
  return path.length - 1;
}

/**
 * Get all users at a specific depth
 */
export function getUsersAtDepth(
  root: OrgNode,
  depth: number,
): ExtendedUserProfile[] {
  const users: ExtendedUserProfile[] = [];

  function traverse(node: OrgNode, currentDepth: number) {
    if (currentDepth === depth) {
      users.push(node.user);
    } else if (currentDepth < depth) {
      node.directReports.forEach((child) => traverse(child, currentDepth + 1));
    }
  }

  traverse(root, 0);
  return users;
}

// ============================================================================
// Serialization Functions
// ============================================================================

/**
 * Convert org chart to flat list of relationships
 */
export function orgChartToRelationships(root: OrgNode): OrgRelationship[] {
  const relationships: OrgRelationship[] = [
    { userId: root.user.id, managerId: null },
  ];

  function traverse(node: OrgNode) {
    node.directReports.forEach((child) => {
      relationships.push({
        userId: child.user.id,
        managerId: node.user.id,
      });
      traverse(child);
    });
  }

  traverse(root);
  return relationships;
}

/**
 * Convert org chart to flat list of users
 */
export function orgChartToUserList(root: OrgNode): ExtendedUserProfile[] {
  const users: ExtendedUserProfile[] = [root.user];

  function traverse(node: OrgNode) {
    node.directReports.forEach((child) => {
      users.push(child.user);
      traverse(child);
    });
  }

  traverse(root);
  return users;
}
