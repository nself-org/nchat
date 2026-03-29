/**
 * useRealtimeRooms Hook
 *
 * Hook for managing room (channel, DM, thread) membership with the nself-plugins realtime server.
 * Provides room join/leave, message handling, and member tracking.
 *
 * @module hooks/use-realtime-rooms
 * @version 1.0.0
 */

'use client'

import { useEffect, useState, useCallback, useMemo, useRef } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { getRoomsService, Room, RoomMember, MessageEvent } from '@/services/realtime/rooms.service'
import { realtimeClient } from '@/services/realtime/realtime-client'

import { logger } from '@/lib/logger'

// ============================================================================
// Types
// ============================================================================

/**
 * Rooms hook options
 */
export interface UseRealtimeRoomsOptions {
  /** Initial rooms to join */
  initialRooms?: string[]
  /** Auto-join rooms on mount */
  autoJoin?: boolean
  /** Auto-rejoin rooms on reconnection */
  autoRejoinOnReconnect?: boolean
}

/**
 * Rooms hook return value
 */
export interface UseRealtimeRoomsReturn {
  /** Currently joined rooms */
  rooms: Room[]
  /** Currently joined room names */
  roomNames: string[]
  /** Room count */
  roomCount: number
  /** Join a room */
  joinRoom: (roomName: string) => Promise<Room>
  /** Join multiple rooms */
  joinRooms: (roomNames: string[]) => Promise<Map<string, Room>>
  /** Leave a room */
  leaveRoom: (roomName: string) => void
  /** Leave multiple rooms */
  leaveRooms: (roomNames: string[]) => void
  /** Leave all rooms */
  leaveAllRooms: () => void
  /** Check if in a room */
  isInRoom: (roomName: string) => boolean
  /** Get room by name */
  getRoom: (roomName: string) => Room | undefined
  /** Get room members */
  getRoomMembers: (roomName: string) => RoomMember[]
  /** Send a message to a room */
  sendMessage: (
    roomName: string,
    content: string,
    options?: SendMessageOptions
  ) => Promise<{ messageId: string }>
  /** Subscribe to messages in a room */
  onRoomMessage: (roomName: string, callback: (message: MessageEvent) => void) => () => void
  /** Subscribe to all messages */
  onMessage: (callback: (message: MessageEvent) => void) => () => void
  /** Subscribe to user joins */
  onUserJoin: (callback: (roomName: string, member: RoomMember) => void) => () => void
  /** Subscribe to user leaves */
  onUserLeave: (callback: (roomName: string, userId: string) => void) => () => void
}

/**
 * Send message options
 */
export interface SendMessageOptions {
  threadId?: string
  replyTo?: string
  metadata?: Record<string, unknown>
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Hook for managing room membership
 *
 * @example
 * ```tsx
 * function Chat() {
 *   const {
 *     rooms,
 *     joinRoom,
 *     leaveRoom,
 *     sendMessage,
 *     onRoomMessage,
 *   } = useRealtimeRooms({ initialRooms: ['general'] });
 *
 *   const [messages, setMessages] = useState<MessageEvent[]>([]);
 *
 *   useEffect(() => {
 *     const unsub = onRoomMessage('general', (message) => {
 *       setMessages((prev) => [...prev, message]);
 *     });
 *
 *     return unsub;
 *   }, [onRoomMessage]);
 *
 *   const handleSend = async (content: string) => {
 *     await sendMessage('general', content);
 *   };
 *
 *   return (
 *     <div>
 *       <div>Rooms: {rooms.map((r) => r.name).join(', ')}</div>
 *       <div>
 *         {messages.map((m) => (
 *           <div key={m.messageId}>{m.content}</div>
 *         ))}
 *       </div>
 *     </div>
 *   );
 * }
 * ```
 */
export function useRealtimeRooms(options: UseRealtimeRoomsOptions = {}): UseRealtimeRoomsReturn {
  const { initialRooms = [], autoJoin = true, autoRejoinOnReconnect = true } = options

  const { user } = useAuth()

  // State
  const [rooms, setRooms] = useState<Room[]>([])

  // Refs
  const initialJoinedRef = useRef(false)

  // Get service instance
  const roomsService = useMemo(() => {
    return getRoomsService({ autoRejoinOnReconnect })
  }, [autoRejoinOnReconnect])

  // ============================================================================
  // Room Management
  // ============================================================================

  /**
   * Join a room
   */
  const joinRoom = useCallback(
    async (roomName: string): Promise<Room> => {
      const room = await roomsService.joinRoom(roomName)
      setRooms(roomsService.getJoinedRooms())
      return room
    },
    [roomsService]
  )

  /**
   * Join multiple rooms
   */
  const joinRooms = useCallback(
    async (roomNames: string[]): Promise<Map<string, Room>> => {
      const result = await roomsService.joinRooms(roomNames)
      setRooms(roomsService.getJoinedRooms())
      return result
    },
    [roomsService]
  )

  /**
   * Leave a room
   */
  const leaveRoom = useCallback(
    (roomName: string): void => {
      roomsService.leaveRoom(roomName)
      setRooms(roomsService.getJoinedRooms())
    },
    [roomsService]
  )

  /**
   * Leave multiple rooms
   */
  const leaveRooms = useCallback(
    (roomNames: string[]): void => {
      roomsService.leaveRooms(roomNames)
      setRooms(roomsService.getJoinedRooms())
    },
    [roomsService]
  )

  /**
   * Leave all rooms
   */
  const leaveAllRooms = useCallback((): void => {
    roomsService.leaveAllRooms()
    setRooms([])
  }, [roomsService])

  /**
   * Check if in a room
   */
  const isInRoom = useCallback(
    (roomName: string): boolean => {
      return roomsService.isInRoom(roomName)
    },
    [roomsService]
  )

  /**
   * Get room by name
   */
  const getRoom = useCallback(
    (roomName: string): Room | undefined => {
      return roomsService.getRoom(roomName)
    },
    [roomsService]
  )

  /**
   * Get room members
   */
  const getRoomMembers = useCallback(
    (roomName: string): RoomMember[] => {
      return roomsService.getRoomMembers(roomName)
    },
    [roomsService]
  )

  // ============================================================================
  // Messaging
  // ============================================================================

  /**
   * Send a message to a room
   */
  const sendMessage = useCallback(
    async (
      roomName: string,
      content: string,
      options?: SendMessageOptions
    ): Promise<{ messageId: string }> => {
      return roomsService.sendMessage(roomName, content, options)
    },
    [roomsService]
  )

  // ============================================================================
  // Event Subscriptions
  // ============================================================================

  /**
   * Subscribe to messages in a specific room
   */
  const onRoomMessage = useCallback(
    (roomName: string, callback: (message: MessageEvent) => void): (() => void) => {
      return roomsService.onRoomMessage(roomName, callback)
    },
    [roomsService]
  )

  /**
   * Subscribe to all messages
   */
  const onMessage = useCallback(
    (callback: (message: MessageEvent) => void): (() => void) => {
      return roomsService.onMessage(callback)
    },
    [roomsService]
  )

  /**
   * Subscribe to user joins
   */
  const onUserJoin = useCallback(
    (callback: (roomName: string, member: RoomMember) => void): (() => void) => {
      return roomsService.onUserJoin(callback)
    },
    [roomsService]
  )

  /**
   * Subscribe to user leaves
   */
  const onUserLeave = useCallback(
    (callback: (roomName: string, userId: string) => void): (() => void) => {
      return roomsService.onUserLeave(callback)
    },
    [roomsService]
  )

  // ============================================================================
  // Computed Values
  // ============================================================================

  const roomNames = useMemo(() => rooms.map((r) => r.name), [rooms])
  const roomCount = rooms.length

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Subscribe to room state changes
   */
  useEffect(() => {
    const unsub = roomsService.onRoomStateChange(() => {
      setRooms(roomsService.getJoinedRooms())
    })

    return unsub
  }, [roomsService])

  /**
   * Auto-join initial rooms
   */
  useEffect(() => {
    if (
      autoJoin &&
      initialRooms.length > 0 &&
      realtimeClient.isConnected &&
      user &&
      !initialJoinedRef.current
    ) {
      initialJoinedRef.current = true
      joinRooms(initialRooms).catch((err) => {
        logger.error('[useRealtimeRooms] Failed to join initial rooms:', err)
      })
    }
  }, [autoJoin, initialRooms, user, joinRooms])

  /**
   * Sync state from service on connection
   */
  useEffect(() => {
    const unsub = realtimeClient.onConnectionStateChange((state) => {
      if (state === 'connected' || state === 'authenticated') {
        setRooms(roomsService.getJoinedRooms())
      }
    })

    return unsub
  }, [roomsService])

  /**
   * Leave all rooms on unmount
   */
  useEffect(() => {
    return () => {
      // Note: We don't leave rooms on unmount by default
      // as the user may navigate between pages
      // Use leaveAllRooms() explicitly when needed
    }
  }, [])

  // ============================================================================
  // Return
  // ============================================================================

  return {
    rooms,
    roomNames,
    roomCount,
    joinRoom,
    joinRooms,
    leaveRoom,
    leaveRooms,
    leaveAllRooms,
    isInRoom,
    getRoom,
    getRoomMembers,
    sendMessage,
    onRoomMessage,
    onMessage,
    onUserJoin,
    onUserLeave,
  }
}

// ============================================================================
// Utility Hooks
// ============================================================================

/**
 * Hook for a single room
 */
export function useRealtimeRoom(roomName: string) {
  const { joinRoom, leaveRoom, isInRoom, getRoom, getRoomMembers, sendMessage, onRoomMessage } =
    useRealtimeRooms({ initialRooms: [roomName] })

  const [messages, setMessages] = useState<MessageEvent[]>([])
  const [members, setMembers] = useState<RoomMember[]>([])

  // Subscribe to messages
  useEffect(() => {
    const unsub = onRoomMessage(roomName, (message) => {
      setMessages((prev) => [...prev, message])
    })

    return unsub
  }, [roomName, onRoomMessage])

  // Get initial members
  useEffect(() => {
    if (isInRoom(roomName)) {
      setMembers(getRoomMembers(roomName))
    }
  }, [roomName, isInRoom, getRoomMembers])

  // Send message helper
  const send = useCallback(
    async (content: string, options?: SendMessageOptions) => {
      return sendMessage(roomName, content, options)
    },
    [roomName, sendMessage]
  )

  // Leave room helper
  const leave = useCallback(() => {
    leaveRoom(roomName)
  }, [roomName, leaveRoom])

  return {
    room: getRoom(roomName),
    isJoined: isInRoom(roomName),
    messages,
    members,
    send,
    leave,
    clearMessages: () => setMessages([]),
  }
}

export default useRealtimeRooms
