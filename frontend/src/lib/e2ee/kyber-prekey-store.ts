/**
 * Persistent KyberPreKeyStore
 *
 * Implements the @signalapp/libsignal-client KyberPreKeyStore interface backed
 * by localStorage (web) with serialisation via Uint8Array round-trips.
 *
 * Native (Capacitor) environments can pass a StorageAdapter that wraps
 * SQLite/Capacitor Preferences — the store itself is storage-agnostic.
 *
 * Migration: if a user has existing sessions that relied on the previous
 * InMemoryKyberPreKeyStore (which lost keys on reload), a
 * `kyber_needs_provisioning` flag is written to storage on first construction.
 * The calling code (key-manager / session-manager) must detect this flag and
 * trigger re-provisioning of Kyber pre-keys on next login.
 */

import * as SignalClient from '@signalapp/libsignal-client'

// ============================================================================
// Storage adapter interface
// ============================================================================

/**
 * Minimal storage adapter — allows swapping localStorage for SQLite/Preferences
 * on native platforms without changing the store logic.
 */
export interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>
  setItem(key: string, value: string): void | Promise<void>
  removeItem(key: string): void | Promise<void>
}

// ============================================================================
// Constants
// ============================================================================

const STORE_PREFIX = 'nchat_kyber_prekey_'
const INDEX_KEY = 'nchat_kyber_prekey_index'
const PROVISIONING_FLAG_KEY = 'kyber_needs_provisioning'
const STORE_VERSION_KEY = 'nchat_kyber_store_version'
const CURRENT_VERSION = '1'

// ============================================================================
// PersistentKyberPreKeyStore
// ============================================================================

export class PersistentKyberPreKeyStore extends SignalClient.KyberPreKeyStore {
  private storage: StorageAdapter

  constructor(storage?: StorageAdapter) {
    super()
    this.storage =
      storage ??
      (typeof localStorage !== 'undefined'
        ? (localStorage as StorageAdapter)
        : new MemoryStorageAdapter())
    this._maybeWriteMigrationFlag()
  }

  /**
   * Write `kyber_needs_provisioning = true` for users who have never had a
   * persistent Kyber store (version key absent). New devices skip this.
   *
   * Note: uses the injected adapter synchronously (MemoryStorageAdapter and
   * localStorage both support sync getItem). Async adapters (SQLite) are not
   * supported here — they should set the flag via their own migration path.
   */
  private _maybeWriteMigrationFlag(): void {
    // Attempt sync read from the injected adapter.
    // MemoryStorageAdapter.getItem returns string|null (synchronous).
    // localStorage.getItem also returns string|null synchronously.
    // If the adapter is async-only, skip (flag won't be set, which is safe —
    // async adapters are new installations that don't need migration).
    const versionRaw = this.storage.getItem(STORE_VERSION_KEY)
    if (typeof versionRaw !== 'string' && versionRaw !== null) {
      // Async adapter (Promise returned) — skip sync migration check.
      return
    }
    const version = versionRaw as string | null
    if (version === null) {
      // First time this store runs on this device/adapter.
      const existingIndexRaw = this.storage.getItem(INDEX_KEY)
      const existingIndex =
        typeof existingIndexRaw === 'string' ? existingIndexRaw : null
      if (existingIndex !== null) {
        // Keys existed in a prior session — flag for re-provisioning.
        this.storage.setItem(PROVISIONING_FLAG_KEY, 'true')
      }
      this.storage.setItem(STORE_VERSION_KEY, CURRENT_VERSION)
    }
  }

  // --------------------------------------------------------------------------
  // KyberPreKeyStore interface
  // --------------------------------------------------------------------------

  async saveKyberPreKey(
    kyberPreKeyId: number,
    record: SignalClient.KyberPreKeyRecord
  ): Promise<void> {
    const key = `${STORE_PREFIX}${kyberPreKeyId}`
    const serialized = Buffer.from(record.serialize()).toString('base64')
    await this.storage.setItem(key, serialized)
    await this._addToIndex(kyberPreKeyId)
  }

  async getKyberPreKey(kyberPreKeyId: number): Promise<SignalClient.KyberPreKeyRecord> {
    const key = `${STORE_PREFIX}${kyberPreKeyId}`
    const data = await this.storage.getItem(key)
    if (!data) {
      throw new Error(`KyberPreKey ${kyberPreKeyId} not found`)
    }
    const bytes = Buffer.from(data, 'base64')
    return SignalClient.KyberPreKeyRecord.deserialize(bytes)
  }

  async markKyberPreKeyUsed(
    kyberPreKeyId: number,
    _signedPreKeyId: number,
    _baseKey: SignalClient.PublicKey
  ): Promise<void> {
    // One-time pre-key semantics: remove after use.
    const key = `${STORE_PREFIX}${kyberPreKeyId}`
    await this.storage.removeItem(key)
    await this._removeFromIndex(kyberPreKeyId)
  }

  // --------------------------------------------------------------------------
  // Additional helpers (not part of libsignal interface)
  // --------------------------------------------------------------------------

  /**
   * Returns true if a key with the given ID exists in storage.
   */
  async containsKyberPreKey(kyberPreKeyId: number): Promise<boolean> {
    const key = `${STORE_PREFIX}${kyberPreKeyId}`
    const data = await this.storage.getItem(key)
    return data !== null
  }

  /**
   * Explicitly remove a key (distinct from markKyberPreKeyUsed — used in
   * re-provisioning flows where we want to purge without a session context).
   */
  async removeKyberPreKey(kyberPreKeyId: number): Promise<void> {
    const key = `${STORE_PREFIX}${kyberPreKeyId}`
    await this.storage.removeItem(key)
    await this._removeFromIndex(kyberPreKeyId)
  }

  /**
   * Returns all stored Kyber pre-key IDs.
   */
  async getAllKeyIds(): Promise<number[]> {
    const raw = await this.storage.getItem(INDEX_KEY)
    if (!raw) return []
    try {
      return JSON.parse(raw) as number[]
    } catch {
      return []
    }
  }

  /**
   * Whether the migration flag is set (signals caller must re-provision).
   * Reads synchronously from the adapter; async adapters always return false here
   * (they don't need migration).
   */
  needsProvisioning(): boolean {
    const raw = this.storage.getItem(PROVISIONING_FLAG_KEY)
    // Only trust synchronous (string | null) results.
    if (typeof raw === 'string') return raw === 'true'
    return false
  }

  /**
   * Clear the provisioning flag after re-provisioning completes.
   */
  clearProvisioningFlag(): void {
    const result = this.storage.removeItem(PROVISIONING_FLAG_KEY)
    // If the adapter is async, fire-and-forget is acceptable here.
    if (result instanceof Promise) {
      result.catch(() => undefined)
    }
  }

  /**
   * Remove all stored Kyber pre-keys and the index.
   * Used in re-provisioning and account wipe flows.
   */
  async clear(): Promise<void> {
    const ids = await this.getAllKeyIds()
    for (const id of ids) {
      await this.storage.removeItem(`${STORE_PREFIX}${id}`)
    }
    await this.storage.removeItem(INDEX_KEY)
  }

  // --------------------------------------------------------------------------
  // Index helpers
  // --------------------------------------------------------------------------

  private async _addToIndex(id: number): Promise<void> {
    const ids = await this.getAllKeyIds()
    if (!ids.includes(id)) {
      ids.push(id)
      await this.storage.setItem(INDEX_KEY, JSON.stringify(ids))
    }
  }

  private async _removeFromIndex(id: number): Promise<void> {
    const ids = await this.getAllKeyIds()
    const updated = ids.filter((i) => i !== id)
    await this.storage.setItem(INDEX_KEY, JSON.stringify(updated))
  }

}

// ============================================================================
// MemoryStorageAdapter — SSR / test fallback
// ============================================================================

/**
 * In-process memory adapter used when localStorage is unavailable (SSR, tests
 * that pass their own adapter). NOT suitable for production persistence.
 */
export class MemoryStorageAdapter implements StorageAdapter {
  private _data: Map<string, string> = new Map()

  getItem(key: string): string | null {
    return this._data.get(key) ?? null
  }

  setItem(key: string, value: string): void {
    this._data.set(key, value)
  }

  removeItem(key: string): void {
    this._data.delete(key)
  }

  /** Test helper — wipe all data. */
  clear(): void {
    this._data.clear()
  }

  get size(): number {
    return this._data.size
  }
}

// ============================================================================
// Factory
// ============================================================================

/**
 * Create a PersistentKyberPreKeyStore with the default platform storage.
 * Pass a custom StorageAdapter in tests or on native platforms.
 */
export function createKyberPreKeyStore(storage?: StorageAdapter): PersistentKyberPreKeyStore {
  return new PersistentKyberPreKeyStore(storage)
}
