/**
 * Contacts GraphQL Operations
 *
 * Handles contact management, invites, and blocked users
 */

import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT, USER_PROFILE_FRAGMENT } from "./fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ContactRelationshipStatus =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "blocked"
  | "blocked_by";

export type ContactDiscoveryMethod =
  | "phone"
  | "email"
  | "username"
  | "qr_code"
  | "invite_link"
  | "mutual_contact"
  | "channel_member";

export type ContactInviteStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "expired"
  | "cancelled";

export interface Contact {
  id: string;
  userId: string;
  contactUserId: string;
  nickname?: string;
  notes?: string;
  isFavorite: boolean;
  discoveryMethod: ContactDiscoveryMethod;
  addedAt: string;
  updatedAt: string;
  contactUser: {
    id: string;
    username: string;
    displayName: string;
    email?: string;
    avatarUrl?: string;
    bio?: string;
  };
}

export interface ContactInvite {
  id: string;
  senderId: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  code: string;
  message?: string;
  status: ContactInviteStatus;
  expiresAt: string;
  createdAt: string;
  respondedAt?: string;
  sender: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  recipient?: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

export interface BlockedContact {
  id: string;
  userId: string;
  blockedUserId: string;
  reason?: string;
  blockedAt: string;
  blockedUser: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const CONTACT_FRAGMENT = gql`
  fragment Contact on nchat_contacts {
    id
    user_id
    contact_user_id
    nickname
    notes
    is_favorite
    discovery_method
    added_at
    updated_at
    contact_user {
      ...UserProfile
    }
  }
  ${USER_PROFILE_FRAGMENT}
`;

export const CONTACT_INVITE_FRAGMENT = gql`
  fragment ContactInvite on nchat_contact_invites {
    id
    sender_id
    recipient_id
    recipient_email
    recipient_phone
    code
    message
    status
    expires_at
    created_at
    responded_at
    sender {
      ...UserBasic
    }
    recipient {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

export const BLOCKED_CONTACT_FRAGMENT = gql`
  fragment BlockedContact on nchat_blocked_contacts {
    id
    user_id
    blocked_user_id
    reason
    blocked_at
    blocked_user {
      ...UserBasic
    }
  }
  ${USER_BASIC_FRAGMENT}
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get all contacts for a user
 */
export const GET_CONTACTS = gql`
  query GetContacts($userId: uuid!, $limit: Int = 100, $offset: Int = 0) {
    nchat_contacts(
      where: { user_id: { _eq: $userId } }
      order_by: [{ is_favorite: desc }, { contact_user: { display_name: asc } }]
      limit: $limit
      offset: $offset
    ) {
      ...Contact
    }
    nchat_contacts_aggregate(where: { user_id: { _eq: $userId } }) {
      aggregate {
        count
      }
    }
  }
  ${CONTACT_FRAGMENT}
`;

/**
 * Get a single contact by ID
 */
export const GET_CONTACT = gql`
  query GetContact($id: uuid!) {
    nchat_contacts_by_pk(id: $id) {
      ...Contact
    }
  }
  ${CONTACT_FRAGMENT}
`;

/**
 * Check if user is a contact
 */
export const CHECK_IS_CONTACT = gql`
  query CheckIsContact($userId: uuid!, $contactUserId: uuid!) {
    nchat_contacts(
      where: {
        _and: [
          { user_id: { _eq: $userId } }
          { contact_user_id: { _eq: $contactUserId } }
        ]
      }
      limit: 1
    ) {
      id
    }
  }
`;

/**
 * Get favorite contacts
 */
export const GET_FAVORITE_CONTACTS = gql`
  query GetFavoriteContacts($userId: uuid!) {
    nchat_contacts(
      where: { user_id: { _eq: $userId }, is_favorite: { _eq: true } }
      order_by: { contact_user: { display_name: asc } }
    ) {
      ...Contact
    }
  }
  ${CONTACT_FRAGMENT}
`;

/**
 * Search contacts
 */
export const SEARCH_CONTACTS = gql`
  query SearchContacts($userId: uuid!, $query: String!, $limit: Int = 20) {
    nchat_contacts(
      where: {
        user_id: { _eq: $userId }
        _or: [
          { contact_user: { display_name: { _ilike: $query } } }
          { contact_user: { username: { _ilike: $query } } }
          { nickname: { _ilike: $query } }
        ]
      }
      order_by: { contact_user: { display_name: asc } }
      limit: $limit
    ) {
      ...Contact
    }
  }
  ${CONTACT_FRAGMENT}
`;

/**
 * Get mutual contacts between two users
 */
export const GET_MUTUAL_CONTACTS = gql`
  query GetMutualContacts($userId: uuid!, $otherUserId: uuid!) {
    nchat_contacts(
      where: {
        user_id: { _eq: $userId }
        contact_user_id: {
          _in: [
            # Subquery to get other user's contact IDs
          ]
        }
      }
    ) {
      ...Contact
    }
  }
  ${CONTACT_FRAGMENT}
`;

/**
 * Get sent invites
 */
export const GET_SENT_INVITES = gql`
  query GetSentInvites($userId: uuid!, $status: String) {
    nchat_contact_invites(
      where: { sender_id: { _eq: $userId }, status: { _eq: $status } }
      order_by: { created_at: desc }
    ) {
      ...ContactInvite
    }
  }
  ${CONTACT_INVITE_FRAGMENT}
`;

/**
 * Get received invites
 */
export const GET_RECEIVED_INVITES = gql`
  query GetReceivedInvites($userId: uuid!, $status: String) {
    nchat_contact_invites(
      where: { recipient_id: { _eq: $userId }, status: { _eq: $status } }
      order_by: { created_at: desc }
    ) {
      ...ContactInvite
    }
  }
  ${CONTACT_INVITE_FRAGMENT}
`;

/**
 * Get pending invites (both sent and received)
 */
export const GET_PENDING_INVITES = gql`
  query GetPendingInvites($userId: uuid!) {
    sent: nchat_contact_invites(
      where: { sender_id: { _eq: $userId }, status: { _eq: "pending" } }
      order_by: { created_at: desc }
    ) {
      ...ContactInvite
    }
    received: nchat_contact_invites(
      where: { recipient_id: { _eq: $userId }, status: { _eq: "pending" } }
      order_by: { created_at: desc }
    ) {
      ...ContactInvite
    }
  }
  ${CONTACT_INVITE_FRAGMENT}
`;

/**
 * Get invite by code
 */
export const GET_INVITE_BY_CODE = gql`
  query GetInviteByCode($code: String!) {
    nchat_contact_invites(where: { code: { _eq: $code } }, limit: 1) {
      ...ContactInvite
    }
  }
  ${CONTACT_INVITE_FRAGMENT}
`;

/**
 * Get blocked contacts
 */
export const GET_BLOCKED_CONTACTS = gql`
  query GetBlockedContacts($userId: uuid!) {
    nchat_blocked_contacts(
      where: { user_id: { _eq: $userId } }
      order_by: { blocked_at: desc }
    ) {
      ...BlockedContact
    }
  }
  ${BLOCKED_CONTACT_FRAGMENT}
`;

/**
 * Check if user is blocked
 */
export const CHECK_IS_BLOCKED = gql`
  query CheckIsBlocked($userId: uuid!, $blockedUserId: uuid!) {
    nchat_blocked_contacts(
      where: {
        _and: [
          { user_id: { _eq: $userId } }
          { blocked_user_id: { _eq: $blockedUserId } }
        ]
      }
      limit: 1
    ) {
      id
    }
  }
`;

/**
 * Discover users by username or email
 */
export const DISCOVER_USERS = gql`
  query DiscoverUsers($query: String!, $userId: uuid!, $limit: Int = 20) {
    nchat_users(
      where: {
        _and: [
          { id: { _neq: $userId } }
          {
            _or: [
              { username: { _ilike: $query } }
              { display_name: { _ilike: $query } }
              { email: { _ilike: $query } }
            ]
          }
          # Exclude blocked users would be handled in application logic
        ]
      }
      limit: $limit
    ) {
      ...UserProfile
    }
  }
  ${USER_PROFILE_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Add a contact
 */
export const ADD_CONTACT = gql`
  mutation AddContact(
    $userId: uuid!
    $contactUserId: uuid!
    $discoveryMethod: String!
    $nickname: String
    $notes: String
  ) {
    insert_nchat_contacts_one(
      object: {
        user_id: $userId
        contact_user_id: $contactUserId
        discovery_method: $discoveryMethod
        nickname: $nickname
        notes: $notes
        is_favorite: false
      }
      on_conflict: {
        constraint: nchat_contacts_user_id_contact_user_id_key
        update_columns: []
      }
    ) {
      ...Contact
    }
  }
  ${CONTACT_FRAGMENT}
`;

/**
 * Remove a contact
 */
export const REMOVE_CONTACT = gql`
  mutation RemoveContact($id: uuid!) {
    delete_nchat_contacts_by_pk(id: $id) {
      id
    }
  }
`;

/**
 * Update contact
 */
export const UPDATE_CONTACT = gql`
  mutation UpdateContact(
    $id: uuid!
    $nickname: String
    $notes: String
    $isFavorite: Boolean
  ) {
    update_nchat_contacts_by_pk(
      pk_columns: { id: $id }
      _set: {
        nickname: $nickname
        notes: $notes
        is_favorite: $isFavorite
        updated_at: "now()"
      }
    ) {
      ...Contact
    }
  }
  ${CONTACT_FRAGMENT}
`;

/**
 * Toggle favorite status
 */
export const TOGGLE_FAVORITE_CONTACT = gql`
  mutation ToggleFavoriteContact($id: uuid!, $isFavorite: Boolean!) {
    update_nchat_contacts_by_pk(
      pk_columns: { id: $id }
      _set: { is_favorite: $isFavorite, updated_at: "now()" }
    ) {
      id
      is_favorite
    }
  }
`;

/**
 * Send a contact invite
 */
export const SEND_CONTACT_INVITE = gql`
  mutation SendContactInvite(
    $senderId: uuid!
    $recipientId: uuid
    $recipientEmail: String
    $recipientPhone: String
    $code: String!
    $message: String
    $expiresAt: timestamptz!
  ) {
    insert_nchat_contact_invites_one(
      object: {
        sender_id: $senderId
        recipient_id: $recipientId
        recipient_email: $recipientEmail
        recipient_phone: $recipientPhone
        code: $code
        message: $message
        status: "pending"
        expires_at: $expiresAt
      }
    ) {
      ...ContactInvite
    }
  }
  ${CONTACT_INVITE_FRAGMENT}
`;

/**
 * Accept a contact invite
 */
export const ACCEPT_CONTACT_INVITE = gql`
  mutation AcceptContactInvite($inviteId: uuid!, $recipientId: uuid!) {
    update_nchat_contact_invites_by_pk(
      pk_columns: { id: $inviteId }
      _set: {
        status: "accepted"
        recipient_id: $recipientId
        responded_at: "now()"
      }
    ) {
      ...ContactInvite
    }
  }
  ${CONTACT_INVITE_FRAGMENT}
`;

/**
 * Reject a contact invite
 */
export const REJECT_CONTACT_INVITE = gql`
  mutation RejectContactInvite($inviteId: uuid!) {
    update_nchat_contact_invites_by_pk(
      pk_columns: { id: $inviteId }
      _set: { status: "rejected", responded_at: "now()" }
    ) {
      id
      status
    }
  }
`;

/**
 * Cancel a sent invite
 */
export const CANCEL_CONTACT_INVITE = gql`
  mutation CancelContactInvite($inviteId: uuid!) {
    update_nchat_contact_invites_by_pk(
      pk_columns: { id: $inviteId }
      _set: { status: "cancelled", responded_at: "now()" }
    ) {
      id
      status
    }
  }
`;

/**
 * Block a user
 */
export const BLOCK_CONTACT = gql`
  mutation BlockContact(
    $userId: uuid!
    $blockedUserId: uuid!
    $reason: String
  ) {
    insert_nchat_blocked_contacts_one(
      object: {
        user_id: $userId
        blocked_user_id: $blockedUserId
        reason: $reason
      }
      on_conflict: {
        constraint: nchat_blocked_contacts_user_id_blocked_user_id_key
        update_columns: []
      }
    ) {
      ...BlockedContact
    }
    # Also remove from contacts if exists
    delete_nchat_contacts(
      where: {
        _and: [
          { user_id: { _eq: $userId } }
          { contact_user_id: { _eq: $blockedUserId } }
        ]
      }
    ) {
      affected_rows
    }
    # Cancel any pending invites
    update_nchat_contact_invites(
      where: {
        _or: [
          {
            _and: [
              { sender_id: { _eq: $userId } }
              { recipient_id: { _eq: $blockedUserId } }
            ]
          }
          {
            _and: [
              { sender_id: { _eq: $blockedUserId } }
              { recipient_id: { _eq: $userId } }
            ]
          }
        ]
        status: { _eq: "pending" }
      }
      _set: { status: "cancelled" }
    ) {
      affected_rows
    }
  }
  ${BLOCKED_CONTACT_FRAGMENT}
`;

/**
 * Unblock a user
 */
export const UNBLOCK_CONTACT = gql`
  mutation UnblockContact($userId: uuid!, $blockedUserId: uuid!) {
    delete_nchat_blocked_contacts(
      where: {
        _and: [
          { user_id: { _eq: $userId } }
          { blocked_user_id: { _eq: $blockedUserId } }
        ]
      }
    ) {
      affected_rows
      returning {
        id
        blocked_user_id
      }
    }
  }
`;

/**
 * Sync contacts from device (batch operation)
 */
export const SYNC_DEVICE_CONTACTS = gql`
  mutation SyncDeviceContacts(
    $userId: uuid!
    $contacts: [nchat_contacts_insert_input!]!
  ) {
    insert_nchat_contacts(
      objects: $contacts
      on_conflict: {
        constraint: nchat_contacts_user_id_contact_user_id_key
        update_columns: [discovery_method, updated_at]
      }
    ) {
      affected_rows
      returning {
        ...Contact
      }
    }
  }
  ${CONTACT_FRAGMENT}
`;

// ============================================================================
// SUBSCRIPTIONS
// ============================================================================

/**
 * Subscribe to contacts changes
 */
export const CONTACTS_SUBSCRIPTION = gql`
  subscription ContactsSubscription($userId: uuid!) {
    nchat_contacts(
      where: { user_id: { _eq: $userId } }
      order_by: [{ is_favorite: desc }, { contact_user: { display_name: asc } }]
    ) {
      ...Contact
    }
  }
  ${CONTACT_FRAGMENT}
`;

/**
 * Subscribe to received invites
 */
export const RECEIVED_INVITES_SUBSCRIPTION = gql`
  subscription ReceivedInvitesSubscription($userId: uuid!) {
    nchat_contact_invites(
      where: { recipient_id: { _eq: $userId }, status: { _eq: "pending" } }
      order_by: { created_at: desc }
    ) {
      ...ContactInvite
    }
  }
  ${CONTACT_INVITE_FRAGMENT}
`;

/**
 * Subscribe to blocked contacts changes
 */
export const BLOCKED_CONTACTS_SUBSCRIPTION = gql`
  subscription BlockedContactsSubscription($userId: uuid!) {
    nchat_blocked_contacts(
      where: { user_id: { _eq: $userId } }
      order_by: { blocked_at: desc }
    ) {
      ...BlockedContact
    }
  }
  ${BLOCKED_CONTACT_FRAGMENT}
`;
