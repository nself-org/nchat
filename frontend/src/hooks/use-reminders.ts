/**
 * useReminders Hook
 *
 * Provides reminder management functionality including:
 * - Fetch reminders with filtering
 * - Create, update, delete reminders
 * - Snooze, complete, dismiss actions
 * - Real-time updates via subscriptions
 *
 * @module hooks/use-reminders
 * @version 1.0.0
 */

'use client'

import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { logger } from '@/lib/logger'

// ============================================================================
// Types
// ============================================================================

export type ReminderStatus = 'pending' | 'completed' | 'dismissed' | 'snoozed'
export type ReminderType = 'message' | 'custom' | 'followup'

export interface RecurrenceRule {
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'
  interval: number
  daysOfWeek?: number[]
  dayOfMonth?: number
  endDate?: string
  count?: number
}

export interface Reminder {
  id: string
  user_id: string
  message_id: string | null
  channel_id: string | null
  channel?: {
    id: string
    name: string
  } | null
  content: string
  note: string | null
  remind_at: string
  timezone: string
  status: ReminderStatus
  type: ReminderType
  is_recurring: boolean
  recurrence_rule: RecurrenceRule | null
  snooze_count: number
  snoozed_until: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface CreateReminderInput {
  messageId?: string
  channelId?: string
  content: string
  note?: string
  remindAt: string
  timezone: string
  type?: ReminderType
  isRecurring?: boolean
  recurrenceRule?: RecurrenceRule
}

export interface UpdateReminderInput {
  content?: string
  note?: string
  remindAt?: string
  timezone?: string
  isRecurring?: boolean
  recurrenceRule?: RecurrenceRule
}

export interface ReminderFilters {
  status?: ReminderStatus
  channelId?: string
  type?: ReminderType
  limit?: number
  offset?: number
}

export interface UseRemindersOptions {
  /** Auto-fetch reminders on mount */
  autoFetch?: boolean
  /** Initial filters */
  initialFilters?: ReminderFilters
  /** Callback when reminders change */
  onChange?: (reminders: Reminder[]) => void
}

export interface UseRemindersReturn {
  reminders: Reminder[]
  total: number
  isLoading: boolean
  error: string | null
  filters: ReminderFilters

  // Actions
  fetchReminders: (filters?: ReminderFilters) => Promise<void>
  createReminder: (input: CreateReminderInput) => Promise<Reminder | null>
  updateReminder: (id: string, input: UpdateReminderInput) => Promise<Reminder | null>
  deleteReminder: (id: string) => Promise<boolean>

  // Quick actions
  completeReminder: (id: string) => Promise<boolean>
  dismissReminder: (id: string) => Promise<boolean>
  snoozeReminder: (id: string, duration: number) => Promise<boolean>
  unsnoozeReminder: (id: string) => Promise<boolean>

  // Pagination
  loadMore: () => Promise<void>
  hasMore: boolean
  setFilters: (filters: ReminderFilters) => void
}

// ============================================================================
// Snooze Durations (in milliseconds)
// ============================================================================

export const SNOOZE_DURATIONS = {
  '15_minutes': 15 * 60 * 1000,
  '30_minutes': 30 * 60 * 1000,
  '1_hour': 60 * 60 * 1000,
  '2_hours': 2 * 60 * 60 * 1000,
  '4_hours': 4 * 60 * 60 * 1000,
  'tomorrow_9am': 0, // Calculated dynamically
  'next_week': 7 * 24 * 60 * 60 * 1000,
} as const

export function calculateSnoozeDuration(type: keyof typeof SNOOZE_DURATIONS): number {
  if (type === 'tomorrow_9am') {
    const now = new Date()
    const tomorrow = new Date(now)
    tomorrow.setDate(tomorrow.getDate() + 1)
    tomorrow.setHours(9, 0, 0, 0)
    return tomorrow.getTime() - now.getTime()
  }
  return SNOOZE_DURATIONS[type]
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useReminders(options: UseRemindersOptions = {}): UseRemindersReturn {
  const { autoFetch = true, initialFilters = {}, onChange } = options
  const { user, isAuthenticated } = useAuth()

  const [reminders, setReminders] = useState<Reminder[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<ReminderFilters>({
    limit: 50,
    offset: 0,
    ...initialFilters,
  })

  // ============================================================================
  // Fetch Reminders
  // ============================================================================

  const fetchReminders = useCallback(
    async (newFilters?: ReminderFilters) => {
      if (!isAuthenticated || !user?.id) {
        return
      }

      const currentFilters = newFilters || filters
      setIsLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (currentFilters.status) params.set('status', currentFilters.status)
        if (currentFilters.channelId) params.set('channelId', currentFilters.channelId)
        if (currentFilters.type) params.set('type', currentFilters.type)
        if (currentFilters.limit) params.set('limit', String(currentFilters.limit))
        if (currentFilters.offset) params.set('offset', String(currentFilters.offset))

        const response = await fetch(`/api/reminders?${params.toString()}`)

        if (!response.ok) {
          throw new Error('Failed to fetch reminders')
        }

        const data = await response.json()

        if (data.success) {
          const fetchedReminders = data.data?.reminders || []
          const fetchedTotal = data.data?.total || 0

          if (currentFilters.offset && currentFilters.offset > 0) {
            // Append for pagination
            setReminders((prev) => [...prev, ...fetchedReminders])
          } else {
            setReminders(fetchedReminders)
          }
          setTotal(fetchedTotal)
          onChange?.(fetchedReminders)
        } else {
          throw new Error(data.error || 'Failed to fetch reminders')
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to fetch reminders'
        setError(errorMessage)
        logger.error('Failed to fetch reminders:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id, filters, onChange]
  )

  // ============================================================================
  // Create Reminder
  // ============================================================================

  const createReminder = useCallback(
    async (input: CreateReminderInput): Promise<Reminder | null> => {
      if (!isAuthenticated || !user?.id) {
        setError('Not authenticated')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(input),
        })

        if (!response.ok) {
          throw new Error('Failed to create reminder')
        }

        const data = await response.json()

        if (data.success && data.data?.reminder) {
          const newReminder = data.data.reminder
          setReminders((prev) => [newReminder, ...prev])
          setTotal((prev) => prev + 1)
          return newReminder
        }

        throw new Error(data.error || 'Failed to create reminder')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create reminder'
        setError(errorMessage)
        logger.error('Failed to create reminder:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id]
  )

  // ============================================================================
  // Update Reminder
  // ============================================================================

  const updateReminder = useCallback(
    async (id: string, input: UpdateReminderInput): Promise<Reminder | null> => {
      if (!isAuthenticated || !user?.id) {
        setError('Not authenticated')
        return null
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/reminders', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, ...input }),
        })

        if (!response.ok) {
          throw new Error('Failed to update reminder')
        }

        const data = await response.json()

        if (data.success && data.data?.reminder) {
          const updatedReminder = data.data.reminder
          setReminders((prev) =>
            prev.map((r) => (r.id === id ? updatedReminder : r))
          )
          return updatedReminder
        }

        throw new Error(data.error || 'Failed to update reminder')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to update reminder'
        setError(errorMessage)
        logger.error('Failed to update reminder:', err)
        return null
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id]
  )

  // ============================================================================
  // Delete Reminder
  // ============================================================================

  const deleteReminder = useCallback(
    async (id: string): Promise<boolean> => {
      if (!isAuthenticated || !user?.id) {
        setError('Not authenticated')
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`/api/reminders?id=${id}`, {
          method: 'DELETE',
        })

        if (!response.ok) {
          throw new Error('Failed to delete reminder')
        }

        const data = await response.json()

        if (data.success) {
          setReminders((prev) => prev.filter((r) => r.id !== id))
          setTotal((prev) => Math.max(0, prev - 1))
          return true
        }

        throw new Error(data.error || 'Failed to delete reminder')
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to delete reminder'
        setError(errorMessage)
        logger.error('Failed to delete reminder:', err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id]
  )

  // ============================================================================
  // Quick Actions
  // ============================================================================

  const performAction = useCallback(
    async (
      action: 'complete' | 'dismiss' | 'snooze' | 'unsnooze',
      id: string,
      snoozeDuration?: number
    ): Promise<boolean> => {
      if (!isAuthenticated || !user?.id) {
        setError('Not authenticated')
        return false
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch('/api/reminders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            id,
            snoozeDuration,
          }),
        })

        if (!response.ok) {
          throw new Error(`Failed to ${action} reminder`)
        }

        const data = await response.json()

        if (data.success && data.data?.reminder) {
          const updatedReminder = data.data.reminder
          setReminders((prev) =>
            prev.map((r) =>
              r.id === id ? { ...r, ...updatedReminder } : r
            )
          )
          return true
        }

        throw new Error(data.error || `Failed to ${action} reminder`)
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : `Failed to ${action} reminder`
        setError(errorMessage)
        logger.error(`Failed to ${action} reminder:`, err)
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [isAuthenticated, user?.id]
  )

  const completeReminder = useCallback(
    (id: string) => performAction('complete', id),
    [performAction]
  )

  const dismissReminder = useCallback(
    (id: string) => performAction('dismiss', id),
    [performAction]
  )

  const snoozeReminder = useCallback(
    (id: string, duration: number) => performAction('snooze', id, duration),
    [performAction]
  )

  const unsnoozeReminder = useCallback(
    (id: string) => performAction('unsnooze', id),
    [performAction]
  )

  // ============================================================================
  // Pagination
  // ============================================================================

  const hasMore = reminders.length < total

  const loadMore = useCallback(async () => {
    if (isLoading || !hasMore) return

    const newOffset = (filters.offset || 0) + (filters.limit || 50)
    const newFilters = { ...filters, offset: newOffset }
    setFilters(newFilters)
    await fetchReminders(newFilters)
  }, [isLoading, hasMore, filters, fetchReminders])

  const updateFilters = useCallback(
    (newFilters: ReminderFilters) => {
      const updatedFilters = { ...filters, ...newFilters, offset: 0 }
      setFilters(updatedFilters)
      fetchReminders(updatedFilters)
    },
    [filters, fetchReminders]
  )

  // ============================================================================
  // Auto-fetch on mount
  // ============================================================================

  useEffect(() => {
    if (autoFetch && isAuthenticated && user?.id) {
      fetchReminders()
    }
  }, [autoFetch, isAuthenticated, user?.id]) // Intentionally not including fetchReminders to avoid infinite loop

  return {
    reminders,
    total,
    isLoading,
    error,
    filters,
    fetchReminders,
    createReminder,
    updateReminder,
    deleteReminder,
    completeReminder,
    dismissReminder,
    snoozeReminder,
    unsnoozeReminder,
    loadMore,
    hasMore,
    setFilters: updateFilters,
  }
}

export default useReminders
