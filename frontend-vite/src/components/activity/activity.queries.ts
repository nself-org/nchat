/**
 * Purpose:    GraphQL documents for the activity feed against Hasura (np_activities table
 *             + mark-read Actions). Hand-written gql until app-wide codegen runs; field set
 *             matches the ActivityItem projection in activity-types.ts.
 * Inputs:     none (document strings).
 * Outputs:    ActivityFeedDocument (query), MarkActivityReadDocument + MarkAllReadDocument
 *             (mutations).
 * Constraints:Read goes through Hasura with X-Hasura-Source-Account-Id isolation; the backend
 *             np_activities table + mark-read Action are NOT live yet (see backend_pending in
 *             the port report) — the hook degrades via AsyncScreen until they ship.
 * SOT:        F-NCHAT-VITE-ACTIVITY-QUERIES-01
 */
import { gql } from 'urql'

/**
 * Activity feed query. Variables:
 *  - limit/offset for pagination
 *  - category for server-side filtering ('all' omitted by the hook)
 */
export const ActivityFeedDocument = gql`
  query ActivityFeed($limit: Int!, $offset: Int!, $category: String) {
    activities: np_activities(
      limit: $limit
      offset: $offset
      order_by: { created_at: desc }
      where: { category: { _eq: $category } }
    ) {
      id
      type
      category
      priority
      title
      preview
      href
      created_at
      is_read
      actor {
        id
        username
        display_name
        avatar_url
      }
      channel {
        id
        name
        slug
      }
    }
    activities_aggregate: np_activities_aggregate(
      where: { is_read: { _eq: false } }
    ) {
      aggregate {
        count
      }
    }
  }
`

/** Mark a single activity read (Hasura update or mark-read Action). */
export const MarkActivityReadDocument = gql`
  mutation MarkActivityRead($id: uuid!) {
    update_np_activities_by_pk(
      pk_columns: { id: $id }
      _set: { is_read: true }
    ) {
      id
      is_read
    }
  }
`

/** Mark every unread activity read for the current account. */
export const MarkAllActivitiesReadDocument = gql`
  mutation MarkAllActivitiesRead {
    update_np_activities(
      where: { is_read: { _eq: false } }
      _set: { is_read: true }
    ) {
      affected_rows
    }
  }
`
