import { gql } from "@apollo/client";

export const MESSAGE_FIELDS = gql`
  fragment MessageFields on nchat_messages {
    id
    content
    channel_id
    author_id
    created_at
    updated_at
    reply_to_id
    author {
      id
      display_name
      avatar_url
    }
  }
`;

export const CHANNEL_MESSAGES_SUBSCRIPTION = gql`
  ${MESSAGE_FIELDS}
  subscription ChannelMessages($channelId: uuid!, $limit: Int = 50) {
    nchat_messages(
      where: { channel_id: { _eq: $channelId } }
      order_by: { created_at: desc }
      limit: $limit
    ) {
      ...MessageFields
    }
  }
`;

export const NEW_MESSAGE_SUBSCRIPTION = gql`
  ${MESSAGE_FIELDS}
  subscription NewMessage($channelId: uuid!) {
    nchat_messages(
      where: { channel_id: { _eq: $channelId } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...MessageFields
    }
  }
`;
