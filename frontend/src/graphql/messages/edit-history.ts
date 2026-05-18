/**
 * Message Edit History GraphQL Operations
 *
 * Queries and mutations for tracking message edit history with full audit trail.
 * The nchat_message_edits table stores all versions of edited messages.
 */

import { gql } from "@apollo/client";
import { USER_BASIC_FRAGMENT } from "../fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface MessageEdit {
  id: string;
  messageId: string;
  editorId: string;
  editor: {
    id: string;
    username: string;
    displayName: string;
    avatarUrl?: string;
  };
  previousContent: string;
  newContent: string;
  editedAt: Date;
  changeSummary?: string;
}

export interface GetEditHistoryVariables {
  messageId: string;
  limit?: number;
  offset?: number;
}

export interface GetEditHistoryResult {
  nchat_message_edits: Array<{
    id: string;
    message_id: string;
    editor_id: string;
    previous_content: string;
    new_content: string;
    edited_at: string;
    change_summary: string | null;
    editor: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  }>;
  nchat_message_edits_aggregate: {
    aggregate: {
      count: number;
    };
  };
}

export interface InsertMessageEditVariables {
  messageId: string;
  editorId: string;
  previousContent: string;
  newContent: string;
  changeSummary?: string;
}

export interface InsertMessageEditResult {
  insert_nchat_message_edits_one: {
    id: string;
    message_id: string;
    editor_id: string;
    previous_content: string;
    new_content: string;
    edited_at: string;
    change_summary: string | null;
    editor: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  };
}

export interface GetEditByIdVariables {
  editId: string;
}

export interface GetEditByIdResult {
  nchat_message_edits_by_pk: {
    id: string;
    message_id: string;
    editor_id: string;
    previous_content: string;
    new_content: string;
    edited_at: string;
    change_summary: string | null;
    message: {
      id: string;
      user_id: string;
      channel_id: string;
      content: string;
    };
    editor: {
      id: string;
      username: string;
      display_name: string;
      avatar_url: string | null;
    };
  } | null;
}

// ============================================================================
// FRAGMENTS
// ============================================================================

export const MESSAGE_EDIT_FRAGMENT = gql`
  fragment MessageEdit on nchat_message_edits {
    id
    message_id
    editor_id
    previous_content
    new_content
    edited_at
    change_summary
    editor {
      id
      username
      display_name
      avatar_url
    }
  }
`;

// ============================================================================
// QUERIES
// ============================================================================

/**
 * Get edit history for a specific message
 * Returns all edits ordered by most recent first
 */
export const GET_MESSAGE_EDIT_HISTORY = gql`
  query GetMessageEditHistory(
    $messageId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_message_edits(
      where: { message_id: { _eq: $messageId } }
      order_by: { edited_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MessageEdit
    }
    nchat_message_edits_aggregate(where: { message_id: { _eq: $messageId } }) {
      aggregate {
        count
      }
    }
  }
  ${MESSAGE_EDIT_FRAGMENT}
`;

/**
 * Get a specific edit by ID
 * Used for version restoration
 */
export const GET_MESSAGE_EDIT_BY_ID = gql`
  query GetMessageEditById($editId: uuid!) {
    nchat_message_edits_by_pk(id: $editId) {
      ...MessageEdit
      message {
        id
        user_id
        channel_id
        content
      }
    }
  }
  ${MESSAGE_EDIT_FRAGMENT}
`;

/**
 * Get the most recent edit for a message
 */
export const GET_LATEST_MESSAGE_EDIT = gql`
  query GetLatestMessageEdit($messageId: uuid!) {
    nchat_message_edits(
      where: { message_id: { _eq: $messageId } }
      order_by: { edited_at: desc }
      limit: 1
    ) {
      ...MessageEdit
    }
  }
  ${MESSAGE_EDIT_FRAGMENT}
`;

/**
 * Get edit count for a message
 */
export const GET_MESSAGE_EDIT_COUNT = gql`
  query GetMessageEditCount($messageId: uuid!) {
    nchat_message_edits_aggregate(where: { message_id: { _eq: $messageId } }) {
      aggregate {
        count
      }
    }
  }
`;

/**
 * Get edits made by a specific user
 */
export const GET_USER_EDIT_HISTORY = gql`
  query GetUserEditHistory(
    $editorId: uuid!
    $limit: Int = 50
    $offset: Int = 0
  ) {
    nchat_message_edits(
      where: { editor_id: { _eq: $editorId } }
      order_by: { edited_at: desc }
      limit: $limit
      offset: $offset
    ) {
      ...MessageEdit
      message {
        id
        channel_id
        content
      }
    }
    nchat_message_edits_aggregate(where: { editor_id: { _eq: $editorId } }) {
      aggregate {
        count
      }
    }
  }
  ${MESSAGE_EDIT_FRAGMENT}
`;

// ============================================================================
// MUTATIONS
// ============================================================================

/**
 * Record a new message edit
 * Should be called BEFORE the message content is updated
 */
export const INSERT_MESSAGE_EDIT = gql`
  mutation InsertMessageEdit(
    $messageId: uuid!
    $editorId: uuid!
    $previousContent: String!
    $newContent: String!
    $changeSummary: String
  ) {
    insert_nchat_message_edits_one(
      object: {
        message_id: $messageId
        editor_id: $editorId
        previous_content: $previousContent
        new_content: $newContent
        change_summary: $changeSummary
      }
    ) {
      ...MessageEdit
    }
  }
  ${MESSAGE_EDIT_FRAGMENT}
`;

/**
 * Delete edit history for a message
 * Admin only - used when hard deleting a message
 */
export const DELETE_MESSAGE_EDIT_HISTORY = gql`
  mutation DeleteMessageEditHistory($messageId: uuid!) {
    delete_nchat_message_edits(where: { message_id: { _eq: $messageId } }) {
      affected_rows
    }
  }
`;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Transform GraphQL edit data to MessageEdit type
 */
export function transformMessageEdit(
  data: GetEditHistoryResult["nchat_message_edits"][0],
): MessageEdit {
  return {
    id: data.id,
    messageId: data.message_id,
    editorId: data.editor_id,
    previousContent: data.previous_content,
    newContent: data.new_content,
    editedAt: new Date(data.edited_at),
    changeSummary: data.change_summary || undefined,
    editor: {
      id: data.editor.id,
      username: data.editor.username,
      displayName: data.editor.display_name || data.editor.username,
      avatarUrl: data.editor.avatar_url || undefined,
    },
  };
}

/**
 * Transform array of edits
 */
export function transformMessageEdits(
  data: GetEditHistoryResult["nchat_message_edits"],
): MessageEdit[] {
  return data.map(transformMessageEdit);
}

/**
 * Generate a simple change summary based on content diff
 */
export function generateChangeSummary(
  previousContent: string,
  newContent: string,
): string {
  const prevLength = previousContent.length;
  const newLength = newContent.length;
  const diff = newLength - prevLength;

  if (diff === 0) {
    return "Content modified (same length)";
  } else if (diff > 0) {
    return `Added ${diff} characters`;
  } else {
    return `Removed ${Math.abs(diff)} characters`;
  }
}

/**
 * Calculate the percentage of content that changed
 */
export function calculateChangePercentage(
  previousContent: string,
  newContent: string,
): number {
  const maxLength = Math.max(previousContent.length, newContent.length);
  if (maxLength === 0) return 0;

  // Simple Levenshtein-like approximation based on character differences
  let commonChars = 0;
  const shorterLength = Math.min(previousContent.length, newContent.length);

  for (let i = 0; i < shorterLength; i++) {
    if (previousContent[i] === newContent[i]) {
      commonChars++;
    }
  }

  const unchanged = commonChars / maxLength;
  return Math.round((1 - unchanged) * 100);
}
