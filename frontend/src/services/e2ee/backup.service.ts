/**
 * E2EE Backup Service
 *
 * High-level service for managing encrypted backups of E2EE key material.
 * Provides complete backup and restore workflows with device verification.
 *
 * Features:
 * - Create encrypted backups of all E2EE keys
 * - Restore backups with passphrase or recovery key
 * - Device verification for secure restoration
 * - Automatic backup scheduling
 * - Backup history management
 * - Export/import for cross-device transfer
 *
 * Security:
 * - Keys encrypted with user passphrase
 * - Recovery key as backup authentication
 * - Device binding for additional security
 * - Secure memory handling
 */

import { logger } from "@/lib/logger";
import {
  deriveBackupKey,
  verifyAndDeriveKey,
  toStorableParams,
  SecurityLevel,
  assessPassphraseStrength,
  isValidPassphrase,
  generateSuggestedPassphrase,
  type DerivedKeyParams,
  type PassphraseStrength,
} from "@/lib/e2ee/backup-key-derivation";
import {
  createEncryptedBackup,
  restoreBackup,
  validateBackup,
  parseBackup,
  serializeBackup,
  createKeyEntry,
  createSessionEntry,
  createDeviceInfo,
  extractKeyFromEntry,
  extractSessionState,
  BackupKeyType,
  type EncryptedBackup,
  type BackupPayload,
  type BackupKeyEntry,
  type BackupSessionEntry,
  type BackupDeviceInfo,
  type RestoreResult,
  type BackupValidation,
} from "@/lib/e2ee/backup-encryption";
import {
  generateRecoveryKey,
  validateRecoveryKey,
  encryptMasterKeyWithRecovery,
  decryptMasterKeyWithRecovery,
  createRecoveryKeyHash,
  checkRateLimit,
  recordVerificationAttempt,
  maskRecoveryKey,
  type RecoveryKeyResult,
  type EncryptedMasterKey,
  type VerificationAttempt,
  type RateLimitResult,
} from "@/lib/e2ee/recovery-key";
import {
  secureWipe,
  bytesToBase64,
  base64ToBytes,
  hash256,
  bytesToHex,
  hexToBytes,
} from "@/lib/e2ee/crypto";

// ============================================================================
// Types
// ============================================================================

/**
 * Backup service configuration
 */
export interface BackupServiceConfig {
  /** User ID */
  userId: string;
  /** Current device ID */
  deviceId: string;
  /** Device registration ID */
  registrationId: number;
  /** Platform identifier */
  platform: "web" | "ios" | "android" | "desktop";
  /** App version */
  appVersion: string;
  /** Optional device name */
  deviceName?: string;
  /** Storage provider */
  storage?: Storage;
  /** Auto-backup interval in hours (0 to disable) */
  autoBackupIntervalHours?: number;
  /** Maximum backups to keep */
  maxBackupsToKeep?: number;
  /** Callback when backup is needed */
  onBackupNeeded?: () => Promise<void>;
}

/**
 * Backup creation options
 */
export interface CreateBackupOptions {
  /** Passphrase for encryption */
  passphrase: string;
  /** Security level for key derivation */
  securityLevel?: SecurityLevel;
  /** Whether to generate a recovery key */
  generateRecoveryKey?: boolean;
  /** Include session states */
  includeSessions?: boolean;
  /** Include group keys */
  includeGroupKeys?: boolean;
  /** Custom backup name/description */
  description?: string;
}

/**
 * Backup creation result
 */
export interface CreateBackupResult {
  /** Serialized encrypted backup */
  backup: string;
  /** Recovery key (if generated) */
  recoveryKey?: RecoveryKeyResult;
  /** Encrypted master key for recovery */
  encryptedMasterKey?: EncryptedMasterKey;
  /** Backup metadata */
  metadata: {
    backupId: string;
    createdAt: Date;
    keyCount: number;
    sessionCount: number;
    size: number;
  };
}

/**
 * Restore options
 */
export interface RestoreOptions {
  /** Passphrase for decryption */
  passphrase?: string;
  /** Recovery key for decryption */
  recoveryKey?: string;
  /** Encrypted master key (required with recovery key) */
  encryptedMasterKey?: EncryptedMasterKey;
  /** Whether to verify device binding */
  verifyDevice?: boolean;
  /** Whether to merge with existing keys */
  mergeExisting?: boolean;
}

/**
 * Restore result
 */
export interface RestoreServiceResult {
  /** Whether restore was successful */
  success: boolean;
  /** Restore details */
  details: RestoreResult;
  /** Keys restored */
  keysRestored: {
    identityKeys: number;
    signedPreKeys: number;
    oneTimePreKeys: number;
    sessions: number;
    senderKeys: number;
  };
  /** Warnings from restore process */
  warnings: string[];
}

/**
 * Backup metadata for history
 */
export interface BackupMetadata {
  /** Unique backup ID */
  backupId: string;
  /** Creation timestamp */
  createdAt: number;
  /** Device that created backup */
  deviceId: string;
  /** Device name */
  deviceName?: string;
  /** Number of keys */
  keyCount: number;
  /** Number of sessions */
  sessionCount: number;
  /** Backup size in bytes */
  size: number;
  /** Description */
  description?: string;
  /** Has recovery key */
  hasRecoveryKey: boolean;
}

/**
 * Key data provider interface
 */
export interface KeyDataProvider {
  /** Get identity key pair */
  getIdentityKeyPair(): Promise<{
    publicKey: Uint8Array;
    privateKey: Uint8Array;
  } | null>;
  /** Get all signed pre-keys */
  getSignedPreKeys(): Promise<
    Array<{
      keyId: number;
      publicKey: Uint8Array;
      privateKey: Uint8Array;
      signature: Uint8Array;
      createdAt: number;
      expiresAt?: number;
    }>
  >;
  /** Get all one-time pre-keys */
  getOneTimePreKeys(): Promise<
    Array<{
      keyId: number;
      publicKey: Uint8Array;
      privateKey: Uint8Array;
    }>
  >;
  /** Get all session states */
  getSessions(): Promise<
    Array<{
      peerUserId: string;
      peerDeviceId: string;
      state: Uint8Array;
      rootKey: Uint8Array;
      sendingCounter: number;
      receivingCounter: number;
      createdAt: number;
      lastActivity: number;
    }>
  >;
  /** Get all sender keys */
  getSenderKeys(): Promise<
    Array<{
      groupId: string;
      keyId: number;
      publicKey: Uint8Array;
      privateKey: Uint8Array;
    }>
  >;
  /** Get message count */
  getMessageCount(): Promise<number>;
}

/**
 * Key data consumer interface
 */
export interface KeyDataConsumer {
  /** Import identity key pair */
  importIdentityKeyPair(
    publicKey: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<void>;
  /** Import signed pre-key */
  importSignedPreKey(
    keyId: number,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
    signature: Uint8Array,
    expiresAt?: number,
  ): Promise<void>;
  /** Import one-time pre-key */
  importOneTimePreKey(
    keyId: number,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<void>;
  /** Import session state */
  importSession(
    peerUserId: string,
    peerDeviceId: string,
    state: Uint8Array,
    counters: { sending: number; receiving: number },
  ): Promise<void>;
  /** Import sender key */
  importSenderKey(
    groupId: string,
    keyId: number,
    publicKey: Uint8Array,
    privateKey: Uint8Array,
  ): Promise<void>;
}

// ============================================================================
// Storage Keys
// ============================================================================

const STORAGE_PREFIX = "nchat_backup_";
const STORAGE_HISTORY_KEY = `${STORAGE_PREFIX}history`;
const STORAGE_KDF_PARAMS_KEY = `${STORAGE_PREFIX}kdf_params`;
const STORAGE_RECOVERY_HASH_KEY = `${STORAGE_PREFIX}recovery_hash`;
const STORAGE_LAST_BACKUP_KEY = `${STORAGE_PREFIX}last_backup`;
const STORAGE_ATTEMPTS_KEY = `${STORAGE_PREFIX}verification_attempts`;

// ============================================================================
// Backup Service Class
// ============================================================================

/**
 * E2EE Backup Service
 *
 * Manages backup creation, restoration, and history.
 */
export class E2EEBackupService {
  private config: BackupServiceConfig;
  private keyProvider: KeyDataProvider | null = null;
  private keyConsumer: KeyDataConsumer | null = null;
  private autoBackupTimer: NodeJS.Timeout | null = null;
  private initialized = false;

  constructor(config: BackupServiceConfig) {
    this.config = {
      ...config,
      autoBackupIntervalHours: config.autoBackupIntervalHours ?? 24,
      maxBackupsToKeep: config.maxBackupsToKeep ?? 5,
    };
  }

  // ==========================================================================
  // Initialization
  // ==========================================================================

  /**
   * Initializes the backup service
   *
   * @param keyProvider - Provider for reading key data
   * @param keyConsumer - Consumer for importing key data
   */
  async initialize(
    keyProvider: KeyDataProvider,
    keyConsumer: KeyDataConsumer,
  ): Promise<void> {
    this.keyProvider = keyProvider;
    this.keyConsumer = keyConsumer;
    this.initialized = true;

    // Start auto-backup if configured
    if (
      this.config.autoBackupIntervalHours &&
      this.config.autoBackupIntervalHours > 0
    ) {
      this.startAutoBackup();
    }

    logger.info("E2EE Backup service initialized", {
      userId: this.config.userId,
      deviceId: this.config.deviceId,
    });
  }

  /**
   * Checks if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  // ==========================================================================
  // Backup Creation
  // ==========================================================================

  /**
   * Creates an encrypted backup
   *
   * @param options - Backup creation options
   * @returns Backup result
   */
  async createBackup(
    options: CreateBackupOptions,
  ): Promise<CreateBackupResult> {
    this.ensureInitialized();

    // Validate passphrase
    if (!isValidPassphrase(options.passphrase)) {
      throw new Error("Passphrase does not meet minimum requirements");
    }

    const securityLevel = options.securityLevel ?? SecurityLevel.HIGH;

    // Derive backup key
    const derivedKey = await deriveBackupKey(
      options.passphrase,
      undefined,
      securityLevel,
    );

    // Build backup payload
    const payload = await this.buildBackupPayload(options);

    // Create encrypted backup
    const kdfParams = toStorableParams(derivedKey);
    const encryptedBackup = await createEncryptedBackup(
      payload,
      derivedKey.encryptionKey,
      {
        algorithm: kdfParams.algorithm,
        iterations: kdfParams.iterations,
        salt: kdfParams.salt,
      },
    );

    // Store KDF params for future verification
    this.storeKdfParams(kdfParams);

    // Generate recovery key if requested
    let recoveryKeyResult: RecoveryKeyResult | undefined;
    let encryptedMasterKey: EncryptedMasterKey | undefined;

    if (options.generateRecoveryKey !== false) {
      recoveryKeyResult = generateRecoveryKey();
      encryptedMasterKey = await encryptMasterKeyWithRecovery(
        derivedKey.encryptionKey,
        recoveryKeyResult.keyBytes,
      );

      // Store recovery key hash
      this.storeRecoveryKeyHash(
        createRecoveryKeyHash(recoveryKeyResult.keyBytes),
      );
    }

    // Serialize backup
    const serialized = serializeBackup(encryptedBackup);

    // Create metadata
    const backupId = this.generateBackupId();
    const metadata: BackupMetadata = {
      backupId,
      createdAt: Date.now(),
      deviceId: this.config.deviceId,
      deviceName: this.config.deviceName,
      keyCount:
        payload.identityKeys.length +
        payload.signedPreKeys.length +
        payload.oneTimePreKeys.length +
        payload.senderKeys.length,
      sessionCount: payload.sessions.length,
      size: serialized.length,
      description: options.description,
      hasRecoveryKey: !!recoveryKeyResult,
    };

    // Add to history
    await this.addToHistory(metadata);

    // Wipe sensitive data
    secureWipe(derivedKey.encryptionKey);

    logger.info("Backup created", {
      backupId,
      keyCount: metadata.keyCount,
      sessionCount: metadata.sessionCount,
      size: metadata.size,
    });

    return {
      backup: serialized,
      recoveryKey: recoveryKeyResult,
      encryptedMasterKey,
      metadata: {
        backupId,
        createdAt: new Date(metadata.createdAt),
        keyCount: metadata.keyCount,
        sessionCount: metadata.sessionCount,
        size: metadata.size,
      },
    };
  }

  /**
   * Builds the backup payload from current keys
   */
  private async buildBackupPayload(
    options: CreateBackupOptions,
  ): Promise<BackupPayload> {
    const deviceInfo = createDeviceInfo(
      this.config.deviceId,
      this.config.registrationId,
      this.config.platform,
      this.config.appVersion,
      this.config.deviceName,
    );

    // Get identity key
    const identityKeyPair = await this.keyProvider!.getIdentityKeyPair();
    const identityKeys: BackupKeyEntry[] = identityKeyPair
      ? [
          createKeyEntry(
            BackupKeyType.IDENTITY_KEY,
            this.config.deviceId,
            identityKeyPair.publicKey,
            identityKeyPair.privateKey,
          ),
        ]
      : [];

    // Get signed pre-keys
    const signedPreKeyData = await this.keyProvider!.getSignedPreKeys();
    const signedPreKeys: BackupKeyEntry[] = signedPreKeyData.map((spk) =>
      createKeyEntry(
        BackupKeyType.SIGNED_PREKEY,
        `spk-${spk.keyId}`,
        spk.publicKey,
        spk.privateKey,
        {
          keyId: spk.keyId,
          signature: spk.signature,
          expiresAt: spk.expiresAt,
        },
      ),
    );

    // Get one-time pre-keys
    const oneTimePreKeyData = await this.keyProvider!.getOneTimePreKeys();
    const oneTimePreKeys: BackupKeyEntry[] = oneTimePreKeyData.map((opk) =>
      createKeyEntry(
        BackupKeyType.ONE_TIME_PREKEY,
        `opk-${opk.keyId}`,
        opk.publicKey,
        opk.privateKey,
        {
          keyId: opk.keyId,
        },
      ),
    );

    // Get sessions
    const sessions: BackupSessionEntry[] = [];
    if (options.includeSessions !== false) {
      const sessionData = await this.keyProvider!.getSessions();
      for (const session of sessionData) {
        sessions.push(
          createSessionEntry(
            session.peerUserId,
            session.peerDeviceId,
            session.state,
            session.rootKey,
            {
              sending: session.sendingCounter,
              receiving: session.receivingCounter,
            },
            { created: session.createdAt, lastActivity: session.lastActivity },
          ),
        );
      }
    }

    // Get sender keys
    const senderKeys: BackupKeyEntry[] = [];
    if (options.includeGroupKeys !== false) {
      const senderKeyData = await this.keyProvider!.getSenderKeys();
      for (const sk of senderKeyData) {
        senderKeys.push(
          createKeyEntry(
            BackupKeyType.SENDER_KEY,
            sk.groupId,
            sk.publicKey,
            sk.privateKey,
            {
              keyId: sk.keyId,
            },
          ),
        );
      }
    }

    // Get message count
    const messageCount = await this.keyProvider!.getMessageCount();

    return {
      userId: this.config.userId,
      device: deviceInfo,
      identityKeys,
      signedPreKeys,
      oneTimePreKeys,
      sessions,
      senderKeys,
      createdAt: Date.now(),
      messageCount,
    };
  }

  // ==========================================================================
  // Backup Restoration
  // ==========================================================================

  /**
   * Restores from an encrypted backup
   *
   * @param backupData - Serialized backup data
   * @param options - Restore options
   * @returns Restore result
   */
  async restore(
    backupData: string,
    options: RestoreOptions,
  ): Promise<RestoreServiceResult> {
    this.ensureInitialized();

    // Check rate limiting
    const attempts = this.getVerificationAttempts();
    const rateLimit = checkRateLimit(attempts);
    if (!rateLimit.allowed) {
      throw new Error(
        `Too many failed attempts. Please wait ${rateLimit.waitSeconds} seconds.`,
      );
    }

    // Parse backup
    const backup = parseBackup(backupData);

    // Validate backup structure
    const validation = validateBackup(backup);
    if (!validation.valid) {
      throw new Error(`Invalid backup: ${validation.errors.join(", ")}`);
    }

    // Derive decryption key
    let encryptionKey: Uint8Array;

    try {
      if (options.passphrase) {
        // Derive key directly - verification happens during decryption (AES-GCM auth tag)
        const derivedResult = await deriveBackupKey(
          options.passphrase,
          hexToBytes(backup.header.kdf.salt),
          backup.header.kdf.iterations >= 600000
            ? SecurityLevel.HIGH
            : SecurityLevel.STANDARD,
        );
        encryptionKey = derivedResult.encryptionKey;
      } else if (options.recoveryKey && options.encryptedMasterKey) {
        const recoveryValidation = validateRecoveryKey(options.recoveryKey);
        if (!recoveryValidation.valid) {
          throw new Error(`Invalid recovery key: ${recoveryValidation.error}`);
        }

        encryptionKey = await decryptMasterKeyWithRecovery(
          options.encryptedMasterKey,
          recoveryValidation.keyBytes!,
        );
      } else {
        throw new Error(
          "Either passphrase or recovery key with encrypted master key is required",
        );
      }

      // Record successful attempt
      this.recordAttempt(true);
    } catch (error) {
      // Record failed attempt
      this.recordAttempt(false);
      throw error;
    }

    // Restore backup
    const result = await restoreBackup(
      backup,
      encryptionKey,
      options.verifyDevice ? this.config.deviceId : undefined,
    );

    // Import keys
    const keysRestored = await this.importKeys(
      result.payload,
      options.mergeExisting ?? false,
    );

    // Wipe encryption key
    secureWipe(encryptionKey);

    logger.info("Backup restored", {
      deviceVerified: result.deviceVerified,
      keysRestored,
      warnings: result.warnings.length,
    });

    return {
      success: true,
      details: result,
      keysRestored,
      warnings: result.warnings,
    };
  }

  /**
   * Imports keys from a backup payload
   */
  private async importKeys(
    payload: BackupPayload,
    mergeExisting: boolean,
  ): Promise<RestoreServiceResult["keysRestored"]> {
    const result = {
      identityKeys: 0,
      signedPreKeys: 0,
      oneTimePreKeys: 0,
      sessions: 0,
      senderKeys: 0,
    };

    // Import identity key
    for (const entry of payload.identityKeys) {
      const { publicKey, privateKey } = extractKeyFromEntry(entry);
      if (publicKey && privateKey) {
        await this.keyConsumer!.importIdentityKeyPair(publicKey, privateKey);
        result.identityKeys++;
      }
    }

    // Import signed pre-keys
    for (const entry of payload.signedPreKeys) {
      const { publicKey, privateKey, signature } = extractKeyFromEntry(entry);
      if (publicKey && privateKey && signature && entry.keyId !== undefined) {
        await this.keyConsumer!.importSignedPreKey(
          entry.keyId,
          publicKey,
          privateKey,
          signature,
          entry.expiresAt,
        );
        result.signedPreKeys++;
      }
    }

    // Import one-time pre-keys
    for (const entry of payload.oneTimePreKeys) {
      const { publicKey, privateKey } = extractKeyFromEntry(entry);
      if (publicKey && privateKey && entry.keyId !== undefined) {
        await this.keyConsumer!.importOneTimePreKey(
          entry.keyId,
          publicKey,
          privateKey,
        );
        result.oneTimePreKeys++;
      }
    }

    // Import sessions
    for (const session of payload.sessions) {
      const state = extractSessionState(session);
      await this.keyConsumer!.importSession(
        session.peerUserId,
        session.peerDeviceId,
        state,
        {
          sending: session.sendingCounter,
          receiving: session.receivingCounter,
        },
      );
      result.sessions++;
    }

    // Import sender keys
    for (const entry of payload.senderKeys) {
      const { publicKey, privateKey } = extractKeyFromEntry(entry);
      if (publicKey && privateKey && entry.keyId !== undefined) {
        await this.keyConsumer!.importSenderKey(
          entry.id,
          entry.keyId,
          publicKey,
          privateKey,
        );
        result.senderKeys++;
      }
    }

    return result;
  }

  // ==========================================================================
  // Passphrase Utilities
  // ==========================================================================

  /**
   * Assesses passphrase strength
   */
  assessPassphrase(passphrase: string): PassphraseStrength {
    return assessPassphraseStrength(passphrase);
  }

  /**
   * Generates a suggested passphrase
   */
  suggestPassphrase(): string {
    return generateSuggestedPassphrase();
  }

  /**
   * Validates passphrase meets requirements
   */
  validatePassphrase(passphrase: string): boolean {
    return isValidPassphrase(passphrase);
  }

  // ==========================================================================
  // Recovery Key Management
  // ==========================================================================

  /**
   * Generates a new recovery key for existing backup
   *
   * @param passphrase - Current passphrase to decrypt
   * @returns New recovery key and encrypted master key
   */
  async regenerateRecoveryKey(passphrase: string): Promise<{
    recoveryKey: RecoveryKeyResult;
    encryptedMasterKey: EncryptedMasterKey;
  }> {
    // Get stored KDF params
    const kdfParams = this.getStoredKdfParams();
    if (!kdfParams) {
      throw new Error("No backup found. Create a backup first.");
    }

    // Derive master key from passphrase
    const masterKey = await verifyAndDeriveKey(passphrase, kdfParams);

    // Generate new recovery key
    const recoveryKeyResult = generateRecoveryKey();
    const encryptedMasterKey = await encryptMasterKeyWithRecovery(
      masterKey,
      recoveryKeyResult.keyBytes,
    );

    // Store new recovery key hash
    this.storeRecoveryKeyHash(
      createRecoveryKeyHash(recoveryKeyResult.keyBytes),
    );

    // Wipe master key
    secureWipe(masterKey);

    logger.info("Recovery key regenerated");

    return {
      recoveryKey: recoveryKeyResult,
      encryptedMasterKey,
    };
  }

  /**
   * Masks a recovery key for display
   */
  maskRecoveryKey(displayKey: string): string {
    return maskRecoveryKey(displayKey);
  }

  // ==========================================================================
  // Backup History
  // ==========================================================================

  /**
   * Gets backup history
   */
  getBackupHistory(): BackupMetadata[] {
    if (!this.config.storage) {
      return [];
    }

    const historyJson = this.config.storage.getItem(STORAGE_HISTORY_KEY);
    if (!historyJson) {
      return [];
    }

    try {
      return JSON.parse(historyJson) as BackupMetadata[];
    } catch {
      return [];
    }
  }

  /**
   * Gets the most recent backup metadata
   */
  getLastBackupMetadata(): BackupMetadata | null {
    const history = this.getBackupHistory();
    return history.length > 0 ? history[0] : null;
  }

  /**
   * Clears backup history
   */
  clearBackupHistory(): void {
    if (this.config.storage) {
      this.config.storage.removeItem(STORAGE_HISTORY_KEY);
      logger.info("Backup history cleared");
    }
  }

  /**
   * Adds a backup to history
   */
  private async addToHistory(metadata: BackupMetadata): Promise<void> {
    if (!this.config.storage) {
      return;
    }

    const history = this.getBackupHistory();
    history.unshift(metadata);

    // Trim to max backups
    const trimmedHistory = history.slice(0, this.config.maxBackupsToKeep);

    this.config.storage.setItem(
      STORAGE_HISTORY_KEY,
      JSON.stringify(trimmedHistory),
    );
    this.config.storage.setItem(
      STORAGE_LAST_BACKUP_KEY,
      metadata.createdAt.toString(),
    );
  }

  // ==========================================================================
  // Auto-Backup
  // ==========================================================================

  /**
   * Starts auto-backup timer
   */
  private startAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
    }

    const intervalMs =
      (this.config.autoBackupIntervalHours ?? 24) * 60 * 60 * 1000;

    this.autoBackupTimer = setInterval(() => {
      this.checkAutoBackup();
    }, intervalMs);
  }

  /**
   * Stops auto-backup timer
   */
  stopAutoBackup(): void {
    if (this.autoBackupTimer) {
      clearInterval(this.autoBackupTimer);
      this.autoBackupTimer = null;
    }
  }

  /**
   * Checks if auto-backup is needed
   */
  private checkAutoBackup(): void {
    const lastBackup = this.getLastBackupTimestamp();
    const now = Date.now();
    const intervalMs =
      (this.config.autoBackupIntervalHours ?? 24) * 60 * 60 * 1000;

    if (!lastBackup || now - lastBackup > intervalMs) {
      if (this.config.onBackupNeeded) {
        this.config.onBackupNeeded().catch((error) => {
          logger.error("Auto-backup failed", { error });
        });
      }
    }
  }

  /**
   * Gets timestamp of last backup
   */
  private getLastBackupTimestamp(): number | null {
    if (!this.config.storage) {
      return null;
    }

    const timestamp = this.config.storage.getItem(STORAGE_LAST_BACKUP_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  }

  // ==========================================================================
  // Storage Helpers
  // ==========================================================================

  /**
   * Stores KDF params
   */
  private storeKdfParams(params: DerivedKeyParams): void {
    if (this.config.storage) {
      this.config.storage.setItem(
        STORAGE_KDF_PARAMS_KEY,
        JSON.stringify(params),
      );
    }
  }

  /**
   * Gets stored KDF params
   */
  private getStoredKdfParams(): DerivedKeyParams | null {
    if (!this.config.storage) {
      return null;
    }

    const json = this.config.storage.getItem(STORAGE_KDF_PARAMS_KEY);
    if (!json) {
      return null;
    }

    try {
      return JSON.parse(json) as DerivedKeyParams;
    } catch {
      return null;
    }
  }

  /**
   * Stores recovery key hash
   */
  private storeRecoveryKeyHash(hash: string): void {
    if (this.config.storage) {
      this.config.storage.setItem(STORAGE_RECOVERY_HASH_KEY, hash);
    }
  }

  /**
   * Gets verification attempts
   */
  private getVerificationAttempts(): VerificationAttempt[] {
    if (!this.config.storage) {
      return [];
    }

    const json = this.config.storage.getItem(STORAGE_ATTEMPTS_KEY);
    if (!json) {
      return [];
    }

    try {
      return JSON.parse(json) as VerificationAttempt[];
    } catch {
      return [];
    }
  }

  /**
   * Records a verification attempt
   */
  private recordAttempt(success: boolean): void {
    if (!this.config.storage) {
      return;
    }

    const attempts = this.getVerificationAttempts();
    const updated = recordVerificationAttempt(
      attempts,
      success,
      this.config.deviceId,
    );
    this.config.storage.setItem(STORAGE_ATTEMPTS_KEY, JSON.stringify(updated));
  }

  /**
   * Generates a unique backup ID
   */
  private generateBackupId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `${timestamp}-${random}`;
  }

  // ==========================================================================
  // Validation
  // ==========================================================================

  /**
   * Validates a backup without decrypting
   *
   * @param backupData - Serialized backup data
   * @returns Validation result
   */
  validateBackup(backupData: string): BackupValidation {
    try {
      const backup = parseBackup(backupData);
      return validateBackup(backup);
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Failed to parse backup: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  // ==========================================================================
  // Cleanup
  // ==========================================================================

  /**
   * Destroys the service
   */
  destroy(): void {
    this.stopAutoBackup();
    this.keyProvider = null;
    this.keyConsumer = null;
    this.initialized = false;
    logger.info("E2EE Backup service destroyed");
  }

  /**
   * Clears all stored backup data
   */
  clearAllData(): void {
    if (this.config.storage) {
      const keysToRemove = [
        STORAGE_HISTORY_KEY,
        STORAGE_KDF_PARAMS_KEY,
        STORAGE_RECOVERY_HASH_KEY,
        STORAGE_LAST_BACKUP_KEY,
        STORAGE_ATTEMPTS_KEY,
      ];

      for (const key of keysToRemove) {
        this.config.storage.removeItem(key);
      }
    }

    logger.info("All backup data cleared");
  }

  // ==========================================================================
  // Helpers
  // ==========================================================================

  /**
   * Ensures service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized || !this.keyProvider || !this.keyConsumer) {
      throw new Error(
        "Backup service not initialized. Call initialize() first.",
      );
    }
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Creates and returns a backup service instance
 */
export function createBackupService(
  config: BackupServiceConfig,
): E2EEBackupService {
  return new E2EEBackupService(config);
}

// ============================================================================
// Singleton Management
// ============================================================================

let backupServiceInstance: E2EEBackupService | null = null;

/**
 * Gets or creates the backup service singleton
 */
export function getBackupService(
  config?: BackupServiceConfig,
): E2EEBackupService {
  if (!backupServiceInstance && config) {
    backupServiceInstance = createBackupService(config);
  }

  if (!backupServiceInstance) {
    throw new Error(
      "Backup service not configured. Provide config on first call.",
    );
  }

  return backupServiceInstance;
}

/**
 * Resets the backup service singleton
 */
export function resetBackupService(): void {
  if (backupServiceInstance) {
    backupServiceInstance.destroy();
    backupServiceInstance = null;
  }
}

// ============================================================================
// Exports
// ============================================================================

export default E2EEBackupService;
