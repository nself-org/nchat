/**
 * CompliancePanel — injectable, no external deps.
 *
 * @module admin/compliance-panel
 */

'use client'

import * as React from 'react'
import { cn } from '../lib/utils'
import type { ComplianceItem, ComplianceStatus, RetentionPolicy } from './types'

// ============================================================================
// Adapter
// ============================================================================

export interface CompliancePanelAdapter {
  items: ComplianceItem[]
  retentionPolicies: RetentionPolicy[]
  isLoading?: boolean
  onRunCheck?: () => void
  onUpdatePolicy: (policy: RetentionPolicy) => void
  onAddPolicy?: () => void
}

export interface CompliancePanelProps {
  adapter: CompliancePanelAdapter
  className?: string
}

// ============================================================================
// Icons
// ============================================================================

function LockIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
}

function CheckCircleIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
}

function AlertCircleIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
}

function XCircleIcon({ className }: { className?: string }) {
  return <svg viewBox="0 0 24 24" className={cn('h-4 w-4', className)} fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
}

// ============================================================================
// Helpers
// ============================================================================

function statusIcon(status: ComplianceStatus) {
  if (status === 'compliant') return <CheckCircleIcon className="text-green-600 dark:text-green-400" />
  if (status === 'warning') return <AlertCircleIcon className="text-yellow-600 dark:text-yellow-400" />
  if (status === 'violation') return <XCircleIcon className="text-destructive" />
  return <AlertCircleIcon className="text-muted-foreground" />
}

function statusLabel(status: ComplianceStatus): string {
  const map: Record<ComplianceStatus, string> = {
    compliant: 'Compliant',
    warning: 'Warning',
    violation: 'Violation',
    unknown: 'Unknown',
  }
  return map[status]
}

// ============================================================================
// CompliancePanel
// ============================================================================

export function CompliancePanel({ adapter, className }: CompliancePanelProps) {
  const { items, retentionPolicies, isLoading, onRunCheck, onAddPolicy, onUpdatePolicy } = adapter

  const summary = React.useMemo(() => {
    const counts = { compliant: 0, warning: 0, violation: 0, unknown: 0 }
    items.forEach((item) => { counts[item.status]++ })
    return counts
  }, [items])

  return (
    <div className={cn('flex flex-col gap-6', className)}>
      {/* Summary bar */}
      <div className="flex items-center gap-4 p-4 rounded-xl border bg-card">
        <LockIcon className="text-muted-foreground shrink-0" />
        <div className="flex-1 flex items-center gap-4 flex-wrap text-sm">
          <span className="text-green-600 dark:text-green-400 font-medium">{summary.compliant} compliant</span>
          {summary.warning > 0 && <span className="text-yellow-600 dark:text-yellow-400 font-medium">{summary.warning} warnings</span>}
          {summary.violation > 0 && <span className="text-destructive font-medium">{summary.violation} violations</span>}
          {summary.unknown > 0 && <span className="text-muted-foreground">{summary.unknown} unknown</span>}
        </div>
        {onRunCheck && (
          <button
            type="button"
            onClick={onRunCheck}
            disabled={isLoading}
            className="shrink-0 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            {isLoading ? 'Checking…' : 'Run check'}
          </button>
        )}
      </div>

      {/* Compliance items */}
      <section>
        <h3 className="mb-3 text-sm font-semibold">Compliance checks</h3>
        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">{statusIcon(item.status)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{item.title}</span>
                    <span className="text-xs text-muted-foreground">({statusLabel(item.status)})</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  {item.recommendation && item.status !== 'compliant' && (
                    <p className="mt-1.5 text-xs text-foreground/80 bg-muted/40 rounded px-2 py-1">{item.recommendation}</p>
                  )}
                  {item.lastCheckedAt && (
                    <p className="text-xs text-muted-foreground mt-1">Last checked: {new Date(item.lastCheckedAt).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Retention policies */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold">Data retention policies</h3>
          {onAddPolicy && (
            <button type="button" onClick={onAddPolicy} className="text-xs text-primary hover:underline">+ Add policy</button>
          )}
        </div>
        <div className="space-y-2">
          {retentionPolicies.length === 0 ? (
            <p className="text-xs text-muted-foreground">No retention policies configured.</p>
          ) : retentionPolicies.map((policy) => (
            <div key={policy.id} className="rounded-lg border bg-card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium">{policy.name}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {policy.channelType === 'all' ? 'All channels' : `${policy.channelType} channels`}
                  {' · '}
                  {policy.retentionDays} day{policy.retentionDays !== 1 ? 's' : ''} retention
                  {policy.deleteMessages && ' · deletes messages'}
                  {policy.deleteFiles && ' · deletes files'}
                </div>
              </div>
              {/* Toggle */}
              <button
                type="button"
                role="switch"
                aria-checked={policy.enabled}
                onClick={() => onUpdatePolicy({ ...policy, enabled: !policy.enabled })}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors',
                  policy.enabled ? 'bg-primary' : 'bg-muted'
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform',
                    policy.enabled ? 'translate-x-4' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
