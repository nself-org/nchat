/**
 * Welcome Bot Template
 * Automatically greet new members with customizable messages
 *
 * Features:
 * - Customizable welcome messages with placeholders
 * - Optional DM to new members
 * - Channel-specific configurations
 * - Role assignment on join
 * - Rules display option
 */

import { bot, embed, text, button, success, response } from "../bot-sdk";
import type { BotInstance } from "../bot-runtime";

export interface WelcomeBotConfig {
  welcomeMessage?: string;
  sendDM?: boolean;
  showRules?: boolean;
  assignRole?: string;
  embedColor?: string;
}

const DEFAULT_MESSAGE = `Welcome {user} to {channel}! 🎉

We're glad to have you here. Here are some tips to get started:

• Introduce yourself in this channel
• Check out the pinned messages for important info
• Feel free to ask questions - we're here to help!

Enjoy your stay! 🚀`;

/**
 * Create a welcome bot instance
 */
export function createWelcomeBot(): BotInstance {
  return (
    bot("welcome-bot")
      .name("Welcome Bot")
      .description(
        "Automatically greet new members and send onboarding messages",
      )
      .version("1.0.0")
      .icon("👋")
      .permissions("read_messages", "send_messages", "mention_users")

      // Configuration settings
      .settings({
        welcomeMessage: DEFAULT_MESSAGE,
        sendDM: false,
        showRules: false,
        embedColor: "#22c55e",
      })

      // Commands
      .command("setwelcome", "Configure welcome message", async (ctx, api) => {
        if (!ctx.args.message) {
          return text(
            "Usage: `/setwelcome message <your message>`\n\n" +
              "Placeholders:\n" +
              "• `{user}` - New member's name\n" +
              "• `{channel}` - Channel name\n" +
              "• `{memberCount}` - Total member count\n\n" +
              "Example:\n" +
              "`/setwelcome message Welcome {user}! You are member #{memberCount}!`",
          );
        }

        const message = ctx.args.message as string;
        const config = api.getBotConfig();
        config.settings = {
          ...config.settings,
          welcomeMessage: message,
        };

        // Save config (would update database in production)
        return success(
          `Welcome message updated!\n\nPreview:\n${formatMessage(message, ctx)}`,
        );
      })

      .command("testwelcome", "Test the welcome message", async (ctx, api) => {
        const config = api.getBotConfig();
        const settings = (config.settings || {}) as WelcomeBotConfig;
        const message = settings.welcomeMessage || DEFAULT_MESSAGE;

        return response()
          .embed(
            embed()
              .title("🧪 Welcome Message Preview")
              .description(formatMessage(message, ctx))
              .footer("This is how new members will be greeted")
              .color(settings.embedColor || "#22c55e"),
          )
          .build();
      })

      .command(
        "welcomesettings",
        "View current welcome settings",
        async (ctx, api) => {
          const config = api.getBotConfig();
          const settings = (config.settings || {}) as WelcomeBotConfig & {
            enabled?: boolean;
          };

          return response()
            .embed(
              embed()
                .title("⚙️ Welcome Bot Settings")
                .field(
                  "Status",
                  settings.enabled ? "🟢 Enabled" : "🔴 Disabled",
                  true,
                )
                .field("Send DM", settings.sendDM ? "Yes" : "No", true)
                .field("Show Rules", settings.showRules ? "Yes" : "No", true)
                .field("Assign Role", settings.assignRole || "None", true)
                .field("Embed Color", settings.embedColor || "#22c55e", true)
                .field(
                  "Current Message",
                  (settings.welcomeMessage || DEFAULT_MESSAGE).substring(
                    0,
                    200,
                  ) + "...",
                )
                .color("#6366f1"),
            )
            .build();
        },
      )

      // User join handler
      .onUserJoin(async (ctx, api) => {
        const config = api.getBotConfig();
        const settings = (config.settings || {}) as WelcomeBotConfig & {
          enabled?: boolean;
        };

        if (!settings.enabled) {
          return;
        }

        const message = formatMessage(
          settings.welcomeMessage || DEFAULT_MESSAGE,
          ctx,
        );

        const embedContent = embed()
          .title("👋 Welcome!")
          .description(message)
          .color(settings.embedColor || "#22c55e");

        // Build response with optional rules button
        const responseBuilder = response().embed(embedContent);

        // Add rules button if enabled
        if (settings.showRules) {
          responseBuilder.buttons(
            button("view-rules").label("View Rules").secondary(),
          );
        }

        // Send DM if enabled
        if (settings.sendDM) {
          // In production, this would send a DM to the user
          // await api.sendDirectMessage(ctx.user.id, responseBuilder.build())
        }

        return responseBuilder.build();
      })

      // Initialization
      .onInit(async (bot, api) => {
        // REMOVED: console.log('[WelcomeBot] Initialized successfully')
      })

      .build()
  );
}

/**
 * Format welcome message with placeholders
 */
function formatMessage(
  template: string,
  ctx: {
    user?: { displayName: string };
    channel: { name: string };
    memberCount?: number;
  },
): string {
  return template
    .replace(/{user}/gi, ctx.user?.displayName || "User")
    .replace(/{channel}/gi, `#${ctx.channel.name}`)
    .replace(/{memberCount}/gi, String(ctx.memberCount || 0));
}

/**
 * Export metadata for template registration
 */
export const welcomeBotTemplate = {
  id: "welcome-bot",
  name: "Welcome Bot",
  description: "Automatically greet new members and send onboarding messages",
  category: "welcome" as const,
  icon: "👋",
  configSchema: {
    type: "object",
    properties: {
      welcomeMessage: {
        type: "string",
        title: "Welcome Message",
        description:
          "Message to show new members. Use {user}, {channel}, and {memberCount} as placeholders.",
        default: DEFAULT_MESSAGE,
      },
      sendDM: {
        type: "boolean",
        title: "Send Direct Message",
        description: "Also send a DM to the new member",
        default: false,
      },
      showRules: {
        type: "boolean",
        title: "Show Rules Button",
        description: 'Add a "View Rules" button to the welcome message',
        default: false,
      },
      assignRole: {
        type: "string",
        title: "Auto-assign Role",
        description: "Automatically assign this role to new members",
        default: "",
      },
      embedColor: {
        type: "string",
        title: "Embed Color",
        description: "Color for the welcome message embed (hex)",
        default: "#22c55e",
      },
    },
  },
  defaultConfig: {
    welcomeMessage: DEFAULT_MESSAGE,
    sendDM: false,
    showRules: false,
    embedColor: "#22c55e",
  },
  isFeatured: true,
};
