/**
 * i18n / region settings — locale, timezone, time format, date format,
 * first day of week, spellcheck.
 * Injectable I18nSettingsAdapter replaces store/context deps.
 *
 * @module settings/i18n-settings
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { I18nSettings as I18nSettingsData, LocaleInfo } from './types'
import { SettingsSectionCard, SettingsRow } from './settings-layout'

// ============================================================================
// Adapter
// ============================================================================

export interface I18nSettingsAdapter {
  settings: I18nSettingsData
  /** Available locales */
  locales?: LocaleInfo[]
  /** Available timezones */
  timezones?: string[]
  onUpdate: (patch: Partial<I18nSettingsData>) => void | Promise<void>
  isSaving?: boolean
}

export interface I18nSettingsProps {
  adapter: I18nSettingsAdapter
  className?: string
}

// ============================================================================
// Select helper
// ============================================================================

function SettingsSelect<T extends string | number>({
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
      value={String(value)}
      onChange={(e) => {
        const raw = e.target.value
        // coerce back to T — if original type is number, parse it
        const coerced = typeof value === 'number' ? (Number(raw) as unknown as T) : (raw as T)
        onChange(coerced)
      }}
      className={cn(
        'rounded-md border bg-background px-2 py-1.5 text-sm',
        'focus:outline-none focus:ring-2 focus:ring-ring'
      )}
    >
      {options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
      ))}
    </select>
  )
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
// I18n Settings
// ============================================================================

const TIME_FORMAT_OPTIONS: { value: I18nSettingsData['timeFormat']; label: string }[] = [
  { value: 12, label: '12-hour (2:30 PM)' },
  { value: 24, label: '24-hour (14:30)' },
]

const DATE_FORMAT_OPTIONS: { value: I18nSettingsData['dateFormat']; label: string }[] = [
  { value: 'MDY', label: 'MM/DD/YYYY' },
  { value: 'DMY', label: 'DD/MM/YYYY' },
  { value: 'YMD', label: 'YYYY-MM-DD' },
]

const FIRST_DAY_OPTIONS: { value: I18nSettingsData['firstDayOfWeek']; label: string }[] = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 6, label: 'Saturday' },
]

export function I18nSettings({ adapter, className }: I18nSettingsProps) {
  const { settings, onUpdate, locales, timezones } = adapter

  return (
    <div className={cn('space-y-6', className)}>
      {/* Language */}
      {locales && locales.length > 0 && (
        <SettingsSectionCard title="Language" description="Select the language used throughout the interface.">
          <SettingsRow label="Interface language" htmlFor="locale">
            <select
              id="locale"
              value={settings.locale}
              onChange={(e) => onUpdate({ locale: e.target.value })}
              className={cn(
                'rounded-md border bg-background px-2 py-1.5 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            >
              {locales.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.nativeName} ({l.name})
                </option>
              ))}
            </select>
          </SettingsRow>
        </SettingsSectionCard>
      )}

      {/* Timezone */}
      {timezones && timezones.length > 0 && (
        <SettingsSectionCard title="Timezone" description="Used for timestamps, Do Not Disturb schedules, and calendar features.">
          <SettingsRow label="Timezone" htmlFor="timezone">
            <select
              id="timezone"
              value={settings.timezone}
              onChange={(e) => onUpdate({ timezone: e.target.value })}
              className={cn(
                'rounded-md border bg-background px-2 py-1.5 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring'
              )}
            >
              {timezones.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
          </SettingsRow>
        </SettingsSectionCard>
      )}

      {/* Formats */}
      <SettingsSectionCard title="Date &amp; time formats">
        <div className="space-y-4">
          <SettingsRow label="Time format" htmlFor="time-format">
            <SettingsSelect
              id="time-format"
              value={settings.timeFormat}
              onChange={(timeFormat) => onUpdate({ timeFormat })}
              options={TIME_FORMAT_OPTIONS}
            />
          </SettingsRow>

          <SettingsRow label="Date format" htmlFor="date-format">
            <SettingsSelect
              id="date-format"
              value={settings.dateFormat}
              onChange={(dateFormat) => onUpdate({ dateFormat })}
              options={DATE_FORMAT_OPTIONS}
            />
          </SettingsRow>

          <SettingsRow label="First day of week" htmlFor="first-day">
            <SettingsSelect
              id="first-day"
              value={settings.firstDayOfWeek}
              onChange={(firstDayOfWeek) => onUpdate({ firstDayOfWeek })}
              options={FIRST_DAY_OPTIONS}
            />
          </SettingsRow>
        </div>
      </SettingsSectionCard>

      {/* Editor */}
      <SettingsSectionCard title="Text input">
        <SettingsRow
          label="Spellcheck"
          description="Underline misspelled words while typing."
          htmlFor="spellcheck"
        >
          <Toggle
            id="spellcheck"
            checked={settings.spellcheck}
            onChange={(spellcheck) => onUpdate({ spellcheck })}
          />
        </SettingsRow>
      </SettingsSectionCard>
    </div>
  )
}
