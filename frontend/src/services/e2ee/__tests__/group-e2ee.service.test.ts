/**
 * Group E2EE Service Tests
 *
 * Comprehensive tests for the group E2EE service including
 * group management, key distribution, and message encryption.
 */

import {
  GroupE2EEService,
  createGroupE2EEService,
  getGroupE2EEService,
  resetGroupE2EEService,
  type GroupE2EEConfig,
  type GroupTransmittableMessage,
} from '../group-e2ee.service'
import type { PairwiseEncryptor } from '@/lib/e2ee/group-key-distribution'

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

// Setup Web Crypto API
const originalCrypto = global.crypto
beforeAll(() => {
  if (!global.crypto?.subtle) {
    const { webcrypto } = require('crypto')
    global.crypto = webcrypto as Crypto
  }
})

afterAll(() => {
  global.crypto = originalCrypto
})

// Reset singleton after each test
afterEach(() => {
  resetGroupE2EEService()
})

// Mock pairwise encryptor
function createMockPairwiseEncryptor(): PairwiseEncryptor {
  const sessions = new Map<string, boolean>()
  const encryptedData = new Map<string, Uint8Array>()

  return {
    hasSession: async (userId: string, deviceId: string) => {
      // Always return true to simulate sessions already exist
      return true
    },
    createSession: async (userId: string, deviceId: string) => {
      sessions.set(`${userId}:${deviceId}`, true)
    },
    encrypt: async (userId: string, deviceId: string, plaintext: Uint8Array) => {
      const key = `${userId}:${deviceId}`
      sessions.set(key, true)
      encryptedData.set(key, plaintext)
      // Simple mock encryption - just return with a header
      const result = new Uint8Array(plaintext.length + 4)
      result.set(new Uint8Array([0x01, 0x02, 0x03, 0x04]), 0)
      result.set(plaintext, 4)
      return result
    },
    decrypt: async (userId: string, deviceId: string, ciphertext: Uint8Array) => {
      // Mock decryption - strip header
      return ciphertext.slice(4)
    },
  }
}

describe('Group E2EE Service Creation', () => {
  describe('createGroupE2EEService', () => {
    it('should create and initialize service', async () => {
      const config: GroupE2EEConfig = {
        userId: 'user-1',
        deviceId: 'device-1',
        pairwiseEncryptor: createMockPairwiseEncryptor(),
      }

      const service = await createGroupE2EEService(config)

      expect(service.isInitialized()).toBe(true)

      const status = service.getStatus()
      expect(status.initialized).toBe(true)
      expect(status.userId).toBe('user-1')
      expect(status.deviceId).toBe('device-1')
      expect(status.activeGroups).toBe(0)

      service.destroy()
    })
  })

  describe('getGroupE2EEService singleton', () => {
    it('should create singleton on first call with config', async () => {
      const config: GroupE2EEConfig = {
        userId: 'user-1',
        deviceId: 'device-1',
        pairwiseEncryptor: createMockPairwiseEncryptor(),
      }

      const service1 = await getGroupE2EEService(config)
      const service2 = await getGroupE2EEService()

      expect(service1).toBe(service2)
    })

    it('should throw without config on first call', async () => {
      await expect(getGroupE2EEService()).rejects.toThrow('not configured')
    })
  })

  describe('resetGroupE2EEService', () => {
    it('should reset the singleton', async () => {
      const config: GroupE2EEConfig = {
        userId: 'user-1',
        deviceId: 'device-1',
        pairwiseEncryptor: createMockPairwiseEncryptor(),
      }

      await getGroupE2EEService(config)
      resetGroupE2EEService()

      await expect(getGroupE2EEService()).rejects.toThrow('not configured')
    })
  })
})

describe('Group E2EE Service - Group Management', () => {
  let service: GroupE2EEService

  beforeEach(async () => {
    service = await createGroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      autoDistributeOnJoin: false,
      autoRekeyOnLeave: false,
    })
  })

  afterEach(() => {
    service.destroy()
  })

  describe('createGroup', () => {
    it('should create a new group', async () => {
      const info = await service.createGroup('group-1', 'Test Group')

      expect(info.groupId).toBe('group-1')
      expect(info.groupName).toBe('Test Group')
      expect(info.memberCount).toBe(1) // Just the creator
      expect(info.epoch).toBe(0)
      expect(info.isActive).toBe(true)
    })

    it('should create group with initial members', async () => {
      const info = await service.createGroup('group-1', 'Test Group', [
        { userId: 'user-2', deviceId: 'device-2' },
        { userId: 'user-3', deviceId: 'device-3', role: 'admin' },
      ])

      expect(info.memberCount).toBe(3)
    })
  })

  describe('joinGroup', () => {
    it('should join an existing group', async () => {
      const info = await service.joinGroup('group-1', 'Test Group', [
        { userId: 'user-2', deviceId: 'device-2' },
        { userId: 'user-3', deviceId: 'device-3' },
      ])

      expect(info.groupId).toBe('group-1')
      expect(info.memberCount).toBe(3)
    })
  })

  describe('leaveGroup', () => {
    it('should leave a group', async () => {
      await service.createGroup('group-1', 'Test Group')
      await service.leaveGroup('group-1')

      const info = service.getGroupInfo('group-1')
      expect(info!.isActive).toBe(false)
    })

    it('should handle leaving non-existent group', async () => {
      // Should not throw
      await service.leaveGroup('unknown-group')
    })
  })

  describe('getGroupInfo', () => {
    it('should return group info', async () => {
      await service.createGroup('group-1', 'Test Group')

      const info = service.getGroupInfo('group-1')
      expect(info).not.toBeNull()
      expect(info!.groupId).toBe('group-1')
    })

    it('should return null for non-existent group', () => {
      const info = service.getGroupInfo('unknown')
      expect(info).toBeNull()
    })
  })

  describe('getAllGroups', () => {
    it('should return all groups', async () => {
      await service.createGroup('group-1', 'Test 1')
      await service.createGroup('group-2', 'Test 2')

      const groups = service.getAllGroups()
      expect(groups.length).toBe(2)
    })
  })
})

describe('Group E2EE Service - Member Management', () => {
  let service: GroupE2EEService

  beforeEach(async () => {
    service = await createGroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      autoDistributeOnJoin: false,
      autoRekeyOnLeave: false,
    })

    await service.createGroup('group-1', 'Test Group')
  })

  afterEach(() => {
    service.destroy()
  })

  describe('addMember', () => {
    it('should add a member to a group', async () => {
      await service.addMember('group-1', 'user-2', 'device-2')

      const members = service.getMembers('group-1')
      expect(members.length).toBe(2)
    })

    it('should throw for non-existent group', async () => {
      await expect(
        service.addMember('unknown', 'user-2', 'device-2')
      ).rejects.toThrow('not found')
    })
  })

  describe('removeMember', () => {
    it('should remove a member from a group', async () => {
      await service.addMember('group-1', 'user-2', 'device-2')
      await service.removeMember('group-1', 'user-2', 'device-2')

      const members = service.getMembers('group-1')
      expect(members.length).toBe(1)
    })
  })

  describe('getMembers', () => {
    it('should return group members', async () => {
      await service.addMember('group-1', 'user-2', 'device-2')
      await service.addMember('group-1', 'user-3', 'device-3')

      const members = service.getMembers('group-1')
      expect(members.length).toBe(3)
    })

    it('should return empty array for non-existent group', () => {
      const members = service.getMembers('unknown')
      expect(members.length).toBe(0)
    })
  })
})

describe('Group E2EE Service - Key Distribution', () => {
  let service: GroupE2EEService

  beforeEach(async () => {
    service = await createGroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      autoDistributeOnJoin: false,
      autoRekeyOnLeave: false,
    })

    await service.createGroup('group-1', 'Test Group')
    await service.addMember('group-1', 'user-2', 'device-2')
  })

  afterEach(() => {
    service.destroy()
  })

  describe('getDistributionMessage', () => {
    it('should return distribution message', () => {
      const message = service.getDistributionMessage('group-1')

      expect(message).not.toBeNull()
      expect(message!.groupId).toBe('group-1')
      expect(message!.senderUserId).toBe('user-1')
    })

    it('should return null for non-existent group', () => {
      const message = service.getDistributionMessage('unknown')
      expect(message).toBeNull()
    })
  })

  describe('distributeKeys', () => {
    it('should distribute keys to members', async () => {
      const distributionMessage = service.getDistributionMessage('group-1')!
      const members = service.getMembers('group-1').filter(
        (m) => m.userId !== 'user-1'
      )

      const result = await service.distributeKeys('group-1', distributionMessage, members)

      expect(result.totalTargets).toBe(1)
      expect(result.successCount).toBe(1)
    })
  })

  describe('getKeyCollectionProgress', () => {
    it('should return collection progress', async () => {
      await service.addMember('group-1', 'user-3', 'device-3')

      const progress = service.getKeyCollectionProgress('group-1')

      expect(progress.total).toBe(2)
      expect(progress.collected).toBe(0)
      expect(progress.percentage).toBe(0)
      expect(progress.missingMembers.length).toBe(2)
    })
  })

  describe('isKeyCollectionComplete', () => {
    it('should return false when keys are missing', () => {
      expect(service.isKeyCollectionComplete('group-1')).toBe(false)
    })
  })
})

describe('Group E2EE Service - Rekey', () => {
  let service: GroupE2EEService

  beforeEach(async () => {
    service = await createGroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      autoDistributeOnJoin: false,
      autoRekeyOnLeave: false,
    })

    await service.createGroup('group-1', 'Test Group')
    await service.addMember('group-1', 'user-2', 'device-2')
  })

  afterEach(() => {
    service.destroy()
  })

  describe('rekey', () => {
    it('should increment epoch', async () => {
      const initialInfo = service.getGroupInfo('group-1')!
      const result = await service.rekey('group-1', 'test')

      expect(result.epoch).toBe(initialInfo.epoch + 1)
    })

    it('should generate new distribution message', async () => {
      const oldMessage = service.getDistributionMessage('group-1')!
      await service.rekey('group-1', 'test')
      const newMessage = service.getDistributionMessage('group-1')!

      expect(newMessage.keyId).not.toBe(oldMessage.keyId)
    })

    it('should return members to distribute to', async () => {
      const result = await service.rekey('group-1', 'test')

      expect(result.membersToDistribute.length).toBe(1)
    })
  })

  describe('needsRekey', () => {
    it('should return false for fresh group', () => {
      expect(service.needsRekey('group-1')).toBe(false)
    })
  })
})

describe('Group E2EE Service - Message Encryption/Decryption', () => {
  let aliceService: GroupE2EEService
  let bobService: GroupE2EEService

  beforeEach(async () => {
    aliceService = await createGroupE2EEService({
      userId: 'alice',
      deviceId: 'device-a',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      autoDistributeOnJoin: false,
      autoRekeyOnLeave: false,
    })

    bobService = await createGroupE2EEService({
      userId: 'bob',
      deviceId: 'device-b',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      autoDistributeOnJoin: false,
      autoRekeyOnLeave: false,
    })

    // Create group on both sides
    await aliceService.createGroup('group-1', 'Test Group', [
      { userId: 'bob', deviceId: 'device-b' },
    ])
    await bobService.joinGroup('group-1', 'Test Group', [
      { userId: 'alice', deviceId: 'device-a' },
    ])

    // Exchange sender keys
    const aliceDistribution = aliceService.getDistributionMessage('group-1')!
    const bobDistribution = bobService.getDistributionMessage('group-1')!

    // Create mock encrypted distribution messages
    const mockAliceMessage = {
      type: 'sender_key_distribution' as const,
      groupId: 'group-1',
      senderUserId: 'alice',
      senderDeviceId: 'device-a',
      targetUserId: 'bob',
      targetDeviceId: 'device-b',
      encryptedData: btoa(JSON.stringify({
        keyId: aliceDistribution.keyId,
        chainKey: Array.from(aliceDistribution.chainKey).map(b => String.fromCharCode(b)).join(''),
        chainIteration: aliceDistribution.chainIteration,
        signingPublicKey: Array.from(aliceDistribution.signingPublicKey).map(b => String.fromCharCode(b)).join(''),
        groupId: aliceDistribution.groupId,
        senderUserId: aliceDistribution.senderUserId,
        senderDeviceId: aliceDistribution.senderDeviceId,
        timestamp: aliceDistribution.timestamp,
        version: aliceDistribution.version,
      })),
      epoch: 0,
      timestamp: Date.now(),
    }
  })

  afterEach(() => {
    aliceService.destroy()
    bobService.destroy()
  })

  describe('encryptMessage', () => {
    it('should encrypt a message', async () => {
      const encrypted = await aliceService.encryptMessage('group-1', 'Hello, group!')

      expect(encrypted.type).toBe('group_message')
      expect(encrypted.groupId).toBe('group-1')
      expect(encrypted.senderUserId).toBe('alice')
      expect(encrypted.senderDeviceId).toBe('device-a')
      expect(encrypted.encryptedMessage).toBeDefined()
      expect(encrypted.messageId).toBeDefined()
    })

    it('should throw for non-existent group', async () => {
      await expect(
        aliceService.encryptMessage('unknown', 'Test')
      ).rejects.toThrow('not found')
    })
  })

  describe('canDecryptFrom', () => {
    it('should return false when key is missing', () => {
      expect(bobService.canDecryptFrom('group-1', 'alice', 'device-a', 123)).toBe(false)
    })
  })
})

describe('Group E2EE Service - Events', () => {
  let service: GroupE2EEService

  beforeEach(async () => {
    service = await createGroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      autoDistributeOnJoin: false,
      autoRekeyOnLeave: false,
    })
  })

  afterEach(() => {
    service.destroy()
  })

  describe('on', () => {
    it('should allow subscribing to events', async () => {
      const events: string[] = []

      service.on('distribution_completed', (event) => {
        events.push(event.type)
      })

      await service.createGroup('group-1', 'Test')
      await service.addMember('group-1', 'user-2', 'device-2')

      const distribution = service.getDistributionMessage('group-1')!
      const members = service.getMembers('group-1').filter(m => m.userId !== 'user-1')
      await service.distributeKeys('group-1', distribution, members)

      expect(events).toContain('distribution_completed')
    })

    it('should return unsubscribe function', async () => {
      let callCount = 0

      const unsubscribe = service.on('distribution_completed', () => {
        callCount++
      })

      await service.createGroup('group-1', 'Test')
      await service.addMember('group-1', 'user-2', 'device-2')

      const distribution = service.getDistributionMessage('group-1')!
      const members = service.getMembers('group-1').filter(m => m.userId !== 'user-1')
      await service.distributeKeys('group-1', distribution, members)

      const countAfterFirst = callCount

      unsubscribe()

      await service.addMember('group-1', 'user-3', 'device-3')
      await service.distributeKeys('group-1', distribution, members)

      expect(callCount).toBe(countAfterFirst)
    })
  })
})

describe('Group E2EE Service - Maintenance', () => {
  let service: GroupE2EEService

  beforeEach(async () => {
    service = await createGroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      autoDistributeOnJoin: false,
      autoRekeyOnLeave: false,
    })
  })

  afterEach(() => {
    service.destroy()
  })

  describe('performMaintenance', () => {
    it('should complete without error', async () => {
      await service.createGroup('group-1', 'Test')

      // Should not throw
      await service.performMaintenance()
    })
  })
})

describe('Group E2EE Service - Cleanup', () => {
  it('should destroy service', async () => {
    const service = await createGroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
    })

    await service.createGroup('group-1', 'Test')
    service.destroy()

    expect(service.isInitialized()).toBe(false)
  })

  it('should clear all data', async () => {
    const storage = new Map<string, string>()
    const mockStorage = {
      length: 0,
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => {
        storage.set(key, value)
        mockStorage.length = storage.size
      },
      removeItem: (key: string) => {
        storage.delete(key)
        mockStorage.length = storage.size
      },
      clear: () => {
        storage.clear()
        mockStorage.length = 0
      },
      key: (index: number) => Array.from(storage.keys())[index] ?? null,
    } as Storage

    const service = await createGroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      storage: mockStorage,
    })

    await service.createGroup('group-1', 'Test')
    service.clearAllData()

    expect(service.isInitialized()).toBe(false)
  })
})

describe('Group E2EE Service - Error Handling', () => {
  let service: GroupE2EEService

  beforeEach(async () => {
    service = await createGroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      autoDistributeOnJoin: false,
      autoRekeyOnLeave: false,
    })
  })

  afterEach(() => {
    service.destroy()
  })

  it('should throw when not initialized', async () => {
    const uninitializedService = new GroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
    })

    await expect(
      uninitializedService.createGroup('group-1', 'Test')
    ).rejects.toThrow('not initialized')

    expect(() => uninitializedService.getGroupInfo('group-1')).toThrow('not initialized')
  })

  it('should throw when encrypting for non-existent group', async () => {
    await expect(
      service.encryptMessage('unknown-group', 'Test')
    ).rejects.toThrow('not found')
  })

  it('should throw when decrypting without sender key', async () => {
    await service.createGroup('group-1', 'Test')

    const fakeMessage: GroupTransmittableMessage = {
      type: 'group_message',
      groupId: 'group-1',
      senderUserId: 'unknown-user',
      senderDeviceId: 'unknown-device',
      encryptedMessage: {
        keyId: 12345,
        chainIteration: 0,
        ciphertext: new Uint8Array([1, 2, 3]),
        nonce: new Uint8Array(12),
        signature: new Uint8Array(64),
        groupId: 'group-1',
        senderUserId: 'unknown-user',
        senderDeviceId: 'unknown-device',
      },
      messageId: 'msg-1',
      timestamp: Date.now(),
    }

    await expect(service.decryptMessage(fakeMessage)).rejects.toThrow('Missing sender key')
  })
})

describe('Group E2EE Service - Auto Distribution', () => {
  it('should auto-distribute on member join when enabled', async () => {
    let distributionStarted = false

    const service = await createGroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      autoDistributeOnJoin: true,
      autoRekeyOnLeave: false,
    })

    service.on('distribution_started', () => {
      distributionStarted = true
    })

    await service.createGroup('group-1', 'Test', [
      { userId: 'user-2', deviceId: 'device-2' },
    ])

    // Wait for async distribution
    await new Promise((resolve) => setTimeout(resolve, 100))

    expect(distributionStarted).toBe(true)

    service.destroy()
  })
})

describe('Group E2EE Service - Auto Rekey', () => {
  it('should auto-rekey on member removal when enabled', async () => {
    const service = await createGroupE2EEService({
      userId: 'user-1',
      deviceId: 'device-1',
      pairwiseEncryptor: createMockPairwiseEncryptor(),
      autoDistributeOnJoin: false,
      autoRekeyOnLeave: true,
    })

    await service.createGroup('group-1', 'Test')
    await service.addMember('group-1', 'user-2', 'device-2')

    const initialEpoch = service.getGroupInfo('group-1')!.epoch
    await service.removeMember('group-1', 'user-2', 'device-2')

    const newEpoch = service.getGroupInfo('group-1')!.epoch
    expect(newEpoch).toBe(initialEpoch + 1)

    service.destroy()
  })
})
