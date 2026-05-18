/**
 * Role Management GraphQL Queries
 *
 * Queries for fetching roles, permissions, and related data.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Role Fragments
// ============================================================================

export const ROLE_FRAGMENT = gql`
  fragment RoleFields on nchat_roles {
    id
    name
    description
    color
    icon
    position
    is_built_in
    is_default
    is_mentionable
    permissions
    created_at
    updated_at
    created_by
    members_aggregate {
      aggregate {
        count
      }
    }
  }
`;

export const ROLE_MEMBER_FRAGMENT = gql`
  fragment RoleMemberFields on nchat_user_roles {
    user_id
    role_id
    assigned_at
    assigned_by
    expires_at
    user {
      id
      username
      display_name
      avatar_url
      email
    }
  }
`;

export const ROLE_HISTORY_FRAGMENT = gql`
  fragment RoleHistoryFields on nchat_role_history {
    id
    user_id
    role_id
    role_name
    action
    performed_by
    performed_by_user {
      username
      display_name
    }
    timestamp
    reason
  }
`;

// ============================================================================
// Role Queries
// ============================================================================

/**
 * Get all roles
 */
export const GET_ROLES = gql`
  ${ROLE_FRAGMENT}
  query GetRoles($orderBy: [nchat_roles_order_by!] = { position: desc }) {
    nchat_roles(order_by: $orderBy) {
      ...RoleFields
    }
  }
`;

/**
 * Get a single role by ID
 */
export const GET_ROLE = gql`
  ${ROLE_FRAGMENT}
  query GetRole($id: uuid!) {
    nchat_roles_by_pk(id: $id) {
      ...RoleFields
    }
  }
`;

/**
 * Get role by name
 */
export const GET_ROLE_BY_NAME = gql`
  ${ROLE_FRAGMENT}
  query GetRoleByName($name: String!) {
    nchat_roles(where: { name: { _ilike: $name } }) {
      ...RoleFields
    }
  }
`;

/**
 * Get default role
 */
export const GET_DEFAULT_ROLE = gql`
  ${ROLE_FRAGMENT}
  query GetDefaultRole {
    nchat_roles(where: { is_default: { _eq: true } }) {
      ...RoleFields
    }
  }
`;

/**
 * Get built-in roles
 */
export const GET_BUILT_IN_ROLES = gql`
  ${ROLE_FRAGMENT}
  query GetBuiltInRoles {
    nchat_roles(
      where: { is_built_in: { _eq: true } }
      order_by: { position: desc }
    ) {
      ...RoleFields
    }
  }
`;

/**
 * Get custom roles
 */
export const GET_CUSTOM_ROLES = gql`
  ${ROLE_FRAGMENT}
  query GetCustomRoles {
    nchat_roles(
      where: { is_built_in: { _eq: false } }
      order_by: { position: desc }
    ) {
      ...RoleFields
    }
  }
`;

/**
 * Search roles
 */
export const SEARCH_ROLES = gql`
  ${ROLE_FRAGMENT}
  query SearchRoles($search: String!) {
    nchat_roles(
      where: {
        _or: [
          { name: { _ilike: $search } }
          { description: { _ilike: $search } }
        ]
      }
      order_by: { position: desc }
    ) {
      ...RoleFields
    }
  }
`;

// ============================================================================
// Role Members Queries
// ============================================================================

/**
 * Get members of a role
 */
export const GET_ROLE_MEMBERS = gql`
  ${ROLE_MEMBER_FRAGMENT}
  query GetRoleMembers($roleId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_user_roles(
      where: { role_id: { _eq: $roleId } }
      limit: $limit
      offset: $offset
      order_by: { assigned_at: desc }
    ) {
      ...RoleMemberFields
    }
    nchat_user_roles_aggregate(where: { role_id: { _eq: $roleId } }) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get roles for a user
 */
export const GET_USER_ROLES = gql`
  ${ROLE_FRAGMENT}
  query GetUserRoles($userId: uuid!) {
    nchat_user_roles(
      where: { user_id: { _eq: $userId } }
      order_by: { role: { position: desc } }
    ) {
      assigned_at
      assigned_by
      expires_at
      role {
        ...RoleFields
      }
    }
  }
`;

/**
 * Check if user has a specific role
 */
export const CHECK_USER_ROLE = gql`
  query CheckUserRole($userId: uuid!, $roleId: uuid!) {
    nchat_user_roles(
      where: { user_id: { _eq: $userId }, role_id: { _eq: $roleId } }
    ) {
      role_id
      assigned_at
    }
  }
`;

/**
 * Get users with a specific permission
 */
export const GET_USERS_WITH_PERMISSION = gql`
  query GetUsersWithPermission($permission: String!) {
    nchat_user_roles(
      where: { role: { permissions: { _contains: [$permission] } } }
    ) {
      user_id
      user {
        id
        username
        display_name
        avatar_url
      }
      role {
        id
        name
        color
      }
    }
  }
`;

// ============================================================================
// Role History Queries
// ============================================================================

/**
 * Get role history for a user
 */
export const GET_USER_ROLE_HISTORY = gql`
  ${ROLE_HISTORY_FRAGMENT}
  query GetUserRoleHistory($userId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_role_history(
      where: { user_id: { _eq: $userId } }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      ...RoleHistoryFields
    }
    nchat_role_history_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get role history for a role
 */
export const GET_ROLE_HISTORY = gql`
  ${ROLE_HISTORY_FRAGMENT}
  query GetRoleHistory($roleId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_role_history(
      where: { role_id: { _eq: $roleId } }
      order_by: { timestamp: desc }
      limit: $limit
      offset: $offset
    ) {
      ...RoleHistoryFields
    }
    nchat_role_history_aggregate(where: { role_id: { _eq: $roleId } }) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get recent role changes
 */
export const GET_RECENT_ROLE_CHANGES = gql`
  ${ROLE_HISTORY_FRAGMENT}
  query GetRecentRoleChanges($limit: Int = 20) {
    nchat_role_history(order_by: { timestamp: desc }, limit: $limit) {
      ...RoleHistoryFields
      user {
        username
        display_name
        avatar_url
      }
    }
  }
`;

// ============================================================================
// Permission Queries
// ============================================================================

/**
 * Get all available permissions
 */
export const GET_PERMISSIONS = gql`
  query GetPermissions {
    nchat_permissions {
      id
      name
      description
      category
      is_dangerous
      requires_admin
    }
  }
`;

/**
 * Get permissions by category
 */
export const GET_PERMISSIONS_BY_CATEGORY = gql`
  query GetPermissionsByCategory($category: String!) {
    nchat_permissions(where: { category: { _eq: $category } }) {
      id
      name
      description
      is_dangerous
      requires_admin
    }
  }
`;

// ============================================================================
// Statistics Queries
// ============================================================================

/**
 * Get role statistics
 */
export const GET_ROLE_STATS = gql`
  query GetRoleStats {
    total: nchat_roles_aggregate {
      aggregate {
        count
      }
    }
    built_in: nchat_roles_aggregate(where: { is_built_in: { _eq: true } }) {
      aggregate {
        count
      }
    }
    custom: nchat_roles_aggregate(where: { is_built_in: { _eq: false } }) {
      aggregate {
        count
      }
    }
    with_members: nchat_roles(where: { members: {} }) {
      id
      members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

/**
 * Get permission usage stats
 */
export const GET_PERMISSION_USAGE = gql`
  query GetPermissionUsage {
    nchat_roles {
      id
      name
      permissions
    }
  }
`;
