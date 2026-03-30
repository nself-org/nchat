/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 */

import { renderHook, act, waitFor } from '@testing-library/react'
import React, { ReactNode } from 'react'
import { useRealtime } from '../use-realtime'

// Mock auth context - must come before imports
jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user', email: 'test@example.com' },
    loading: false,
    isAuthenticated: true,
  })),
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

// Mock realtime client - create inline to avoid hoisting issues
jest.mock('@/services/realtime/realtime-client', () => ({
  realtimeClient: {
    initialize: jest.fn(),
    connect: jest.fn().mockResolvedValue(undefined),
    disconnect: jest.fn(),
    destroy: jest.fn(),
    isConnected: false,
    isAuthenticated: false,
    state: 'disconnected',
    socketId: undefined,
    reconnectAttemptCount: 0,
    on: jest.fn(() => () => {}),
    emit: jest.fn(),
    emitAsync: jest.fn().mockResolvedValue({ success: true }),
    onConnectionStateChange: jest.fn(() => () => {}),
    onError: jest.fn(() => () => {}),
  },
}))

// Get reference to the mock for tests
import { realtimeClient as mockRealtimeClient } from '@/services/realtime/realtime-client'

// Mock services
jest.mock('@/services/realtime/presence.service', () => ({
  initializePresenceService: jest.fn(() => ({ destroy: jest.fn() })),
  resetPresenceService: jest.fn(),
  getPresenceService: jest.fn(),
}))

jest.mock('@/services/realtime/typing.service', () => ({
  initializeTypingService: jest.fn(() => ({ destroy: jest.fn() })),
  resetTypingService: jest.fn(),
  getTypingService: jest.fn(),
}))

jest.mock('@/services/realtime/rooms.service', () => ({
  initializeRoomsService: jest.fn(() => ({ destroy: jest.fn() })),
  resetRoomsService: jest.fn(),
  getRoomsService: jest.fn(),
}))

describe('useRealtime', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useRealtime({ autoConnect: false }))

      expect(result.current.isConnected).toBe(false)
      expect(result.current.connectionState).toBe('disconnected')
      expect(result.current.error).toBeNull()
      expect(result.current.reconnectAttempts).toBe(0)
    })

    it('should provide connect function', () => {
      const { result } = renderHook(() => useRealtime({ autoConnect: false }))
      expect(typeof result.current.connect).toBe('function')
    })

    it('should provide disconnect function', () => {
      const { result } = renderHook(() => useRealtime({ autoConnect: false }))
      expect(typeof result.current.disconnect).toBe('function')
    })

    it('should provide reconnect function', () => {
      const { result } = renderHook(() => useRealtime({ autoConnect: false }))
      expect(typeof result.current.reconnect).toBe('function')
    })
  })

  describe('connection management', () => {
    it('should call connect with token', async () => {
      const { result } = renderHook(() => useRealtime({ autoConnect: false }))

      await act(async () => {
        await result.current.connect()
      })

      expect(mockRealtimeClient.initialize).toHaveBeenCalled()
      expect(mockRealtimeClient.connect).toHaveBeenCalledWith('user:test-user')
    })

    it('should call disconnect', () => {
      const { result } = renderHook(() => useRealtime({ autoConnect: false }))

      act(() => {
        result.current.disconnect()
      })

      expect(mockRealtimeClient.disconnect).toHaveBeenCalled()
    })

    it('should call reconnect', async () => {
      const { result } = renderHook(() => useRealtime({ autoConnect: false }))

      await act(async () => {
        await result.current.reconnect()
      })

      expect(mockRealtimeClient.disconnect).toHaveBeenCalled()
      expect(mockRealtimeClient.connect).toHaveBeenCalled()
    })
  })

  describe('event handling', () => {
    it('should provide on function', () => {
      const { result } = renderHook(() => useRealtime({ autoConnect: false }))
      const callback = jest.fn()

      act(() => {
        const unsub = result.current.on('test-event', callback)
        expect(typeof unsub).toBe('function')
      })

      expect(mockRealtimeClient.on).toHaveBeenCalledWith('test-event', callback)
    })

    it('should provide emit function', () => {
      const { result } = renderHook(() => useRealtime({ autoConnect: false }))

      act(() => {
        result.current.emit('test-event', { data: 'test' })
      })

      expect(mockRealtimeClient.emit).toHaveBeenCalledWith('test-event', { data: 'test' })
    })

    it('should provide emitAsync function', async () => {
      ;(mockRealtimeClient.emitAsync as jest.Mock).mockResolvedValue({ success: true })

      const { result } = renderHook(() => useRealtime({ autoConnect: false }))

      let response: unknown
      await act(async () => {
        response = await result.current.emitAsync('test-event', { data: 'test' })
      })

      expect(mockRealtimeClient.emitAsync).toHaveBeenCalledWith('test-event', { data: 'test' })
      expect(response).toEqual({ success: true })
    })
  })

  describe('configuration', () => {
    it('should pass debug option to initialize', async () => {
      const { result } = renderHook(() => useRealtime({ autoConnect: false, debug: true }))

      await act(async () => {
        await result.current.connect()
      })

      expect(mockRealtimeClient.initialize).toHaveBeenCalledWith(
        expect.objectContaining({ debug: true })
      )
    })

    it('should pass custom config', async () => {
      const { result } = renderHook(() =>
        useRealtime({
          autoConnect: false,
          config: { timeout: 5000 },
        })
      )

      await act(async () => {
        await result.current.connect()
      })

      expect(mockRealtimeClient.initialize).toHaveBeenCalledWith(
        expect.objectContaining({ timeout: 5000 })
      )
    })
  })

  describe('error handling', () => {
    it('should handle connection errors', async () => {
      ;(mockRealtimeClient.connect as jest.Mock).mockRejectedValueOnce(
        new Error('Connection failed')
      )

      const { result } = renderHook(() => useRealtime({ autoConnect: false }))

      // The connect function should throw when connection fails
      await expect(
        act(async () => {
          await result.current.connect()
        })
      ).rejects.toThrow('Connection failed')
    })
  })
})
