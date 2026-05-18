/**
 * Component Token Mapping
 *
 * Maps design tokens to specific UI component styles. Each component receives
 * a token set derived entirely from the skin + design tokens -- no hardcoded
 * values. This enables runtime skin switching to update every component.
 *
 * Covered components:
 *   - Message Bubble
 *   - Sidebar
 *   - Header
 *   - Composer (message input)
 *   - Modal / Dialog
 *   - Tooltip
 *   - Dropdown / Menu
 *   - Avatar
 *   - Badge
 *   - Button
 *   - Input / Form Controls
 *
 * @module lib/skins/component-tokens
 * @version 1.0.0
 */

import type { VisualSkin, SkinColorPalette } from "./types";
import { nchatSkin } from "./visual-skins";
import { getDesignTokens, type DesignTokens } from "./design-tokens";
import { buildFocusRingTokens, type FocusRingTokens } from "./accessibility";

// ============================================================================
// MESSAGE BUBBLE
// ============================================================================

export interface MessageBubbleTokens {
  layout: "default" | "compact" | "cozy" | "bubbles";
  padding: string;
  gap: string;
  borderRadius: string;
  /** Own message bubble background */
  ownBg: string;
  /** Own message text color */
  ownText: string;
  /** Other user message bubble background */
  otherBg: string;
  /** Other user text color */
  otherText: string;
  /** System message styling */
  systemBg: string;
  systemText: string;
  systemFontSize: string;
  /** Timestamp */
  timestampColor: string;
  timestampFontSize: string;
  /** Hover highlight */
  hoverBg: string;
  /** Selection highlight */
  selectedBg: string;
  /** Link color within messages */
  linkColor: string;
  /** Code block styling */
  codeBg: string;
  codeBorderRadius: string;
  codeFontFamily: string;
  codeFontSize: string;
}

function hexWithAlpha(hex: string, alpha: number): string {
  const a = Math.round(alpha * 255)
    .toString(16)
    .padStart(2, "0");
  const base = hex.length === 9 ? hex.slice(0, 7) : hex.slice(0, 7);
  return `${base}${a}`;
}

function buildMessageBubbleTokens(
  skin: VisualSkin,
  colors: SkinColorPalette,
  tokens: DesignTokens,
): MessageBubbleTokens {
  const isBubbles = skin.components.messageLayout === "bubbles";

  return {
    layout: skin.components.messageLayout,
    padding: skin.spacing.messagePadding,
    gap: skin.spacing.messageGap,
    borderRadius: isBubbles ? skin.borderRadius.lg : skin.borderRadius.md,
    ownBg: isBubbles ? hexWithAlpha(colors.primary, 0.12) : "transparent",
    ownText: colors.text,
    otherBg: isBubbles ? colors.surface : "transparent",
    otherText: colors.text,
    systemBg: "transparent",
    systemText: colors.muted,
    systemFontSize: tokens.typeScale.sm.fontSize,
    timestampColor: colors.muted,
    timestampFontSize: tokens.typeScale.xs.fontSize,
    hoverBg: hexWithAlpha(colors.text, 0.04),
    selectedBg: hexWithAlpha(colors.primary, 0.08),
    linkColor: colors.primary,
    codeBg: colors.surface,
    codeBorderRadius: skin.borderRadius.sm,
    codeFontFamily: skin.typography.fontFamilyMono,
    codeFontSize: tokens.typeScale.sm.fontSize,
  };
}

// ============================================================================
// SIDEBAR
// ============================================================================

export interface SidebarTokens {
  style: "default" | "compact" | "wide" | "icons-only";
  width: string;
  compactWidth: string;
  background: string;
  text: string;
  textMuted: string;
  borderColor: string;
  /** Active channel background */
  activeItemBg: string;
  /** Active channel text color */
  activeItemText: string;
  /** Hover item background */
  hoverItemBg: string;
  /** Item padding */
  itemPadding: string;
  /** Item border radius */
  itemBorderRadius: string;
  /** Section header styles */
  sectionHeaderColor: string;
  sectionHeaderFontSize: string;
  sectionHeaderFontWeight: number;
  /** Unread indicator */
  unreadIndicatorBg: string;
  unreadIndicatorText: string;
  /** Separator color */
  separatorColor: string;
}

function buildSidebarTokens(
  skin: VisualSkin,
  colors: SkinColorPalette,
  tokens: DesignTokens,
): SidebarTokens {
  return {
    style: skin.components.sidebarStyle,
    width: skin.spacing.sidebarWidth,
    compactWidth: "72px",
    background: colors.surface,
    text: colors.text,
    textMuted: colors.muted,
    borderColor: colors.border,
    activeItemBg: hexWithAlpha(colors.primary, 0.1),
    activeItemText: colors.primary,
    hoverItemBg: hexWithAlpha(colors.text, 0.04),
    itemPadding: `${tokens.spacing["1.5"]} ${tokens.spacing["2"]}`,
    itemBorderRadius: skin.borderRadius.md,
    sectionHeaderColor: colors.muted,
    sectionHeaderFontSize: tokens.typeScale.xs.fontSize,
    sectionHeaderFontWeight: tokens.typography.fontWeightBold,
    unreadIndicatorBg: colors.primary,
    unreadIndicatorText: colors.background,
    separatorColor: colors.border,
  };
}

// ============================================================================
// HEADER
// ============================================================================

export interface HeaderTokens {
  style: "default" | "minimal" | "prominent";
  height: string;
  background: string;
  text: string;
  borderColor: string;
  iconColor: string;
  /** Title styling */
  titleFontSize: string;
  titleFontWeight: number;
  /** Subtitle / status line */
  subtitleColor: string;
  subtitleFontSize: string;
  /** Action button spacing */
  actionGap: string;
  /** Shadow beneath header */
  shadow: string;
}

function buildHeaderTokens(
  skin: VisualSkin,
  colors: SkinColorPalette,
  tokens: DesignTokens,
): HeaderTokens {
  return {
    style: skin.components.headerStyle,
    height: skin.spacing.headerHeight,
    background: colors.background,
    text: colors.text,
    borderColor: colors.border,
    iconColor: colors.muted,
    titleFontSize: tokens.typeScale.lg.fontSize,
    titleFontWeight: tokens.typography.fontWeightBold,
    subtitleColor: colors.muted,
    subtitleFontSize: tokens.typeScale.sm.fontSize,
    actionGap: tokens.spacing["1"],
    shadow: tokens.shadows.xs,
  };
}

// ============================================================================
// COMPOSER
// ============================================================================

export interface ComposerTokens {
  /** Input height */
  minHeight: string;
  /** Maximum input height before scroll */
  maxHeight: string;
  /** Background */
  background: string;
  /** Border color */
  borderColor: string;
  /** Border color when focused */
  borderColorFocus: string;
  /** Border radius */
  borderRadius: string;
  /** Text color */
  text: string;
  /** Placeholder color */
  placeholder: string;
  /** Padding */
  padding: string;
  /** Font size */
  fontSize: string;
  /** Toolbar background */
  toolbarBg: string;
  /** Toolbar icon color */
  toolbarIconColor: string;
  /** Toolbar icon hover color */
  toolbarIconHover: string;
  /** Send button styles */
  sendButtonBg: string;
  sendButtonText: string;
  sendButtonDisabledBg: string;
  /** Attachment preview */
  attachmentBg: string;
  attachmentBorderRadius: string;
}

function buildComposerTokens(
  skin: VisualSkin,
  colors: SkinColorPalette,
  tokens: DesignTokens,
): ComposerTokens {
  return {
    minHeight: skin.spacing.inputHeight,
    maxHeight: "200px",
    background: colors.background,
    borderColor: colors.border,
    borderColorFocus: colors.primary,
    borderRadius: skin.borderRadius.lg,
    text: colors.text,
    placeholder: colors.muted,
    padding: `${tokens.spacing["2"]} ${tokens.spacing["3"]}`,
    fontSize: tokens.typeScale.base.fontSize,
    toolbarBg: colors.surface,
    toolbarIconColor: colors.muted,
    toolbarIconHover: colors.text,
    sendButtonBg: colors.primary,
    sendButtonText: colors.background,
    sendButtonDisabledBg: hexWithAlpha(colors.muted, 0.3),
    attachmentBg: colors.surface,
    attachmentBorderRadius: skin.borderRadius.md,
  };
}

// ============================================================================
// MODAL / DIALOG
// ============================================================================

export interface ModalTokens {
  /** Overlay background */
  overlayBg: string;
  /** Modal background */
  background: string;
  /** Border radius */
  borderRadius: string;
  /** Shadow */
  shadow: string;
  /** Border color */
  borderColor: string;
  /** Padding */
  padding: string;
  /** Title font size */
  titleFontSize: string;
  /** Title font weight */
  titleFontWeight: number;
  /** Max width */
  maxWidth: string;
  /** Close button color */
  closeButtonColor: string;
  /** Close button hover color */
  closeButtonHover: string;
}

function buildModalTokens(
  skin: VisualSkin,
  colors: SkinColorPalette,
  tokens: DesignTokens,
): ModalTokens {
  return {
    overlayBg: hexWithAlpha("#000000", 0.5),
    background: colors.background,
    borderRadius: skin.borderRadius.xl,
    shadow: tokens.shadows.xl,
    borderColor: colors.border,
    padding: tokens.spacing["6"],
    titleFontSize: tokens.typeScale.xl.fontSize,
    titleFontWeight: tokens.typography.fontWeightBold,
    maxWidth: "480px",
    closeButtonColor: colors.muted,
    closeButtonHover: colors.text,
  };
}

// ============================================================================
// TOOLTIP
// ============================================================================

export interface TooltipTokens {
  /** Background color */
  background: string;
  /** Text color */
  text: string;
  /** Font size */
  fontSize: string;
  /** Padding */
  padding: string;
  /** Border radius */
  borderRadius: string;
  /** Shadow */
  shadow: string;
  /** Maximum width */
  maxWidth: string;
  /** Arrow size */
  arrowSize: string;
}

function buildTooltipTokens(
  skin: VisualSkin,
  colors: SkinColorPalette,
  tokens: DesignTokens,
): TooltipTokens {
  return {
    background: colors.text,
    text: colors.background,
    fontSize: tokens.typeScale.sm.fontSize,
    padding: `${tokens.spacing["1"]} ${tokens.spacing["2"]}`,
    borderRadius: skin.borderRadius.sm,
    shadow: tokens.shadows.md,
    maxWidth: "240px",
    arrowSize: "6px",
  };
}

// ============================================================================
// DROPDOWN / MENU
// ============================================================================

export interface DropdownTokens {
  /** Menu background */
  background: string;
  /** Border color */
  borderColor: string;
  /** Border radius */
  borderRadius: string;
  /** Shadow */
  shadow: string;
  /** Padding (menu container) */
  padding: string;
  /** Item padding */
  itemPadding: string;
  /** Item border radius */
  itemBorderRadius: string;
  /** Item text color */
  itemText: string;
  /** Item hover background */
  itemHoverBg: string;
  /** Item active background */
  itemActiveBg: string;
  /** Disabled item text */
  itemDisabledText: string;
  /** Separator color */
  separatorColor: string;
  /** Icon color */
  iconColor: string;
  /** Shortcut text color */
  shortcutColor: string;
  /** Min width */
  minWidth: string;
}

function buildDropdownTokens(
  skin: VisualSkin,
  colors: SkinColorPalette,
  tokens: DesignTokens,
): DropdownTokens {
  return {
    background: colors.background,
    borderColor: colors.border,
    borderRadius: skin.borderRadius.lg,
    shadow: tokens.shadows.lg,
    padding: tokens.spacing["1"],
    itemPadding: `${tokens.spacing["1.5"]} ${tokens.spacing["2"]}`,
    itemBorderRadius: skin.borderRadius.sm,
    itemText: colors.text,
    itemHoverBg: hexWithAlpha(colors.text, 0.04),
    itemActiveBg: hexWithAlpha(colors.primary, 0.1),
    itemDisabledText: colors.muted,
    separatorColor: colors.border,
    iconColor: colors.muted,
    shortcutColor: colors.muted,
    minWidth: "180px",
  };
}

// ============================================================================
// AVATAR
// ============================================================================

export interface AvatarTokens {
  shape: "circle" | "rounded" | "square";
  /** Default size */
  size: string;
  /** Small size */
  sizeSm: string;
  /** Large size */
  sizeLg: string;
  /** Border radius based on shape */
  borderRadius: string;
  /** Fallback background (initials) */
  fallbackBg: string;
  /** Fallback text color */
  fallbackText: string;
  /** Fallback font size */
  fallbackFontSize: string;
  /** Online indicator color */
  statusOnline: string;
  /** Away indicator color */
  statusAway: string;
  /** DND indicator color */
  statusDnd: string;
  /** Offline indicator color */
  statusOffline: string;
  /** Status indicator size */
  statusSize: string;
  /** Border for group avatar stacking */
  stackBorderColor: string;
  stackBorderWidth: string;
}

function buildAvatarTokens(
  skin: VisualSkin,
  colors: SkinColorPalette,
  tokens: DesignTokens,
): AvatarTokens {
  const shape = skin.components.avatarShape;
  let borderRadius: string;
  switch (shape) {
    case "circle":
      borderRadius = skin.borderRadius.full;
      break;
    case "rounded":
      borderRadius = skin.borderRadius.md;
      break;
    case "square":
      borderRadius = skin.borderRadius.sm;
      break;
    default:
      borderRadius = skin.borderRadius.full;
  }

  return {
    shape,
    size: skin.spacing.avatarSize,
    sizeSm: skin.spacing.avatarSizeSm,
    sizeLg: skin.spacing.avatarSizeLg,
    borderRadius,
    fallbackBg: colors.primary,
    fallbackText: colors.background,
    fallbackFontSize: tokens.typeScale.sm.fontSize,
    statusOnline: colors.success,
    statusAway: colors.warning,
    statusDnd: colors.error,
    statusOffline: colors.muted,
    statusSize: "12px",
    stackBorderColor: colors.background,
    stackBorderWidth: "2px",
  };
}

// ============================================================================
// BADGE
// ============================================================================

export interface BadgeTokens {
  /** Default badge background */
  defaultBg: string;
  /** Default badge text */
  defaultText: string;
  /** Primary variant */
  primaryBg: string;
  primaryText: string;
  /** Success variant */
  successBg: string;
  successText: string;
  /** Warning variant */
  warningBg: string;
  warningText: string;
  /** Error / destructive variant */
  errorBg: string;
  errorText: string;
  /** Muted / secondary variant */
  mutedBg: string;
  mutedText: string;
  /** Font size */
  fontSize: string;
  /** Font weight */
  fontWeight: number;
  /** Padding */
  padding: string;
  /** Border radius */
  borderRadius: string;
  /** Dot size (notification dot) */
  dotSize: string;
}

function buildBadgeTokens(
  skin: VisualSkin,
  colors: SkinColorPalette,
  tokens: DesignTokens,
): BadgeTokens {
  return {
    defaultBg: colors.surface,
    defaultText: colors.text,
    primaryBg: colors.primary,
    primaryText: colors.background,
    successBg: colors.success,
    successText: "#FFFFFF",
    warningBg: colors.warning,
    warningText: "#000000",
    errorBg: colors.error,
    errorText: "#FFFFFF",
    mutedBg: hexWithAlpha(colors.muted, 0.15),
    mutedText: colors.muted,
    fontSize: tokens.typeScale.xs.fontSize,
    fontWeight: tokens.typography.fontWeightMedium,
    padding: `${tokens.spacing["0.5"]} ${tokens.spacing["1.5"]}`,
    borderRadius: skin.borderRadius.full,
    dotSize: "8px",
  };
}

// ============================================================================
// BUTTON
// ============================================================================

export interface ButtonTokens {
  style: "default" | "pill" | "square" | "ghost";
  /** Border radius */
  borderRadius: string;
  /** Font weight */
  fontWeight: number;
  /** Font size */
  fontSize: string;
  /** Height */
  height: string;
  /** Horizontal padding */
  paddingX: string;
  /** Small size height */
  heightSm: string;
  /** Large size height */
  heightLg: string;
  /** Primary variant */
  primaryBg: string;
  primaryText: string;
  primaryHoverBg: string;
  /** Secondary variant */
  secondaryBg: string;
  secondaryText: string;
  secondaryHoverBg: string;
  /** Ghost variant */
  ghostText: string;
  ghostHoverBg: string;
  /** Destructive variant */
  destructiveBg: string;
  destructiveText: string;
  destructiveHoverBg: string;
  /** Disabled */
  disabledBg: string;
  disabledText: string;
  /** Focus ring */
  focusRing: string;
  /** Transition */
  transition: string;
}

function buildButtonTokens(
  skin: VisualSkin,
  colors: SkinColorPalette,
  tokens: DesignTokens,
): ButtonTokens {
  const style = skin.components.buttonStyle;
  let borderRadius: string;
  switch (style) {
    case "pill":
      borderRadius = skin.borderRadius.full;
      break;
    case "square":
      borderRadius = skin.borderRadius.sm;
      break;
    case "ghost":
      borderRadius = skin.borderRadius.md;
      break;
    default:
      borderRadius = skin.borderRadius.md;
  }

  return {
    style,
    borderRadius,
    fontWeight: tokens.typography.fontWeightMedium,
    fontSize: tokens.typeScale.sm.fontSize,
    height: "36px",
    paddingX: tokens.spacing["4"],
    heightSm: "28px",
    heightLg: "44px",
    primaryBg: colors.buttonPrimaryBg,
    primaryText: colors.buttonPrimaryText,
    primaryHoverBg: hexWithAlpha(colors.buttonPrimaryBg, 0.9),
    secondaryBg: colors.buttonSecondaryBg,
    secondaryText: colors.buttonSecondaryText,
    secondaryHoverBg: hexWithAlpha(colors.buttonSecondaryBg, 0.8),
    ghostText: colors.text,
    ghostHoverBg: hexWithAlpha(colors.text, 0.06),
    destructiveBg: colors.error,
    destructiveText: "#FFFFFF",
    destructiveHoverBg: hexWithAlpha(colors.error, 0.9),
    disabledBg: hexWithAlpha(colors.muted, 0.2),
    disabledText: colors.muted,
    focusRing: `0 0 0 2px ${colors.background}, 0 0 0 4px ${colors.primary}`,
    transition: `background-color ${tokens.transitions.durations.fast} ${tokens.transitions.easings.default}, color ${tokens.transitions.durations.fast} ${tokens.transitions.easings.default}`,
  };
}

// ============================================================================
// INPUT / FORM CONTROLS
// ============================================================================

export interface InputTokens {
  style: "default" | "underline" | "filled" | "outline";
  /** Height */
  height: string;
  /** Background */
  background: string;
  /** Background when filled variant */
  filledBg: string;
  /** Border color */
  borderColor: string;
  /** Border color on hover */
  borderColorHover: string;
  /** Border color on focus */
  borderColorFocus: string;
  /** Border radius */
  borderRadius: string;
  /** Text color */
  text: string;
  /** Placeholder color */
  placeholder: string;
  /** Padding */
  padding: string;
  /** Font size */
  fontSize: string;
  /** Error border */
  errorBorderColor: string;
  /** Error text */
  errorText: string;
  /** Label color */
  labelColor: string;
  /** Label font size */
  labelFontSize: string;
  /** Label font weight */
  labelFontWeight: number;
  /** Helper text color */
  helperColor: string;
  /** Disabled opacity */
  disabledOpacity: string;
  /** Focus ring */
  focusRing: string;
}

function buildInputTokens(
  skin: VisualSkin,
  colors: SkinColorPalette,
  tokens: DesignTokens,
  focusRings: FocusRingTokens,
): InputTokens {
  return {
    style: skin.components.inputStyle,
    height: skin.spacing.inputHeight,
    background:
      skin.components.inputStyle === "filled"
        ? colors.surface
        : colors.background,
    filledBg: colors.surface,
    borderColor: colors.border,
    borderColorHover: colors.textSecondary,
    borderColorFocus: colors.primary,
    borderRadius: skin.borderRadius.md,
    text: colors.text,
    placeholder: colors.muted,
    padding: `${tokens.spacing["2"]} ${tokens.spacing["3"]}`,
    fontSize: tokens.typeScale.base.fontSize,
    errorBorderColor: colors.error,
    errorText: colors.error,
    labelColor: colors.text,
    labelFontSize: tokens.typeScale.sm.fontSize,
    labelFontWeight: tokens.typography.fontWeightMedium,
    helperColor: colors.muted,
    disabledOpacity: "0.5",
    focusRing: focusRings.default.boxShadow,
  };
}

// ============================================================================
// CONSOLIDATED COMPONENT TOKENS
// ============================================================================

export interface ComponentTokens {
  messageBubble: MessageBubbleTokens;
  sidebar: SidebarTokens;
  header: HeaderTokens;
  composer: ComposerTokens;
  modal: ModalTokens;
  tooltip: TooltipTokens;
  dropdown: DropdownTokens;
  avatar: AvatarTokens;
  badge: BadgeTokens;
  button: ButtonTokens;
  input: InputTokens;
}

/** List of all component token keys for validation */
export const COMPONENT_NAMES = [
  "messageBubble",
  "sidebar",
  "header",
  "composer",
  "modal",
  "tooltip",
  "dropdown",
  "avatar",
  "badge",
  "button",
  "input",
] as const;

export type ComponentName = (typeof COMPONENT_NAMES)[number];

/**
 * Build the complete component token set from a visual skin.
 *
 * @param skin - The visual skin to derive tokens from. Defaults to nchatSkin.
 * @param isDarkMode - Whether to use dark mode colors.
 * @returns Fully resolved ComponentTokens.
 */
export function getComponentTokens(
  skin: VisualSkin = nchatSkin,
  isDarkMode: boolean = false,
): ComponentTokens {
  const colors = isDarkMode ? skin.darkMode.colors : skin.colors;
  const tokens = getDesignTokens(skin, isDarkMode);
  const focusRings = buildFocusRingTokens(colors);

  return {
    messageBubble: buildMessageBubbleTokens(skin, colors, tokens),
    sidebar: buildSidebarTokens(skin, colors, tokens),
    header: buildHeaderTokens(skin, colors, tokens),
    composer: buildComposerTokens(skin, colors, tokens),
    modal: buildModalTokens(skin, colors, tokens),
    tooltip: buildTooltipTokens(skin, colors, tokens),
    dropdown: buildDropdownTokens(skin, colors, tokens),
    avatar: buildAvatarTokens(skin, colors, tokens),
    badge: buildBadgeTokens(skin, colors, tokens),
    button: buildButtonTokens(skin, colors, tokens),
    input: buildInputTokens(skin, colors, tokens, focusRings),
  };
}

/**
 * Convert component tokens to a flat CSS custom properties map.
 */
export function componentTokensToCSSVariables(
  componentTokens: ComponentTokens,
  prefix: string = "--ct",
): Record<string, string> {
  const vars: Record<string, string> = {};

  for (const [componentKey, componentValue] of Object.entries(
    componentTokens,
  )) {
    const kebabComponent = componentKey
      .replace(/([A-Z])/g, "-$1")
      .toLowerCase();
    for (const [tokenKey, tokenValue] of Object.entries(
      componentValue as Record<string, unknown>,
    )) {
      if (typeof tokenValue === "string" || typeof tokenValue === "number") {
        const kebabToken = tokenKey.replace(/([A-Z])/g, "-$1").toLowerCase();
        vars[`${prefix}-${kebabComponent}-${kebabToken}`] = String(tokenValue);
      }
    }
  }

  return vars;
}
