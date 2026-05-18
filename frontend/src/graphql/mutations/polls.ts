/**
 * Poll GraphQL Mutations
 *
 * Mutations for creating, voting, and managing polls.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Poll Creation Mutations
// ============================================================================

export const CREATE_POLL = gql`
  mutation CreatePoll(
    $channelId: uuid!
    $question: String!
    $options: [nchat_poll_options_insert_input!]!
    $pollType: String!
    $isAnonymous: Boolean!
    $allowAddOptions: Boolean!
    $expiresAt: timestamptz
  ) {
    insert_nchat_polls_one(
      object: {
        channel_id: $channelId
        question: $question
        poll_type: $pollType
        is_anonymous: $isAnonymous
        allow_add_options: $allowAddOptions
        expires_at: $expiresAt
        poll_options: { data: $options }
      }
    ) {
      id
      question
      poll_type
      is_anonymous
      allow_add_options
      expires_at
      created_at
      created_by
      channel_id
      poll_options(order_by: { option_order: asc }) {
        id
        option_text
        option_order
        created_at
      }
    }
  }
`;

export const CREATE_POLL_WITH_MESSAGE = gql`
  mutation CreatePollWithMessage(
    $channelId: uuid!
    $question: String!
    $options: [nchat_poll_options_insert_input!]!
    $pollType: String!
    $isAnonymous: Boolean!
    $allowAddOptions: Boolean!
    $expiresAt: timestamptz
    $messageContent: String!
  ) {
    insert_nchat_polls_one(
      object: {
        channel_id: $channelId
        question: $question
        poll_type: $pollType
        is_anonymous: $isAnonymous
        allow_add_options: $allowAddOptions
        expires_at: $expiresAt
        poll_options: { data: $options }
        messages: {
          data: {
            channel_id: $channelId
            content: $messageContent
            message_type: "poll"
          }
        }
      }
    ) {
      id
      question
      poll_type
      is_anonymous
      allow_add_options
      expires_at
      created_at
      created_by
      channel_id
      poll_options(order_by: { option_order: asc }) {
        id
        option_text
        option_order
        created_at
      }
      messages {
        id
        content
        created_at
      }
    }
  }
`;

// ============================================================================
// Poll Voting Mutations
// ============================================================================

export const VOTE_POLL = gql`
  mutation VotePoll($pollId: uuid!, $optionIds: [uuid!]!) {
    insert_nchat_poll_votes(
      objects: [{ poll_id: $pollId, option_id: { _in: $optionIds } }]
      on_conflict: {
        constraint: unique_vote_per_option
        update_columns: [voted_at]
      }
    ) {
      affected_rows
      returning {
        id
        poll_id
        option_id
        user_id
        voted_at
      }
    }
  }
`;

export const VOTE_POLL_SINGLE = gql`
  mutation VotePollSingle($pollId: uuid!, $optionId: uuid!) {
    # First, remove any existing votes for single-choice polls
    delete_nchat_poll_votes(
      where: { poll_id: { _eq: $pollId }, user_id: { _eq: "auth.uid()" } }
    ) {
      affected_rows
    }

    # Then insert the new vote
    insert_nchat_poll_votes_one(
      object: { poll_id: $pollId, option_id: $optionId }
    ) {
      id
      poll_id
      option_id
      user_id
      voted_at
    }
  }
`;

export const VOTE_POLL_MULTIPLE = gql`
  mutation VotePollMultiple($pollId: uuid!, $optionIds: [uuid!]!) {
    # Remove existing votes first
    delete_nchat_poll_votes(
      where: { poll_id: { _eq: $pollId }, user_id: { _eq: "auth.uid()" } }
    ) {
      affected_rows
    }

    # Insert new votes
    insert_nchat_poll_votes(
      objects: [{ poll_id: $pollId, option_id: { _in: $optionIds } }]
    ) {
      affected_rows
      returning {
        id
        poll_id
        option_id
        user_id
        voted_at
      }
    }
  }
`;

export const REMOVE_VOTE = gql`
  mutation RemoveVote($pollId: uuid!, $optionId: uuid!) {
    delete_nchat_poll_votes(
      where: { poll_id: { _eq: $pollId }, option_id: { _eq: $optionId } }
    ) {
      affected_rows
      returning {
        id
        poll_id
        option_id
      }
    }
  }
`;

// ============================================================================
// Poll Management Mutations
// ============================================================================

export const CLOSE_POLL = gql`
  mutation ClosePoll($pollId: uuid!) {
    update_nchat_polls_by_pk(
      pk_columns: { id: $pollId }
      _set: { closed_at: "now()" }
    ) {
      id
      question
      closed_at
      closed_by
    }
  }
`;

export const ADD_POLL_OPTION = gql`
  mutation AddPollOption(
    $pollId: uuid!
    $optionText: String!
    $optionOrder: Int!
  ) {
    insert_nchat_poll_options_one(
      object: {
        poll_id: $pollId
        option_text: $optionText
        option_order: $optionOrder
      }
    ) {
      id
      poll_id
      option_text
      option_order
      added_by
      created_at
    }
  }
`;

export const DELETE_POLL = gql`
  mutation DeletePoll($pollId: uuid!) {
    delete_nchat_polls_by_pk(id: $pollId) {
      id
      question
    }
  }
`;

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface CreatePollInput {
  channelId: string;
  question: string;
  options: PollOptionInput[];
  pollType: "single" | "multiple";
  isAnonymous: boolean;
  allowAddOptions: boolean;
  expiresAt?: string; // ISO timestamp
}

export interface PollOptionInput {
  option_text: string;
  option_order: number;
}

export interface VotePollInput {
  pollId: string;
  optionIds: string[];
}

export interface VotePollSingleInput {
  pollId: string;
  optionId: string;
}

export interface AddPollOptionInput {
  pollId: string;
  optionText: string;
  optionOrder: number;
}

export interface Poll {
  id: string;
  created_by: string;
  channel_id: string;
  question: string;
  poll_type: "single" | "multiple";
  is_anonymous: boolean;
  allow_add_options: boolean;
  expires_at?: string;
  created_at: string;
  closed_at?: string;
  closed_by?: string;
  poll_options: PollOption[];
}

export interface PollOption {
  id: string;
  poll_id: string;
  option_text: string;
  option_order: number;
  added_by?: string;
  created_at: string;
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  voted_at: string;
}
