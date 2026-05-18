import { gql } from "@apollo/client";

export const USER_PRESENCE_SUBSCRIPTION = gql`
  subscription UserPresence($userIds: [uuid!]!) {
    nchat_presence(where: { user_id: { _in: $userIds } }) {
      user_id
      status
      last_seen
      custom_status
      custom_status_emoji
    }
  }
`;

export const CHANNEL_PRESENCE_SUBSCRIPTION = gql`
  subscription ChannelPresence($channelId: uuid!) {
    nchat_channel_members(where: { channel_id: { _eq: $channelId } }) {
      user_id
      user {
        id
        display_name
        presence {
          status
          last_seen
          custom_status
        }
      }
    }
  }
`;
