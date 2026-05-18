/**
 * Session Manager
 * Manages Signal Protocol sessions for E2EE conversations
 */

import * as SignalClient from "@signalapp/libsignal-client";
import { crypto } from "./crypto";
import {
  signalClient,
  type PreKeyBundle,
  type EncryptedMessage,
} from "./signal-client";
import type { ApolloClient } from "@apollo/client";
import { gql } from "@apollo/client";
import type KeyManager from "./key-manager";

// ============================================================================
// TYPES
// ============================================================================

export interface SessionInfo {
  userId: string;
  deviceId: string;
  peerUserId: string;
  peerDeviceId: string;
  isActive: boolean;
  isInitiator: boolean;
  createdAt: Date;
  lastMessageSentAt?: Date;
  lastMessageReceivedAt?: Date;
}

// ============================================================================
// GRAPHQL OPERATIONS
// ============================================================================

const GET_PREKEY_BUNDLE = gql`
  query GetPreKeyBundle($userId: uuid!, $deviceId: String!) {
    nchat_prekey_bundles(
      where: {
        user_id: { _eq: $userId }
        device_id: { _eq: $deviceId }
        one_time_prekey_id: { _is_null: false }
      }
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
    }
  }
`;

const CONSUME_ONE_TIME_PREKEY = gql`
  mutation ConsumeOneTimePreKey(
    $userId: uuid!
    $deviceId: String!
    $keyId: Int!
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
        consumed_by: "auth.uid()"
      }
    ) {
      affected_rows
    }
  }
`;

const SAVE_SESSION = gql`
  mutation SaveSession(
    $deviceId: String!
    $peerUserId: uuid!
    $peerDeviceId: String!
    $sessionStateEncrypted: bytea!
    $rootKeyHash: bytea!
    $chainKeyHash: bytea!
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
        is_initiator: $isInitiator
      }
      on_conflict: {
        constraint: nchat_signal_sessions_user_id_device_id_peer_user_id_peer_key
        update_columns: [session_state_encrypted, root_key_hash, chain_key_hash]
      }
    ) {
      id
    }
  }
`;

const GET_SESSION = gql`
  query GetSession(
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
      is_initiator
      created_at
      last_message_sent_at
      last_message_received_at
    }
  }
`;

const UPDATE_SESSION_METADATA = gql`
  mutation UpdateSessionMetadata(
    $deviceId: String!
    $peerUserId: uuid!
    $peerDeviceId: String!
    $lastMessageSentAt: timestamptz
    $lastMessageReceivedAt: timestamptz
    $lastRatchetAt: timestamptz
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
      }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// SESSION STORE IMPLEMENTATION
// ============================================================================

class DatabaseSessionStore extends SignalClient.SessionStore {
  private apolloClient: ApolloClient<any>;
  private keyManager: KeyManager;
  private deviceId: string;
  private sessionCache: Map<string, SignalClient.SessionRecord> = new Map();

  constructor(
    apolloClient: ApolloClient<any>,
    keyManager: KeyManager,
    deviceId: string,
  ) {
    super();
    this.apolloClient = apolloClient;
    this.keyManager = keyManager;
    this.deviceId = deviceId;
  }

  async saveSession(
    address: SignalClient.ProtocolAddress,
    record: SignalClient.SessionRecord,
  ): Promise<void> {
    const key = `${address.name()}.${address.deviceId()}`;
    this.sessionCache.set(key, record);

    // Serialize and encrypt session
    const sessionState = new Uint8Array(record.serialize());
    const masterKey = this.keyManager.getMasterKey();
    const { ciphertext, iv } = await crypto.encryptAESGCM(
      sessionState,
      masterKey,
    );
    const sessionStateEncrypted = crypto.encodeEncryptedData(ciphertext, iv);

    // Generate hashes for verification (non-encrypted)
    const rootKeyHash = crypto.hash256(crypto.stringToBytes("root_key")); // Placeholder
    const chainKeyHash = crypto.hash256(crypto.stringToBytes("chain_key")); // Placeholder

    await this.apolloClient.mutate({
      mutation: SAVE_SESSION,
      variables: {
        deviceId: this.deviceId,
        peerUserId: address.name(),
        peerDeviceId: address.deviceId().toString(),
        sessionStateEncrypted: Array.from(sessionStateEncrypted),
        rootKeyHash: Array.from(rootKeyHash),
        chainKeyHash: Array.from(chainKeyHash),
        isInitiator: true, // Determined during session creation
      },
    });
  }

  async getSession(
    address: SignalClient.ProtocolAddress,
  ): Promise<SignalClient.SessionRecord | null> {
    const key = `${address.name()}.${address.deviceId()}`;

    // Check cache first
    if (this.sessionCache.has(key)) {
      return this.sessionCache.get(key)!;
    }

    // Load from database
    const { data } = await this.apolloClient.query({
      query: GET_SESSION,
      variables: {
        deviceId: this.deviceId,
        peerUserId: address.name(),
        peerDeviceId: address.deviceId().toString(),
      },
      fetchPolicy: "network-only",
    });

    if (data.nchat_signal_sessions.length === 0) {
      return null;
    }

    const session = data.nchat_signal_sessions[0];

    // Decrypt session state
    const sessionStateEncoded = new Uint8Array(session.session_state_encrypted);
    const { ciphertext, iv } = crypto.decodeEncryptedData(sessionStateEncoded);
    const masterKey = this.keyManager.getMasterKey();
    const sessionState = await crypto.decryptAESGCM(ciphertext, masterKey, iv);

    // Deserialize
    const sessionRecord = SignalClient.SessionRecord.deserialize(
      Buffer.from(sessionState),
    );

    // Cache
    this.sessionCache.set(key, sessionRecord);

    return sessionRecord;
  }

  async getExistingSessions(
    addresses: SignalClient.ProtocolAddress[],
  ): Promise<SignalClient.SessionRecord[]> {
    const sessions: SignalClient.SessionRecord[] = [];

    for (const address of addresses) {
      const session = await this.getSession(address);
      if (session) {
        sessions.push(session);
      }
    }

    return sessions;
  }
}

// ============================================================================
// IDENTITY KEY STORE IMPLEMENTATION
// ============================================================================

class DatabaseIdentityKeyStore extends SignalClient.IdentityKeyStore {
  private keyManager: KeyManager;
  private deviceId: string;
  private identityKeyPair: SignalClient.IdentityKeyPair | null = null;
  private registrationId: number | null = null;

  constructor(keyManager: KeyManager, deviceId: string) {
    super();
    this.keyManager = keyManager;
    this.deviceId = deviceId;
  }

  async initialize(): Promise<void> {
    const deviceKeys = await this.keyManager.loadDeviceKeys(this.deviceId);
    if (!deviceKeys) {
      throw new Error("Device keys not found");
    }

    const publicKey = SignalClient.PublicKey.deserialize(
      Buffer.from(deviceKeys.identityKeyPair.publicKey),
    );
    const privateKey = SignalClient.PrivateKey.deserialize(
      Buffer.from(deviceKeys.identityKeyPair.privateKey),
    );
    this.identityKeyPair = new SignalClient.IdentityKeyPair(
      publicKey,
      privateKey,
    );
    this.registrationId = deviceKeys.registrationId;
  }

  async getIdentityKey(): Promise<SignalClient.PrivateKey> {
    if (!this.identityKeyPair) {
      await this.initialize();
    }
    return this.identityKeyPair!.privateKey;
  }

  async getIdentityKeyPair(): Promise<SignalClient.IdentityKeyPair> {
    if (!this.identityKeyPair) {
      await this.initialize();
    }
    return this.identityKeyPair!;
  }

  async getLocalRegistrationId(): Promise<number> {
    if (this.registrationId === null) {
      await this.initialize();
    }
    return this.registrationId!;
  }

  async saveIdentity(
    address: SignalClient.ProtocolAddress,
    key: SignalClient.PublicKey,
  ): Promise<SignalClient.IdentityChange> {
    // Store trusted identity keys
    return SignalClient.IdentityChange.NewOrUnchanged;
  }

  async isTrustedIdentity(
    address: SignalClient.ProtocolAddress,
    key: SignalClient.PublicKey,
    direction: SignalClient.Direction,
  ): Promise<boolean> {
    // Trust on first use (TOFU)
    return true;
  }

  async getIdentity(
    address: SignalClient.ProtocolAddress,
  ): Promise<SignalClient.PublicKey | null> {
    return null;
  }
}

// ============================================================================
// PREKEY STORE IMPLEMENTATION
// ============================================================================

class DatabasePreKeyStore extends SignalClient.PreKeyStore {
  private keyManager: KeyManager;
  private deviceId: string;

  constructor(keyManager: KeyManager, deviceId: string) {
    super();
    this.keyManager = keyManager;
    this.deviceId = deviceId;
  }

  async savePreKey(
    id: number,
    record: SignalClient.PreKeyRecord,
  ): Promise<void> {
    // Prekeys are managed by KeyManager
  }

  async getPreKey(id: number): Promise<SignalClient.PreKeyRecord> {
    const deviceKeys = await this.keyManager.loadDeviceKeys(this.deviceId);
    if (!deviceKeys) {
      throw new Error("Device keys not found");
    }

    const prekey = deviceKeys.oneTimePreKeys.find((k) => k.keyId === id);
    if (!prekey) {
      throw new Error(`PreKey ${id} not found`);
    }

    const publicKey = SignalClient.PublicKey.deserialize(
      Buffer.from(prekey.publicKey),
    );
    const privateKey = SignalClient.PrivateKey.deserialize(
      Buffer.from(prekey.privateKey),
    );

    return SignalClient.PreKeyRecord.new(id, publicKey, privateKey);
  }

  async removePreKey(id: number): Promise<void> {
    // Mark as consumed in database
  }
}

// ============================================================================
// SIGNED PREKEY STORE IMPLEMENTATION
// ============================================================================

class DatabaseSignedPreKeyStore extends SignalClient.SignedPreKeyStore {
  private keyManager: KeyManager;
  private deviceId: string;

  constructor(keyManager: KeyManager, deviceId: string) {
    super();
    this.keyManager = keyManager;
    this.deviceId = deviceId;
  }

  async saveSignedPreKey(
    id: number,
    record: SignalClient.SignedPreKeyRecord,
  ): Promise<void> {
    // Signed prekeys are managed by KeyManager
  }

  async getSignedPreKey(id: number): Promise<SignalClient.SignedPreKeyRecord> {
    const deviceKeys = await this.keyManager.loadDeviceKeys(this.deviceId);
    if (!deviceKeys) {
      throw new Error("Device keys not found");
    }

    if (deviceKeys.signedPreKey.keyId !== id) {
      throw new Error(`SignedPreKey ${id} not found`);
    }

    const publicKey = SignalClient.PublicKey.deserialize(
      Buffer.from(deviceKeys.signedPreKey.keyPair.publicKey),
    );
    const privateKey = SignalClient.PrivateKey.deserialize(
      Buffer.from(deviceKeys.signedPreKey.keyPair.privateKey),
    );
    const signature = deviceKeys.signedPreKey.signature;
    const timestamp = Date.now();

    return SignalClient.SignedPreKeyRecord.new(
      id,
      timestamp,
      publicKey,
      privateKey,
      Buffer.from(signature),
    );
  }
}

// ============================================================================
// SESSION MANAGER CLASS
// ============================================================================

export class SessionManager {
  private apolloClient: ApolloClient<any>;
  private keyManager: KeyManager;
  private userId: string;
  private deviceId: string;
  private sessionStore: DatabaseSessionStore;
  private identityKeyStore: DatabaseIdentityKeyStore;
  private preKeyStore: DatabasePreKeyStore;
  private signedPreKeyStore: DatabaseSignedPreKeyStore;

  constructor(
    apolloClient: ApolloClient<any>,
    keyManager: KeyManager,
    userId: string,
    deviceId: string,
  ) {
    this.apolloClient = apolloClient;
    this.keyManager = keyManager;
    this.userId = userId;
    this.deviceId = deviceId;

    this.sessionStore = new DatabaseSessionStore(
      apolloClient,
      keyManager,
      deviceId,
    );
    this.identityKeyStore = new DatabaseIdentityKeyStore(keyManager, deviceId);
    this.preKeyStore = new DatabasePreKeyStore(keyManager, deviceId);
    this.signedPreKeyStore = new DatabaseSignedPreKeyStore(
      keyManager,
      deviceId,
    );
  }

  // ==========================================================================
  // SESSION CREATION
  // ==========================================================================

  /**
   * Create a new session with a peer (X3DH initiator)
   */
  async createSession(peerUserId: string, peerDeviceId: string): Promise<void> {
    // Fetch peer's prekey bundle
    const { data } = await this.apolloClient.query({
      query: GET_PREKEY_BUNDLE,
      variables: { userId: peerUserId, deviceId: peerDeviceId },
      fetchPolicy: "network-only",
    });

    if (data.nchat_prekey_bundles.length === 0) {
      throw new Error("No prekey bundle available for peer");
    }

    const bundle = data.nchat_prekey_bundles[0];

    // Build PreKeyBundle
    const prekeyBundle: PreKeyBundle = {
      registrationId: bundle.registration_id,
      deviceId: bundle.device_id,
      identityKey: new Uint8Array(bundle.identity_key_public),
      signedPreKey: {
        keyId: bundle.signed_prekey_id,
        publicKey: new Uint8Array(bundle.signed_prekey_public),
        signature: new Uint8Array(bundle.signed_prekey_signature),
      },
      oneTimePreKey: bundle.one_time_prekey_id
        ? {
            keyId: bundle.one_time_prekey_id,
            publicKey: new Uint8Array(bundle.one_time_prekey_public),
          }
        : undefined,
    };

    // Create protocol address
    const remoteAddress = SignalClient.ProtocolAddress.new(
      peerUserId,
      parseInt(peerDeviceId, 10),
    );

    // Load local identity key
    const deviceKeys = await this.keyManager.loadDeviceKeys(this.deviceId);
    if (!deviceKeys) {
      throw new Error("Device keys not found");
    }

    // Process prekey bundle to create session
    await signalClient.processPreKeyBundle(
      prekeyBundle,
      deviceKeys.identityKeyPair,
      deviceKeys.registrationId,
      remoteAddress,
    );

    // Consume one-time prekey
    if (bundle.one_time_prekey_id) {
      await this.apolloClient.mutate({
        mutation: CONSUME_ONE_TIME_PREKEY,
        variables: {
          userId: peerUserId,
          deviceId: peerDeviceId,
          keyId: bundle.one_time_prekey_id,
        },
      });
    }
  }

  /**
   * Get or create session with peer
   */
  async getOrCreateSession(
    peerUserId: string,
    peerDeviceId: string,
  ): Promise<SignalClient.SessionRecord> {
    const address = SignalClient.ProtocolAddress.new(
      peerUserId,
      parseInt(peerDeviceId, 10),
    );

    let session = await this.sessionStore.getSession(address);

    if (!session) {
      await this.createSession(peerUserId, peerDeviceId);
      session = await this.sessionStore.getSession(address);
    }

    if (!session) {
      throw new Error("Failed to create session");
    }

    return session;
  }

  // ==========================================================================
  // MESSAGE ENCRYPTION/DECRYPTION
  // ==========================================================================

  /**
   * Encrypt a message for a peer
   */
  async encryptMessage(
    plaintext: string | Uint8Array,
    peerUserId: string,
    peerDeviceId: string,
  ): Promise<EncryptedMessage> {
    // Ensure session exists
    await this.getOrCreateSession(peerUserId, peerDeviceId);

    const address = SignalClient.ProtocolAddress.new(
      peerUserId,
      parseInt(peerDeviceId, 10),
    );

    // Encrypt message
    const encryptedMessage = await signalClient.encryptMessage(
      plaintext,
      address,
      this.sessionStore,
      this.identityKeyStore as SignalClient.IdentityKeyStore,
    );

    // Update session metadata
    await this.apolloClient.mutate({
      mutation: UPDATE_SESSION_METADATA,
      variables: {
        deviceId: this.deviceId,
        peerUserId,
        peerDeviceId,
        lastMessageSentAt: new Date().toISOString(),
        lastRatchetAt: new Date().toISOString(),
      },
    });

    return encryptedMessage;
  }

  /**
   * Decrypt a message from a peer
   */
  async decryptMessage(
    encryptedMessage: EncryptedMessage,
    peerUserId: string,
    peerDeviceId: string,
  ): Promise<Uint8Array> {
    const address = SignalClient.ProtocolAddress.new(
      peerUserId,
      parseInt(peerDeviceId, 10),
    );

    // Decrypt message
    const plaintext = await signalClient.decryptMessage(
      encryptedMessage,
      address,
      this.sessionStore,
      this.identityKeyStore as SignalClient.IdentityKeyStore,
      this.preKeyStore,
      this.signedPreKeyStore,
    );

    // Update session metadata
    await this.apolloClient.mutate({
      mutation: UPDATE_SESSION_METADATA,
      variables: {
        deviceId: this.deviceId,
        peerUserId,
        peerDeviceId,
        lastMessageReceivedAt: new Date().toISOString(),
      },
    });

    return plaintext;
  }

  // ==========================================================================
  // SESSION MANAGEMENT
  // ==========================================================================

  /**
   * Get session info
   */
  async getSessionInfo(
    peerUserId: string,
    peerDeviceId: string,
  ): Promise<SessionInfo | null> {
    const { data } = await this.apolloClient.query({
      query: GET_SESSION,
      variables: {
        deviceId: this.deviceId,
        peerUserId,
        peerDeviceId,
      },
      fetchPolicy: "network-only",
    });

    if (data.nchat_signal_sessions.length === 0) {
      return null;
    }

    const session = data.nchat_signal_sessions[0];

    return {
      userId: this.userId,
      deviceId: this.deviceId,
      peerUserId,
      peerDeviceId,
      isActive: true,
      isInitiator: session.is_initiator,
      createdAt: new Date(session.created_at),
      lastMessageSentAt: session.last_message_sent_at
        ? new Date(session.last_message_sent_at)
        : undefined,
      lastMessageReceivedAt: session.last_message_received_at
        ? new Date(session.last_message_received_at)
        : undefined,
    };
  }

  /**
   * Check if session exists
   */
  async hasSession(peerUserId: string, peerDeviceId: string): Promise<boolean> {
    const sessionInfo = await this.getSessionInfo(peerUserId, peerDeviceId);
    return sessionInfo !== null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default SessionManager;
