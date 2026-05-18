import { gql } from "@apollo/client";

export const ADD_REACTION = gql`
  mutation AddReaction($messageId: uuid!, $emoji: String!) {
    insert_nchat_reactions_one(
      object: { message_id: $messageId, emoji: $emoji }
      on_conflict: {
        constraint: nchat_reactions_message_id_user_id_emoji_key
        update_columns: []
      }
    ) {
      id
      emoji
      message_id
    }
  }
`;

export const REMOVE_REACTION = gql`
  mutation RemoveReaction($messageId: uuid!, $emoji: String!) {
    delete_nchat_reactions(
      where: { message_id: { _eq: $messageId }, emoji: { _eq: $emoji } }
    ) {
      affected_rows
    }
  }
`;

export const TOGGLE_REACTION = gql`
  mutation ToggleReaction($messageId: uuid!, $emoji: String!, $userId: uuid!) {
    delete_nchat_reactions(
      where: {
        message_id: { _eq: $messageId }
        emoji: { _eq: $emoji }
        user_id: { _eq: $userId }
      }
    ) {
      affected_rows
    }
  }
`;
