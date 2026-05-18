import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Poll {
  id: string;
  channel_id: string;
  message_id: string;
  creator_id: string;
  question: string;
  options: PollOption[];
  settings: PollSettings;
  status: "active" | "closed";
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  closed_at: string | null;
  creator: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  votes_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface PollOption {
  id: string;
  poll_id: string;
  text: string;
  position: number;
  votes_aggregate: {
    aggregate: {
      count: number;
    };
  };
  votes: PollVote[];
}

export interface PollVote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
  created_at: string;
  user: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
}

export interface PollSettings {
  allowMultipleVotes: boolean;
  isAnonymous: boolean;
  allowAddOptions: boolean;
  showResultsBeforeVoting: boolean;
}

export interface CreatePollVariables {
  channelId: string;
  messageId: string;
  creatorId: string;
  question: string;
  options: { text: string; position: number }[];
  settings: PollSettings;
  endsAt?: string | null;
}

export interface VotePollVariables {
  pollId: string;
  optionId: string;
  userId: string;
}

export interface RemoveVoteVariables {
  pollId: string;
  optionId: string;
  userId: string;
}

export interface ClosePollVariables {
  pollId: string;
}

export interface AddPollOptionVariables {
  pollId: string;
  text: string;
  position: number;
}

export interface GetPollVariables {
  pollId: string;
}

export interface GetPollsByChannelVariables {
  channelId: string;
  limit?: number;
  offset?: number;
}

export interface PollSubscriptionVariables {
  pollId: string;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const POLL_VOTE_FRAGMENT = gql`
  fragment PollVote on nchat_poll_votes {
    id
    poll_id
    option_id
    user_id
    created_at
    user {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const POLL_OPTION_FRAGMENT = gql`
  fragment PollOption on nchat_poll_options {
    id
    poll_id
    text
    position
    votes_aggregate {
      aggregate {
        count
      }
    }
    votes {
      ...PollVote
    }
  }
  ${POLL_VOTE_FRAGMENT}
`;

export const POLL_FRAGMENT = gql`
  fragment Poll on nchat_polls {
    id
    channel_id
    message_id
    creator_id
    question
    settings
    status
    ends_at
    created_at
    updated_at
    closed_at
    creator {
      ...UserBasic
    }
    options(order_by: { position: asc }) {
      ...PollOption
    }
    votes_aggregate {
      aggregate {
        count
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${POLL_OPTION_FRAGMENT}
`;

export const POLL_BASIC_FRAGMENT = gql`
  fragment PollBasic on nchat_polls {
    id
    channel_id
    message_id
    creator_id
    question
    settings
    status
    ends_at
    created_at
    updated_at
    closed_at
    creator {
      ...UserBasic
    }
    options(order_by: { position: asc }) {
      id
      poll_id
      text
      position
      votes_aggregate {
        aggregate {
          count
        }
      }
    }
    votes_aggregate {
      aggregate {
        count
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get a single poll by ID with all details including votes
 */
export const GET_POLL = gql`
  query GetPoll($pollId: uuid!) {
    nchat_polls_by_pk(id: $pollId) {
      ...Poll
    }
  }
  ${POLL_FRAGMENT}
`;

/**
 * Get poll by message ID
 */
export const GET_POLL_BY_MESSAGE = gql`
  query GetPollByMessage($messageId: uuid!) {
    nchat_polls(where: { message_id: { _eq: $messageId } }, limit: 1) {
      ...Poll
    }
  }
  ${POLL_FRAGMENT}
`;

/**
 * Get polls for a channel with pagination
 */
export const GET_POLLS_BY_CHANNEL = gql`
  query GetPollsByChannel(
    $channelId: uuid!
    $limit: Int = 20
    $offset: Int = 0
  ) {
    nchat_polls(
      where: { channel_id: { _eq: $channelId } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...PollBasic
    }
    nchat_polls_aggregate(where: { channel_id: { _eq: $channelId } }) {
      aggregate {
        count
      }
    }
  }
  ${POLL_BASIC_FRAGMENT}
`;

/**
 * Get active polls in a channel
 */
export const GET_ACTIVE_POLLS = gql`
  query GetActivePolls($channelId: uuid!) {
    nchat_polls(
      where: {
        channel_id: { _eq: $channelId }
        status: { _eq: "active" }
        _or: [{ ends_at: { _is_null: true } }, { ends_at: { _gt: "now()" } }]
      }
      order_by: { created_at: desc }
    ) {
      ...PollBasic
    }
  }
  ${POLL_BASIC_FRAGMENT}
`;

/**
 * Get poll results (detailed vote breakdown)
 */
export const GET_POLL_RESULTS = gql`
  query GetPollResults($pollId: uuid!) {
    nchat_polls_by_pk(id: $pollId) {
      id
      question
      settings
      status
      ends_at
      created_at
      closed_at
      options(order_by: { position: asc }) {
        id
        text
        position
        votes_aggregate {
          aggregate {
            count
          }
        }
        votes(order_by: { created_at: desc }) {
          id
          user_id
          created_at
          user {
            ...UserBasic
          }
        }
      }
      votes_aggregate {
        aggregate {
          count
        }
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Get user's votes for a poll
 */
export const GET_USER_VOTES = gql`
  query GetUserVotes($pollId: uuid!, $userId: uuid!) {
    nchat_poll_votes(
      where: { poll_id: { _eq: $pollId }, user_id: { _eq: $userId } }
    ) {
      id
      option_id
      created_at
    }
  }
`;

/**
 * Get voters for a specific option
 */
export const GET_OPTION_VOTERS = gql`
  query GetOptionVoters($optionId: uuid!, $limit: Int = 50, $offset: Int = 0) {
    nchat_poll_votes(
      where: { option_id: { _eq: $optionId } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...PollVote
    }
    nchat_poll_votes_aggregate(where: { option_id: { _eq: $optionId } }) {
      aggregate {
        count
      }
    }
  }
  ${POLL_VOTE_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Create a new poll
 */
export const CREATE_POLL = gql`
  mutation CreatePoll(
    $channelId: uuid!
    $messageId: uuid!
    $creatorId: uuid!
    $question: String!
    $settings: jsonb!
    $endsAt: timestamptz
    $options: [nchat_poll_options_insert_input!]!
  ) {
    insert_nchat_polls_one(
      object: {
        channel_id: $channelId
        message_id: $messageId
        creator_id: $creatorId
        question: $question
        settings: $settings
        ends_at: $endsAt
        status: "active"
        options: { data: $options }
      }
    ) {
      ...Poll
    }
  }
  ${POLL_FRAGMENT}
`;

/**
 * Vote on a poll option
 */
export const VOTE_POLL = gql`
  mutation VotePoll($pollId: uuid!, $optionId: uuid!, $userId: uuid!) {
    insert_nchat_poll_votes_one(
      object: { poll_id: $pollId, option_id: $optionId, user_id: $userId }
      on_conflict: {
        constraint: nchat_poll_votes_poll_id_option_id_user_id_key
        update_columns: []
      }
    ) {
      id
      poll_id
      option_id
      user_id
      created_at
    }
  }
`;

/**
 * Remove a vote from a poll option
 */
export const REMOVE_VOTE = gql`
  mutation RemoveVote($pollId: uuid!, $optionId: uuid!, $userId: uuid!) {
    delete_nchat_poll_votes(
      where: {
        poll_id: { _eq: $pollId }
        option_id: { _eq: $optionId }
        user_id: { _eq: $userId }
      }
    ) {
      affected_rows
    }
  }
`;

/**
 * Remove all votes from a user for a poll (used when switching vote in single-choice)
 */
export const REMOVE_USER_VOTES = gql`
  mutation RemoveUserVotes($pollId: uuid!, $userId: uuid!) {
    delete_nchat_poll_votes(
      where: { poll_id: { _eq: $pollId }, user_id: { _eq: $userId } }
    ) {
      affected_rows
    }
  }
`;

/**
 * Close a poll
 */
export const CLOSE_POLL = gql`
  mutation ClosePoll($pollId: uuid!) {
    update_nchat_polls_by_pk(
      pk_columns: { id: $pollId }
      _set: { status: "closed", closed_at: "now()" }
    ) {
      id
      status
      closed_at
    }
  }
`;

/**
 * Reopen a poll
 */
export const REOPEN_POLL = gql`
  mutation ReopenPoll($pollId: uuid!, $endsAt: timestamptz) {
    update_nchat_polls_by_pk(
      pk_columns: { id: $pollId }
      _set: { status: "active", closed_at: null, ends_at: $endsAt }
    ) {
      id
      status
      closed_at
      ends_at
    }
  }
`;

/**
 * Update poll settings
 */
export const UPDATE_POLL_SETTINGS = gql`
  mutation UpdatePollSettings($pollId: uuid!, $settings: jsonb!) {
    update_nchat_polls_by_pk(
      pk_columns: { id: $pollId }
      _set: { settings: $settings }
    ) {
      id
      settings
    }
  }
`;

/**
 * Update poll end date
 */
export const UPDATE_POLL_END_DATE = gql`
  mutation UpdatePollEndDate($pollId: uuid!, $endsAt: timestamptz) {
    update_nchat_polls_by_pk(
      pk_columns: { id: $pollId }
      _set: { ends_at: $endsAt }
    ) {
      id
      ends_at
    }
  }
`;

/**
 * Add a new option to a poll (if allowed by settings)
 */
export const ADD_POLL_OPTION = gql`
  mutation AddPollOption($pollId: uuid!, $text: String!, $position: Int!) {
    insert_nchat_poll_options_one(
      object: { poll_id: $pollId, text: $text, position: $position }
    ) {
      id
      poll_id
      text
      position
    }
  }
`;

/**
 * Delete a poll (admin only)
 */
export const DELETE_POLL = gql`
  mutation DeletePoll($pollId: uuid!) {
    delete_nchat_poll_votes(where: { poll_id: { _eq: $pollId } }) {
      affected_rows
    }
    delete_nchat_poll_options(where: { poll_id: { _eq: $pollId } }) {
      affected_rows
    }
    delete_nchat_polls_by_pk(id: $pollId) {
      id
    }
  }
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to poll updates (new votes, status changes)
 */
export const POLL_UPDATED_SUBSCRIPTION = gql`
  subscription PollUpdated($pollId: uuid!) {
    nchat_polls_by_pk(id: $pollId) {
      ...Poll
    }
  }
  ${POLL_FRAGMENT}
`;

/**
 * Subscribe to poll votes
 */
export const POLL_VOTES_SUBSCRIPTION = gql`
  subscription PollVotes($pollId: uuid!) {
    nchat_poll_votes(
      where: { poll_id: { _eq: $pollId } }
      order_by: { created_at: desc }
    ) {
      id
      poll_id
      option_id
      user_id
      created_at
      user {
        ...UserBasic
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

/**
 * Subscribe to new polls in a channel
 */
export const CHANNEL_POLLS_SUBSCRIPTION = gql`
  subscription ChannelPolls($channelId: uuid!) {
    nchat_polls(
      where: { channel_id: { _eq: $channelId } }
      order_by: { created_at: desc }
      limit: 1
    ) {
      ...PollBasic
    }
  }
  ${POLL_BASIC_FRAGMENT}
`;
