/**
 * File Access Control Service
 *
 * Manages access control for file attachments based on user roles,
 * channel membership, and file ownership.
 */

import { getServerApolloClient } from "@/lib/apollo-client";
import { gql } from "@apollo/client";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type UserRole = "owner" | "admin" | "moderator" | "member" | "guest";

export interface FileAccessContext {
  userId: string;
  userRole?: UserRole;
  isPremium?: boolean;
}

export interface FileInfo {
  id: string;
  userId: string;
  channelId?: string | null;
  messageId?: string | null;
  dmId?: string | null;
}

export interface ChannelInfo {
  id: string;
  type: "public" | "private" | "direct" | "group";
  isPrivate: boolean;
}

export interface AccessCheckResult {
  allowed: boolean;
  reason?: string;
  requiresAuth?: boolean;
}

// ============================================================================
// GraphQL Queries for Access Control
// ============================================================================

const GET_FILE_ACCESS_INFO = gql`
  query GetFileAccessInfo($fileId: uuid!) {
    nchat_attachments_by_pk(id: $fileId) {
      id
      message {
        id
        user_id
        channel_id
        channel {
          id
          type
          is_private
        }
      }
    }
  }
`;

const CHECK_CHANNEL_MEMBERSHIP = gql`
  query CheckChannelMembershipForFile($channelId: uuid!, $userId: uuid!) {
    nchat_channel_members(
      where: { channel_id: { _eq: $channelId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      id
      role
    }
  }
`;

const CHECK_DM_PARTICIPATION = gql`
  query CheckDMParticipation($dmId: uuid!, $userId: uuid!) {
    nchat_dm_participants(
      where: { dm_id: { _eq: $dmId }, user_id: { _eq: $userId } }
      limit: 1
    ) {
      id
      role
    }
  }
`;

const GET_USER_ROLE = gql`
  query GetUserRole($userId: uuid!) {
    nchat_users_by_pk(id: $userId) {
      id
      role
      is_premium
    }
  }
`;

const GET_FILE_BY_STORAGE_PATH = gql`
  query GetFileByStoragePath($storagePath: String!) {
    nchat_attachments(
      where: { storage_path: { _eq: $storagePath } }
      limit: 1
    ) {
      id
      message {
        id
        user_id
        channel_id
        channel {
          id
          type
          is_private
        }
      }
    }
  }
`;

// ============================================================================
// Access Control Service Class
// ============================================================================

export class FileAccessService {
  /**
   * Check if a user can access a specific file
   */
  async canAccessFile(
    userId: string,
    fileId: string,
    userRole?: UserRole,
  ): Promise<AccessCheckResult> {
    try {
      // Admin and owner roles can access all files
      if (userRole === "owner" || userRole === "admin") {
        return { allowed: true, reason: "Admin access" };
      }

      // Get file info from database
      const client = getServerApolloClient();
      const { data } = await client.query({
        query: GET_FILE_ACCESS_INFO,
        variables: { fileId },
        fetchPolicy: "network-only",
      });

      const attachment = data?.nchat_attachments_by_pk;
      if (!attachment) {
        return { allowed: false, reason: "File not found" };
      }

      const message = attachment.message;
      if (!message) {
        // Orphaned attachment - only allow owner access
        return { allowed: false, reason: "File has no associated message" };
      }

      // Check if user is the file owner (message sender)
      if (message.user_id === userId) {
        return { allowed: true, reason: "File owner" };
      }

      // Check channel access
      const channel = message.channel;
      if (channel) {
        return this.checkChannelFileAccess(userId, channel, userRole);
      }

      // If no channel, file might be from a DM - check DM participation
      // This would require additional schema support for DM attachments
      return { allowed: false, reason: "Unable to verify access" };
    } catch (error) {
      logger.error("[FileAccessService] Error checking file access:", error);
      return { allowed: false, reason: "Access check failed" };
    }
  }

  /**
   * Check if user can access files in a channel
   */
  async canAccessChannelFiles(
    userId: string,
    channelId: string,
    userRole?: UserRole,
  ): Promise<AccessCheckResult> {
    try {
      // Admin and owner roles can access all channel files
      if (userRole === "owner" || userRole === "admin") {
        return { allowed: true, reason: "Admin access" };
      }

      const client = getServerApolloClient();

      // Check channel membership
      const { data } = await client.query({
        query: CHECK_CHANNEL_MEMBERSHIP,
        variables: { channelId, userId },
        fetchPolicy: "network-only",
      });

      if (data?.nchat_channel_members?.length > 0) {
        return { allowed: true, reason: "Channel member" };
      }

      return { allowed: false, reason: "Not a channel member" };
    } catch (error) {
      logger.error("[FileAccessService] Error checking channel access:", error);
      return { allowed: false, reason: "Access check failed" };
    }
  }

  /**
   * Check if user can access files in a DM
   */
  async canAccessDMFiles(
    userId: string,
    dmId: string,
    userRole?: UserRole,
  ): Promise<AccessCheckResult> {
    try {
      // Admin and owner roles can access all DM files
      if (userRole === "owner" || userRole === "admin") {
        return { allowed: true, reason: "Admin access" };
      }

      const client = getServerApolloClient();

      // Check DM participation
      const { data } = await client.query({
        query: CHECK_DM_PARTICIPATION,
        variables: { dmId, userId },
        fetchPolicy: "network-only",
      });

      if (data?.nchat_dm_participants?.length > 0) {
        return { allowed: true, reason: "DM participant" };
      }

      return { allowed: false, reason: "Not a DM participant" };
    } catch (error) {
      logger.error("[FileAccessService] Error checking DM access:", error);
      return { allowed: false, reason: "Access check failed" };
    }
  }

  /**
   * Check if user can upload files to a channel
   */
  async canUploadToChannel(
    userId: string,
    channelId: string,
    userRole?: UserRole,
  ): Promise<AccessCheckResult> {
    try {
      // Guest users cannot upload
      if (userRole === "guest") {
        return { allowed: false, reason: "Guests cannot upload files" };
      }

      // Check channel membership
      return this.canAccessChannelFiles(userId, channelId, userRole);
    } catch (error) {
      logger.error(
        "[FileAccessService] Error checking upload permission:",
        error,
      );
      return { allowed: false, reason: "Permission check failed" };
    }
  }

  /**
   * Check if user can delete a file
   */
  async canDeleteFile(
    userId: string,
    fileId: string,
    userRole?: UserRole,
  ): Promise<AccessCheckResult> {
    try {
      // Admin and owner roles can delete any file
      if (userRole === "owner" || userRole === "admin") {
        return { allowed: true, reason: "Admin access" };
      }

      // Get file info
      const client = getServerApolloClient();
      const { data } = await client.query({
        query: GET_FILE_ACCESS_INFO,
        variables: { fileId },
        fetchPolicy: "network-only",
      });

      const attachment = data?.nchat_attachments_by_pk;
      if (!attachment) {
        return { allowed: false, reason: "File not found" };
      }

      const message = attachment.message;

      // Only file owner (message sender) can delete
      if (message?.user_id === userId) {
        return { allowed: true, reason: "File owner" };
      }

      // Channel moderators can delete files in their channels
      if (message?.channel_id && userRole === "moderator") {
        const accessCheck = await this.canAccessChannelFiles(
          userId,
          message.channel_id,
          userRole,
        );
        if (accessCheck.allowed) {
          return { allowed: true, reason: "Channel moderator" };
        }
      }

      return { allowed: false, reason: "Not authorized to delete this file" };
    } catch (error) {
      logger.error(
        "[FileAccessService] Error checking delete permission:",
        error,
      );
      return { allowed: false, reason: "Permission check failed" };
    }
  }

  /**
   * Get user's file size limits based on role and premium status
   */
  async getFileSizeLimits(
    userId: string,
    userRole?: UserRole,
  ): Promise<{ maxFileSize: number; maxTotalStorage: number }> {
    // Default limits
    const REGULAR_MAX_SIZE = 25 * 1024 * 1024; // 25MB
    const PREMIUM_MAX_SIZE = 100 * 1024 * 1024; // 100MB
    const ADMIN_MAX_SIZE = 500 * 1024 * 1024; // 500MB

    const REGULAR_MAX_STORAGE = 5 * 1024 * 1024 * 1024; // 5GB
    const PREMIUM_MAX_STORAGE = 50 * 1024 * 1024 * 1024; // 50GB
    const ADMIN_MAX_STORAGE = 500 * 1024 * 1024 * 1024; // 500GB

    // Admin and owner get highest limits
    if (userRole === "owner" || userRole === "admin") {
      return {
        maxFileSize: ADMIN_MAX_SIZE,
        maxTotalStorage: ADMIN_MAX_STORAGE,
      };
    }

    try {
      // Check premium status from database
      const client = getServerApolloClient();
      const { data } = await client.query({
        query: GET_USER_ROLE,
        variables: { userId },
        fetchPolicy: "network-only",
      });

      const user = data?.nchat_users_by_pk;
      if (user?.is_premium) {
        return {
          maxFileSize: PREMIUM_MAX_SIZE,
          maxTotalStorage: PREMIUM_MAX_STORAGE,
        };
      }

      return {
        maxFileSize: REGULAR_MAX_SIZE,
        maxTotalStorage: REGULAR_MAX_STORAGE,
      };
    } catch (error) {
      logger.error("[FileAccessService] Error getting file limits:", error);
      // Return regular limits on error
      return {
        maxFileSize: REGULAR_MAX_SIZE,
        maxTotalStorage: REGULAR_MAX_STORAGE,
      };
    }
  }

  /**
   * Check access for file by storage path
   */
  async canAccessByStoragePath(
    userId: string,
    storagePath: string,
    userRole?: UserRole,
  ): Promise<AccessCheckResult> {
    try {
      // Admin and owner roles can access all files
      if (userRole === "owner" || userRole === "admin") {
        return { allowed: true, reason: "Admin access" };
      }

      // Extract info from storage path
      // Path format: {channelId}/{userId}/{uuid}-{filename}
      const pathParts = storagePath.split("/");
      if (pathParts.length >= 2) {
        const pathChannelId = pathParts[0];
        const pathUserId = pathParts[1];

        // Check if user owns the file (uploaded it)
        if (pathUserId === userId) {
          return { allowed: true, reason: "File owner" };
        }

        // Check channel membership
        if (pathChannelId && pathChannelId !== "uploads") {
          return this.canAccessChannelFiles(userId, pathChannelId, userRole);
        }
      }

      // Try to find file in database
      const client = getServerApolloClient();
      const { data } = await client.query({
        query: GET_FILE_BY_STORAGE_PATH,
        variables: { storagePath },
        fetchPolicy: "network-only",
      });

      const attachment = data?.nchat_attachments?.[0];
      if (attachment) {
        const message = attachment.message;
        if (message?.user_id === userId) {
          return { allowed: true, reason: "File owner" };
        }

        if (message?.channel) {
          return this.checkChannelFileAccess(userId, message.channel, userRole);
        }
      }

      return { allowed: false, reason: "Unable to verify access" };
    } catch (error) {
      logger.error("[FileAccessService] Error checking path access:", error);
      return { allowed: false, reason: "Access check failed" };
    }
  }

  // ============================================================================
  // Private Methods
  // ============================================================================

  /**
   * Check file access based on channel type and membership
   */
  private async checkChannelFileAccess(
    userId: string,
    channel: ChannelInfo,
    userRole?: UserRole,
  ): Promise<AccessCheckResult> {
    // Public channels - anyone can view files
    if (channel.type === "public" && !channel.isPrivate) {
      return { allowed: true, reason: "Public channel" };
    }

    // Private channels and DMs require membership
    const client = getServerApolloClient();
    const { data } = await client.query({
      query: CHECK_CHANNEL_MEMBERSHIP,
      variables: { channelId: channel.id, userId },
      fetchPolicy: "network-only",
    });

    if (data?.nchat_channel_members?.length > 0) {
      return { allowed: true, reason: "Channel member" };
    }

    return {
      allowed: false,
      reason:
        channel.type === "private"
          ? "Private channel access required"
          : "Not a channel member",
    };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let accessServiceInstance: FileAccessService | null = null;

export function getFileAccessService(): FileAccessService {
  if (!accessServiceInstance) {
    accessServiceInstance = new FileAccessService();
  }
  return accessServiceInstance;
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Quick check if user can access a file
 */
export async function canAccessFile(
  userId: string,
  fileId: string,
  userRole?: UserRole,
): Promise<boolean> {
  const service = getFileAccessService();
  const result = await service.canAccessFile(userId, fileId, userRole);
  return result.allowed;
}

/**
 * Quick check if user can delete a file
 */
export async function canDeleteFile(
  userId: string,
  fileId: string,
  userRole?: UserRole,
): Promise<boolean> {
  const service = getFileAccessService();
  const result = await service.canDeleteFile(userId, fileId, userRole);
  return result.allowed;
}

/**
 * Quick check if user can upload to a channel
 */
export async function canUploadToChannel(
  userId: string,
  channelId: string,
  userRole?: UserRole,
): Promise<boolean> {
  const service = getFileAccessService();
  const result = await service.canUploadToChannel(userId, channelId, userRole);
  return result.allowed;
}

/**
 * Get max file size for user
 */
export async function getMaxFileSize(
  userId: string,
  userRole?: UserRole,
): Promise<number> {
  const service = getFileAccessService();
  const limits = await service.getFileSizeLimits(userId, userRole);
  return limits.maxFileSize;
}
