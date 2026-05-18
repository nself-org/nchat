/**
 * Privacy settings — online status, DMs, read receipts, typing indicator,
 * message search visibility.
 * Injectable PrivacySettingsAdapter replaces store/context deps.
 *
 * @module settings/privacy-settings
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { PrivacySettings as PrivacySettingsData } from './types'
import { SettingsSectionCard, SettingsRow } from './settings-layout'

// ============================================================================
// Adapter
// ============================================================================

export interface PrivacySettingsAdapter {
  settings: PrivacySettingsData
  onUpdate: (patch: Partial<PrivacySettingsData>) => void | Promise<void>
  isSaving?: boolean
}

export interface PrivacySettingsProps {
  adapter: PrivacySettingsAdapter
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
// Privacy Settings
// ============================================================================

const DM_OPTIONS: { value: PrivacySettingsData['allowDirectMessages']; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends only' },
  { value: 'nobody', label: 'Nobody' },
]

export function PrivacySettings({ adapter, className }: PrivacySettingsProps) {
  const { settings, onUpdate } = adapter

  return (
    <div className={cn('space-y-6', className)}>
      {/* Presence */}
      <SettingsSectionCard
        title="Presence &amp; visibility"
        description="Control what other members can see about you."
      >
        <div className="space-y-4">
          <SettingsRow
            label="Show online status"
            description="Others can see when you are online or away."
            htmlFor="show-online"
          >
            <Toggle
              id="show-online"
              checked={settings.showOnlineStatus}
              onChange={(showOnlineStatus) => onUpdate({ showOnlineStatus })}
            />
          </SettingsRow>

          <SettingsRow
            label="Show typing indicator"
            description="Others can see when you are typing a message."
            htmlFor="show-typing"
          >
            <Toggle
              id="show-typing"
              checked={settings.showTypingIndicator}
              onChange={(showTypingIndicator) => onUpdate({ showTypingIndicator })}
            />
          </SettingsRow>

          <SettingsRow
            label="Allow message search"
            description="Your messages can appear in workspace search results."
            htmlFor="allow-search"
          >
            <Toggle
              id="allow-search"
              checked={settings.allowMessageSearch}
              onChange={(allowMessageSearch) => onUpdate({ allowMessageSearch })}
            />
          </SettingsRow>
        </div>
      </SettingsSectionCard>

      {/* Read receipts */}
      <SettingsSectionCard title="Read receipts">
        <SettingsRow
          label="Send read receipts"
          description="Let senders know when you have read their messages."
          htmlFor="read-receipts"
        >
          <Toggle
            id="read-receipts"
            checked={settings.showReadReceipts}
            onChange={(showReadReceipts) => onUpdate({ showReadReceipts })}
          />
        </SettingsRow>
      </SettingsSectionCard>

      {/* Direct messages */}
      <SettingsSectionCard title="Direct messages">
        <SettingsRow label="Who can message you" htmlFor="allow-dm">
          <select
            id="allow-dm"
            value={settings.allowDirectMessages}
            onChange={(e) =>
              onUpdate({
                allowDirectMessages: e.target.value as PrivacySettingsData['allowDirectMessages'],
              })
            }
            className={cn(
              'rounded-md border bg-background px-2 py-1.5 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
          >
            {DM_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </SettingsRow>
      </SettingsSectionCard>
    </div>
  )
}
