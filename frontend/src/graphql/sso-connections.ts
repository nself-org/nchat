import { gql } from "@apollo/client";

// ============================================================================
// SSO Connection GraphQL Operations
// ============================================================================
// GraphQL queries, mutations, and fragments for managing SAML/SSO connections
// stored in the nchat_sso_connections table.

// ============================================================================
// FRAGMENTS
// ============================================================================

/**
 * Basic SSO connection fields fragment
 */
export const SSO_CONNECTION_BASIC_FRAGMENT = gql`
  fragment SSOConnectionBasic on nchat_sso_connections {
    id
    name
    provider
    enabled
    domains
    created_at
    updated_at
  }
`;

/**
 * Full SSO connection fields fragment including config
 */
export const SSO_CONNECTION_FULL_FRAGMENT = gql`
  fragment SSOConnectionFull on nchat_sso_connections {
    id
    name
    provider
    enabled
    domains
    config
    metadata
    created_at
    updated_at
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all SSO connections
 */
export const GET_SSO_CONNECTIONS = gql`
  query GetSSOConnections(
    $limit: Int = 100
    $offset: Int = 0
    $enabledOnly: Boolean = false
  ) {
    nchat_sso_connections(
      where: {
        _or: [{ enabled: { _eq: $enabledOnly } }, { enabled: { _eq: true } }]
      }
      order_by: { name: asc }
      limit: $limit
      offset: $offset
    ) {
      ...SSOConnectionFull
    }
    nchat_sso_connections_aggregate {
      aggregate {
        count
      }
    }
  }
  ${SSO_CONNECTION_FULL_FRAGMENT}
`;

/**
 * Get SSO connection by ID
 */
export const GET_SSO_CONNECTION = gql`
  query GetSSOConnection($id: uuid!) {
    nchat_sso_connections_by_pk(id: $id) {
      ...SSOConnectionFull
    }
  }
  ${SSO_CONNECTION_FULL_FRAGMENT}
`;

/**
 * Get SSO connection by email domain
 * Used to find the correct SSO connection for a user's email
 */
export const GET_SSO_CONNECTION_BY_DOMAIN = gql`
  query GetSSOConnectionByDomain($domain: String!) {
    nchat_sso_connections(
      where: { enabled: { _eq: true }, domains: { _contains: $domain } }
      limit: 1
    ) {
      ...SSOConnectionFull
    }
  }
  ${SSO_CONNECTION_FULL_FRAGMENT}
`;

/**
 * Check if any SSO connection exists for given domains
 */
export const CHECK_SSO_DOMAINS = gql`
  query CheckSSODomains($domains: [String!]!) {
    nchat_sso_connections(
      where: { enabled: { _eq: true }, domains: { _has_keys_any: $domains } }
    ) {
      id
      name
      domains
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Insert (create) a new SSO connection
 */
export const INSERT_SSO_CONNECTION = gql`
  mutation InsertSSOConnection(
    $id: uuid!
    $name: String!
    $provider: String!
    $enabled: Boolean = false
    $domains: jsonb = []
    $config: jsonb!
    $metadata: jsonb = {}
  ) {
    insert_nchat_sso_connections_one(
      object: {
        id: $id
        name: $name
        provider: $provider
        enabled: $enabled
        domains: $domains
        config: $config
        metadata: $metadata
      }
    ) {
      ...SSOConnectionFull
    }
  }
  ${SSO_CONNECTION_FULL_FRAGMENT}
`;

/**
 * Update an existing SSO connection
 */
export const UPDATE_SSO_CONNECTION = gql`
  mutation UpdateSSOConnection(
    $id: uuid!
    $name: String
    $provider: String
    $enabled: Boolean
    $domains: jsonb
    $config: jsonb
    $metadata: jsonb
  ) {
    update_nchat_sso_connections_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        provider: $provider
        enabled: $enabled
        domains: $domains
        config: $config
        metadata: $metadata
        updated_at: "now()"
      }
    ) {
      ...SSOConnectionFull
    }
  }
  ${SSO_CONNECTION_FULL_FRAGMENT}
`;

/**
 * Partial update - update only provided fields
 */
export const PATCH_SSO_CONNECTION = gql`
  mutation PatchSSOConnection(
    $id: uuid!
    $changes: nchat_sso_connections_set_input!
  ) {
    update_nchat_sso_connections_by_pk(
      pk_columns: { id: $id }
      _set: $changes
    ) {
      ...SSOConnectionFull
    }
  }
  ${SSO_CONNECTION_FULL_FRAGMENT}
`;

/**
 * Update only the enabled status
 */
export const TOGGLE_SSO_CONNECTION = gql`
  mutation ToggleSSOConnection($id: uuid!, $enabled: Boolean!) {
    update_nchat_sso_connections_by_pk(
      pk_columns: { id: $id }
      _set: { enabled: $enabled, updated_at: "now()" }
    ) {
      id
      enabled
      updated_at
    }
  }
`;

/**
 * Delete an SSO connection
 */
export const DELETE_SSO_CONNECTION = gql`
  mutation DeleteSSOConnection($id: uuid!) {
    delete_nchat_sso_connections_by_pk(id: $id) {
      id
      name
    }
  }
`;

// ============================================================================
// USER QUERIES FOR SSO PROVISIONING
// ============================================================================

/**
 * Get user by email for SSO provisioning check
 */
export const GET_USER_BY_EMAIL_FOR_SSO = gql`
  query GetUserByEmailForSSO($email: String!) {
    nchat_users(where: { email: { _eq: $email } }, limit: 1) {
      id
      email
      username
      display_name
      avatar_url
      role_id
      is_active
      metadata
      created_at
      updated_at
      role {
        id
        name
      }
    }
  }
`;

/**
 * Get role by name (for SSO role mapping)
 */
export const GET_ROLE_BY_NAME = gql`
  query GetRoleByName($name: String!) {
    nchat_roles(where: { name: { _eq: $name } }, limit: 1) {
      id
      name
      permissions
    }
  }
`;

// ============================================================================
// USER MUTATIONS FOR SSO PROVISIONING
// ============================================================================

/**
 * Create a new user via SSO JIT provisioning
 */
export const INSERT_SSO_USER = gql`
  mutation InsertSSOUser(
    $id: uuid!
    $email: String!
    $username: String!
    $displayName: String!
    $roleId: uuid
    $metadata: jsonb = {}
  ) {
    insert_nchat_users_one(
      object: {
        id: $id
        email: $email
        username: $username
        display_name: $displayName
        role_id: $roleId
        email_verified: true
        status: "active"
        metadata: $metadata
      }
    ) {
      id
      email
      username
      display_name
      role_id
      is_active
      metadata
      created_at
      role {
        id
        name
      }
    }
  }
`;

/**
 * Update existing user attributes from SSO assertion
 */
export const UPDATE_SSO_USER = gql`
  mutation UpdateSSOUser(
    $id: uuid!
    $displayName: String
    $roleId: uuid
    $metadata: jsonb
  ) {
    update_nchat_users_by_pk(
      pk_columns: { id: $id }
      _set: {
        display_name: $displayName
        role_id: $roleId
        updated_at: "now()"
      }
      _append: { metadata: $metadata }
    ) {
      id
      email
      username
      display_name
      role_id
      is_active
      metadata
      updated_at
      role {
        id
        name
      }
    }
  }
`;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface SSOConnectionRow {
  id: string;
  name: string;
  provider: string;
  enabled: boolean;
  domains: string[];
  config: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface GetSSOConnectionsResult {
  nchat_sso_connections: SSOConnectionRow[];
  nchat_sso_connections_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface GetSSOConnectionResult {
  nchat_sso_connections_by_pk: SSOConnectionRow | null;
}

export interface GetSSOConnectionByDomainResult {
  nchat_sso_connections: SSOConnectionRow[];
}

export interface InsertSSOConnectionResult {
  insert_nchat_sso_connections_one: SSOConnectionRow;
}

export interface UpdateSSOConnectionResult {
  update_nchat_sso_connections_by_pk: SSOConnectionRow | null;
}

export interface DeleteSSOConnectionResult {
  delete_nchat_sso_connections_by_pk: {
    id: string;
    name: string;
  } | null;
}

export interface SSOUserRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  role_id: string | null;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  role?: {
    id: string;
    name: string;
  };
}

export interface GetUserByEmailResult {
  nchat_users: SSOUserRow[];
}

export interface GetRoleByNameResult {
  nchat_roles: Array<{
    id: string;
    name: string;
    permissions: number;
  }>;
}

export interface InsertSSOUserResult {
  insert_nchat_users_one: SSOUserRow;
}

export interface UpdateSSOUserResult {
  update_nchat_users_by_pk: SSOUserRow | null;
}
