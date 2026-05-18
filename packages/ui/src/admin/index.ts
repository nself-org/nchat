/**
 * Admin domain — barrel export.
 *
 * @module admin
 */

export * from './types'
export { AuditLog } from './audit-log'
export type { AuditLogAdapter, AuditLogProps } from './audit-log'
export { ModerationQueue } from './moderation-queue'
export type { ModerationQueueAdapter, ModerationQueueProps } from './moderation-queue'
export { CompliancePanel } from './compliance-panel'
export type { CompliancePanelAdapter, CompliancePanelProps } from './compliance-panel'
export { AnalyticsDashboard } from './analytics-dashboard'
export type { AnalyticsDashboardAdapter, AnalyticsDashboardProps } from './analytics-dashboard'
