/**
 * GraphQL operations for broadcast lists
 * Phase 6: Tasks 60-65
 */

import { gql } from "@apollo/client";

export const BROADCAST_LIST_FRAGMENT = gql`
  fragment BroadcastListFragment on nchat_broadcast_lists {
    id
    workspace_id
    name
    description
    icon
    owner_id
    subscription_mode
    allow_replies
    show_sender_name
    track_delivery
    track_reads
    max_subscribers
    subscriber_count
    total_messages_sent
    last_broadcast_at
    created_at
    updated_at
  }
`;

export const BROADCAST_MESSAGE_FRAGMENT = gql`
  fragment BroadcastMessageFragment on nchat_broadcast_messages {
    id
    broadcast_list_id
    content
    attachments
    sent_by
    sent_at
    scheduled_for
    is_scheduled
    total_recipients
    delivered_count
    read_count
    failed_count
  }
`;

export const GET_BROADCAST_LISTS = gql`
  ${BROADCAST_LIST_FRAGMENT}
  query GetBroadcastLists($workspace_id: uuid!) {
    nchat_broadcast_lists(
      where: { workspace_id: { _eq: $workspace_id } }
      order_by: { created_at: desc }
    ) {
      ...BroadcastListFragment
    }
  }
`;

export const CREATE_BROADCAST_LIST = gql`
  ${BROADCAST_LIST_FRAGMENT}
  mutation CreateBroadcastList(
    $workspace_id: uuid!
    $name: String!
    $owner_id: uuid!
    $description: String
    $icon: String
  ) {
    insert_nchat_broadcast_lists_one(
      object: {
        workspace_id: $workspace_id
        name: $name
        owner_id: $owner_id
        description: $description
        icon: $icon
      }
    ) {
      ...BroadcastListFragment
    }
  }
`;

export const SEND_BROADCAST = gql`
  ${BROADCAST_MESSAGE_FRAGMENT}
  mutation SendBroadcast(
    $broadcast_list_id: uuid!
    $content: String!
    $sent_by: uuid!
    $attachments: jsonb
  ) {
    insert_nchat_broadcast_messages_one(
      object: {
        broadcast_list_id: $broadcast_list_id
        content: $content
        sent_by: $sent_by
        attachments: $attachments
      }
    ) {
      ...BroadcastMessageFragment
    }
  }
`;
