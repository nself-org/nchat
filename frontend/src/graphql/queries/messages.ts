import { gql } from "@apollo/client";

export const GET_MESSAGES = gql`
  query GetMessages($channelId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_messages(
      where: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      content
      type
      is_edited
      created_at
      edited_at
      user {
        id
        username
        display_name
        avatar_url
      }
      parent {
        id
        content
        user {
          username
        }
      }
      reactions_aggregate {
        aggregate {
          count
        }
      }
      reactions {
        emoji
        user_id
      }
      attachments {
        id
        file_name
        file_type
        file_size
        file_url
        thumbnail_url
      }
    }
  }
`;

export const MESSAGE_SUBSCRIPTION = gql`
  subscription MessageSubscription($channelId: uuid!) {
    nchat_messages(
      where: { channel_id: { _eq: $channelId }, is_deleted: { _eq: false } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      id
      content
      type
      is_edited
      created_at
      edited_at
      user {
        id
        username
        display_name
        avatar_url
      }
      reactions {
        emoji
        user_id
      }
      attachments {
        id
        file_name
        file_type
        file_size
        file_url
        thumbnail_url
      }
    }
  }
`;
