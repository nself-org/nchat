/**
 * Purpose:    GraphQL documents for admin pages that read directly from Hasura (canonical §2).
 *             Ported from the legacy `@/graphql/admin` Apollo documents. Where the backing
 *             Hasura tables/permissions are not yet live, the page renders AsyncScreen graceful
 *             states (the query simply errors → ErrorState) — see backend_pending in the port report.
 * Inputs:     none (documents only). Variables typed per query at call site.
 * Outputs:    urql-compatible `gql` documents.
 * Constraints:Hand-written documents (no codegen in this repo yet). Names mirror legacy GET_*.
 *             Multi-App isolation: lists are implicitly scoped by Hasura RLS on source_account_id.
 * SOT:        F-NCHAT-VITE-ADMIN-QUERIES-01
 */
import { gql } from 'urql'

/** Workspace dashboard counts (users, channels, messages). */
export const GET_ADMIN_OVERVIEW = gql`
  query AdminOverview {
    users_aggregate { aggregate { count } }
    channels_aggregate { aggregate { count } }
    messages_aggregate { aggregate { count } }
    online: users_aggregate(where: { is_online: { _eq: true } }) {
      aggregate { count }
    }
  }
`

/** Analytics window: signups + messages + per-channel + role distribution. */
export const GET_ANALYTICS_DATA = gql`
  query AdminAnalytics($startDate: timestamptz!, $endDate: timestamptz!) {
    user_signups: users(where: { created_at: { _gte: $startDate, _lte: $endDate } }) {
      id
      created_at
    }
    messages(where: { created_at: { _gte: $startDate, _lte: $endDate } }) {
      id
      created_at
    }
    active_channels: channels {
      id
      name
      messages_aggregate { aggregate { count } }
      members_aggregate { aggregate { count } }
    }
    role_distribution: roles {
      id
      name
      users_aggregate { aggregate { count } }
    }
  }
`

/** User admin list. */
export const GET_ADMIN_USERS = gql`
  query AdminUsers($limit: Int = 100) {
    users(order_by: { created_at: desc }, limit: $limit) {
      id
      username: display_name
      display_name
      email
      role: default_role
      status
      created_at
      last_seen_at
      avatar_url
    }
  }
`

/** Channel admin list. */
export const GET_ADMIN_CHANNELS = gql`
  query AdminChannels($limit: Int = 200) {
    channels(order_by: { created_at: desc }, limit: $limit) {
      id
      name
      slug
      description
      type
      is_archived
      created_at
      last_activity_at
      members_aggregate { aggregate { count } }
      messages_aggregate { aggregate { count } }
    }
  }
`

/** Single channel detail (admin). */
export const GET_ADMIN_CHANNEL = gql`
  query AdminChannel($id: uuid!) {
    channels_by_pk(id: $id) {
      id
      name
      slug
      description
      type
      is_archived
      created_at
      members_aggregate { aggregate { count } }
      messages_aggregate { aggregate { count } }
    }
  }
`

/** Single user detail (admin). */
export const GET_ADMIN_USER = gql`
  query AdminUser($id: uuid!) {
    users_by_pk(id: $id) {
      id
      display_name
      email
      default_role
      status
      created_at
      last_seen_at
      avatar_url
      messages_aggregate { aggregate { count } }
    }
  }
`

/** Audit log entries (read-direct). */
export const GET_AUDIT_LOG = gql`
  query AdminAuditLog($limit: Int = 100) {
    audit_log(order_by: { created_at: desc }, limit: $limit) {
      id
      category
      action
      severity
      description
      success
      ip_address
      created_at
      actor_id
      actor_name
    }
  }
`

/** Webhook list (read-direct). */
export const GET_WEBHOOKS = gql`
  query AdminWebhooks {
    webhooks(order_by: { created_at: desc }) {
      id
      name
      url
      events
      is_active
      created_at
    }
  }
`
