# End-to-End Encryption (E2EE) Library

**Signal Protocol implementation for nself-chat**

---

## Overview

This directory contains the complete end-to-end encryption implementation using the Signal Protocol. The library provides Signal-level security with perfect forward secrecy for direct messages and private channels.

**Version**: 0.4.0
**Protocol**: Signal Protocol (X3DH + Double Ratchet)
**Library**: `@signalapp/libsignal-client` (official implementation)

---

## Architecture

```
src/lib/e2ee/
├── index.ts                  # E2EE Manager (main entry point)
├── crypto.ts                 # Low-level crypto operations
├── signal-client.ts          # Signal Protocol wrapper
├── key-manager.ts            # Key generation and storage
├── session-manager.ts        # Session lifecycle
├── message-encryption.ts     # Message integration helpers
└── README.md                 # This file
```

---

## Core Modules

### 1. E2EE Manager (`index.ts`)

Main orchestration layer that ties everything together.

```typescript
import { getE2EEManager } from "@/lib/e2ee";

const e2eeManager = getE2EEManager(apolloClient);

// Initialize
await e2eeManager.initialize(password);

// Encrypt
const result = await e2eeManager.encryptMessage(
  plaintext,
  recipientUserId,
  recipientDeviceId,
);

// Decrypt
const plaintext = await e2eeManager.decryptMessage(
  encryptedPayload,
  messageType,
  senderUserId,
  senderDeviceId,
);
```

**Key Features**:

- Singleton pattern for consistent state
- Automatic session management
- Key rotation and replenishment
- Recovery code generation

---

### 2. Crypto Utilities (`crypto.ts`)

Low-level cryptographic operations.

```typescript
import { crypto } from "@/lib/e2ee/crypto";

// Random generation
const salt = crypto.generateSalt();
const deviceId = crypto.generateDeviceId();

// Key derivation
const masterKey = await crypto.deriveMasterKey(password, salt, 100000);

// Symmetric encryption
const { ciphertext, iv } = await crypto.encryptAESGCM(plaintext, key);
const plaintext = await crypto.decryptAESGCM(ciphertext, key, iv);

// Safety numbers
const safetyNumber = crypto.generateSafetyNumber(
  localIdentityKey,
  localUserId,
  remoteIdentityKey,
  remoteUserId,
);
```

**Algorithms**:

- PBKDF2-SHA256 (100k iterations)
- AES-256-GCM
- SHA-256, SHA-512
- Constant-time comparison

---

### 3. Signal Client (`signal-client.ts`)

Wrapper around `@signalapp/libsignal-client`.

```typescript
import { signalClient } from "@/lib/e2ee/signal-client";

// Generate keys
const identityKeyPair = await signalClient.generateIdentityKeyPair();
const signedPreKey = await signalClient.generateSignedPreKey(
  identityKeyPair,
  1,
);
const oneTimePreKeys = await signalClient.generateOneTimePreKeys(1, 100);

// Encrypt/decrypt messages
const encrypted = await signalClient.encryptMessage(
  plaintext,
  address,
  sessionStore,
  identityKeyStore,
);

const decrypted = await signalClient.decryptMessage(
  encrypted,
  address,
  sessionStore,
  identityKeyStore,
  preKeyStore,
  signedPreKeyStore,
);
```

**Protocol**: X3DH + Double Ratchet

---

### 4. Key Manager (`key-manager.ts`)

Manages all cryptographic keys.

```typescript
import KeyManager from "@/lib/e2ee/key-manager";

const keyManager = new KeyManager(apolloClient);

// Initialize master key
await keyManager.initializeMasterKey(password);

// Generate device keys
const deviceKeys = await keyManager.generateDeviceKeys();
await keyManager.uploadDeviceKeys(deviceKeys);

// Rotate signed prekey
await keyManager.rotateSignedPreKey(deviceId);

// Replenish one-time prekeys
await keyManager.replenishOneTimePreKeys(deviceId, 50);
```

**Key Types**:

- Master Key (password-derived)
- Identity Key Pair (per device)
- Signed Prekey (rotated weekly)
- One-Time Prekeys (100 per device)

---

### 5. Session Manager (`session-manager.ts`)

Manages Signal Protocol sessions.

```typescript
import SessionManager from "@/lib/e2ee/session-manager";

const sessionManager = new SessionManager(apolloClient, keyManager, deviceId);

// Create session
await sessionManager.createSession(peerUserId, peerDeviceId);

// Encrypt message
const encrypted = await sessionManager.encryptMessage(
  plaintext,
  peerUserId,
  peerDeviceId,
);

// Decrypt message
const plaintext = await sessionManager.decryptMessage(
  encrypted,
  peerUserId,
  peerDeviceId,
);
```

**Features**:

- X3DH key exchange
- Double Ratchet encryption
- Session state persistence
- Automatic session creation

---

### 6. Message Encryption (`message-encryption.ts`)

Integration helpers for message flow.

```typescript
import {
  encryptMessageForSending,
  decryptReceivedMessage,
  prepareMessageForStorage,
  extractMessageContent,
} from "@/lib/e2ee/message-encryption";

// Sending
const payload = await encryptMessageForSending(
  plaintext,
  { recipientUserId, isDirectMessage: true },
  apolloClient,
);

const messageData = prepareMessageForStorage(payload);

// Receiving
const plaintext = await extractMessageContent(message, apolloClient);
```

**Helpers**:

- Message encryption/decryption
- Database storage preparation
- Content extraction
- Batch operations

---

## Security Properties

✅ **End-to-End Encryption**: Only sender and recipient can read messages
✅ **Perfect Forward Secrecy**: Past messages remain secure
✅ **Future Secrecy**: Future messages secure after key compromise
✅ **Authentication**: Cryptographic sender verification
✅ **Deniability**: No cryptographic proof of sender
✅ **Zero-Knowledge**: Server cannot decrypt anything

---

## Usage Examples

### Complete Setup Flow

```typescript
import { getE2EEManager } from "@/lib/e2ee";

// 1. Initialize E2EE
const e2eeManager = getE2EEManager(apolloClient);
await e2eeManager.initialize("strong-password");

// 2. Get recovery code (save securely!)
const recoveryCode = e2eeManager.getRecoveryCode();
console.log("Recovery code:", recoveryCode);

// 3. Check status
const status = e2eeManager.getStatus();
console.log(status);
// {
//   initialized: true,
//   masterKeyInitialized: true,
//   deviceKeysGenerated: true,
//   deviceId: 'abc123...'
// }
```

### Send Encrypted Message

```typescript
// 1. Encrypt message
const result = await e2eeManager.encryptMessage(
  "Hello, World!",
  "recipient-user-id",
  "recipient-device-id",
);

// 2. Store in database
await apolloClient.mutate({
  mutation: INSERT_MESSAGE,
  variables: {
    channel_id: channelId,
    content: "[Encrypted]",
    is_encrypted: true,
    encrypted_payload: Array.from(result.encryptedPayload),
    sender_device_id: result.deviceId,
    encryption_version: 1,
  },
});
```

### Receive Encrypted Message

```typescript
// 1. Fetch message from database
const message = await apolloClient.query({
  query: GET_MESSAGE,
  variables: { messageId },
});

// 2. Decrypt if encrypted
if (message.is_encrypted) {
  const plaintext = await e2eeManager.decryptMessage(
    new Uint8Array(message.encrypted_payload),
    "Normal", // or 'PreKey'
    message.sender_user_id,
    message.sender_device_id,
  );
  console.log("Decrypted:", plaintext);
}
```

### Verify Safety Numbers

```typescript
// 1. Generate safety number
const safetyNumber = await e2eeManager.generateSafetyNumber(
  localUserId,
  peerUserId,
  peerIdentityKey,
);

// 2. Format for display
const formatted = e2eeManager.formatSafetyNumber(safetyNumber);
console.log(formatted); // "12345 67890 12345 ..."

// 3. Generate QR code
const qrData = await e2eeManager.generateSafetyNumberQR(
  localUserId,
  peerUserId,
  peerIdentityKey,
);
```

---

## Key Management

### Master Key Lifecycle

```
1. User enters password
   ↓
2. Derive master key (PBKDF2 100k iterations)
   ↓
3. Generate recovery code
   ↓
4. Encrypt master key with recovery key
   ↓
5. Store encrypted backup in database
   ↓
6. Use master key to encrypt private keys
```

### Device Key Lifecycle

```
1. Generate identity key pair
   ↓
2. Generate signed prekey (expires 7 days)
   ↓
3. Generate 100 one-time prekeys
   ↓
4. Encrypt private keys with master key
   ↓
5. Upload public keys to server
   ↓
6. Rotate signed prekey weekly
   ↓
7. Replenish one-time prekeys when < 20
```

---

## Session Management

### Session Creation (X3DH)

```
Alice wants to message Bob:

1. Fetch Bob's prekey bundle
   - Identity key (IK_B)
   - Signed prekey (SPK_B)
   - One-time prekey (OPK_B)

2. Perform 3 or 4 DH calculations
   DH1 = DH(IK_A, SPK_B)
   DH2 = DH(EK_A, IK_B)
   DH3 = DH(EK_A, SPK_B)
   DH4 = DH(EK_A, OPK_B)  [if OPK available]

3. Derive shared secret
   SK = KDF(DH1 || DH2 || DH3 || DH4)

4. Initialize Double Ratchet

5. Send initial message
```

### Message Ratcheting (Double Ratchet)

```
Every message:

1. Derive message key from chain key
   MK = KDF(CK)

2. Encrypt message
   Ciphertext = ENCRYPT(MK, plaintext)

3. Ratchet chain key forward
   CK = KDF(CK)

Every response (DH ratchet):

1. Generate new DH key pair
2. Perform DH with peer's public key
3. Derive new root key and chain keys
4. Continue with symmetric ratchet
```

---

## Error Handling

### Common Errors

```typescript
try {
  await e2eeManager.encryptMessage(...);
} catch (error) {
  if (error.message === 'E2EE not initialized') {
    // Initialize E2EE first
    await e2eeManager.initialize(password);
  } else if (error.message === 'No prekey bundle available') {
    // Recipient hasn't set up E2EE
    // Send unencrypted or prompt recipient
  } else if (error.message === 'Failed to decrypt message') {
    // Session issue or corrupted message
    // Recreate session or show error
  }
}
```

### Recovery Scenarios

1. **Lost Password**: Use recovery code
2. **Lost Recovery Code**: Cannot recover (by design)
3. **Session Corruption**: Delete session, recreate
4. **Low Prekeys**: Auto-replenishment triggers
5. **Expired Signed Prekey**: Auto-rotation triggers

---

## Performance

### Benchmarks (Average)

| Operation                | Time   | Notes                 |
| ------------------------ | ------ | --------------------- |
| Key generation           | ~100ms | One-time per device   |
| X3DH key exchange        | ~50ms  | First message to user |
| Message encryption       | ~5ms   | Per message           |
| Message decryption       | ~5ms   | Per message           |
| Safety number generation | ~10ms  | On demand             |

### Optimization

- **Session Caching**: Keep sessions in memory
- **Batch Operations**: Decrypt multiple messages in parallel
- **Lazy Loading**: Only decrypt visible messages
- **Materialized Views**: Fast prekey bundle lookups

---

## Testing

### Unit Tests

```typescript
import { crypto } from "@/lib/e2ee/crypto";

describe("Crypto", () => {
  it("derives master key correctly", async () => {
    const salt = crypto.generateSalt();
    const key = await crypto.deriveMasterKey("password", salt);
    expect(key).toHaveLength(32);
  });

  it("encrypts and decrypts", async () => {
    const key = crypto.generateRandomBytes(32);
    const plaintext = new Uint8Array([1, 2, 3]);
    const { ciphertext, iv } = await crypto.encryptAESGCM(plaintext, key);
    const decrypted = await crypto.decryptAESGCM(ciphertext, key, iv);
    expect(decrypted).toEqual(plaintext);
  });
});
```

### Integration Tests

```typescript
describe("E2EE Manager", () => {
  it("encrypts and decrypts messages", async () => {
    const e2ee = getE2EEManager(apolloClient);
    await e2ee.initialize("password");

    const encrypted = await e2ee.encryptMessage(
      "Hello",
      recipientUserId,
      recipientDeviceId,
    );

    const decrypted = await e2ee.decryptMessage(
      encrypted.encryptedPayload,
      encrypted.type,
      senderUserId,
      senderDeviceId,
    );

    expect(decrypted).toBe("Hello");
  });
});
```

---

## Security Considerations

### Do's ✅

- Use strong passwords for E2EE setup
- Store recovery codes securely offline
- Verify safety numbers with contacts
- Clear master key on logout
- Rotate signed prekeys weekly
- Replenish one-time prekeys automatically

### Don'ts ❌

- Never log sensitive data (keys, plaintexts)
- Never transmit master key
- Never reuse one-time prekeys
- Never skip safety number verification
- Never store private keys unencrypted
- Never implement custom cryptography

---

## Troubleshooting

### Debug Mode

```typescript
// Enable debug logging
localStorage.setItem("e2ee_debug", "true");

// Check E2EE status
const status = e2eeManager.getStatus();
console.log("E2EE Status:", status);

// Check session
const hasSession = await e2eeManager.hasSession(userId, deviceId);
console.log("Session exists:", hasSession);
```

### Common Issues

1. **"Master key not initialized"**
   - Call `initialize(password)` first

2. **"Device keys not found"**
   - Run `generateDeviceKeys()` and `uploadDeviceKeys()`

3. **"Session not found"**
   - Session will be created automatically on first message

4. **"Prekey bundle not available"**
   - Recipient must initialize E2EE first

---

## Contributing

When contributing to E2EE code:

1. **No Custom Crypto**: Always use standard libraries
2. **Test Coverage**: Add tests for all new code
3. **Security Review**: All changes require security review
4. **Documentation**: Update docs for API changes
5. **Backwards Compatibility**: Don't break existing sessions

---

## References

- [Signal Protocol Specification](https://signal.org/docs/)
- [The Double Ratchet Algorithm](https://signal.org/docs/specifications/doubleratchet/)
- [The X3DH Key Agreement Protocol](https://signal.org/docs/specifications/x3dh/)
- [@signalapp/libsignal-client](https://github.com/signalapp/libsignal)
- [E2EE Implementation Guide](/docs/E2EE-Implementation.md)
- [E2EE Security Audit](/docs/E2EE-Security-Audit.md)

---

**Version**: 0.4.0
**Last Updated**: 2026-01-30
**Status**: Production Ready ✅
