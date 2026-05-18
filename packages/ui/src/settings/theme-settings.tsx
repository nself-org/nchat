/**
 * Theme settings — display mode, accent colour, font size, compact mode,
 * message grouping, avatars, animations.
 * Injectable ThemeSettingsAdapter replaces store/context deps.
 *
 * @module settings/theme-settings
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { ThemeMode, ThemeAccent, ThemeSettings as ThemeSettingsData } from './types'
import { SettingsSectionCard, SettingsRow } from './settings-layout'

// ============================================================================
// Adapter
// ============================================================================

export interface ThemeSettingsAdapter {
  theme: ThemeSettingsData
  onUpdate: (patch: Partial<ThemeSettingsData>) => void | Promise<void>
  isSaving?: boolean
}

export interface ThemeSettingsProps {
  adapter: ThemeSettingsAdapter
  className?: string
}

// ============================================================================
// Inline icons
// ============================================================================

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v1M8 14v1M1 8h1M14 8h1M3.22 3.22l.71.71M12.07 12.07l.71.71M3.22 12.78l.71-.71M12.07 3.93l.71-.71" />
    </svg>
  )
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 10A6 6 0 0 1 6 4a6 6 0 0 0 6 6z" />
    </svg>
  )
}

function MonitorIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="2" width="14" height="10" rx="1.5" />
      <path d="M5 14h6M8 12v2" />
    </svg>
  )
}

// ============================================================================
// Mode selector
// ============================================================================

const MODES: { value: ThemeMode; label: string; icon: React.ReactNode }[] = [
  { value: 'light', label: 'Light', icon: <SunIcon /> },
  { value: 'dark', label: 'Dark', icon: <MoonIcon /> },
  { value: 'system', label: 'System', icon: <MonitorIcon /> },
]

function ModeSelector({
  value,
  onChange,
}: {
  value: ThemeMode
  onChange: (v: ThemeMode) => void
}) {
  return (
    <div className="flex gap-2">
      {MODES.map((m) => (
        <button
          key={m.value}
          type="button"
          onClick={() => onChange(m.value)}
          className={cn(
            'flex flex-col items-center gap-1.5 rounded-lg border px-4 py-3 text-xs transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === m.value
              ? 'border-primary bg-primary/10 text-primary font-medium'
              : 'border-border hover:bg-accent text-muted-foreground hover:text-foreground'
          )}
        >
          {m.icon}
          {m.label}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Accent selector
// ============================================================================

const ACCENTS: { value: ThemeAccent; label: string; color: string }[] = [
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'green', label: 'Green', color: '#22c55e' },
  { value: 'violet', label: 'Violet', color: '#8b5cf6' },
  { value: 'orange', label: 'Orange', color: '#f97316' },
  { value: 'rose', label: 'Rose', color: '#f43f5e' },
  { value: 'slate', label: 'Slate', color: '#64748b' },
]

function AccentSelector({
  value,
  onChange,
}: {
  value: ThemeAccent
  onChange: (v: ThemeAccent) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {ACCENTS.map((a) => (
        <button
          key={a.value}
          type="button"
          onClick={() => onChange(a.value)}
          title={a.label}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-full transition-transform',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            value === a.value ? 'scale-110 ring-2 ring-offset-2 ring-current' : 'hover:scale-105'
          )}
          style={{ backgroundColor: a.color, color: a.color }}
          aria-pressed={value === a.value}
          aria-label={a.label}
        >
          {value === a.value && (
            <svg viewBox="0 0 16 16" className="h-4 w-4 text-white" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 8l3.5 3.5L13 4" />
            </svg>
          )}
        </button>
      ))}
    </div>
  )
}

// ============================================================================
// Toggle switch
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
// Font size selector
// ============================================================================

const FONT_SIZES: { value: ThemeSettingsData['fontSize']; label: string }[] = [
  { value: 'sm', label: 'Small' },
  { value: 'base', label: 'Default' },
  { value: 'lg', label: 'Large' },
]

// ============================================================================
// Theme Settings component
// ============================================================================

export function ThemeSettings({ adapter, className }: ThemeSettingsProps) {
  const { theme, onUpdate } = adapter

  return (
    <div className={cn('space-y-6', className)}>
      {/* Appearance */}
      <SettingsSectionCard title="Appearance">
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium">Color theme</p>
            <ModeSelector
              value={theme.mode}
              onChange={(mode) => onUpdate({ mode })}
            />
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium">Accent color</p>
            <AccentSelector
              value={theme.accent}
              onChange={(accent) => onUpdate({ accent })}
            />
          </div>
        </div>
      </SettingsSectionCard>

      {/* Typography */}
      <SettingsSectionCard title="Typography">
        <SettingsRow label="Font size" htmlFor="font-size">
          <select
            id="font-size"
            value={theme.fontSize}
            onChange={(e) => onUpdate({ fontSize: e.target.value as ThemeSettingsData['fontSize'] })}
            className={cn(
              'rounded-md border bg-background px-2 py-1.5 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring'
            )}
          >
            {FONT_SIZES.map((f) => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </SettingsRow>
      </SettingsSectionCard>

      {/* Interface */}
      <SettingsSectionCard title="Interface">
        <div className="space-y-4">
          <SettingsRow
            label="Compact mode"
            description="Reduce spacing between messages and elements."
            htmlFor="compact-mode"
          >
            <Toggle
              id="compact-mode"
              checked={theme.compactMode}
              onChange={(compactMode) => onUpdate({ compactMode })}
            />
          </SettingsRow>

          <SettingsRow
            label="Group messages"
            description="Group consecutive messages from the same author."
            htmlFor="message-grouping"
          >
            <Toggle
              id="message-grouping"
              checked={theme.messageGrouping}
              onChange={(messageGrouping) => onUpdate({ messageGrouping })}
            />
          </SettingsRow>

          <SettingsRow
            label="Show avatars"
            description="Display user avatars next to messages."
            htmlFor="show-avatars"
          >
            <Toggle
              id="show-avatars"
              checked={theme.showAvatars}
              onChange={(showAvatars) => onUpdate({ showAvatars })}
            />
          </SettingsRow>

          <SettingsRow
            label="Animations"
            description="Enable interface animations and transitions."
            htmlFor="animations"
          >
            <Toggle
              id="animations"
              checked={theme.animationsEnabled}
              onChange={(animationsEnabled) => onUpdate({ animationsEnabled })}
            />
          </SettingsRow>
        </div>
      </SettingsSectionCard>
    </div>
  )
}
