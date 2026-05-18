import { gql } from "@apollo/client";

// ============================================================================
// USER FRAGMENTS
// ============================================================================

export const USER_BASIC_FRAGMENT = gql`
  fragment UserBasic on nchat_users {
    id
    username
    display_name
    avatar_url
  }
`;

export const USER_PROFILE_FRAGMENT = gql`
  fragment UserProfile on nchat_users {
    id
    username
    display_name
    email
    avatar_url
    bio
    status
    status_emoji
    status_expires_at
    timezone
    locale
    created_at
    updated_at
  }
`;

export const USER_PRESENCE_FRAGMENT = gql`
  fragment UserPresence on nchat_user_presence {
    id
    user_id
    status
    last_seen_at
    device
    user {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// CHANNEL FRAGMENTS
// ============================================================================

export const CHANNEL_BASIC_FRAGMENT = gql`
  fragment ChannelBasic on nchat_channels {
    id
    name
    slug
    description
    type
    is_private
    is_archived
    is_default
  }
`;

export const CHANNEL_FULL_FRAGMENT = gql`
  fragment ChannelFull on nchat_channels {
    id
    name
    slug
    description
    type
    topic
    icon
    is_private
    is_archived
    is_default
    position
    category_id
    settings
    created_at
    updated_at
    creator {
      ...UserBasic
    }
    members_aggregate {
      aggregate {
        count
      }
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const CHANNEL_MEMBER_FRAGMENT = gql`
  fragment ChannelMember on nchat_channel_members {
    id
    user_id
    channel_id
    role
    joined_at
    last_read_at
    last_read_message_id
    notifications_enabled
    muted_until
    user {
      ...UserProfile
    }
  }
  ${USER_PROFILE_FRAGMENT}
`;

// ============================================================================
// MESSAGE FRAGMENTS
// ============================================================================

export const ATTACHMENT_FRAGMENT = gql`
  fragment Attachment on nchat_attachments {
    id
    message_id
    file_name
    file_type
    file_size
    file_url
    thumbnail_url
    width
    height
    duration
    metadata
    created_at
  }
`;

export const REACTION_FRAGMENT = gql`
  fragment Reaction on nchat_reactions {
    id
    message_id
    user_id
    emoji
    created_at
    user {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const MESSAGE_BASIC_FRAGMENT = gql`
  fragment MessageBasic on nchat_messages {
    id
    channel_id
    user_id
    content
    content_html
    type
    is_edited
    is_pinned
    is_deleted
    created_at
    edited_at
    user {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const MESSAGE_FULL_FRAGMENT = gql`
  fragment MessageFull on nchat_messages {
    id
    channel_id
    user_id
    thread_id
    parent_id
    forwarded_from_id
    content
    content_html
    type
    is_edited
    is_pinned
    is_deleted
    metadata
    created_at
    edited_at
    deleted_at
    user {
      ...UserProfile
    }
    parent {
      id
      content
      content_html
      user {
        ...UserBasic
      }
    }
    attachments {
      ...Attachment
    }
    reactions {
      ...Reaction
    }
    reactions_aggregate {
      aggregate {
        count
      }
    }
    replies_aggregate {
      aggregate {
        count
      }
    }
    mentions {
      id
      user_id
      user {
        ...UserBasic
      }
    }
  }
  ${USER_PROFILE_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
  ${ATTACHMENT_FRAGMENT}
  ${REACTION_FRAGMENT}
`;

export const MESSAGE_WITH_THREAD_FRAGMENT = gql`
  fragment MessageWithThread on nchat_messages {
    ...MessageFull
    thread {
      id
      channel_id
      message_count
      last_reply_at
      participants {
        user {
          ...UserBasic
        }
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// THREAD FRAGMENTS
// ============================================================================

export const THREAD_FRAGMENT = gql`
  fragment Thread on nchat_threads {
    id
    channel_id
    parent_message_id
    message_count
    last_reply_at
    created_at
    parent_message {
      ...MessageBasic
    }
    participants {
      id
      user_id
      joined_at
      last_read_at
      user {
        ...UserBasic
      }
    }
  }
  ${MESSAGE_BASIC_FRAGMENT}
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// NOTIFICATION FRAGMENTS
// ============================================================================

export const NOTIFICATION_FRAGMENT = gql`
  fragment Notification on nchat_notifications {
    id
    user_id
    type
    title
    body
    data
    is_read
    read_at
    created_at
    actor {
      ...UserBasic
    }
    channel {
      ...ChannelBasic
    }
    message {
      id
      content
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

// ============================================================================
// MENTION FRAGMENTS
// ============================================================================

export const MENTION_FRAGMENT = gql`
  fragment Mention on nchat_mentions {
    id
    message_id
    user_id
    type
    created_at
    message {
      ...MessageBasic
      channel {
        ...ChannelBasic
      }
    }
  }
  ${MESSAGE_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

// ============================================================================
// BOOKMARK FRAGMENTS
// ============================================================================

export const BOOKMARK_FRAGMENT = gql`
  fragment Bookmark on nchat_bookmarks {
    id
    user_id
    message_id
    note
    created_at
    message {
      ...MessageFull
      channel {
        ...ChannelBasic
      }
    }
  }
  ${MESSAGE_FULL_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;

// ============================================================================
// READ RECEIPT FRAGMENTS
// ============================================================================

export const READ_RECEIPT_FRAGMENT = gql`
  fragment ReadReceipt on nchat_read_receipts {
    id
    user_id
    channel_id
    message_id
    read_at
    user {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// TYPING INDICATOR FRAGMENTS
// ============================================================================

export const TYPING_INDICATOR_FRAGMENT = gql`
  fragment TypingIndicator on nchat_typing_indicators {
    id
    user_id
    channel_id
    thread_id
    started_at
    expires_at
    user {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// SEARCH RESULT FRAGMENTS
// ============================================================================

export const SEARCH_MESSAGE_RESULT_FRAGMENT = gql`
  fragment SearchMessageResult on nchat_messages {
    id
    content
    content_html
    type
    created_at
    user {
      ...UserBasic
    }
    channel {
      ...ChannelBasic
    }
    attachments {
      id
      file_name
      file_type
    }
  }
  ${USER_BASIC_FRAGMENT}
  ${CHANNEL_BASIC_FRAGMENT}
`;
