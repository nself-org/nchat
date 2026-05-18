/**
 * Hello Bot
 *
 * A simple example bot that demonstrates basic message handling
 * and command responses.
 */

import { Bot, BotConfig, BotContext, BotResponse } from "../bot-types";

export interface HelloBotConfig extends BotConfig {
  greetings?: string[];
  responseDelay?: number;
}

const DEFAULT_GREETINGS = [
  "Hello! 👋",
  "Hi there! 😊",
  "Hey! How can I help you today?",
  "Greetings! 🎉",
  "Hello, friend! 👋",
];

export class HelloBot implements Bot {
  readonly id = "hello-bot";
  readonly name = "Hello Bot";
  readonly description = "A friendly greeting bot";
  readonly avatar = "👋";
  readonly version = "1.0.0";

  private greetings: string[];
  private responseDelay: number;

  constructor(config?: HelloBotConfig) {
    this.greetings = config?.greetings || DEFAULT_GREETINGS;
    this.responseDelay = config?.responseDelay || 0;
  }

  /**
   * Get available commands
   */
  getCommands() {
    return [
      {
        name: "hello",
        description: "Get a friendly greeting",
        usage: "/hello [name]",
      },
      {
        name: "hi",
        description: "Say hi to the bot",
        usage: "/hi",
      },
      {
        name: "greet",
        description: "Greet someone",
        usage: "/greet @user",
      },
      {
        name: "joke",
        description: "Get a random programming joke",
        usage: "/joke",
      },
    ];
  }

  /**
   * Handle incoming messages
   */
  async onMessage(context: BotContext): Promise<BotResponse | null> {
    const { message, user } = context;
    const text = message.content.toLowerCase();

    // Respond to direct greetings
    if (
      text.includes("hello") ||
      text.includes("hi bot") ||
      text.includes("hey bot")
    ) {
      await this.delay();
      return {
        type: "message",
        content: this.getRandomGreeting(user.displayName),
      };
    }

    return null;
  }

  /**
   * Handle slash commands
   */
  async onCommand(
    command: string,
    args: string[],
    context: BotContext,
  ): Promise<BotResponse> {
    await this.delay();

    switch (command) {
      case "hello":
      case "hi": {
        const name = args.join(" ") || context.user.displayName;
        return {
          type: "message",
          content: this.getRandomGreeting(name),
        };
      }

      case "greet": {
        const mention = args[0];
        if (!mention) {
          return {
            type: "message",
            content: "Please mention someone to greet! Usage: `/greet @user`",
          };
        }
        return {
          type: "message",
          content: `Hey ${mention}! 👋 ${context.user.displayName} says hello!`,
        };
      }

      case "joke": {
        return {
          type: "message",
          content: this.getRandomJoke(),
        };
      }

      default:
        return {
          type: "message",
          content: `Unknown command: ${command}. Try /hello, /hi, /greet, or /joke`,
        };
    }
  }

  /**
   * Handle bot mentions
   */
  async onMention(context: BotContext): Promise<BotResponse> {
    await this.delay();
    return {
      type: "message",
      content: `Hi ${context.user.displayName}! You called? 😊 Type /hello for a greeting!`,
    };
  }

  /**
   * Get a random greeting
   */
  private getRandomGreeting(name?: string): string {
    const greeting =
      this.greetings[Math.floor(Math.random() * this.greetings.length)];
    return name ? `${greeting} Nice to meet you, ${name}!` : greeting;
  }

  /**
   * Get a random programming joke
   */
  private getRandomJoke(): string {
    const jokes = [
      "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
      "There are only 10 types of people in the world: those who understand binary and those who don't.",
      "Why do Java developers wear glasses? Because they can't C#! 👓",
      "A SQL query walks into a bar, walks up to two tables and asks... 'Can I join you?'",
      "Why did the developer go broke? Because he used up all his cache! 💸",
      "!false - It's funny because it's true.",
      "How many programmers does it take to change a light bulb? None, that's a hardware problem.",
      "I would tell you a UDP joke, but you might not get it.",
    ];
    return jokes[Math.floor(Math.random() * jokes.length)];
  }

  /**
   * Add response delay if configured
   */
  private async delay(): Promise<void> {
    if (this.responseDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.responseDelay));
    }
  }
}

/**
 * Create a Hello Bot instance
 */
export function createHelloBot(config?: HelloBotConfig): HelloBot {
  return new HelloBot(config);
}
