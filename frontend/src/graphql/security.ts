/**
 * Security GraphQL Operations
 *
 * Handles authentication security, session management, 2FA, and login history
 */

import { gql } from "@apollo/client";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Session {
  id: string;
  userId: string;
  device: string;
  browser: string;
  os: string;
  ipAddress: string;
  location?: {
    city?: string;
    country?: string;
    region?: string;
  };
  isCurrent: boolean;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
}

export interface LoginAttempt {
  id: string;
  userId: string;
  success: boolean;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  location?: {
    city?: string;
    country?: string;
    region?: string;
  };
  failureReason?: string;
  createdAt: string;
}

export interface TwoFactorSetup {
  secret: string;
  qrCodeUrl: string;
  backupCodes: string[];
}

export interface ChangePasswordVariables {
  userId: string;
  currentPassword: string;
  newPassword: string;
}

export interface Setup2FAVariables {
  userId: string;
}

export interface Verify2FAVariables {
  userId: string;
  code: string;
  secret: string;
}

export interface Disable2FAVariables {
  userId: string;
  password: string;
}

export interface GetSessionsVariables {
  userId: string;
}

export interface RevokeSessionVariables {
  sessionId: string;
}

export interface RevokeAllSessionsVariables {
  userId: string;
  exceptCurrent?: boolean;
}

export interface GetLoginHistoryVariables {
  userId: string;
  limit?: number;
  offset?: number;
}

export interface SecuritySettings {
  twoFactorEnabled: boolean;
  twoFactorMethod?: "authenticator" | "sms" | "email";
  passwordLastChanged?: string;
  loginNotifications: boolean;
  newDeviceAlerts: boolean;
  securityAlertsEmail: boolean;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const SESSION_FRAGMENT = gql`
  fragment SessionFragment on nchat_user_sessions {
    id
    user_id
    device
    browser
    os
    ip_address
    location
    is_current
    created_at
    last_active_at
    expires_at
  }
`;

export const LOGIN_ATTEMPT_FRAGMENT = gql`
  fragment LoginAttemptFragment on nchat_login_history {
    id
    user_id
    success
    ip_address
    device
    browser
    os
    location
    failure_reason
    created_at
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all active sessions for a user
 */
export const GET_SESSIONS = gql`
  query GetSessions($userId: uuid!) {
    nchat_user_sessions(
      where: { user_id: { _eq: $userId }, expires_at: { _gt: "now()" } }
      order_by: { last_active_at: desc }
    ) {
      ...SessionFragment
    }
  }
  ${SESSION_FRAGMENT}
`;

/**
 * Get the current session
 */
export const GET_CURRENT_SESSION = gql`
  query GetCurrentSession($sessionId: uuid!) {
    nchat_user_sessions_by_pk(id: $sessionId) {
      ...SessionFragment
    }
  }
  ${SESSION_FRAGMENT}
`;

/**
 * Get login history for a user
 */
export const GET_LOGIN_HISTORY = gql`
  query GetLoginHistory($userId: uuid!, $limit: Int = 20, $offset: Int = 0) {
    nchat_login_history(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...LoginAttemptFragment
    }
    nchat_login_history_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
      }
    }
  }
  ${LOGIN_ATTEMPT_FRAGMENT}
`;

/**
 * Get user's security settings
 */
export const GET_SECURITY_SETTINGS = gql`
  query GetSecuritySettings($userId: uuid!) {
    nchat_users_by_pk(id: $userId) {
      id
      two_factor_enabled
      two_factor_method
      password_changed_at
      security_settings
    }
  }
`;

/**
 * Get 2FA backup codes count (not the actual codes for security)
 */
export const GET_BACKUP_CODES_COUNT = gql`
  query GetBackupCodesCount($userId: uuid!) {
    nchat_backup_codes_aggregate(
      where: { user_id: { _eq: $userId }, used_at: { _is_null: true } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Change user password
 * Note: This should be called via a secure server action, not directly from client
 */
export const CHANGE_PASSWORD = gql`
  mutation ChangePassword($userId: uuid!, $passwordHash: String!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        password_hash: $passwordHash
        password_changed_at: "now()"
        updated_at: "now()"
      }
    ) {
      id
      password_changed_at
    }
    # Optionally invalidate other sessions
    # This would be handled server-side for security
  }
`;

/**
 * Setup 2FA - generates secret and backup codes
 * Note: This returns sensitive data and should be handled carefully
 */
export const SETUP_2FA = gql`
  mutation Setup2FA($userId: uuid!, $secret: String!, $method: String!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        two_factor_secret: $secret
        two_factor_method: $method
        two_factor_pending: true
        updated_at: "now()"
      }
    ) {
      id
      two_factor_pending
    }
  }
`;

/**
 * Verify and enable 2FA
 */
export const VERIFY_2FA = gql`
  mutation Verify2FA($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        two_factor_enabled: true
        two_factor_pending: false
        two_factor_enabled_at: "now()"
        updated_at: "now()"
      }
    ) {
      id
      two_factor_enabled
      two_factor_enabled_at
    }
  }
`;

/**
 * Disable 2FA
 */
export const DISABLE_2FA = gql`
  mutation Disable2FA($userId: uuid!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: {
        two_factor_enabled: false
        two_factor_secret: null
        two_factor_method: null
        two_factor_enabled_at: null
        updated_at: "now()"
      }
    ) {
      id
      two_factor_enabled
    }
    # Also delete backup codes
    delete_nchat_backup_codes(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
  }
`;

/**
 * Store backup codes
 */
export const STORE_BACKUP_CODES = gql`
  mutation StoreBackupCodes(
    $userId: uuid!
    $codes: [nchat_backup_codes_insert_input!]!
  ) {
    delete_nchat_backup_codes(where: { user_id: { _eq: $userId } }) {
      affected_rows
    }
    insert_nchat_backup_codes(objects: $codes) {
      affected_rows
      returning {
        id
        code_hash
        created_at
      }
    }
  }
`;

/**
 * Revoke a specific session
 */
export const REVOKE_SESSION = gql`
  mutation RevokeSession($sessionId: uuid!) {
    delete_nchat_user_sessions_by_pk(id: $sessionId) {
      id
      user_id
    }
  }
`;

/**
 * Revoke all sessions except current
 */
export const REVOKE_ALL_SESSIONS = gql`
  mutation RevokeAllSessions($userId: uuid!, $currentSessionId: uuid!) {
    delete_nchat_user_sessions(
      where: { user_id: { _eq: $userId }, id: { _neq: $currentSessionId } }
    ) {
      affected_rows
    }
  }
`;

/**
 * Record a login attempt
 */
export const RECORD_LOGIN_ATTEMPT = gql`
  mutation RecordLoginAttempt(
    $userId: uuid
    $success: Boolean!
    $ipAddress: String!
    $device: String
    $browser: String
    $os: String
    $location: jsonb
    $failureReason: String
  ) {
    insert_nchat_login_history_one(
      object: {
        user_id: $userId
        success: $success
        ip_address: $ipAddress
        device: $device
        browser: $browser
        os: $os
        location: $location
        failure_reason: $failureReason
      }
    ) {
      id
      created_at
    }
  }
`;

/**
 * Create a new session
 */
export const CREATE_SESSION = gql`
  mutation CreateSession(
    $userId: uuid!
    $device: String
    $browser: String
    $os: String
    $ipAddress: String!
    $location: jsonb
    $expiresAt: timestamptz!
  ) {
    insert_nchat_user_sessions_one(
      object: {
        user_id: $userId
        device: $device
        browser: $browser
        os: $os
        ip_address: $ipAddress
        location: $location
        expires_at: $expiresAt
        is_current: true
      }
    ) {
      ...SessionFragment
    }
  }
  ${SESSION_FRAGMENT}
`;

/**
 * Update session activity
 */
export const UPDATE_SESSION_ACTIVITY = gql`
  mutation UpdateSessionActivity($sessionId: uuid!) {
    update_nchat_user_sessions_by_pk(
      pk_columns: { id: $sessionId }
      _set: { last_active_at: "now()" }
    ) {
      id
      last_active_at
    }
  }
`;

/**
 * Update security settings
 */
export const UPDATE_SECURITY_SETTINGS = gql`
  mutation UpdateSecuritySettings($userId: uuid!, $settings: jsonb!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { security_settings: $settings, updated_at: "now()" }
    ) {
      id
      security_settings
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to session changes
 */
export const SESSIONS_SUBSCRIPTION = gql`
  subscription SessionsSubscription($userId: uuid!) {
    nchat_user_sessions(
      where: { user_id: { _eq: $userId }, expires_at: { _gt: "now()" } }
      order_by: { last_active_at: desc }
    ) {
      ...SessionFragment
    }
  }
  ${SESSION_FRAGMENT}
`;

/**
 * Subscribe to login attempts (for real-time security alerts)
 */
export const LOGIN_ATTEMPTS_SUBSCRIPTION = gql`
  subscription LoginAttemptsSubscription($userId: uuid!) {
    nchat_login_history(
      where: { user_id: { _eq: $userId } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...LoginAttemptFragment
    }
  }
  ${LOGIN_ATTEMPT_FRAGMENT}
`;
