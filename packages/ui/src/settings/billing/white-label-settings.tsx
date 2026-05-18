/**
 * White-label settings — app name, icon, colors, custom domain, CSS.
 * Injectable WhiteLabelSettingsAdapter replaces store/context deps.
 *
 * @module settings/billing/white-label-settings
 */

'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import type { WhiteLabelSettings as WhiteLabelSettingsData, WhiteLabelUpdatePayload } from './types'
import { SettingsSectionCard, SettingsRow } from '../settings-layout'

// ============================================================================
// Adapter
// ============================================================================

export interface WhiteLabelSettingsAdapter {
  settings: WhiteLabelSettingsData
  isSaving?: boolean
  onSave: (payload: WhiteLabelUpdatePayload) => void | Promise<void>
  onUploadIcon?: (file: File) => Promise<string>
  onRemoveIcon?: () => void
  /** Whether the current user is allowed to edit white-label settings */
  canEdit?: boolean
}

export interface WhiteLabelSettingsProps {
  adapter: WhiteLabelSettingsAdapter
  className?: string
}

// ============================================================================
// Toggle
// ============================================================================

function Toggle({
  id,
  checked,
  onChange,
  disabled,
}: {
  id: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}) {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        checked ? 'bg-primary' : 'bg-input',
        disabled && 'opacity-50 cursor-not-allowed'
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
// ColorPicker — simple hex input + swatch preview
// ============================================================================

function ColorPicker({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string
  value: string
  onChange: (v: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="h-7 w-7 shrink-0 rounded-md border shadow-sm"
        style={{ backgroundColor: value }}
        aria-hidden="true"
      />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        maxLength={9}
        pattern="^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$"
        placeholder="#000000"
        className={cn(
          'w-28 rounded-md border bg-background px-2 py-1 font-mono text-sm',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
          disabled && 'opacity-60 cursor-not-allowed'
        )}
      />
      <input
        type="color"
        value={value.length === 7 ? value : '#000000'}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        tabIndex={-1}
        aria-hidden="true"
        className="sr-only"
      />
    </div>
  )
}

// ============================================================================
// WhiteLabelSettings
// ============================================================================

export function WhiteLabelSettings({ adapter, className }: WhiteLabelSettingsProps) {
  const {
    settings,
    isSaving,
    onSave,
    onUploadIcon,
    onRemoveIcon,
    canEdit = true,
  } = adapter

  const [enabled, setEnabled] = React.useState(settings.enabled)
  const [appName, setAppName] = React.useState(settings.appName)
  const [primaryColor, setPrimaryColor] = React.useState(settings.primaryColor)
  const [accentColor, setAccentColor] = React.useState(settings.accentColor)
  const [hideNselfBranding, setHideNselfBranding] = React.useState(settings.hideNselfBranding)
  const [customDomain, setCustomDomain] = React.useState(settings.customDomain ?? '')
  const [customCss, setCustomCss] = React.useState(settings.customCss ?? '')
  const [uploadingIcon, setUploadingIcon] = React.useState(false)

  const fileRef = React.useRef<HTMLInputElement>(null)

  const isDirty =
    enabled !== settings.enabled ||
    appName !== settings.appName ||
    primaryColor !== settings.primaryColor ||
    accentColor !== settings.accentColor ||
    hideNselfBranding !== settings.hideNselfBranding ||
    customDomain !== (settings.customDomain ?? '') ||
    customCss !== (settings.customCss ?? '')

  const handleSave = () => {
    onSave({
      appName: appName !== settings.appName ? appName : undefined,
      primaryColor: primaryColor !== settings.primaryColor ? primaryColor : undefined,
      accentColor: accentColor !== settings.accentColor ? accentColor : undefined,
      hideNselfBranding: hideNselfBranding !== settings.hideNselfBranding ? hideNselfBranding : undefined,
      customDomain: customDomain !== (settings.customDomain ?? '')
        ? (customDomain || null)
        : undefined,
      customCss: customCss !== (settings.customCss ?? '')
        ? (customCss || null)
        : undefined,
    })
  }

  const handleIconFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !onUploadIcon) return
    setUploadingIcon(true)
    try {
      await onUploadIcon(file)
    } finally {
      setUploadingIcon(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const isEditable = canEdit && enabled

  return (
    <div className={cn('space-y-6', className)}>
      {/* Enable toggle */}
      <SettingsSectionCard
        title="White-label"
        description="Replace nSelf branding with your own app name, icon, and colors."
      >
        <SettingsRow
          label="Enable white-label"
          description="Turn on custom branding for this workspace."
          htmlFor="wl-enabled"
        >
          <Toggle
            id="wl-enabled"
            checked={enabled}
            onChange={setEnabled}
            disabled={!canEdit}
          />
        </SettingsRow>
      </SettingsSectionCard>

      {/* App identity */}
      <SettingsSectionCard title="App identity">
        <div className="space-y-4">
          {/* Icon */}
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 shrink-0">
              {settings.appIconUrl ? (
                <img
                  src={settings.appIconUrl}
                  alt={appName}
                  className="h-14 w-14 rounded-xl object-cover"
                />
              ) : (
                <div
                  className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-bold text-white"
                  style={{ backgroundColor: primaryColor ?? '#6366f1' }}
                >
                  {appName.charAt(0).toUpperCase()}
                </div>
              )}
              {uploadingIcon && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
            {isEditable && (
              <div className="flex flex-col gap-2">
                {onUploadIcon && (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleIconFile}
                      aria-label="Upload app icon"
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploadingIcon}
                      className={cn(
                        'rounded-md border px-3 py-1.5 text-sm',
                        'hover:bg-accent transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        'disabled:opacity-50 disabled:cursor-not-allowed'
                      )}
                    >
                      Change icon
                    </button>
                  </>
                )}
                {onRemoveIcon && settings.appIconUrl && (
                  <button
                    type="button"
                    onClick={onRemoveIcon}
                    className={cn(
                      'rounded-md px-3 py-1.5 text-sm text-destructive',
                      'hover:bg-destructive/10 transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
                    )}
                  >
                    Remove icon
                  </button>
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="wl-app-name" className="block text-sm font-medium">
              App name
            </label>
            <input
              id="wl-app-name"
              type="text"
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              disabled={!isEditable}
              maxLength={50}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                !isEditable && 'opacity-60 cursor-not-allowed'
              )}
            />
          </div>
        </div>
      </SettingsSectionCard>

      {/* Colors */}
      <SettingsSectionCard title="Brand colors">
        <div className="space-y-4">
          <SettingsRow label="Primary color" description="Main action color (buttons, links)." htmlFor="wl-primary">
            <ColorPicker
              id="wl-primary"
              value={primaryColor}
              onChange={setPrimaryColor}
              disabled={!isEditable}
            />
          </SettingsRow>
          <SettingsRow label="Accent color" description="Secondary highlights and badges." htmlFor="wl-accent">
            <ColorPicker
              id="wl-accent"
              value={accentColor}
              onChange={setAccentColor}
              disabled={!isEditable}
            />
          </SettingsRow>
        </div>
      </SettingsSectionCard>

      {/* Branding */}
      <SettingsSectionCard title="Branding">
        <SettingsRow
          label="Hide nSelf branding"
          description="Remove 'Powered by nSelf' from all surfaces."
          htmlFor="wl-hide-branding"
        >
          <Toggle
            id="wl-hide-branding"
            checked={hideNselfBranding}
            onChange={setHideNselfBranding}
            disabled={!isEditable}
          />
        </SettingsRow>
      </SettingsSectionCard>

      {/* Custom domain */}
      <SettingsSectionCard
        title="Custom domain"
        description="Serve your workspace on your own domain. Point a CNAME record to chat.nself.org."
      >
        <div className="space-y-1.5">
          <label htmlFor="wl-domain" className="block text-sm font-medium">
            Domain
          </label>
          <input
            id="wl-domain"
            type="text"
            value={customDomain}
            onChange={(e) => setCustomDomain(e.target.value)}
            disabled={!isEditable}
            placeholder="chat.yourcompany.com"
            maxLength={253}
            className={cn(
              'w-full rounded-md border bg-background px-3 py-2 text-sm',
              'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
              !isEditable && 'opacity-60 cursor-not-allowed'
            )}
          />
          <p className="text-xs text-muted-foreground">Leave blank to use the default nSelf subdomain.</p>
        </div>
      </SettingsSectionCard>

      {/* Custom CSS */}
      <SettingsSectionCard
        title="Custom CSS"
        description="Inject global CSS for fine-grained style overrides."
      >
        <textarea
          id="wl-css"
          value={customCss}
          onChange={(e) => setCustomCss(e.target.value)}
          disabled={!isEditable}
          rows={8}
          spellCheck={false}
          placeholder={`/* Example */\n:root {\n  --border-radius: 0.5rem;\n}`}
          className={cn(
            'w-full resize-y rounded-md border bg-background px-3 py-2 font-mono text-xs',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
            !isEditable && 'opacity-60 cursor-not-allowed'
          )}
        />
      </SettingsSectionCard>

      {/* Save */}
      {isDirty && canEdit && (
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
