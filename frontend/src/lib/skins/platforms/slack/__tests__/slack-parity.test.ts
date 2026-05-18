/**
 * Slack Parity Comprehensive Tests
 *
 * Tests validating that the Slack skin + behavior preset accurately
 * matches Slack's visual design, interaction patterns, feature set,
 * and navigation structure.
 *
 * Test categories:
 *   1. Visual Skin Values (colors, typography, spacing, shadows)
 *   2. Behavior Preset (feature toggles, limits, enabled/disabled)
 *   3. Navigation Pattern (rail, sidebar, header, thread panel)
 *   4. Composer Config (formatting toolbar, attachments, slash commands, emoji)
 *   5. Parity Checklist (all Slack features mapped)
 *   6. Skin Engine Integration (apply skin, CSS variables)
 *   7. Dark/Light Mode Variants
 *   8. Extended Behaviors (workspace, huddles, canvas, workflows, search, apps)
 *   9. Responsive Adaptations (desktop vs mobile)
 *   10. Cross-Module Consistency
 *
 * @module lib/skins/platforms/slack/__tests__/slack-parity
 */

import {
  slackLightColors,
  slackDarkColors,
  slackExtendedLightColors,
  slackExtendedDarkColors,
  slackTypography,
  slackSpacing,
  slackBorderRadius,
  slackIcons,
  slackComponentStyles,
  slackLightShadows,
  slackDarkShadows,
  slackDetailedSkin,
  slackVisualConfig,
} from "../visual";

import {
  slackWorkspaceConfig,
  slackSectionsConfig,
  slackHuddleConfig,
  slackCanvasConfig,
  slackWorkflowConfig,
  slackFormattingConfig,
  slackSearchConfig,
  slackAppConfig,
  slackRemindersConfig,
  slackDmConfig,
  slackDetailedBehavior,
  slackExtendedBehavior,
  slackBehaviorConfig,
} from "../behavior";

import {
  slackRailItems,
  slackMobileRailItems,
  slackHeaderActions,
  slackDefaultSections,
  slackDesktopNavigation,
  slackMobileNavigation,
  slackDesktopNavigationDark,
  slackMobileNavigationDark,
  getSlackNavigation,
  getSlackDefaultRailItem,
  getSlackRailItemCount,
  getSlackRailItemById,
  getSlackHeaderActionCount,
  getSlackHeaderActionById,
  getSlackDefaultSectionCount,
} from "../navigation";

import {
  slackFormattingToolbar,
  slackAttachmentMenuLight,
  slackSlashCommandConfig,
  slackMentionConfig,
  slackEmojiPickerConfig,
  slackReplyConfigLight,
  slackReplyConfigDark,
  slackScheduleConfig,
  slackSendButtonLight,
  slackSendButtonDark,
  slackComposerLight,
  slackComposerDark,
  getSlackComposer,
  getSlackAttachmentMenu,
  getSlackAttachmentById,
  getSlackAttachmentCount,
  getSlackFormattingButtonCount,
  getSlackBuiltInCommandCount,
} from "../composer";

import {
  slackParityChecklist,
  getSlackParityItemsByCategory,
  getSlackParityItemsByPriority,
  getSlackParityItemsByStatus,
  getSlackParityItemById,
  verifySlackCriticalParity,
  getSlackCategoryParityPercentage,
} from "../parity-checklist";

import {
  validateSkin,
  validateBehavior,
  skinToCSSVariables,
  colorsToCSSVariables,
  deepMerge,
} from "../../../skin-engine";

// ============================================================================
// 1. VISUAL SKIN VALUES
// ============================================================================

describe("Slack Visual Skin", () => {
  describe("Light Mode Colors", () => {
    it("has aubergine primary (#611F69)", () => {
      expect(slackLightColors.primary).toBe("#611F69");
    });

    it("has darker aubergine secondary (#4A154B)", () => {
      expect(slackLightColors.secondary).toBe("#4A154B");
    });

    it("has yellow accent (#ECB22E)", () => {
      expect(slackLightColors.accent).toBe("#ECB22E");
    });

    it("has white background", () => {
      expect(slackLightColors.background).toBe("#FFFFFF");
    });

    it("has light gray surface (#F8F8F8)", () => {
      expect(slackLightColors.surface).toBe("#F8F8F8");
    });

    it("has near-black text (#1D1C1D)", () => {
      expect(slackLightColors.text).toBe("#1D1C1D");
    });

    it("has gray secondary text (#616061)", () => {
      expect(slackLightColors.textSecondary).toBe("#616061");
    });

    it("has muted gray (#696969)", () => {
      expect(slackLightColors.muted).toBe("#696969");
    });

    it("has light border (#DDDDDC)", () => {
      expect(slackLightColors.border).toBe("#DDDDDC");
    });

    it("has green success (#007A5A)", () => {
      expect(slackLightColors.success).toBe("#007A5A");
    });

    it("has yellow warning (#ECB22E)", () => {
      expect(slackLightColors.warning).toBe("#ECB22E");
    });

    it("has pink-red error (#E01E5A)", () => {
      expect(slackLightColors.error).toBe("#E01E5A");
    });

    it("has blue info (#1264A3)", () => {
      expect(slackLightColors.info).toBe("#1264A3");
    });

    it("has green primary button (#007A5A)", () => {
      expect(slackLightColors.buttonPrimaryBg).toBe("#007A5A");
    });

    it("has white primary button text", () => {
      expect(slackLightColors.buttonPrimaryText).toBe("#FFFFFF");
    });

    it("has white secondary button bg", () => {
      expect(slackLightColors.buttonSecondaryBg).toBe("#FFFFFF");
    });

    it("has dark secondary button text (#1D1C1D)", () => {
      expect(slackLightColors.buttonSecondaryText).toBe("#1D1C1D");
    });
  });

  describe("Dark Mode Colors", () => {
    it("has light purple primary in dark mode", () => {
      expect(slackDarkColors.primary).toBe("#D1B3D3");
    });

    it("has dark background (#1A1D21)", () => {
      expect(slackDarkColors.background).toBe("#1A1D21");
    });

    it("has dark surface (#222529)", () => {
      expect(slackDarkColors.surface).toBe("#222529");
    });

    it("has light text (#D1D2D3)", () => {
      expect(slackDarkColors.text).toBe("#D1D2D3");
    });

    it("has muted secondary text (#ABABAD)", () => {
      expect(slackDarkColors.textSecondary).toBe("#ABABAD");
    });

    it("has dark border (#35383C)", () => {
      expect(slackDarkColors.border).toBe("#35383C");
    });

    it("has bright green success (#2BAC76)", () => {
      expect(slackDarkColors.success).toBe("#2BAC76");
    });

    it("has cyan info in dark mode (#36C5F0)", () => {
      expect(slackDarkColors.info).toBe("#36C5F0");
    });

    it("has green primary button in dark mode (#2BAC76)", () => {
      expect(slackDarkColors.buttonPrimaryBg).toBe("#2BAC76");
    });

    it("retains yellow accent in dark mode", () => {
      expect(slackDarkColors.accent).toBe("#ECB22E");
    });
  });

  describe("Extended Light Colors", () => {
    it("has aubergine sidebar bg (#4A154B)", () => {
      expect(slackExtendedLightColors.sidebarBg).toBe("#4A154B");
    });

    it("has white sidebar text", () => {
      expect(slackExtendedLightColors.sidebarText).toBe("#FFFFFF");
    });

    it("has blue selected sidebar item bg (#1264A3)", () => {
      expect(slackExtendedLightColors.sidebarSelectedBg).toBe("#1264A3");
    });

    it("has red mention badge (#E01E5A)", () => {
      expect(slackExtendedLightColors.mentionBadgeBg).toBe("#E01E5A");
    });

    it("has blue link color (#1264A3)", () => {
      expect(slackExtendedLightColors.linkColor).toBe("#1264A3");
    });

    it("has yellow star color (#ECB22E)", () => {
      expect(slackExtendedLightColors.starColor).toBe("#ECB22E");
    });

    it("has green presence indicator (#2BAC76)", () => {
      expect(slackExtendedLightColors.presenceOnline).toBe("#2BAC76");
    });

    it("has yellow away indicator (#ECB22E)", () => {
      expect(slackExtendedLightColors.presenceAway).toBe("#ECB22E");
    });

    it("has red DND indicator (#E01E5A)", () => {
      expect(slackExtendedLightColors.presenceDnd).toBe("#E01E5A");
    });

    it("has green huddle active color (#007A5A)", () => {
      expect(slackExtendedLightColors.huddleActiveText).toBe("#007A5A");
    });

    it("has workspace switcher bg (#350D36)", () => {
      expect(slackExtendedLightColors.workspaceSwitcherBg).toBe("#350D36");
    });

    it("has mention highlight bg (#FCE8B2)", () => {
      expect(slackExtendedLightColors.mentionHighlightBg).toBe("#FCE8B2");
    });

    it("has header bg white", () => {
      expect(slackExtendedLightColors.headerBg).toBe("#FFFFFF");
    });

    it("has header border (#DDDDDC)", () => {
      expect(slackExtendedLightColors.headerBorder).toBe("#DDDDDC");
    });
  });

  describe("Extended Dark Colors", () => {
    it("has dark sidebar bg (#1A1D21)", () => {
      expect(slackExtendedDarkColors.sidebarBg).toBe("#1A1D21");
    });

    it("has light sidebar text (#D1D2D3)", () => {
      expect(slackExtendedDarkColors.sidebarText).toBe("#D1D2D3");
    });

    it("has cyan link color (#36C5F0)", () => {
      expect(slackExtendedDarkColors.linkColor).toBe("#36C5F0");
    });

    it("retains red mention badge in dark", () => {
      expect(slackExtendedDarkColors.mentionBadgeBg).toBe("#E01E5A");
    });

    it("retains yellow star in dark", () => {
      expect(slackExtendedDarkColors.starColor).toBe("#ECB22E");
    });
  });

  describe("Typography", () => {
    it("uses Lato-based font family", () => {
      expect(slackTypography.fontFamily).toContain("Lato");
    });

    it("uses Slack-Lato as primary font", () => {
      expect(slackTypography.fontFamily).toContain("Slack-Lato");
    });

    it("uses Monaco-based mono font", () => {
      expect(slackTypography.fontFamilyMono).toContain("Monaco");
    });

    it("has 15px base font size", () => {
      expect(slackTypography.fontSizeBase).toBe("15px");
    });

    it("has 12px small font size", () => {
      expect(slackTypography.fontSizeSm).toBe("12px");
    });

    it("has 18px large font size", () => {
      expect(slackTypography.fontSizeLg).toBe("18px");
    });

    it("has 22px xl font size", () => {
      expect(slackTypography.fontSizeXl).toBe("22px");
    });

    it("has 400 normal weight", () => {
      expect(slackTypography.fontWeightNormal).toBe(400);
    });

    it("has 700 bold weight", () => {
      expect(slackTypography.fontWeightBold).toBe(700);
    });

    it("has ~1.46668 line height", () => {
      expect(slackTypography.lineHeight).toBe(1.46668);
    });

    it("has normal letter spacing", () => {
      expect(slackTypography.letterSpacing).toBe("normal");
    });
  });

  describe("Spacing", () => {
    it("has 0px message gap", () => {
      expect(slackSpacing.messageGap).toBe("0px");
    });

    it("has 4px 20px message padding", () => {
      expect(slackSpacing.messagePadding).toBe("4px 20px");
    });

    it("has 260px sidebar width", () => {
      expect(slackSpacing.sidebarWidth).toBe("260px");
    });

    it("has 49px header height", () => {
      expect(slackSpacing.headerHeight).toBe("49px");
    });

    it("has 36px avatar size", () => {
      expect(slackSpacing.avatarSize).toBe("36px");
    });

    it("has 20px small avatar size", () => {
      expect(slackSpacing.avatarSizeSm).toBe("20px");
    });

    it("has 48px large avatar size", () => {
      expect(slackSpacing.avatarSizeLg).toBe("48px");
    });
  });

  describe("Border Radius", () => {
    it("has 0px none", () => {
      expect(slackBorderRadius.none).toBe("0px");
    });

    it("has 4px sm", () => {
      expect(slackBorderRadius.sm).toBe("4px");
    });

    it("has 6px md", () => {
      expect(slackBorderRadius.md).toBe("6px");
    });

    it("has 8px lg", () => {
      expect(slackBorderRadius.lg).toBe("8px");
    });

    it("has 12px xl", () => {
      expect(slackBorderRadius.xl).toBe("12px");
    });

    it("has 9999px full", () => {
      expect(slackBorderRadius.full).toBe("9999px");
    });
  });

  describe("Icons", () => {
    it("uses outline style", () => {
      expect(slackIcons.style).toBe("outline");
    });

    it("uses lucide set", () => {
      expect(slackIcons.set).toBe("lucide");
    });

    it("has 1.5 stroke width", () => {
      expect(slackIcons.strokeWidth).toBe(1.5);
    });
  });

  describe("Component Styles", () => {
    it("uses default (flat) message layout", () => {
      expect(slackComponentStyles.messageLayout).toBe("default");
    });

    it("uses rounded avatar shape", () => {
      expect(slackComponentStyles.avatarShape).toBe("rounded");
    });

    it("uses default button style", () => {
      expect(slackComponentStyles.buttonStyle).toBe("default");
    });

    it("uses outline input style", () => {
      expect(slackComponentStyles.inputStyle).toBe("outline");
    });

    it("uses default sidebar style", () => {
      expect(slackComponentStyles.sidebarStyle).toBe("default");
    });

    it("uses default header style", () => {
      expect(slackComponentStyles.headerStyle).toBe("default");
    });

    it("uses default scrollbar style", () => {
      expect(slackComponentStyles.scrollbarStyle).toBe("default");
    });
  });

  describe("Shadows", () => {
    it("has no header shadow (uses border)", () => {
      expect(slackLightShadows.header).toBe("none");
    });

    it("has dropdown shadow", () => {
      expect(slackLightShadows.dropdown).toContain("rgba");
    });

    it("has modal shadow", () => {
      expect(slackLightShadows.modal).toContain("rgba");
    });

    it("has message action bar shadow", () => {
      expect(slackLightShadows.messageActionBar).toContain("rgba");
    });

    it("has thread panel border shadow", () => {
      expect(slackLightShadows.threadPanel).toContain("#DDDDDC");
    });

    it("dark mode has no header shadow", () => {
      expect(slackDarkShadows.header).toBe("none");
    });

    it("dark mode thread panel uses dark border", () => {
      expect(slackDarkShadows.threadPanel).toContain("#35383C");
    });
  });

  describe("Assembled Skin", () => {
    it("has correct id", () => {
      expect(slackDetailedSkin.id).toBe("slack-detailed");
    });

    it("has correct name", () => {
      expect(slackDetailedSkin.name).toBe("Slack");
    });

    it("has version 0.9.1", () => {
      expect(slackDetailedSkin.version).toBe("0.9.1");
    });

    it("passes skin validation", () => {
      const result = validateSkin(slackDetailedSkin);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("has both light and dark colors", () => {
      expect(slackDetailedSkin.colors).toBeDefined();
      expect(slackDetailedSkin.darkMode.colors).toBeDefined();
    });
  });

  describe("Visual Config", () => {
    it("includes the skin", () => {
      expect(slackVisualConfig.skin).toBe(slackDetailedSkin);
    });

    it("includes light and dark extended colors", () => {
      expect(slackVisualConfig.extendedColors.light).toBe(
        slackExtendedLightColors,
      );
      expect(slackVisualConfig.extendedColors.dark).toBe(
        slackExtendedDarkColors,
      );
    });

    it("includes light and dark shadows", () => {
      expect(slackVisualConfig.shadows.light).toBe(slackLightShadows);
      expect(slackVisualConfig.shadows.dark).toBe(slackDarkShadows);
    });
  });
});

// ============================================================================
// 2. BEHAVIOR PRESET
// ============================================================================

describe("Slack Behavior Preset", () => {
  describe("Messaging", () => {
    it("allows unlimited edit window", () => {
      expect(slackDetailedBehavior.messaging.editWindow).toBe(0);
    });

    it("allows unlimited delete window", () => {
      expect(slackDetailedBehavior.messaging.deleteWindow).toBe(0);
    });

    it("does not allow delete-for-everyone (admin only)", () => {
      expect(slackDetailedBehavior.messaging.deleteForEveryone).toBe(false);
    });

    it("shows edited indicator", () => {
      expect(slackDetailedBehavior.messaging.showEditedIndicator).toBe(true);
    });

    it("uses full emoji reaction picker", () => {
      expect(slackDetailedBehavior.messaging.reactionStyle).toBe("full-picker");
    });

    it("allows max 23 reactions per message", () => {
      expect(slackDetailedBehavior.messaging.maxReactionsPerMessage).toBe(23);
    });

    it("uses side-panel threading", () => {
      expect(slackDetailedBehavior.messaging.threadingModel).toBe("side-panel");
    });

    it("allows 40,000 character messages", () => {
      expect(slackDetailedBehavior.messaging.maxMessageLength).toBe(40000);
    });

    it("supports message forwarding", () => {
      expect(slackDetailedBehavior.messaging.forwarding).toBe(true);
    });

    it("has unlimited forward limit", () => {
      expect(slackDetailedBehavior.messaging.forwardLimit).toBe(0);
    });

    it("supports message pinning", () => {
      expect(slackDetailedBehavior.messaging.pinning).toBe(true);
    });

    it("supports bookmarking/save for later", () => {
      expect(slackDetailedBehavior.messaging.bookmarking).toBe(true);
    });

    it("supports scheduled messages", () => {
      expect(slackDetailedBehavior.messaging.scheduling).toBe(true);
    });

    it("supports link previews", () => {
      expect(slackDetailedBehavior.messaging.linkPreviews).toBe(true);
    });
  });

  describe("Channels", () => {
    it("supports public channels", () => {
      expect(slackDetailedBehavior.channels.types).toContain("public");
    });

    it("supports private channels", () => {
      expect(slackDetailedBehavior.channels.types).toContain("private");
    });

    it("supports DMs", () => {
      expect(slackDetailedBehavior.channels.types).toContain("dm");
    });

    it("supports group DMs", () => {
      expect(slackDetailedBehavior.channels.types).toContain("group-dm");
    });

    it("has 4 channel types (no forum, voice, stage, etc)", () => {
      expect(slackDetailedBehavior.channels.types).toHaveLength(4);
    });

    it("has no hierarchy (flat structure)", () => {
      expect(slackDetailedBehavior.channels.hierarchy).toBe(false);
    });

    it("has no categories (uses sections)", () => {
      expect(slackDetailedBehavior.channels.categories).toBe(false);
    });

    it("has no forums", () => {
      expect(slackDetailedBehavior.channels.forums).toBe(false);
    });

    it("allows max 9 group DM members", () => {
      expect(slackDetailedBehavior.channels.maxGroupDmMembers).toBe(9);
    });

    it("allows max 500K group members", () => {
      expect(slackDetailedBehavior.channels.maxGroupMembers).toBe(500000);
    });

    it("supports archiving", () => {
      expect(slackDetailedBehavior.channels.archiving).toBe(true);
    });

    it("has no slow mode", () => {
      expect(slackDetailedBehavior.channels.slowMode).toBe(false);
    });
  });

  describe("Presence", () => {
    it("has 4 presence states: online, away, dnd, offline", () => {
      expect(slackDetailedBehavior.presence.states).toEqual([
        "online",
        "away",
        "dnd",
        "offline",
      ]);
    });

    it("does not show last seen", () => {
      expect(slackDetailedBehavior.presence.showLastSeen).toBe(false);
    });

    it("supports custom status", () => {
      expect(slackDetailedBehavior.presence.customStatus).toBe(true);
    });

    it("supports activity status", () => {
      expect(slackDetailedBehavior.presence.activityStatus).toBe(true);
    });

    it("has typing indicator", () => {
      expect(slackDetailedBehavior.presence.typingIndicator).toBe(true);
    });

    it("auto-away after 30 minutes", () => {
      expect(slackDetailedBehavior.presence.autoAwayTimeout).toBe(1800000);
    });

    it("has no invisible mode", () => {
      expect(slackDetailedBehavior.presence.invisibleMode).toBe(false);
    });
  });

  describe("Calls", () => {
    it("supports calls", () => {
      expect(slackDetailedBehavior.calls.supported).toBe(true);
    });

    it("supports voice calls", () => {
      expect(slackDetailedBehavior.calls.voiceCalls).toBe(true);
    });

    it("supports video calls", () => {
      expect(slackDetailedBehavior.calls.videoCalls).toBe(true);
    });

    it("supports group calls", () => {
      expect(slackDetailedBehavior.calls.groupCalls).toBe(true);
    });

    it("max 50 participants in group calls", () => {
      expect(slackDetailedBehavior.calls.groupMax).toBe(50);
    });

    it("supports screen sharing", () => {
      expect(slackDetailedBehavior.calls.screenShare).toBe(true);
    });

    it("does not support call recording", () => {
      expect(slackDetailedBehavior.calls.recording).toBe(false);
    });

    it("supports huddles", () => {
      expect(slackDetailedBehavior.calls.huddles).toBe(true);
    });
  });

  describe("Notifications", () => {
    it("defaults to mentions-only notifications", () => {
      expect(slackDetailedBehavior.notifications.defaultLevel).toBe("mentions");
    });

    it("has mention rules: user, channel, here, everyone", () => {
      expect(slackDetailedBehavior.notifications.mentionRules).toContain(
        "user",
      );
      expect(slackDetailedBehavior.notifications.mentionRules).toContain(
        "channel",
      );
      expect(slackDetailedBehavior.notifications.mentionRules).toContain(
        "here",
      );
      expect(slackDetailedBehavior.notifications.mentionRules).toContain(
        "everyone",
      );
    });

    it("supports quiet hours", () => {
      expect(slackDetailedBehavior.notifications.quietHours).toBe(true);
    });

    it("supports thread notifications", () => {
      expect(slackDetailedBehavior.notifications.threadNotifications).toBe(
        true,
      );
    });

    it("has sound enabled", () => {
      expect(slackDetailedBehavior.notifications.soundEnabled).toBe(true);
    });

    it("supports badge count", () => {
      expect(slackDetailedBehavior.notifications.badgeCount).toBe(true);
    });

    it("supports email digest", () => {
      expect(slackDetailedBehavior.notifications.emailDigest).toBe(true);
    });
  });

  describe("Moderation", () => {
    it("has no profanity filter", () => {
      expect(slackDetailedBehavior.moderation.profanityFilter).toBe(false);
    });

    it("has no spam detection", () => {
      expect(slackDetailedBehavior.moderation.spamDetection).toBe(false);
    });

    it("has no automod", () => {
      expect(slackDetailedBehavior.moderation.automod).toBe(false);
    });

    it("has no report system", () => {
      expect(slackDetailedBehavior.moderation.reportSystem).toBe(false);
    });
  });

  describe("Privacy", () => {
    it("has read receipts on", () => {
      expect(slackDetailedBehavior.privacy.readReceipts).toBe(true);
    });

    it("read receipts are not optional", () => {
      expect(slackDetailedBehavior.privacy.readReceiptsOptional).toBe(false);
    });

    it("does not show last seen", () => {
      expect(slackDetailedBehavior.privacy.lastSeen).toBe(false);
    });

    it("profiles visible to everyone", () => {
      expect(slackDetailedBehavior.privacy.profileVisibility).toBe("everyone");
    });

    it("online status visible", () => {
      expect(slackDetailedBehavior.privacy.onlineStatusVisible).toBe(true);
    });

    it("E2EE not default", () => {
      expect(slackDetailedBehavior.privacy.e2eeDefault).toBe(false);
    });

    it("no disappearing messages", () => {
      expect(slackDetailedBehavior.privacy.disappearingMessages).toBe(false);
    });

    it("no disappearing options", () => {
      expect(slackDetailedBehavior.privacy.disappearingOptions).toEqual([]);
    });
  });

  describe("Feature Flags", () => {
    it("supports rich text", () => {
      expect(slackDetailedBehavior.features.richText).toBe(true);
    });

    it("supports markdown", () => {
      expect(slackDetailedBehavior.features.markdown).toBe(true);
    });

    it("supports code blocks", () => {
      expect(slackDetailedBehavior.features.codeBlocks).toBe(true);
    });

    it("supports mentions", () => {
      expect(slackDetailedBehavior.features.mentions).toBe(true);
    });

    it("supports custom emoji", () => {
      expect(slackDetailedBehavior.features.customEmoji).toBe(true);
    });

    it("supports GIFs", () => {
      expect(slackDetailedBehavior.features.gifs).toBe(true);
    });

    it("does NOT support stickers", () => {
      expect(slackDetailedBehavior.features.stickers).toBe(false);
    });

    it("does NOT support polls", () => {
      expect(slackDetailedBehavior.features.polls).toBe(false);
    });

    it("does NOT support voice messages", () => {
      expect(slackDetailedBehavior.features.voiceMessages).toBe(false);
    });

    it("supports file uploads", () => {
      expect(slackDetailedBehavior.features.fileUploads).toBe(true);
    });

    it("does NOT support location sharing", () => {
      expect(slackDetailedBehavior.features.locationSharing).toBe(false);
    });

    it("does NOT support contact sharing", () => {
      expect(slackDetailedBehavior.features.contactSharing).toBe(false);
    });

    it("does NOT support stories", () => {
      expect(slackDetailedBehavior.features.stories).toBe(false);
    });

    it("supports huddles feature flag", () => {
      expect(slackDetailedBehavior.features.huddles).toBe(true);
    });

    it("supports canvas feature flag", () => {
      expect(slackDetailedBehavior.features.canvas).toBe(true);
    });

    it("supports workflows feature flag", () => {
      expect(slackDetailedBehavior.features.workflows).toBe(true);
    });

    it("supports slash commands feature flag", () => {
      expect(slackDetailedBehavior.features.slashCommands).toBe(true);
    });

    it("supports scheduled messages feature flag", () => {
      expect(slackDetailedBehavior.features.scheduledMessages).toBe(true);
    });

    it("supports reminders feature flag", () => {
      expect(slackDetailedBehavior.features.reminders).toBe(true);
    });

    it("supports keyword alerts", () => {
      expect(slackDetailedBehavior.features.keywordAlerts).toBe(true);
    });
  });

  describe("Behavior Validation", () => {
    it("passes behavior validation", () => {
      const result = validateBehavior(slackDetailedBehavior);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("has correct id", () => {
      expect(slackDetailedBehavior.id).toBe("slack-detailed");
    });

    it("has correct name", () => {
      expect(slackDetailedBehavior.name).toBe("Slack");
    });

    it("has version 0.9.1", () => {
      expect(slackDetailedBehavior.version).toBe("0.9.1");
    });
  });
});

// ============================================================================
// 3. NAVIGATION PATTERN
// ============================================================================

describe("Slack Navigation", () => {
  describe("Desktop Rail Items", () => {
    it("has 5 rail items", () => {
      expect(slackRailItems).toHaveLength(5);
    });

    it("first item is Home", () => {
      expect(slackRailItems[0].id).toBe("home");
      expect(slackRailItems[0].label).toBe("Home");
    });

    it("second item is DMs", () => {
      expect(slackRailItems[1].id).toBe("dms");
    });

    it("third item is Activity", () => {
      expect(slackRailItems[2].id).toBe("activity");
    });

    it("fourth item is Later", () => {
      expect(slackRailItems[3].id).toBe("later");
    });

    it("fifth item is More", () => {
      expect(slackRailItems[4].id).toBe("more");
    });

    it("Home is the default item", () => {
      expect(slackRailItems[0].isDefault).toBe(true);
    });

    it("all items have icons", () => {
      slackRailItems.forEach((item) => {
        expect(item.icon).toBeTruthy();
      });
    });

    it("all items have tooltips", () => {
      slackRailItems.forEach((item) => {
        expect(item.tooltip).toBeTruthy();
      });
    });
  });

  describe("Mobile Rail Items", () => {
    it("has 5 mobile rail items", () => {
      expect(slackMobileRailItems).toHaveLength(5);
    });

    it("includes Search tab on mobile", () => {
      const searchTab = slackMobileRailItems.find((t) => t.id === "search");
      expect(searchTab).toBeDefined();
    });

    it("includes You tab on mobile", () => {
      const youTab = slackMobileRailItems.find((t) => t.id === "you");
      expect(youTab).toBeDefined();
    });

    it("does not include Later on mobile", () => {
      const laterTab = slackMobileRailItems.find((t) => t.id === "later");
      expect(laterTab).toBeUndefined();
    });
  });

  describe("Header Actions", () => {
    it("has 6 header actions", () => {
      expect(slackHeaderActions).toHaveLength(6);
    });

    it("includes huddle action", () => {
      expect(slackHeaderActions.find((a) => a.id === "huddle")).toBeDefined();
    });

    it("includes canvas action", () => {
      expect(slackHeaderActions.find((a) => a.id === "canvas")).toBeDefined();
    });

    it("includes members action", () => {
      expect(slackHeaderActions.find((a) => a.id === "members")).toBeDefined();
    });

    it("includes pins action", () => {
      expect(slackHeaderActions.find((a) => a.id === "pins")).toBeDefined();
    });

    it("includes bookmarks action", () => {
      expect(
        slackHeaderActions.find((a) => a.id === "bookmarks"),
      ).toBeDefined();
    });

    it("includes search action", () => {
      expect(slackHeaderActions.find((a) => a.id === "search")).toBeDefined();
    });

    it("actions are ordered", () => {
      for (let i = 0; i < slackHeaderActions.length - 1; i++) {
        expect(slackHeaderActions[i].order).toBeLessThan(
          slackHeaderActions[i + 1].order,
        );
      }
    });
  });

  describe("Default Sections", () => {
    it("has 4 default sections", () => {
      expect(slackDefaultSections).toHaveLength(4);
    });

    it("includes Starred section", () => {
      expect(
        slackDefaultSections.find((s) => s.id === "starred"),
      ).toBeDefined();
    });

    it("includes Channels section", () => {
      expect(
        slackDefaultSections.find((s) => s.id === "channels"),
      ).toBeDefined();
    });

    it("includes Direct messages section", () => {
      expect(
        slackDefaultSections.find((s) => s.id === "direct-messages"),
      ).toBeDefined();
    });

    it("includes Apps section", () => {
      expect(slackDefaultSections.find((s) => s.id === "apps")).toBeDefined();
    });

    it("Apps section is collapsed by default", () => {
      const appsSection = slackDefaultSections.find((s) => s.id === "apps");
      expect(appsSection?.collapsed).toBe(true);
    });
  });

  describe("Desktop Navigation Config", () => {
    it("has desktop platform", () => {
      expect(slackDesktopNavigation.platform).toBe("desktop");
    });

    it("has aubergine sidebar bg", () => {
      expect(slackDesktopNavigation.sidebarBg).toBe("#4A154B");
    });

    it("has 260px sidebar width", () => {
      expect(slackDesktopNavigation.sidebarWidth).toBe("260px");
    });

    it("has 400px thread panel width", () => {
      expect(slackDesktopNavigation.threadPanelWidth).toBe("400px");
    });

    it("thread panel is resizable", () => {
      expect(slackDesktopNavigation.threadPanelResizable).toBe(true);
    });

    it("search in header", () => {
      expect(slackDesktopNavigation.searchPlacement).toBe("header");
    });

    it("rail has workspace switcher", () => {
      expect(slackDesktopNavigation.rail.showWorkspaceSwitcher).toBe(true);
    });

    it("rail bg is aubergine (#4A154B)", () => {
      expect(slackDesktopNavigation.rail.backgroundColor).toBe("#4A154B");
    });

    it("rail width is 68px", () => {
      expect(slackDesktopNavigation.rail.width).toBe("68px");
    });

    it("header height is 49px", () => {
      expect(slackDesktopNavigation.header.height).toBe("49px");
    });

    it("header has border bottom", () => {
      expect(slackDesktopNavigation.header.borderBottom).toContain("#DDDDDC");
    });

    it("header shows channel name", () => {
      expect(slackDesktopNavigation.header.showChannelName).toBe(true);
    });

    it("header shows topic", () => {
      expect(slackDesktopNavigation.header.showTopic).toBe(true);
    });

    it("header shows star", () => {
      expect(slackDesktopNavigation.header.showStar).toBe(true);
    });
  });

  describe("Navigation Helpers", () => {
    it("getSlackNavigation returns desktop config", () => {
      const nav = getSlackNavigation("desktop");
      expect(nav.platform).toBe("desktop");
    });

    it("getSlackNavigation returns mobile config", () => {
      const nav = getSlackNavigation("mobile");
      expect(nav.platform).toBe("mobile");
    });

    it("getSlackNavigation returns dark mode desktop", () => {
      const nav = getSlackNavigation("desktop", true);
      expect(nav.sidebarBg).toBe("#1A1D21");
    });

    it("getSlackNavigation returns dark mode mobile", () => {
      const nav = getSlackNavigation("mobile", true);
      expect(nav.sidebarBg).toBe("#1A1D21");
    });

    it("getSlackDefaultRailItem returns Home", () => {
      const item = getSlackDefaultRailItem("desktop");
      expect(item.id).toBe("home");
    });

    it("getSlackRailItemCount returns 5 for desktop", () => {
      expect(getSlackRailItemCount("desktop")).toBe(5);
    });

    it("getSlackRailItemCount returns 5 for mobile", () => {
      expect(getSlackRailItemCount("mobile")).toBe(5);
    });

    it("getSlackRailItemById finds dms", () => {
      const item = getSlackRailItemById("desktop", "dms");
      expect(item).toBeDefined();
      expect(item?.label).toBe("DMs");
    });

    it("getSlackRailItemById returns undefined for non-existent", () => {
      expect(getSlackRailItemById("desktop", "nonexistent")).toBeUndefined();
    });

    it("getSlackHeaderActionCount returns 6", () => {
      expect(getSlackHeaderActionCount()).toBe(6);
    });

    it("getSlackHeaderActionById finds huddle", () => {
      const action = getSlackHeaderActionById("huddle");
      expect(action).toBeDefined();
      expect(action?.label).toBe("Huddle");
    });

    it("getSlackDefaultSectionCount returns 4", () => {
      expect(getSlackDefaultSectionCount()).toBe(4);
    });
  });

  describe("Dark Mode Navigation", () => {
    it("desktop dark has dark sidebar", () => {
      expect(slackDesktopNavigationDark.sidebarBg).toBe("#1A1D21");
    });

    it("desktop dark has dark rail", () => {
      expect(slackDesktopNavigationDark.rail.backgroundColor).toBe("#1A1D21");
    });

    it("desktop dark has dark header", () => {
      expect(slackDesktopNavigationDark.header.backgroundColor).toBe("#222529");
    });

    it("mobile dark has dark header", () => {
      expect(slackMobileNavigationDark.header.backgroundColor).toBe("#222529");
    });

    it("mobile dark has dark rail", () => {
      expect(slackMobileNavigationDark.rail.backgroundColor).toBe("#1A1D21");
    });
  });
});

// ============================================================================
// 4. COMPOSER CONFIG
// ============================================================================

describe("Slack Composer", () => {
  describe("Formatting Toolbar", () => {
    it("has 9 formatting buttons", () => {
      expect(slackFormattingToolbar).toHaveLength(9);
    });

    it("includes bold button", () => {
      expect(slackFormattingToolbar.find((b) => b.id === "bold")).toBeDefined();
    });

    it("includes italic button", () => {
      expect(
        slackFormattingToolbar.find((b) => b.id === "italic"),
      ).toBeDefined();
    });

    it("includes strikethrough button", () => {
      expect(
        slackFormattingToolbar.find((b) => b.id === "strikethrough"),
      ).toBeDefined();
    });

    it("includes code button", () => {
      expect(slackFormattingToolbar.find((b) => b.id === "code")).toBeDefined();
    });

    it("includes link button", () => {
      expect(slackFormattingToolbar.find((b) => b.id === "link")).toBeDefined();
    });

    it("includes ordered list button", () => {
      expect(
        slackFormattingToolbar.find((b) => b.id === "ordered-list"),
      ).toBeDefined();
    });

    it("includes unordered list button", () => {
      expect(
        slackFormattingToolbar.find((b) => b.id === "unordered-list"),
      ).toBeDefined();
    });

    it("includes blockquote button", () => {
      expect(
        slackFormattingToolbar.find((b) => b.id === "blockquote"),
      ).toBeDefined();
    });

    it("includes code block button", () => {
      expect(
        slackFormattingToolbar.find((b) => b.id === "code-block"),
      ).toBeDefined();
    });

    it("buttons have keyboard shortcuts", () => {
      slackFormattingToolbar.forEach((btn) => {
        expect(btn.shortcut).toBeTruthy();
      });
    });

    it("buttons are ordered", () => {
      for (let i = 0; i < slackFormattingToolbar.length - 1; i++) {
        expect(slackFormattingToolbar[i].order).toBeLessThan(
          slackFormattingToolbar[i + 1].order,
        );
      }
    });
  });

  describe("Attachment Menu", () => {
    it("has 5 attachment options", () => {
      expect(slackAttachmentMenuLight).toHaveLength(5);
    });

    it("includes upload file", () => {
      expect(
        slackAttachmentMenuLight.find((a) => a.id === "upload-file"),
      ).toBeDefined();
    });

    it("includes create canvas", () => {
      expect(
        slackAttachmentMenuLight.find((a) => a.id === "create-canvas"),
      ).toBeDefined();
    });

    it("includes start huddle", () => {
      expect(
        slackAttachmentMenuLight.find((a) => a.id === "start-huddle"),
      ).toBeDefined();
    });

    it("includes record clip", () => {
      expect(
        slackAttachmentMenuLight.find((a) => a.id === "record-clip"),
      ).toBeDefined();
    });

    it("includes start workflow", () => {
      expect(
        slackAttachmentMenuLight.find((a) => a.id === "start-workflow"),
      ).toBeDefined();
    });

    it("items are ordered", () => {
      for (let i = 0; i < slackAttachmentMenuLight.length - 1; i++) {
        expect(slackAttachmentMenuLight[i].order).toBeLessThan(
          slackAttachmentMenuLight[i + 1].order,
        );
      }
    });
  });

  describe("Slash Commands", () => {
    it("slash commands are enabled", () => {
      expect(slackSlashCommandConfig.enabled).toBe(true);
    });

    it("autocomplete is enabled", () => {
      expect(slackSlashCommandConfig.autocomplete).toBe(true);
    });

    it("has built-in commands", () => {
      expect(slackSlashCommandConfig.builtInCommands.length).toBeGreaterThan(
        10,
      );
    });

    it("includes /remind", () => {
      expect(slackSlashCommandConfig.builtInCommands).toContain("/remind");
    });

    it("includes /topic", () => {
      expect(slackSlashCommandConfig.builtInCommands).toContain("/topic");
    });

    it("includes /invite", () => {
      expect(slackSlashCommandConfig.builtInCommands).toContain("/invite");
    });

    it("includes /status", () => {
      expect(slackSlashCommandConfig.builtInCommands).toContain("/status");
    });

    it("includes /dnd", () => {
      expect(slackSlashCommandConfig.builtInCommands).toContain("/dnd");
    });

    it("supports app commands", () => {
      expect(slackSlashCommandConfig.appCommands).toBe(true);
    });
  });

  describe("Mentions", () => {
    it("supports user mentions", () => {
      expect(slackMentionConfig.users).toBe(true);
    });

    it("supports @channel", () => {
      expect(slackMentionConfig.channel).toBe(true);
    });

    it("supports @here", () => {
      expect(slackMentionConfig.here).toBe(true);
    });

    it("supports @everyone", () => {
      expect(slackMentionConfig.everyone).toBe(true);
    });

    it("supports #channel mentions", () => {
      expect(slackMentionConfig.channels).toBe(true);
    });

    it("supports user group mentions", () => {
      expect(slackMentionConfig.userGroups).toBe(true);
    });

    it("shows avatar in autocomplete", () => {
      expect(slackMentionConfig.showAvatar).toBe(true);
    });

    it("shows status in autocomplete", () => {
      expect(slackMentionConfig.showStatus).toBe(true);
    });
  });

  describe("Emoji Picker", () => {
    it("is enabled", () => {
      expect(slackEmojiPickerConfig.enabled).toBe(true);
    });

    it("triggers via icon and colon syntax", () => {
      expect(slackEmojiPickerConfig.trigger).toBe("both");
    });

    it("supports custom emoji", () => {
      expect(slackEmojiPickerConfig.customEmoji).toBe(true);
    });

    it("has search", () => {
      expect(slackEmojiPickerConfig.search).toBe(true);
    });

    it("has skin tone selector", () => {
      expect(slackEmojiPickerConfig.skinToneSelector).toBe(true);
    });

    it("has 9 grid columns", () => {
      expect(slackEmojiPickerConfig.gridColumns).toBe(9);
    });

    it("shows categories", () => {
      expect(slackEmojiPickerConfig.categories).toBe(true);
    });

    it("shows frequently used", () => {
      expect(slackEmojiPickerConfig.frequentlyUsed).toBe(true);
    });
  });

  describe("Scheduled Send", () => {
    it("is enabled", () => {
      expect(slackScheduleConfig.enabled).toBe(true);
    });

    it("uses dropdown trigger", () => {
      expect(slackScheduleConfig.trigger).toBe("dropdown");
    });

    it("has preset times", () => {
      expect(slackScheduleConfig.presetTimes.length).toBeGreaterThan(0);
    });

    it("supports custom date/time", () => {
      expect(slackScheduleConfig.customDateTime).toBe(true);
    });

    it("is timezone aware", () => {
      expect(slackScheduleConfig.timezoneAware).toBe(true);
    });
  });

  describe("Send Button", () => {
    it("light mode is green (#007A5A)", () => {
      expect(slackSendButtonLight.backgroundColor).toBe("#007A5A");
    });

    it("dark mode is green (#2BAC76)", () => {
      expect(slackSendButtonDark.backgroundColor).toBe("#2BAC76");
    });

    it("has rounded shape", () => {
      expect(slackSendButtonLight.shape).toBe("rounded");
    });

    it("has schedule dropdown", () => {
      expect(slackSendButtonLight.scheduleDropdown).toBe(true);
    });

    it("disabled when empty", () => {
      expect(slackSendButtonLight.disabledWhenEmpty).toBe(true);
    });
  });

  describe("Composer Config (Light)", () => {
    it("has formatting toolbar shown", () => {
      expect(slackComposerLight.showFormattingToolbar).toBe(true);
    });

    it("has 15px font size", () => {
      expect(slackComposerLight.inputFontSize).toBe("15px");
    });

    it('placeholder is "Message #channel"', () => {
      expect(slackComposerLight.placeholderText).toBe("Message #channel");
    });

    it("supports paste images", () => {
      expect(slackComposerLight.pasteImages).toBe(true);
    });

    it("supports drag and drop", () => {
      expect(slackComposerLight.dragAndDrop).toBe(true);
    });

    it("shows character count near limit", () => {
      expect(slackComposerLight.characterCount).toBe("near-limit");
    });

    it("has border with focus ring", () => {
      expect(slackComposerLight.inputBorder).toContain("#DDDDDC");
      expect(slackComposerLight.inputFocusBorder).toContain("#1264A3");
    });
  });

  describe("Composer Config (Dark)", () => {
    it("has dark input bg", () => {
      expect(slackComposerDark.inputBg).toBe("#222529");
    });

    it("has light text", () => {
      expect(slackComposerDark.inputText).toBe("#D1D2D3");
    });

    it("has dark border", () => {
      expect(slackComposerDark.inputBorder).toContain("#35383C");
    });

    it("has cyan focus border", () => {
      expect(slackComposerDark.inputFocusBorder).toContain("#36C5F0");
    });
  });

  describe("Composer Helpers", () => {
    it("getSlackComposer returns light config by default", () => {
      const composer = getSlackComposer();
      expect(composer.inputBg).toBe("#FFFFFF");
    });

    it("getSlackComposer returns dark config", () => {
      const composer = getSlackComposer(true);
      expect(composer.inputBg).toBe("#222529");
    });

    it("getSlackAttachmentMenu returns sorted items", () => {
      const menu = getSlackAttachmentMenu();
      for (let i = 0; i < menu.length - 1; i++) {
        expect(menu[i].order).toBeLessThanOrEqual(menu[i + 1].order);
      }
    });

    it("getSlackAttachmentById finds upload-file", () => {
      const item = getSlackAttachmentById("upload-file");
      expect(item).toBeDefined();
      expect(item?.label).toBe("Upload a file");
    });

    it("getSlackAttachmentById returns undefined for non-existent", () => {
      expect(getSlackAttachmentById("nonexistent")).toBeUndefined();
    });

    it("getSlackAttachmentCount returns 5", () => {
      expect(getSlackAttachmentCount()).toBe(5);
    });

    it("getSlackFormattingButtonCount returns 9", () => {
      expect(getSlackFormattingButtonCount()).toBe(9);
    });

    it("getSlackBuiltInCommandCount returns correct count", () => {
      expect(getSlackBuiltInCommandCount()).toBe(
        slackSlashCommandConfig.builtInCommands.length,
      );
    });
  });

  describe("Reply Indicator", () => {
    it("light reply has background", () => {
      expect(slackReplyConfigLight.backgroundColor).toBe("#F8F8F8");
    });

    it("light reply has blue border", () => {
      expect(slackReplyConfigLight.borderStyle).toContain("#1264A3");
    });

    it("dark reply has dark background", () => {
      expect(slackReplyConfigDark.backgroundColor).toBe("#222529");
    });

    it("dark reply has cyan border", () => {
      expect(slackReplyConfigDark.borderStyle).toContain("#36C5F0");
    });

    it("shows quoted text", () => {
      expect(slackReplyConfigLight.showQuotedText).toBe(true);
    });

    it("has cancel button", () => {
      expect(slackReplyConfigLight.cancelButton).toBe(true);
    });
  });
});

// ============================================================================
// 5. PARITY CHECKLIST
// ============================================================================

describe("Slack Parity Checklist", () => {
  it('has platform name "Slack"', () => {
    expect(slackParityChecklist.platform).toBe("Slack");
  });

  it("has target version", () => {
    expect(slackParityChecklist.targetVersion).toContain("Slack");
  });

  it("has assessment date", () => {
    expect(slackParityChecklist.assessmentDate).toBeTruthy();
  });

  it("has 80+ total items", () => {
    expect(slackParityChecklist.totalItems).toBeGreaterThanOrEqual(80);
  });

  it("has items array matching totalItems count", () => {
    expect(slackParityChecklist.items.length).toBe(
      slackParityChecklist.totalItems,
    );
  });

  it("all items have required fields", () => {
    slackParityChecklist.items.forEach((item) => {
      expect(item.id).toBeTruthy();
      expect(item.description).toBeTruthy();
      expect(item.category).toBeTruthy();
      expect(item.priority).toBeTruthy();
      expect(item.status).toBeTruthy();
      expect(item.configPath).toBeTruthy();
    });
  });

  it("all item IDs are unique", () => {
    const ids = slackParityChecklist.items.map((i) => i.id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(ids.length);
  });

  it("100% parity (all items implemented)", () => {
    expect(slackParityChecklist.parityPercentage).toBe(100);
  });

  it("has status counts that sum to totalItems", () => {
    const sum = Object.values(slackParityChecklist.statusCounts).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBe(slackParityChecklist.totalItems);
  });

  it("has priority counts that sum to totalItems", () => {
    const sum = Object.values(slackParityChecklist.priorityCounts).reduce(
      (a, b) => a + b,
      0,
    );
    expect(sum).toBe(slackParityChecklist.totalItems);
  });

  describe("Category Coverage", () => {
    it("has workspace items", () => {
      expect(getSlackParityItemsByCategory("workspace").length).toBeGreaterThan(
        0,
      );
    });

    it("has channels items", () => {
      expect(getSlackParityItemsByCategory("channels").length).toBeGreaterThan(
        0,
      );
    });

    it("has messaging items", () => {
      expect(getSlackParityItemsByCategory("messaging").length).toBeGreaterThan(
        0,
      );
    });

    it("has threads items", () => {
      expect(getSlackParityItemsByCategory("threads").length).toBeGreaterThan(
        0,
      );
    });

    it("has huddles items", () => {
      expect(getSlackParityItemsByCategory("huddles").length).toBeGreaterThan(
        0,
      );
    });

    it("has search items", () => {
      expect(getSlackParityItemsByCategory("search").length).toBeGreaterThan(0);
    });

    it("has integrations items", () => {
      expect(
        getSlackParityItemsByCategory("integrations").length,
      ).toBeGreaterThan(0);
    });

    it("has notifications items", () => {
      expect(
        getSlackParityItemsByCategory("notifications").length,
      ).toBeGreaterThan(0);
    });

    it("has presence items", () => {
      expect(getSlackParityItemsByCategory("presence").length).toBeGreaterThan(
        0,
      );
    });

    it("has files items", () => {
      expect(getSlackParityItemsByCategory("files").length).toBeGreaterThan(0);
    });

    it("has canvas items", () => {
      expect(getSlackParityItemsByCategory("canvas").length).toBeGreaterThan(0);
    });

    it("has visual items", () => {
      expect(getSlackParityItemsByCategory("visual").length).toBeGreaterThan(0);
    });

    it("has composer items", () => {
      expect(getSlackParityItemsByCategory("composer").length).toBeGreaterThan(
        0,
      );
    });

    it("has navigation items", () => {
      expect(
        getSlackParityItemsByCategory("navigation").length,
      ).toBeGreaterThan(0);
    });
  });

  describe("Checklist Helpers", () => {
    it("getSlackParityItemsByPriority returns critical items", () => {
      const criticals = getSlackParityItemsByPriority("critical");
      expect(criticals.length).toBeGreaterThan(0);
      criticals.forEach((item) => {
        expect(item.priority).toBe("critical");
      });
    });

    it("getSlackParityItemsByStatus returns implemented items", () => {
      const implemented = getSlackParityItemsByStatus("implemented");
      expect(implemented.length).toBeGreaterThan(0);
    });

    it("getSlackParityItemById returns correct item", () => {
      const item = getSlackParityItemById("ws-001");
      expect(item).toBeDefined();
      expect(item?.category).toBe("workspace");
    });

    it("getSlackParityItemById returns undefined for non-existent", () => {
      expect(getSlackParityItemById("nonexistent")).toBeUndefined();
    });

    it("verifySlackCriticalParity passes", () => {
      const result = verifySlackCriticalParity();
      expect(result.passed).toBe(true);
      expect(result.failedItems).toHaveLength(0);
    });

    it("getSlackCategoryParityPercentage returns 100% for all categories", () => {
      const categories: Array<
        | "workspace"
        | "channels"
        | "messaging"
        | "threads"
        | "huddles"
        | "search"
        | "integrations"
        | "notifications"
        | "presence"
        | "files"
        | "canvas"
        | "visual"
        | "composer"
        | "navigation"
      > = [
        "workspace",
        "channels",
        "messaging",
        "threads",
        "huddles",
        "search",
        "integrations",
        "notifications",
        "presence",
        "files",
        "canvas",
        "visual",
        "composer",
        "navigation",
      ];
      categories.forEach((cat) => {
        expect(getSlackCategoryParityPercentage(cat)).toBe(100);
      });
    });
  });
});

// ============================================================================
// 6. SKIN ENGINE INTEGRATION
// ============================================================================

describe("Slack Skin Engine Integration", () => {
  it("generates CSS variables for light mode", () => {
    const vars = skinToCSSVariables(slackDetailedSkin, false);
    expect(vars["--skin-primary"]).toBe("#611F69");
    expect(vars["--skin-accent"]).toBe("#ECB22E");
    expect(vars["--skin-background"]).toBe("#FFFFFF");
  });

  it("generates CSS variables for dark mode", () => {
    const vars = skinToCSSVariables(slackDetailedSkin, true);
    expect(vars["--skin-primary"]).toBe("#D1B3D3");
    expect(vars["--skin-background"]).toBe("#1A1D21");
  });

  it("generates color CSS variables", () => {
    const vars = colorsToCSSVariables(slackLightColors);
    expect(vars["--skin-primary"]).toBe("#611F69");
    expect(vars["--skin-error"]).toBe("#E01E5A");
    expect(vars["--skin-info"]).toBe("#1264A3");
  });

  it("CSS variables include typography tokens", () => {
    const vars = skinToCSSVariables(slackDetailedSkin);
    expect(vars["--skin-font-family"]).toContain("Lato");
    expect(vars["--skin-font-size-base"]).toBe("15px");
    expect(vars["--skin-line-height"]).toBe("1.46668");
  });

  it("CSS variables include spacing tokens", () => {
    const vars = skinToCSSVariables(slackDetailedSkin);
    expect(vars["--skin-sidebar-width"]).toBe("260px");
    expect(vars["--skin-header-height"]).toBe("49px");
    expect(vars["--skin-avatar-size"]).toBe("36px");
  });

  it("CSS variables include border radius tokens", () => {
    const vars = skinToCSSVariables(slackDetailedSkin);
    expect(vars["--skin-radius-sm"]).toBe("4px");
    expect(vars["--skin-radius-md"]).toBe("6px");
    expect(vars["--skin-radius-lg"]).toBe("8px");
  });

  it("supports custom prefix", () => {
    const vars = colorsToCSSVariables(slackLightColors, "--slack");
    expect(vars["--slack-primary"]).toBe("#611F69");
  });

  it("deepMerge works with Slack skin overrides", () => {
    const override = { colors: { primary: "#FF0000" } };
    const merged = deepMerge(
      slackDetailedSkin as unknown as Record<string, unknown>,
      override as unknown as Record<string, unknown>,
    ) as unknown as typeof slackDetailedSkin;
    expect(merged.colors.primary).toBe("#FF0000");
    expect(merged.colors.accent).toBe("#ECB22E"); // other colors unchanged
  });
});

// ============================================================================
// 7. DARK/LIGHT MODE VARIANTS
// ============================================================================

describe("Slack Dark/Light Mode Variants", () => {
  it("light and dark have same accent color", () => {
    expect(slackLightColors.accent).toBe(slackDarkColors.accent);
  });

  it("light background is white, dark is near-black", () => {
    expect(slackLightColors.background).toBe("#FFFFFF");
    expect(slackDarkColors.background).toBe("#1A1D21");
  });

  it("text contrast: light has dark text, dark has light text", () => {
    expect(slackLightColors.text).toBe("#1D1C1D");
    expect(slackDarkColors.text).toBe("#D1D2D3");
  });

  it("borders differ between modes", () => {
    expect(slackLightColors.border).not.toBe(slackDarkColors.border);
  });

  it("extended sidebar bg differs in dark mode", () => {
    expect(slackExtendedLightColors.sidebarBg).not.toBe(
      slackExtendedDarkColors.sidebarBg,
    );
  });

  it("link colors differ between modes", () => {
    expect(slackExtendedLightColors.linkColor).not.toBe(
      slackExtendedDarkColors.linkColor,
    );
  });

  it("composer bg differs between modes", () => {
    expect(slackComposerLight.composerBg).not.toBe(
      slackComposerDark.composerBg,
    );
  });

  it("focus border color differs between modes", () => {
    expect(slackComposerLight.inputFocusBorder).not.toBe(
      slackComposerDark.inputFocusBorder,
    );
  });
});

// ============================================================================
// 8. EXTENDED BEHAVIORS
// ============================================================================

describe("Slack Extended Behaviors", () => {
  describe("Workspace Config", () => {
    it("supports multi-workspace", () => {
      expect(slackWorkspaceConfig.multiWorkspace).toBe(true);
    });

    it("max 500K members", () => {
      expect(slackWorkspaceConfig.maxMembers).toBe(500000);
    });

    it("defaults to mentions notifications", () => {
      expect(slackWorkspaceConfig.defaultNotifyLevel).toBe("mentions");
    });

    it("supports custom emoji creation", () => {
      expect(slackWorkspaceConfig.customEmojiCreation).toBe(true);
    });

    it("supports retention policies", () => {
      expect(slackWorkspaceConfig.retentionPolicies).toBe(true);
    });

    it("supports analytics", () => {
      expect(slackWorkspaceConfig.analytics).toBe(true);
    });
  });

  describe("Sections Config", () => {
    it("sections are enabled", () => {
      expect(slackSectionsConfig.enabled).toBe(true);
    });

    it("max 100 sections", () => {
      expect(slackSectionsConfig.maxSections).toBe(100);
    });

    it("sections are collapsible", () => {
      expect(slackSectionsConfig.collapsible).toBe(true);
    });

    it("sections are reorderable", () => {
      expect(slackSectionsConfig.reorderable).toBe(true);
    });

    it("has starred section", () => {
      expect(slackSectionsConfig.starredSection).toBe(true);
    });

    it("has DMs section", () => {
      expect(slackSectionsConfig.dmsSection).toBe(true);
    });

    it("has default sections", () => {
      expect(slackSectionsConfig.defaultSections).toContain("Channels");
      expect(slackSectionsConfig.defaultSections).toContain("Direct messages");
    });
  });

  describe("Huddle Config", () => {
    it("huddles are enabled", () => {
      expect(slackHuddleConfig.enabled).toBe(true);
    });

    it("max 50 participants", () => {
      expect(slackHuddleConfig.maxParticipants).toBe(50);
    });

    it("video is available", () => {
      expect(slackHuddleConfig.video).toBe(true);
    });

    it("screen share is available", () => {
      expect(slackHuddleConfig.screenShare).toBe(true);
    });

    it("threads are available in huddles", () => {
      expect(slackHuddleConfig.threads).toBe(true);
    });

    it("huddles in channels", () => {
      expect(slackHuddleConfig.inChannel).toBe(true);
    });

    it("huddles in DMs", () => {
      expect(slackHuddleConfig.inDm).toBe(true);
    });

    it("live captions available", () => {
      expect(slackHuddleConfig.liveCaptions).toBe(true);
    });

    it("reactions available", () => {
      expect(slackHuddleConfig.reactions).toBe(true);
    });

    it("noise suppression available", () => {
      expect(slackHuddleConfig.noiseSuppression).toBe(true);
    });
  });

  describe("Canvas Config", () => {
    it("canvas is enabled", () => {
      expect(slackCanvasConfig.canvasEnabled).toBe(true);
    });

    it("lists are enabled", () => {
      expect(slackCanvasConfig.listsEnabled).toBe(true);
    });

    it("supports rich formatting", () => {
      expect(slackCanvasConfig.richFormatting).toBe(true);
    });

    it("supports code blocks", () => {
      expect(slackCanvasConfig.codeBlocks).toBe(true);
    });

    it("supports comments", () => {
      expect(slackCanvasConfig.comments).toBe(true);
    });

    it("supports checkboxes", () => {
      expect(slackCanvasConfig.checkboxes).toBe(true);
    });
  });

  describe("Workflow Config", () => {
    it("workflows are enabled", () => {
      expect(slackWorkflowConfig.enabled).toBe(true);
    });

    it("has multiple trigger types", () => {
      expect(slackWorkflowConfig.triggerTypes.length).toBeGreaterThan(3);
    });

    it("includes webhook triggers", () => {
      expect(slackWorkflowConfig.triggerTypes).toContain("webhook");
    });

    it("includes schedule triggers", () => {
      expect(slackWorkflowConfig.triggerTypes).toContain("schedule");
    });

    it("supports custom steps", () => {
      expect(slackWorkflowConfig.customSteps).toBe(true);
    });

    it("supports form collection", () => {
      expect(slackWorkflowConfig.formCollection).toBe(true);
    });
  });

  describe("Formatting Config", () => {
    it("supports bold", () => {
      expect(slackFormattingConfig.bold).toBe(true);
    });

    it("supports italic", () => {
      expect(slackFormattingConfig.italic).toBe(true);
    });

    it("supports strikethrough", () => {
      expect(slackFormattingConfig.strikethrough).toBe(true);
    });

    it("supports inline code", () => {
      expect(slackFormattingConfig.inlineCode).toBe(true);
    });

    it("supports code blocks", () => {
      expect(slackFormattingConfig.codeBlocks).toBe(true);
    });

    it("supports syntax highlighting", () => {
      expect(slackFormattingConfig.syntaxHighlighting).toBe(true);
    });

    it("supports block quotes", () => {
      expect(slackFormattingConfig.blockQuotes).toBe(true);
    });

    it("supports ordered lists", () => {
      expect(slackFormattingConfig.orderedLists).toBe(true);
    });

    it("supports unordered lists", () => {
      expect(slackFormattingConfig.unorderedLists).toBe(true);
    });

    it("supports links", () => {
      expect(slackFormattingConfig.links).toBe(true);
    });

    it("supports custom emoji", () => {
      expect(slackFormattingConfig.customEmoji).toBe(true);
    });

    it("has rich text editor", () => {
      expect(slackFormattingConfig.richTextEditor).toBe(true);
    });

    it("has markdown rendering", () => {
      expect(slackFormattingConfig.markdownRendering).toBe(true);
    });
  });

  describe("Search Config", () => {
    it("search is enabled", () => {
      expect(slackSearchConfig.enabled).toBe(true);
    });

    it("supports in: modifier", () => {
      expect(slackSearchConfig.inModifier).toBe(true);
    });

    it("supports from: modifier", () => {
      expect(slackSearchConfig.fromModifier).toBe(true);
    });

    it("supports before: modifier", () => {
      expect(slackSearchConfig.beforeModifier).toBe(true);
    });

    it("supports after: modifier", () => {
      expect(slackSearchConfig.afterModifier).toBe(true);
    });

    it("supports has: modifier", () => {
      expect(slackSearchConfig.hasModifier).toBe(true);
    });

    it("supports is: modifier", () => {
      expect(slackSearchConfig.isModifier).toBe(true);
    });

    it("supports to: modifier", () => {
      expect(slackSearchConfig.toModifier).toBe(true);
    });

    it("supports saved searches", () => {
      expect(slackSearchConfig.savedSearches).toBe(true);
    });

    it("supports recent searches", () => {
      expect(slackSearchConfig.recentSearches).toBe(true);
    });

    it("has result filters", () => {
      expect(slackSearchConfig.resultFilters).toContain("messages");
      expect(slackSearchConfig.resultFilters).toContain("files");
      expect(slackSearchConfig.resultFilters).toContain("channels");
      expect(slackSearchConfig.resultFilters).toContain("people");
    });
  });

  describe("App Config", () => {
    it("slash commands enabled", () => {
      expect(slackAppConfig.slashCommands).toBe(true);
    });

    it("message actions enabled", () => {
      expect(slackAppConfig.messageActions).toBe(true);
    });

    it("modal dialogs enabled", () => {
      expect(slackAppConfig.modalDialogs).toBe(true);
    });

    it("home tab enabled", () => {
      expect(slackAppConfig.homeTab).toBe(true);
    });

    it("interactive messages enabled", () => {
      expect(slackAppConfig.interactiveMessages).toBe(true);
    });

    it("incoming webhooks enabled", () => {
      expect(slackAppConfig.incomingWebhooks).toBe(true);
    });

    it("bot users enabled", () => {
      expect(slackAppConfig.botUsers).toBe(true);
    });

    it("app directory enabled", () => {
      expect(slackAppConfig.appDirectory).toBe(true);
    });
  });

  describe("Reminders Config", () => {
    it("reminders are enabled", () => {
      expect(slackRemindersConfig.enabled).toBe(true);
    });

    it("scheduled messages supported", () => {
      expect(slackRemindersConfig.scheduledMessages).toBe(true);
    });

    it("/remind slash command works", () => {
      expect(slackRemindersConfig.slashRemind).toBe(true);
    });

    it("remind me action on messages", () => {
      expect(slackRemindersConfig.remindMeAction).toBe(true);
    });

    it("has preset times", () => {
      expect(slackRemindersConfig.presetTimes.length).toBeGreaterThan(0);
    });

    it("supports custom date/time", () => {
      expect(slackRemindersConfig.customDateTime).toBe(true);
    });

    it("supports recurring reminders", () => {
      expect(slackRemindersConfig.recurring).toBe(true);
    });
  });

  describe("DM Config", () => {
    it("direct messages supported", () => {
      expect(slackDmConfig.directMessages).toBe(true);
    });

    it("multi-party DMs supported", () => {
      expect(slackDmConfig.multiPartyDms).toBe(true);
    });

    it("max 9 MPDM members", () => {
      expect(slackDmConfig.maxMpdmMembers).toBe(9);
    });

    it("DMs can be converted to channels", () => {
      expect(slackDmConfig.convertToChannel).toBe(true);
    });

    it("typing indicator in DMs", () => {
      expect(slackDmConfig.typingIndicator).toBe(true);
    });

    it("presence status in DMs", () => {
      expect(slackDmConfig.presenceStatus).toBe(true);
    });
  });

  describe("Behavior Config Bundle", () => {
    it("config bundle includes preset", () => {
      expect(slackBehaviorConfig.preset).toBe(slackDetailedBehavior);
    });

    it("config bundle includes extended behavior", () => {
      expect(slackBehaviorConfig.extended).toBe(slackExtendedBehavior);
    });

    it("extended behavior has all sections", () => {
      expect(slackExtendedBehavior.workspace).toBeDefined();
      expect(slackExtendedBehavior.sections).toBeDefined();
      expect(slackExtendedBehavior.huddles).toBeDefined();
      expect(slackExtendedBehavior.canvas).toBeDefined();
      expect(slackExtendedBehavior.workflows).toBeDefined();
      expect(slackExtendedBehavior.formatting).toBeDefined();
      expect(slackExtendedBehavior.search).toBeDefined();
      expect(slackExtendedBehavior.apps).toBeDefined();
      expect(slackExtendedBehavior.reminders).toBeDefined();
      expect(slackExtendedBehavior.dms).toBeDefined();
    });
  });
});

// ============================================================================
// 9. RESPONSIVE ADAPTATIONS
// ============================================================================

describe("Slack Responsive Adaptations", () => {
  describe("Desktop vs Mobile Navigation", () => {
    it("desktop has sidebar layout, mobile is full-width", () => {
      expect(slackDesktopNavigation.sidebarWidth).toBe("260px");
      expect(slackMobileNavigation.sidebarWidth).toBe("100%");
    });

    it("desktop thread panel has fixed width, mobile is full-width", () => {
      expect(slackDesktopNavigation.threadPanelWidth).toBe("400px");
      expect(slackMobileNavigation.threadPanelWidth).toBe("100%");
    });

    it("desktop thread panel is resizable, mobile is not", () => {
      expect(slackDesktopNavigation.threadPanelResizable).toBe(true);
      expect(slackMobileNavigation.threadPanelResizable).toBe(false);
    });

    it("desktop header shows topic, mobile does not", () => {
      expect(slackDesktopNavigation.header.showTopic).toBe(true);
      expect(slackMobileNavigation.header.showTopic).toBe(false);
    });

    it("desktop header shows member count, mobile does not", () => {
      expect(slackDesktopNavigation.header.showMemberCount).toBe(true);
      expect(slackMobileNavigation.header.showMemberCount).toBe(false);
    });

    it("desktop header shows star, mobile does not", () => {
      expect(slackDesktopNavigation.header.showStar).toBe(true);
      expect(slackMobileNavigation.header.showStar).toBe(false);
    });

    it("mobile has fewer header actions", () => {
      expect(slackMobileNavigation.header.actions.length).toBeLessThan(
        slackDesktopNavigation.header.actions.length,
      );
    });

    it("mobile rail items differ from desktop", () => {
      const desktopIds = slackDesktopNavigation.railItems.map((i) => i.id);
      const mobileIds = slackMobileNavigation.railItems.map((i) => i.id);
      expect(desktopIds).not.toEqual(mobileIds);
    });
  });
});

// ============================================================================
// 10. CROSS-MODULE CONSISTENCY
// ============================================================================

describe("Slack Cross-Module Consistency", () => {
  it("skin primary matches visual config", () => {
    expect(slackDetailedSkin.colors.primary).toBe(slackLightColors.primary);
  });

  it("behavior threading model matches skin message layout", () => {
    // Slack uses flat messages (default) with side-panel threads
    expect(slackDetailedSkin.components.messageLayout).toBe("default");
    expect(slackDetailedBehavior.messaging.threadingModel).toBe("side-panel");
  });

  it("navigation sidebar width matches skin spacing", () => {
    expect(slackDesktopNavigation.sidebarWidth).toBe(slackSpacing.sidebarWidth);
  });

  it("navigation header height matches skin spacing", () => {
    expect(slackDesktopNavigation.header.height).toBe(
      slackSpacing.headerHeight,
    );
  });

  it("composer font size matches typography", () => {
    expect(slackComposerLight.inputFontSize).toBe(slackTypography.fontSizeBase);
  });

  it("send button color matches success color", () => {
    expect(slackSendButtonLight.backgroundColor).toBe(slackLightColors.success);
  });

  it("dark send button color matches dark success", () => {
    expect(slackSendButtonDark.backgroundColor).toBe(slackDarkColors.success);
  });

  it("behavior huddles flag matches extended huddle config", () => {
    expect(slackDetailedBehavior.calls.huddles).toBe(slackHuddleConfig.enabled);
  });

  it("behavior max group members matches workspace config", () => {
    expect(slackDetailedBehavior.channels.maxGroupMembers).toBe(
      slackWorkspaceConfig.maxMembers,
    );
  });

  it("behavior max group DM matches DM config", () => {
    expect(slackDetailedBehavior.channels.maxGroupDmMembers).toBe(
      slackDmConfig.maxMpdmMembers,
    );
  });

  it("composer scheduling matches behavior scheduling", () => {
    expect(slackComposerLight.scheduledSend.enabled).toBe(
      slackDetailedBehavior.messaging.scheduling,
    );
  });

  it("parity checklist totalItems matches items array length", () => {
    expect(slackParityChecklist.totalItems).toBe(
      slackParityChecklist.items.length,
    );
  });

  it("extended behavior sections match navigation sections", () => {
    expect(slackSectionsConfig.enabled).toBe(true);
    expect(slackDefaultSections.length).toBeGreaterThan(0);
  });
});
