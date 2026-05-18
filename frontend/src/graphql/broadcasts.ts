/**
 * Broadcast Lists GraphQL Operations
 *
 * GraphQL queries, mutations, and fragments for broadcast lists and announcements.
 * Broadcast lists allow users to send messages to multiple recipients as individual DMs.
 *
 * Tables:
 * - nchat_broadcast_lists: id, owner_id, name, recipient_ids (JSONB), created_at, updated_at
 * - nchat_broadcasts: id, list_id, sender_id, content, sent_at, delivery_count, read_count
 */

import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface BroadcastList {
  id: string;
  ownerId: string;
  name: string;
  recipientIds: string[];
  recipientCount: number;
  createdAt: string;
  updatedAt: string;
  owner?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface Broadcast {
  id: string;
  listId: string;
  senderId: string;
  content: string;
  contentHtml?: string;
  sentAt: string;
  deliveryCount: number;
  readCount: number;
  sender?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  list?: BroadcastList;
}

export interface CreateBroadcastListInput {
  name: string;
  recipientIds: string[];
}

export interface UpdateBroadcastListInput {
  name?: string;
  recipientIds?: string[];
}

export interface SendBroadcastInput {
  content: string;
  contentHtml?: string;
}

export interface GetBroadcastListsVariables {
  ownerId: string;
  limit?: number;
  offset?: number;
}

export interface GetBroadcastListVariables {
  id: string;
}

export interface CreateBroadcastListVariables {
  name: string;
  ownerId: string;
  recipientIds: unknown; // JSONB
}

export interface UpdateBroadcastListVariables {
  id: string;
  name?: string;
  recipientIds?: unknown; // JSONB
}

export interface DeleteBroadcastListVariables {
  id: string;
}

export interface SendBroadcastVariables {
  listId: string;
  senderId: string;
  content: string;
  contentHtml?: string;
}

export interface GetBroadcastHistoryVariables {
  listId: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const BROADCAST_LIST_FRAGMENT = gql`
  fragment BroadcastList on nchat_broadcast_lists {
    id
    owner_id
    name
    recipient_ids
    created_at
    updated_at
    owner {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const BROADCAST_FRAGMENT = gql`
  fragment Broadcast on nchat_broadcasts {
    id
    list_id
    sender_id
    content
    content_html
    sent_at
    delivery_count
    read_count
    sender {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const BROADCAST_WITH_LIST_FRAGMENT = gql`
  fragment BroadcastWithList on nchat_broadcasts {
    id
    list_id
    sender_id
    content
    content_html
    sent_at
    delivery_count
    read_count
    sender {
      ...UserBasic
    }
    list {
      ...BroadcastList
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${BROADCAST_LIST_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all broadcast lists owned by a user
 */
export const GET_BROADCAST_LISTS = gql`
  query GetBroadcastLists($ownerId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_broadcast_lists(
      where: { owner_id: { _eq: $ownerId } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...BroadcastList
    }
    nchat_broadcast_lists_aggregate(where: { owner_id: { _eq: $ownerId } }) {
      aggregate {
        count
      }
    }
  }
  ${BROADCAST_LIST_FRAGMENT}
`;

/**
 * Get a single broadcast list by ID with recipient details
 */
export const GET_BROADCAST_LIST = gql`
  query GetBroadcastList($id: uuid!) {
    nchat_broadcast_lists_by_pk(id: $id) {
      ...BroadcastList
    }
  }
  ${BROADCAST_LIST_FRAGMENT}
`;

/**
 * Get broadcast list with recipients expanded (fetches user details)
 */
export const GET_BROADCAST_LIST_WITH_RECIPIENTS = gql`
  query GetBroadcastListWithRecipients($id: uuid!, $recipientIds: [uuid!]!) {
    nchat_broadcast_lists_by_pk(id: $id) {
      ...BroadcastList
    }
    recipients: nchat_users(
      where: { id: { _in: $recipientIds } }
      order_by: { display_name: asc }
    ) {
      ...UserBasic
    }
  }
  ${BROADCAST_LIST_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get broadcast history for a list
 */
export const GET_BROADCAST_HISTORY = gql`
  query GetBroadcastHistory(
    $listId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_broadcasts(
      where: { list_id: { _eq: $listId } }
      order_by: { sent_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...Broadcast
    }
    nchat_broadcasts_aggregate(where: { list_id: { _eq: $listId } }) {
      aggregate {
        count
      }
    }
  }
  ${BROADCAST_FRAGMENT}
`;

/**
 * Get a single broadcast by ID
 */
export const GET_BROADCAST = gql`
  query GetBroadcast($id: uuid!) {
    nchat_broadcasts_by_pk(id: $id) {
      ...BroadcastWithList
    }
  }
  ${BROADCAST_WITH_LIST_FRAGMENT}
`;

/**
 * Get all broadcasts sent by a user
 */
export const GET_USER_BROADCASTS = gql`
  query GetUserBroadcasts(
    $senderId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_broadcasts(
      where: { sender_id: { _eq: $senderId } }
      order_by: { sent_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...BroadcastWithList
    }
    nchat_broadcasts_aggregate(where: { sender_id: { _eq: $senderId } }) {
      aggregate {
        count
      }
    }
  }
  ${BROADCAST_WITH_LIST_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new broadcast list
 */
export const CREATE_BROADCAST_LIST = gql`
  mutation CreateBroadcastList(
    $name: String!
    $ownerId: uuid!
    $recipientIds: jsonb!
  ) {
    insert_nchat_broadcast_lists_one(
      object: { name: $name, owner_id: $ownerId, recipient_ids: $recipientIds }
    ) {
      ...BroadcastList
    }
  }
  ${BROADCAST_LIST_FRAGMENT}
`;

/**
 * Update a broadcast list (name and/or recipients)
 */
export const UPDATE_BROADCAST_LIST = gql`
  mutation UpdateBroadcastList(
    $id: uuid!
    $name: String
    $recipientIds: jsonb
  ) {
    update_nchat_broadcast_lists_by_pk(
      pk_columns: { id: $id }
      _set: { name: $name, recipient_ids: $recipientIds, updated_at: "now()" }
    ) {
      ...BroadcastList
    }
  }
  ${BROADCAST_LIST_FRAGMENT}
`;

/**
 * Update broadcast list name only
 */
export const UPDATE_BROADCAST_LIST_NAME = gql`
  mutation UpdateBroadcastListName($id: uuid!, $name: String!) {
    update_nchat_broadcast_lists_by_pk(
      pk_columns: { id: $id }
      _set: { name: $name, updated_at: "now()" }
    ) {
      ...BroadcastList
    }
  }
  ${BROADCAST_LIST_FRAGMENT}
`;

/**
 * Update broadcast list recipients only
 */
export const UPDATE_BROADCAST_LIST_RECIPIENTS = gql`
  mutation UpdateBroadcastListRecipients($id: uuid!, $recipientIds: jsonb!) {
    update_nchat_broadcast_lists_by_pk(
      pk_columns: { id: $id }
      _set: { recipient_ids: $recipientIds, updated_at: "now()" }
    ) {
      ...BroadcastList
    }
  }
  ${BROADCAST_LIST_FRAGMENT}
`;

/**
 * Delete a broadcast list
 */
export const DELETE_BROADCAST_LIST = gql`
  mutation DeleteBroadcastList($id: uuid!) {
    delete_nchat_broadcast_lists_by_pk(id: $id) {
      id
      name
    }
  }
`;

/**
 * Send a broadcast (create broadcast record)
 * Note: The actual DM sending is handled by the service
 */
export const SEND_BROADCAST = gql`
  mutation SendBroadcast(
    $listId: uuid!
    $senderId: uuid!
    $content: String!
    $contentHtml: String
    $deliveryCount: Int!
  ) {
    insert_nchat_broadcasts_one(
      object: {
        list_id: $listId
        sender_id: $senderId
        content: $content
        content_html: $contentHtml
        delivery_count: $deliveryCount
        read_count: 0
      }
    ) {
      ...Broadcast
    }
  }
  ${BROADCAST_FRAGMENT}
`;

/**
 * Update broadcast delivery/read counts
 */
export const UPDATE_BROADCAST_COUNTS = gql`
  mutation UpdateBroadcastCounts(
    $id: uuid!
    $deliveryCount: Int
    $readCount: Int
  ) {
    update_nchat_broadcasts_by_pk(
      pk_columns: { id: $id }
      _set: { delivery_count: $deliveryCount, read_count: $readCount }
    ) {
      id
      delivery_count
      read_count
    }
  }
`;

/**
 * Increment read count for a broadcast
 */
export const INCREMENT_BROADCAST_READ_COUNT = gql`
  mutation IncrementBroadcastReadCount($id: uuid!) {
    update_nchat_broadcasts_by_pk(
      pk_columns: { id: $id }
      _inc: { read_count: 1 }
    ) {
      id
      read_count
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to broadcast list changes
 */
export const BROADCAST_LIST_SUBSCRIPTION = gql`
  subscription BroadcastListSubscription($ownerId: uuid!) {
    nchat_broadcast_lists(
      where: { owner_id: { _eq: $ownerId } }
      order_by: { updated_at: desc }
    ) {
      ...BroadcastList
    }
  }
  ${BROADCAST_LIST_FRAGMENT}
`;

/**
 * Subscribe to broadcasts for a list
 */
export const BROADCASTS_SUBSCRIPTION = gql`
  subscription BroadcastsSubscription($listId: uuid!) {
    nchat_broadcasts(
      where: { list_id: { _eq: $listId } }
      order_by: { sent_at: desc }
      limit: 50
    ) {
      ...Broadcast
    }
  }
  ${BROADCAST_FRAGMENT}
`;
