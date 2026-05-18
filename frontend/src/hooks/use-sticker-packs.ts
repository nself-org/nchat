/**
 * Hook for managing sticker packs (admin only)
 */

import { useMutation, useApolloClient } from "@apollo/client";
import { gql } from "@apollo/client";
import { useAuth } from "@/contexts/auth-context";
import { usePermission } from "@/hooks/use-permission";

// GraphQL mutations
const CREATE_STICKER_PACK = gql`
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
      created_at
    }
  }
`;

const UPDATE_STICKER_PACK = gql`
  mutation UpdateStickerPack(
    $id: uuid!
    $name: String
    $description: String
    $icon_url: String
    $is_enabled: Boolean
  ) {
    update_nchat_sticker_packs_by_pk(
      pk_columns: { id: $id }
      _set: {
        name: $name
        description: $description
        icon_url: $icon_url
        is_enabled: $is_enabled
      }
    ) {
      id
      name
      slug
      description
      icon_url
      is_enabled
      updated_at
    }
  }
`;

const DELETE_STICKER_PACK = gql`
  mutation DeleteStickerPack($id: uuid!) {
    delete_nchat_sticker_packs_by_pk(id: $id) {
      id
    }
  }
`;

const ADD_STICKER_TO_PACK = gql`
  mutation AddStickerToPack(
    $pack_id: uuid!
    $name: String!
    $slug: String!
    $file_url: String!
    $thumbnail_url: String
    $keywords: [String!]
  ) {
    insert_nchat_stickers_one(
      object: {
        pack_id: $pack_id
        name: $name
        slug: $slug
        file_url: $file_url
        thumbnail_url: $thumbnail_url
        keywords: $keywords
      }
    ) {
      id
      name
      slug
      file_url
      thumbnail_url
      keywords
      created_at
    }
  }
`;

const UPDATE_STICKER = gql`
  mutation UpdateSticker(
    $id: uuid!
    $name: String
    $slug: String
    $keywords: [String!]
  ) {
    update_nchat_stickers_by_pk(
      pk_columns: { id: $id }
      _set: { name: $name, slug: $slug, keywords: $keywords }
    ) {
      id
      name
      slug
      keywords
      updated_at
    }
  }
`;

const DELETE_STICKER = gql`
  mutation DeleteSticker($id: uuid!) {
    delete_nchat_stickers_by_pk(id: $id) {
      id
    }
  }
`;

export interface UseStickerPacksManagementResult {
  createPack: (input: {
    name: string;
    slug: string;
    description?: string;
    icon_url?: string;
  }) => Promise<any>;
  updatePack: (
    id: string,
    input: Partial<{
      name: string;
      description: string;
      icon_url: string;
      is_enabled: boolean;
    }>,
  ) => Promise<any>;
  deletePack: (id: string) => Promise<any>;
  addSticker: (input: {
    pack_id: string;
    name: string;
    slug: string;
    file_url: string;
    thumbnail_url?: string;
    keywords?: string[];
  }) => Promise<any>;
  updateSticker: (
    id: string,
    input: Partial<{
      name: string;
      slug: string;
      keywords: string[];
    }>,
  ) => Promise<any>;
  deleteSticker: (id: string) => Promise<any>;
  isLoading: boolean;
  canManage: boolean;
}

/**
 * Hook for managing sticker packs (admin/owner only)
 */
export function useStickerPacksManagement(): UseStickerPacksManagementResult {
  const { user } = useAuth();
  const { hasPermission } = usePermission();
  const apolloClient = useApolloClient();

  // Check if user can manage sticker packs (owner or admin)
  const canManage = user?.role === "owner" || user?.role === "admin";

  // Mutations
  const [createPackMutation, { loading: createLoading }] =
    useMutation(CREATE_STICKER_PACK);
  const [updatePackMutation, { loading: updateLoading }] =
    useMutation(UPDATE_STICKER_PACK);
  const [deletePackMutation, { loading: deleteLoading }] =
    useMutation(DELETE_STICKER_PACK);
  const [addStickerMutation, { loading: addStickerLoading }] =
    useMutation(ADD_STICKER_TO_PACK);
  const [updateStickerMutation, { loading: updateStickerLoading }] =
    useMutation(UPDATE_STICKER);
  const [deleteStickerMutation, { loading: deleteStickerLoading }] =
    useMutation(DELETE_STICKER);

  const isLoading =
    createLoading ||
    updateLoading ||
    deleteLoading ||
    addStickerLoading ||
    updateStickerLoading ||
    deleteStickerLoading;

  // Invalidate cache after mutations
  const invalidateCache = () => {
    // Refetch sticker packs query after mutation
    apolloClient.refetchQueries({ include: ["GetStickerPacks"] });
  };

  const createPack = async (input: {
    name: string;
    slug: string;
    description?: string;
    icon_url?: string;
  }) => {
    if (!canManage) throw new Error("Permission denied");
    if (!user?.id) throw new Error("User not authenticated");

    const result = await createPackMutation({
      variables: { ...input, creator_id: user.id },
    });
    invalidateCache();
    return result;
  };

  const updatePack = async (
    id: string,
    input: Partial<{
      name: string;
      description: string;
      icon_url: string;
      is_enabled: boolean;
    }>,
  ) => {
    if (!canManage) throw new Error("Permission denied");

    const result = await updatePackMutation({
      variables: { id, ...input },
    });
    invalidateCache();
    return result;
  };

  const deletePack = async (id: string) => {
    if (!canManage) throw new Error("Permission denied");

    const result = await deletePackMutation({
      variables: { id },
    });
    invalidateCache();
    return result;
  };

  const addSticker = async (input: {
    pack_id: string;
    name: string;
    slug: string;
    file_url: string;
    thumbnail_url?: string;
    keywords?: string[];
  }) => {
    if (!canManage) throw new Error("Permission denied");

    const result = await addStickerMutation({
      variables: input,
    });
    invalidateCache();
    return result;
  };

  const updateSticker = async (
    id: string,
    input: Partial<{
      name: string;
      slug: string;
      keywords: string[];
    }>,
  ) => {
    if (!canManage) throw new Error("Permission denied");

    const result = await updateStickerMutation({
      variables: { id, ...input },
    });
    invalidateCache();
    return result;
  };

  const deleteSticker = async (id: string) => {
    if (!canManage) throw new Error("Permission denied");

    const result = await deleteStickerMutation({
      variables: { id },
    });
    invalidateCache();
    return result;
  };

  return {
    createPack,
    updatePack,
    deletePack,
    addSticker,
    updateSticker,
    deleteSticker,
    isLoading,
    canManage,
  };
}
