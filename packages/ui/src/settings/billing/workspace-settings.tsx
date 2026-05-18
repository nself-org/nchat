/**
 * Workspace settings — name, slug, description, icon, membership rules.
 * Injectable WorkspaceSettingsAdapter replaces store/context deps.
 *
 * @module settings/billing/workspace-settings
 */

'use client'

import * as React from 'react'
import { cn } from '../../lib/utils'
import type { WorkspaceSettings as WorkspaceSettingsData, WorkspaceUpdatePayload } from './types'
import { SettingsSectionCard, SettingsRow } from '../settings-layout'

// ============================================================================
// Adapter
// ============================================================================

export interface WorkspaceSettingsAdapter {
  workspace: WorkspaceSettingsData
  isSaving: boolean
  onSave: (payload: WorkspaceUpdatePayload) => void | Promise<void>
  onUploadIcon?: (file: File) => Promise<string>
  onRemoveIcon?: () => void
  /** Whether the current user is allowed to edit workspace settings */
  canEdit?: boolean
}

export interface WorkspaceSettingsProps {
  adapter: WorkspaceSettingsAdapter
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
// WorkspaceSettings
// ============================================================================

const DEFAULT_ROLE_OPTIONS: { value: WorkspaceSettingsData['defaultRole']; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'moderator', label: 'Moderator' },
  { value: 'member', label: 'Member' },
  { value: 'guest', label: 'Guest' },
]

const JOIN_APPROVAL_OPTIONS: { value: WorkspaceSettingsData['joinApproval']; label: string }[] = [
  { value: 'open', label: 'Open — anyone with the link' },
  { value: 'invite', label: 'Invite only' },
  { value: 'approval', label: 'Requires admin approval' },
]

export function WorkspaceSettings({ adapter, className }: WorkspaceSettingsProps) {
  const { workspace, isSaving, onSave, onUploadIcon, onRemoveIcon, canEdit = true } = adapter

  const [name, setName] = React.useState(workspace.name)
  const [description, setDescription] = React.useState(workspace.description ?? '')
  const [allowInvites, setAllowInvites] = React.useState(workspace.allowInvites)
  const [allowPublicChannels, setAllowPublicChannels] = React.useState(workspace.allowPublicChannels)
  const [defaultRole, setDefaultRole] = React.useState(workspace.defaultRole)
  const [joinApproval, setJoinApproval] = React.useState(workspace.joinApproval)
  const [uploadingIcon, setUploadingIcon] = React.useState(false)

  const fileRef = React.useRef<HTMLInputElement>(null)

  const isDirty =
    name !== workspace.name ||
    description !== (workspace.description ?? '') ||
    allowInvites !== workspace.allowInvites ||
    allowPublicChannels !== workspace.allowPublicChannels ||
    defaultRole !== workspace.defaultRole ||
    joinApproval !== workspace.joinApproval

  const handleSave = () => {
    onSave({
      name: name !== workspace.name ? name : undefined,
      description: description !== (workspace.description ?? '') ? (description || null) : undefined,
      allowInvites: allowInvites !== workspace.allowInvites ? allowInvites : undefined,
      allowPublicChannels: allowPublicChannels !== workspace.allowPublicChannels ? allowPublicChannels : undefined,
      defaultRole: defaultRole !== workspace.defaultRole ? defaultRole : undefined,
      joinApproval: joinApproval !== workspace.joinApproval ? joinApproval : undefined,
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

  return (
    <div className={cn('space-y-6', className)}>
      {/* Identity */}
      <SettingsSectionCard title="Workspace identity">
        <div className="space-y-4">
          {/* Icon */}
          <div className="flex items-center gap-4">
            <div className="relative h-16 w-16 shrink-0">
              {workspace.iconUrl ? (
                <img
                  src={workspace.iconUrl}
                  alt={workspace.name}
                  className="h-16 w-16 rounded-xl object-cover"
                />
              ) : (
                <div
                  className="flex h-16 w-16 items-center justify-center rounded-xl text-xl font-bold text-white"
                  style={{ backgroundColor: workspace.iconColor ?? '#6366f1' }}
                >
                  {workspace.name.charAt(0).toUpperCase()}
                </div>
              )}
              {uploadingIcon && (
                <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/70">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              )}
            </div>
            {canEdit && (
              <div className="flex flex-col gap-2">
                {onUploadIcon && (
                  <>
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={handleIconFile}
                      aria-label="Upload workspace icon"
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
                {onRemoveIcon && workspace.iconUrl && (
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
            <label htmlFor="workspace-name" className="block text-sm font-medium">
              Workspace name
            </label>
            <input
              id="workspace-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!canEdit}
              maxLength={80}
              className={cn(
                'w-full rounded-md border bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                !canEdit && 'opacity-60 cursor-not-allowed'
              )}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="workspace-slug" className="block text-sm font-medium">
              Workspace URL
            </label>
            <div className="flex items-center gap-1 rounded-md border bg-muted px-3 py-2">
              <span className="text-sm text-muted-foreground">chat.example.com/</span>
              <span className="text-sm font-medium">{workspace.slug}</span>
            </div>
            <p className="text-xs text-muted-foreground">URL cannot be changed.</p>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="workspace-desc" className="block text-sm font-medium">
              Description <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <textarea
              id="workspace-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!canEdit}
              rows={2}
              maxLength={300}
              className={cn(
                'w-full resize-none rounded-md border bg-background px-3 py-2 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent',
                !canEdit && 'opacity-60 cursor-not-allowed'
              )}
            />
          </div>
        </div>
      </SettingsSectionCard>

      {/* Membership */}
      <SettingsSectionCard title="Membership">
        <div className="space-y-4">
          <SettingsRow label="Allow member invites" description="Members can invite others to join." htmlFor="allow-invites">
            <Toggle
              id="allow-invites"
              checked={allowInvites}
              onChange={setAllowInvites}
              disabled={!canEdit}
            />
          </SettingsRow>

          <SettingsRow label="Default role" description="Role assigned to new members." htmlFor="default-role">
            <select
              id="default-role"
              value={defaultRole}
              onChange={(e) => setDefaultRole(e.target.value as WorkspaceSettingsData['defaultRole'])}
              disabled={!canEdit}
              className={cn(
                'rounded-md border bg-background px-2 py-1.5 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                !canEdit && 'opacity-60 cursor-not-allowed'
              )}
            >
              {DEFAULT_ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </SettingsRow>

          <SettingsRow label="Join policy" htmlFor="join-approval">
            <select
              id="join-approval"
              value={joinApproval}
              onChange={(e) => setJoinApproval(e.target.value as WorkspaceSettingsData['joinApproval'])}
              disabled={!canEdit}
              className={cn(
                'rounded-md border bg-background px-2 py-1.5 text-sm',
                'focus:outline-none focus:ring-2 focus:ring-ring',
                !canEdit && 'opacity-60 cursor-not-allowed'
              )}
            >
              {JOIN_APPROVAL_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </SettingsRow>
        </div>
      </SettingsSectionCard>

      {/* Channels */}
      <SettingsSectionCard title="Channels">
        <SettingsRow label="Allow public channels" description="Members can create and browse public channels." htmlFor="allow-public">
          <Toggle
            id="allow-public"
            checked={allowPublicChannels}
            onChange={setAllowPublicChannels}
            disabled={!canEdit}
          />
        </SettingsRow>
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
