import { gql } from "@apollo/client";
import {
  USER_BASIC_FRAGMENT,
  CHANNEL_BASIC_FRAGMENT,
  MESSAGE_BASIC_FRAGMENT,
} from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Reminder {
  id: string;
  user_id: string;
  message_id?: string;
  channel_id?: string;
  content: string;
  note?: string;
  remind_at: string;
  timezone: string;
  status: "pending" | "completed" | "dismissed" | "snoozed";
  type: "message" | "custom" | "followup";
  is_recurring: boolean;
  recurrence_rule?: RecurrenceRule;
  completed_at?: string;
  snoozed_until?: string;
  snooze_count: number;
  created_at: string;
  updated_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url?: string;
  };
  message?: {
    id: string;
    content: string;
    type: string;
    created_at: string;
    user: {
      id: string;
      username: string;
      display_name: string;
      avatar_url?: string;
    };
    channel: {
      id: string;
      name: string;
      slug: string;
      type: string;
      is_private: boolean;
    };
  };
  channel?: {
    id: string;
    name: string;
    slug: string;
    description?: string;
    type: string;
    is_private: boolean;
    is_archived: boolean;
    is_default: boolean;
  };
}

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval: number;
  daysOfWeek?: number[];
  dayOfMonth?: number;
  endDate?: string;
  count?: number;
}

export interface CreateReminderVariables {
  userId: string;
  messageId?: string;
  channelId?: string;
  content: string;
  note?: string;
  remindAt: string;
  timezone: string;
  type?: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
}

export interface UpdateReminderVariables {
  id: string;
  content?: string;
  note?: string;
  remindAt?: string;
  timezone?: string;
  isRecurring?: boolean;
  recurrenceRule?: RecurrenceRule;
}

export interface SnoozeReminderVariables {
  id: string;
  snoozedUntil: string;
}

export interface GetRemindersVariables {
  userId: string;
  status?: string;
  channelId?: string;
  type?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const REMINDER_FRAGMENT = gql`
  fragment Reminder on nchat_reminders {
    id
    user_id
    message_id
    channel_id
    content
    note
    remind_at
    timezone
    status
    type
    is_recurring
    recurrence_rule
    completed_at
    snoozed_until
    snooze_count
    created_at
    updated_at
    user {
      ...UserBasic
    }
    message {
      id
      content
      type
      created_at
      user {
        ...UserBasic
      }
      channel {
        id
        name
        slug
        type
        is_private
      }
    }
    channel {
      ...ChannelBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

export const REMINDER_BASIC_FRAGMENT = gql`
  fragment ReminderBasic on nchat_reminders {
    id
    user_id
    content
    note
    remind_at
    timezone
    status
    type
    is_recurring
    created_at
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all reminders for a user
 * Optionally filter by status, channel, or type
 */
export const GET_REMINDERS = gql`
  query GetReminders(
    $userId: uuid!
    $status: String
    $channelId: uuid
    $type: String
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_reminders(
      where: {
        user_id: { _eq: $userId }
        status: { _eq: $status }
        channel_id: { _eq: $channelId }
        type: { _eq: $type }
      }
      order_by: { remind_at: asc }
      limit: $limit
      offset: $offset
    ) {
      ...Reminder
    }
    nchat_reminders_aggregate(
      where: {
        user_id: { _eq: $userId }
        status: { _eq: $status }
        channel_id: { _eq: $channelId }
        type: { _eq: $type }
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Get upcoming reminders (pending status, sorted by remind_at)
 */
export const GET_UPCOMING_REMINDERS = gql`
  query GetUpcomingReminders(
    $userId: uuid!
    $fromDate: timestamptz!
    $limit: Int = 20
  ) {
    nchat_reminders(
      where: {
        user_id: { _eq: $userId }
        status: { _eq: "pending" }
        remind_at: { _gte: $fromDate }
      }
      order_by: { remind_at: asc }
      limit: $limit
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Get past/completed reminders
 */
export const GET_PAST_REMINDERS = gql`
  query GetPastReminders($userId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_reminders(
      where: {
        user_id: { _eq: $userId }
        status: { _in: ["completed", "dismissed"] }
      }
      order_by: { completed_at: desc_nulls_last, remind_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Get a single reminder by ID
 */
export const GET_REMINDER = gql`
  query GetReminder($id: uuid!) {
    nchat_reminders_by_pk(id: $id) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Get reminders for a specific channel
 */
export const GET_CHANNEL_REMINDERS = gql`
  query GetChannelReminders($userId: uuid!, $channelId: uuid!) {
    nchat_reminders(
      where: {
        user_id: { _eq: $userId }
        channel_id: { _eq: $channelId }
        status: { _eq: "pending" }
      }
      order_by: { remind_at: asc }
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Get reminder for a specific message
 */
export const GET_MESSAGE_REMINDER = gql`
  query GetMessageReminder($userId: uuid!, $messageId: uuid!) {
    nchat_reminders(
      where: {
        user_id: { _eq: $userId }
        message_id: { _eq: $messageId }
        status: { _eq: "pending" }
      }
      limit: 1
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Get count of pending reminders
 */
export const GET_REMINDERS_COUNT = gql`
  query GetRemindersCount($userId: uuid!) {
    nchat_reminders_aggregate(
      where: { user_id: { _eq: $userId }, status: { _eq: "pending" } }
    ) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get due reminders (reminders that should trigger now)
 */
export const GET_DUE_REMINDERS = gql`
  query GetDueReminders($userId: uuid!, $now: timestamptz!) {
    nchat_reminders(
      where: {
        user_id: { _eq: $userId }
        status: { _eq: "pending" }
        remind_at: { _lte: $now }
      }
      order_by: { remind_at: asc }
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new reminder
 */
export const CREATE_REMINDER = gql`
  mutation CreateReminder(
    $userId: uuid!
    $messageId: uuid
    $channelId: uuid
    $content: String!
    $note: String
    $remindAt: timestamptz!
    $timezone: String!
    $type: String = "custom"
    $isRecurring: Boolean = false
    $recurrenceRule: jsonb
  ) {
    insert_nchat_reminders_one(
      object: {
        user_id: $userId
        message_id: $messageId
        channel_id: $channelId
        content: $content
        note: $note
        remind_at: $remindAt
        timezone: $timezone
        type: $type
        is_recurring: $isRecurring
        recurrence_rule: $recurrenceRule
        status: "pending"
        snooze_count: 0
      }
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Update a reminder
 */
export const UPDATE_REMINDER = gql`
  mutation UpdateReminder(
    $id: uuid!
    $content: String
    $note: String
    $remindAt: timestamptz
    $timezone: String
    $isRecurring: Boolean
    $recurrenceRule: jsonb
  ) {
    update_nchat_reminders_by_pk(
      pk_columns: { id: $id }
      _set: {
        content: $content
        note: $note
        remind_at: $remindAt
        timezone: $timezone
        is_recurring: $isRecurring
        recurrence_rule: $recurrenceRule
        updated_at: "now()"
      }
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Delete a reminder (hard delete)
 */
export const DELETE_REMINDER = gql`
  mutation DeleteReminder($id: uuid!) {
    delete_nchat_reminders_by_pk(id: $id) {
      id
    }
  }
`;

/**
 * Mark a reminder as completed
 */
export const COMPLETE_REMINDER = gql`
  mutation CompleteReminder($id: uuid!) {
    update_nchat_reminders_by_pk(
      pk_columns: { id: $id }
      _set: { status: "completed", completed_at: "now()", updated_at: "now()" }
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Dismiss a reminder without completing it
 */
export const DISMISS_REMINDER = gql`
  mutation DismissReminder($id: uuid!) {
    update_nchat_reminders_by_pk(
      pk_columns: { id: $id }
      _set: { status: "dismissed", updated_at: "now()" }
    ) {
      id
      status
      updated_at
    }
  }
`;

/**
 * Snooze a reminder
 */
export const SNOOZE_REMINDER = gql`
  mutation SnoozeReminder($id: uuid!, $snoozedUntil: timestamptz!) {
    update_nchat_reminders_by_pk(
      pk_columns: { id: $id }
      _set: {
        status: "snoozed"
        snoozed_until: $snoozedUntil
        remind_at: $snoozedUntil
        updated_at: "now()"
      }
      _inc: { snooze_count: 1 }
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Unsnooze a reminder (resume from snoozed state)
 */
export const UNSNOOZE_REMINDER = gql`
  mutation UnsnoozeReminder($id: uuid!) {
    update_nchat_reminders_by_pk(
      pk_columns: { id: $id }
      _set: { status: "pending", snoozed_until: null, updated_at: "now()" }
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Bulk delete reminders
 */
export const BULK_DELETE_REMINDERS = gql`
  mutation BulkDeleteReminders($ids: [uuid!]!) {
    delete_nchat_reminders(where: { id: { _in: $ids } }) {
      affected_rows
      returning {
        id
      }
    }
  }
`;

/**
 * Bulk complete reminders
 */
export const BULK_COMPLETE_REMINDERS = gql`
  mutation BulkCompleteReminders($ids: [uuid!]!) {
    update_nchat_reminders(
      where: { id: { _in: $ids }, status: { _eq: "pending" } }
      _set: { status: "completed", completed_at: "now()", updated_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        status
        completed_at
      }
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to due reminders for a user
 * This triggers when a reminder becomes due
 */
export const REMINDER_DUE_SUBSCRIPTION = gql`
  subscription ReminderDue($userId: uuid!, $now: timestamptz!) {
    nchat_reminders(
      where: {
        user_id: { _eq: $userId }
        status: { _eq: "pending" }
        remind_at: { _lte: $now }
      }
      order_by: { remind_at: asc }
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Subscribe to all pending reminders for a user
 */
export const REMINDERS_SUBSCRIPTION = gql`
  subscription RemindersSubscription($userId: uuid!) {
    nchat_reminders(
      where: { user_id: { _eq: $userId }, status: { _eq: "pending" } }
      order_by: { remind_at: asc }
    ) {
      ...Reminder
    }
  }
  ${REMINDER_FRAGMENT}
`;

/**
 * Subscribe to a single reminder status
 */
export const REMINDER_STATUS_SUBSCRIPTION = gql`
  subscription ReminderStatusSubscription($id: uuid!) {
    nchat_reminders_by_pk(id: $id) {
      id
      status
      remind_at
      snoozed_until
      completed_at
      updated_at
    }
  }
`;
