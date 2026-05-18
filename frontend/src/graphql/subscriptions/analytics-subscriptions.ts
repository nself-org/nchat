/**
 * GraphQL Subscriptions for Real-Time Analytics
 *
 * Subscribe to analytics updates in real-time using Hasura GraphQL subscriptions
 */

import { gql } from "@apollo/client";

// ============================================================================
// Real-Time Event Stream
// ============================================================================

export const SUBSCRIBE_TO_ANALYTICS_EVENTS = gql`
  subscription SubscribeToAnalyticsEvents(
    $since: timestamptz!
    $eventCategories: [String!]
  ) {
    nchat_analytics_events(
      where: {
        timestamp: { _gte: $since }
        event_category: { _in: $eventCategories }
      }
      order_by: { timestamp: desc }
      limit: 100
    ) {
      id
      timestamp
      event_name
      event_category
      user_id
      session_id
      platform
      properties
      created_at
    }
  }
`;

// ============================================================================
// Real-Time User Activity
// ============================================================================

export const SUBSCRIBE_TO_USER_ACTIVITY = gql`
  subscription SubscribeToUserActivity($since: timestamptz!) {
    nchat_analytics_user_activity(
      where: { timestamp: { _gte: $since } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      timestamp
      user_id
      messages_sent
      reactions_given
      reactions_received
      files_uploaded
      engagement_score
      session_duration_seconds
      user {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

// ============================================================================
// Real-Time Channel Activity
// ============================================================================

export const SUBSCRIBE_TO_CHANNEL_ACTIVITY = gql`
  subscription SubscribeToChannelActivity($since: timestamptz!) {
    nchat_analytics_channel_activity(
      where: { timestamp: { _gte: $since } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      timestamp
      channel_id
      messages_count
      active_users_count
      reactions_count
      files_shared
      average_response_time_seconds
      channel {
        id
        name
        type
      }
    }
  }
`;

// ============================================================================
// Real-Time Performance Metrics
// ============================================================================

export const SUBSCRIBE_TO_PERFORMANCE_METRICS = gql`
  subscription SubscribeToPerformanceMetrics($since: timestamptz!) {
    nchat_analytics_performance(
      where: { timestamp: { _gte: $since } }
      order_by: { timestamp: desc }
      limit: 100
    ) {
      id
      timestamp
      endpoint
      method
      status_code
      response_time_ms
      db_query_time_ms
      user_id
    }
  }
`;

// ============================================================================
// Real-Time Error Tracking
// ============================================================================

export const SUBSCRIBE_TO_ERRORS = gql`
  subscription SubscribeToErrors($since: timestamptz!, $resolved: Boolean) {
    nchat_analytics_errors(
      where: { timestamp: { _gte: $since }, resolved: { _eq: $resolved } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      timestamp
      error_type
      error_message
      error_stack
      user_id
      url
      platform
      severity
      resolved
      resolved_at
      resolved_by
    }
  }
`;

// ============================================================================
// Real-Time DAU/MAU Updates
// ============================================================================

export const SUBSCRIBE_TO_ACTIVE_USERS = gql`
  subscription SubscribeToActiveUsers {
    nchat_analytics_daily_user_summary(order_by: { day: desc }, limit: 30) {
      day
      user_id
      total_messages
      total_reactions
      total_files
      avg_engagement_score
      total_session_duration
    }
  }
`;

// ============================================================================
// Real-Time Search Queries
// ============================================================================

export const SUBSCRIBE_TO_SEARCH_LOGS = gql`
  subscription SubscribeToSearchLogs($since: timestamptz!) {
    nchat_analytics_search_logs(
      where: { timestamp: { _gte: $since } }
      order_by: { timestamp: desc }
      limit: 50
    ) {
      id
      timestamp
      query
      query_normalized
      user_id
      result_count
      clicked_result_id
      clicked_result_position
      search_duration_ms
    }
  }
`;

// ============================================================================
// Real-Time Feature Usage
// ============================================================================

export const SUBSCRIBE_TO_FEATURE_USAGE = gql`
  subscription SubscribeToFeatureUsage($since: timestamptz!) {
    nchat_analytics_feature_usage(
      where: { timestamp: { _gte: $since } }
      order_by: { timestamp: desc }
      limit: 100
    ) {
      id
      timestamp
      feature_name
      feature_category
      user_id
      usage_count
      platform
    }
  }
`;

// ============================================================================
// Aggregated Real-Time Metrics
// ============================================================================

export const SUBSCRIBE_TO_LIVE_METRICS = gql`
  subscription SubscribeToLiveMetrics {
    # Count of events in last 5 minutes
    events_last_5min: nchat_analytics_events_aggregate(
      where: { timestamp: { _gte: "now() - interval '5 minutes'" } }
    ) {
      aggregate {
        count
      }
    }

    # Active users in last 5 minutes
    active_users_last_5min: nchat_analytics_events_aggregate(
      where: { timestamp: { _gte: "now() - interval '5 minutes'" } }
      distinct_on: user_id
    ) {
      aggregate {
        count
      }
    }

    # Messages in last 5 minutes
    messages_last_5min: nchat_analytics_events_aggregate(
      where: {
        timestamp: { _gte: "now() - interval '5 minutes'" }
        event_category: { _eq: "messaging" }
      }
    ) {
      aggregate {
        count
      }
    }

    # Errors in last 5 minutes
    errors_last_5min: nchat_analytics_errors_aggregate(
      where: {
        timestamp: { _gte: "now() - interval '5 minutes'" }
        resolved: { _eq: false }
      }
    ) {
      aggregate {
        count
      }
    }
  }
`;

// ============================================================================
// WebSocket Connection Metrics
// ============================================================================

export const SUBSCRIBE_TO_WEBSOCKET_METRICS = gql`
  subscription SubscribeToWebSocketMetrics($since: timestamptz!) {
    nchat_analytics_websocket_metrics(
      where: { timestamp: { _gte: $since } }
      order_by: { timestamp: desc }
      limit: 100
    ) {
      id
      timestamp
      connection_id
      user_id
      messages_sent
      messages_received
      connection_duration_seconds
      latency_ms
      packet_loss_rate
      event_type
      error_message
    }
  }
`;
