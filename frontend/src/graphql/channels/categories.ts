/**
 * Category GraphQL Operations
 *
 * CRUD operations for channel categories/sections.
 * Connects to the Hasura GraphQL backend with nchat_categories table.
 *
 * Table: nchat_categories
 *   - id (uuid, PK)
 *   - workspace_id (uuid, FK)
 *   - name (text)
 *   - description (text, nullable)
 *   - position (int)
 *   - is_collapsed (boolean)
 *   - created_at (timestamptz)
 *   - updated_at (timestamptz)
 */

import { gql } from "@apollo/client";
import { CHANNEL_FULL_FRAGMENT } from "../fragments";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface Category {
  id: string;
  workspaceId?: string | null;
  name: string;
  description?: string | null;
  position: number;
  isCollapsed: boolean;
  createdAt: string;
  updatedAt: string;
  channels?: Array<{
    id: string;
    name: string;
    slug: string;
    type: string;
    position: number;
  }>;
}

export interface GetCategoriesVariables {
  workspaceId?: string;
  limit?: number;
  offset?: number;
}

export interface GetCategoryVariables {
  id: string;
}

export interface CreateCategoryInput {
  name: string;
  description?: string | null;
  workspaceId?: string | null;
  position?: number;
  isCollapsed?: boolean;
}

export interface UpdateCategoryInput {
  name?: string;
  description?: string | null;
  position?: number;
  isCollapsed?: boolean;
}

export interface CategoryPositionUpdate {
  id: string;
  position: number;
}

export interface MoveChannelInput {
  channelId: string;
  categoryId: string | null;
  position: number;
}

// ============================================================================
// CATEGORY FRAGMENT
// ============================================================================

export const CATEGORY_BASIC_FRAGMENT = gql`
  fragment CategoryBasic on nchat_categories {
    id
    workspace_id
    name
    description
    position
    is_collapsed
    created_at
    updated_at
  }
`;

export const CATEGORY_WITH_CHANNELS_FRAGMENT = gql`
  fragment CategoryWithChannels on nchat_categories {
    id
    workspace_id
    name
    description
    position
    is_collapsed
    created_at
    updated_at
    channels(order_by: { position: asc }) {
      ...ChannelFull
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

// ============================================================================
// QUERY OPERATIONS
// ============================================================================

/**
 * Get all categories with optional filtering and pagination
 */
export const GET_CATEGORIES = gql`
  query GetCategories($workspaceId: uuid, $limit: Int = 50, $offset: Int = 0) {
    nchat_categories(
      where: {
        _or: [
          { workspace_id: { _eq: $workspaceId } }
          { workspace_id: { _is_null: true } }
        ]
      }
      order_by: { position: asc }
      limit: $limit
      offset: $offset
    ) {
      ...CategoryBasic
    }
    nchat_categories_aggregate(
      where: {
        _or: [
          { workspace_id: { _eq: $workspaceId } }
          { workspace_id: { _is_null: true } }
        ]
      }
    ) {
      aggregate {
        count
      }
    }
  }
  ${CATEGORY_BASIC_FRAGMENT}
`;

/**
 * Get categories with their channels
 */
export const GET_CATEGORIES_WITH_CHANNELS = gql`
  query GetCategoriesWithChannels(
    $workspaceId: uuid
    $includeArchived: Boolean = false
  ) {
    nchat_categories(
      where: {
        _or: [
          { workspace_id: { _eq: $workspaceId } }
          { workspace_id: { _is_null: true } }
        ]
      }
      order_by: { position: asc }
    ) {
      id
      workspace_id
      name
      description
      position
      is_collapsed
      created_at
      updated_at
      channels(
        where: { is_archived: { _eq: $includeArchived } }
        order_by: { position: asc }
      ) {
        ...ChannelFull
      }
    }
  }
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Get a single category by ID
 */
export const GET_CATEGORY = gql`
  query GetCategory($id: uuid!) {
    nchat_categories_by_pk(id: $id) {
      ...CategoryBasic
      channels(order_by: { position: asc }) {
        ...ChannelFull
      }
    }
  }
  ${CATEGORY_BASIC_FRAGMENT}
  ${CHANNEL_FULL_FRAGMENT}
`;

/**
 * Get the maximum position for new category ordering
 */
export const GET_MAX_CATEGORY_POSITION = gql`
  query GetMaxCategoryPosition($workspaceId: uuid) {
    nchat_categories_aggregate(
      where: {
        _or: [
          { workspace_id: { _eq: $workspaceId } }
          { workspace_id: { _is_null: true } }
        ]
      }
    ) {
      aggregate {
        max {
          position
        }
      }
    }
  }
`;

// ============================================================================
// MUTATION OPERATIONS
// ============================================================================

/**
 * Create a new category
 */
export const INSERT_CATEGORY = gql`
  mutation InsertCategory(
    $name: String!
    $description: String
    $workspaceId: uuid
    $position: Int!
    $isCollapsed: Boolean = false
  ) {
    insert_nchat_categories_one(
      object: {
        name: $name
        description: $description
        workspace_id: $workspaceId
        position: $position
        is_collapsed: $isCollapsed
      }
    ) {
      ...CategoryBasic
    }
  }
  ${CATEGORY_BASIC_FRAGMENT}
`;

/**
 * Update a category
 */
export const UPDATE_CATEGORY = gql`
  mutation UpdateCategory(
    $id: uuid!
    $name: String
    $description: String
    $position: Int
    $isCollapsed: Boolean
  ) {
    update_nchat_categories_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        description: $description
        position: $position
        is_collapsed: $isCollapsed
        updated_at: "now()"
      }
    ) {
      ...CategoryBasic
    }
  }
  ${CATEGORY_BASIC_FRAGMENT}
`;

/**
 * Delete a category and move its channels to uncategorized
 */
export const DELETE_CATEGORY = gql`
  mutation DeleteCategory($id: uuid!) {
    update_nchat_channels(
      where: { category_id: { _eq: $id } }
      _set: { category_id: null, updated_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        name
        category_id
      }
    }
    delete_nchat_categories_by_pk(id: $id) {
      id
      name
    }
  }
`;

/**
 * Bulk update category positions for reordering
 */
export const REORDER_CATEGORIES = gql`
  mutation ReorderCategories($updates: [nchat_categories_updates!]!) {
    update_nchat_categories_many(updates: $updates) {
      affected_rows
      returning {
        id
        position
      }
    }
  }
`;

/**
 * Toggle category collapsed state
 */
export const TOGGLE_CATEGORY_COLLAPSED = gql`
  mutation ToggleCategoryCollapsed($id: uuid!, $isCollapsed: Boolean!) {
    update_nchat_categories_by_pk(
      pk_columns: { id: $id }
      _set: { is_collapsed: $isCollapsed, updated_at: "now()" }
    ) {
      id
      is_collapsed
      updated_at
    }
  }
`;

/**
 * Move a channel to a category
 */
export const MOVE_CHANNEL_TO_CATEGORY = gql`
  mutation MoveChannelToCategory(
    $channelId: uuid!
    $categoryId: uuid
    $position: Int!
  ) {
    update_nchat_channels_by_pk(
      pk_columns: { id: $channelId }
      _set: {
        category_id: $categoryId
        position: $position
        updated_at: "now()"
      }
    ) {
      id
      name
      category_id
      position
      updated_at
    }
  }
`;

/**
 * Bulk update channel positions within a category
 */
export const REORDER_CHANNELS_IN_CATEGORY = gql`
  mutation ReorderChannelsInCategory($updates: [nchat_channels_updates!]!) {
    update_nchat_channels_many(updates: $updates) {
      affected_rows
      returning {
        id
        position
        category_id
      }
    }
  }
`;
