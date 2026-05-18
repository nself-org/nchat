/**
 * Poll Bot
 *
 * Create and manage polls in channels. Supports multiple choice,
 * anonymous voting, and time-limited polls.
 */

import { Bot, BotConfig, BotContext, BotResponse } from "../bot-types";

export interface PollBotConfig extends BotConfig {
  maxOptions?: number;
  defaultDuration?: number; // minutes
}

interface Poll {
  id: string;
  channelId: string;
  creatorId: string;
  question: string;
  options: string[];
  votes: Map<string, number>; // optionIndex -> count
  voters: Map<string, number>; // oderId -> optionIndex
  anonymous: boolean;
  endsAt?: Date;
  closed: boolean;
}

// In-memory poll storage (use database in production)
const polls = new Map<string, Poll>();
let pollIdCounter = 1;

export class PollBot implements Bot {
  readonly id = "poll-bot";
  readonly name = "Poll Bot";
  readonly description = "Create and manage polls";
  readonly avatar = "📊";
  readonly version = "1.0.0";

  private maxOptions: number;
  private defaultDuration: number;

  constructor(config?: PollBotConfig) {
    this.maxOptions = config?.maxOptions || 10;
    this.defaultDuration = config?.defaultDuration || 60; // 1 hour
  }

  getCommands() {
    return [
      {
        name: "poll",
        description: "Create a new poll",
        usage:
          '/poll "Question" "Option 1" "Option 2" [--anonymous] [--duration 30]',
      },
      {
        name: "vote",
        description: "Vote in a poll",
        usage: "/vote <poll-id> <option-number>",
      },
      {
        name: "results",
        description: "Show poll results",
        usage: "/results <poll-id>",
      },
      {
        name: "closepoll",
        description: "Close a poll (creator only)",
        usage: "/closepoll <poll-id>",
      },
    ];
  }

  async onMessage(): Promise<BotResponse | null> {
    return null; // Poll bot only responds to commands
  }

  async onCommand(
    command: string,
    args: string[],
    context: BotContext,
  ): Promise<BotResponse> {
    switch (command) {
      case "poll":
        return this.createPoll(args, context);
      case "vote":
        return this.vote(args, context);
      case "results":
        return this.showResults(args, context);
      case "closepoll":
        return this.closePoll(args, context);
      default:
        return {
          type: "message",
          content: "Unknown command. Try /poll, /vote, /results, or /closepoll",
        };
    }
  }

  async onMention(context: BotContext): Promise<BotResponse> {
    return {
      type: "message",
      content:
        'Hi! Use `/poll "Question" "Option 1" "Option 2"` to create a poll!',
    };
  }

  private createPoll(args: string[], context: BotContext): BotResponse {
    // Parse quoted arguments
    const parsed = this.parseQuotedArgs(args.join(" "));
    const flags = this.parseFlags(args);

    if (parsed.length < 3) {
      return {
        type: "message",
        content:
          'Please provide a question and at least 2 options.\nUsage: `/poll "Question" "Option 1" "Option 2"`',
      };
    }

    if (parsed.length > this.maxOptions + 1) {
      return {
        type: "message",
        content: `Maximum ${this.maxOptions} options allowed.`,
      };
    }

    const [question, ...options] = parsed;
    const pollId = `poll-${pollIdCounter++}`;
    const duration = flags.duration || this.defaultDuration;

    const poll: Poll = {
      id: pollId,
      channelId: context.channel.id,
      creatorId: context.user.id,
      question,
      options,
      votes: new Map(options.map((_, i) => [i.toString(), 0])),
      voters: new Map(),
      anonymous: flags.anonymous || false,
      endsAt:
        duration > 0 ? new Date(Date.now() + duration * 60000) : undefined,
      closed: false,
    };

    polls.set(pollId, poll);

    // Format poll message
    const optionsList = options.map((opt, i) => `${i + 1}. ${opt}`).join("\n");

    const footer = poll.anonymous
      ? "🔒 Anonymous poll"
      : poll.endsAt
        ? `⏰ Ends ${this.formatTime(poll.endsAt)}`
        : "";

    return {
      type: "rich",
      content: {
        title: `📊 ${question}`,
        description: optionsList,
        footer: `Poll ID: ${pollId} | Vote with /vote ${pollId} <number>\n${footer}`,
        color: "#6366f1",
      },
    };
  }

  private vote(args: string[], context: BotContext): BotResponse {
    const [pollId, optionStr] = args;

    if (!pollId || !optionStr) {
      return {
        type: "message",
        content: "Usage: `/vote <poll-id> <option-number>`",
      };
    }

    const poll = polls.get(pollId);
    if (!poll) {
      return {
        type: "message",
        content: `Poll "${pollId}" not found.`,
      };
    }

    if (poll.closed) {
      return {
        type: "message",
        content: "This poll is closed.",
      };
    }

    if (poll.endsAt && new Date() > poll.endsAt) {
      poll.closed = true;
      return {
        type: "message",
        content: "This poll has ended.",
      };
    }

    const optionIndex = parseInt(optionStr, 10) - 1;
    if (
      isNaN(optionIndex) ||
      optionIndex < 0 ||
      optionIndex >= poll.options.length
    ) {
      return {
        type: "message",
        content: `Invalid option. Choose 1-${poll.options.length}`,
      };
    }

    // Check if already voted
    const previousVote = poll.voters.get(context.user.id);
    if (previousVote !== undefined) {
      // Change vote
      const prevCount = poll.votes.get(previousVote.toString()) || 0;
      poll.votes.set(previousVote.toString(), Math.max(0, prevCount - 1));
    }

    // Record new vote
    poll.voters.set(context.user.id, optionIndex);
    const currentCount = poll.votes.get(optionIndex.toString()) || 0;
    poll.votes.set(optionIndex.toString(), currentCount + 1);

    const action = previousVote !== undefined ? "changed to" : "recorded for";
    return {
      type: "message",
      content: `✅ Vote ${action} option ${optionIndex + 1}: "${poll.options[optionIndex]}"`,
      ephemeral: true,
    };
  }

  private showResults(args: string[], context: BotContext): BotResponse {
    const [pollId] = args;

    if (!pollId) {
      return {
        type: "message",
        content: "Usage: `/results <poll-id>`",
      };
    }

    const poll = polls.get(pollId);
    if (!poll) {
      return {
        type: "message",
        content: `Poll "${pollId}" not found.`,
      };
    }

    const totalVotes = Array.from(poll.votes.values()).reduce(
      (a, b) => a + b,
      0,
    );

    const results = poll.options
      .map((opt, i) => {
        const votes = poll.votes.get(i.toString()) || 0;
        const percentage =
          totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
        const bar = this.createProgressBar(percentage);
        return `${i + 1}. ${opt}\n   ${bar} ${votes} votes (${percentage}%)`;
      })
      .join("\n\n");

    return {
      type: "rich",
      content: {
        title: `📊 Results: ${poll.question}`,
        description: results,
        footer: `Total votes: ${totalVotes} | ${poll.closed ? "🔒 Closed" : "🟢 Open"}`,
        color: poll.closed ? "#6b7280" : "#22c55e",
      },
    };
  }

  private closePoll(args: string[], context: BotContext): BotResponse {
    const [pollId] = args;

    if (!pollId) {
      return {
        type: "message",
        content: "Usage: `/closepoll <poll-id>`",
      };
    }

    const poll = polls.get(pollId);
    if (!poll) {
      return {
        type: "message",
        content: `Poll "${pollId}" not found.`,
      };
    }

    if (poll.creatorId !== context.user.id) {
      return {
        type: "message",
        content: "Only the poll creator can close this poll.",
      };
    }

    poll.closed = true;
    return this.showResults([pollId], context);
  }

  private parseQuotedArgs(input: string): string[] {
    const regex = /"([^"]+)"/g;
    const matches: string[] = [];
    let match;
    while ((match = regex.exec(input)) !== null) {
      matches.push(match[1]);
    }
    return matches;
  }

  private parseFlags(args: string[]): {
    anonymous?: boolean;
    duration?: number;
  } {
    const flags: { anonymous?: boolean; duration?: number } = {};
    for (let i = 0; i < args.length; i++) {
      if (args[i] === "--anonymous") flags.anonymous = true;
      if (args[i] === "--duration" && args[i + 1]) {
        flags.duration = parseInt(args[i + 1], 10);
      }
    }
    return flags;
  }

  private createProgressBar(percentage: number): string {
    const filled = Math.round(percentage / 10);
    const empty = 10 - filled;
    return "█".repeat(filled) + "░".repeat(empty);
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
}

export function createPollBot(config?: PollBotConfig): PollBot {
  return new PollBot(config);
}
