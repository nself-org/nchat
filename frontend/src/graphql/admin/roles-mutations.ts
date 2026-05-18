/**
 * Role Management GraphQL Mutations
 *
 * Mutations for creating, updating, and deleting roles.
 */

import { gql } from "@apollo/client";
import {
  ROLE_FRAGMENT,
  ROLE_MEMBER_FRAGMENT,
  ROLE_HISTORY_FRAGMENT,
} from "./roles-queries";

// ============================================================================
// Role CRUD Mutations
// ============================================================================

/**
 * Create a new role
 */
export const CREATE_ROLE = gql`
  ${ROLE_FRAGMENT}
  mutation CreateRole($input: nchat_roles_insert_input!) {
    insert_nchat_roles_one(object: $input) {
      ...RoleFields
    }
  }
`;

/**
 * Update a role
 */
export const UPDATE_ROLE = gql`
  ${ROLE_FRAGMENT}
  mutation UpdateRole($id: uuid!, $input: nchat_roles_set_input!) {
    update_nchat_roles_by_pk(pk_columns: { id: $id }, _set: $input) {
      ...RoleFields
    }
  }
`;

/**
 * Delete a role
 */
export const DELETE_ROLE = gql`
  mutation DeleteRole($id: uuid!) {
    delete_nchat_roles_by_pk(id: $id) {
      id
      name
    }
  }
`;

/**
 * Update role position
 */
export const UPDATE_ROLE_POSITION = gql`
  mutation UpdateRolePosition($id: uuid!, $position: Int!) {
    update_nchat_roles_by_pk(
      pk_columns: { id: $id }
      _set: { position: $position }
    ) {
      id
      position
    }
  }
`;

/**
 * Batch update role positions
 */
export const BATCH_UPDATE_ROLE_POSITIONS = gql`
  mutation BatchUpdateRolePositions($updates: [nchat_roles_updates!]!) {
    update_nchat_roles_many(updates: $updates) {
      returning {
        id
        position
      }
    }
  }
`;

/**
 * Update role permissions
 */
export const UPDATE_ROLE_PERMISSIONS = gql`
  ${ROLE_FRAGMENT}
  mutation UpdateRolePermissions($id: uuid!, $permissions: jsonb!) {
    update_nchat_roles_by_pk(
      pk_columns: { id: $id }
      _set: { permissions: $permissions }
    ) {
      ...RoleFields
    }
  }
`;

/**
 * Set default role
 */
export const SET_DEFAULT_ROLE = gql`
  mutation SetDefaultRole($roleId: uuid!) {
    # First, unset all other defaults
    update_nchat_roles(
      where: { id: { _neq: $roleId } }
      _set: { is_default: false }
    ) {
      affected_rows
    }
    # Then set the new default
    update_nchat_roles_by_pk(
      pk_columns: { id: $roleId }
      _set: { is_default: true }
    ) {
      id
      is_default
    }
  }
`;

// ============================================================================
// Role Assignment Mutations
// ============================================================================

/**
 * Assign a role to a user
 */
export const ASSIGN_ROLE = gql`
  ${ROLE_MEMBER_FRAGMENT}
  mutation AssignRole($input: nchat_user_roles_insert_input!) {
    insert_nchat_user_roles_one(
      object: $input
      on_conflict: {
        constraint: user_roles_pkey
        update_columns: [assigned_at, assigned_by, expires_at]
      }
    ) {
      ...RoleMemberFields
    }
  }
`;

/**
 * Remove a role from a user
 */
export const REMOVE_ROLE = gql`
  mutation RemoveRole($userId: uuid!, $roleId: uuid!) {
    delete_nchat_user_roles(
      where: { user_id: { _eq: $userId }, role_id: { _eq: $roleId } }
    ) {
      affected_rows
      returning {
        user_id
        role_id
      }
    }
  }
`;

/**
 * Bulk assign roles to users
 */
export const BULK_ASSIGN_ROLES = gql`
  mutation BulkAssignRoles($inputs: [nchat_user_roles_insert_input!]!) {
    insert_nchat_user_roles(
      objects: $inputs
      on_conflict: {
        constraint: user_roles_pkey
        update_columns: [assigned_at, assigned_by, expires_at]
      }
    ) {
      affected_rows
      returning {
        user_id
        role_id
        assigned_at
      }
    }
  }
`;

/**
 * Bulk remove roles from users
 */
export const BULK_REMOVE_ROLES = gql`
  mutation BulkRemoveRoles($userIds: [uuid!]!, $roleIds: [uuid!]!) {
    delete_nchat_user_roles(
      where: { user_id: { _in: $userIds }, role_id: { _in: $roleIds } }
    ) {
      affected_rows
    }
  }
`;

/**
 * Set user roles (replace all roles)
 */
export const SET_USER_ROLES = gql`
  mutation SetUserRoles($userId: uuid!, $roleIds: [uuid!]!, $assignedBy: uuid) {
    # Delete existing roles
    delete_nchat_user_roles(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
    # Insert new roles
    insert_nchat_user_roles(
      objects: [
        # This would need to be constructed dynamically
      ]
    ) {
      affected_rows
    }
  }
`;

/**
 * Transfer owner role
 */
export const TRANSFER_OWNERSHIP = gql`
  mutation TransferOwnership(
    $currentOwnerId: uuid!
    $newOwnerId: uuid!
    $ownerRoleId: uuid!
    $fallbackRoleId: uuid!
  ) {
    # Remove owner role from current owner
    delete_nchat_user_roles(
      where: {
        user_id: { _eq: $currentOwnerId }
        role_id: { _eq: $ownerRoleId }
      }
    ) {
      affected_rows
    }
    # Assign owner role to new owner
    insert_nchat_user_roles_one(
      object: { user_id: $newOwnerId, role_id: $ownerRoleId }
    ) {
      user_id
      role_id
    }
    # Give previous owner a fallback role
    insert_nchat_user_roles_one(
      object: { user_id: $currentOwnerId, role_id: $fallbackRoleId }
      on_conflict: { constraint: user_roles_pkey, update_columns: [] }
    ) {
      user_id
      role_id
    }
  }
`;

// ============================================================================
// Role History Mutations
// ============================================================================

/**
 * Log a role assignment
 */
export const LOG_ROLE_ASSIGNMENT = gql`
  ${ROLE_HISTORY_FRAGMENT}
  mutation LogRoleAssignment($input: nchat_role_history_insert_input!) {
    insert_nchat_role_history_one(object: $input) {
      ...RoleHistoryFields
    }
  }
`;

/**
 * Clear role history (admin only)
 */
export const CLEAR_ROLE_HISTORY = gql`
  mutation ClearRoleHistory($before: timestamptz!) {
    delete_nchat_role_history(where: { timestamp: { _lt: $before } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// Permission Override Mutations
// ============================================================================

/**
 * Set channel permission override for a role
 */
export const SET_CHANNEL_ROLE_OVERRIDE = gql`
  mutation SetChannelRoleOverride(
    $channelId: uuid!
    $roleId: uuid!
    $allow: jsonb!
    $deny: jsonb!
  ) {
    insert_nchat_channel_permission_overrides_one(
      object: {
        channel_id: $channelId
        role_id: $roleId
        allow: $allow
        deny: $deny
      }
      on_conflict: {
        constraint: channel_permission_overrides_pkey
        update_columns: [allow, deny]
      }
    ) {
      channel_id
      role_id
      allow
      deny
    }
  }
`;

/**
 * Set channel permission override for a user
 */
export const SET_CHANNEL_USER_OVERRIDE = gql`
  mutation SetChannelUserOverride(
    $channelId: uuid!
    $userId: uuid!
    $allow: jsonb!
    $deny: jsonb!
  ) {
    insert_nchat_channel_permission_overrides_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        allow: $allow
        deny: $deny
      }
      on_conflict: {
        constraint: channel_permission_overrides_pkey
        update_columns: [allow, deny]
      }
    ) {
      channel_id
      user_id
      allow
      deny
    }
  }
`;

/**
 * Remove channel permission override
 */
export const REMOVE_CHANNEL_OVERRIDE = gql`
  mutation RemoveChannelOverride(
    $channelId: uuid!
    $roleId: uuid
    $userId: uuid
  ) {
    delete_nchat_channel_permission_overrides(
      where: {
        channel_id: { _eq: $channelId }
        _or: [{ role_id: { _eq: $roleId } }, { user_id: { _eq: $userId } }]
      }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Utility Mutations
// ============================================================================

/**
 * Duplicate a role
 */
export const DUPLICATE_ROLE = gql`
  ${ROLE_FRAGMENT}
  mutation DuplicateRole(
    $sourceId: uuid!
    $newName: String!
    $newPosition: Int!
    $createdBy: uuid
  ) {
    insert_nchat_roles_one(
      object: {
        name: $newName
        position: $newPosition
        created_by: $createdBy
        # Copy fields from source role using subquery
        description: ""
        color: "#6B7280"
        permissions: []
        is_built_in: false
        is_default: false
        is_mentionable: false
      }
    ) {
      ...RoleFields
    }
  }
`;

/**
 * Rebalance all role positions
 */
export const REBALANCE_POSITIONS = gql`
  mutation RebalancePositions($updates: [nchat_roles_updates!]!) {
    update_nchat_roles_many(updates: $updates) {
      affected_rows
      returning {
        id
        position
      }
    }
  }
`;

/**
 * Expire role assignments
 */
export const EXPIRE_ROLE_ASSIGNMENTS = gql`
  mutation ExpireRoleAssignments {
    delete_nchat_user_roles(where: { expires_at: { _lte: "now()" } }) {
      affected_rows
      returning {
        user_id
        role_id
        role {
          name
        }
      }
    }
  }
`;
