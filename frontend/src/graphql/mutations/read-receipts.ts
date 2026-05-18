import { gql } from "@apollo/client";

export const MARK_CHANNEL_READ = gql`
  mutation MarkChannelRead(
    $channelId: uuid!
    $userId: uuid!
    $messageId: uuid!
  ) {
    insert_nchat_read_status_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        last_read_message_id: $messageId
        last_read_at: "now()"
      }
      on_conflict: {
        constraint: nchat_read_status_pkey
        update_columns: [last_read_message_id, last_read_at]
      }
    ) {
      channel_id
      last_read_at
    }
  }
`;

export const UPDATE_LAST_READ = gql`
  mutation UpdateLastRead($channelId: uuid!, $userId: uuid!) {
    update_nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      _set: { last_read_at: "now()" }
    ) {
      affected_rows
    }
  }
`;
