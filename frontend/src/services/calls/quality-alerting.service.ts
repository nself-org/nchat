/**
 * Call Quality Alerting Service
 *
 * Provides threshold-based alerting for call quality degradation.
 * Supports multiple alert channels (webhook, email, Slack).
 * Includes alert suppression/cooldown and severity levels.
 */

import { gql } from '@apollo/client'
import { getServerApolloClient } from '@/lib/apollo-client'
import { logger } from '@/lib/logger'
import type { QualityLevel } from './quality-metrics.service'

// =============================================================================
// Types
// =============================================================================

export type AlertSeverity = 'info' | 'warning' | 'error' | 'critical'

export type AlertChannel = 'webhook' | 'email' | 'slack' | 'in_app'

export type AlertType =
  | 'quality_degradation'
  | 'high_packet_loss'
  | 'high_jitter'
  | 'high_rtt'
  | 'low_bandwidth'
  | 'connection_failed'
  | 'participant_dropped'
  | 'mos_below_threshold'
  | 'call_quality_critical'
  | 'quality_recovered'

export interface AlertThreshold {
  metric: string
  operator: 'gt' | 'gte' | 'lt' | 'lte' | 'eq'
  value: number
  severity: AlertSeverity
  enabled: boolean
}

export interface AlertConfig {
  thresholds: AlertThreshold[]
  channels: AlertChannelConfig[]
  cooldownMs: number // Minimum time between alerts of same type
  suppressionRules: AlertSuppressionRule[]
  escalationRules: EscalationRule[]
}

export interface AlertChannelConfig {
  channel: AlertChannel
  enabled: boolean
  config: Record<string, unknown>
  severityFilter?: AlertSeverity[] // Only send alerts of these severities
}

export interface AlertSuppressionRule {
  id: string
  type: AlertType
  duration: number // Suppress for this many milliseconds
  conditions?: Record<string, unknown>
  enabled: boolean
}

export interface EscalationRule {
  id: string
  alertType: AlertType
  escalateAfterMs: number // Time before escalation
  escalateTo: AlertSeverity
  notifyChannels: AlertChannel[]
  enabled: boolean
}

export interface Alert {
  id: string
  type: AlertType
  severity: AlertSeverity
  callId: string
  roomId?: string
  userId?: string
  participantId?: string
  message: string
  details: Record<string, unknown>
  suggestions: string[]
  createdAt: Date
  acknowledgedAt?: Date
  resolvedAt?: Date
  escalatedAt?: Date
  suppressedUntil?: Date
}

export interface AlertHistory {
  alerts: Alert[]
  totalCount: number
  unacknowledgedCount: number
  criticalCount: number
  byType: Record<AlertType, number>
  bySeverity: Record<AlertSeverity, number>
}

export interface AlertMetrics {
  totalAlerts: number
  alertsLast24h: number
  alertsLastHour: number
  avgResponseTime: number // Time to acknowledge
  avgResolutionTime: number // Time to resolve
  topAlertTypes: Array<{ type: AlertType; count: number }>
  topAffectedCalls: Array<{ callId: string; alertCount: number }>
}

// =============================================================================
// GraphQL Operations
// =============================================================================

const INSERT_ALERT = gql`
  mutation InsertQualityAlert($alert: nchat_call_quality_alerts_insert_input!) {
    insert_nchat_call_quality_alerts_one(object: $alert) {
      id
      call_id
      room_id
      user_id
      participant_id
      alert_type
      severity
      message
      details
      suggestions
      created_at
    }
  }
`

const GET_ALERTS = gql`
  query GetQualityAlerts(
    $callId: uuid
    $roomId: uuid
    $userId: uuid
    $severity: String
    $since: timestamptz
    $limit: Int!
    $offset: Int
  ) {
    nchat_call_quality_alerts(
      where: {
        _and: [
          { call_id: { _eq: $callId } }
          { room_id: { _eq: $roomId } }
          { user_id: { _eq: $userId } }
          { severity: { _eq: $severity } }
          { created_at: { _gte: $since } }
        ]
      }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      call_id
      room_id
      user_id
      participant_id
      alert_type
      severity
      message
      details
      suggestions
      created_at
      acknowledged_at
      resolved_at
      escalated_at
    }
    nchat_call_quality_alerts_aggregate(
      where: {
        _and: [
          { call_id: { _eq: $callId } }
          { room_id: { _eq: $roomId } }
          { user_id: { _eq: $userId } }
          { severity: { _eq: $severity } }
          { created_at: { _gte: $since } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
`

const UPDATE_ALERT = gql`
  mutation UpdateQualityAlert(
    $id: uuid!
    $acknowledgedAt: timestamptz
    $resolvedAt: timestamptz
    $escalatedAt: timestamptz
  ) {
    update_nchat_call_quality_alerts_by_pk(
      pk_columns: { id: $id }
      _set: {
        acknowledged_at: $acknowledgedAt
        resolved_at: $resolvedAt
        escalated_at: $escalatedAt
      }
    ) {
      id
      acknowledged_at
      resolved_at
      escalated_at
    }
  }
`

const GET_RECENT_ALERTS_FOR_SUPPRESSION = gql`
  query GetRecentAlertsForSuppression(
    $callId: uuid!
    $alertType: String!
    $since: timestamptz!
  ) {
    nchat_call_quality_alerts(
      where: {
        call_id: { _eq: $callId }
        alert_type: { _eq: $alertType }
        created_at: { _gte: $since }
      }
      limit: 1
    ) {
      id
      created_at
    }
  }
`

// =============================================================================
// Default Configuration
// =============================================================================

const DEFAULT_THRESHOLDS: AlertThreshold[] = [
  // Packet loss thresholds
  { metric: 'packet_loss', operator: 'gt', value: 10, severity: 'critical', enabled: true },
  { metric: 'packet_loss', operator: 'gt', value: 5, severity: 'error', enabled: true },
  { metric: 'packet_loss', operator: 'gt', value: 2, severity: 'warning', enabled: true },

  // Jitter thresholds (ms)
  { metric: 'jitter', operator: 'gt', value: 100, severity: 'critical', enabled: true },
  { metric: 'jitter', operator: 'gt', value: 50, severity: 'error', enabled: true },
  { metric: 'jitter', operator: 'gt', value: 30, severity: 'warning', enabled: true },

  // RTT thresholds (ms)
  { metric: 'rtt', operator: 'gt', value: 500, severity: 'critical', enabled: true },
  { metric: 'rtt', operator: 'gt', value: 300, severity: 'error', enabled: true },
  { metric: 'rtt', operator: 'gt', value: 150, severity: 'warning', enabled: true },

  // MOS thresholds
  { metric: 'mos', operator: 'lt', value: 2.5, severity: 'critical', enabled: true },
  { metric: 'mos', operator: 'lt', value: 3.1, severity: 'error', enabled: true },
  { metric: 'mos', operator: 'lt', value: 3.6, severity: 'warning', enabled: true },

  // Bandwidth thresholds (kbps)
  { metric: 'bandwidth', operator: 'lt', value: 50, severity: 'critical', enabled: true },
  { metric: 'bandwidth', operator: 'lt', value: 100, severity: 'error', enabled: true },
  { metric: 'bandwidth', operator: 'lt', value: 200, severity: 'warning', enabled: true },

  // Frame rate thresholds (fps)
  { metric: 'frame_rate', operator: 'lt', value: 5, severity: 'critical', enabled: true },
  { metric: 'frame_rate', operator: 'lt', value: 15, severity: 'warning', enabled: true },
]

const DEFAULT_CONFIG: AlertConfig = {
  thresholds: DEFAULT_THRESHOLDS,
  channels: [
    { channel: 'in_app', enabled: true, config: {} },
    { channel: 'webhook', enabled: false, config: { url: '' } },
    { channel: 'email', enabled: false, config: { recipients: [] } },
    { channel: 'slack', enabled: false, config: { webhookUrl: '' } },
  ],
  cooldownMs: 60000, // 1 minute default cooldown
  suppressionRules: [],
  escalationRules: [
    {
      id: 'escalate-critical-unack',
      alertType: 'call_quality_critical',
      escalateAfterMs: 300000, // 5 minutes
      escalateTo: 'critical',
      notifyChannels: ['email', 'slack'],
      enabled: true,
    },
  ],
}

// =============================================================================
// Service Implementation
// =============================================================================

export class CallQualityAlertingService {
  private client: ReturnType<typeof getServerApolloClient>
  private config: AlertConfig
  private alertCooldowns: Map<string, number> = new Map()
  private suppressedAlerts: Map<string, number> = new Map()

  constructor(config?: Partial<AlertConfig>) {
    this.client = getServerApolloClient()
    this.config = { ...DEFAULT_CONFIG, ...config }
  }

  /**
   * Update alerting configuration
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config }
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertConfig {
    return { ...this.config }
  }

  /**
   * Check if a metric value exceeds thresholds and generate alerts
   */
  checkThresholds(
    metrics: {
      packetLoss?: number
      jitter?: number
      rtt?: number
      mos?: number
      bandwidth?: number
      frameRate?: number
    },
    context: {
      callId: string
      roomId?: string
      userId?: string
      participantId?: string
    }
  ): Alert[] {
    const alerts: Alert[] = []

    for (const threshold of this.config.thresholds) {
      if (!threshold.enabled) continue

      const value = this.getMetricValue(metrics, threshold.metric)
      if (value === undefined) continue

      const exceeded = this.checkThresholdExceeded(value, threshold)
      if (exceeded) {
        const alertType = this.getAlertTypeForMetric(threshold.metric)
        const alert = this.createAlert(
          alertType,
          threshold.severity,
          context,
          {
            metric: threshold.metric,
            value,
            threshold: threshold.value,
            operator: threshold.operator,
          }
        )
        alerts.push(alert)
      }
    }

    return alerts
  }

  /**
   * Get metric value from metrics object
   */
  private getMetricValue(
    metrics: Record<string, number | undefined>,
    metricName: string
  ): number | undefined {
    const mapping: Record<string, string> = {
      packet_loss: 'packetLoss',
      jitter: 'jitter',
      rtt: 'rtt',
      mos: 'mos',
      bandwidth: 'bandwidth',
      frame_rate: 'frameRate',
    }
    return metrics[mapping[metricName] || metricName]
  }

  /**
   * Check if threshold is exceeded
   */
  private checkThresholdExceeded(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'gt':
        return value > threshold.value
      case 'gte':
        return value >= threshold.value
      case 'lt':
        return value < threshold.value
      case 'lte':
        return value <= threshold.value
      case 'eq':
        return value === threshold.value
      default:
        return false
    }
  }

  /**
   * Get alert type for a metric
   */
  private getAlertTypeForMetric(metric: string): AlertType {
    const mapping: Record<string, AlertType> = {
      packet_loss: 'high_packet_loss',
      jitter: 'high_jitter',
      rtt: 'high_rtt',
      mos: 'mos_below_threshold',
      bandwidth: 'low_bandwidth',
      frame_rate: 'quality_degradation',
    }
    return mapping[metric] || 'quality_degradation'
  }

  /**
   * Create an alert object
   */
  private createAlert(
    type: AlertType,
    severity: AlertSeverity,
    context: {
      callId: string
      roomId?: string
      userId?: string
      participantId?: string
    },
    details: Record<string, unknown>
  ): Alert {
    const message = this.generateAlertMessage(type, severity, details)
    const suggestions = this.generateSuggestions(type, details)

    return {
      id: crypto.randomUUID(),
      type,
      severity,
      callId: context.callId,
      roomId: context.roomId,
      userId: context.userId,
      participantId: context.participantId,
      message,
      details,
      suggestions,
      createdAt: new Date(),
    }
  }

  /**
   * Generate alert message based on type and severity
   */
  private generateAlertMessage(
    type: AlertType,
    severity: AlertSeverity,
    details: Record<string, unknown>
  ): string {
    const severityPrefix = severity === 'critical' ? 'CRITICAL: ' : severity === 'error' ? 'ERROR: ' : ''

    const messages: Record<AlertType, string> = {
      quality_degradation: `${severityPrefix}Call quality has degraded`,
      high_packet_loss: `${severityPrefix}High packet loss detected: ${details.value}%`,
      high_jitter: `${severityPrefix}High jitter detected: ${details.value}ms`,
      high_rtt: `${severityPrefix}High latency detected: ${details.value}ms`,
      low_bandwidth: `${severityPrefix}Low bandwidth detected: ${details.value}kbps`,
      connection_failed: `${severityPrefix}Connection failed`,
      participant_dropped: `${severityPrefix}Participant dropped from call`,
      mos_below_threshold: `${severityPrefix}MOS score below threshold: ${(details.value as number)?.toFixed(2)}`,
      call_quality_critical: `${severityPrefix}Call quality is critical`,
      quality_recovered: 'Call quality has recovered',
    }

    return messages[type] || `${severityPrefix}Quality alert: ${type}`
  }

  /**
   * Generate suggestions based on alert type
   */
  private generateSuggestions(type: AlertType, details: Record<string, unknown>): string[] {
    const baseSuggestions: Record<AlertType, string[]> = {
      quality_degradation: [
        'Check network connection stability',
        'Consider reducing video quality',
        'Close bandwidth-intensive applications',
      ],
      high_packet_loss: [
        'Check for network congestion',
        'Switch to a wired connection if possible',
        'Reduce video resolution or disable video',
        'Move closer to your WiFi router',
      ],
      high_jitter: [
        'Check for network congestion',
        'Close other streaming applications',
        'Consider using a wired connection',
      ],
      high_rtt: [
        'Check for network latency issues',
        'Try connecting to a closer server',
        'Check if VPN is causing delays',
      ],
      low_bandwidth: [
        'Check your internet connection speed',
        'Disable video to conserve bandwidth',
        'Close other bandwidth-intensive applications',
        'Try switching networks (WiFi/cellular)',
      ],
      connection_failed: [
        'Check your internet connection',
        'Try refreshing the page',
        'Restart your browser',
      ],
      participant_dropped: [
        'Check if the participant lost connection',
        'Ask them to rejoin the call',
      ],
      mos_below_threshold: [
        'Audio quality is degraded',
        'Check microphone and speaker settings',
        'Try using headphones',
      ],
      call_quality_critical: [
        'Call quality is very poor',
        'Consider ending and restarting the call',
        'Check all network connections',
      ],
      quality_recovered: [],
    }

    return baseSuggestions[type] || ['Check your network connection']
  }

  /**
   * Check if alert should be suppressed (cooldown)
   */
  private shouldSuppressAlert(alert: Alert): boolean {
    const key = `${alert.callId}:${alert.type}`
    const lastAlertTime = this.alertCooldowns.get(key)

    if (lastAlertTime) {
      const elapsed = Date.now() - lastAlertTime
      if (elapsed < this.config.cooldownMs) {
        return true
      }
    }

    // Check explicit suppression rules
    for (const rule of this.config.suppressionRules) {
      if (!rule.enabled) continue
      if (rule.type !== alert.type) continue

      const suppressionKey = `${alert.callId}:${rule.id}`
      const suppressedUntil = this.suppressedAlerts.get(suppressionKey)

      if (suppressedUntil && Date.now() < suppressedUntil) {
        return true
      }
    }

    return false
  }

  /**
   * Record that an alert was sent (for cooldown tracking)
   */
  private recordAlertSent(alert: Alert): void {
    const key = `${alert.callId}:${alert.type}`
    this.alertCooldowns.set(key, Date.now())
  }

  /**
   * Send alert through configured channels
   */
  async sendAlert(alert: Alert): Promise<boolean> {
    if (this.shouldSuppressAlert(alert)) {
      logger.debug('[QualityAlerting] Alert suppressed', { type: alert.type })
      return false
    }

    try {
      // Store alert in database
      await this.storeAlert(alert)

      // Send through each enabled channel
      const sendPromises = this.config.channels
        .filter((c) => c.enabled)
        .filter((c) => !c.severityFilter || c.severityFilter.includes(alert.severity))
        .map((channelConfig) => this.sendToChannel(alert, channelConfig))

      await Promise.all(sendPromises)

      // Record that alert was sent
      this.recordAlertSent(alert)

      logger.info('[QualityAlerting] Alert sent:', {
        type: alert.type,
        severity: alert.severity,
        callId: alert.callId,
      })

      return true
    } catch (error) {
      logger.error('[QualityAlerting] Error sending alert:', error)
      return false
    }
  }

  /**
   * Store alert in database
   */
  private async storeAlert(alert: Alert): Promise<void> {
    try {
      await this.client.mutate({
        mutation: INSERT_ALERT,
        variables: {
          alert: {
            call_id: alert.callId,
            room_id: alert.roomId,
            user_id: alert.userId,
            participant_id: alert.participantId,
            alert_type: alert.type,
            severity: alert.severity,
            message: alert.message,
            details: alert.details,
            suggestions: alert.suggestions,
          },
        },
      })
    } catch (error) {
      logger.error('[QualityAlerting] Error storing alert:', error)
      throw error
    }
  }

  /**
   * Send alert to a specific channel
   */
  private async sendToChannel(
    alert: Alert,
    channelConfig: AlertChannelConfig
  ): Promise<void> {
    switch (channelConfig.channel) {
      case 'webhook':
        await this.sendWebhook(alert, channelConfig.config)
        break
      case 'email':
        await this.sendEmail(alert, channelConfig.config)
        break
      case 'slack':
        await this.sendSlack(alert, channelConfig.config)
        break
      case 'in_app':
        // In-app notifications are handled by the frontend
        break
    }
  }

  /**
   * Send alert via webhook
   */
  private async sendWebhook(
    alert: Alert,
    config: Record<string, unknown>
  ): Promise<void> {
    const url = config.url as string
    if (!url) return

    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.headers as Record<string, string> || {}),
        },
        body: JSON.stringify({
          type: 'call_quality_alert',
          alert: {
            id: alert.id,
            type: alert.type,
            severity: alert.severity,
            callId: alert.callId,
            roomId: alert.roomId,
            userId: alert.userId,
            message: alert.message,
            details: alert.details,
            suggestions: alert.suggestions,
            createdAt: alert.createdAt.toISOString(),
          },
        }),
      })
    } catch (error) {
      logger.error('[QualityAlerting] Webhook send failed:', error)
    }
  }

  /**
   * Send alert via email
   */
  private async sendEmail(
    alert: Alert,
    config: Record<string, unknown>
  ): Promise<void> {
    const recipients = config.recipients as string[]
    if (!recipients?.length) return

    // Email sending delegates to the nself mail plugin when available.
    // Without the plugin, alerts are logged for manual review.
    logger.info('[QualityAlerting] Email alert logged (mail plugin required for delivery)', {
      recipients,
      severity: alert.severity,
      title: alert.title,
    })
  }

  /**
   * Send alert via Slack
   */
  private async sendSlack(
    alert: Alert,
    config: Record<string, unknown>
  ): Promise<void> {
    const webhookUrl = config.webhookUrl as string
    if (!webhookUrl) return

    const colorMap: Record<AlertSeverity, string> = {
      info: '#36a64f',
      warning: '#ffcc00',
      error: '#ff6600',
      critical: '#ff0000',
    }

    try {
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          attachments: [
            {
              color: colorMap[alert.severity],
              title: `Call Quality Alert: ${alert.type}`,
              text: alert.message,
              fields: [
                { title: 'Severity', value: alert.severity, short: true },
                { title: 'Call ID', value: alert.callId.substring(0, 8), short: true },
                {
                  title: 'Suggestions',
                  value: alert.suggestions.join('\n'),
                  short: false,
                },
              ],
              footer: 'nchat Quality Monitoring',
              ts: Math.floor(alert.createdAt.getTime() / 1000),
            },
          ],
        }),
      })
    } catch (error) {
      logger.error('[QualityAlerting] Slack send failed:', error)
    }
  }

  /**
   * Get alert history
   */
  async getAlertHistory(filters: {
    callId?: string
    roomId?: string
    userId?: string
    severity?: AlertSeverity
    since?: Date
    limit?: number
    offset?: number
  }): Promise<AlertHistory> {
    try {
      const { data, errors } = await this.client.query({
        query: GET_ALERTS,
        variables: {
          callId: filters.callId || null,
          roomId: filters.roomId || null,
          userId: filters.userId || null,
          severity: filters.severity || null,
          since: filters.since?.toISOString() || null,
          limit: filters.limit || 100,
          offset: filters.offset || 0,
        },
        fetchPolicy: 'no-cache',
      })

      if (errors?.length) {
        logger.error('[QualityAlerting] Error fetching alerts:', errors)
        throw new Error('Failed to fetch alerts')
      }

      const dbAlerts = data?.nchat_call_quality_alerts || []
      const totalCount = data?.nchat_call_quality_alerts_aggregate?.aggregate?.count || 0

      // Transform to Alert objects
      const alerts: Alert[] = dbAlerts.map((a: Record<string, unknown>) => ({
        id: a.id as string,
        type: a.alert_type as AlertType,
        severity: a.severity as AlertSeverity,
        callId: a.call_id as string,
        roomId: a.room_id as string | undefined,
        userId: a.user_id as string | undefined,
        participantId: a.participant_id as string | undefined,
        message: a.message as string,
        details: (a.details as Record<string, unknown>) || {},
        suggestions: (a.suggestions as string[]) || [],
        createdAt: new Date(a.created_at as string),
        acknowledgedAt: a.acknowledged_at ? new Date(a.acknowledged_at as string) : undefined,
        resolvedAt: a.resolved_at ? new Date(a.resolved_at as string) : undefined,
        escalatedAt: a.escalated_at ? new Date(a.escalated_at as string) : undefined,
      }))

      // Calculate aggregations
      const byType: Record<AlertType, number> = {} as Record<AlertType, number>
      const bySeverity: Record<AlertSeverity, number> = { info: 0, warning: 0, error: 0, critical: 0 }
      let unacknowledgedCount = 0
      let criticalCount = 0

      alerts.forEach((alert) => {
        byType[alert.type] = (byType[alert.type] || 0) + 1
        bySeverity[alert.severity]++
        if (!alert.acknowledgedAt) unacknowledgedCount++
        if (alert.severity === 'critical') criticalCount++
      })

      return {
        alerts,
        totalCount: parseInt(String(totalCount), 10),
        unacknowledgedCount,
        criticalCount,
        byType,
        bySeverity,
      }
    } catch (error) {
      logger.error('[QualityAlerting] Error getting alert history:', error)
      throw error
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<boolean> {
    try {
      await this.client.mutate({
        mutation: UPDATE_ALERT,
        variables: {
          id: alertId,
          acknowledgedAt: new Date().toISOString(),
        },
      })
      return true
    } catch (error) {
      logger.error('[QualityAlerting] Error acknowledging alert:', error)
      return false
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<boolean> {
    try {
      await this.client.mutate({
        mutation: UPDATE_ALERT,
        variables: {
          id: alertId,
          resolvedAt: new Date().toISOString(),
        },
      })
      return true
    } catch (error) {
      logger.error('[QualityAlerting] Error resolving alert:', error)
      return false
    }
  }

  /**
   * Get alert metrics
   */
  async getAlertMetrics(since?: Date): Promise<AlertMetrics> {
    const sinceDate = since || new Date(Date.now() - 24 * 60 * 60 * 1000)

    const history = await this.getAlertHistory({
      since: sinceDate,
      limit: 10000,
    })

    const now = Date.now()
    const oneHourAgo = now - 60 * 60 * 1000

    const alertsLast24h = history.alerts.length
    const alertsLastHour = history.alerts.filter(
      (a) => a.createdAt.getTime() > oneHourAgo
    ).length

    // Calculate response times
    const acknowledgedAlerts = history.alerts.filter((a) => a.acknowledgedAt)
    const resolvedAlerts = history.alerts.filter((a) => a.resolvedAt)

    const avgResponseTime =
      acknowledgedAlerts.length > 0
        ? acknowledgedAlerts.reduce(
            (sum, a) => sum + (a.acknowledgedAt!.getTime() - a.createdAt.getTime()),
            0
          ) / acknowledgedAlerts.length
        : 0

    const avgResolutionTime =
      resolvedAlerts.length > 0
        ? resolvedAlerts.reduce(
            (sum, a) => sum + (a.resolvedAt!.getTime() - a.createdAt.getTime()),
            0
          ) / resolvedAlerts.length
        : 0

    // Get top alert types
    const topAlertTypes = Object.entries(history.byType)
      .map(([type, count]) => ({ type: type as AlertType, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    // Get top affected calls
    const callCounts: Record<string, number> = {}
    history.alerts.forEach((a) => {
      callCounts[a.callId] = (callCounts[a.callId] || 0) + 1
    })

    const topAffectedCalls = Object.entries(callCounts)
      .map(([callId, alertCount]) => ({ callId, alertCount }))
      .sort((a, b) => b.alertCount - a.alertCount)
      .slice(0, 5)

    return {
      totalAlerts: history.totalCount,
      alertsLast24h,
      alertsLastHour,
      avgResponseTime,
      avgResolutionTime,
      topAlertTypes,
      topAffectedCalls,
    }
  }

  /**
   * Check for alerts that need escalation
   */
  async checkEscalations(): Promise<void> {
    for (const rule of this.config.escalationRules) {
      if (!rule.enabled) continue

      const cutoff = new Date(Date.now() - rule.escalateAfterMs)

      const history = await this.getAlertHistory({
        since: cutoff,
        limit: 100,
      })

      // Find unacknowledged alerts that need escalation
      const alertsToEscalate = history.alerts.filter(
        (a) =>
          a.type === rule.alertType &&
          !a.acknowledgedAt &&
          !a.escalatedAt &&
          a.createdAt.getTime() < cutoff.getTime()
      )

      for (const alert of alertsToEscalate) {
        await this.escalateAlert(alert, rule)
      }
    }
  }

  /**
   * Escalate an alert
   */
  private async escalateAlert(alert: Alert, rule: EscalationRule): Promise<void> {
    try {
      // Mark as escalated
      await this.client.mutate({
        mutation: UPDATE_ALERT,
        variables: {
          id: alert.id,
          escalatedAt: new Date().toISOString(),
        },
      })

      // Create escalated alert with higher severity
      const escalatedAlert = {
        ...alert,
        id: crypto.randomUUID(),
        severity: rule.escalateTo,
        message: `[ESCALATED] ${alert.message}`,
        createdAt: new Date(),
      }

      // Send to specified channels
      for (const channel of rule.notifyChannels) {
        const channelConfig = this.config.channels.find((c) => c.channel === channel)
        if (channelConfig) {
          await this.sendToChannel(escalatedAlert, channelConfig)
        }
      }

      logger.warn('[QualityAlerting] Alert escalated:', {
        alertId: alert.id,
        type: alert.type,
        escalatedTo: rule.escalateTo,
      })
    } catch (error) {
      logger.error('[QualityAlerting] Error escalating alert:', error)
    }
  }

  /**
   * Suppress alerts of a specific type for a duration
   */
  suppressAlertType(
    callId: string,
    type: AlertType,
    durationMs: number
  ): void {
    const key = `${callId}:${type}`
    this.suppressedAlerts.set(key, Date.now() + durationMs)
  }

  /**
   * Clear suppression for an alert type
   */
  clearSuppression(callId: string, type: AlertType): void {
    const key = `${callId}:${type}`
    this.suppressedAlerts.delete(key)
  }

  /**
   * Clear all cooldowns and suppressions (for testing)
   */
  clearAllSuppressions(): void {
    this.alertCooldowns.clear()
    this.suppressedAlerts.clear()
  }
}

// Singleton instance
let serviceInstance: CallQualityAlertingService | null = null

export function getCallQualityAlertingService(): CallQualityAlertingService {
  if (!serviceInstance) {
    serviceInstance = new CallQualityAlertingService()
  }
  return serviceInstance
}

export default CallQualityAlertingService
