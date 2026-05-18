// ===============================================================================
// Demo Components Exports
// ===============================================================================
//
// Central export file for all demo-related components and utilities.
//
// ===============================================================================

// Components
export { TemplateSwitcher } from "./TemplateSwitcher";
export type { TemplateSwitcherProps } from "./TemplateSwitcher";

export { TemplatePreview } from "./TemplatePreview";
export type { TemplatePreviewProps } from "./TemplatePreview";

export { TemplateGallery } from "./TemplateGallery";
export type { TemplateGalleryProps } from "./TemplateGallery";

export {
  DemoMode,
  DemoModeProvider,
  useDemoMode,
  useDemoModeOptional,
} from "./DemoMode";
export type { DemoModeProps, DemoContextValue } from "./DemoMode";

// Data utilities
export {
  // Re-exported from sample-data
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

  // Template-specific transformers
  getSlackChannels,
  getSlackDMs,
  getSlackMessages,
  getDiscordServers,
  getDiscordCategories,
  getDiscordMembers,
  getTelegramChats,
  getWhatsAppChats,
} from "./DemoData";

export type {
  DemoUser,
  DemoChannel,
  DemoMessage,
  DemoReaction,
  DemoFile,
  TemplateBranding,
} from "./DemoData";
