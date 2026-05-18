/**
 * Search Indexer
 *
 * Utilities for indexing content into MeiliSearch
 */

import { getIndex, INDEX_NAMES } from "./meilisearch-client";

import { logger } from "@/lib/logger";

// Type definitions for indexed documents
export interface MessageDocument {
  id: string;
  content: string;
  author_id: string;
  author_name: string;
  channel_id: string;
  channel_name: string;
  thread_id?: string | null;
  created_at: string;
  updated_at?: string;
  has_link: boolean;
  has_file: boolean;
  has_image: boolean;
  is_pinned: boolean;
  is_starred: boolean;
}

export interface FileDocument {
  id: string;
  name: string;
  original_name: string;
  description?: string;
  uploader_id: string;
  uploader_name: string;
  channel_id?: string;
  message_id?: string;
  mime_type: string;
  file_type: string; // 'image' | 'video' | 'audio' | 'document' | 'other'
  size: number;
  url: string;
  created_at: string;
}

export interface UserDocument {
  id: string;
  display_name: string;
  username: string;
  email: string;
  bio?: string;
  role: string;
  avatar_url?: string;
  is_active: boolean;
  created_at: string;
}

export interface ChannelDocument {
  id: string;
  name: string;
  description?: string;
  topic?: string;
  is_private: boolean;
  is_archived: boolean;
  created_by: string;
  created_at: string;
  member_count?: number;
}

/**
 * Index a message
 */
export async function indexMessage(message: MessageDocument): Promise<void> {
  try {
    const index = getIndex(INDEX_NAMES.MESSAGES);
    await index.addDocuments([message], { primaryKey: "id" });
  } catch (error) {
    logger.error("Error indexing message:", error);
    throw error;
  }
}

/**
 * Index multiple messages in bulk
 */
export async function indexMessages(
  messages: MessageDocument[],
): Promise<void> {
  if (messages.length === 0) return;

  try {
    const index = getIndex(INDEX_NAMES.MESSAGES);
    await index.addDocuments(messages, { primaryKey: "id" });
  } catch (error) {
    logger.error("Error indexing messages:", error);
    throw error;
  }
}

/**
 * Update a message in the index
 */
export async function updateMessage(
  message: Partial<MessageDocument> & { id: string },
): Promise<void> {
  try {
    const index = getIndex(INDEX_NAMES.MESSAGES);
    await index.updateDocuments([message], { primaryKey: "id" });
  } catch (error) {
    logger.error("Error updating message:", error);
    throw error;
  }
}

/**
 * Index a file
 */
export async function indexFile(file: FileDocument): Promise<void> {
  try {
    const index = getIndex(INDEX_NAMES.FILES);
    await index.addDocuments([file], { primaryKey: "id" });
  } catch (error) {
    logger.error("Error indexing file:", error);
    throw error;
  }
}

/**
 * Index multiple files in bulk
 */
export async function indexFiles(files: FileDocument[]): Promise<void> {
  if (files.length === 0) return;

  try {
    const index = getIndex(INDEX_NAMES.FILES);
    await index.addDocuments(files, { primaryKey: "id" });
  } catch (error) {
    logger.error("Error indexing files:", error);
    throw error;
  }
}

/**
 * Index a user
 */
export async function indexUser(user: UserDocument): Promise<void> {
  try {
    const index = getIndex(INDEX_NAMES.USERS);
    await index.addDocuments([user], { primaryKey: "id" });
  } catch (error) {
    logger.error("Error indexing user:", error);
    throw error;
  }
}

/**
 * Index multiple users in bulk
 */
export async function indexUsers(users: UserDocument[]): Promise<void> {
  if (users.length === 0) return;

  try {
    const index = getIndex(INDEX_NAMES.USERS);
    await index.addDocuments(users, { primaryKey: "id" });
  } catch (error) {
    logger.error("Error indexing users:", error);
    throw error;
  }
}

/**
 * Index a channel
 */
export async function indexChannel(channel: ChannelDocument): Promise<void> {
  try {
    const index = getIndex(INDEX_NAMES.CHANNELS);
    await index.addDocuments([channel], { primaryKey: "id" });
  } catch (error) {
    logger.error("Error indexing channel:", error);
    throw error;
  }
}

/**
 * Index multiple channels in bulk
 */
export async function indexChannels(
  channels: ChannelDocument[],
): Promise<void> {
  if (channels.length === 0) return;

  try {
    const index = getIndex(INDEX_NAMES.CHANNELS);
    await index.addDocuments(channels, { primaryKey: "id" });
  } catch (error) {
    logger.error("Error indexing channels:", error);
    throw error;
  }
}

/**
 * Delete a document from an index
 */
export async function deleteFromIndex(
  indexName: (typeof INDEX_NAMES)[keyof typeof INDEX_NAMES],
  id: string,
): Promise<void> {
  try {
    const index = getIndex(indexName);
    await index.deleteDocument(id);
  } catch (error) {
    logger.error(`Error deleting document ${id} from ${indexName}:`, error);
    throw error;
  }
}

/**
 * Delete multiple documents from an index
 */
export async function deleteMultipleFromIndex(
  indexName: (typeof INDEX_NAMES)[keyof typeof INDEX_NAMES],
  ids: string[],
): Promise<void> {
  if (ids.length === 0) return;

  try {
    const index = getIndex(indexName);
    await index.deleteDocuments(ids);
  } catch (error) {
    logger.error(`Error deleting documents from ${indexName}:`, error);
    throw error;
  }
}

/**
 * Reindex all messages from database
 * This should be called periodically or when doing a full reindex
 */
export async function reindexAllMessages(
  fetchMessages: () => Promise<MessageDocument[]>,
): Promise<void> {
  try {
    const messages = await fetchMessages();
    await indexMessages(messages);
  } catch (error) {
    logger.error("Error reindexing messages:", error);
    throw error;
  }
}

/**
 * Reindex all files from database
 */
export async function reindexAllFiles(
  fetchFiles: () => Promise<FileDocument[]>,
): Promise<void> {
  try {
    const files = await fetchFiles();
    await indexFiles(files);
  } catch (error) {
    logger.error("Error reindexing files:", error);
    throw error;
  }
}

/**
 * Reindex all users from database
 */
export async function reindexAllUsers(
  fetchUsers: () => Promise<UserDocument[]>,
): Promise<void> {
  try {
    const users = await fetchUsers();
    await indexUsers(users);
  } catch (error) {
    logger.error("Error reindexing users:", error);
    throw error;
  }
}

/**
 * Reindex all channels from database
 */
export async function reindexAllChannels(
  fetchChannels: () => Promise<ChannelDocument[]>,
): Promise<void> {
  try {
    const channels = await fetchChannels();
    await indexChannels(channels);
  } catch (error) {
    logger.error("Error reindexing channels:", error);
    throw error;
  }
}

/**
 * Determine file type from MIME type
 */
export function getFileType(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (
    mimeType.includes("pdf") ||
    mimeType.includes("document") ||
    mimeType.includes("text") ||
    mimeType.includes("spreadsheet") ||
    mimeType.includes("presentation")
  ) {
    return "document";
  }
  return "other";
}

/**
 * Check if content contains links
 */
export function hasLinks(content: string): boolean {
  const urlRegex = /https?:\/\/[^\s]+/gi;
  return urlRegex.test(content);
}

export default {
  indexMessage,
  indexMessages,
  updateMessage,
  indexFile,
  indexFiles,
  indexUser,
  indexUsers,
  indexChannel,
  indexChannels,
  deleteFromIndex,
  deleteMultipleFromIndex,
  reindexAllMessages,
  reindexAllFiles,
  reindexAllUsers,
  reindexAllChannels,
  getFileType,
  hasLinks,
};
