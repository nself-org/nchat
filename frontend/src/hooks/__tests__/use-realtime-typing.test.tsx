/**
 * @jest-environment <rootDir>/jest.jsdom-env.js
 */

import { renderHook, act } from '@testing-library/react'
import React from 'react'
import {
  useRealtimeTyping,
  useTypingIndicatorDisplay,
  useDMTyping,
  useThreadTyping,
} from '../use-realtime-typing'

// Mock auth context
jest.mock('@/contexts/auth-context', () => ({
  useAuth: jest.fn(() => ({
    user: { id: 'test-user', email: 'test@example.com', displayName: 'Test User' },
    loading: false,
    isAuthenticated: true,
  })),
}))

// Mock typing service - create inline to avoid hoisting issues
const mockTypingServiceInstance = {
  startTyping: jest.fn(),
  startTypingInDM: jest.fn(),
  startTypingInThread: jest.fn(),
  stopTyping: jest.fn(),
  stopTypingInDM: jest.fn(),
  handleInputChange: jest.fn(),
  handleDMInputChange: jest.fn(),
  getTypingUsers: jest.fn().mockReturnValue([]),
  getTypingUsersInRoom: jest.fn().mockReturnValue([]),
  getTypingUsersInDM: jest.fn().mockReturnValue([]),
  getTypingText: jest.fn().mockReturnValue(null),
  getTypingTextInDM: jest.fn().mockReturnValue(null),
  onTypingChange: jest.fn(() => () => {}),
  onRoomTypingChange: jest.fn(() => () => {}),
  setCurrentUserId: jest.fn(),
  setContacts: jest.fn(),
  updatePrivacySettings: jest.fn(),
  initialized: true,
}

jest.mock('@/services/realtime/typing.service', () => ({
  getTypingService: jest.fn(() => mockTypingServiceInstance),
  initializeTypingService: jest.fn(() => mockTypingServiceInstance),
  resetTypingService: jest.fn(),
}))

// Mock realtime client
jest.mock('@/services/realtime/realtime-client', () => ({
  realtimeClient: {
    isConnected: true,
    onConnectionStateChange: jest.fn(() => () => {}),
  },
}))

// Reference for tests
const mockTypingService = mockTypingServiceInstance

describe('useRealtimeTyping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  describe('initialization', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      expect(result.current.typingUsers).toEqual([])
      expect(result.current.isTyping).toBe(false)
      expect(result.current.typingText).toBeNull()
      expect(result.current.typingCount).toBe(0)
    })

    it('should provide typing functions', () => {
      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      expect(typeof result.current.startTyping).toBe('function')
      expect(typeof result.current.stopTyping).toBe('function')
      expect(typeof result.current.handleInputChange).toBe('function')
      expect(typeof result.current.handleMessageSend).toBe('function')
      expect(typeof result.current.updatePrivacySettings).toBe('function')
    })

    it('should set current user ID on mount', () => {
      renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))
      expect(mockTypingService.setCurrentUserId).toHaveBeenCalledWith('test-user')
    })
  })

  describe('typing management', () => {
    it('should start typing in channel', () => {
      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      act(() => {
        result.current.startTyping()
      })

      expect(mockTypingService.startTyping).toHaveBeenCalledWith('channel-1', undefined)
    })

    it('should start typing in thread', () => {
      const { result } = renderHook(() =>
        useRealtimeTyping({ roomName: 'channel-1', threadId: 'thread-1' })
      )

      act(() => {
        result.current.startTyping()
      })

      expect(mockTypingService.startTypingInThread).toHaveBeenCalledWith('channel-1', 'thread-1')
    })

    it('should start typing in DM', () => {
      const { result } = renderHook(() =>
        useRealtimeTyping({ roomName: 'dm-1', roomType: 'dm', recipientId: 'user-2' })
      )

      act(() => {
        result.current.startTyping()
      })

      expect(mockTypingService.startTypingInDM).toHaveBeenCalledWith('dm-1', 'user-2')
    })

    it('should stop typing', () => {
      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      act(() => {
        result.current.stopTyping()
      })

      expect(mockTypingService.stopTyping).toHaveBeenCalledWith('channel-1', undefined)
    })

    it('should stop typing in DM', () => {
      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'dm-1', roomType: 'dm' }))

      act(() => {
        result.current.stopTyping()
      })

      expect(mockTypingService.stopTypingInDM).toHaveBeenCalledWith('dm-1')
    })

    it('should handle input change', () => {
      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      act(() => {
        result.current.handleInputChange('Hello')
        jest.advanceTimersByTime(400)
      })

      expect(mockTypingService.startTyping).toHaveBeenCalled()
    })

    it('should stop typing on empty input', () => {
      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      act(() => {
        result.current.handleInputChange('')
      })

      expect(mockTypingService.stopTyping).toHaveBeenCalled()
    })

    it('should handle message send', () => {
      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      act(() => {
        result.current.handleMessageSend()
      })

      expect(mockTypingService.stopTyping).toHaveBeenCalled()
    })

    it('should update privacy settings', () => {
      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      act(() => {
        result.current.updatePrivacySettings({ broadcastTyping: false })
      })

      expect(mockTypingService.updatePrivacySettings).toHaveBeenCalledWith({
        broadcastTyping: false,
      })
    })
  })

  describe('typing text', () => {
    it('should format typing text for one user', () => {
      mockTypingService.getTypingUsersInRoom.mockReturnValue([
        { userId: 'user-1', userName: 'Alice', startedAt: new Date() },
      ])

      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      expect(result.current.typingText).toBe('Alice is typing...')
    })

    it('should format typing text for two users', () => {
      mockTypingService.getTypingUsersInRoom.mockReturnValue([
        { userId: 'user-1', userName: 'Alice', startedAt: new Date() },
        { userId: 'user-2', userName: 'Bob', startedAt: new Date() },
      ])

      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      expect(result.current.typingText).toBe('Alice and Bob are typing...')
    })

    it('should format typing text for three users', () => {
      mockTypingService.getTypingUsersInRoom.mockReturnValue([
        { userId: 'user-1', userName: 'Alice', startedAt: new Date() },
        { userId: 'user-2', userName: 'Bob', startedAt: new Date() },
        { userId: 'user-3', userName: 'Charlie', startedAt: new Date() },
      ])

      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      expect(result.current.typingText).toBe('Alice, Bob, and Charlie are typing...')
    })

    it('should format typing text for many users', () => {
      mockTypingService.getTypingUsersInRoom.mockReturnValue([
        { userId: 'user-1', userName: 'Alice', startedAt: new Date() },
        { userId: 'user-2', userName: 'Bob', startedAt: new Date() },
        { userId: 'user-3', userName: 'Charlie', startedAt: new Date() },
        { userId: 'user-4', userName: 'David', startedAt: new Date() },
      ])

      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      expect(result.current.typingText).toBe('Alice, Bob, and 2 others are typing...')
    })

    it('should exclude current user from typing text', () => {
      mockTypingService.getTypingUsersInRoom.mockReturnValue([
        { userId: 'test-user', userName: 'Test User', startedAt: new Date() },
        { userId: 'user-1', userName: 'Alice', startedAt: new Date() },
      ])

      const { result } = renderHook(() => useRealtimeTyping({ roomName: 'channel-1' }))

      expect(result.current.typingText).toBe('Alice is typing...')
    })
  })

  describe('enabled option', () => {
    it('should not start typing when disabled', () => {
      const { result } = renderHook(() =>
        useRealtimeTyping({ roomName: 'channel-1', enabled: false })
      )

      act(() => {
        result.current.startTyping()
      })

      expect(mockTypingService.startTyping).not.toHaveBeenCalled()
    })
  })
})

describe('useTypingIndicatorDisplay', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTypingService.getTypingUsersInRoom.mockReturnValue([])
  })

  it('should return typing indicator data', () => {
    const { result } = renderHook(() => useTypingIndicatorDisplay('channel-1'))

    expect(result.current.typingUsers).toEqual([])
    expect(result.current.typingText).toBeNull()
    expect(result.current.hasTyping).toBe(false)
  })

  it('should indicate when users are typing', () => {
    mockTypingService.getTypingUsersInRoom.mockReturnValue([
      { userId: 'user-1', userName: 'Alice', startedAt: new Date() },
    ])

    const { result } = renderHook(() => useTypingIndicatorDisplay('channel-1'))

    expect(result.current.hasTyping).toBe(true)
  })

  it('should support room type parameter', () => {
    mockTypingService.getTypingUsersInRoom.mockReturnValue([])

    renderHook(() => useTypingIndicatorDisplay('dm-1', 'dm'))

    expect(mockTypingService.onRoomTypingChange).toHaveBeenCalled()
  })
})

describe('useDMTyping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockTypingService.getTypingUsersInRoom.mockReturnValue([])
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should use DM room type', () => {
    const { result } = renderHook(() => useDMTyping('dm-1', 'recipient-1'))

    act(() => {
      result.current.startTyping()
    })

    expect(mockTypingService.startTypingInDM).toHaveBeenCalledWith('dm-1', 'recipient-1')
  })
})

describe('useThreadTyping', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    mockTypingService.getTypingUsersInRoom.mockReturnValue([])
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('should use thread room type', () => {
    const { result } = renderHook(() => useThreadTyping('channel-1', 'thread-1'))

    act(() => {
      result.current.startTyping()
    })

    expect(mockTypingService.startTypingInThread).toHaveBeenCalledWith('channel-1', 'thread-1')
  })
})
