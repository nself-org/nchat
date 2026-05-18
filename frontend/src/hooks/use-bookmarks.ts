"use client";

/**
 * Bookmark Operations Hooks
 *
 * React hooks for bookmark management with comprehensive error handling,
 * logging, and user feedback.
 */

import { useQuery, useMutation, useSubscription } from "@apollo/client";
import { useCallback, useMemo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { logger } from "@/lib/logger";
import { useToast } from "@/hooks/use-toast";
import {
  GET_BOOKMARKS,
  GET_BOOKMARK_BY_ID,
  GET_BOOKMARK_BY_MESSAGE,
  GET_BOOKMARKS_BY_CHANNEL,
  GET_BOOKMARKS_BY_COLLECTION,
  GET_BOOKMARKS_BY_TAG,
  SEARCH_BOOKMARKS,
  GET_BOOKMARK_COUNT,
  GET_BOOKMARK_STATS,
  GET_BOOKMARK_COLLECTIONS,
  GET_BOOKMARK_COLLECTION,
  GET_COLLECTION_WITH_BOOKMARKS,
  GET_SAVED_MESSAGES,
  GET_SAVED_MESSAGE,
  SEARCH_SAVED_MESSAGES,
  GET_SAVED_MESSAGE_COUNT,
  BOOKMARK_SUBSCRIPTION,
  SAVED_MESSAGE_SUBSCRIPTION,
} from "@/graphql/queries/bookmarks";
import {
  ADD_BOOKMARK,
  REMOVE_BOOKMARK,
  REMOVE_BOOKMARK_BY_MESSAGE,
  UPDATE_BOOKMARK,
  ADD_BOOKMARK_TAG,
  REMOVE_BOOKMARK_TAG,
  ADD_TO_COLLECTION,
  REMOVE_FROM_COLLECTION,
  BATCH_ADD_BOOKMARKS,
  BATCH_REMOVE_BOOKMARKS,
  CREATE_BOOKMARK_COLLECTION,
  UPDATE_BOOKMARK_COLLECTION,
  DELETE_BOOKMARK_COLLECTION,
  SAVE_MESSAGE,
  UPDATE_SAVED_MESSAGE,
  DELETE_SAVED_MESSAGE,
  BATCH_DELETE_SAVED_MESSAGES,
  type AddBookmarkInput,
  type UpdateBookmarkInput,
  type CreateBookmarkCollectionInput,
  type UpdateBookmarkCollectionInput,
  type SaveMessageInput,
  type UpdateSavedMessageInput,
} from "@/graphql/mutations/bookmarks";
import type {
  BookmarkFilter,
  BookmarkSortBy,
  BookmarkExportFormat,
  BookmarkExportOptions,
} from "@/types/bookmark";

import { exportBookmarksToJSON, exportBookmarksToCSV } from "@/types/bookmark";

// ============================================================================
// Bookmarks Query Hook
// ============================================================================

export function useBookmarks(filter?: BookmarkFilter, sortBy?: BookmarkSortBy) {
  const { user } = useAuth();

  const { data, loading, error, fetchMore, refetch } = useQuery(GET_BOOKMARKS, {
    variables: { userId: user?.id, limit: 50 },
    skip: !user?.id,
  });

  // Subscribe to new bookmarks
  useSubscription(BOOKMARK_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  const bookmarks = useMemo(() => {
    if (!data?.nchat_bookmarks) return [];

    let filtered = [...data.nchat_bookmarks];

    // Apply filters
    if (filter?.channelId) {
      filtered = filtered.filter(
        (b) => b.message.channel_id === filter.channelId,
      );
    }

    if (filter?.collectionId) {
      filtered = filtered.filter((b) =>
        b.collection_ids?.includes(filter.collectionId),
      );
    }

    if (filter?.tag) {
      filtered = filtered.filter((b) => b.tags?.includes(filter.tag));
    }

    if (filter?.hasAttachments !== undefined) {
      filtered = filtered.filter((b) => {
        const hasAttachments =
          b.message.attachments && b.message.attachments.length > 0;
        return hasAttachments === filter.hasAttachments;
      });
    }

    if (filter?.searchQuery) {
      const query = filter.searchQuery.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.message.content?.toLowerCase().includes(query) ||
          b.note?.toLowerCase().includes(query) ||
          b.tags?.some((tag: string) => tag.toLowerCase().includes(query)),
      );
    }

    if (filter?.dateRange) {
      filtered = filtered.filter((b) => {
        const date = new Date(b.bookmarked_at);
        return date >= filter.dateRange!.start && date <= filter.dateRange!.end;
      });
    }

    // Apply sorting
    if (sortBy) {
      switch (sortBy) {
        case "bookmarked_at_desc":
          filtered.sort(
            (a, b) =>
              new Date(b.bookmarked_at).getTime() -
              new Date(a.bookmarked_at).getTime(),
          );
          break;
        case "bookmarked_at_asc":
          filtered.sort(
            (a, b) =>
              new Date(a.bookmarked_at).getTime() -
              new Date(b.bookmarked_at).getTime(),
          );
          break;
        case "message_created_at_desc":
          filtered.sort(
            (a, b) =>
              new Date(b.message.created_at).getTime() -
              new Date(a.message.created_at).getTime(),
          );
          break;
        case "message_created_at_asc":
          filtered.sort(
            (a, b) =>
              new Date(a.message.created_at).getTime() -
              new Date(b.message.created_at).getTime(),
          );
          break;
        case "channel_name":
          filtered.sort((a, b) =>
            a.message.channel.name.localeCompare(b.message.channel.name),
          );
          break;
      }
    }

    return filtered;
  }, [data, filter, sortBy]);

  const loadMore = useCallback(() => {
    if (!data?.nchat_bookmarks) return;

    return fetchMore({
      variables: {
        offset: data.nchat_bookmarks.length,
      },
      updateQuery: (prev, { fetchMoreResult }) => {
        if (!fetchMoreResult) return prev;
        return {
          nchat_bookmarks: [
            ...prev.nchat_bookmarks,
            ...fetchMoreResult.nchat_bookmarks,
          ],
        };
      },
    });
  }, [data, fetchMore]);

  return {
    bookmarks,
    loading,
    error,
    loadMore,
    refetch,
  };
}

// ============================================================================
// Single Bookmark Hooks
// ============================================================================

export function useBookmark(bookmarkId: string) {
  const { data, loading, error, refetch } = useQuery(GET_BOOKMARK_BY_ID, {
    variables: { bookmarkId },
    skip: !bookmarkId,
  });

  return {
    bookmark: data?.nchat_bookmarks_by_pk,
    loading,
    error,
    refetch,
  };
}

export function useBookmarkByMessage(messageId: string) {
  const { user } = useAuth();

  const { data, loading, error } = useQuery(GET_BOOKMARK_BY_MESSAGE, {
    variables: { userId: user?.id, messageId },
    skip: !user?.id || !messageId,
  });

  return {
    bookmark: data?.nchat_bookmarks?.[0],
    isBookmarked: !!data?.nchat_bookmarks?.[0],
    loading,
    error,
  };
}

// ============================================================================
// Bookmark Mutations Hook
// ============================================================================

export function useBookmarkMutations() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Basic mutations
  const [addBookmarkMutation, { loading: addingBookmark }] =
    useMutation(ADD_BOOKMARK);
  const [removeBookmarkMutation, { loading: removingBookmark }] =
    useMutation(REMOVE_BOOKMARK);
  const [removeBookmarkByMessageMutation] = useMutation(
    REMOVE_BOOKMARK_BY_MESSAGE,
  );
  const [updateBookmarkMutation, { loading: updatingBookmark }] =
    useMutation(UPDATE_BOOKMARK);

  // Tag mutations
  const [addTagMutation] = useMutation(ADD_BOOKMARK_TAG);
  const [removeTagMutation] = useMutation(REMOVE_BOOKMARK_TAG);

  // Collection mutations
  const [addToCollectionMutation] = useMutation(ADD_TO_COLLECTION);
  const [removeFromCollectionMutation] = useMutation(REMOVE_FROM_COLLECTION);

  // Batch mutations
  const [batchAddMutation, { loading: batchAdding }] =
    useMutation(BATCH_ADD_BOOKMARKS);
  const [batchRemoveMutation, { loading: batchRemoving }] = useMutation(
    BATCH_REMOVE_BOOKMARKS,
  );

  // ============================================================================
  // Add Bookmark
  // ============================================================================

  const addBookmark = useCallback(
    async (input: Omit<AddBookmarkInput, "userId">) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Adding bookmark", {
          userId: user.id,
          messageId: input.messageId,
        });

        const { data } = await addBookmarkMutation({
          variables: {
            userId: user.id,
            messageId: input.messageId,
            note: input.note,
            tags: input.tags || [],
            collectionIds: input.collectionIds || [],
          },
        });

        logger.debug("Bookmark added", {
          userId: user.id,
          bookmarkId: data.insert_nchat_bookmarks_one.id,
        });
        toast({
          title: "Message bookmarked",
          description: "Message has been added to your bookmarks.",
        });

        return data.insert_nchat_bookmarks_one;
      } catch (error) {
        logger.error("Failed to add bookmark", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Bookmark failed",
          description: "Could not bookmark this message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, addBookmarkMutation, toast],
  );

  // ============================================================================
  // Remove Bookmark
  // ============================================================================

  const removeBookmark = useCallback(
    async (bookmarkId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Removing bookmark", { userId: user.id, bookmarkId });

        await removeBookmarkMutation({
          variables: { bookmarkId },
        });

        logger.debug("Bookmark removed", { userId: user.id, bookmarkId });
        toast({
          title: "Bookmark removed",
          description: "Message has been removed from your bookmarks.",
        });
      } catch (error) {
        logger.error("Failed to remove bookmark", error as Error, {
          userId: user.id,
          bookmarkId,
        });
        toast({
          title: "Remove failed",
          description: "Could not remove the bookmark. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, removeBookmarkMutation, toast],
  );

  const removeBookmarkByMessage = useCallback(
    async (messageId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Removing bookmark by message", {
          userId: user.id,
          messageId,
        });

        await removeBookmarkByMessageMutation({
          variables: { userId: user.id, messageId },
        });

        logger.debug("Bookmark removed", { userId: user.id, messageId });
        toast({
          title: "Bookmark removed",
          description: "Message has been removed from your bookmarks.",
        });
      } catch (error) {
        logger.error("Failed to remove bookmark", error as Error, {
          userId: user.id,
          messageId,
        });
        throw error;
      }
    },
    [user?.id, removeBookmarkByMessageMutation, toast],
  );

  // ============================================================================
  // Update Bookmark
  // ============================================================================

  const updateBookmark = useCallback(
    async (input: UpdateBookmarkInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.debug("Updating bookmark", {
          userId: user.id,
          bookmarkId: input.bookmarkId,
        });

        const { data } = await updateBookmarkMutation({
          variables: {
            bookmarkId: input.bookmarkId,
            note: input.note,
            tags: input.tags,
            collectionIds: input.collectionIds,
          },
        });

        logger.debug("Bookmark updated", {
          userId: user.id,
          bookmarkId: input.bookmarkId,
        });
        toast({
          title: "Bookmark updated",
          description: "Your bookmark has been updated.",
        });

        return data.update_nchat_bookmarks_by_pk;
      } catch (error) {
        logger.error("Failed to update bookmark", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Update failed",
          description: "Could not update the bookmark. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateBookmarkMutation, toast],
  );

  // ============================================================================
  // Toggle Bookmark (convenience method)
  // ============================================================================

  const toggleBookmark = useCallback(
    async (messageId: string, currentBookmarkId?: string) => {
      if (currentBookmarkId) {
        await removeBookmark(currentBookmarkId);
      } else {
        await addBookmark({ messageId });
      }
    },
    [addBookmark, removeBookmark],
  );

  // ============================================================================
  // Tag Operations
  // ============================================================================

  const addTag = useCallback(
    async (bookmarkId: string, tag: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        await addTagMutation({
          variables: { bookmarkId, tag },
        });

        toast({
          title: "Tag added",
          description: `Tag "${tag}" has been added.`,
        });
      } catch (error) {
        logger.error("Failed to add tag", error as Error, {
          userId: user.id,
          bookmarkId,
        });
        throw error;
      }
    },
    [user?.id, addTagMutation, toast],
  );

  const removeTag = useCallback(
    async (bookmarkId: string, tag: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        await removeTagMutation({
          variables: { bookmarkId, tag },
        });

        toast({
          title: "Tag removed",
          description: `Tag "${tag}" has been removed.`,
        });
      } catch (error) {
        logger.error("Failed to remove tag", error as Error, {
          userId: user.id,
          bookmarkId,
        });
        throw error;
      }
    },
    [user?.id, removeTagMutation, toast],
  );

  // ============================================================================
  // Collection Operations
  // ============================================================================

  const addToCollection = useCallback(
    async (bookmarkId: string, collectionId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        await addToCollectionMutation({
          variables: { bookmarkId, collectionId },
        });

        toast({
          title: "Added to collection",
          description: "Bookmark has been added to the collection.",
        });
      } catch (error) {
        logger.error("Failed to add to collection", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Add failed",
          description: "Could not add to collection. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, addToCollectionMutation, toast],
  );

  const removeFromCollection = useCallback(
    async (bookmarkId: string, collectionId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        await removeFromCollectionMutation({
          variables: { bookmarkId, collectionId },
        });

        toast({
          title: "Removed from collection",
          description: "Bookmark has been removed from the collection.",
        });
      } catch (error) {
        logger.error("Failed to remove from collection", error as Error, {
          userId: user.id,
        });
        throw error;
      }
    },
    [user?.id, removeFromCollectionMutation],
  );

  // ============================================================================
  // Batch Operations
  // ============================================================================

  const batchAddBookmarks = useCallback(
    async (messageIds: string[], collectionId?: string, tags?: string[]) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Batch adding bookmarks", {
          userId: user.id,
          count: messageIds.length,
        });

        const bookmarks = messageIds.map((messageId) => ({
          message_id: messageId,
          user_id: user.id,
          tags: tags || [],
          collection_ids: collectionId ? [collectionId] : [],
        }));

        const { data } = await batchAddMutation({
          variables: { bookmarks },
        });

        logger.info("Bookmarks added", {
          userId: user.id,
          count: data.insert_nchat_bookmarks.affected_rows,
        });
        toast({
          title: "Bookmarks added",
          description: `${data.insert_nchat_bookmarks.affected_rows} messages have been bookmarked.`,
        });

        return data.insert_nchat_bookmarks;
      } catch (error) {
        logger.error("Failed to batch add bookmarks", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Batch add failed",
          description: "Could not add all bookmarks. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, batchAddMutation, toast],
  );

  const batchRemoveBookmarks = useCallback(
    async (bookmarkIds: string[]) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Batch removing bookmarks", {
          userId: user.id,
          count: bookmarkIds.length,
        });

        const { data } = await batchRemoveMutation({
          variables: { bookmarkIds },
        });

        logger.info("Bookmarks removed", {
          userId: user.id,
          count: data.delete_nchat_bookmarks.affected_rows,
        });
        toast({
          title: "Bookmarks removed",
          description: `${data.delete_nchat_bookmarks.affected_rows} bookmarks have been removed.`,
        });

        return data.delete_nchat_bookmarks;
      } catch (error) {
        logger.error("Failed to batch remove bookmarks", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Batch remove failed",
          description: "Could not remove all bookmarks. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, batchRemoveMutation, toast],
  );

  return {
    // Basic operations
    addBookmark,
    removeBookmark,
    removeBookmarkByMessage,
    updateBookmark,
    toggleBookmark,
    addingBookmark,
    removingBookmark,
    updatingBookmark,

    // Tag operations
    addTag,
    removeTag,

    // Collection operations
    addToCollection,
    removeFromCollection,

    // Batch operations
    batchAddBookmarks,
    batchRemoveBookmarks,
    batchAdding,
    batchRemoving,
  };
}

// ============================================================================
// Bookmark Collections Hooks
// ============================================================================

export function useBookmarkCollections() {
  const { user } = useAuth();

  const { data, loading, error, refetch } = useQuery(GET_BOOKMARK_COLLECTIONS, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  return {
    collections: data?.nchat_bookmark_collections || [],
    loading,
    error,
    refetch,
  };
}

export function useBookmarkCollection(collectionId: string) {
  const { data, loading, error, refetch } = useQuery(
    GET_COLLECTION_WITH_BOOKMARKS,
    {
      variables: { collectionId, limit: 50 },
      skip: !collectionId,
    },
  );

  return {
    collection: data?.nchat_bookmark_collections_by_pk,
    loading,
    error,
    refetch,
  };
}

export function useBookmarkCollectionMutations() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [createMutation, { loading: creating }] = useMutation(
    CREATE_BOOKMARK_COLLECTION,
  );
  const [updateMutation, { loading: updating }] = useMutation(
    UPDATE_BOOKMARK_COLLECTION,
  );
  const [deleteMutation, { loading: deleting }] = useMutation(
    DELETE_BOOKMARK_COLLECTION,
  );

  const createCollection = useCallback(
    async (input: Omit<CreateBookmarkCollectionInput, "userId">) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Creating bookmark collection", {
          userId: user.id,
          name: input.name,
        });

        const { data } = await createMutation({
          variables: {
            userId: user.id,
            ...input,
          },
        });

        logger.info("Collection created", {
          userId: user.id,
          collectionId: data.insert_nchat_bookmark_collections_one.id,
        });
        toast({
          title: "Collection created",
          description: `Collection "${input.name}" has been created.`,
        });

        return data.insert_nchat_bookmark_collections_one;
      } catch (error) {
        logger.error("Failed to create collection", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Creation failed",
          description: "Could not create the collection. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, createMutation, toast],
  );

  const updateCollection = useCallback(
    async (input: UpdateBookmarkCollectionInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Updating collection", {
          userId: user.id,
          collectionId: input.collectionId,
        });

        const { data } = await updateMutation({
          variables: input,
        });

        logger.info("Collection updated", {
          userId: user.id,
          collectionId: input.collectionId,
        });
        toast({
          title: "Collection updated",
          description: "Your collection has been updated.",
        });

        return data.update_nchat_bookmark_collections_by_pk;
      } catch (error) {
        logger.error("Failed to update collection", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Update failed",
          description: "Could not update the collection. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateMutation, toast],
  );

  const deleteCollection = useCallback(
    async (collectionId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Deleting collection", { userId: user.id, collectionId });

        await deleteMutation({
          variables: { collectionId },
        });

        logger.info("Collection deleted", { userId: user.id, collectionId });
        toast({
          title: "Collection deleted",
          description: "Your collection has been deleted.",
        });
      } catch (error) {
        logger.error("Failed to delete collection", error as Error, {
          userId: user.id,
          collectionId,
        });
        toast({
          title: "Delete failed",
          description: "Could not delete the collection. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, deleteMutation, toast],
  );

  return {
    createCollection,
    updateCollection,
    deleteCollection,
    creating,
    updating,
    deleting,
  };
}

// ============================================================================
// Saved Messages Hooks
// ============================================================================

export function useSavedMessages() {
  const { user } = useAuth();

  const { data, loading, error, fetchMore, refetch } = useQuery(
    GET_SAVED_MESSAGES,
    {
      variables: { userId: user?.id, limit: 50 },
      skip: !user?.id,
    },
  );

  useSubscription(SAVED_MESSAGE_SUBSCRIPTION, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  const loadMore = useCallback(() => {
    if (!data?.nchat_saved_messages) return;

    return fetchMore({
      variables: {
        offset: data.nchat_saved_messages.length,
      },
    });
  }, [data, fetchMore]);

  return {
    savedMessages: data?.nchat_saved_messages || [],
    loading,
    error,
    loadMore,
    refetch,
  };
}

export function useSavedMessageMutations() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [saveMutation, { loading: saving }] = useMutation(SAVE_MESSAGE);
  const [updateMutation, { loading: updating }] =
    useMutation(UPDATE_SAVED_MESSAGE);
  const [deleteMutation, { loading: deleting }] =
    useMutation(DELETE_SAVED_MESSAGE);
  const [batchDeleteMutation] = useMutation(BATCH_DELETE_SAVED_MESSAGES);

  const saveMessage = useCallback(
    async (input: Omit<SaveMessageInput, "userId">) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        logger.info("Saving message", { userId: user.id });

        const { data } = await saveMutation({
          variables: {
            userId: user.id,
            ...input,
          },
        });

        logger.info("Message saved", {
          userId: user.id,
          savedMessageId: data.insert_nchat_saved_messages_one.id,
        });
        toast({
          title: "Message saved",
          description: "Message has been saved to your personal space.",
        });

        return data.insert_nchat_saved_messages_one;
      } catch (error) {
        logger.error("Failed to save message", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Save failed",
          description: "Could not save the message. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, saveMutation, toast],
  );

  const updateSavedMessage = useCallback(
    async (input: UpdateSavedMessageInput) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        const { data } = await updateMutation({
          variables: input,
        });

        toast({
          title: "Saved message updated",
          description: "Your saved message has been updated.",
        });

        return data.update_nchat_saved_messages_by_pk;
      } catch (error) {
        logger.error("Failed to update saved message", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Update failed",
          description: "Could not update the saved message.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, updateMutation, toast],
  );

  const deleteSavedMessage = useCallback(
    async (savedMessageId: string) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }

      try {
        await deleteMutation({
          variables: { savedMessageId },
        });

        toast({
          title: "Saved message deleted",
          description: "Your saved message has been deleted.",
        });
      } catch (error) {
        logger.error("Failed to delete saved message", error as Error, {
          userId: user.id,
        });
        toast({
          title: "Delete failed",
          description: "Could not delete the saved message.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [user?.id, deleteMutation, toast],
  );

  return {
    saveMessage,
    updateSavedMessage,
    deleteSavedMessage,
    saving,
    updating,
    deleting,
  };
}

// ============================================================================
// Bookmark Statistics Hook
// ============================================================================

export function useBookmarkStats() {
  const { user } = useAuth();

  const { data, loading, error } = useQuery(GET_BOOKMARK_STATS, {
    variables: { userId: user?.id },
    skip: !user?.id,
  });

  return {
    stats: {
      totalBookmarks: data?.total?.aggregate?.count || 0,
      recentActivity: data?.recent?.aggregate?.count || 0,
      byChannel: data?.by_channel || [],
    },
    loading,
    error,
  };
}

// ============================================================================
// Bookmark Export Hook
// ============================================================================

export function useBookmarkExport() {
  const { bookmarks } = useBookmarks();
  const { toast } = useToast();

  const exportBookmarks = useCallback(
    async (
      format: BookmarkExportFormat,
      options: Partial<BookmarkExportOptions> = {},
    ) => {
      try {
        const exportOptions: BookmarkExportOptions = {
          format,
          includeContent: true,
          includeAttachments: false,
          includeMetadata: false,
          ...options,
        };

        let content: string;
        let filename: string;
        let mimeType: string;

        switch (format) {
          case "json":
            content = exportBookmarksToJSON(bookmarks as any, exportOptions);
            filename = `bookmarks-${Date.now()}.json`;
            mimeType = "application/json";
            break;
          case "csv":
            content = exportBookmarksToCSV(bookmarks as any, exportOptions);
            filename = `bookmarks-${Date.now()}.csv`;
            mimeType = "text/csv";
            break;
          default:
            throw new Error(`Unsupported export format: ${format}`);
        }

        // Create download
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: "Export successful",
          description: `Bookmarks exported as ${format.toUpperCase()}.`,
        });
      } catch (error) {
        logger.error("Failed to export bookmarks", error as Error);
        toast({
          title: "Export failed",
          description: "Could not export bookmarks. Please try again.",
          variant: "destructive",
        });
        throw error;
      }
    },
    [bookmarks, toast],
  );

  return {
    exportBookmarks,
  };
}
