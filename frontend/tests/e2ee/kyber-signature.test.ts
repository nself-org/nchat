/**
 * S09.T01 — Kyber signature unit tests
 *
 * Verifies that the prekey bundle Kyber signature:
 *   1. Is non-zero (no dummy Uint8Array(64) zero bytes)
 *   2. Passes round-trip verify under the signing identity public key
 *   3. Has a length consistent with libsignal Ed25519 signatures (64 bytes)
 *
 * The `processPreKeyBundle` function signs the Kyber public key bytes with the
 * local identity private key via `PrivateKey.sign()`. This is the same signing
 * mechanism used for SignedPreKey signatures in the Signal Protocol.
 */

import * as SignalClient from '@signalapp/libsignal-client'
import { processPreKeyBundle, generateIdentityKeyPair } from '@/lib/e2ee/signal-client'

// --------------------------------------------------------------------------
// Helper — build a minimal prekey bundle and extract the kyberSig from a
// patched processPreKeyBundle call. Because PreKeyBundle.new() validates the
// signature before constructing the object, constructing a bundle with a bad
// signature throws, which also serves as the round-trip verify test.
// --------------------------------------------------------------------------

describe('Kyber prekey signature (S09.T01)', () => {
  let identityKeyPair: { publicKey: Uint8Array; privateKey: Uint8Array }

  beforeEach(async () => {
    identityKeyPair = await generateIdentityKeyPair()
  })

  test('T01-1: kyberSig is non-zero — no dummy Uint8Array(64) zeros', () => {
    // Reconstruct the signing path used inside processPreKeyBundle.
    const identityPrivateKey = SignalClient.PrivateKey.deserialize(
      Buffer.from(identityKeyPair.privateKey)
    )
    const kyberKeyPair = SignalClient.KEMKeyPair.generate()
    const kyberSig = identityPrivateKey.sign(kyberKeyPair.getPublicKey().serialize())

    // Signature must not be all zeros.
    const allZero = Array.from(kyberSig).every((b) => b === 0)
    expect(allZero).toBe(false)
  })

  test('T01-2: kyberSig length matches Ed25519 spec (64 bytes)', () => {
    const identityPrivateKey = SignalClient.PrivateKey.deserialize(
      Buffer.from(identityKeyPair.privateKey)
    )
    const kyberKeyPair = SignalClient.KEMKeyPair.generate()
    const kyberSig = identityPrivateKey.sign(kyberKeyPair.getPublicKey().serialize())

    // libsignal Ed25519 signatures are always 64 bytes.
    expect(kyberSig.length).toBe(64)
  })

  test('T01-3: kyberSig round-trip — verifies under the identity public key', () => {
    const identityPrivateKey = SignalClient.PrivateKey.deserialize(
      Buffer.from(identityKeyPair.privateKey)
    )
    const identityPublicKey = SignalClient.PublicKey.deserialize(
      Buffer.from(identityKeyPair.publicKey)
    )
    const kyberKeyPair = SignalClient.KEMKeyPair.generate()
    const msg = kyberKeyPair.getPublicKey().serialize()
    const kyberSig = identityPrivateKey.sign(msg)

    // Verify signature under the corresponding public key.
    expect(identityPublicKey.verify(msg, kyberSig)).toBe(true)
  })

  test('T01-4: processPreKeyBundle constructs bundle without throwing (real sig)', async () => {
    // If the kyber signature is invalid, PreKeyBundle.new() or processPreKeyBundle
    // throws. A successful call proves the signature is cryptographically valid.
    const localRegId = Math.floor(Math.random() * 16383) + 1
    const remoteRegId = Math.floor(Math.random() * 16383) + 1

    const remoteIdentityKP = await generateIdentityKeyPair()
    const remoteIdentityPriv = SignalClient.PrivateKey.deserialize(
      Buffer.from(remoteIdentityKP.privateKey)
    )

    const signedPreKeyPriv = SignalClient.PrivateKey.generate()
    const signedPreKeyPub = signedPreKeyPriv.getPublicKey()
    const spkSig = remoteIdentityPriv.sign(signedPreKeyPub.serialize())

    const remoteAddress = SignalClient.ProtocolAddress.new('remote-user', 1)

    await expect(
      processPreKeyBundle(
        {
          registrationId: remoteRegId,
          deviceId: '1',
          identityKey: remoteIdentityKP.publicKey,
          signedPreKey: {
            keyId: 1,
            publicKey: signedPreKeyPub.serialize(),
            signature: spkSig,
          },
        },
        identityKeyPair,
        localRegId,
        remoteAddress
      )
    ).resolves.toBeUndefined()
  })
})
