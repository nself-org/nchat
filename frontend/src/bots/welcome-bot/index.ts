/**
 * Welcome Bot
 * Automatically welcome new members to your channels
 */

import { bot, command } from "@/lib/bots";
import type { CommandContext, BotApi, BotResponse } from "@/lib/bots";
import { response, embed, error, success } from "@/lib/bots";
import { handleUserJoin, handleUserLeave } from "./handlers";
import {
  getChannelTemplate,
  setChannelTemplate,
  deleteChannelTemplate,
  getDefaultTemplate,
  processTemplate,
  createWelcomeVariables,
  buildWelcomeEmbed,
  formatStats,
  exportTemplates,
  importTemplates,
  PRESET_TEMPLATES,
  type WelcomeTemplate,
} from "./templates";
import manifest from "./manifest.json";

import { logger } from "@/lib/logger";

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

/**
 * /setwelcome command handler
 */
const setWelcomeCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const message = ctx.args.message as string;

  if (!message) {
    return error(
      "Missing message",
      'Usage: `/setwelcome "Your welcome message"`\n\n' +
        "**Variables:**\n" +
        "`{user}` - Username\n" +
        "`{channel}` - Channel name\n" +
        "`{memberCount}` - Member number\n" +
        "`{date}` - Current date\n" +
        "`{time}` - Current time",
    );
  }

  const config = api.getBotConfig();

  setChannelTemplate(ctx.channel.id, {
    message,
    enabled: true,
    mentionUser: (config.settings?.mention_user as boolean) !== false,
    showMemberCount: (config.settings?.show_member_count as boolean) !== false,
    delaySeconds: (config.settings?.delay_seconds as number) || 2,
  });

  return success(
    "Welcome message set!",
    `New users joining #${ctx.channel.name} will see this message.`,
  );
};

/**
 * /testwelcome command handler
 */
const testWelcomeCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const template = getChannelTemplate(ctx.channel.id);
  const config = api.getBotConfig();

  const message =
    template?.message ||
    (config.settings?.default_message as string) ||
    getDefaultTemplate().message;

  const variables = createWelcomeVariables(
    {
      userId: ctx.user.id,
      displayName: ctx.user.displayName,
      channelId: ctx.channel.id,
      avatarUrl: ctx.user.avatarUrl,
    },
    ctx.channel.name,
    42, // Example member count
  );

  const welcomeEmbed = buildWelcomeEmbed(message, variables, {
    mentionUser:
      template?.mentionUser ??
      (config.settings?.mention_user as boolean) !== false,
    showMemberCount:
      template?.showMemberCount ??
      (config.settings?.show_member_count as boolean) !== false,
    avatarUrl: ctx.user.avatarUrl,
    showAvatar: !!ctx.user.avatarUrl,
  });

  return response()
    .text("**Preview of welcome message:**")
    .embed(welcomeEmbed)
    .build();
};

/**
 * /disablewelcome command handler
 */
const disableWelcomeCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const template = getChannelTemplate(ctx.channel.id);

  if (template) {
    setChannelTemplate(ctx.channel.id, { enabled: false });
  } else {
    setChannelTemplate(ctx.channel.id, {
      ...getDefaultTemplate(),
      enabled: false,
    });
  }

  return success(
    "Welcome messages disabled",
    `Welcome messages are now disabled for #${ctx.channel.name}`,
  );
};

/**
 * /enablewelcome command handler
 */
const enableWelcomeCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const template = getChannelTemplate(ctx.channel.id);

  if (template) {
    setChannelTemplate(ctx.channel.id, { enabled: true });
  } else {
    setChannelTemplate(ctx.channel.id, {
      ...getDefaultTemplate(),
      enabled: true,
    });
  }

  return success(
    "Welcome messages enabled",
    `Welcome messages are now enabled for #${ctx.channel.name}`,
  );
};

/**
 * /welcomestats command handler
 */
const welcomeStatsCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const stats = formatStats();

  return response()
    .embed(
      embed()
        .title(":bar_chart: Welcome Bot Statistics")
        .description(stats)
        .color("#6366F1")
        .timestamp(),
    )
    .build();
};

// ============================================================================
// BOT FACTORY
// ============================================================================

/**
 * Create and configure the Welcome Bot
 */
export function createWelcomeBot() {
  return (
    bot(manifest.id)
      .name(manifest.name)
      .description(manifest.description)
      .version(manifest.version)
      .author(manifest.author)
      .icon(manifest.icon)
      .permissions(
        "read_messages",
        "send_messages",
        "read_channels",
        "read_users",
        "mention_users",
      )

      // Register commands
      .command(
        command("setwelcome")
          .description("Set a custom welcome message for this channel")
          .stringArg(
            "message",
            "The welcome message (use {user}, {channel}, etc.)",
            true,
          )
          .example(
            '/setwelcome "Welcome to #{channel}, {user}! Please read the rules."',
            '/setwelcome "Hey {user}! Glad to have you here!"',
          ),
        setWelcomeCommand,
      )
      .command(
        command("testwelcome")
          .description("Preview the welcome message")
          .example("/testwelcome"),
        testWelcomeCommand,
      )
      .command(
        command("disablewelcome")
          .description("Disable welcome messages for this channel")
          .example("/disablewelcome"),
        disableWelcomeCommand,
      )
      .command(
        command("enablewelcome")
          .description("Enable welcome messages for this channel")
          .example("/enablewelcome"),
        enableWelcomeCommand,
      )
      .command(
        command("welcomestats")
          .description("Show welcome statistics")
          .example("/welcomestats"),
        welcomeStatsCommand,
      )

      // Register event handlers
      .onUserJoin(handleUserJoin)
      .onUserLeave(handleUserLeave)

      // Initialization
      .onInit(async (instance, api) => {
        // Try to load saved templates from storage
        try {
          const savedTemplates =
            await api.getStorage<Record<string, WelcomeTemplate>>("templates");
          if (savedTemplates) {
            importTemplates(savedTemplates);
          }
        } catch (error) {}

        // Periodic save to storage
        const saveInterval = setInterval(
          async () => {
            try {
              const templates = exportTemplates();
              if (Object.keys(templates).length > 0) {
                await api.setStorage("templates", templates);
              }
            } catch (error) {
              logger.error(`[WelcomeBot] Failed to save templates:`, error);
            }
          },
          5 * 60 * 1000,
        ); // Every 5 minutes
      })

      .build()
  );
}

// Export the bot factory
export default createWelcomeBot;

// Export manifest for external use
export { manifest };

// Re-export for testing
export {
  setWelcomeCommand,
  testWelcomeCommand,
  disableWelcomeCommand,
  enableWelcomeCommand,
  welcomeStatsCommand,
};

// Re-export templates
export {
  getChannelTemplate,
  setChannelTemplate,
  deleteChannelTemplate,
  getDefaultTemplate,
  processTemplate,
  PRESET_TEMPLATES,
  formatStats,
};

// Re-export handlers
export { handleUserJoin, handleUserLeave };
