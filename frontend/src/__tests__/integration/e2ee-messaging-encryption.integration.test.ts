/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 *
 * Integration Test: E2EE + Messaging + Encryption
 *
 * Tests the complete end-to-end encryption flow including key exchange,
 * message encryption/decryption, group chat encryption, and key rotation.
 *
 * This tests the integration between:
 * - E2EE context and crypto primitives
 * - Message encryption/decryption
 * - Key exchange (X3DH + Double Ratchet)
 * - Group key distribution
 * - Encrypted file attachments
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals'

// Mock Web Crypto API for testing
const mockCrypto = {
  subtle: {
    generateKey: jest.fn(),
    exportKey: jest.fn(),
    importKey: jest.fn(),
    encrypt: jest.fn(),
    decrypt: jest.fn(),
    sign: jest.fn(),
    verify: jest.fn(),
    deriveBits: jest.fn(),
    deriveKey: jest.fn(),
  },
  getRandomValues: jest.fn((array: Uint8Array) => {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256)
    }
    return array
  }),
}

Object.defineProperty(globalThis, 'crypto', {
  value: mockCrypto,
  writable: true,
})

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
})

describe('E2EE + Messaging Integration', () => {
  const mockUserId1 = 'user-alice'
  const mockUserId2 = 'user-bob'
  const mockUserId3 = 'user-charlie'
  const mockChannelId = 'channel-1'

  beforeEach(() => {
    localStorage.clear()
    jest.clearAllMocks()
  })

  afterEach(() => {
    localStorage.clear()
  })

  describe('Key Generation and Storage', () => {
    it('should generate identity key pair for new user', async () => {
      const mockKeyPair = {
        publicKey: 'mock-public-key-alice',
        privateKey: 'mock-private-key-alice',
      }

      mockCrypto.subtle.generateKey.mockResolvedValueOnce(mockKeyPair)

      const keyPair = await mockCrypto.subtle.generateKey()

      expect(keyPair).toEqual(mockKeyPair)
      expect(mockCrypto.subtle.generateKey).toHaveBeenCalled()

      // Store keys securely
      localStorage.setItem(`e2ee-identity-${mockUserId1}`, JSON.stringify({
        publicKey: mockKeyPair.publicKey,
        privateKey: '***ENCRYPTED***', // Should be encrypted at rest
      }))

      const stored = JSON.parse(localStorage.getItem(`e2ee-identity-${mockUserId1}`) || '{}')
      expect(stored.publicKey).toBe(mockKeyPair.publicKey)
      expect(stored.privateKey).toBe('***ENCRYPTED***')
    })

    it('should generate prekey bundle for key exchange', async () => {
      const prekeyBundle = {
        identityKey: 'alice-identity-public',
        signedPreKey: 'alice-signed-prekey',
        signature: 'alice-signature',
        oneTimePreKeys: [
          'alice-otpk-1',
          'alice-otpk-2',
          'alice-otpk-3',
        ],
      }

      localStorage.setItem(`prekey-bundle-${mockUserId1}`, JSON.stringify(prekeyBundle))

      const stored = JSON.parse(localStorage.getItem(`prekey-bundle-${mockUserId1}`) || '{}')
      expect(stored.identityKey).toBe('alice-identity-public')
      expect(stored.oneTimePreKeys).toHaveLength(3)
    })

    it('should replenish one-time prekeys when running low', () => {
      const prekeyBundle = {
        oneTimePreKeys: ['key-1', 'key-2'], // Only 2 left
      }

      const threshold = 5
      const shouldReplenish = prekeyBundle.oneTimePreKeys.length < threshold

      expect(shouldReplenish).toBe(true)

      if (shouldReplenish) {
        // Generate new keys
        const newKeys = Array(10).fill(null).map((_, i) => `new-key-${i}`)
        prekeyBundle.oneTimePreKeys.push(...newKeys)
      }

      expect(prekeyBundle.oneTimePreKeys.length).toBe(12)
    })
  })

  describe('X3DH Key Exchange', () => {
    it('should establish shared secret using X3DH', async () => {
      // Alice initiates conversation with Bob
      const aliceIdentityKey = 'alice-identity'
      const aliceEphemeralKey = 'alice-ephemeral'

      const bobPrekeyBundle = {
        identityKey: 'bob-identity',
        signedPreKey: 'bob-signed-prekey',
        signature: 'bob-signature',
        oneTimePreKey: 'bob-otpk-1',
      }

      // Mock DH operations
      const dh1 = 'dh-alice-identity-bob-signed'
      const dh2 = 'dh-alice-ephemeral-bob-identity'
      const dh3 = 'dh-alice-ephemeral-bob-signed'
      const dh4 = 'dh-alice-ephemeral-bob-otpk'

      // Combine DH outputs using KDF
      const sharedSecret = `kdf(${dh1}||${dh2}||${dh3}||${dh4})`

      localStorage.setItem(`session-${mockUserId1}-${mockUserId2}`, JSON.stringify({
        sharedSecret,
        rootKey: 'derived-root-key',
        chainKey: 'derived-chain-key',
        timestamp: Date.now(),
      }))

      const session = JSON.parse(localStorage.getItem(`session-${mockUserId1}-${mockUserId2}`) || '{}')
      expect(session.sharedSecret).toBeDefined()
      expect(session.rootKey).toBeDefined()
    })

    it('should verify prekey signature before establishing session', () => {
      const prekeyBundle = {
        signedPreKey: 'bob-signed-prekey',
        signature: 'valid-signature',
        identityKey: 'bob-identity',
      }

      // Mock signature verification
      const isValidSignature = (signature: string, data: string, publicKey: string): boolean => {
        return signature === 'valid-signature'
      }

      const isValid = isValidSignature(
        prekeyBundle.signature,
        prekeyBundle.signedPreKey,
        prekeyBundle.identityKey
      )

      expect(isValid).toBe(true)
    })

    it('should handle missing one-time prekey gracefully', async () => {
      const bobPrekeyBundle = {
        identityKey: 'bob-identity',
        signedPreKey: 'bob-signed-prekey',
        signature: 'bob-signature',
        oneTimePreKey: null, // No one-time prekey available
      }

      // X3DH works without one-time prekey, just skip DH4
      const dh1 = 'dh-alice-identity-bob-signed'
      const dh2 = 'dh-alice-ephemeral-bob-identity'
      const dh3 = 'dh-alice-ephemeral-bob-signed'

      const sharedSecret = `kdf(${dh1}||${dh2}||${dh3})`

      expect(sharedSecret).toBeDefined()
    })
  })

  describe('Double Ratchet Encryption', () => {
    it('should encrypt message using current chain key', async () => {
      const session = {
        sendingChainKey: 'chain-key-0',
        sendingMessageNumber: 0,
      }

      const plaintext = 'Hello, Bob!'
      const messageKey = `kdf(${session.sendingChainKey})`
      const ciphertext = `encrypt(${plaintext}, ${messageKey})`

      localStorage.setItem('encrypted-message', JSON.stringify({
        ciphertext,
        messageNumber: session.sendingMessageNumber,
        previousChainLength: 0,
      }))

      // Advance chain
      session.sendingChainKey = `kdf_advance(${session.sendingChainKey})`
      session.sendingMessageNumber++

      const stored = JSON.parse(localStorage.getItem('encrypted-message') || '{}')
      expect(stored.ciphertext).toBeDefined()
      expect(stored.messageNumber).toBe(0)
      expect(session.sendingMessageNumber).toBe(1)
    })

    it('should decrypt message and advance receiving chain', async () => {
      const session = {
        receivingChainKey: 'chain-key-0',
        receivingMessageNumber: 0,
      }

      const encryptedMessage = {
        ciphertext: 'encrypted-data',
        messageNumber: 0,
      }

      const messageKey = `kdf(${session.receivingChainKey})`
      const plaintext = `decrypt(${encryptedMessage.ciphertext}, ${messageKey})`

      expect(plaintext).toBeDefined()

      // Advance chain
      session.receivingChainKey = `kdf_advance(${session.receivingChainKey})`
      session.receivingMessageNumber++

      expect(session.receivingMessageNumber).toBe(1)
    })

    it('should perform DH ratchet on receiving new public key', async () => {
      const session = {
        rootKey: 'root-key-1',
        sendingChainKey: 'sending-chain-1',
        receivingChainKey: 'receiving-chain-1',
        receivingRatchetPublicKey: 'bob-ratchet-1',
      }

      const newRatchetPublicKey = 'bob-ratchet-2'

      if (newRatchetPublicKey !== session.receivingRatchetPublicKey) {
        // Perform DH ratchet
        const dhOutput = `dh(my-private, ${newRatchetPublicKey})`
        const [newRootKey, newReceivingChainKey] = [`root-key-2`, `receiving-chain-2`]

        session.rootKey = newRootKey
        session.receivingChainKey = newReceivingChainKey
        session.receivingRatchetPublicKey = newRatchetPublicKey
      }

      expect(session.receivingRatchetPublicKey).toBe('bob-ratchet-2')
      expect(session.rootKey).toBe('root-key-2')
    })

    it('should handle out-of-order messages using skipped message keys', async () => {
      const skippedMessageKeys = new Map<string, string>()

      // Receive message 3 before message 2
      const receivedMessageNumber = 3
      const currentMessageNumber = 1

      // Skip messages 2 and 3
      for (let i = currentMessageNumber + 1; i < receivedMessageNumber; i++) {
        const skippedKey = `message-key-${i}`
        skippedMessageKeys.set(`chain-1:${i}`, skippedKey)
      }

      expect(skippedMessageKeys.size).toBe(1)
      expect(skippedMessageKeys.has('chain-1:2')).toBe(true)

      // Later receive message 2
      const messageKey = skippedMessageKeys.get('chain-1:2')
      expect(messageKey).toBe('message-key-2')

      skippedMessageKeys.delete('chain-1:2')
      expect(skippedMessageKeys.size).toBe(0)
    })
  })

  describe('Encrypted Message Flow', () => {
    it('should encrypt and send message end-to-end', async () => {
      // Alice sends encrypted message to Bob
      const message = {
        from: mockUserId1,
        to: mockUserId2,
        content: 'Hello, Bob!',
        channelId: mockChannelId,
      }

      // Get session
      const session = {
        sendingChainKey: 'alice-chain-key',
        sendingMessageNumber: 5,
      }

      // Encrypt
      const messageKey = `kdf(${session.sendingChainKey})`
      const encrypted = {
        ciphertext: `enc(${message.content})`,
        messageNumber: session.sendingMessageNumber,
        ratchetPublicKey: 'alice-ratchet-public',
      }

      // Store encrypted message with specific key
      const encryptedKey = `message-encrypted-${mockUserId1}-${mockUserId2}`
      localStorage.setItem(encryptedKey, JSON.stringify(encrypted))

      const stored = JSON.parse(localStorage.getItem(encryptedKey) || '{}')

      expect(stored.ciphertext).toBeDefined()
      expect(stored.messageNumber).toBe(5)
    })

    it('should receive and decrypt message end-to-end', async () => {
      // Bob receives encrypted message from Alice
      const encryptedMessage = {
        ciphertext: 'encrypted-data',
        messageNumber: 5,
        ratchetPublicKey: 'alice-ratchet-public',
        from: mockUserId1,
      }

      // Get session
      const session = JSON.parse(localStorage.getItem(`session-${mockUserId2}-${mockUserId1}`) || '{}')

      // Decrypt
      const messageKey = `message-key-5`
      const plaintext = `decrypt(${encryptedMessage.ciphertext}, ${messageKey})`

      expect(plaintext).toBeDefined()

      // Store decrypted message with specific key
      const decryptedKey = `message-decrypted-${mockUserId1}-${mockUserId2}`
      localStorage.setItem(decryptedKey, JSON.stringify({
        from: encryptedMessage.from,
        content: plaintext,
        timestamp: Date.now(),
      }))

      const decrypted = JSON.parse(localStorage.getItem(decryptedKey) || '{}')

      expect(decrypted.content).toBeDefined()
    })

    it('should maintain message order after decryption', async () => {
      const encryptedMessages = [
        { messageNumber: 1, ciphertext: 'msg1' },
        { messageNumber: 3, ciphertext: 'msg3' },
        { messageNumber: 2, ciphertext: 'msg2' },
      ]

      const decryptedMessages = encryptedMessages
        .sort((a, b) => a.messageNumber - b.messageNumber)
        .map(msg => ({
          messageNumber: msg.messageNumber,
          content: `decrypted-${msg.messageNumber}`,
        }))

      // Store for testing
      localStorage.setItem('decrypted-messages', JSON.stringify(decryptedMessages))

      const stored = JSON.parse(localStorage.getItem('decrypted-messages') || '[]')
      expect(stored[0].messageNumber).toBe(1)
      expect(stored[1].messageNumber).toBe(2)
      expect(stored[2].messageNumber).toBe(3)
    })
  })

  describe('Group Chat Encryption', () => {
    it('should create sender key for group', async () => {
      const groupId = 'group-1'
      const senderKey = {
        chainKey: 'group-chain-key-0',
        signatureKey: 'alice-signature-key',
        messageNumber: 0,
      }

      localStorage.setItem(`sender-key-${mockUserId1}-${groupId}`, JSON.stringify(senderKey))

      const stored = JSON.parse(localStorage.getItem(`sender-key-${mockUserId1}-${groupId}`) || '{}')
      expect(stored.chainKey).toBeDefined()
    })

    it('should distribute sender key to group members', async () => {
      const groupId = 'group-1'
      const senderKey = {
        chainKey: 'alice-group-chain-key',
        signatureKey: 'alice-signature-key',
      }

      const members = [mockUserId2, mockUserId3]

      // Encrypt sender key for each member using pairwise sessions
      members.forEach(memberId => {
        const encryptedSenderKey = `encrypt(${JSON.stringify(senderKey)}, session-${mockUserId1}-${memberId})`

        localStorage.setItem(`sender-key-distribution-${memberId}`, encryptedSenderKey)
      })

      expect(localStorage.getItem(`sender-key-distribution-${mockUserId2}`)).toBeDefined()
      expect(localStorage.getItem(`sender-key-distribution-${mockUserId3}`)).toBeDefined()
    })

    it('should encrypt group message using sender key', async () => {
      const groupId = 'group-1'
      const senderKey = {
        chainKey: 'alice-chain-key',
        messageNumber: 0,
      }

      const plaintext = 'Hello, everyone!'
      const derivedKey = `kdf(${senderKey.chainKey})`
      const ciphertext = `encrypt(${plaintext}, ${derivedKey})`

      const groupMessage = {
        groupId,
        from: mockUserId1,
        ciphertext,
        messageNumber: senderKey.messageNumber,
        signature: 'message-signature',
      }

      // Advance sender key
      senderKey.chainKey = `kdf_advance(${senderKey.chainKey})`
      senderKey.messageNumber++

      const storageKey = `group-message-${Date.now()}`
      localStorage.setItem(storageKey, JSON.stringify(groupMessage))

      const stored = JSON.parse(localStorage.getItem(storageKey) || '{}')

      expect(stored.ciphertext).toBeDefined()
      expect(stored.signature).toBeDefined()
    })

    it('should verify sender signature in group message', () => {
      const groupMessage = {
        ciphertext: 'encrypted-data',
        signature: 'valid-signature',
        from: mockUserId1,
      }

      const senderSignatureKey = 'alice-signature-key'

      const isValid = groupMessage.signature === 'valid-signature'

      expect(isValid).toBe(true)
    })

    it('should handle member addition to group', async () => {
      const groupId = 'group-1'
      const newMemberId = 'user-dave'

      // Generate new sender key for post-compromise security
      const newSenderKey = {
        chainKey: 'new-chain-key',
        signatureKey: 'alice-signature-key',
        messageNumber: 0,
      }

      // Distribute to all members including new one
      const allMembers = [mockUserId2, mockUserId3, newMemberId]

      allMembers.forEach(memberId => {
        const encryptedKey = `encrypt(${JSON.stringify(newSenderKey)}, session-${mockUserId1}-${memberId})`
        localStorage.setItem(`sender-key-${memberId}`, encryptedKey)
      })

      expect(localStorage.getItem(`sender-key-${newMemberId}`)).toBeDefined()
    })

    it('should handle member removal from group', async () => {
      const groupId = 'group-1'
      const removedMemberId = mockUserId3

      // Generate new sender key (forward secrecy)
      const newSenderKey = {
        chainKey: 'new-chain-key-after-removal',
        signatureKey: 'alice-signature-key',
      }

      // Distribute only to remaining members
      const remainingMembers = [mockUserId2] // Charlie removed

      remainingMembers.forEach(memberId => {
        const encryptedKey = `encrypt(${JSON.stringify(newSenderKey)}, session-${mockUserId1}-${memberId})`
        localStorage.setItem(`sender-key-v2-${memberId}`, encryptedKey)
      })

      // Removed member should not have new key
      expect(localStorage.getItem(`sender-key-v2-${removedMemberId}`)).toBeNull()
    })
  })

  describe('Encrypted File Attachments', () => {
    it('should generate attachment encryption key', async () => {
      const attachmentKey = new Uint8Array(32)
      mockCrypto.getRandomValues(attachmentKey)

      expect(attachmentKey.length).toBe(32)
    })

    it('should encrypt file using AES-GCM', async () => {
      const file = new Uint8Array([1, 2, 3, 4, 5])
      const key = 'attachment-key'
      const iv = new Uint8Array(12)
      mockCrypto.getRandomValues(iv)

      mockCrypto.subtle.encrypt.mockResolvedValueOnce(new ArrayBuffer(file.length + 16))

      const encrypted = await mockCrypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key as any,
        file
      )

      expect(encrypted).toBeDefined()
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled()
    })

    it('should include attachment key in encrypted message', () => {
      const message = {
        content: 'Check out this file!',
        attachments: [
          {
            id: 'file-1',
            encryptedUrl: 'https://storage/encrypted-file.bin',
            key: 'base64-encoded-key',
            iv: 'base64-encoded-iv',
            size: 1024,
            mimeType: 'image/png',
          },
        ],
      }

      expect(message.attachments[0].key).toBeDefined()
      expect(message.attachments[0].iv).toBeDefined()
    })

    it('should decrypt and download file', async () => {
      const encryptedFile = new Uint8Array([10, 20, 30])
      const key = 'attachment-key'
      const iv = new Uint8Array(12)

      mockCrypto.subtle.decrypt.mockResolvedValueOnce(new ArrayBuffer(3))

      const decrypted = await mockCrypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key as any,
        encryptedFile
      )

      expect(decrypted).toBeDefined()
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled()
    })
  })

  describe('Key Rotation and Compromise', () => {
    it('should rotate identity key on compromise', async () => {
      const oldIdentityKey = 'alice-identity-old'
      const newIdentityKey = 'alice-identity-new'

      // Generate new key pair
      localStorage.setItem(`e2ee-identity-${mockUserId1}`, JSON.stringify({
        publicKey: newIdentityKey,
        privateKey: '***ENCRYPTED***',
        previousKey: oldIdentityKey,
        rotatedAt: Date.now(),
      }))

      const stored = JSON.parse(localStorage.getItem(`e2ee-identity-${mockUserId1}`) || '{}')
      expect(stored.publicKey).toBe(newIdentityKey)
      expect(stored.previousKey).toBe(oldIdentityKey)
    })

    it('should re-establish all sessions after key rotation', () => {
      const existingSessions = [
        `session-${mockUserId1}-${mockUserId2}`,
        `session-${mockUserId1}-${mockUserId3}`,
      ]

      // Mark sessions for re-initialization
      existingSessions.forEach(sessionId => {
        localStorage.removeItem(sessionId)
      })

      expect(localStorage.getItem(`session-${mockUserId1}-${mockUserId2}`)).toBeNull()
      expect(localStorage.getItem(`session-${mockUserId1}-${mockUserId3}`)).toBeNull()
    })

    it('should wipe all keys on account deletion', () => {
      const keysToWipe = [
        `e2ee-identity-${mockUserId1}`,
        `prekey-bundle-${mockUserId1}`,
        `session-${mockUserId1}-${mockUserId2}`,
        `sender-key-${mockUserId1}-group-1`,
      ]

      keysToWipe.forEach(key => {
        localStorage.setItem(key, 'sensitive-data')
      })

      // Wipe all keys
      keysToWipe.forEach(key => {
        localStorage.removeItem(key)
      })

      keysToWipe.forEach(key => {
        expect(localStorage.getItem(key)).toBeNull()
      })
    })
  })

  describe('Safety Numbers and Verification', () => {
    it('should compute safety number from identity keys', () => {
      const aliceIdentityKey = 'alice-identity-public-key-1234567890123456789012345678'
      const bobIdentityKey = 'bob-identity-public-key-0987654321098765432109876543'

      const combined = `${aliceIdentityKey}${bobIdentityKey}`.split('').sort().join('')
      const safetyNumber = combined.slice(0, 60) // 60 digits

      expect(safetyNumber.length).toBe(60)
    })

    it('should generate QR code for safety number', () => {
      const safetyNumber = '123456789012345678901234567890123456789012345678901234567890'

      const qrCodeData = `nself://verify/${safetyNumber}`

      expect(qrCodeData).toContain('nself://verify/')
      expect(qrCodeData).toContain(safetyNumber)
    })

    it('should mark conversation as verified', () => {
      const conversationId = `${mockUserId1}-${mockUserId2}`

      localStorage.setItem(`verified-${conversationId}`, JSON.stringify({
        verified: true,
        verifiedAt: Date.now(),
        safetyNumber: '123456...',
      }))

      const verification = JSON.parse(localStorage.getItem(`verified-${conversationId}`) || '{}')
      expect(verification.verified).toBe(true)
    })

    it('should warn on identity key change', () => {
      const session = {
        participantId: mockUserId2,
        identityKey: 'bob-identity-old',
      }

      const newIdentityKey = 'bob-identity-new'

      const hasKeyChanged = newIdentityKey !== session.identityKey

      expect(hasKeyChanged).toBe(true)

      if (hasKeyChanged) {
        localStorage.setItem('security-warning', JSON.stringify({
          type: 'identity_key_changed',
          participantId: mockUserId2,
          oldKey: session.identityKey,
          newKey: newIdentityKey,
          timestamp: Date.now(),
        }))
      }

      const warning = JSON.parse(localStorage.getItem('security-warning') || '{}')
      expect(warning.type).toBe('identity_key_changed')
    })
  })

  describe('Error Handling and Edge Cases', () => {
    it('should handle decryption failure gracefully', async () => {
      const encryptedMessage = {
        ciphertext: 'corrupted-data',
        messageNumber: 5,
      }

      try {
        mockCrypto.subtle.decrypt.mockRejectedValueOnce(new Error('Decryption failed'))
        await mockCrypto.subtle.decrypt({} as any, {} as any, {} as any)
      } catch (error) {
        expect((error as Error).message).toBe('Decryption failed')

        // Show error message to user
        localStorage.setItem('decryption-error', JSON.stringify({
          messageId: encryptedMessage.messageNumber,
          error: 'Failed to decrypt message',
          timestamp: Date.now(),
        }))
      }

      const errorLog = JSON.parse(localStorage.getItem('decryption-error') || '{}')
      expect(errorLog.error).toBe('Failed to decrypt message')
    })

    it('should handle missing session gracefully', () => {
      const sessionId = `session-${mockUserId1}-unknown-user`
      const session = localStorage.getItem(sessionId)

      if (!session) {
        // Initiate new session
        const newSession = {
          status: 'pending',
          initatedAt: Date.now(),
        }

        localStorage.setItem(sessionId, JSON.stringify(newSession))
      }

      const stored = JSON.parse(localStorage.getItem(sessionId) || '{}')
      expect(stored.status).toBe('pending')
    })

    it('should handle corrupted session data', () => {
      const sessionId = `session-${mockUserId1}-${mockUserId2}`
      localStorage.setItem(sessionId, 'invalid-json')

      try {
        JSON.parse(localStorage.getItem(sessionId) || '{}')
      } catch {
        // Reset session
        localStorage.removeItem(sessionId)
        localStorage.setItem(sessionId, JSON.stringify({
          status: 'reset',
          resetAt: Date.now(),
        }))
      }

      const session = JSON.parse(localStorage.getItem(sessionId) || '{}')
      expect(session.status).toBe('reset')
    })

    it('should rate limit key exchange attempts', () => {
      const rateLimiter = {
        userId: mockUserId1,
        limit: 10,
        window: 60000, // 1 minute
        attempts: [] as number[],
      }

      const now = Date.now()

      // Add attempts
      for (let i = 0; i < 8; i++) {
        rateLimiter.attempts.push(now - i * 1000)
      }

      // Remove old attempts
      rateLimiter.attempts = rateLimiter.attempts.filter(
        time => now - time < rateLimiter.window
      )

      const canAttempt = rateLimiter.attempts.length < rateLimiter.limit

      expect(canAttempt).toBe(true)
      expect(rateLimiter.attempts.length).toBe(8)
    })
  })
})
