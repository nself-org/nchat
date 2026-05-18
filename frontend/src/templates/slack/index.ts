// ===============================================================================
// Slack Template Exports
// ===============================================================================
//
// Central export file for all Slack template components and utilities.
//
// ===============================================================================

// Template configuration
export { default as slackTemplate } from "./config";
export {
  slackColors,
  slackTypography,
  slackSpacing,
  slackComponentStyles,
  slackAnimations,
  slackIcons,
} from "./config";

// Theme utilities
export {
  slackTheme,
  slackCSSVariables,
  applySlackTheme,
  getSlackThemeStyle,
  getContrastText,
  getPresenceColor,
  getMessageBackground,
} from "./slack-theme";

// Components
export { SlackLayout } from "./components/SlackLayout";
export type { SlackLayoutProps } from "./components/SlackLayout";

export { SlackSidebar } from "./components/SlackSidebar";
export type {
  SlackSidebarProps,
  SlackChannelItem,
  SlackDMItem,
} from "./components/SlackSidebar";

export { SlackHeader } from "./components/SlackHeader";
export type { SlackHeaderProps } from "./components/SlackHeader";

export { SlackMessage } from "./components/SlackMessage";
export type {
  SlackMessageProps,
  SlackReaction,
  SlackAttachment,
} from "./components/SlackMessage";

export { SlackComposer } from "./components/SlackComposer";
export type { SlackComposerProps } from "./components/SlackComposer";

export { SlackChannelList } from "./components/SlackChannelList";
export type {
  SlackChannelListProps,
  SlackChannelData,
} from "./components/SlackChannelList";

export { SlackWorkspaceSwitcher } from "./components/SlackWorkspaceSwitcher";
export type {
  SlackWorkspaceSwitcherProps,
  SlackWorkspaceData,
} from "./components/SlackWorkspaceSwitcher";

export { SlackHuddle } from "./components/SlackHuddle";
export type {
  SlackHuddleProps,
  SlackHuddleParticipant,
} from "./components/SlackHuddle";
