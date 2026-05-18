// ===============================================================================
// Demo Data Utilities
// ===============================================================================
//
// Re-exports and utilities for accessing demo data in the components.
//
// ===============================================================================

// Re-export all demo data from the lib
export {
  demoUsers,
  demoChannels,
  demoMessages,
  demoFiles,
  templateBranding,
  getDemoUser,
  getDemoChannel,
  getChannelMessages,
  getThreadReplies,
  getCurrentDemoUser,
  getCurrentUserChannels,
  getCurrentUserDMs,
  getCurrentUserGroups,
  getTotalUnreadCount,
  getTotalMentionCount,
} from "@/lib/demo/sample-data";

export type {
  DemoUser,
  DemoChannel,
  DemoMessage,
  DemoReaction,
  DemoFile,
  TemplateBranding,
} from "@/lib/demo/sample-data";

// -------------------------------------------------------------------------------
// Template-specific data transformers
// -------------------------------------------------------------------------------

import {
  demoUsers,
  demoChannels,
  demoMessages,
  getDemoUser,
} from "@/lib/demo/sample-data";
import type { TemplateId } from "@/templates/types";

/**
 * Transform demo channels to Slack format
 */
export function getSlackChannels() {
  return demoChannels
    .filter((c) => c.type === "public" || c.type === "private")
    .map((channel) => ({
      id: channel.id,
      name: channel.name,
      isPrivate: channel.type === "private",
      unreadCount: channel.unreadCount,
      mentionCount: channel.mentionCount,
      isMuted: channel.isMuted,
    }));
}

/**
 * Transform demo channels to Slack DM format
 */
export function getSlackDMs() {
  return demoChannels
    .filter((c) => c.type === "direct")
    .map((dm) => {
      const otherUserId =
        dm.memberIds.find((id) => id !== "user-7") || "user-1";
      const user = getDemoUser(otherUserId);
      return {
        id: dm.id,
        name: user?.displayName || dm.name,
        avatarUrl: user?.avatar,
        status: user?.status || "offline",
        unreadCount: dm.unreadCount,
      };
    });
}

/**
 * Transform demo messages to Slack format
 */
export function getSlackMessages(channelId: string) {
  return demoMessages
    .filter((m) => m.channelId === channelId && !m.threadId)
    .map((message) => {
      const user = getDemoUser(message.userId);
      return {
        id: message.id,
        userId: message.userId,
        userName: user?.displayName || "Unknown",
        userAvatar: user?.avatar,
        content: message.content,
        timestamp: message.createdAt,
        isEdited: message.isEdited,
        isPinned: message.isPinned,
        reactions: message.reactions?.map((r) => ({
          emoji: r.emoji,
          count: r.count,
          hasReacted: r.userIds.includes("user-7"),
        })),
        threadCount: message.threadCount,
        attachments: message.attachments?.map((f) => ({
          type: f.type,
          url: f.url,
          name: f.name,
        })),
      };
    });
}

/**
 * Transform demo data to Discord format
 */
export function getDiscordServers() {
  return [
    {
      id: "server-1",
      name: "nchat Community",
      icon: undefined,
      unreadCount: 5,
      mentionCount: 2,
    },
    {
      id: "server-2",
      name: "Developer Hub",
      icon: undefined,
      unreadCount: 0,
      mentionCount: 0,
    },
  ];
}

/**
 * Transform demo channels to Discord categories
 */
export function getDiscordCategories() {
  return [
    {
      id: "cat-1",
      name: "Text Channels",
      channels: demoChannels
        .filter((c) => c.type === "public")
        .map((channel) => ({
          id: channel.id,
          name: channel.name,
          type: "text" as const,
          unreadCount: channel.unreadCount,
          mentionCount: channel.mentionCount,
        })),
    },
    {
      id: "cat-2",
      name: "Voice Channels",
      channels: [
        {
          id: "voice-1",
          name: "General",
          type: "voice" as const,
          connectedUsers: 3,
        },
        {
          id: "voice-2",
          name: "Gaming",
          type: "voice" as const,
          connectedUsers: 0,
        },
      ],
    },
  ];
}

/**
 * Transform demo users to Discord members with roles
 */
export function getDiscordMembers() {
  const roleColors: Record<string, string> = {
    owner: "#E91E63",
    admin: "#F44336",
    moderator: "#9C27B0",
    member: "#2196F3",
    guest: "#607D8B",
  };

  const roles = [
    { id: "role-admins", name: "Admins", color: roleColors.admin },
    { id: "role-members", name: "Members", color: roleColors.member },
  ];

  return roles.map((role) => ({
    ...role,
    members: demoUsers
      .filter((u) => {
        if (role.id === "role-admins")
          return u.role === "owner" || u.role === "admin";
        return u.role === "member" || u.role === "guest";
      })
      .map((user) => ({
        id: user.id,
        name: user.name,
        nickname: user.displayName,
        avatar: user.avatar,
        roleColor: roleColors[user.role],
        status: user.status,
        isBot: false,
      })),
  }));
}

/**
 * Transform demo data to Telegram format
 */
export function getTelegramChats() {
  return demoChannels.map((channel) => {
    const lastMessage = demoMessages.find((m) => m.channelId === channel.id);
    const lastMessageUser = lastMessage
      ? getDemoUser(lastMessage.userId)
      : null;

    return {
      id: channel.id,
      name: channel.name,
      avatar: undefined,
      type:
        channel.type === "direct" ? ("private" as const) : ("group" as const),
      lastMessage: lastMessage
        ? {
            content: lastMessage.content.slice(0, 50),
            senderName: lastMessageUser?.displayName,
            isOwn: lastMessage.userId === "user-7",
            time: lastMessage.createdAt,
            status: "read" as const,
          }
        : undefined,
      unreadCount: channel.unreadCount,
      isPinned: channel.isPinned,
      isMuted: channel.isMuted,
    };
  });
}

/**
 * Transform demo data to WhatsApp format
 */
export function getWhatsAppChats() {
  return demoChannels.map((channel) => {
    const lastMessage = demoMessages.find((m) => m.channelId === channel.id);
    const lastMessageUser = lastMessage
      ? getDemoUser(lastMessage.userId)
      : null;

    return {
      id: channel.id,
      name: channel.name,
      avatar: undefined,
      type:
        channel.type === "direct" ? ("private" as const) : ("group" as const),
      lastMessage: lastMessage
        ? {
            content: lastMessage.content.slice(0, 50),
            type: "text" as const,
            senderName: lastMessageUser?.displayName,
            isOwn: lastMessage.userId === "user-7",
            time: lastMessage.createdAt,
            status: "read" as const,
          }
        : undefined,
      unreadCount: channel.unreadCount,
      isPinned: channel.isPinned,
      isMuted: channel.isMuted,
    };
  });
}
