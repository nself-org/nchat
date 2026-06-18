/**
 * Purpose:    Form-state hook for the meeting scheduler, ported from the legacy schedule page
 *             FormState. Holds every scheduling field (basic info, recurrence, participants,
 *             reminders, privacy, A/V, features), exposes a typed updater, validation, and a
 *             builder that produces the CreateMeetingInput sent to the createMeeting Action.
 * Inputs:     none.
 * Outputs:    { form, update, errors, setErrors, validate, buildInput }.
 * Constraints:Pure client state (canonical §6) — no fetching. Validation mirrors the legacy
 *             validateMeetingInput rules (title required, end after start).
 * SOT:        F-NCHAT-VITE-MEETINGS-FORM-01
 */
import { useCallback, useState } from 'react'
import { getNextAvailableSlot, toTimeString } from './format'
import type {
  CreateMeetingInput,
  RecurrencePattern,
  ReminderTiming,
  RoomType,
} from './types'

export interface MeetingFormState {
  title: string
  description: string
  roomType: RoomType
  date: string // yyyy-mm-dd
  startTime: string // HH:MM
  duration: number // minutes
  timezone: string
  isPrivate: boolean
  password: string
  isRecurring: boolean
  recurrencePattern: RecurrencePattern
  recurrenceInterval: number
  participantIds: string[]
  reminderTimings: ReminderTiming[]
  muteOnJoin: boolean
  videoOffOnJoin: boolean
  allowScreenShare: boolean
  waitingRoom: boolean
  enableChat: boolean
}

function initialState(): MeetingFormState {
  const slot = getNextAvailableSlot()
  const yyyy = slot.getFullYear()
  const mm = String(slot.getMonth() + 1).padStart(2, '0')
  const dd = String(slot.getDate()).padStart(2, '0')
  return {
    title: '',
    description: '',
    roomType: 'video',
    date: `${yyyy}-${mm}-${dd}`,
    startTime: toTimeString(slot),
    duration: 60,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isPrivate: false,
    password: '',
    isRecurring: false,
    recurrencePattern: 'weekly',
    recurrenceInterval: 1,
    participantIds: [],
    reminderTimings: ['15min'],
    muteOnJoin: true,
    videoOffOnJoin: false,
    allowScreenShare: true,
    waitingRoom: false,
    enableChat: true,
  }
}

export function useMeetingForm() {
  const [form, setForm] = useState<MeetingFormState>(initialState)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const update = useCallback(
    <K extends keyof MeetingFormState>(key: K, value: MeetingFormState[K]) => {
      setForm((prev) => ({ ...prev, [key]: value }))
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    },
    [],
  )

  const buildStartEnd = useCallback((): { start: Date; end: Date } => {
    const [h, m] = form.startTime.split(':').map(Number)
    const start = new Date(form.date)
    start.setHours(h ?? 0, m ?? 0, 0, 0)
    const end = new Date(start.getTime() + form.duration * 60_000)
    return { start, end }
  }, [form.date, form.startTime, form.duration])

  const validate = useCallback((): boolean => {
    const next: Record<string, string> = {}
    if (!form.title.trim()) next.title = 'Meeting title is required'
    const { start, end } = buildStartEnd()
    if (end <= start) next.startTime = 'End time must be after start time'
    setErrors(next)
    return Object.keys(next).length === 0
  }, [form.title, buildStartEnd])

  const buildInput = useCallback((): CreateMeetingInput => {
    const { start, end } = buildStartEnd()
    return {
      title: form.title.trim(),
      description: form.description || undefined,
      room_type: form.roomType,
      scheduled_start_at: start.toISOString(),
      scheduled_end_at: end.toISOString(),
      timezone: form.timezone,
      is_private: form.isPrivate,
      password: form.password || undefined,
      is_recurring: form.isRecurring,
      recurrence_pattern: form.isRecurring ? form.recurrencePattern : undefined,
      recurrence_interval: form.isRecurring ? form.recurrenceInterval : undefined,
      participant_ids: form.participantIds,
      reminder_timings: form.reminderTimings,
      mute_on_join: form.muteOnJoin,
      video_off_on_join: form.videoOffOnJoin,
      allow_screen_share: form.allowScreenShare,
      waiting_room: form.waitingRoom,
      enable_chat: form.enableChat,
    }
  }, [form, buildStartEnd])

  return { form, update, errors, setErrors, validate, buildInput }
}
