/**
 * Channel Templates - Predefined channel configurations for quick setup
 */

import type { ChannelType } from "@/stores/channel-store";

// ============================================================================
// Types
// ============================================================================

export interface ChannelTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
  type: ChannelType;
  categoryId: string | null;
  defaultTopic: string;
  defaultDescription: string;
  permissions: ChannelPermissionTemplate;
  features: ChannelFeatureTemplate;
  placeholder: {
    name: string;
    description: string;
  };
}

export interface ChannelPermissionTemplate {
  isPublic: boolean;
  allowGuests: boolean;
  membersCanInvite: boolean;
  membersCanPost: boolean;
  membersCanReact: boolean;
  membersCanThread: boolean;
  membersCanUpload: boolean;
  moderatorsOnly: boolean;
}

export interface ChannelFeatureTemplate {
  threads: boolean;
  reactions: boolean;
  fileUploads: boolean;
  voiceMessages: boolean;
  polls: boolean;
  pinMessages: boolean;
  bookmarks: boolean;
  reminders: boolean;
  slowMode: number | null; // seconds between messages, null = disabled
  messageRetention: number | null; // days to keep messages, null = forever
}

// ============================================================================
// Default Permission Sets
// ============================================================================

export const PERMISSION_PRESETS = {
  open: {
    isPublic: true,
    allowGuests: true,
    membersCanInvite: true,
    membersCanPost: true,
    membersCanReact: true,
    membersCanThread: true,
    membersCanUpload: true,
    moderatorsOnly: false,
  },
  standard: {
    isPublic: true,
    allowGuests: false,
    membersCanInvite: false,
    membersCanPost: true,
    membersCanReact: true,
    membersCanThread: true,
    membersCanUpload: true,
    moderatorsOnly: false,
  },
  restricted: {
    isPublic: false,
    allowGuests: false,
    membersCanInvite: false,
    membersCanPost: true,
    membersCanReact: true,
    membersCanThread: false,
    membersCanUpload: false,
    moderatorsOnly: false,
  },
  announcements: {
    isPublic: true,
    allowGuests: true,
    membersCanInvite: false,
    membersCanPost: false,
    membersCanReact: true,
    membersCanThread: false,
    membersCanUpload: false,
    moderatorsOnly: true,
  },
  private: {
    isPublic: false,
    allowGuests: false,
    membersCanInvite: false,
    membersCanPost: true,
    membersCanReact: true,
    membersCanThread: true,
    membersCanUpload: true,
    moderatorsOnly: false,
  },
} as const;

// ============================================================================
// Default Feature Sets
// ============================================================================

export const FEATURE_PRESETS = {
  full: {
    threads: true,
    reactions: true,
    fileUploads: true,
    voiceMessages: true,
    polls: true,
    pinMessages: true,
    bookmarks: true,
    reminders: true,
    slowMode: null,
    messageRetention: null,
  },
  standard: {
    threads: true,
    reactions: true,
    fileUploads: true,
    voiceMessages: false,
    polls: false,
    pinMessages: true,
    bookmarks: true,
    reminders: true,
    slowMode: null,
    messageRetention: null,
  },
  minimal: {
    threads: false,
    reactions: true,
    fileUploads: false,
    voiceMessages: false,
    polls: false,
    pinMessages: false,
    bookmarks: false,
    reminders: false,
    slowMode: null,
    messageRetention: null,
  },
  announcements: {
    threads: false,
    reactions: true,
    fileUploads: true,
    voiceMessages: false,
    polls: false,
    pinMessages: true,
    bookmarks: true,
    reminders: false,
    slowMode: null,
    messageRetention: null,
  },
  support: {
    threads: true,
    reactions: true,
    fileUploads: true,
    voiceMessages: true,
    polls: false,
    pinMessages: true,
    bookmarks: true,
    reminders: true,
    slowMode: 30,
    messageRetention: 90,
  },
} as const;

// ============================================================================
// Channel Templates
// ============================================================================

export const CHANNEL_TEMPLATES: ChannelTemplate[] = [
  {
    id: "team",
    name: "Team Channel",
    slug: "team",
    description: "A channel for team discussions and collaboration",
    icon: "Users",
    type: "public",
    categoryId: "teams",
    defaultTopic: "Team discussions",
    defaultDescription: "A space for team collaboration and updates",
    permissions: PERMISSION_PRESETS.standard,
    features: FEATURE_PRESETS.full,
    placeholder: {
      name: "team-name",
      description: "Describe your team...",
    },
  },
  {
    id: "announcements",
    name: "Announcements",
    slug: "announcements",
    description: "Read-only channel for important announcements",
    icon: "Megaphone",
    type: "public",
    categoryId: "announcements",
    defaultTopic: "Important announcements",
    defaultDescription: "Stay updated with the latest news and announcements",
    permissions: PERMISSION_PRESETS.announcements,
    features: FEATURE_PRESETS.announcements,
    placeholder: {
      name: "announcements",
      description: "Important updates for everyone...",
    },
  },
  {
    id: "social",
    name: "Social / Random",
    slug: "social",
    description: "A casual space for off-topic conversations",
    icon: "Coffee",
    type: "public",
    categoryId: "social",
    defaultTopic: "Casual conversations",
    defaultDescription: "A place for casual conversations and fun",
    permissions: PERMISSION_PRESETS.open,
    features: FEATURE_PRESETS.full,
    placeholder: {
      name: "watercooler",
      description: "Hang out and chat...",
    },
  },
  {
    id: "support",
    name: "Support / Help",
    slug: "support",
    description: "A channel for questions and support requests",
    icon: "HelpCircle",
    type: "public",
    categoryId: "support",
    defaultTopic: "Get help and support",
    defaultDescription: "Ask questions and get help from the community",
    permissions: PERMISSION_PRESETS.standard,
    features: FEATURE_PRESETS.support,
    placeholder: {
      name: "help-desk",
      description: "Get help with any questions...",
    },
  },
  {
    id: "project",
    name: "Project Channel",
    slug: "project",
    description: "A channel for project-specific discussions",
    icon: "FolderKanban",
    type: "private",
    categoryId: "projects",
    defaultTopic: "Project updates and discussions",
    defaultDescription: "Collaborate on project tasks and updates",
    permissions: PERMISSION_PRESETS.private,
    features: FEATURE_PRESETS.full,
    placeholder: {
      name: "project-name",
      description: "Describe your project...",
    },
  },
  {
    id: "private-group",
    name: "Private Group",
    slug: "private-group",
    description: "A private channel for selected members",
    icon: "Lock",
    type: "private",
    categoryId: null,
    defaultTopic: "Private discussions",
    defaultDescription: "A private space for selected members",
    permissions: PERMISSION_PRESETS.private,
    features: FEATURE_PRESETS.standard,
    placeholder: {
      name: "private-channel",
      description: "Invite-only discussions...",
    },
  },
  {
    id: "general",
    name: "General",
    slug: "general",
    description: "The default channel for general discussions",
    icon: "MessageSquare",
    type: "public",
    categoryId: "general",
    defaultTopic: "General discussions",
    defaultDescription: "A place for general conversations",
    permissions: PERMISSION_PRESETS.standard,
    features: FEATURE_PRESETS.standard,
    placeholder: {
      name: "general",
      description: "General discussions for everyone...",
    },
  },
  {
    id: "feedback",
    name: "Feedback",
    slug: "feedback",
    description: "Collect feedback and suggestions",
    icon: "MessageSquarePlus",
    type: "public",
    categoryId: null,
    defaultTopic: "Share your feedback",
    defaultDescription: "Share your ideas, suggestions, and feedback",
    permissions: PERMISSION_PRESETS.standard,
    features: {
      ...FEATURE_PRESETS.standard,
      polls: true,
    },
    placeholder: {
      name: "feedback",
      description: "Collect feedback and suggestions...",
    },
  },
];

// ============================================================================
// Helper Functions
// ============================================================================

export function getTemplateById(id: string): ChannelTemplate | undefined {
  return CHANNEL_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(
  categoryId: string | null,
): ChannelTemplate[] {
  return CHANNEL_TEMPLATES.filter((t) => t.categoryId === categoryId);
}

export function getPublicTemplates(): ChannelTemplate[] {
  return CHANNEL_TEMPLATES.filter((t) => t.type === "public");
}

export function getPrivateTemplates(): ChannelTemplate[] {
  return CHANNEL_TEMPLATES.filter((t) => t.type === "private");
}

export function applyTemplate(
  template: ChannelTemplate,
  overrides?: Partial<{
    name: string;
    description: string;
    topic: string;
    categoryId: string | null;
  }>,
): {
  name: string;
  description: string;
  topic: string;
  type: ChannelType;
  categoryId: string | null;
  permissions: ChannelPermissionTemplate;
  features: ChannelFeatureTemplate;
} {
  return {
    name: overrides?.name || template.placeholder.name,
    description: overrides?.description || template.defaultDescription,
    topic: overrides?.topic || template.defaultTopic,
    type: template.type,
    categoryId: overrides?.categoryId ?? template.categoryId,
    permissions: { ...template.permissions },
    features: { ...template.features },
  };
}

export function createCustomTemplate(
  name: string,
  options: Partial<Omit<ChannelTemplate, "id" | "name" | "slug">>,
): ChannelTemplate {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const id = `custom-${slug}-${Date.now()}`;

  return {
    id,
    name,
    slug,
    description: options.description || `Custom ${name} template`,
    icon: options.icon || "Hash",
    type: options.type || "public",
    categoryId: options.categoryId ?? null,
    defaultTopic: options.defaultTopic || "",
    defaultDescription: options.defaultDescription || "",
    permissions: options.permissions || PERMISSION_PRESETS.standard,
    features: options.features || FEATURE_PRESETS.standard,
    placeholder: options.placeholder || {
      name: slug,
      description: "",
    },
  };
}
