/**
 * Purpose:    GraphQL documents for saved messages + collections against Hasura
 *             (np_saved_messages, np_saved_collections, junction np_saved_collection_items).
 *             Hand-written gql until codegen runs; field set matches saved-types.ts.
 * Inputs:     none (document strings).
 * Outputs:    SavedDataDocument (query), collection CRUD mutations, save mutation toggles.
 * Constraints:Backend saved tables + Actions NOT live yet (see backend_pending). All writes are
 *             optimistic at the UI layer; urql refetches on success once the API ships.
 * SOT:        F-NCHAT-VITE-SAVED-QUERIES-01
 */
import { gql } from 'urql'

/** All saved messages + collections for the current account, plus aggregate stats. */
export const SavedDataDocument = gql`
  query SavedData {
    collections: np_saved_collections(order_by: { position: asc }) {
      id
      name
      description
      icon
      color
      item_count
      created_at
      updated_at
      position
      is_shared
    }
    saved: np_saved_messages(order_by: { saved_at: desc }) {
      id
      message_id
      channel_id
      channel_name
      saved_at
      content
      note
      tags
      is_starred
      has_attachments
      reminder_at
      author {
        id
        display_name
        avatar_url
      }
      collection_items {
        collection_id
      }
    }
    starred: np_saved_messages_aggregate(where: { is_starred: { _eq: true } }) {
      aggregate {
        count
      }
    }
  }
`

export const CreateCollectionDocument = gql`
  mutation CreateCollection(
    $name: String!
    $description: String
    $icon: String
    $color: String
    $position: Int!
  ) {
    insert_np_saved_collections_one(
      object: {
        name: $name
        description: $description
        icon: $icon
        color: $color
        position: $position
      }
    ) {
      id
    }
  }
`

export const DeleteCollectionDocument = gql`
  mutation DeleteCollection($id: uuid!) {
    delete_np_saved_collections_by_pk(id: $id) {
      id
    }
  }
`

export const RemoveSavedDocument = gql`
  mutation RemoveSaved($id: uuid!) {
    delete_np_saved_messages_by_pk(id: $id) {
      id
    }
  }
`

export const ToggleStarDocument = gql`
  mutation ToggleStar($id: uuid!, $isStarred: Boolean!) {
    update_np_saved_messages_by_pk(
      pk_columns: { id: $id }
      _set: { is_starred: $isStarred }
    ) {
      id
      is_starred
    }
  }
`

export const SetCollectionMembershipDocument = gql`
  mutation SetCollectionMembership($savedId: uuid!, $collectionIds: [uuid!]!) {
    delete_np_saved_collection_items(where: { saved_message_id: { _eq: $savedId } }) {
      affected_rows
    }
    insert_np_saved_collection_items(
      objects: $collectionIds
    ) {
      affected_rows
    }
  }
`
