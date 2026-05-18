import { gql } from "@apollo/client";

export const MESSAGE_REACTIONS_SUBSCRIPTION = gql`
  subscription MessageReactions($messageId: uuid!) {
    nchat_reactions(where: { message_id: { _eq: $messageId } }) {
      id
      emoji
      user_id
      created_at
      user {
        id
        display_name
      }
    }
  }
`;

export const MESSAGE_REACTION_COUNTS_SUBSCRIPTION = gql`
  subscription MessageReactionCounts($messageId: uuid!) {
    nchat_reactions_aggregate(where: { message_id: { _eq: $messageId } }) {
      nodes {
        emoji
      }
      aggregate {
        count
      }
    }
  }
`;

export const CHANNEL_REACTIONS_SUBSCRIPTION = gql`
  subscription ChannelReactions($channelId: uuid!, $messageIds: [uuid!]!) {
    nchat_reactions(where: { message_id: { _in: $messageIds } }) {
      id
      message_id
      emoji
      user_id
    }
  }
`;
