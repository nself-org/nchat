import { gql } from "@apollo/client";

export const GET_CHANNELS = gql`
  query GetChannels {
    nchat_channels(
      where: { is_archived: { _eq: false } }
      order_by: { position: asc, name: asc }
    ) {
      id
      name
      slug
      description
      type
      topic
      is_default
      created_at
      creator {
        id
        username
        display_name
      }
      members_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const GET_CHANNEL_BY_SLUG = gql`
  query GetChannelBySlug($slug: String!) {
    nchat_channels(where: { slug: { _eq: $slug } }) {
      id
      name
      slug
      description
      type
      topic
      is_default
      created_at
      creator {
        id
        username
        display_name
        avatar_url
      }
      members {
        user {
          id
          username
          display_name
          avatar_url
          status
        }
        role
        joined_at
      }
    }
  }
`;

export const GET_USER_CHANNELS = gql`
  query GetUserChannels($userId: uuid!) {
    nchat_channel_members(where: { user_id: { _eq: $userId } }) {
      channel {
        id
        name
        slug
        type
        description
      }
      joined_at
      last_read_at
      notifications_enabled
    }
  }
`;
