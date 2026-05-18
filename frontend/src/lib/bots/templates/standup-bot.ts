/**
 * Standup Bot Template
 * Automate daily standup meetings
 *
 * Features:
 * - Scheduled daily standup prompts
 * - Collect responses from team members
 * - Generate standup summaries
 * - Track participation
 * - Customizable questions
 * - Skip weekends option
 */

import { bot, embed, text, success, error, info, response } from "../bot-sdk";
import type { BotInstance } from "../bot-runtime";

export interface StandupResponse {
  userId: string;
  userName: string;
  yesterday: string;
  today: string;
  blockers: string;
  timestamp: Date;
}

export interface StandupSession {
  id: string;
  date: string; // YYYY-MM-DD
  channelId: string;
  responses: StandupResponse[];
  status: "active" | "completed";
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Create a standup bot instance
 */
export function createStandupBot(): BotInstance {
  return (
    bot("standup-bot")
      .name("Standup Bot")
      .description("Automate daily standup meetings")
      .version("1.0.0")
      .icon("🗣️")
      .permissions("read_messages", "send_messages", "mention_users")

      .settings({
        standupTime: "09:00",
        standupChannel: "general",
        skipWeekends: true,
        questions: {
          yesterday: "What did you accomplish yesterday?",
          today: "What will you work on today?",
          blockers: "Do you have any blockers?",
        },
        remindNonResponders: true,
        reminderTime: "10:00",
      })

      // Start standup command
      .command("standup", "Start daily standup", async (ctx, api) => {
        const config = api.getBotConfig();
        const today = new Date().toISOString().split("T")[0];

        // Check if standup already started today
        const existingSession = await api.getStorage<StandupSession>(
          `standup:${today}`,
        );

        if (existingSession && existingSession.status === "active") {
          return info(
            "Standup In Progress",
            "Standup is already in progress! Use `/mystandup` to submit your update.",
          );
        }

        // Create new standup session
        const session: StandupSession = {
          id: Math.random().toString(36).substring(7),
          date: today,
          channelId: ctx.channel.id,
          responses: [],
          status: "active",
          createdAt: new Date(),
        };

        await api.setStorage(`standup:${today}`, session);

        const settings = (config.settings || {}) as {
          questions?: { yesterday?: string; today?: string; blockers?: string };
        };
        const questions = settings.questions || {};

        return response()
          .embed(
            embed()
              .title("🗣️ Daily Standup")
              .description(
                `Good morning team! Time for our daily standup.\n\n` +
                  `Please share:\n` +
                  `1️⃣ ${questions.yesterday || "What did you accomplish yesterday?"}\n` +
                  `2️⃣ ${questions.today || "What will you work on today?"}\n` +
                  `3️⃣ ${questions.blockers || "Do you have any blockers?"}\n\n` +
                  `Use \`/mystandup\` to submit your update.`,
              )
              .color("#3b82f6")
              .footer(`${session.responses.length} responses so far`),
          )
          .build();
      })

      // Submit standup update
      .command("mystandup", "Submit your standup update", async (ctx, api) => {
        const today = new Date().toISOString().split("T")[0];

        const session = await api.getStorage<StandupSession>(
          `standup:${today}`,
        );

        if (!session || session.status !== "active") {
          return error(
            "No active standup today. An admin can start one with `/standup`.",
          );
        }

        // Check if user already responded
        const existingResponse = session.responses.find(
          (r) => r.userId === ctx.user.id,
        );

        if (existingResponse) {
          return info(
            "Already Submitted",
            "You've already submitted your standup today.\n\n" +
              "Use `/updatestandup` to update your response.",
          );
        }

        // Collect responses
        if (!ctx.args.yesterday || !ctx.args.today) {
          return text(
            "Usage: `/mystandup yesterday:<text> today:<text> [blockers:<text>]`\n\n" +
              "Example:\n" +
              '`/mystandup yesterday:"Fixed bugs" today:"New feature" blockers:"None"`',
          );
        }

        const standupResponse: StandupResponse = {
          userId: ctx.user.id,
          userName: ctx.user.displayName,
          yesterday: ctx.args.yesterday as string,
          today: ctx.args.today as string,
          blockers: (ctx.args.blockers as string) || "None",
          timestamp: new Date(),
        };

        session.responses.push(standupResponse);
        await api.setStorage(`standup:${today}`, session);

        return success(
          `Thanks for your update! 🎉\n\n` +
            `**Yesterday:** ${standupResponse.yesterday}\n` +
            `**Today:** ${standupResponse.today}\n` +
            `**Blockers:** ${standupResponse.blockers}\n\n` +
            `${session.responses.length} team members have responded.`,
        );
      })

      // Update standup response
      .command(
        "updatestandup",
        "Update your standup response",
        async (ctx, api) => {
          const today = new Date().toISOString().split("T")[0];
          const session = await api.getStorage<StandupSession>(
            `standup:${today}`,
          );

          if (!session || session.status !== "active") {
            return error("No active standup today.");
          }

          const responseIndex = session.responses.findIndex(
            (r) => r.userId === ctx.user.id,
          );

          if (responseIndex === -1) {
            return error(
              "You haven't submitted a standup yet. Use `/mystandup` first.",
            );
          }

          // Update response
          const response = session.responses[responseIndex];

          if (ctx.args.yesterday)
            response.yesterday = ctx.args.yesterday as string;
          if (ctx.args.today) response.today = ctx.args.today as string;
          if (ctx.args.blockers)
            response.blockers = ctx.args.blockers as string;

          response.timestamp = new Date();

          await api.setStorage(`standup:${today}`, session);

          return success("Your standup has been updated!");
        },
      )

      // End standup and show summary
      .command(
        "endstandup",
        "End standup and show summary",
        async (ctx, api) => {
          const today = new Date().toISOString().split("T")[0];
          const session = await api.getStorage<StandupSession>(
            `standup:${today}`,
          );

          if (!session || session.status !== "active") {
            return error("No active standup today.");
          }

          session.status = "completed";
          session.completedAt = new Date();
          await api.setStorage(`standup:${today}`, session);

          return renderStandupSummary(session);
        },
      )

      // Show standup summary
      .command("standupnotes", "View standup summary", async (ctx, api) => {
        const dateStr =
          (ctx.args.date as string) || new Date().toISOString().split("T")[0];
        const session = await api.getStorage<StandupSession>(
          `standup:${dateStr}`,
        );

        if (!session) {
          return error(`No standup found for ${dateStr}`);
        }

        return renderStandupSummary(session);
      })

      .onInit(async (bot, api) => {
        // REMOVED: console.log('[StandupBot] Initialized successfully')
        // This would use the bot_scheduled_tasks table
      })

      .build()
  );
}

/**
 * Render standup summary
 */
function renderStandupSummary(session: StandupSession): any {
  const response = embed()
    .title(`📋 Standup Summary - ${formatDate(session.date)}`)
    .description(
      `**Status:** ${session.status === "completed" ? "✅ Completed" : "⏳ In Progress"}\n` +
        `**Responses:** ${session.responses.length}\n` +
        `**Started:** ${formatTime(session.createdAt)}\n` +
        (session.completedAt
          ? `**Ended:** ${formatTime(session.completedAt)}\n`
          : ""),
    )
    .color(session.status === "completed" ? "#10b981" : "#f59e0b");

  // Add each team member's update
  session.responses.forEach((r) => {
    response.field(
      `👤 ${r.userName}`,
      `**Yesterday:** ${r.yesterday}\n` +
        `**Today:** ${r.today}\n` +
        `**Blockers:** ${r.blockers}`,
      false,
    );
  });

  if (session.responses.length === 0) {
    response.field(
      "No Responses",
      "No team members have submitted their updates yet.",
      false,
    );
  }

  return response.build();
}

/**
 * Format date for display
 */
function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format time for display
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Export metadata for template registration
 */
export const standupBotTemplate = {
  id: "standup-bot",
  name: "Standup Bot",
  description: "Automate daily standup meetings",
  category: "productivity" as const,
  icon: "🗣️",
  configSchema: {
    type: "object",
    properties: {
      standupTime: {
        type: "string",
        title: "Standup Time",
        description: "Daily standup time (HH:MM format)",
        default: "09:00",
      },
      standupChannel: {
        type: "string",
        title: "Standup Channel",
        description: "Channel for daily standups",
        default: "general",
      },
      skipWeekends: {
        type: "boolean",
        title: "Skip Weekends",
        description: "Don't run standups on Saturday and Sunday",
        default: true,
      },
      remindNonResponders: {
        type: "boolean",
        title: "Remind Non-responders",
        description: "Send reminder to team members who haven't responded",
        default: true,
      },
      reminderTime: {
        type: "string",
        title: "Reminder Time",
        description: "Time to send reminder (HH:MM format)",
        default: "10:00",
      },
    },
  },
  defaultConfig: {
    standupTime: "09:00",
    standupChannel: "general",
    skipWeekends: true,
    questions: {
      yesterday: "What did you accomplish yesterday?",
      today: "What will you work on today?",
      blockers: "Do you have any blockers?",
    },
    remindNonResponders: true,
    reminderTime: "10:00",
  },
  isFeatured: true,
};
