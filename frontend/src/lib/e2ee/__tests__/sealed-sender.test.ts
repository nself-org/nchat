/**
 * Sealed Sender Tests
 *
 * Comprehensive tests for the sealed sender encryption implementation.
 * Tests cover sealing, unsealing, serialization, and validation.
 */

import {
  sealMessageSimple,
  unsealMessage,
  serializeCertificate,
  deserializeCertificate,
  serializeEnvelope,
  deserializeEnvelope,
  envelopeToBase64,
  envelopeFromBase64,
  validateCertificateStructure,
  validateEnvelopeStructure,
  type SenderCertificate,
  type SealedSenderEnvelope,
  SealedSenderMessageType,
  SEALED_SENDER_VERSION,
} from '../sealed-sender'

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// ============================================================================
// Test Helpers
// ============================================================================

async function generateTestKeyPair(): Promise<{
  publicKey: Uint8Array
  privateKey: Uint8Array
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveBits']
  )

  const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey)
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)

  // Decode base64url to bytes
  const dParam = privateKeyJwk.d!
  let base64 = dParam.replace(/-/g, '+').replace(/_/g, '/')
  while (base64.length % 4) {
    base64 += '='
  }
  const binary = atob(base64)
  const privateKeyBytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    privateKeyBytes[i] = binary.charCodeAt(i)
  }

  return {
    publicKey: new Uint8Array(publicKeyRaw),
    privateKey: privateKeyBytes,
  }
}

function createTestCertificate(overrides?: Partial<SenderCertificate>): SenderCertificate {
  const identityKey = new Uint8Array(65)
  identityKey[0] = 0x04 // Uncompressed point prefix
  crypto.getRandomValues(identityKey.subarray(1))

  const signature = new Uint8Array(64)
  crypto.getRandomValues(signature)

  return {
    version: SEALED_SENDER_VERSION,
    senderUserId: 'user-123',
    senderDeviceId: 'device-456',
    senderIdentityKey: identityKey,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    signature,
    serverKeyId: 1,
    ...overrides,
  }
}

// ============================================================================
// Certificate Serialization Tests
// ============================================================================

describe('Certificate Serialization', () => {
  describe('serializeCertificate', () => {
    it('should serialize a certificate to bytes', () => {
      const cert = createTestCertificate()
      const serialized = serializeCertificate(cert)

      expect(serialized).toBeInstanceOf(Uint8Array)
      expect(serialized.length).toBeGreaterThan(0)
    })

    it('should preserve all certificate fields', () => {
      const cert = createTestCertificate({
        senderUserId: 'test-user',
        senderDeviceId: 'test-device',
      })

      const serialized = serializeCertificate(cert)
      const deserialized = deserializeCertificate(serialized)

      expect(deserialized.version).toBe(cert.version)
      expect(deserialized.senderUserId).toBe(cert.senderUserId)
      expect(deserialized.senderDeviceId).toBe(cert.senderDeviceId)
      expect(deserialized.expiresAt).toBe(cert.expiresAt)
      expect(deserialized.serverKeyId).toBe(cert.serverKeyId)
    })

    it('should handle long user/device IDs', () => {
      const cert = createTestCertificate({
        senderUserId: 'user-with-very-long-identifier-123456789',
        senderDeviceId: 'device-with-very-long-identifier-987654321',
      })

      const serialized = serializeCertificate(cert)
      const deserialized = deserializeCertificate(serialized)

      expect(deserialized.senderUserId).toBe(cert.senderUserId)
      expect(deserialized.senderDeviceId).toBe(cert.senderDeviceId)
    })

    it('should handle empty user ID', () => {
      const cert = createTestCertificate({ senderUserId: '' })
      const serialized = serializeCertificate(cert)
      const deserialized = deserializeCertificate(serialized)

      expect(deserialized.senderUserId).toBe('')
    })

    it('should preserve identity key bytes exactly', () => {
      const identityKey = new Uint8Array(65)
      for (let i = 0; i < 65; i++) {
        identityKey[i] = i
      }

      const cert = createTestCertificate({ senderIdentityKey: identityKey })
      const serialized = serializeCertificate(cert)
      const deserialized = deserializeCertificate(serialized)

      expect(Array.from(deserialized.senderIdentityKey)).toEqual(Array.from(identityKey))
    })

    it('should preserve signature bytes exactly', () => {
      const signature = new Uint8Array(64)
      for (let i = 0; i < 64; i++) {
        signature[i] = 255 - i
      }

      const cert = createTestCertificate({ signature })
      const serialized = serializeCertificate(cert)
      const deserialized = deserializeCertificate(serialized)

      expect(Array.from(deserialized.signature)).toEqual(Array.from(signature))
    })
  })

  describe('deserializeCertificate', () => {
    it('should deserialize valid certificate bytes', () => {
      const cert = createTestCertificate()
      const serialized = serializeCertificate(cert)
      const deserialized = deserializeCertificate(serialized)

      expect(deserialized.version).toBe(SEALED_SENDER_VERSION)
      expect(deserialized.senderUserId).toBe(cert.senderUserId)
    })

    it('should handle large user IDs', () => {
      const largeUserId = 'user-' + 'x'.repeat(1000)
      const cert = createTestCertificate({ senderUserId: largeUserId })

      const serialized = serializeCertificate(cert)
      const deserialized = deserializeCertificate(serialized)

      expect(deserialized.senderUserId).toBe(largeUserId)
    })
  })
})

// ============================================================================
// Envelope Serialization Tests
// ============================================================================

describe('Envelope Serialization', () => {
  function createTestEnvelope(): SealedSenderEnvelope {
    const ephemeralKey = new Uint8Array(65)
    ephemeralKey[0] = 0x04
    crypto.getRandomValues(ephemeralKey.subarray(1))

    const encryptedContent = new Uint8Array(100)
    crypto.getRandomValues(encryptedContent)

    return {
      version: SEALED_SENDER_VERSION,
      ephemeralKey,
      encryptedContent,
    }
  }

  describe('serializeEnvelope', () => {
    it('should serialize an envelope to bytes', () => {
      const envelope = createTestEnvelope()
      const serialized = serializeEnvelope(envelope)

      expect(serialized).toBeInstanceOf(Uint8Array)
      expect(serialized.length).toBeGreaterThan(0)
    })

    it('should preserve all envelope fields', () => {
      const envelope = createTestEnvelope()
      const serialized = serializeEnvelope(envelope)
      const deserialized = deserializeEnvelope(serialized)

      expect(deserialized.version).toBe(envelope.version)
      expect(Array.from(deserialized.ephemeralKey)).toEqual(Array.from(envelope.ephemeralKey))
      expect(Array.from(deserialized.encryptedContent)).toEqual(
        Array.from(envelope.encryptedContent)
      )
    })
  })

  describe('envelopeToBase64 / envelopeFromBase64', () => {
    it('should convert envelope to Base64 and back', () => {
      const envelope = createTestEnvelope()
      const base64 = envelopeToBase64(envelope)
      const restored = envelopeFromBase64(base64)

      expect(restored.version).toBe(envelope.version)
      expect(Array.from(restored.ephemeralKey)).toEqual(Array.from(envelope.ephemeralKey))
    })

    it('should produce valid Base64 string', () => {
      const envelope = createTestEnvelope()
      const base64 = envelopeToBase64(envelope)

      // Check it's valid Base64
      expect(() => atob(base64)).not.toThrow()
    })
  })
})

// ============================================================================
// Validation Tests
// ============================================================================

describe('Validation', () => {
  describe('validateCertificateStructure', () => {
    it('should pass for valid certificate', () => {
      const cert = createTestCertificate()
      const errors = validateCertificateStructure(cert)

      expect(errors).toHaveLength(0)
    })

    it('should detect invalid version', () => {
      const cert = createTestCertificate({ version: 99 })
      const errors = validateCertificateStructure(cert)

      expect(errors.some((e) => e.includes('version'))).toBe(true)
    })

    it('should detect missing sender user ID', () => {
      const cert = createTestCertificate({ senderUserId: '' })
      const errors = validateCertificateStructure(cert)

      expect(errors.some((e) => e.includes('user ID'))).toBe(true)
    })

    it('should detect missing sender device ID', () => {
      const cert = createTestCertificate({ senderDeviceId: '' })
      const errors = validateCertificateStructure(cert)

      expect(errors.some((e) => e.includes('device ID'))).toBe(true)
    })

    it('should detect invalid identity key length', () => {
      const cert = createTestCertificate({ senderIdentityKey: new Uint8Array(32) })
      const errors = validateCertificateStructure(cert)

      expect(errors.some((e) => e.includes('identity key'))).toBe(true)
    })

    it('should detect invalid expiration time', () => {
      const cert = createTestCertificate({ expiresAt: 0 })
      const errors = validateCertificateStructure(cert)

      expect(errors.some((e) => e.includes('expiration'))).toBe(true)
    })

    it('should detect missing signature', () => {
      const cert = createTestCertificate({ signature: new Uint8Array(0) })
      const errors = validateCertificateStructure(cert)

      expect(errors.some((e) => e.includes('signature'))).toBe(true)
    })

    it('should return multiple errors for invalid certificate', () => {
      const cert = createTestCertificate({
        version: 99,
        senderUserId: '',
        senderDeviceId: '',
      })
      const errors = validateCertificateStructure(cert)

      expect(errors.length).toBeGreaterThan(1)
    })
  })

  describe('validateEnvelopeStructure', () => {
    it('should pass for valid envelope', () => {
      const ephemeralKey = new Uint8Array(65)
      ephemeralKey[0] = 0x04
      crypto.getRandomValues(ephemeralKey.subarray(1))

      const envelope: SealedSenderEnvelope = {
        version: SEALED_SENDER_VERSION,
        ephemeralKey,
        encryptedContent: new Uint8Array(50),
      }

      const errors = validateEnvelopeStructure(envelope)
      expect(errors).toHaveLength(0)
    })

    it('should detect invalid version', () => {
      const envelope: SealedSenderEnvelope = {
        version: 99,
        ephemeralKey: new Uint8Array(65),
        encryptedContent: new Uint8Array(50),
      }

      const errors = validateEnvelopeStructure(envelope)
      expect(errors.some((e) => e.includes('version'))).toBe(true)
    })

    it('should detect invalid ephemeral key length', () => {
      const envelope: SealedSenderEnvelope = {
        version: SEALED_SENDER_VERSION,
        ephemeralKey: new Uint8Array(32),
        encryptedContent: new Uint8Array(50),
      }

      const errors = validateEnvelopeStructure(envelope)
      expect(errors.some((e) => e.includes('ephemeral key'))).toBe(true)
    })

    it('should detect encrypted content too short', () => {
      const envelope: SealedSenderEnvelope = {
        version: SEALED_SENDER_VERSION,
        ephemeralKey: new Uint8Array(65),
        encryptedContent: new Uint8Array(10), // Too short
      }

      const errors = validateEnvelopeStructure(envelope)
      expect(errors.some((e) => e.includes('Encrypted content'))).toBe(true)
    })
  })
})

// ============================================================================
// Sealing and Unsealing Tests
// ============================================================================

describe('Message Sealing and Unsealing', () => {
  let senderKeys: { publicKey: Uint8Array; privateKey: Uint8Array }
  let recipientKeys: { publicKey: Uint8Array; privateKey: Uint8Array }
  let senderCertificate: SenderCertificate

  beforeAll(async () => {
    senderKeys = await generateTestKeyPair()
    recipientKeys = await generateTestKeyPair()

    senderCertificate = createTestCertificate({
      senderIdentityKey: senderKeys.publicKey,
    })
  })

  describe('sealMessageSimple', () => {
    it('should seal a message successfully', async () => {
      const envelope = await sealMessageSimple({
        senderCertificate,
        senderIdentityPrivateKey: senderKeys.privateKey,
        senderIdentityPublicKey: senderKeys.publicKey,
        recipientIdentityKey: recipientKeys.publicKey,
        encryptedMessage: new Uint8Array([1, 2, 3, 4, 5]),
        messageType: SealedSenderMessageType.MESSAGE,
      })

      expect(envelope.version).toBe(SEALED_SENDER_VERSION)
      expect(envelope.ephemeralKey).toBeInstanceOf(Uint8Array)
      expect(envelope.ephemeralKey.length).toBe(65)
      expect(envelope.encryptedContent).toBeInstanceOf(Uint8Array)
      expect(envelope.encryptedContent.length).toBeGreaterThan(0)
    })

    it('should produce different envelopes for same message', async () => {
      const options = {
        senderCertificate,
        senderIdentityPrivateKey: senderKeys.privateKey,
        senderIdentityPublicKey: senderKeys.publicKey,
        recipientIdentityKey: recipientKeys.publicKey,
        encryptedMessage: new Uint8Array([1, 2, 3, 4, 5]),
        messageType: SealedSenderMessageType.MESSAGE,
      }

      const envelope1 = await sealMessageSimple(options)
      const envelope2 = await sealMessageSimple(options)

      // Ephemeral keys should be different
      expect(Array.from(envelope1.ephemeralKey)).not.toEqual(Array.from(envelope2.ephemeralKey))
    })

    it('should handle empty message', async () => {
      const envelope = await sealMessageSimple({
        senderCertificate,
        senderIdentityPrivateKey: senderKeys.privateKey,
        senderIdentityPublicKey: senderKeys.publicKey,
        recipientIdentityKey: recipientKeys.publicKey,
        encryptedMessage: new Uint8Array(0),
        messageType: SealedSenderMessageType.MESSAGE,
      })

      expect(envelope).toBeDefined()
    })

    it('should handle large message', async () => {
      // Use a moderately sized message (within crypto limits)
      const largeMessage = new Uint8Array(10000)
      // Fill with pattern instead of random
      for (let i = 0; i < largeMessage.length; i++) {
        largeMessage[i] = i % 256
      }

      const envelope = await sealMessageSimple({
        senderCertificate,
        senderIdentityPrivateKey: senderKeys.privateKey,
        senderIdentityPublicKey: senderKeys.publicKey,
        recipientIdentityKey: recipientKeys.publicKey,
        encryptedMessage: largeMessage,
        messageType: SealedSenderMessageType.MESSAGE,
      })

      expect(envelope.encryptedContent.length).toBeGreaterThan(largeMessage.length)
    })
  })

  describe('unsealMessage', () => {
    it('should unseal a message successfully', async () => {
      const originalMessage = new Uint8Array([1, 2, 3, 4, 5])

      const envelope = await sealMessageSimple({
        senderCertificate,
        senderIdentityPrivateKey: senderKeys.privateKey,
        senderIdentityPublicKey: senderKeys.publicKey,
        recipientIdentityKey: recipientKeys.publicKey,
        encryptedMessage: originalMessage,
        messageType: SealedSenderMessageType.MESSAGE,
      })

      const unsealed = await unsealMessage({
        envelope,
        recipientIdentityPrivateKey: recipientKeys.privateKey,
        recipientIdentityPublicKey: recipientKeys.publicKey,
        verifyCertificate: async () => true,
      })

      expect(unsealed.senderUserId).toBe(senderCertificate.senderUserId)
      expect(unsealed.senderDeviceId).toBe(senderCertificate.senderDeviceId)
      expect(Array.from(unsealed.content)).toEqual(Array.from(originalMessage))
      expect(unsealed.messageType).toBe(SealedSenderMessageType.MESSAGE)
    })

    it('should verify sender identity', async () => {
      const envelope = await sealMessageSimple({
        senderCertificate,
        senderIdentityPrivateKey: senderKeys.privateKey,
        senderIdentityPublicKey: senderKeys.publicKey,
        recipientIdentityKey: recipientKeys.publicKey,
        encryptedMessage: new Uint8Array([1, 2, 3]),
        messageType: SealedSenderMessageType.MESSAGE,
      })

      const unsealed = await unsealMessage({
        envelope,
        recipientIdentityPrivateKey: recipientKeys.privateKey,
        recipientIdentityPublicKey: recipientKeys.publicKey,
        verifyCertificate: async () => true,
      })

      expect(Array.from(unsealed.senderIdentityKey)).toEqual(Array.from(senderKeys.publicKey))
    })

    it('should fail with invalid certificate verification', async () => {
      const envelope = await sealMessageSimple({
        senderCertificate,
        senderIdentityPrivateKey: senderKeys.privateKey,
        senderIdentityPublicKey: senderKeys.publicKey,
        recipientIdentityKey: recipientKeys.publicKey,
        encryptedMessage: new Uint8Array([1, 2, 3]),
        messageType: SealedSenderMessageType.MESSAGE,
      })

      await expect(
        unsealMessage({
          envelope,
          recipientIdentityPrivateKey: recipientKeys.privateKey,
          recipientIdentityPublicKey: recipientKeys.publicKey,
          verifyCertificate: async () => false,
        })
      ).rejects.toThrow('Invalid sender certificate')
    })

    it('should fail with expired certificate', async () => {
      const expiredCert = createTestCertificate({
        senderIdentityKey: senderKeys.publicKey,
        expiresAt: Date.now() - 1000, // Expired
      })

      const envelope = await sealMessageSimple({
        senderCertificate: expiredCert,
        senderIdentityPrivateKey: senderKeys.privateKey,
        senderIdentityPublicKey: senderKeys.publicKey,
        recipientIdentityKey: recipientKeys.publicKey,
        encryptedMessage: new Uint8Array([1, 2, 3]),
        messageType: SealedSenderMessageType.MESSAGE,
      })

      await expect(
        unsealMessage({
          envelope,
          recipientIdentityPrivateKey: recipientKeys.privateKey,
          recipientIdentityPublicKey: recipientKeys.publicKey,
          verifyCertificate: async () => true,
        })
      ).rejects.toThrow('expired')
    })

    it('should fail with wrong recipient keys', async () => {
      const envelope = await sealMessageSimple({
        senderCertificate,
        senderIdentityPrivateKey: senderKeys.privateKey,
        senderIdentityPublicKey: senderKeys.publicKey,
        recipientIdentityKey: recipientKeys.publicKey,
        encryptedMessage: new Uint8Array([1, 2, 3]),
        messageType: SealedSenderMessageType.MESSAGE,
      })

      const wrongRecipientKeys = await generateTestKeyPair()

      await expect(
        unsealMessage({
          envelope,
          recipientIdentityPrivateKey: wrongRecipientKeys.privateKey,
          recipientIdentityPublicKey: wrongRecipientKeys.publicKey,
          verifyCertificate: async () => true,
        })
      ).rejects.toThrow()
    })

    it('should handle different message types', async () => {
      const messageTypes = [
        SealedSenderMessageType.MESSAGE,
        SealedSenderMessageType.PREKEY_MESSAGE,
        SealedSenderMessageType.SENDER_KEY_DISTRIBUTION,
      ]

      for (const messageType of messageTypes) {
        const envelope = await sealMessageSimple({
          senderCertificate,
          senderIdentityPrivateKey: senderKeys.privateKey,
          senderIdentityPublicKey: senderKeys.publicKey,
          recipientIdentityKey: recipientKeys.publicKey,
          encryptedMessage: new Uint8Array([1, 2, 3]),
          messageType,
        })

        const unsealed = await unsealMessage({
          envelope,
          recipientIdentityPrivateKey: recipientKeys.privateKey,
          recipientIdentityPublicKey: recipientKeys.publicKey,
          verifyCertificate: async () => true,
        })

        expect(unsealed.messageType).toBe(messageType)
      }
    })
  })

  describe('Round-trip integrity', () => {
    it('should preserve message content through seal/unseal cycle', async () => {
      const testMessages = [
        new Uint8Array([]),
        new Uint8Array([0]),
        new Uint8Array([255]),
        new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
        new Uint8Array(1000).fill(42),
      ]

      for (const message of testMessages) {
        const envelope = await sealMessageSimple({
          senderCertificate,
          senderIdentityPrivateKey: senderKeys.privateKey,
          senderIdentityPublicKey: senderKeys.publicKey,
          recipientIdentityKey: recipientKeys.publicKey,
          encryptedMessage: message,
          messageType: SealedSenderMessageType.MESSAGE,
        })

        const unsealed = await unsealMessage({
          envelope,
          recipientIdentityPrivateKey: recipientKeys.privateKey,
          recipientIdentityPublicKey: recipientKeys.publicKey,
          verifyCertificate: async () => true,
        })

        expect(Array.from(unsealed.content)).toEqual(Array.from(message))
      }
    })

    it('should preserve sender identity through seal/unseal cycle', async () => {
      const testCases = [
        { userId: 'user-a', deviceId: 'device-1' },
        { userId: 'user-with-long-id-12345', deviceId: 'device-with-long-id-67890' },
        { userId: '', deviceId: '' },
      ]

      for (const { userId, deviceId } of testCases) {
        const cert = createTestCertificate({
          senderUserId: userId,
          senderDeviceId: deviceId,
          senderIdentityKey: senderKeys.publicKey,
        })

        const envelope = await sealMessageSimple({
          senderCertificate: cert,
          senderIdentityPrivateKey: senderKeys.privateKey,
          senderIdentityPublicKey: senderKeys.publicKey,
          recipientIdentityKey: recipientKeys.publicKey,
          encryptedMessage: new Uint8Array([1, 2, 3]),
          messageType: SealedSenderMessageType.MESSAGE,
        })

        const unsealed = await unsealMessage({
          envelope,
          recipientIdentityPrivateKey: recipientKeys.privateKey,
          recipientIdentityPublicKey: recipientKeys.publicKey,
          verifyCertificate: async () => true,
        })

        expect(unsealed.senderUserId).toBe(userId)
        expect(unsealed.senderDeviceId).toBe(deviceId)
      }
    })
  })
})

// ============================================================================
// Threat Model Tests
// ============================================================================

describe('Threat Model Verification', () => {
  it('should demonstrate server blindness (envelope contains no sender info)', async () => {
    const senderKeys = await generateTestKeyPair()
    const recipientKeys = await generateTestKeyPair()

    const cert = createTestCertificate({
      senderUserId: 'secret-sender',
      senderDeviceId: 'secret-device',
      senderIdentityKey: senderKeys.publicKey,
    })

    const envelope = await sealMessageSimple({
      senderCertificate: cert,
      senderIdentityPrivateKey: senderKeys.privateKey,
      senderIdentityPublicKey: senderKeys.publicKey,
      recipientIdentityKey: recipientKeys.publicKey,
      encryptedMessage: new Uint8Array([1, 2, 3]),
      messageType: SealedSenderMessageType.MESSAGE,
    })

    // Serialize envelope as server would see it
    const serialized = serializeEnvelope(envelope)
    const serializedStr = Array.from(serialized)
      .map((b) => String.fromCharCode(b))
      .join('')

    // Server should NOT be able to find sender identity in serialized form
    expect(serializedStr).not.toContain('secret-sender')
    expect(serializedStr).not.toContain('secret-device')

    // The envelope only contains: version, ephemeral key, encrypted content
    // No sender metadata exposed
    expect(envelope.version).toBeDefined()
    expect(envelope.ephemeralKey).toBeDefined()
    expect(envelope.encryptedContent).toBeDefined()
    expect((envelope as any).senderUserId).toBeUndefined()
    expect((envelope as any).senderDeviceId).toBeUndefined()
  })

  it('should ensure only recipient can reveal sender identity', async () => {
    const senderKeys = await generateTestKeyPair()
    const recipientKeys = await generateTestKeyPair()
    const attackerKeys = await generateTestKeyPair()

    const cert = createTestCertificate({
      senderUserId: 'hidden-sender',
      senderIdentityKey: senderKeys.publicKey,
    })

    const envelope = await sealMessageSimple({
      senderCertificate: cert,
      senderIdentityPrivateKey: senderKeys.privateKey,
      senderIdentityPublicKey: senderKeys.publicKey,
      recipientIdentityKey: recipientKeys.publicKey,
      encryptedMessage: new Uint8Array([1, 2, 3]),
      messageType: SealedSenderMessageType.MESSAGE,
    })

    // Attacker cannot unseal
    await expect(
      unsealMessage({
        envelope,
        recipientIdentityPrivateKey: attackerKeys.privateKey,
        recipientIdentityPublicKey: attackerKeys.publicKey,
        verifyCertificate: async () => true,
      })
    ).rejects.toThrow()

    // Legitimate recipient can unseal
    const unsealed = await unsealMessage({
      envelope,
      recipientIdentityPrivateKey: recipientKeys.privateKey,
      recipientIdentityPublicKey: recipientKeys.publicKey,
      verifyCertificate: async () => true,
    })

    expect(unsealed.senderUserId).toBe('hidden-sender')
  })

  it('should provide forward secrecy through ephemeral keys', async () => {
    const senderKeys = await generateTestKeyPair()
    const recipientKeys = await generateTestKeyPair()

    const cert = createTestCertificate({
      senderIdentityKey: senderKeys.publicKey,
    })

    const envelope1 = await sealMessageSimple({
      senderCertificate: cert,
      senderIdentityPrivateKey: senderKeys.privateKey,
      senderIdentityPublicKey: senderKeys.publicKey,
      recipientIdentityKey: recipientKeys.publicKey,
      encryptedMessage: new Uint8Array([1]),
      messageType: SealedSenderMessageType.MESSAGE,
    })

    const envelope2 = await sealMessageSimple({
      senderCertificate: cert,
      senderIdentityPrivateKey: senderKeys.privateKey,
      senderIdentityPublicKey: senderKeys.publicKey,
      recipientIdentityKey: recipientKeys.publicKey,
      encryptedMessage: new Uint8Array([1]),
      messageType: SealedSenderMessageType.MESSAGE,
    })

    // Each message uses a unique ephemeral key
    expect(Array.from(envelope1.ephemeralKey)).not.toEqual(Array.from(envelope2.ephemeralKey))

    // Even with same content, ciphertext is different
    expect(Array.from(envelope1.encryptedContent)).not.toEqual(
      Array.from(envelope2.encryptedContent)
    )
  })
})
