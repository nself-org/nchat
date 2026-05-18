/**
 * Poll GraphQL Queries and Subscriptions
 *
 * Queries and subscriptions for fetching poll data and real-time updates.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Poll Queries
// ============================================================================

export const GET_POLL = gql`
  query GetPoll($pollId: uuid!) {
    nchat_polls_by_pk(id: $pollId) {
      id
      created_by
      channel_id
      question
      poll_type
      is_anonymous
      allow_add_options
      expires_at
      created_at
      closed_at
      closed_by
      creator {
        id
        display_name
        avatar_url
      }
      poll_options(order_by: { option_order: asc }) {
        id
        option_text
        option_order
        added_by
        created_at
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
  }
`;

export const GET_POLL_RESULTS = gql`
  query GetPollResults($pollId: uuid!) {
    nchat_polls_by_pk(id: $pollId) {
      id
      question
      poll_type
      is_anonymous
      created_at
      closed_at
      expires_at
      creator {
        id
        display_name
        avatar_url
      }
      poll_options(order_by: { option_order: asc }) {
        id
        option_text
        option_order
        votes_aggregate {
          aggregate {
            count
          }
        }
        votes(where: { poll: { is_anonymous: { _eq: false } } }) {
          user {
            id
            display_name
            avatar_url
          }
          voted_at
        }
      }
      total_votes: votes_aggregate {
        aggregate {
          count(distinct: true, columns: user_id)
        }
      }
    }
  }
`;

export const GET_CHANNEL_POLLS = gql`
  query GetChannelPolls($channelId: uuid!, $limit: Int = 20, $offset: Int = 0) {
    nchat_polls(
      where: { channel_id: { _eq: $channelId } }
      order_by: { created_at: desc }
      limit: $limit
      offset: $offset
    ) {
      id
      question
      poll_type
      is_anonymous
      allow_add_options
      expires_at
      created_at
      closed_at
      creator {
        id
        display_name
        avatar_url
      }
      poll_options(order_by: { option_order: asc }) {
        id
        option_text
        votes_aggregate {
          aggregate {
            count
          }
        }
      }
      votes_aggregate {
        aggregate {
          count(distinct: true, columns: user_id)
        }
      }
    }
  }
`;

export const GET_USER_POLL_VOTES = gql`
  query GetUserPollVotes($pollId: uuid!, $userId: uuid!) {
    nchat_poll_votes(
      where: { poll_id: { _eq: $pollId }, user_id: { _eq: $userId } }
    ) {
      id
      option_id
      voted_at
    }
  }
`;

export const GET_POLL_STATS = gql`
  query GetPollStats($pollId: uuid!) {
    nchat_polls_by_pk(id: $pollId) {
      id
      question
      poll_type
      is_anonymous
      created_at
      closed_at
      expires_at
      poll_options(order_by: { option_order: asc }) {
        id
        option_text
        option_order
        vote_count: votes_aggregate {
          aggregate {
            count
          }
        }
      }
      total_votes: votes_aggregate {
        aggregate {
          count(distinct: true, columns: user_id)
        }
      }
      total_vote_count: votes_aggregate {
        aggregate {
          count
        }
      }
    }
  }
`;

export const HAS_USER_VOTED = gql`
  query HasUserVoted($pollId: uuid!) {
    nchat_poll_votes(where: { poll_id: { _eq: $pollId } }, limit: 1) {
      id
      option_id
    }
  }
`;

// ============================================================================
// Poll Subscriptions (Real-time updates)
// ============================================================================

export const SUBSCRIBE_POLL_UPDATES = gql`
  subscription SubscribePollUpdates($pollId: uuid!) {
    nchat_polls_by_pk(id: $pollId) {
      id
      question
      poll_type
      is_anonymous
      closed_at
      expires_at
      poll_options(order_by: { option_order: asc }) {
        id
        option_text
        option_order
        votes_aggregate {
          aggregate {
            count
          }
        }
      }
      votes_aggregate {
        aggregate {
          count(distinct: true, columns: user_id)
        }
      }
    }
  }
`;

export const SUBSCRIBE_POLL_VOTES = gql`
  subscription SubscribePollVotes($pollId: uuid!) {
    nchat_poll_votes(
      where: { poll_id: { _eq: $pollId } }
      order_by: { voted_at: desc }
    ) {
      id
      option_id
      user_id
      voted_at
      user {
        id
        display_name
        avatar_url
      }
      option {
        id
        option_text
      }
    }
  }
`;

export const SUBSCRIBE_CHANNEL_POLLS = gql`
  subscription SubscribeChannelPolls($channelId: uuid!) {
    nchat_polls(
      where: { channel_id: { _eq: $channelId } }
      order_by: { created_at: desc }
      limit: 10
    ) {
      id
      question
      poll_type
      is_anonymous
      created_at
      closed_at
      expires_at
      creator {
        id
        display_name
      }
      poll_options(order_by: { option_order: asc }) {
        id
        option_text
        votes_aggregate {
          aggregate {
            count
          }
        }
      }
    }
  }
`;

// ============================================================================
// TypeScript Interfaces
// ============================================================================

export interface PollData {
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
  creator?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  poll_options: PollOptionData[];
  votes_aggregate?: {
    aggregate: {
      count: number;
    };
  };
  total_votes?: {
    aggregate: {
      count: number;
    };
  };
}

export interface PollOptionData {
  id: string;
  option_text: string;
  option_order: number;
  added_by?: string;
  created_at?: string;
  votes_aggregate?: {
    aggregate: {
      count: number;
    };
  };
  votes?: PollVoteData[];
  vote_count?: {
    aggregate: {
      count: number;
    };
  };
}

export interface PollVoteData {
  id: string;
  option_id: string;
  user_id: string;
  voted_at: string;
  user?: {
    id: string;
    display_name: string;
    avatar_url?: string;
  };
  option?: {
    id: string;
    option_text: string;
  };
}

export interface PollResultsData {
  nchat_polls_by_pk: PollData;
}

export interface ChannelPollsData {
  nchat_polls: PollData[];
}

export interface UserPollVotesData {
  nchat_poll_votes: {
    id: string;
    option_id: string;
    voted_at: string;
  }[];
}
