/**
 * Profile settings — display name, bio, avatar, custom status, timezone, locale.
 * Injectable ProfileSettingsAdapter replaces store/context deps.
 *
 * @module settings/profile-settings
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { ProfileData, ProfileUpdatePayload } from './types'
import { SettingsSectionCard, SettingsRow } from './settings-layout'

// ============================================================================
// Adapter
// ============================================================================

export interface ProfileSettingsAdapter {
  profile: ProfileData
  isSaving: boolean
  onSave: (payload: ProfileUpdatePayload) => void | Promise<void>
  onUploadAvatar?: (file: File) => Promise<string>
  onRemoveAvatar?: () => void
  /** Available timezones (e.g. Intl-derived) */
  timezones?: string[]
  /** Available locales (code → display name) */
  locales?: Array<{ code: string; name: string }>
}

export interface ProfileSettingsProps {
  adapter: ProfileSettingsAdapter
  className?: string
}

// ============================================================================
// Inline icons
// ============================================================================

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="5" r="3" />
      <path d="M2 14c0-3 2.7-5 6-5s6 2 6 5" />
    </svg>
  )
}

function CameraIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 5a1 1 0 0 1 1-1h1.5l1.5-2h5l1.5 2H13a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V5z" />
      <circle cx="8" cy="9" r="2.5" />
    </svg>
  )
}

// ============================================================================
// Avatar editor
// ============================================================================

function AvatarEditor({
  avatarUrl,
  displayName,
  onUpload,
  onRemove,
}: {
  avatarUrl: string | null
  displayName: string
  onUpload?: (file: File) => Promise<string>
  onRemove?: () => void
}) {
  const fileRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUpload) return
    setUploading(true)
    try {
      await onUpload(file)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="flex items-center gap-4">
      {/* Avatar preview */}
      <div className="relative h-20 w-20 shrink-0">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <span className="flex h-20 w-20 items-center justify-center rounded-full bg-muted text-2xl font-medium uppercase text-muted-foreground">
            {displayName.charAt(0)}
          </span>
        )}
        {uploading && (
          <div className="absolute inset-0 flex items-center justify-center rounded-full bg-background/70">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        {onUpload && (
          <>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={handleFile}
              aria-label="Upload avatar"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className={cn(
                'flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm',
                'hover:bg-accent transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              <CameraIcon />
              Change photo
            </button>
          </>
        )}
        {onRemove && avatarUrl && (
          <button
            type="button"
            onClick={onRemove}
            className={cn(
              'rounded-md px-3 py-1.5 text-sm text-destructive',
              'hover:bg-destructive/10 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
            )}
          >
            Remove photo
          </button>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// Profile Settings
// ============================================================================

export function ProfileSettings({ adapter, className }: ProfileSettingsProps) {
  const { profile, isSaving, onSave, onUploadAvatar, onRemoveAvatar, timezones, locales } = adapter

  const [displayName, setDisplayName] = React.useState(profile.displayName)
  const [bio, setBio] = React.useState(profile.bio ?? '')
  const [timezone, setTimezone] = React.useState(profile.timezone)
  const [locale, setLocale] = React.useState(profile.locale)
  const [customStatus, setCustomStatus] = React.useState(profile.customStatus ?? '')

  const isDirty =
    displayName !== profile.displayName ||
    bio !== (profile.bio ?? '') ||
    timezone !== profile.timezone ||
    locale !== profile.locale ||
    customStatus !== (profile.customStatus ?? '')

  const handleSave = () => {
    onSave({
      displayName: displayName !== profile.displayName ? displayName : undefined,
      bio: bio !== (profile.bio ?? '') ? (bio || null) : undefined,
      timezone: timezone !== profile.timezone ? timezone : undefined,
      locale: locale !== profile.locale ? locale : undefined,
      customStatus: customStatus !== (profile.customStatus ?? '') ? (customStatus || null) : undefined,
    })
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Avatar */}
      <SettingsSectionCard title="Profile photo">
        <AvatarEditor
          avatarUrl={profile.avatarUrl}
          displayName={displayName}
          onUpload={onUploadAvatar}
          onRemove={onRemoveAvatar}
        />
      </SettingsSectionCard>

      {/* Identity */}
      <SettingsSectionCard title="Identity" description="Your name and bio are visible to other members.">
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="display-name" className="block text-sm font-medium">
              Display name
            </label>
            <input
              id="display-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'
              )}
              placeholder="Your display name"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="username" className="block text-sm font-medium">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={profile.username}
              disabled
              className={cn(
                'w-full rounded-md border bg-muted px-3 py-2 text-sm text-muted-foreground',
                'cursor-not-allowed'
              )}
            />
            <p className="text-xs text-muted-foreground">Username cannot be changed here.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="bio" className="block text-sm font-medium">
              Bio <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <textarea
              id="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              maxLength={300}
              rows={3}
              className={cn(
                'w-full resize-none rounded-md border bg-background px-3 py-2 text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'
              )}
              placeholder="A short bio about yourself"
            />
            <p className="text-right text-xs text-muted-foreground">{bio.length}/300</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="custom-status" className="block text-sm font-medium">
              Custom status <span className="text-muted-foreground font-normal">(optional)</span>
            </label>
            <input
              id="custom-status"
              type="text"
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              maxLength={100}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'placeholder:text-muted-foreground',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent'
              )}
              placeholder="What are you up to?"
            />
          </div>
        </div>
      </SettingsSectionCard>

      {/* Region */}
      <SettingsSectionCard title="Region &amp; language">
        <div className="space-y-4">
          {timezones && timezones.length > 0 && (
            <SettingsRow label="Timezone" htmlFor="timezone">
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
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
          )}

          {locales && locales.length > 0 && (
            <SettingsRow label="Language" htmlFor="locale">
              <select
                id="locale"
                value={locale}
                onChange={(e) => setLocale(e.target.value)}
                className={cn(
                  'rounded-md border bg-background px-2 py-1.5 text-sm',
                  'focus:outline-none focus:ring-2 focus:ring-ring'
                )}
              >
                {locales.map((l) => (
                  <option key={l.code} value={l.code}>{l.name}</option>
                ))}
              </select>
            </SettingsRow>
          )}
        </div>
      </SettingsSectionCard>

      {/* Save */}
      {isDirty && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className={cn(
              'flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
              'hover:bg-primary/90 transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            {isSaving && (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            )}
            Save changes
          </button>
        </div>
      )}
    </div>
  )
}
