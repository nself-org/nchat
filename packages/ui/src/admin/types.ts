/**
 * Admin domain types — audit, compliance, moderation, analytics.
 *
 * @module admin/types
 */

// ============================================================================
// Audit
// ============================================================================

export type AuditEventType =
  | 'user.created' | 'user.updated' | 'user.deleted' | 'user.banned' | 'user.unbanned'
  | 'channel.created' | 'channel.updated' | 'channel.deleted' | 'channel.archived'
  | 'message.deleted' | 'message.flagged' | 'message.pinned' | 'message.unpinned'
  | 'member.added' | 'member.removed' | 'member.role_changed'
  | 'settings.updated' | 'plugin.installed' | 'plugin.removed'
  | 'file.uploaded' | 'file.deleted'
  | 'moderation.action'
  | 'other'

export interface AuditEvent {
  id: string
  type: AuditEventType
  actorId: string
  actorName: string
  actorAvatarUrl?: string
  targetId?: string
  targetType?: 'user' | 'channel' | 'message' | 'file' | 'role'
  targetLabel?: string
  workspaceId: string
  metadata?: Record<string, unknown>
  createdAt: string
  ipAddress?: string
}

// ============================================================================
// Moderation
// ============================================================================

export type ModerationStatus = 'pending' | 'reviewed' | 'actioned' | 'dismissed'
export type ModerationActionType = 'warn' | 'mute' | 'kick' | 'ban' | 'delete_message' | 'none'

export interface ModerationReport {
  id: string
  reportedBy: string
  reportedByName: string
  targetType: 'message' | 'user' | 'file'
  targetId: string
  targetPreview?: string
  reason: string
  status: ModerationStatus
  action?: ModerationActionType
  reviewedBy?: string
  reviewedAt?: string
  createdAt: string
}

export interface ModerationAction {
  type: ModerationActionType
  targetUserId?: string
  targetMessageId?: string
  reason?: string
  durationMinutes?: number
}

// ============================================================================
// Compliance
// ============================================================================

export type ComplianceStatus = 'compliant' | 'warning' | 'violation' | 'unknown'

export interface ComplianceItem {
  id: string
  category: 'data-retention' | 'encryption' | 'access-control' | 'audit-logging' | 'gdpr' | 'other'
  title: string
  description: string
  status: ComplianceStatus
  lastCheckedAt?: string
  recommendation?: string
}

export interface RetentionPolicy {
  id: string
  name: string
  channelType: 'public' | 'private' | 'dm' | 'all'
  retentionDays: number
  deleteMessages: boolean
  deleteFiles: boolean
  enabled: boolean
}

// ============================================================================
// Analytics
// ============================================================================

export interface AnalyticsSummary {
  totalUsers: number
  activeUsersToday: number
  activeUsersWeek: number
  totalChannels: number
  totalMessages: number
  messagesToday: number
  messagesWeek: number
  storageUsedBytes: number
  storageCapacityBytes?: number
}

export interface AnalyticsDataPoint {
  date: string
  value: number
  label?: string
}

export interface AnalyticsSeries {
  id: string
  label: string
  color?: string
  data: AnalyticsDataPoint[]
}
