/**
 * PersistentKyberPreKeyStore Tests
 *
 * Verifies that the persistent Kyber pre-key store:
 * 1. stores and loads records correctly (non-throwing)
 * 2. reports containsKyberPreKey accurately
 * 3. removes records via removeKyberPreKey
 * 4. removes records via markKyberPreKeyUsed (one-time semantics)
 * 5. maintains a persisted index of all key IDs
 * 6. writes the migration flag when an existing index is found on first run
 * 7. does NOT write the migration flag for a fresh device (no prior index)
 *
 * All tests use MemoryStorageAdapter to avoid touching real localStorage.
 */

import * as SignalClient from '@signalapp/libsignal-client'
import {
  PersistentKyberPreKeyStore,
  MemoryStorageAdapter,
  createKyberPreKeyStore,
} from '../kyber-prekey-store'

// ============================================================================
// Helpers
// ============================================================================

function makeRecord(id: number): SignalClient.KyberPreKeyRecord {
  const keyPair = SignalClient.KEMKeyPair.generate()
  return SignalClient.KyberPreKeyRecord.new(id, Date.now(), keyPair)
}

// ============================================================================
// Suite 1 — store + load round-trip
// ============================================================================

describe('PersistentKyberPreKeyStore — store/load', () => {
  let adapter: MemoryStorageAdapter
  let store: PersistentKyberPreKeyStore

  beforeEach(() => {
    adapter = new MemoryStorageAdapter()
    store = new PersistentKyberPreKeyStore(adapter)
  })

  it('storeKyberPreKey + loadKyberPreKey round-trips without throwing', async () => {
    const record = makeRecord(1)
    await store.saveKyberPreKey(1, record)
    const loaded = await store.getKyberPreKey(1)
    expect(loaded).toBeDefined()
  })

  it('loaded record has the same ID as the stored record', async () => {
    const id = 77
    const record = makeRecord(id)
    await store.saveKyberPreKey(id, record)
    const loaded = await store.getKyberPreKey(id)
    expect(loaded.id()).toBe(id)
  })

  it('stores multiple records independently', async () => {
    for (let i = 1; i <= 5; i++) {
      await store.saveKyberPreKey(i, makeRecord(i))
    }
    for (let i = 1; i <= 5; i++) {
      const loaded = await store.getKyberPreKey(i)
      expect(loaded.id()).toBe(i)
    }
  })

  it('throws when loading a key that was never stored', async () => {
    await expect(store.getKyberPreKey(999)).rejects.toThrow('KyberPreKey 999 not found')
  })
})

// ============================================================================
// Suite 2 — containsKyberPreKey
// ============================================================================

describe('PersistentKyberPreKeyStore — containsKyberPreKey', () => {
  let adapter: MemoryStorageAdapter
  let store: PersistentKyberPreKeyStore

  beforeEach(() => {
    adapter = new MemoryStorageAdapter()
    store = new PersistentKyberPreKeyStore(adapter)
  })

  it('returns true after storing a key', async () => {
    await store.saveKyberPreKey(10, makeRecord(10))
    expect(await store.containsKyberPreKey(10)).toBe(true)
  })

  it('returns false for a key that was never stored', async () => {
    expect(await store.containsKyberPreKey(999)).toBe(false)
  })

  it('returns false after the key has been removed', async () => {
    await store.saveKyberPreKey(20, makeRecord(20))
    await store.removeKyberPreKey(20)
    expect(await store.containsKyberPreKey(20)).toBe(false)
  })
})

// ============================================================================
// Suite 3 — removeKyberPreKey
// ============================================================================

describe('PersistentKyberPreKeyStore — removeKyberPreKey', () => {
  let adapter: MemoryStorageAdapter
  let store: PersistentKyberPreKeyStore

  beforeEach(() => {
    adapter = new MemoryStorageAdapter()
    store = new PersistentKyberPreKeyStore(adapter)
  })

  it('removes a key; subsequent getKyberPreKey throws', async () => {
    await store.saveKyberPreKey(5, makeRecord(5))
    await store.removeKyberPreKey(5)
    await expect(store.getKyberPreKey(5)).rejects.toThrow()
  })

  it('removes the key from the index', async () => {
    await store.saveKyberPreKey(5, makeRecord(5))
    await store.removeKyberPreKey(5)
    const ids = await store.getAllKeyIds()
    expect(ids).not.toContain(5)
  })

  it('does not throw when removing a key that does not exist', async () => {
    await expect(store.removeKyberPreKey(8888)).resolves.not.toThrow()
  })
})

// ============================================================================
// Suite 4 — markKyberPreKeyUsed (one-time-prekey semantics)
// ============================================================================

describe('PersistentKyberPreKeyStore — markKyberPreKeyUsed', () => {
  let adapter: MemoryStorageAdapter
  let store: PersistentKyberPreKeyStore

  beforeEach(() => {
    adapter = new MemoryStorageAdapter()
    store = new PersistentKyberPreKeyStore(adapter)
  })

  it('removes the key after markKyberPreKeyUsed', async () => {
    await store.saveKyberPreKey(3, makeRecord(3))

    const dummyBaseKey = SignalClient.PrivateKey.generate().getPublicKey()
    await store.markKyberPreKeyUsed(3, 0, dummyBaseKey as any)

    expect(await store.containsKyberPreKey(3)).toBe(false)
  })

  it('subsequent contains returns false after markKyberPreKeyUsed', async () => {
    await store.saveKyberPreKey(7, makeRecord(7))

    const dummyBaseKey = SignalClient.PrivateKey.generate().getPublicKey()
    await store.markKyberPreKeyUsed(7, 0, dummyBaseKey as any)

    expect(await store.containsKyberPreKey(7)).toBe(false)
  })
})

// ============================================================================
// Suite 5 — index persistence
// ============================================================================

describe('PersistentKyberPreKeyStore — index', () => {
  let adapter: MemoryStorageAdapter

  beforeEach(() => {
    adapter = new MemoryStorageAdapter()
  })

  it('getAllKeyIds returns all stored IDs', async () => {
    const store = new PersistentKyberPreKeyStore(adapter)
    await store.saveKyberPreKey(10, makeRecord(10))
    await store.saveKyberPreKey(20, makeRecord(20))
    await store.saveKyberPreKey(30, makeRecord(30))

    const ids = await store.getAllKeyIds()
    expect(ids).toEqual(expect.arrayContaining([10, 20, 30]))
    expect(ids.length).toBe(3)
  })

  it('index survives re-construction from the same adapter', async () => {
    const store1 = new PersistentKyberPreKeyStore(adapter)
    await store1.saveKyberPreKey(55, makeRecord(55))
    await store1.saveKyberPreKey(66, makeRecord(66))

    // Re-create from the same underlying adapter — simulates a page reload.
    const store2 = new PersistentKyberPreKeyStore(adapter)
    const loaded = await store2.getKyberPreKey(55)
    expect(loaded.id()).toBe(55)
    expect(await store2.containsKyberPreKey(66)).toBe(true)
  })

  it('clear() removes all keys and empties the index', async () => {
    const store = new PersistentKyberPreKeyStore(adapter)
    for (let i = 1; i <= 5; i++) {
      await store.saveKyberPreKey(i, makeRecord(i))
    }

    await store.clear()

    const ids = await store.getAllKeyIds()
    expect(ids.length).toBe(0)

    for (let i = 1; i <= 5; i++) {
      expect(await store.containsKyberPreKey(i)).toBe(false)
    }
  })
})

// ============================================================================
// Suite 6 — PQXDH rotation migration flag
// ============================================================================

describe('PersistentKyberPreKeyStore — migration / provisioning flag', () => {
  it('does NOT set kyber_needs_provisioning for a brand-new device (no prior index)', () => {
    const adapter = new MemoryStorageAdapter()
    const store = new PersistentKyberPreKeyStore(adapter)
    // Fresh adapter — no index key was present, so no migration flag expected.
    expect(store.needsProvisioning()).toBe(false)
  })

  it('sets kyber_needs_provisioning when a prior index exists on first-version init', () => {
    const adapter = new MemoryStorageAdapter()
    // Simulate an existing index left by the old InMemoryKyberPreKeyStore
    // (which never persisted to disk — but let's say a prior code path wrote an index).
    adapter.setItem('nchat_kyber_prekey_index', JSON.stringify([1, 2, 3]))
    // Crucially, the version key is absent (first time new store code runs).

    const store = new PersistentKyberPreKeyStore(adapter)
    expect(store.needsProvisioning()).toBe(true)
  })

  it('clearProvisioningFlag removes the flag', () => {
    const adapter = new MemoryStorageAdapter()
    adapter.setItem('nchat_kyber_prekey_index', JSON.stringify([1]))
    const store = new PersistentKyberPreKeyStore(adapter)

    expect(store.needsProvisioning()).toBe(true)
    store.clearProvisioningFlag()
    expect(store.needsProvisioning()).toBe(false)
  })
})

// ============================================================================
// Suite 7 — factory
// ============================================================================

describe('createKyberPreKeyStore factory', () => {
  it('creates a PersistentKyberPreKeyStore', () => {
    const adapter = new MemoryStorageAdapter()
    const store = createKyberPreKeyStore(adapter)
    expect(store).toBeInstanceOf(PersistentKyberPreKeyStore)
  })
})
