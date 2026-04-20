# E2EE Implementation — Security Reference

**Last updated:** 2026-04-20 (S09 — Kyber signature hardening)

---

## Overview

nChat E2EE uses the Signal Protocol via `@signalapp/libsignal-client` (currently v0.88.x).
It provides forward secrecy and break-in recovery through the Double Ratchet algorithm,
with post-quantum key encapsulation via Kyber-768 (ML-KEM).

---

## Kyber Prekey Signature (S09 — real sig, not dummy)

As of S09 (2026-04-20), the Kyber prekey signature in `signal-client.ts:processPreKeyBundle`
is a real Ed25519 signature produced by the local identity private key over the Kyber KEM
public key bytes. This replaces the previous 64-byte zero-buffer dummy.

### How it works

```typescript
// Kyber KEM keypair generated fresh per session
const kyberKeyPair = SignalClient.KEMKeyPair.generate()

// Identity private key signs the Kyber public key bytes
const identityPrivKey = SignalClient.PrivateKey.deserialize(
  Buffer.from(localIdentityKeyPair.privateKey)
)
const kyberSig = identityPrivKey.sign(kyberKeyPair.getPublicKey().serialize())

// PreKeyBundle.new() validates the signature; it throws on invalid input
const prekeyBundle = SignalClient.PreKeyBundle.new(
  ..., kyberKeyPair.getPublicKey(), kyberSig
)
```

- Signature algorithm: Ed25519 (via libsignal native Rust binding)
- Signature length: 64 bytes
- Signing key: local identity private key (same key used for SignedPreKey sigs)
- Signed message: `kyberKeyPair.getPublicKey().serialize()` bytes

### Tests

`tests/e2ee/kyber-signature.test.ts` — four test cases:
1. Signature is non-zero (regression against dummy `new Uint8Array(64)`)
2. Signature length is 64 bytes (Ed25519 spec)
3. Signature verifies under the identity public key (round-trip)
4. `processPreKeyBundle` constructs a bundle without throwing (integration proof)

---

## KyberPreKeyStore

`InMemoryKyberPreKeyStore` (in `signal-client.ts`) implements the full Signal Protocol
`KyberPreKeyStore` interface:

| Method | Behaviour |
|--------|-----------|
| `saveKyberPreKey(id, record)` | Stores record in memory |
| `getKyberPreKey(id)` | Returns record or throws if not found |
| `markKyberPreKeyUsed(id, signedPreKeyId, baseKey)` | Removes key (one-time semantics) |

`markKyberPreKeyUsed` accepts three arguments per the libsignal abstract class definition
(`kyberPreKeyId`, `signedPreKeyId`, `baseKey`). The prior stub only accepted one argument
and would have caused a runtime mismatch; S09 fixed the signature.

Backwards-compat: `decryptMessage` falls back to a fresh `InMemoryKyberPreKeyStore` when
the caller does not supply one. Existing sessions using non-Kyber prekeys continue to work.

---

## Admin Secret Gate (S09)

`src/lib/graphql/admin-client.ts` implements a three-layer production guard:

1. **Build-time (`next.config.js`):** Throws at build start if `NODE_ENV=production`
   and `HASURA_ADMIN_SECRET` is unset. Output contains `[BUILD GATE FIRED]`.
2. **Runtime — production:** `validateEnvironment()` throws `FATAL: HASURA_ADMIN_SECRET
   environment variable must be set` before any Apollo client is constructed.
3. **Dev-mode guard:** `SKIP_ENV_VALIDATION=true` is only accepted when
   `NODE_ENV !== 'production'` and `NEXT_PUBLIC_ALLOW_DUMMY_ADMIN_SECRET=true`. Any
   attempt to use `SKIP_ENV_VALIDATION=true` in a production build is rejected with a
   `CRITICAL` error.

---

## CI Lint Gate — Zero-buffer Sentinels (S09.T04)

The CI workflow (`ci.yml`) includes a lint step that fails if any file under
`src/lib/e2ee/` or `src/lib/graphql/` (excluding test files) contains a bare
`new Uint8Array(N) //` pattern. This catches future accidental zero-buffer sentinels.

---

## Crypto Primitives

| Primitive | Library | Purpose |
|-----------|---------|---------|
| X3DH | libsignal-client | Key agreement (session initiation) |
| Double Ratchet | libsignal-client | Forward-secret message encryption |
| Kyber-768 (ML-KEM) | libsignal-client | Post-quantum KEM in prekey bundle |
| Ed25519 | libsignal-client | Identity key signatures, prekey signatures |
| AES-256-GCM | Web Crypto API | Master key encryption, attachment encryption |
| HKDF-SHA256 | libsignal-client | Key derivation |

---

## Related pages

- [[E2EE-Implementation-Summary]] — original implementation notes (v0.4.0)
- [[E2EE-Security-Audit]] — security audit findings
- [[E2EE-THREAT-MODEL]] — threat model
- [[SECURITY.md]] — vulnerability reporting policy
- [[Home]]
