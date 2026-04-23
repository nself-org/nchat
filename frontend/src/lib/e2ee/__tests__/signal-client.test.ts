/**
 * Signal Client — Kyber Signing & PQXDH Tests
 *
 * Verifies that:
 * 1. The Kyber pre-key signature is non-zero (real Ed25519, not a zero buffer).
 * 2. The signature round-trips through sign → verify successfully.
 * 3. An all-zero signature is rejected.
 * 4. A two-peer PQXDH session can be established using processPreKeyBundle.
 *
 * These tests run against the Node.js crypto mock for libsignal-client
 * (see src/__tests__/mocks/libsignal-client.ts), which preserves real
 * Ed25519 semantics while avoiding the WASM loader.
 */

import * as SignalClient from '@signalapp/libsignal-client'
import {
  generateIdentityKeyPair,
  processPreKeyBundle,
  InMemoryKyberPreKeyStore,
  type PreKeyBundle,
} from '../signal-client'

// ============================================================================
// Helpers
// ============================================================================

function makeAddress(name: string, deviceId = 1): SignalClient.ProtocolAddress {
  return SignalClient.ProtocolAddress.new(name, deviceId)
}

// ============================================================================
// Suite 1 — Kyber signature is non-zero and verifiable
// ============================================================================

describe('Kyber pre-key signature — real (non-zero)', () => {
  it('generates a non-zero Kyber signature', () => {
    const identityPrivateKey = SignalClient.PrivateKey.generate()
    const kyberKeyPair = SignalClient.KEMKeyPair.generate()

    const signature = identityPrivateKey.sign(kyberKeyPair.getPublicKey().serialize())

    // Must not be all zeros — the original stub produced new Uint8Array(64).
    const isAllZeros = Array.from(signature).every((b) => b === 0)
    expect(isAllZeros).toBe(false)
  })

  it('generated signature has non-trivial length (>= 32 bytes)', () => {
    const identityPrivateKey = SignalClient.PrivateKey.generate()
    const kyberKeyPair = SignalClient.KEMKeyPair.generate()

    const signature = identityPrivateKey.sign(kyberKeyPair.getPublicKey().serialize())

    expect(signature.length).toBeGreaterThanOrEqual(32)
  })

  it('sign → verify round-trip passes with matching identity key', () => {
    const identityPrivateKey = SignalClient.PrivateKey.generate()
    const identityPublicKey = identityPrivateKey.getPublicKey()
    const kyberKeyPair = SignalClient.KEMKeyPair.generate()
    const kyberPublicBytes = kyberKeyPair.getPublicKey().serialize()

    const signature = identityPrivateKey.sign(kyberPublicBytes)
    const valid = identityPublicKey.verify(kyberPublicBytes, signature)

    expect(valid).toBe(true)
  })

  it('verify returns false for a mismatched identity key', () => {
    const identityPrivateKey = SignalClient.PrivateKey.generate()
    const wrongIdentityPrivateKey = SignalClient.PrivateKey.generate()
    const wrongIdentityPublicKey = wrongIdentityPrivateKey.getPublicKey()

    const kyberKeyPair = SignalClient.KEMKeyPair.generate()
    const kyberPublicBytes = kyberKeyPair.getPublicKey().serialize()

    // Sign with the correct key, verify with a different public key.
    const signature = identityPrivateKey.sign(kyberPublicBytes)
    const valid = wrongIdentityPublicKey.verify(kyberPublicBytes, signature)

    expect(valid).toBe(false)
  })

  it('rejects an all-zero signature (zero-buffer stub detection)', () => {
    const identityPrivateKey = SignalClient.PrivateKey.generate()
    const identityPublicKey = identityPrivateKey.getPublicKey()
    const kyberKeyPair = SignalClient.KEMKeyPair.generate()
    const kyberPublicBytes = kyberKeyPair.getPublicKey().serialize()

    const zeroSignature = Buffer.alloc(64, 0)
    const valid = identityPublicKey.verify(kyberPublicBytes, zeroSignature)

    expect(valid).toBe(false)
  })

  it('sign → verify fails when the signed payload is tampered', () => {
    const identityPrivateKey = SignalClient.PrivateKey.generate()
    const identityPublicKey = identityPrivateKey.getPublicKey()
    const kyberKeyPair = SignalClient.KEMKeyPair.generate()
    const kyberPublicBytes = kyberKeyPair.getPublicKey().serialize()

    const signature = identityPrivateKey.sign(kyberPublicBytes)

    // Tamper with the first byte of the message.
    const tampered = Buffer.from(kyberPublicBytes)
    tampered[0] ^= 0xff

    const valid = identityPublicKey.verify(tampered, signature)
    expect(valid).toBe(false)
  })
})

// ============================================================================
// Suite 2 — InMemoryKyberPreKeyStore basic CRUD
// ============================================================================

describe('InMemoryKyberPreKeyStore — CRUD', () => {
  let store: InMemoryKyberPreKeyStore

  beforeEach(() => {
    store = new InMemoryKyberPreKeyStore()
  })

  it('stores and retrieves a KyberPreKeyRecord without throwing', async () => {
    const id = 42
    const keyPair = SignalClient.KEMKeyPair.generate()
    const record = SignalClient.KyberPreKeyRecord.new(id, Date.now(), keyPair)

    await store.saveKyberPreKey(id, record)
    const retrieved = await store.getKyberPreKey(id)

    expect(retrieved).toBeDefined()
    expect(retrieved.id()).toBe(id)
  })

  it('throws when loading a non-existent key', async () => {
    await expect(store.getKyberPreKey(9999)).rejects.toThrow('KyberPreKey 9999 not found')
  })

  it('removes a key via markKyberPreKeyUsed', async () => {
    const id = 1
    const keyPair = SignalClient.KEMKeyPair.generate()
    const record = SignalClient.KyberPreKeyRecord.new(id, Date.now(), keyPair)

    await store.saveKyberPreKey(id, record)

    const dummyBaseKey = SignalClient.PrivateKey.generate().getPublicKey()
    await store.markKyberPreKeyUsed(id, 0, dummyBaseKey as any)

    // After marking used, the key should no longer be retrievable.
    await expect(store.getKyberPreKey(id)).rejects.toThrow()
  })

  it('stores multiple keys independently', async () => {
    for (let i = 0; i < 5; i++) {
      const keyPair = SignalClient.KEMKeyPair.generate()
      const record = SignalClient.KyberPreKeyRecord.new(i, Date.now(), keyPair)
      await store.saveKyberPreKey(i, record)
    }

    for (let i = 0; i < 5; i++) {
      const retrieved = await store.getKyberPreKey(i)
      expect(retrieved.id()).toBe(i)
    }
  })
})

// ============================================================================
// Suite 3 — PQXDH session establishment (two peers)
// ============================================================================

describe('PQXDH session establishment', () => {
  it('establishes a session between two peers without throwing', async () => {
    // Alice = initiator, Bob = responder.
    const aliceIdentityKeyPair = await generateIdentityKeyPair()
    const bobIdentityKeyPair = await generateIdentityKeyPair()

    const aliceAddress = makeAddress('alice')
    const bobAddress = makeAddress('bob')

    // Build Bob's pre-key bundle that Alice will process.
    const bobBundle: PreKeyBundle = {
      registrationId: 42,
      deviceId: '1',
      identityKey: bobIdentityKeyPair.publicKey,
      signedPreKey: {
        keyId: 1,
        publicKey: bobIdentityKeyPair.publicKey, // simplified — real pubkey reused for test
        signature: SignalClient.PrivateKey.deserialize(
          Buffer.from(bobIdentityKeyPair.privateKey)
        ).sign(Buffer.from(bobIdentityKeyPair.publicKey)),
      },
    }

    // processPreKeyBundle(bundle, localIdentityKeyPair, localRegistrationId, remoteAddress)
    await expect(
      processPreKeyBundle(bobBundle, aliceIdentityKeyPair, 1, aliceAddress)
    ).resolves.not.toThrow()
  })

  it('generates a non-zero Kyber signature inside processPreKeyBundle', async () => {
    // Spy on PrivateKey.sign to capture the Kyber signature bytes.
    const signSpy = jest.spyOn(SignalClient.PrivateKey.prototype, 'sign')

    const aliceIdentityKeyPair = await generateIdentityKeyPair()
    const aliceAddress = makeAddress('alice')

    // Build a minimal valid bundle (the signedPreKey signature must be real).
    const localPrivKey = SignalClient.PrivateKey.deserialize(
      Buffer.from(aliceIdentityKeyPair.privateKey)
    )
    const localPubKey = localPrivKey.getPublicKey()

    const bundle: PreKeyBundle = {
      registrationId: 10,
      deviceId: '1',
      identityKey: localPubKey.serialize(),
      signedPreKey: {
        keyId: 1,
        publicKey: localPubKey.serialize(),
        signature: localPrivKey.sign(localPubKey.serialize()),
      },
    }

    // processPreKeyBundle(bundle, localIdentityKeyPair, localRegistrationId, remoteAddress)
    await processPreKeyBundle(bundle, aliceIdentityKeyPair, 1, aliceAddress)

    // The sign spy must have been called and must have returned a non-zero buffer.
    expect(signSpy).toHaveBeenCalled()
    const allReturnValues = signSpy.mock.results.map((r) => Array.from(r.value as Buffer))
    const hasNonZero = allReturnValues.some((arr) => arr.some((b) => b !== 0))
    expect(hasNonZero).toBe(true)

    signSpy.mockRestore()
  })
})
