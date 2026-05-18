// ===============================================================================
// Discord Template Exports
// ===============================================================================
//
// Central export file for all Discord template components and utilities.
//
// ===============================================================================

// Template configuration
export { default as discordTemplate } from "./config";
export {
  discordColors,
  discordTypography,
  discordLayout,
  discordAnimations,
} from "./config";

// Theme utilities
export {
  discordTheme,
  discordCSSVariables,
  applyDiscordTheme,
  getDiscordThemeStyle,
  getContrastText,
  getStatusColor,
  getMessageHoverBackground,
  getRoleColor,
} from "./discord-theme";

// Components
export { DiscordLayout } from "./components/DiscordLayout";
export type { DiscordLayoutProps } from "./components/DiscordLayout";

export { DiscordServerList } from "./components/DiscordServerList";
export type {
  DiscordServerListProps,
  DiscordServerData,
} from "./components/DiscordServerList";

export { DiscordChannelSidebar } from "./components/DiscordChannelSidebar";
export type {
  DiscordChannelSidebarProps,
  DiscordCategoryData,
  DiscordChannelData,
  DiscordCurrentUser,
} from "./components/DiscordChannelSidebar";

export { DiscordMemberList } from "./components/DiscordMemberList";
export type {
  DiscordMemberListProps,
  DiscordRoleGroup,
  DiscordMemberData,
} from "./components/DiscordMemberList";

export { DiscordMessage } from "./components/DiscordMessage";
export type {
  DiscordMessageProps,
  DiscordReaction,
  DiscordAttachment,
} from "./components/DiscordMessage";

export { DiscordVoiceChannel } from "./components/DiscordVoiceChannel";
export type {
  DiscordVoiceChannelProps,
  DiscordVoiceUser,
} from "./components/DiscordVoiceChannel";

export { DiscordUserCard } from "./components/DiscordUserCard";
export type {
  DiscordUserCardProps,
  DiscordUserData,
  DiscordRole,
  DiscordMutualServer,
} from "./components/DiscordUserCard";
