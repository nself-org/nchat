/**
 * GraphQL mutations for sticker packs and stickers
 */

import { gql } from "@apollo/client";

export const CREATE_STICKER_PACK = gql`
  mutation CreateStickerPack(
    $name: String!
    $slug: String!
    $description: String
    $icon_url: String
    $creator_id: uuid!
  ) {
    insert_nchat_sticker_packs_one(
      object: {
        name: $name
        slug: $slug
        description: $description
        icon_url: $icon_url
        creator_id: $creator_id
      }
    ) {
      id
      name
      slug
      description
      icon_url
      is_default
      is_enabled
      sort_order
      created_at
      updated_at
    }
  }
`;

export const UPDATE_STICKER_PACK = gql`
  mutation UpdateStickerPack(
    $id: uuid!
    $name: String
    $description: String
    $icon_url: String
    $is_enabled: Boolean
    $sort_order: Int
  ) {
    update_nchat_sticker_packs_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        description: $description
        icon_url: $icon_url
        is_enabled: $is_enabled
        sort_order: $sort_order
      }
    ) {
      id
      name
      slug
      description
      icon_url
      is_default
      is_enabled
      sort_order
      updated_at
    }
  }
`;

export const DELETE_STICKER_PACK = gql`
  mutation DeleteStickerPack($id: uuid!) {
    delete_nchat_sticker_packs_by_pk(id: $id) {
      id
      name
    }
  }
`;

export const ADD_STICKER_TO_PACK = gql`
  mutation AddStickerToPack(
    $pack_id: uuid!
    $name: String!
    $slug: String!
    $file_url: String!
    $thumbnail_url: String
    $keywords: [String!]
    $sort_order: Int
  ) {
    insert_nchat_stickers_one(
      object: {
        pack_id: $pack_id
        name: $name
        slug: $slug
        file_url: $file_url
        thumbnail_url: $thumbnail_url
        keywords: $keywords
        sort_order: $sort_order
      }
    ) {
      id
      pack_id
      name
      slug
      file_url
      thumbnail_url
      keywords
      sort_order
      created_at
      updated_at
    }
  }
`;

export const UPDATE_STICKER = gql`
  mutation UpdateSticker(
    $id: uuid!
    $name: String
    $slug: String
    $keywords: [String!]
    $sort_order: Int
  ) {
    update_nchat_stickers_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        slug: $slug
        keywords: $keywords
        sort_order: $sort_order
      }
    ) {
      id
      name
      slug
      keywords
      sort_order
      updated_at
    }
  }
`;

export const DELETE_STICKER = gql`
  mutation DeleteSticker($id: uuid!) {
    delete_nchat_stickers_by_pk(id: $id) {
      id
      name
    }
  }
`;

export const SEND_GIF_MESSAGE = gql`
  mutation SendGifMessage(
    $channel_id: uuid!
    $user_id: uuid!
    $gif_url: String!
    $gif_metadata: jsonb
    $content: String
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $channel_id
        user_id: $user_id
        type: "gif"
        gif_url: $gif_url
        gif_metadata: $gif_metadata
        content: $content
      }
    ) {
      id
      channel_id
      user_id
      type
      content
      gif_url
      gif_metadata
      created_at
      user {
        id
        username
        display_name
        avatar_url
      }
    }
  }
`;

export const SEND_STICKER_MESSAGE = gql`
  mutation SendStickerMessage(
    $channel_id: uuid!
    $user_id: uuid!
    $sticker_id: uuid!
  ) {
    insert_nchat_messages_one(
      object: {
        channel_id: $channel_id
        user_id: $user_id
        type: "sticker"
        sticker_id: $sticker_id
      }
    ) {
      id
      channel_id
      user_id
      type
      sticker_id
      created_at
      user {
        id
        username
        display_name
        avatar_url
      }
      sticker {
        id
        name
        file_url
        thumbnail_url
        pack {
          id
          name
        }
      }
    }
  }
`;
