/**
 * GraphQL Queries and Mutations for E2EE
 */

import { gql } from "@apollo/client";

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get user's master key info
 */
export const GET_MASTER_KEY_INFO = gql`
  query GetMasterKeyInfo {
    nchat_user_master_keys {
      id
      salt
      key_hash
      iterations
      algorithm
      master_key_backup_encrypted
      recovery_code_hash
      created_at
      updated_at
      last_used_at
    }
  }
`;

/**
 * Get user's identity keys
 */
export const GET_IDENTITY_KEYS = gql`
  query GetIdentityKeys($deviceId: String) {
    nchat_identity_keys(
      where: { device_id: { _eq: $deviceId }, is_active: { _eq: true } }
    ) {
      id
      device_id
      identity_key_public
      identity_key_private_encrypted
      registration_id
      created_at
      last_used_at
      is_active
    }
  }
`;

/**
 * Get all user's devices
 */
export const GET_USER_DEVICES = gql`
  query GetUserDevices($userId: uuid!) {
    nchat_identity_keys(
      where: { user_id: { _eq: $userId }, is_active: { _eq: true } }
    ) {
      device_id
      identity_key_public
      registration_id
      created_at
      last_used_at
    }
  }
`;

/**
 * Get prekey bundle for a user's device
 */
export const GET_PREKEY_BUNDLE = gql`
  query GetPreKeyBundle($userId: uuid!, $deviceId: String!) {
    nchat_prekey_bundles(
      where: { user_id: { _eq: $userId }, device_id: { _eq: $deviceId } }
      limit: 1
    ) {
      user_id
      device_id
      identity_key_public
      registration_id
      signed_prekey_id
      signed_prekey_public
      signed_prekey_signature
      one_time_prekey_id
      one_time_prekey_public
      last_used_at
      created_at
    }
  }
`;

/**
 * Get signed prekeys for a device
 */
export const GET_SIGNED_PREKEYS = gql`
  query GetSignedPreKeys($deviceId: String!) {
    nchat_signed_prekeys(
      where: { device_id: { _eq: $deviceId }, is_active: { _eq: true } }
      order_by: { created_at: desc }
    ) {
      id
      key_id
      public_key
      private_key_encrypted
      signature
      created_at
      expires_at
      is_active
    }
  }
`;

/**
 * Get one-time prekeys for a device
 */
export const GET_ONE_TIME_PREKEYS = gql`
  query GetOneTimePreKeys($deviceId: String!, $isConsumed: Boolean) {
    nchat_one_time_prekeys(
      where: {
        device_id: { _eq: $deviceId }
        is_consumed: { _eq: $isConsumed }
      }
      order_by: { key_id: asc }
    ) {
      id
      key_id
      public_key
      private_key_encrypted
      created_at
      consumed_at
      consumed_by
      is_consumed
    }
  }
`;

/**
 * Get Signal sessions
 */
export const GET_SIGNAL_SESSIONS = gql`
  query GetSignalSessions($deviceId: String!) {
    nchat_signal_sessions(
      where: { device_id: { _eq: $deviceId }, is_active: { _eq: true } }
      order_by: { last_message_sent_at: desc_nulls_last }
    ) {
      id
      peer_user_id
      peer_device_id
      session_state_encrypted
      root_key_hash
      chain_key_hash
      send_counter
      receive_counter
      created_at
      last_message_sent_at
      last_message_received_at
      last_ratchet_at
      expires_at
      is_active
      is_initiator
    }
  }
`;

/**
 * Get session with specific peer
 */
export const GET_SESSION_WITH_PEER = gql`
  query GetSessionWithPeer(
    $deviceId: String!
    $peerUserId: uuid!
    $peerDeviceId: String!
  ) {
    nchat_signal_sessions(
      where: {
        device_id: { _eq: $deviceId }
        peer_user_id: { _eq: $peerUserId }
        peer_device_id: { _eq: $peerDeviceId }
        is_active: { _eq: true }
      }
    ) {
      id
      session_state_encrypted
      root_key_hash
      chain_key_hash
      send_counter
      receive_counter
      created_at
      last_message_sent_at
      last_message_received_at
      last_ratchet_at
      is_initiator
    }
  }
`;

/**
 * Get safety numbers
 */
export const GET_SAFETY_NUMBERS = gql`
  query GetSafetyNumbers($peerUserId: uuid) {
    nchat_safety_numbers(where: { peer_user_id: { _eq: $peerUserId } }) {
      id
      peer_user_id
      safety_number
      is_verified
      verified_at
      verified_by_user_id
      user_identity_fingerprint
      peer_identity_fingerprint
      created_at
      updated_at
    }
  }
`;

/**
 * Check prekey inventory
 */
export const CHECK_PREKEY_INVENTORY = gql`
  query CheckPreKeyInventory($deviceId: String!) {
    nchat_one_time_prekeys_aggregate(
      where: { device_id: { _eq: $deviceId }, is_consumed: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get E2EE audit log
 */
export const GET_E2EE_AUDIT_LOG = gql`
  query GetE2EEAuditLog($limit: Int = 50, $offset: Int = 0) {
    nchat_e2ee_audit_log(
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      event_type
      event_data
      ip_address
      user_agent
      created_at
    }
  }
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Save master key info
 */
export const SAVE_MASTER_KEY = gql`
  mutation SaveMasterKey(
    $salt: bytea!
    $keyHash: bytea!
    $iterations: Int!
    $algorithm: String
    $masterKeyBackupEncrypted: bytea
    $recoveryCodeHash: bytea
  ) {
    insert_nchat_user_master_keys_one(
      object: {
        salt: $salt
        key_hash: $keyHash
        iterations: $iterations
        algorithm: $algorithm
        master_key_backup_encrypted: $masterKeyBackupEncrypted
        recovery_code_hash: $recoveryCodeHash
      }
      on_conflict: {
        constraint: nchat_user_master_keys_user_id_key
        update_columns: [key_hash, updated_at, last_used_at]
      }
    ) {
      id
      created_at
    }
  }
`;

/**
 * Save identity key
 */
export const SAVE_IDENTITY_KEY = gql`
  mutation SaveIdentityKey(
    $deviceId: String!
    $identityKeyPublic: bytea!
    $identityKeyPrivateEncrypted: bytea!
    $registrationId: Int!
  ) {
    insert_nchat_identity_keys_one(
      object: {
        device_id: $deviceId
        identity_key_public: $identityKeyPublic
        identity_key_private_encrypted: $identityKeyPrivateEncrypted
        registration_id: $registrationId
      }
      on_conflict: {
        constraint: nchat_identity_keys_user_id_device_id_key
        update_columns: [
          identity_key_public
          identity_key_private_encrypted
          last_used_at
        ]
      }
    ) {
      id
      device_id
      registration_id
    }
  }
`;

/**
 * Save signed prekey
 */
export const SAVE_SIGNED_PREKEY = gql`
  mutation SaveSignedPreKey(
    $deviceId: String!
    $keyId: Int!
    $publicKey: bytea!
    $privateKeyEncrypted: bytea!
    $signature: bytea!
    $expiresAt: timestamptz!
  ) {
    insert_nchat_signed_prekeys_one(
      object: {
        device_id: $deviceId
        key_id: $keyId
        public_key: $publicKey
        private_key_encrypted: $privateKeyEncrypted
        signature: $signature
        expires_at: $expiresAt
        is_active: true
      }
      on_conflict: {
        constraint: nchat_signed_prekeys_user_id_device_id_key_id_key
        update_columns: [
          public_key
          private_key_encrypted
          signature
          expires_at
          is_active
        ]
      }
    ) {
      id
      key_id
    }
  }
`;

/**
 * Save multiple one-time prekeys
 */
export const SAVE_ONE_TIME_PREKEYS = gql`
  mutation SaveOneTimePreKeys(
    $prekeys: [nchat_one_time_prekeys_insert_input!]!
  ) {
    insert_nchat_one_time_prekeys(
      objects: $prekeys
      on_conflict: {
        constraint: nchat_one_time_prekeys_user_id_device_id_key_id_key
        update_columns: []
      }
    ) {
      affected_rows
      returning {
        id
        key_id
      }
    }
  }
`;

/**
 * Consume one-time prekey
 */
export const CONSUME_ONE_TIME_PREKEY = gql`
  mutation ConsumeOneTimePreKey(
    $userId: uuid!
    $deviceId: String!
    $keyId: Int!
    $consumedBy: uuid!
  ) {
    update_nchat_one_time_prekeys(
      where: {
        user_id: { _eq: $userId }
        device_id: { _eq: $deviceId }
        key_id: { _eq: $keyId }
        is_consumed: { _eq: false }
      }
      _set: {
        is_consumed: true
        consumed_at: "now()"
        consumed_by: $consumedBy
      }
    ) {
      affected_rows
      returning {
        id
        key_id
        consumed_at
      }
    }
  }
`;

/**
 * Save Signal session
 */
export const SAVE_SIGNAL_SESSION = gql`
  mutation SaveSignalSession(
    $deviceId: String!
    $peerUserId: uuid!
    $peerDeviceId: String!
    $sessionStateEncrypted: bytea!
    $rootKeyHash: bytea!
    $chainKeyHash: bytea!
    $sendCounter: Int
    $receiveCounter: Int
    $isInitiator: Boolean!
  ) {
    insert_nchat_signal_sessions_one(
      object: {
        device_id: $deviceId
        peer_user_id: $peerUserId
        peer_device_id: $peerDeviceId
        session_state_encrypted: $sessionStateEncrypted
        root_key_hash: $rootKeyHash
        chain_key_hash: $chainKeyHash
        send_counter: $sendCounter
        receive_counter: $receiveCounter
        is_initiator: $isInitiator
      }
      on_conflict: {
        constraint: nchat_signal_sessions_user_id_device_id_peer_user_id_peer_key
        update_columns: [
          session_state_encrypted
          root_key_hash
          chain_key_hash
          send_counter
          receive_counter
        ]
      }
    ) {
      id
      created_at
    }
  }
`;

/**
 * Update session metadata
 */
export const UPDATE_SESSION_METADATA = gql`
  mutation UpdateSessionMetadata(
    $deviceId: String!
    $peerUserId: uuid!
    $peerDeviceId: String!
    $lastMessageSentAt: timestamptz
    $lastMessageReceivedAt: timestamptz
    $lastRatchetAt: timestamptz
    $sendCounter: Int
    $receiveCounter: Int
  ) {
    update_nchat_signal_sessions(
      where: {
        device_id: { _eq: $deviceId }
        peer_user_id: { _eq: $peerUserId }
        peer_device_id: { _eq: $peerDeviceId }
      }
      _set: {
        last_message_sent_at: $lastMessageSentAt
        last_message_received_at: $lastMessageReceivedAt
        last_ratchet_at: $lastRatchetAt
        send_counter: $sendCounter
        receive_counter: $receiveCounter
      }
    ) {
      affected_rows
    }
  }
`;

/**
 * Save safety number
 */
export const SAVE_SAFETY_NUMBER = gql`
  mutation SaveSafetyNumber(
    $peerUserId: uuid!
    $safetyNumber: String!
    $userIdentityFingerprint: String!
    $peerIdentityFingerprint: String!
  ) {
    insert_nchat_safety_numbers_one(
      object: {
        peer_user_id: $peerUserId
        safety_number: $safetyNumber
        user_identity_fingerprint: $userIdentityFingerprint
        peer_identity_fingerprint: $peerIdentityFingerprint
        is_verified: false
      }
      on_conflict: {
        constraint: nchat_safety_numbers_user_id_peer_user_id_key
        update_columns: [
          safety_number
          user_identity_fingerprint
          peer_identity_fingerprint
          updated_at
        ]
      }
    ) {
      id
      safety_number
    }
  }
`;

/**
 * Verify safety number
 */
export const VERIFY_SAFETY_NUMBER = gql`
  mutation VerifySafetyNumber($peerUserId: uuid!, $verifiedBy: uuid!) {
    update_nchat_safety_numbers(
      where: { peer_user_id: { _eq: $peerUserId } }
      _set: {
        is_verified: true
        verified_at: "now()"
        verified_by_user_id: $verifiedBy
      }
    ) {
      affected_rows
      returning {
        id
        is_verified
        verified_at
      }
    }
  }
`;

/**
 * Rotate signed prekey (mark old as inactive)
 */
export const ROTATE_SIGNED_PREKEY = gql`
  mutation RotateSignedPreKey($deviceId: String!) {
    update_nchat_signed_prekeys(
      where: { device_id: { _eq: $deviceId }, is_active: { _eq: true } }
      _set: { is_active: false }
    ) {
      affected_rows
    }
  }
`;

/**
 * Deactivate device
 */
export const DEACTIVATE_DEVICE = gql`
  mutation DeactivateDevice($deviceId: String!) {
    update_nchat_identity_keys(
      where: { device_id: { _eq: $deviceId } }
      _set: { is_active: false }
    ) {
      affected_rows
    }
  }
`;

/**
 * Log E2EE audit event
 */
export const LOG_E2EE_AUDIT_EVENT = gql`
  mutation LogE2EEAuditEvent(
    $deviceId: String
    $eventType: String!
    $eventData: jsonb
    $ipAddress: inet
    $userAgent: String
  ) {
    insert_nchat_e2ee_audit_log_one(
      object: {
        device_id: $deviceId
        event_type: $eventType
        event_data: $eventData
        ip_address: $ipAddress
        user_agent: $userAgent
      }
    ) {
      id
      created_at
    }
  }
`;

/**
 * Refresh prekey bundles materialized view
 */
export const REFRESH_PREKEY_BUNDLES = gql`
  mutation RefreshPreKeyBundles {
    refresh_prekey_bundles {
      success
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to new prekey bundle requests
 */
export const SUBSCRIBE_PREKEY_REQUESTS = gql`
  subscription SubscribePreKeyRequests($userId: uuid!) {
    nchat_one_time_prekeys(
      where: { user_id: { _eq: $userId }, is_consumed: { _eq: true } }
      order_by: { consumed_at: desc }
      limit: 1
    ) {
      id
      key_id
      consumed_at
      consumed_by
    }
  }
`;

/**
 * Subscribe to session updates
 */
export const SUBSCRIBE_SESSION_UPDATES = gql`
  subscription SubscribeSessionUpdates($deviceId: String!) {
    nchat_signal_sessions(
      where: { device_id: { _eq: $deviceId }, is_active: { _eq: true } }
      order_by: { last_message_received_at: desc_nulls_last }
    ) {
      id
      peer_user_id
      peer_device_id
      last_message_received_at
      last_ratchet_at
    }
  }
`;

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  queries: {
    GET_MASTER_KEY_INFO,
    GET_IDENTITY_KEYS,
    GET_USER_DEVICES,
    GET_PREKEY_BUNDLE,
    GET_SIGNED_PREKEYS,
    GET_ONE_TIME_PREKEYS,
    GET_SIGNAL_SESSIONS,
    GET_SESSION_WITH_PEER,
    GET_SAFETY_NUMBERS,
    CHECK_PREKEY_INVENTORY,
    GET_E2EE_AUDIT_LOG,
  },
  mutations: {
    SAVE_MASTER_KEY,
    SAVE_IDENTITY_KEY,
    SAVE_SIGNED_PREKEY,
    SAVE_ONE_TIME_PREKEYS,
    CONSUME_ONE_TIME_PREKEY,
    SAVE_SIGNAL_SESSION,
    UPDATE_SESSION_METADATA,
    SAVE_SAFETY_NUMBER,
    VERIFY_SAFETY_NUMBER,
    ROTATE_SIGNED_PREKEY,
    DEACTIVATE_DEVICE,
    LOG_E2EE_AUDIT_EVENT,
    REFRESH_PREKEY_BUNDLES,
  },
  subscriptions: {
    SUBSCRIBE_PREKEY_REQUESTS,
    SUBSCRIBE_SESSION_UPDATES,
  },
};
