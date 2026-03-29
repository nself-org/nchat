/**
 * Realtime Provider
 *
 * React context provider for the nself-plugins realtime integration.
 * Wraps the application to provide realtime connectivity, presence, typing, and room features.
 *
 * @module providers/realtime-provider
 * @version 1.0.0
 */

'use client'

import {
  createContext,
  useContext,
  useEffect,
  useCallback,
  useState,
  useMemo,
  ReactNode,
} from 'react'
import { useAuth } from '@/contexts/auth-context'
import {
  realtimeClient,
  RealtimeConnectionState,
  RealtimeError,
} from '@/services/realtime/realtime-client'
import {
  initializePresenceService,
  resetPresenceService,
  PresenceStatus,
  CustomStatus,
  UserPresence,
} from '@/services/realtime/presence.service'
import {
  initializeTypingService,
  resetTypingService,
  TypingUser,
} from '@/services/realtime/typing.service'
import { logger } from '@/lib/logger'
import {
  initializeRoomsService,
  resetRoomsService,
  Room,
  RoomMember,
  MessageEvent,
} from '@/services/realtime/rooms.service'

// ============================================================================
// Types
// ============================================================================

/**
 * Realtime context value
 */
export interface RealtimeContextValue {
  // Connection state
  isConnected: boolean
  isAuthenticated: boolean
  connectionState: RealtimeConnectionState
  error: RealtimeError | null
  reconnectAttempts: number
  socketId: string | undefined

  // Connection actions
  connect: () => Promise<void>
  disconnect: () => void
  reconnect: () => Promise<void>

  // Presence
  presenceStatus: PresenceStatus
  customStatus: CustomStatus | null
  setPresenceStatus: (status: PresenceStatus) => void
  setCustomStatus: (status: CustomStatus | null) => void
  subscribeToPresence: (userIds: string[]) => void
  unsubscribeFromPresence: (userIds: string[]) => void
  getPresence: (userId: string) => UserPresence | undefined

  // Typing
  startTyping: (roomName: string, threadId?: string) => void
  stopTyping: (roomName?: string, threadId?: string) => void
  handleTypingInput: (roomName: string, value: string, threadId?: string) => void
  getTypingUsers: (roomName: string, threadId?: string) => TypingUser[]
  getTypingText: (roomName: string, threadId?: string) => string | null

  // Rooms
  rooms: Room[]
  joinRoom: (roomName: string) => Promise<Room>
  leaveRoom: (roomName: string) => void
  sendMessage: (
    roomName: string,
    content: string,
    options?: { threadId?: string; replyTo?: string; metadata?: Record<string, unknown> }
  ) => Promise<{ messageId: string }>
  isInRoom: (roomName: string) => boolean
  getRoomMembers: (roomName: string) => RoomMember[]

  // Events
  on: <T = unknown>(event: string, callback: (data: T) => void) => () => void
  emit: <T = unknown>(event: string, data?: T) => void
  emitAsync: <T = unknown, R = unknown>(event: string, data?: T) => Promise<R>
}

/**
 * Realtime provider props
 */
export interface RealtimeProviderProps {
  children: ReactNode
  /** Auto-connect when user is authenticated */
  autoConnect?: boolean
  /** Enable presence features */
  enablePresence?: boolean
  /** Enable typing indicators */
  enableTyping?: boolean
  /** Enable debug logging */
  debug?: boolean
  /** Custom realtime server URL */
  serverUrl?: string
}

// ============================================================================
// Context
// ============================================================================

const RealtimeContext = createContext<RealtimeContextValue | undefined>(undefined)

// ============================================================================
// Provider
// ============================================================================

/**
 * Realtime Provider Component
 *
 * @example
 * ```tsx
 * function App() {
 *   return (
 *     <RealtimeProvider autoConnect enablePresence enableTyping>
 *       <Chat />
 *     </RealtimeProvider>
 *   );
 * }
 * ```
 */
export function RealtimeProvider({
  children,
  autoConnect = true,
  enablePresence = true,
  enableTyping = true,
  debug = false,
  serverUrl,
}: RealtimeProviderProps) {
  const { user } = useAuth()

  // Connection state
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('disconnected')
  const [error, setError] = useState<RealtimeError | null>(null)
  const [reconnectAttempts, setReconnectAttempts] = useState(0)

  // Presence state
  const [presenceStatus, setPresenceStatusState] = useState<PresenceStatus>('offline')
  const [customStatus, setCustomStatusState] = useState<CustomStatus | null>(null)

  // Rooms state
  const [rooms, setRooms] = useState<Room[]>([])

  // Service instances (memoized)
  const services = useMemo(() => {
    return {
      presence: enablePresence ? initializePresenceService({ debug }) : null,
      typing: enableTyping ? initializeTypingService({ debug }) : null,
      rooms: initializeRoomsService({ debug }),
    }
  }, [enablePresence, enableTyping, debug])

  // ============================================================================
  // Connection Management
  // ============================================================================

  const connect = useCallback(async () => {
    if (!user) {
      throw new Error('User must be authenticated')
    }

    try {
      setError(null)

      // Initialize client
      realtimeClient.initialize({
        url: serverUrl,
        debug,
      })

      // Connect with auth token
      const token = `user:${user.id}`
      await realtimeClient.connect(token)

      // Set initial presence status
      if (services.presence) {
        services.presence.setStatus('online')
        setPresenceStatusState('online')
      }

      if (debug) {
        // REMOVED: console.log('[RealtimeProvider] Connected successfully')
      }
    } catch (err) {
      const realtimeError: RealtimeError = {
        code: 'CONNECTION_FAILED',
        message: err instanceof Error ? err.message : 'Failed to connect',
      }
      setError(realtimeError)
      throw err
    }
  }, [user, serverUrl, debug, services.presence])

  const disconnect = useCallback(() => {
    // Set offline status before disconnecting
    if (services.presence) {
      services.presence.setStatus('offline')
    }

    // Reset services
    resetPresenceService()
    resetTypingService()
    resetRoomsService()

    // Disconnect client
    realtimeClient.disconnect()

    // Reset state
    setPresenceStatusState('offline')
    setRooms([])

    if (debug) {
      // REMOVED: console.log('[RealtimeProvider] Disconnected')
    }
  }, [debug, services.presence])

  const reconnect = useCallback(async () => {
    disconnect()
    await connect()
  }, [connect, disconnect])

  // ============================================================================
  // Presence
  // ============================================================================

  const setPresenceStatus = useCallback(
    (status: PresenceStatus) => {
      if (services.presence) {
        services.presence.setStatus(status)
        setPresenceStatusState(status)
      }
    },
    [services.presence]
  )

  const setCustomStatus = useCallback(
    (status: CustomStatus | null) => {
      if (services.presence) {
        services.presence.setCustomStatus(status)
        setCustomStatusState(status)
      }
    },
    [services.presence]
  )

  const subscribeToPresence = useCallback(
    (userIds: string[]) => {
      services.presence?.subscribeToUsers(userIds)
    },
    [services.presence]
  )

  const unsubscribeFromPresence = useCallback(
    (userIds: string[]) => {
      services.presence?.unsubscribeFromUsers(userIds)
    },
    [services.presence]
  )

  const getPresence = useCallback(
    (userId: string): UserPresence | undefined => {
      return services.presence?.getPresence(userId)
    },
    [services.presence]
  )

  // ============================================================================
  // Typing
  // ============================================================================

  const startTyping = useCallback(
    (roomName: string, threadId?: string) => {
      services.typing?.startTyping(roomName, threadId)
    },
    [services.typing]
  )

  const stopTyping = useCallback(
    (roomName?: string, threadId?: string) => {
      services.typing?.stopTyping(roomName, threadId)
    },
    [services.typing]
  )

  const handleTypingInput = useCallback(
    (roomName: string, value: string, threadId?: string) => {
      services.typing?.handleInputChange(roomName, value, threadId)
    },
    [services.typing]
  )

  const getTypingUsers = useCallback(
    (roomName: string, threadId?: string): TypingUser[] => {
      return services.typing?.getTypingUsers(roomName, threadId) || []
    },
    [services.typing]
  )

  const getTypingText = useCallback(
    (roomName: string, threadId?: string): string | null => {
      return services.typing?.getTypingText(roomName, threadId) || null
    },
    [services.typing]
  )

  // ============================================================================
  // Rooms
  // ============================================================================

  const joinRoom = useCallback(
    async (roomName: string): Promise<Room> => {
      const room = await services.rooms.joinRoom(roomName)
      setRooms(services.rooms.getJoinedRooms())
      return room
    },
    [services.rooms]
  )

  const leaveRoom = useCallback(
    (roomName: string) => {
      services.rooms.leaveRoom(roomName)
      setRooms(services.rooms.getJoinedRooms())
    },
    [services.rooms]
  )

  const sendMessage = useCallback(
    async (
      roomName: string,
      content: string,
      options?: { threadId?: string; replyTo?: string; metadata?: Record<string, unknown> }
    ) => {
      return services.rooms.sendMessage(roomName, content, options)
    },
    [services.rooms]
  )

  const isInRoom = useCallback(
    (roomName: string): boolean => {
      return services.rooms.isInRoom(roomName)
    },
    [services.rooms]
  )

  const getRoomMembers = useCallback(
    (roomName: string): RoomMember[] => {
      return services.rooms.getRoomMembers(roomName)
    },
    [services.rooms]
  )

  // ============================================================================
  // Events
  // ============================================================================

  const on = useCallback(<T = unknown,>(event: string, callback: (data: T) => void) => {
    return realtimeClient.on<T>(event, callback)
  }, [])

  const emit = useCallback(<T = unknown,>(event: string, data?: T) => {
    realtimeClient.emit(event, data)
  }, [])

  const emitAsync = useCallback(<T = unknown, R = unknown>(event: string, data?: T) => {
    return realtimeClient.emitAsync<T, R>(event, data)
  }, [])

  // ============================================================================
  // Effects
  // ============================================================================

  // Subscribe to connection state changes
  useEffect(() => {
    const unsub = realtimeClient.onConnectionStateChange((state) => {
      setConnectionState(state)
      setReconnectAttempts(realtimeClient.reconnectAttemptCount)
    })

    return unsub
  }, [])

  // Subscribe to errors
  useEffect(() => {
    const unsub = realtimeClient.onError((err) => {
      setError(err)
    })

    return unsub
  }, [])

  // Subscribe to room state changes
  useEffect(() => {
    const unsub = services.rooms.onRoomStateChange(() => {
      setRooms(services.rooms.getJoinedRooms())
    })

    return unsub
  }, [services.rooms])

  // Auto-connect when user is authenticated
  useEffect(() => {
    if (autoConnect && user && connectionState === 'disconnected') {
      connect().catch((err) => {
        if (debug) {
          logger.error('[RealtimeProvider] Auto-connect failed:', err)
        }
      })
    }
  }, [autoConnect, user, connectionState, connect, debug])

  // Disconnect on unmount or user logout
  useEffect(() => {
    return () => {
      if (realtimeClient.isConnected) {
        disconnect()
      }
    }
  }, [disconnect])

  // Set offline presence when tab becomes hidden
  useEffect(() => {
    if (typeof window === 'undefined') return

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab is hidden, set away status
        if (services.presence && presenceStatus === 'online') {
          services.presence.setStatus('away')
        }
      } else {
        // Tab is visible, restore online status
        if (services.presence && presenceStatus !== 'busy') {
          services.presence.setStatus('online')
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [services.presence, presenceStatus])

  // ============================================================================
  // Context Value
  // ============================================================================

  const value = useMemo<RealtimeContextValue>(
    () => ({
      // Connection
      isConnected: realtimeClient.isConnected,
      isAuthenticated: realtimeClient.isAuthenticated,
      connectionState,
      error,
      reconnectAttempts,
      socketId: realtimeClient.socketId,
      connect,
      disconnect,
      reconnect,

      // Presence
      presenceStatus,
      customStatus,
      setPresenceStatus,
      setCustomStatus,
      subscribeToPresence,
      unsubscribeFromPresence,
      getPresence,

      // Typing
      startTyping,
      stopTyping,
      handleTypingInput,
      getTypingUsers,
      getTypingText,

      // Rooms
      rooms,
      joinRoom,
      leaveRoom,
      sendMessage,
      isInRoom,
      getRoomMembers,

      // Events
      on,
      emit,
      emitAsync,
    }),
    [
      connectionState,
      error,
      reconnectAttempts,
      connect,
      disconnect,
      reconnect,
      presenceStatus,
      customStatus,
      setPresenceStatus,
      setCustomStatus,
      subscribeToPresence,
      unsubscribeFromPresence,
      getPresence,
      startTyping,
      stopTyping,
      handleTypingInput,
      getTypingUsers,
      getTypingText,
      rooms,
      joinRoom,
      leaveRoom,
      sendMessage,
      isInRoom,
      getRoomMembers,
      on,
      emit,
      emitAsync,
    ]
  )

  return <RealtimeContext.Provider value={value}>{children}</RealtimeContext.Provider>
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access the realtime context
 *
 * @throws Error if used outside of RealtimeProvider
 */
export function useRealtimeContext(): RealtimeContextValue {
  const context = useContext(RealtimeContext)

  if (context === undefined) {
    throw new Error('useRealtimeContext must be used within a RealtimeProvider')
  }

  return context
}

export default RealtimeProvider
