import { gql } from "@apollo/client";

export const UPDATE_PRESENCE = gql`
  mutation UpdatePresence(
    $userId: uuid!
    $status: String!
    $customStatus: String
    $customStatusEmoji: String
  ) {
    insert_nchat_presence_one(
      object: {
        user_id: $userId
        status: $status
        custom_status: $customStatus
        custom_status_emoji: $customStatusEmoji
        last_seen: "now()"
      }
      on_conflict: {
        constraint: nchat_presence_pkey
        update_columns: [status, custom_status, custom_status_emoji, last_seen]
      }
    ) {
      user_id
      status
      last_seen
    }
  }
`;

export const HEARTBEAT = gql`
  mutation Heartbeat($userId: uuid!) {
    update_nchat_presence_by_pk(
      pk_columns: { user_id: $userId }
      _set: { last_seen: "now()" }
    ) {
      user_id
      last_seen
    }
  }
`;
