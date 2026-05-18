/**
 * Key Manager
 * Manages identity keys, prekeys, and master keys for E2EE
 */

import { crypto, PBKDF2_ITERATIONS } from "./crypto";
import {
  signalClient,
  type IdentityKeyPair,
  type SignedPreKeyPair,
  type PreKeyPair,
} from "./signal-client";
import type { ApolloClient } from "@apollo/client";
import { gql } from "@apollo/client";

// ============================================================================
// TYPES
// ============================================================================

export interface MasterKeyInfo {
  salt: Uint8Array;
  keyHash: Uint8Array;
  iterations: number;
}

export interface DeviceKeys {
  deviceId: string;
  registrationId: number;
  identityKeyPair: IdentityKeyPair;
  signedPreKey: SignedPreKeyPair;
  oneTimePreKeys: PreKeyPair[];
}

// ============================================================================
// GRAPHQL MUTATIONS
// ============================================================================

const SAVE_IDENTITY_KEY = gql`
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
        update_columns: [identity_key_public, identity_key_private_encrypted]
      }
    ) {
      id
      device_id
    }
  }
`;

const SAVE_SIGNED_PREKEY = gql`
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
    }
  }
`;

const SAVE_ONE_TIME_PREKEYS = gql`
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
    }
  }
`;

const SAVE_MASTER_KEY = gql`
  mutation SaveMasterKey(
    $salt: bytea!
    $keyHash: bytea!
    $iterations: Int!
    $masterKeyBackupEncrypted: bytea
    $recoveryCodeHash: bytea
  ) {
    insert_nchat_user_master_keys_one(
      object: {
        salt: $salt
        key_hash: $keyHash
        iterations: $iterations
        master_key_backup_encrypted: $masterKeyBackupEncrypted
        recovery_code_hash: $recoveryCodeHash
      }
      on_conflict: {
        constraint: nchat_user_master_keys_user_id_key
        update_columns: [key_hash, updated_at]
      }
    ) {
      id
    }
  }
`;

const GET_MASTER_KEY_INFO = gql`
  query GetMasterKeyInfo {
    nchat_user_master_keys {
      salt
      key_hash
      iterations
      master_key_backup_encrypted
      recovery_code_hash
    }
  }
`;

const GET_IDENTITY_KEYS = gql`
  query GetIdentityKeys($deviceId: String!) {
    nchat_identity_keys(
      where: { device_id: { _eq: $deviceId }, is_active: { _eq: true } }
    ) {
      device_id
      identity_key_public
      identity_key_private_encrypted
      registration_id
    }
  }
`;

// ============================================================================
// KEY MANAGER CLASS
// ============================================================================

export class KeyManager {
  private apolloClient: ApolloClient<any>;
  private masterKey: Uint8Array | null = null;
  private deviceKeys: Map<string, DeviceKeys> = new Map();

  constructor(apolloClient: ApolloClient<any>) {
    this.apolloClient = apolloClient;
  }

  // ==========================================================================
  // MASTER KEY MANAGEMENT
  // ==========================================================================

  /**
   * Initialize master key from password
   * Creates new master key if it doesn't exist
   */
  async initializeMasterKey(password: string): Promise<void> {
    // Check if master key exists
    const { data } = await this.apolloClient.query({
      query: GET_MASTER_KEY_INFO,
      fetchPolicy: "network-only",
    });

    if (data.nchat_user_master_keys.length > 0) {
      // Master key exists, derive and verify
      const info = data.nchat_user_master_keys[0];
      const salt = new Uint8Array(info.salt);
      const keyHash = new Uint8Array(info.key_hash);
      const iterations = info.iterations;

      const derivedKey = await crypto.deriveMasterKey(
        password,
        salt,
        iterations,
      );

      if (!crypto.verifyMasterKey(derivedKey, keyHash)) {
        throw new Error("Invalid password");
      }

      this.masterKey = derivedKey;
    } else {
      // Create new master key
      const salt = crypto.generateSalt();
      const masterKey = await crypto.deriveMasterKey(password, salt);
      const keyHash = crypto.hash256(masterKey);

      // Generate recovery code
      const recoveryCode = crypto.generateRecoveryCode();
      const recoveryKey = await crypto.deriveRecoveryKey(recoveryCode, salt);
      const recoveryCodeHash = crypto.hash256(
        crypto.stringToBytes(recoveryCode),
      );

      // Encrypt master key with recovery key
      const { ciphertext, iv } = await crypto.encryptAESGCM(
        masterKey,
        recoveryKey,
      );
      const masterKeyBackup = crypto.encodeEncryptedData(ciphertext, iv);

      // Save to database
      await this.apolloClient.mutate({
        mutation: SAVE_MASTER_KEY,
        variables: {
          salt: Array.from(salt),
          keyHash: Array.from(keyHash),
          iterations: PBKDF2_ITERATIONS,
          masterKeyBackupEncrypted: Array.from(masterKeyBackup),
          recoveryCodeHash: Array.from(recoveryCodeHash),
        },
      });

      this.masterKey = masterKey;

      // Store recovery code securely (user should write this down)
      if (typeof window !== "undefined") {
        sessionStorage.setItem("e2ee_recovery_code", recoveryCode);
      }
    }
  }

  /**
   * Recover master key using recovery code
   */
  async recoverMasterKey(recoveryCode: string): Promise<void> {
    const { data } = await this.apolloClient.query({
      query: GET_MASTER_KEY_INFO,
      fetchPolicy: "network-only",
    });

    if (data.nchat_user_master_keys.length === 0) {
      throw new Error("No master key found");
    }

    const info = data.nchat_user_master_keys[0];
    const salt = new Uint8Array(info.salt);
    const recoveryCodeHash = new Uint8Array(info.recovery_code_hash);
    const masterKeyBackup = new Uint8Array(info.master_key_backup_encrypted);

    // Verify recovery code
    const computedHash = crypto.hash256(crypto.stringToBytes(recoveryCode));
    if (!crypto.constantTimeEqual(computedHash, recoveryCodeHash)) {
      throw new Error("Invalid recovery code");
    }

    // Derive recovery key and decrypt master key
    const recoveryKey = await crypto.deriveRecoveryKey(recoveryCode, salt);
    const { ciphertext, iv } = crypto.decodeEncryptedData(masterKeyBackup);
    const masterKey = await crypto.decryptAESGCM(ciphertext, recoveryKey, iv);

    this.masterKey = masterKey;
  }

  /**
   * Get current master key
   */
  getMasterKey(): Uint8Array {
    if (!this.masterKey) {
      throw new Error("Master key not initialized");
    }
    return this.masterKey;
  }

  /**
   * Clear master key from memory
   */
  clearMasterKey(): void {
    if (this.masterKey) {
      crypto.secureWipe(this.masterKey);
      this.masterKey = null;
    }
  }

  // ==========================================================================
  // DEVICE KEY MANAGEMENT
  // ==========================================================================

  /**
   * Generate device keys (identity key, signed prekey, one-time prekeys)
   */
  async generateDeviceKeys(deviceId?: string): Promise<DeviceKeys> {
    if (!this.masterKey) {
      throw new Error("Master key not initialized");
    }

    // Generate or use provided device ID
    const actualDeviceId = deviceId || crypto.generateDeviceId();
    const registrationId = crypto.generateRegistrationId();

    // Generate identity key pair
    const identityKeyPair = await signalClient.generateIdentityKeyPair();

    // Generate signed prekey (ID 1 for first key)
    const signedPreKey = await signalClient.generateSignedPreKey(
      identityKeyPair,
      1,
    );

    // Generate 100 one-time prekeys
    const oneTimePreKeys = await signalClient.generateOneTimePreKeys(1, 100);

    const deviceKeys: DeviceKeys = {
      deviceId: actualDeviceId,
      registrationId,
      identityKeyPair,
      signedPreKey,
      oneTimePreKeys,
    };

    // Cache in memory
    this.deviceKeys.set(actualDeviceId, deviceKeys);

    return deviceKeys;
  }

  /**
   * Upload device keys to server
   */
  async uploadDeviceKeys(deviceKeys: DeviceKeys): Promise<void> {
    if (!this.masterKey) {
      throw new Error("Master key not initialized");
    }

    // Encrypt identity private key
    const { ciphertext: identityPrivateEncrypted, iv: identityIv } =
      await crypto.encryptAESGCM(
        deviceKeys.identityKeyPair.privateKey,
        this.masterKey,
      );
    const identityPrivateEncoded = crypto.encodeEncryptedData(
      identityPrivateEncrypted,
      identityIv,
    );

    // Save identity key
    await this.apolloClient.mutate({
      mutation: SAVE_IDENTITY_KEY,
      variables: {
        deviceId: deviceKeys.deviceId,
        identityKeyPublic: Array.from(deviceKeys.identityKeyPair.publicKey),
        identityKeyPrivateEncrypted: Array.from(identityPrivateEncoded),
        registrationId: deviceKeys.registrationId,
      },
    });

    // Encrypt and save signed prekey
    const { ciphertext: signedPrivateEncrypted, iv: signedIv } =
      await crypto.encryptAESGCM(
        deviceKeys.signedPreKey.keyPair.privateKey,
        this.masterKey,
      );
    const signedPrivateEncoded = crypto.encodeEncryptedData(
      signedPrivateEncrypted,
      signedIv,
    );

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await this.apolloClient.mutate({
      mutation: SAVE_SIGNED_PREKEY,
      variables: {
        deviceId: deviceKeys.deviceId,
        keyId: deviceKeys.signedPreKey.keyId,
        publicKey: Array.from(deviceKeys.signedPreKey.keyPair.publicKey),
        privateKeyEncrypted: Array.from(signedPrivateEncoded),
        signature: Array.from(deviceKeys.signedPreKey.signature),
        expiresAt: expiresAt.toISOString(),
      },
    });

    // Encrypt and save one-time prekeys
    const prekeyObjects = await Promise.all(
      deviceKeys.oneTimePreKeys.map(async (prekey) => {
        const { ciphertext, iv } = await crypto.encryptAESGCM(
          prekey.privateKey,
          this.masterKey!,
        );
        const privateKeyEncoded = crypto.encodeEncryptedData(ciphertext, iv);

        return {
          device_id: deviceKeys.deviceId,
          key_id: prekey.keyId,
          public_key: Array.from(prekey.publicKey),
          private_key_encrypted: Array.from(privateKeyEncoded),
        };
      }),
    );

    await this.apolloClient.mutate({
      mutation: SAVE_ONE_TIME_PREKEYS,
      variables: { prekeys: prekeyObjects },
    });
  }

  /**
   * Load device keys from server
   */
  async loadDeviceKeys(deviceId: string): Promise<DeviceKeys | null> {
    if (!this.masterKey) {
      throw new Error("Master key not initialized");
    }

    // Check cache first
    if (this.deviceKeys.has(deviceId)) {
      return this.deviceKeys.get(deviceId)!;
    }

    // Load from database
    const { data } = await this.apolloClient.query({
      query: GET_IDENTITY_KEYS,
      variables: { deviceId },
      fetchPolicy: "network-only",
    });

    if (data.nchat_identity_keys.length === 0) {
      return null;
    }

    const key = data.nchat_identity_keys[0];

    // Decrypt private key
    const privateKeyEncoded = new Uint8Array(
      key.identity_key_private_encrypted,
    );
    const { ciphertext, iv } = crypto.decodeEncryptedData(privateKeyEncoded);
    const privateKey = await crypto.decryptAESGCM(
      ciphertext,
      this.masterKey,
      iv,
    );

    const identityKeyPair: IdentityKeyPair = {
      publicKey: new Uint8Array(key.identity_key_public),
      privateKey,
    };

    const deviceKeys: DeviceKeys = {
      deviceId: key.device_id,
      registrationId: key.registration_id,
      identityKeyPair,
      signedPreKey: {
        keyId: 0,
        keyPair: {
          publicKey: new Uint8Array(0),
          privateKey: new Uint8Array(0),
        },
        signature: new Uint8Array(0),
      },
      oneTimePreKeys: [],
    };

    // Cache in memory
    this.deviceKeys.set(deviceId, deviceKeys);

    return deviceKeys;
  }

  /**
   * Rotate signed prekey
   */
  async rotateSignedPreKey(deviceId: string): Promise<void> {
    if (!this.masterKey) {
      throw new Error("Master key not initialized");
    }

    const deviceKeys = await this.loadDeviceKeys(deviceId);
    if (!deviceKeys) {
      throw new Error("Device keys not found");
    }

    // Get next signed prekey ID
    const nextKeyId = deviceKeys.signedPreKey.keyId + 1;

    // Generate new signed prekey
    const newSignedPreKey = await signalClient.generateSignedPreKey(
      deviceKeys.identityKeyPair,
      nextKeyId,
    );

    // Encrypt and save
    const { ciphertext, iv } = await crypto.encryptAESGCM(
      newSignedPreKey.keyPair.privateKey,
      this.masterKey,
    );
    const privateKeyEncoded = crypto.encodeEncryptedData(ciphertext, iv);

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await this.apolloClient.mutate({
      mutation: SAVE_SIGNED_PREKEY,
      variables: {
        deviceId,
        keyId: newSignedPreKey.keyId,
        publicKey: Array.from(newSignedPreKey.keyPair.publicKey),
        privateKeyEncrypted: Array.from(privateKeyEncoded),
        signature: Array.from(newSignedPreKey.signature),
        expiresAt: expiresAt.toISOString(),
      },
    });

    // Update cache
    deviceKeys.signedPreKey = newSignedPreKey;
  }

  /**
   * Replenish one-time prekeys
   */
  async replenishOneTimePreKeys(
    deviceId: string,
    count: number = 50,
  ): Promise<void> {
    if (!this.masterKey) {
      throw new Error("Master key not initialized");
    }

    const deviceKeys = await this.loadDeviceKeys(deviceId);
    if (!deviceKeys) {
      throw new Error("Device keys not found");
    }

    // Get next prekey ID
    const startId =
      Math.max(...deviceKeys.oneTimePreKeys.map((k) => k.keyId), 0) + 1;

    // Generate new prekeys
    const newPrekeys = await signalClient.generateOneTimePreKeys(
      startId,
      count,
    );

    // Encrypt and save
    const prekeyObjects = await Promise.all(
      newPrekeys.map(async (prekey) => {
        const { ciphertext, iv } = await crypto.encryptAESGCM(
          prekey.privateKey,
          this.masterKey!,
        );
        const privateKeyEncoded = crypto.encodeEncryptedData(ciphertext, iv);

        return {
          device_id: deviceId,
          key_id: prekey.keyId,
          public_key: Array.from(prekey.publicKey),
          private_key_encrypted: Array.from(privateKeyEncoded),
        };
      }),
    );

    await this.apolloClient.mutate({
      mutation: SAVE_ONE_TIME_PREKEYS,
      variables: { prekeys: prekeyObjects },
    });

    // Update cache
    deviceKeys.oneTimePreKeys.push(...newPrekeys);
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default KeyManager;
