/**
 * Notification settings — desktop/mobile/email toggles, sound, DND, keywords.
 * Injectable NotificationSettingsAdapter replaces store/context deps.
 *
 * @module settings/notification-settings
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type {
  GlobalNotificationSettings,
  NotificationLevel,
  NotificationSound,
} from './types'
import { SettingsSectionCard, SettingsRow } from './settings-layout'

// ============================================================================
// Adapter
// ============================================================================

export interface NotificationSettingsAdapter {
  settings: GlobalNotificationSettings
  onUpdate: (patch: Partial<GlobalNotificationSettings>) => void | Promise<void>
  isSaving?: boolean
}

export interface NotificationSettingsProps {
  adapter: NotificationSettingsAdapter
  className?: string
}

// ============================================================================
// Toggle
// ============================================================================

function Toggle({
  id,
  checked,
  onChange,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-input'
      )}
    >
      <span
        className={cn(
          'pointer-events-none inline-block h-4 w-4 rounded-full bg-background shadow-lg transition-transform duration-200',
          checked ? 'translate-x-4' : 'translate-x-0'
        )}
      />
    </button>
  )
}

// ============================================================================
// Select helper
// ============================================================================

function SettingsSelect<T extends string>({
  id,
  value,
  onChange,
  options,
}: {
  id: string
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string }[]
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={cn(
        'rounded-md border bg-background px-2 py-1.5 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring'
      )}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

// ============================================================================
// Keyword editor
// ============================================================================

function KeywordEditor({
  keywords,
  onChange,
}: {
  keywords: string[]
  onChange: (kw: string[]) => void
}) {
  const [draft, setDraft] = React.useState('')

  const add = () => {
    const trimmed = draft.trim()
    if (!trimmed || keywords.includes(trimmed)) return
    onChange([...keywords, trimmed])
    setDraft('')
  }

  const remove = (kw: string) => {
    onChange(keywords.filter((k) => k !== kw))
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              add()
            }
          }}
          placeholder="Add keyword…"
          className={cn(
            'flex-1 rounded-md border bg-background px-3 py-1.5 text-sm',
            'placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'
          )}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className={cn(
            'rounded-md border px-3 py-1.5 text-sm',
            'hover:bg-accent transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          Add
        </button>
      </div>

      {keywords.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {keywords.map((kw) => (
            <span
              key={kw}
              className="flex items-center gap-1 rounded-full bg-accent px-2.5 py-0.5 text-xs"
            >
              {kw}
              <button
                type="button"
                onClick={() => remove(kw)}
                aria-label={`Remove "${kw}"`}
                className="ml-0.5 text-muted-foreground hover:text-foreground"
              >
                <svg viewBox="0 0 16 16" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Notification Settings
// ============================================================================

const LEVEL_OPTIONS: { value: NotificationLevel; label: string }[] = [
  { value: 'all', label: 'All messages' },
  { value: 'mentions', label: 'Mentions only' },
  { value: 'none', label: 'Nothing' },
]

const SOUND_OPTIONS: { value: NotificationSound; label: string }[] = [
  { value: 'default', label: 'Default' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'none', label: 'None' },
]

const EMAIL_DIGEST_OPTIONS: { value: GlobalNotificationSettings['emailDigest']; label: string }[] = [
  { value: 'realtime', label: 'Real-time' },
  { value: 'daily', label: 'Daily digest' },
  { value: 'weekly', label: 'Weekly digest' },
  { value: 'never', label: 'Never' },
]

export function NotificationSettings({ adapter, className }: NotificationSettingsProps) {
  const { settings, onUpdate } = adapter

  return (
    <div className={cn('space-y-6', className)}>
      {/* Channels */}
      <SettingsSectionCard title="Channels &amp; messages">
        <div className="space-y-4">
          <SettingsRow label="Default notification level" htmlFor="default-level">
            <SettingsSelect
              id="default-level"
              value={settings.defaultLevel}
              onChange={(defaultLevel) => onUpdate({ defaultLevel })}
              options={LEVEL_OPTIONS}
            />
          </SettingsRow>
        </div>
      </SettingsSectionCard>

      {/* Platform */}
      <SettingsSectionCard title="Platforms">
        <div className="space-y-4">
          <SettingsRow
            label="Desktop notifications"
            description="Show notifications on your computer."
            htmlFor="desktop-notif"
          >
            <Toggle
              id="desktop-notif"
              checked={settings.desktopNotifications}
              onChange={(desktopNotifications) => onUpdate({ desktopNotifications })}
            />
          </SettingsRow>

          <SettingsRow
            label="Mobile push notifications"
            description="Receive push notifications on your phone."
            htmlFor="mobile-notif"
          >
            <Toggle
              id="mobile-notif"
              checked={settings.mobileNotifications}
              onChange={(mobileNotifications) => onUpdate({ mobileNotifications })}
            />
          </SettingsRow>

          <SettingsRow
            label="Email notifications"
            description="Receive notifications via email when offline."
            htmlFor="email-notif"
          >
            <Toggle
              id="email-notif"
              checked={settings.emailNotifications}
              onChange={(emailNotifications) => onUpdate({ emailNotifications })}
            />
          </SettingsRow>

          {settings.emailNotifications && (
            <SettingsRow label="Email frequency" htmlFor="email-digest">
              <SettingsSelect
                id="email-digest"
                value={settings.emailDigest}
                onChange={(emailDigest) => onUpdate({ emailDigest })}
                options={EMAIL_DIGEST_OPTIONS}
              />
            </SettingsRow>
          )}
        </div>
      </SettingsSectionCard>

      {/* Sound */}
      <SettingsSectionCard title="Sound">
        <div className="space-y-4">
          <SettingsRow
            label="Mute all sounds"
            description="Silence all notification sounds."
            htmlFor="mute-sounds"
          >
            <Toggle
              id="mute-sounds"
              checked={settings.muteAllSounds}
              onChange={(muteAllSounds) => onUpdate({ muteAllSounds })}
            />
          </SettingsRow>

          {!settings.muteAllSounds && (
            <SettingsRow label="Notification sound" htmlFor="sound">
              <SettingsSelect
                id="sound"
                value={settings.sound}
                onChange={(sound) => onUpdate({ sound })}
                options={SOUND_OPTIONS}
              />
            </SettingsRow>
          )}
        </div>
      </SettingsSectionCard>

      {/* Mentions & keywords */}
      <SettingsSectionCard title="Mentions &amp; keywords">
        <div className="space-y-4">
          <SettingsRow
            label="Notify on mentions"
            description="Alert when someone @mentions you."
            htmlFor="notify-mention"
          >
            <Toggle
              id="notify-mention"
              checked={settings.notifyOnMention}
              onChange={(notifyOnMention) => onUpdate({ notifyOnMention })}
            />
          </SettingsRow>

          <SettingsRow
            label="Notify on keywords"
            description="Alert when a message contains your tracked keywords."
            htmlFor="notify-keyword"
          >
            <Toggle
              id="notify-keyword"
              checked={settings.notifyOnKeyword}
              onChange={(notifyOnKeyword) => onUpdate({ notifyOnKeyword })}
            />
          </SettingsRow>

          {settings.notifyOnKeyword && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Tracked keywords</p>
              <KeywordEditor
                keywords={settings.keywords}
                onChange={(keywords) => onUpdate({ keywords })}
              />
            </div>
          )}
        </div>
      </SettingsSectionCard>

      {/* Do not disturb */}
      <SettingsSectionCard title="Do not disturb">
        <div className="space-y-4">
          <SettingsRow
            label="Enable Do Not Disturb"
            description="Pause all notifications during the scheduled window."
            htmlFor="dnd-enabled"
          >
            <Toggle
              id="dnd-enabled"
              checked={settings.doNotDisturbEnabled}
              onChange={(doNotDisturbEnabled) => onUpdate({ doNotDisturbEnabled })}
            />
          </SettingsRow>

          {settings.doNotDisturbEnabled && (
            <div className="flex items-center gap-4">
              <div className="space-y-1">
                <label htmlFor="dnd-start" className="block text-xs text-muted-foreground">From</label>
                <input
                  id="dnd-start"
                  type="time"
                  value={settings.doNotDisturbStart ?? '22:00'}
                  onChange={(e) => onUpdate({ doNotDisturbStart: e.target.value })}
                  className={cn(
                    'rounded-md border bg-background px-2 py-1.5 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-ring'
                  )}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor="dnd-end" className="block text-xs text-muted-foreground">To</label>
                <input
                  id="dnd-end"
                  type="time"
                  value={settings.doNotDisturbEnd ?? '08:00'}
                  onChange={(e) => onUpdate({ doNotDisturbEnd: e.target.value })}
                  className={cn(
                    'rounded-md border bg-background px-2 py-1.5 text-sm',
                    'focus:outline-none focus:ring-2 focus:ring-ring'
                  )}
                />
              </div>
            </div>
          )}
        </div>
      </SettingsSectionCard>
    </div>
  )
}
