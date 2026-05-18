/**
 * Settings layout — two-panel settings shell: sidebar nav + content area.
 * No router deps; selection is managed via onSelect callback + activeSection prop.
 *
 * @module settings/settings-layout
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'

// ============================================================================
// Types
// ============================================================================

export interface SettingsSection {
  id: string
  label: string
  icon?: React.ReactNode
  /** Optional badge (e.g. "New") */
  badge?: string
  group?: string
}

export interface SettingsLayoutProps {
  sections: SettingsSection[]
  activeSection: string
  onSelect: (sectionId: string) => void
  children: React.ReactNode
  className?: string
}

// ============================================================================
// Settings Section wrapper (card-style content area)
// ============================================================================

export interface SettingsSectionProps {
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function SettingsSectionCard({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-card p-6',
        className
      )}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

export function SettingsSectionPlain({
  title,
  description,
  children,
  className,
}: SettingsSectionProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        {description && (
          <p className="text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="space-y-4">{children}</div>
    </div>
  )
}

// ============================================================================
// Settings row (label + control)
// ============================================================================

export interface SettingsRowProps {
  label: string
  description?: string
  htmlFor?: string
  children: React.ReactNode
  className?: string
}

export function SettingsRow({
  label,
  description,
  htmlFor,
  children,
  className,
}: SettingsRowProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4', className)}>
      <div className="min-w-0 flex-1">
        <label
          htmlFor={htmlFor}
          className="block text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
        </label>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

// ============================================================================
// Settings layout
// ============================================================================

export function SettingsLayout({
  sections,
  activeSection,
  onSelect,
  children,
  className,
}: SettingsLayoutProps) {
  // Group sections
  const groups = React.useMemo(() => {
    const groupMap = new Map<string, SettingsSection[]>()
    const ungrouped: SettingsSection[] = []

    for (const section of sections) {
      if (section.group) {
        const existing = groupMap.get(section.group) ?? []
        existing.push(section)
        groupMap.set(section.group, existing)
      } else {
        ungrouped.push(section)
      }
    }

    return { groupMap, ungrouped }
  }, [sections])

  return (
    <div
      className={cn(
        'flex h-full w-full overflow-hidden',
        className
      )}
    >
      {/* Nav sidebar */}
      <nav
        className="flex w-56 shrink-0 flex-col gap-1 overflow-y-auto border-r p-3"
        aria-label="Settings navigation"
      >
        {/* Ungrouped */}
        {groups.ungrouped.map((section) => (
          <SettingsNavItem
            key={section.id}
            section={section}
            isActive={section.id === activeSection}
            onSelect={onSelect}
          />
        ))}

        {/* Grouped */}
        {Array.from(groups.groupMap.entries()).map(([groupName, groupSections]) => (
          <div key={groupName} className="mt-4">
            <p className="mb-1 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {groupName}
            </p>
            {groupSections.map((section) => (
              <SettingsNavItem
                key={section.id}
                section={section}
                isActive={section.id === activeSection}
                onSelect={onSelect}
              />
            ))}
          </div>
        ))}
      </nav>

      {/* Content */}
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto p-6">
        {children}
      </main>
    </div>
  )
}

// ============================================================================
// Settings nav item
// ============================================================================

function SettingsNavItem({
  section,
  isActive,
  onSelect,
}: {
  section: SettingsSection
  isActive: boolean
  onSelect: (id: string) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(section.id)}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm',
        'transition-colors duration-75',
        isActive
          ? 'bg-accent text-accent-foreground font-medium'
          : 'text-muted-foreground hover:bg-accent/50 hover:text-foreground',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      {section.icon && (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center" aria-hidden>
          {section.icon}
        </span>
      )}
      <span className="min-w-0 flex-1 truncate">{section.label}</span>
      {section.badge && (
        <span className="shrink-0 rounded-full bg-primary px-1.5 py-0.5 text-xs text-primary-foreground">
          {section.badge}
        </span>
      )}
    </button>
  )
}
