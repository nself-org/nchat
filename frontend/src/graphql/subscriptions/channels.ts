import { gql } from "@apollo/client";

export const CHANNEL_FIELDS = gql`
  fragment ChannelFields on nchat_channels {
    id
    name
    description
    type
    is_private
    created_at
    updated_at
    owner_id
    category_id
    topic
    icon
    members_aggregate {
      aggregate {
        count
      }
    }
  }
`;

export const USER_CHANNELS_SUBSCRIPTION = gql`
  ${CHANNEL_FIELDS}
  subscription UserChannels($userId: uuid!) {
    nchat_channel_members(
      where: { user_id: { _eq: $userId } }
      order_by: { channel: { updated_at: desc } }
    ) {
      channel {
        ...ChannelFields
      }
      role
      joined_at
      is_muted
      last_read_at
    }
  }
`;

export const CHANNEL_DETAILS_SUBSCRIPTION = gql`
  ${CHANNEL_FIELDS}
  subscription ChannelDetails($channelId: uuid!) {
    nchat_channels_by_pk(id: $channelId) {
      ...ChannelFields
      members {
        user_id
        role
        user {
          id
          display_name
          avatar_url
        }
      }
    }
  }
`;

export const CHANNEL_MEMBERS_SUBSCRIPTION = gql`
  subscription ChannelMembers($channelId: uuid!) {
    nchat_channel_members(where: { channel_id: { _eq: $channelId } }) {
      user_id
      role
      joined_at
      user {
        id
        display_name
        avatar_url
        status
      }
    }
  }
`;
