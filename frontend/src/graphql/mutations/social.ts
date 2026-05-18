/**
 * Social Features GraphQL Mutations
 *
 * Mutations for direct messages, calls, user interactions, and social features.
 */

import { gql } from "@apollo/client";

// ============================================================================
// Direct Messages
// ============================================================================

export const CREATE_DM_CHANNEL = gql`
  mutation CreateDMChannel($userId: uuid!, $otherUserId: uuid!) {
    insert_nchat_channels_one(
      object: {
        name: ""
        slug: ""
        type: "dm"
        is_private: true
        created_by: $userId
        members: {
          data: [
            { user_id: $userId, role: "member" }
            { user_id: $otherUserId, role: "member" }
          ]
        }
      }
    ) {
      id
      type
      created_at
      members {
        user_id
        user {
          id
          display_name
          avatar_url
          status
        }
      }
    }
  }
`;

export const GET_OR_CREATE_DM = gql`
  mutation GetOrCreateDM($userId: uuid!, $otherUserId: uuid!) {
    get_or_create_dm(user_id: $userId, other_user_id: $otherUserId) {
      channel_id
      created
    }
  }
`;

export const SEND_DM = gql`
  mutation SendDM(
    $channelId: uuid!
    $userId: uuid!
    $content: String!
    $attachments: jsonb
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        content: $content
        attachments: $attachments
        type: "text"
      }
    ) {
      id
      content
      created_at
      user {
        id
        display_name
        avatar_url
      }
    }
  }
`;

// ============================================================================
// Voice/Video Calls
// ============================================================================

export const INITIATE_CALL = gql`
  mutation InitiateCall(
    $callerId: uuid!
    $calleeId: uuid!
    $type: String!
    $channelId: uuid
  ) {
    insert_nchat_calls_one(
      object: {
        caller_id: $callerId
        callee_id: $calleeId
        type: $type
        channel_id: $channelId
        status: "ringing"
        started_at: "now()"
      }
    ) {
      id
      type
      status
      started_at
      caller {
        id
        display_name
        avatar_url
      }
      callee {
        id
        display_name
        avatar_url
      }
    }
  }
`;

export const ACCEPT_CALL = gql`
  mutation AcceptCall($callId: uuid!) {
    update_nchat_calls_by_pk(
      pk_columns: { id: $callId }
      _set: { status: "active", accepted_at: "now()" }
    ) {
      id
      status
      accepted_at
    }
  }
`;

export const REJECT_CALL = gql`
  mutation RejectCall($callId: uuid!, $reason: String) {
    update_nchat_calls_by_pk(
      pk_columns: { id: $callId }
      _set: { status: "rejected", ended_at: "now()", end_reason: $reason }
    ) {
      id
      status
      ended_at
    }
  }
`;

export const END_CALL = gql`
  mutation EndCall($callId: uuid!) {
    update_nchat_calls_by_pk(
      pk_columns: { id: $callId }
      _set: { status: "ended", ended_at: "now()" }
    ) {
      id
      status
      ended_at
      started_at
      accepted_at
    }
  }
`;

// ============================================================================
// User Relationships
// ============================================================================

export const SEND_FRIEND_REQUEST = gql`
  mutation SendFriendRequest($fromUserId: uuid!, $toUserId: uuid!) {
    insert_nchat_friend_requests_one(
      object: {
        from_user_id: $fromUserId
        to_user_id: $toUserId
        status: "pending"
        sent_at: "now()"
      }
    ) {
      id
      status
      sent_at
      from_user {
        id
        display_name
        avatar_url
      }
    }
  }
`;

export const ACCEPT_FRIEND_REQUEST = gql`
  mutation AcceptFriendRequest($requestId: uuid!) {
    update_nchat_friend_requests_by_pk(
      pk_columns: { id: $requestId }
      _set: { status: "accepted", responded_at: "now()" }
    ) {
      id
      status
      responded_at
      from_user {
        id
        display_name
        avatar_url
      }
    }
  }
`;

export const REJECT_FRIEND_REQUEST = gql`
  mutation RejectFriendRequest($requestId: uuid!) {
    update_nchat_friend_requests_by_pk(
      pk_columns: { id: $requestId }
      _set: { status: "rejected", responded_at: "now()" }
    ) {
      id
      status
    }
  }
`;

export const REMOVE_FRIEND = gql`
  mutation RemoveFriend($userId: uuid!, $friendId: uuid!) {
    delete_nchat_friendships(
      where: {
        _or: [
          { user_id: { _eq: $userId }, friend_id: { _eq: $friendId } }
          { user_id: { _eq: $friendId }, friend_id: { _eq: $userId } }
        ]
      }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// Blocking Users
// ============================================================================

export const BLOCK_USER = gql`
  mutation BlockUser($userId: uuid!, $blockedUserId: uuid!, $reason: String) {
    insert_nchat_blocked_users_one(
      object: {
        user_id: $userId
        blocked_user_id: $blockedUserId
        reason: $reason
        blocked_at: "now()"
      }
    ) {
      id
      blocked_at
      blocked_user {
        id
        display_name
      }
    }
  }
`;

export const UNBLOCK_USER = gql`
  mutation UnblockUser($userId: uuid!, $blockedUserId: uuid!) {
    delete_nchat_blocked_users(
      where: {
        user_id: { _eq: $userId }
        blocked_user_id: { _eq: $blockedUserId }
      }
    ) {
      affected_rows
    }
  }
`;

// ============================================================================
// User Reporting
// ============================================================================

export const REPORT_USER = gql`
  mutation ReportUser(
    $reporterId: uuid!
    $reportedUserId: uuid!
    $reason: String!
    $details: String
  ) {
    insert_nchat_user_reports_one(
      object: {
        reporter_id: $reporterId
        reported_user_id: $reportedUserId
        reason: $reason
        details: $details
        status: "pending"
        reported_at: "now()"
      }
    ) {
      id
      status
      reported_at
    }
  }
`;

export const REPORT_MESSAGE = gql`
  mutation ReportMessage(
    $reporterId: uuid!
    $messageId: uuid!
    $reason: String!
    $details: String
  ) {
    insert_nchat_message_reports_one(
      object: {
        reporter_id: $reporterId
        message_id: $messageId
        reason: $reason
        details: $details
        status: "pending"
        reported_at: "now()"
      }
    ) {
      id
      status
      reported_at
    }
  }
`;

// ============================================================================
// User Invitations
// ============================================================================

export const INVITE_USER_TO_CHANNEL = gql`
  mutation InviteUserToChannel(
    $channelId: uuid!
    $inviterId: uuid!
    $inviteeEmail: String!
    $message: String
  ) {
    insert_nchat_channel_invites_one(
      object: {
        channel_id: $channelId
        inviter_id: $inviterId
        invitee_email: $inviteeEmail
        message: $message
        status: "pending"
        invited_at: "now()"
      }
    ) {
      id
      invitee_email
      invited_at
      channel {
        id
        name
      }
    }
  }
`;

export const ACCEPT_CHANNEL_INVITE = gql`
  mutation AcceptChannelInvite($inviteId: uuid!, $userId: uuid!) {
    update_nchat_channel_invites_by_pk(
      pk_columns: { id: $inviteId }
      _set: { status: "accepted", responded_at: "now()" }
    ) {
      id
      channel_id
      channel {
        id
        name
        slug
      }
    }
  }
`;

export const DECLINE_CHANNEL_INVITE = gql`
  mutation DeclineChannelInvite($inviteId: uuid!) {
    update_nchat_channel_invites_by_pk(
      pk_columns: { id: $inviteId }
      _set: { status: "declined", responded_at: "now()" }
    ) {
      id
    }
  }
`;

// ============================================================================
// Presence & Status
// ============================================================================

export const UPDATE_USER_STATUS = gql`
  mutation UpdateUserStatus(
    $userId: uuid!
    $status: String!
    $statusText: String
  ) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { status: $status, status_text: $statusText, last_seen_at: "now()" }
    ) {
      id
      status
      status_text
      last_seen_at
    }
  }
`;

export const UPDATE_PRESENCE = gql`
  mutation UpdatePresence($userId: uuid!, $isOnline: Boolean!) {
    update_nchat_users_by_pk(
      pk_columns: { id: $userId }
      _set: { is_online: $isOnline, last_seen_at: "now()" }
    ) {
      id
      is_online
      last_seen_at
    }
  }
`;

// ============================================================================
// File Sharing
// ============================================================================

export const SHARE_FILE = gql`
  mutation ShareFile(
    $channelId: uuid!
    $userId: uuid!
    $fileName: String!
    $fileUrl: String!
    $fileType: String!
    $fileSize: Int!
  ) {
    insert_nchat_shared_files_one(
      object: {
        channel_id: $channelId
        user_id: $userId
        file_name: $fileName
        file_url: $fileUrl
        file_type: $fileType
        file_size: $fileSize
        shared_at: "now()"
      }
    ) {
      id
      file_name
      file_url
      file_type
      file_size
      shared_at
      user {
        id
        display_name
      }
    }
  }
`;

export const DELETE_SHARED_FILE = gql`
  mutation DeleteSharedFile($fileId: uuid!) {
    delete_nchat_shared_files_by_pk(id: $fileId) {
      id
    }
  }
`;

// ============================================================================
// Type Definitions
// ============================================================================

export interface CreateDMInput {
  userId: string;
  otherUserId: string;
}

export interface InitiateCallInput {
  callerId: string;
  calleeId: string;
  type: "voice" | "video";
  channelId?: string;
}

export interface ReportUserInput {
  reporterId: string;
  reportedUserId: string;
  reason: string;
  details?: string;
}

export interface InviteToChannelInput {
  channelId: string;
  inviterId: string;
  inviteeEmail: string;
  message?: string;
}

export interface ShareFileInput {
  channelId: string;
  userId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
}
