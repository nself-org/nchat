/**
 * GraphQL Queries and Mutations for Per-App RBAC/ACL
 */

import { gql } from "@apollo/client";

/**
 * Get all apps
 */
export const GET_APPS = gql`
  query GetApps {
    apps(where: { is_active: { _eq: true } }, order_by: { app_name: asc }) {
      id
      app_id
      app_name
      app_url
      is_active
      created_at
      updated_at
    }
  }
`;

/**
 * Get a specific app by app_id
 */
export const GET_APP = gql`
  query GetApp($appId: String!) {
    apps(where: { app_id: { _eq: $appId } }) {
      id
      app_id
      app_name
      app_url
      is_active
      created_at
      updated_at
    }
  }
`;

/**
 * Get user's roles for a specific app
 */
export const GET_USER_APP_ROLES = gql`
  query GetUserAppRoles($userId: uuid!, $appId: String!) {
    app_user_roles(
      where: {
        user_id: { _eq: $userId }
        app_id: { _eq: $appId }
        _or: [
          { expires_at: { _is_null: true } }
          { expires_at: { _gt: "now()" } }
        ]
      }
      order_by: { granted_at: desc }
    ) {
      id
      app_id
      user_id
      role
      granted_by
      granted_at
      expires_at
      created_at
      updated_at
    }
  }
`;

/**
 * Get all roles for a user across all apps
 */
export const GET_USER_ALL_APP_ROLES = gql`
  query GetUserAllAppRoles($userId: uuid!) {
    app_user_roles(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { expires_at: { _is_null: true } }
          { expires_at: { _gt: "now()" } }
        ]
      }
      order_by: { app_id: asc, granted_at: desc }
    ) {
      id
      app_id
      user_id
      role
      granted_by
      granted_at
      expires_at
      created_at
      updated_at
    }
  }
`;

/**
 * Get permissions for a role in an app
 */
export const GET_APP_ROLE_PERMISSIONS = gql`
  query GetAppRolePermissions($appId: String!, $role: String!) {
    app_role_permissions(
      where: { app_id: { _eq: $appId }, role: { _eq: $role } }
    ) {
      id
      app_id
      role
      permission
      resource
      created_at
    }
  }
`;

/**
 * Get all permissions for a user in an app
 */
export const GET_USER_APP_PERMISSIONS = gql`
  query GetUserAppPermissions($userId: uuid!, $appId: String!) {
    app_role_permissions(
      where: {
        app_id: { _eq: $appId }
        role: {
          _in: {
            _query: {
              app_user_roles: {
                where: {
                  user_id: { _eq: $userId }
                  app_id: { _eq: $appId }
                  _or: [
                    { expires_at: { _is_null: true } }
                    { expires_at: { _gt: "now()" } }
                  ]
                }
              }
            }
            _path: "role"
          }
        }
      }
    ) {
      id
      app_id
      role
      permission
      resource
      created_at
    }
  }
`;

/**
 * Check if user has a specific role using the database function
 */
export const CHECK_USER_HAS_ROLE = gql`
  query CheckUserHasRole($userId: uuid!, $appId: String!, $role: String!) {
    user_has_app_role(
      args: { p_user_id: $userId, p_app_id: $appId, p_role: $role }
    )
  }
`;

/**
 * Check if user has a specific permission using the database function
 */
export const CHECK_USER_HAS_PERMISSION = gql`
  query CheckUserHasPermission(
    $userId: uuid!
    $appId: String!
    $permission: String!
    $resource: String
  ) {
    user_has_app_permission(
      args: {
        p_user_id: $userId
        p_app_id: $appId
        p_permission: $permission
        p_resource: $resource
      }
    )
  }
`;

/**
 * Grant a role to a user
 */
export const GRANT_USER_ROLE = gql`
  mutation GrantUserRole(
    $appId: String!
    $userId: uuid!
    $role: String!
    $grantedBy: uuid
    $expiresAt: timestamptz
  ) {
    insert_app_user_roles_one(
      object: {
        app_id: $appId
        user_id: $userId
        role: $role
        granted_by: $grantedBy
        expires_at: $expiresAt
      }
      on_conflict: {
        constraint: app_user_roles_app_id_user_id_role_key
        update_columns: [granted_by, granted_at, expires_at, updated_at]
      }
    ) {
      id
      app_id
      user_id
      role
      granted_by
      granted_at
      expires_at
      created_at
      updated_at
    }
  }
`;

/**
 * Revoke a role from a user
 */
export const REVOKE_USER_ROLE = gql`
  mutation RevokeUserRole($appId: String!, $userId: uuid!, $role: String!) {
    delete_app_user_roles(
      where: {
        app_id: { _eq: $appId }
        user_id: { _eq: $userId }
        role: { _eq: $role }
      }
    ) {
      affected_rows
    }
  }
`;

/**
 * Add a permission to a role
 */
export const ADD_ROLE_PERMISSION = gql`
  mutation AddRolePermission(
    $appId: String!
    $role: String!
    $permission: String!
    $resource: String
  ) {
    insert_app_role_permissions_one(
      object: {
        app_id: $appId
        role: $role
        permission: $permission
        resource: $resource
      }
      on_conflict: {
        constraint: app_role_permissions_app_id_role_permission_resource_key
        update_columns: []
      }
    ) {
      id
      app_id
      role
      permission
      resource
      created_at
    }
  }
`;

/**
 * Remove a permission from a role
 */
export const REMOVE_ROLE_PERMISSION = gql`
  mutation RemoveRolePermission(
    $appId: String!
    $role: String!
    $permission: String!
    $resource: String
  ) {
    delete_app_role_permissions(
      where: {
        app_id: { _eq: $appId }
        role: { _eq: $role }
        permission: { _eq: $permission }
        resource: { _eq: $resource }
      }
    ) {
      affected_rows
    }
  }
`;

/**
 * Register a new app
 */
export const REGISTER_APP = gql`
  mutation RegisterApp($appId: String!, $appName: String!, $appUrl: String) {
    insert_apps_one(
      object: {
        app_id: $appId
        app_name: $appName
        app_url: $appUrl
        is_active: true
      }
      on_conflict: {
        constraint: apps_app_id_key
        update_columns: [app_name, app_url, updated_at]
      }
    ) {
      id
      app_id
      app_name
      app_url
      is_active
      created_at
      updated_at
    }
  }
`;

/**
 * Deactivate an app
 */
export const DEACTIVATE_APP = gql`
  mutation DeactivateApp($appId: String!) {
    update_apps(
      where: { app_id: { _eq: $appId } }
      _set: { is_active: false }
    ) {
      affected_rows
    }
  }
`;
