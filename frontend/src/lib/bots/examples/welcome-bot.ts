/**
 * Welcome Bot
 *
 * Automatically welcome new members to channels.
 * Supports customizable welcome messages and actions.
 */

import { Bot, BotConfig, BotContext, BotResponse } from "../bot-types";

export interface WelcomeBotConfig extends BotConfig {
  defaultMessage?: string;
}

interface ChannelWelcomeConfig {
  channelId: string;
  enabled: boolean;
  message: string;
  dmWelcome: boolean;
  assignRole?: string;
  showRules?: boolean;
}

// In-memory storage (use database in production)
const channelConfigs = new Map<string, ChannelWelcomeConfig>();

const DEFAULT_WELCOME_MESSAGE = `
Welcome to {channel}, {user}! 🎉

We're glad to have you here. Here are some tips to get started:

• Introduce yourself in this channel
• Check out the pinned messages for important info
• Feel free to ask questions - we're here to help!

Enjoy your stay! 🚀
`.trim();

export class WelcomeBot implements Bot {
  readonly id = "welcome-bot";
  readonly name = "Welcome Bot";
  readonly description = "Welcome new members automatically";
  readonly avatar = "🎉";
  readonly version = "1.0.0";

  private defaultMessage: string;

  constructor(config?: WelcomeBotConfig) {
    this.defaultMessage = config?.defaultMessage || DEFAULT_WELCOME_MESSAGE;
  }

  getCommands() {
    return [
      {
        name: "setwelcome",
        description: "Enable and configure welcome messages",
        usage: "/setwelcome on|off",
      },
      {
        name: "welcomemessage",
        description: "Set custom welcome message",
        usage:
          "/welcomemessage <message> | Use {user} and {channel} as placeholders",
      },
      {
        name: "testwelcome",
        description: "Test the welcome message",
        usage: "/testwelcome",
      },
      {
        name: "welcomesettings",
        description: "View current welcome settings",
        usage: "/welcomesettings",
      },
    ];
  }

  async onMessage(): Promise<BotResponse | null> {
    return null;
  }

  async onCommand(
    command: string,
    args: string[],
    context: BotContext,
  ): Promise<BotResponse> {
    switch (command) {
      case "setwelcome":
        return this.setWelcome(args, context);
      case "welcomemessage":
        return this.setWelcomeMessage(args, context);
      case "testwelcome":
        return this.testWelcome(context);
      case "welcomesettings":
        return this.showSettings(context);
      default:
        return {
          type: "message",
          content:
            "Unknown command. Try /setwelcome, /welcomemessage, /testwelcome, or /welcomesettings",
        };
    }
  }

  async onMention(context: BotContext): Promise<BotResponse> {
    return {
      type: "message",
      content:
        "Hi! I welcome new members to channels. Use `/setwelcome on` to enable me!",
    };
  }

  /**
   * Handle member join events
   */
  async onMemberJoin(
    context: BotContext & { newMember: { id: string; displayName: string } },
  ): Promise<BotResponse | null> {
    const config = channelConfigs.get(context.channel.id);

    if (!config || !config.enabled) {
      return null;
    }

    const message = this.formatWelcomeMessage(
      config.message,
      context.newMember.displayName,
      context.channel.name,
    );

    // If DM welcome is enabled, send a private message too
    if (config.dmWelcome) {
      // In production, this would send an actual DM
    }

    return {
      type: "message",
      content: message,
    };
  }

  private setWelcome(args: string[], context: BotContext): BotResponse {
    const [action] = args;

    if (!action || !["on", "off"].includes(action.toLowerCase())) {
      return {
        type: "message",
        content: "Usage: `/setwelcome on` or `/setwelcome off`",
      };
    }

    const enabled = action.toLowerCase() === "on";
    let config = channelConfigs.get(context.channel.id);

    if (!config) {
      config = {
        channelId: context.channel.id,
        enabled,
        message: this.defaultMessage,
        dmWelcome: false,
      };
      channelConfigs.set(context.channel.id, config);
    } else {
      config.enabled = enabled;
    }

    return {
      type: "message",
      content: enabled
        ? "✅ Welcome messages are now **enabled** for this channel.\nUse `/welcomemessage` to customize the greeting."
        : "❌ Welcome messages are now **disabled** for this channel.",
    };
  }

  private setWelcomeMessage(args: string[], context: BotContext): BotResponse {
    const message = args.join(" ");

    if (!message) {
      return {
        type: "message",
        content:
          "Usage: `/welcomemessage <your message>`\n\nPlaceholders:\n• `{user}` - New member's name\n• `{channel}` - Channel name\n• `{server}` - Server name\n\nExample:\n`/welcomemessage Welcome {user}! Glad to have you in {channel}!`",
      };
    }

    let config = channelConfigs.get(context.channel.id);
    if (!config) {
      config = {
        channelId: context.channel.id,
        enabled: true,
        message,
        dmWelcome: false,
      };
      channelConfigs.set(context.channel.id, config);
    } else {
      config.message = message;
    }

    return {
      type: "message",
      content: `✅ Welcome message updated!\n\nPreview:\n${this.formatWelcomeMessage(message, context.user.displayName, context.channel.name)}`,
    };
  }

  private testWelcome(context: BotContext): BotResponse {
    const config = channelConfigs.get(context.channel.id);

    if (!config || !config.enabled) {
      return {
        type: "message",
        content:
          "Welcome messages are not enabled. Use `/setwelcome on` first.",
      };
    }

    const message = this.formatWelcomeMessage(
      config.message,
      context.user.displayName,
      context.channel.name,
    );

    return {
      type: "rich",
      content: {
        title: "🧪 Welcome Message Preview",
        description: message,
        footer: "This is how new members will be greeted",
        color: "#22c55e",
      },
    };
  }

  private showSettings(context: BotContext): BotResponse {
    const config = channelConfigs.get(context.channel.id);

    if (!config) {
      return {
        type: "message",
        content:
          "No welcome configuration for this channel. Use `/setwelcome on` to get started.",
      };
    }

    const settings = [
      `**Status:** ${config.enabled ? "🟢 Enabled" : "🔴 Disabled"}`,
      `**DM Welcome:** ${config.dmWelcome ? "Yes" : "No"}`,
      `**Assign Role:** ${config.assignRole || "None"}`,
      `**Show Rules:** ${config.showRules ? "Yes" : "No"}`,
    ].join("\n");

    return {
      type: "rich",
      content: {
        title: "⚙️ Welcome Settings",
        description: settings,
        fields: [
          {
            name: "Current Message",
            value:
              config.message.substring(0, 200) +
              (config.message.length > 200 ? "..." : ""),
          },
        ],
        color: "#6366f1",
      },
    };
  }

  private formatWelcomeMessage(
    template: string,
    userName: string,
    channelName: string,
  ): string {
    return template
      .replace(/{user}/gi, userName)
      .replace(/{channel}/gi, `#${channelName}`)
      .replace(/{server}/gi, "this server");
  }
}

export function createWelcomeBot(config?: WelcomeBotConfig): WelcomeBot {
  return new WelcomeBot(config);
}
