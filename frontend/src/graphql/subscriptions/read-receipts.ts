import { gql } from "@apollo/client";

export const CHANNEL_READ_STATUS_SUBSCRIPTION = gql`
  subscription ChannelReadStatus($channelId: uuid!) {
    nchat_read_status(where: { channel_id: { _eq: $channelId } }) {
      user_id
      channel_id
      last_read_message_id
      last_read_at
      user {
        id
        display_name
        avatar_url
      }
    }
  }
`;

export const USER_UNREAD_COUNTS_SUBSCRIPTION = gql`
  subscription UserUnreadCounts($userId: uuid!) {
    nchat_channel_members(where: { user_id: { _eq: $userId } }) {
      channel_id
      last_read_at
      channel {
        id
        name
        messages_aggregate(where: { created_at: { _gt: $lastReadAt } }) {
          aggregate {
            count
          }
        }
      }
    }
  }
`;
