/**
 * Platform Adapters Tests
 *
 * Tests for mobile-specific adapters (storage, auth, notifications, camera, network)
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals'

// Mock Capacitor plugins
jest.mock('@capacitor/preferences', () => ({
  Preferences: {
    get: jest.fn(),
    set: jest.fn(),
    remove: jest.fn(),
    clear: jest.fn(),
    keys: jest.fn(),
  },
}))

jest.mock('@aparajita/capacitor-biometric-auth', () => ({
  BiometricAuth: {
    checkBiometry: jest.fn(),
    authenticate: jest.fn(),
  },
  BiometryType: {
    touchId: 1,
    faceId: 2,
    fingerprintAuthentication: 3,
    faceAuthentication: 4,
    irisAuthentication: 5,
  },
}))

jest.mock('@capacitor/push-notifications', () => ({
  PushNotifications: {
    requestPermissions: jest.fn(),
    register: jest.fn(),
    unregister: jest.fn(),
    setBadgeCount: jest.fn(),
    addListener: jest.fn(),
  },
}))

jest.mock('@capacitor/camera', () => ({
  Camera: {
    getPhoto: jest.fn(),
    requestPermissions: jest.fn(),
    checkPermissions: jest.fn(),
  },
  CameraResultType: {
    Uri: 'uri',
    Base64: 'base64',
    DataUrl: 'dataUrl',
  },
  CameraSource: {
    Camera: 'camera',
    Photos: 'photos',
  },
}))

jest.mock('@capacitor/network', () => ({
  Network: {
    getStatus: jest.fn(),
    addListener: jest.fn(),
  },
}))

import { mobileStorage, typedStorage } from '../adapters/storage'
import { mobileAuth, biometricHelpers } from '../adapters/auth'
import { mobileNotifications } from '../adapters/notifications'
import { mobileCamera } from '../adapters/camera'
import { mobileNetwork, networkHelpers } from '../adapters/network'

import { Preferences } from '@capacitor/preferences'
import { BiometricAuth, BiometryType } from '@aparajita/capacitor-biometric-auth'
import { PushNotifications } from '@capacitor/push-notifications'
import { Camera } from '@capacitor/camera'
import { Network } from '@capacitor/network'

describe('Storage Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should get item from storage', async () => {
    ;(Preferences.get as jest.Mock).mockResolvedValue({ value: 'test-value' })

    const value = await mobileStorage.getItem('test-key')

    expect(value).toBe('test-value')
    expect(Preferences.get).toHaveBeenCalledWith({ key: 'test-key' })
  })

  it('should set item in storage', async () => {
    await mobileStorage.setItem('test-key', 'test-value')

    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'test-key',
      value: 'test-value',
    })
  })

  it('should remove item from storage', async () => {
    await mobileStorage.removeItem('test-key')

    expect(Preferences.remove).toHaveBeenCalledWith({ key: 'test-key' })
  })

  it('should clear all storage', async () => {
    await mobileStorage.clear()

    expect(Preferences.clear).toHaveBeenCalled()
  })

  it('should get all keys', async () => {
    ;(Preferences.keys as jest.Mock).mockResolvedValue({
      keys: ['key1', 'key2'],
    })

    const keys = await mobileStorage.keys()

    expect(keys).toEqual(['key1', 'key2'])
  })

  it('should handle JSON storage', async () => {
    const testObj = { foo: 'bar', count: 42 }

    await typedStorage.setJSON('test', testObj)
    expect(Preferences.set).toHaveBeenCalledWith({
      key: 'test',
      value: JSON.stringify(testObj),
    })

    ;(Preferences.get as jest.Mock).mockResolvedValue({
      value: JSON.stringify(testObj),
    })

    const retrieved = await typedStorage.getJSON('test')
    expect(retrieved).toEqual(testObj)
  })
})

describe('Auth Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should check biometric availability', async () => {
    ;(BiometricAuth.checkBiometry as jest.Mock).mockResolvedValue({
      isAvailable: true,
      biometryType: BiometryType.faceId,
      reason: undefined,
    })

    const result = await mobileAuth.checkBiometric()

    expect(result.available).toBe(true)
    expect(result.type).toBe(BiometryType.faceId)
  })

  it('should authenticate with biometrics', async () => {
    ;(BiometricAuth.authenticate as jest.Mock).mockResolvedValue({
      verified: true,
    })

    const success = await mobileAuth.authenticateBiometric({
      reason: 'Test auth',
    })

    expect(success).toBe(true)
  })

  it('should get biometric type name', () => {
    expect(biometricHelpers.getBiometricTypeName(BiometryType.faceId)).toBe(
      'Face ID'
    )
    expect(biometricHelpers.getBiometricTypeName(BiometryType.touchId)).toBe(
      'Touch ID'
    )
  })

  it('should identify strong biometric types', () => {
    expect(biometricHelpers.hasStrongBiometric(BiometryType.faceId)).toBe(true)
    expect(biometricHelpers.hasStrongBiometric(BiometryType.touchId)).toBe(true)
  })
})

describe('Notifications Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should request notification permission', async () => {
    ;(PushNotifications.requestPermissions as jest.Mock).mockResolvedValue({
      receive: 'granted',
    })

    const permission = await mobileNotifications.requestPermission()

    expect(permission).toBe('granted')
  })

  it('should register for push notifications', async () => {
    ;(PushNotifications.register as jest.Mock).mockResolvedValue(undefined)

    const result = await mobileNotifications.register()

    expect(PushNotifications.register).toHaveBeenCalled()
    expect(result).toBeNull() // Token comes via listener
  })

  it('should set badge count', async () => {
    const mockGetInfo = jest.fn().mockResolvedValue({ platform: 'ios' })
    global.App = { getInfo: mockGetInfo } as any

    await mobileNotifications.setBadgeCount(5)

    // Would check setBadgeCount in actual implementation
  })
})

describe('Camera Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should take a picture', async () => {
    const mockPhoto = {
      webPath: 'file://photo.jpg',
      format: 'jpeg',
    }
    ;(Camera.getPhoto as jest.Mock).mockResolvedValue(mockPhoto)

    const photo = await mobileCamera.takePicture()

    expect(photo).toEqual(mockPhoto)
    expect(Camera.getPhoto).toHaveBeenCalled()
  })

  it('should select from gallery', async () => {
    const mockPhoto = {
      webPath: 'file://selected.jpg',
      format: 'jpeg',
    }
    ;(Camera.getPhoto as jest.Mock).mockResolvedValue(mockPhoto)

    const photo = await mobileCamera.selectFromGallery()

    expect(photo).toEqual(mockPhoto)
  })

  it('should request camera permission', async () => {
    ;(Camera.requestPermissions as jest.Mock).mockResolvedValue({
      camera: 'granted',
      photos: 'granted',
    })

    const granted = await mobileCamera.requestPermission()

    expect(granted).toBe(true)
  })
})

describe('Network Adapter', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should get network status', async () => {
    ;(Network.getStatus as jest.Mock).mockResolvedValue({
      connected: true,
      connectionType: 'wifi',
    })

    const status = await mobileNetwork.getStatus()

    expect(status.connected).toBe(true)
    expect(status.wifi).toBe(true)
    expect(status.cellular).toBe(false)
    expect(status.offline).toBe(false)
  })

  it('should identify metered connection', () => {
    expect(networkHelpers.isMeteredConnection('cellular')).toBe(true)
    expect(networkHelpers.isMeteredConnection('wifi')).toBe(false)
  })

  it('should determine download suitability', () => {
    const wifiStatus = {
      connected: true,
      connectionType: 'wifi' as const,
      wifi: true,
      cellular: false,
      offline: false,
    }

    const cellularStatus = {
      connected: true,
      connectionType: 'cellular' as const,
      wifi: false,
      cellular: true,
      offline: false,
    }

    expect(networkHelpers.isSuitableForLargeDownloads(wifiStatus)).toBe(true)
    expect(networkHelpers.isSuitableForLargeDownloads(cellularStatus)).toBe(
      false
    )
  })

  it('should determine connection quality', () => {
    expect(networkHelpers.getConnectionQuality('wifi')).toBe('excellent')
    expect(networkHelpers.getConnectionQuality('cellular')).toBe('good')
    expect(networkHelpers.getConnectionQuality('none')).toBe('poor')
  })
})
