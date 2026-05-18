/**
 * FAQ Bot Template
 * Answer frequently asked questions using a knowledge base
 *
 * Features:
 * - Keyword-based question matching
 * - Add/edit/delete FAQs via commands
 * - Category organization
 * - Search functionality
 * - Analytics tracking
 */

import { bot, embed, text, success, error, info, response } from "../bot-sdk";
import type { BotInstance } from "../bot-runtime";

export interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category?: string;
  keywords: string[];
  useCount: number;
}

/**
 * Create an FAQ bot instance
 */
export function createFAQBot(): BotInstance {
  return (
    bot("faq-bot")
      .name("FAQ Bot")
      .description("Answer frequently asked questions using knowledge base")
      .version("1.0.0")
      .icon("❓")
      .permissions("read_messages", "send_messages")

      .settings({
        faqs: [] as FAQItem[],
        autoRespond: true,
        minMatchScore: 0.6,
      })

      // Commands
      .command("faq", "List all FAQs", async (ctx, api) => {
        const config = api.getBotConfig();
        const faqs = (config.settings?.faqs || []) as FAQItem[];

        if (faqs.length === 0) {
          return info(
            "No FAQs",
            "No FAQs configured yet. Use `/addfaq` to add one.",
          );
        }

        // Group by category
        const byCategory = faqs.reduce(
          (acc, faq) => {
            const cat = faq.category || "General";
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(faq);
            return acc;
          },
          {} as Record<string, FAQItem[]>,
        );

        const embedBuilder = embed()
          .title("❓ Frequently Asked Questions")
          .color("#3b82f6");

        Object.entries(byCategory).forEach(([category, items]) => {
          const itemsText = items
            .map(
              (faq, i) =>
                `${i + 1}. **${faq.question}**\n   ${faq.answer.substring(0, 100)}...`,
            )
            .join("\n\n");

          embedBuilder.field(category, itemsText);
        });

        return response().embed(embedBuilder).build();
      })

      .command("addfaq", "Add a new FAQ", async (ctx, api) => {
        if (!ctx.args.question || !ctx.args.answer) {
          return text(
            "Usage: `/addfaq question:<question> answer:<answer> [category:<category>]`\n\n" +
              "Example:\n" +
              '`/addfaq question:How do I reset my password? answer:Click "Forgot Password" on login page category:Account`',
          );
        }

        const config = api.getBotConfig();
        const faqs = (config.settings?.faqs || []) as FAQItem[];

        const newFAQ: FAQItem = {
          id: Math.random().toString(36).substring(7),
          question: ctx.args.question as string,
          answer: ctx.args.answer as string,
          category: (ctx.args.category as string) || "General",
          keywords: extractKeywords(ctx.args.question as string),
          useCount: 0,
        };

        faqs.push(newFAQ);
        config.settings = { ...config.settings, faqs };

        // Save to storage
        await api.setStorage("faqs", faqs);

        return success(
          `FAQ added successfully!\n\n` +
            `**Question:** ${newFAQ.question}\n` +
            `**Answer:** ${newFAQ.answer}\n` +
            `**Category:** ${newFAQ.category}`,
        );
      })

      .command("removefaq", "Remove an FAQ", async (ctx, api) => {
        if (!ctx.args.id && !ctx.args.question) {
          return text(
            "Usage: `/removefaq id:<faq-id>` or `/removefaq question:<partial-question>`",
          );
        }

        const config = api.getBotConfig();
        let faqs = (config.settings?.faqs || []) as FAQItem[];

        const searchTerm = (ctx.args.id || ctx.args.question) as string;
        const index = faqs.findIndex(
          (f) =>
            f.id === searchTerm ||
            f.question.toLowerCase().includes(searchTerm.toLowerCase()),
        );

        if (index === -1) {
          return error("FAQ not found. Use `/faq` to see all FAQs.");
        }

        const removed = faqs[index];
        faqs = faqs.filter((_, i) => i !== index);

        config.settings = { ...config.settings, faqs };
        await api.setStorage("faqs", faqs);

        return success(`Removed FAQ: **${removed.question}**`);
      })

      .command("searchfaq", "Search FAQs", async (ctx, api) => {
        if (!ctx.args.query) {
          return text("Usage: `/searchfaq query:<search-query>`");
        }

        const config = api.getBotConfig();
        const faqs = (config.settings?.faqs || []) as FAQItem[];
        const query = (ctx.args.query as string).toLowerCase();

        const results = faqs
          .map((faq) => ({
            faq,
            score: calculateMatchScore(query, faq),
          }))
          .filter((r) => r.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);

        if (results.length === 0) {
          return info("No Results", "No matching FAQs found.");
        }

        const embedBuilder = embed()
          .title("🔍 Search Results")
          .description(
            `Found ${results.length} result(s) for "${ctx.args.query}"`,
          )
          .color("#10b981");

        results.forEach(({ faq, score }) => {
          embedBuilder.field(
            faq.question,
            `${faq.answer}\n\n_Match: ${Math.round(score * 100)}%_`,
            false,
          );
        });

        return response().embed(embedBuilder).build();
      })

      // Auto-respond to questions
      .onMessage(async (ctx, api) => {
        const config = api.getBotConfig();
        const settings = (config.settings || {}) as {
          autoRespond?: boolean;
          faqs?: FAQItem[];
          minMatchScore?: number;
        };

        if (!settings.autoRespond) {
          return;
        }

        const faqs = (settings.faqs || []) as FAQItem[];
        const message = ctx.message.content.toLowerCase();

        // Check if message is a question
        if (!isQuestion(message)) {
          return;
        }

        // Find best matching FAQ
        const minScore =
          typeof settings.minMatchScore === "number"
            ? settings.minMatchScore
            : 0.6;
        const matches = faqs
          .map((faq) => ({
            faq,
            score: calculateMatchScore(message, faq),
          }))
          .filter((r) => r.score >= minScore)
          .sort((a, b) => b.score - a.score);

        if (matches.length === 0) {
          return;
        }

        const best = matches[0];

        // Update use count
        best.faq.useCount++;
        await api.setStorage("faqs", faqs);

        return response()
          .embed(
            embed()
              .title(`💡 ${best.faq.question}`)
              .description(best.faq.answer)
              .footer(
                `${best.faq.category || "General"} • Used ${best.faq.useCount} times`,
              )
              .color("#8b5cf6"),
          )
          .build();
      })

      .onInit(async (bot, api) => {
        // Load FAQs from storage
        const storedFAQs = await api.getStorage<FAQItem[]>("faqs");
        if (storedFAQs) {
          const config = api.getBotConfig();
          config.settings = { ...config.settings, faqs: storedFAQs };
        }
        // REMOVED: console.log('[FAQBot] Initialized with', storedFAQs?.length || 0, 'FAQs')
      })

      .build()
  );
}

/**
 * Extract keywords from a question
 */
function extractKeywords(question: string): string[] {
  const stopWords = new Set([
    "how",
    "what",
    "when",
    "where",
    "why",
    "who",
    "is",
    "are",
    "the",
    "a",
    "an",
    "do",
    "does",
    "can",
    "could",
    "would",
    "should",
    "i",
    "my",
    "to",
  ]);

  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

/**
 * Check if message is likely a question
 */
function isQuestion(message: string): boolean {
  const questionWords = [
    "how",
    "what",
    "when",
    "where",
    "why",
    "who",
    "can",
    "could",
    "would",
    "should",
    "is",
    "are",
    "does",
  ];
  const lowerMessage = message.toLowerCase();

  return (
    message.endsWith("?") ||
    questionWords.some((word) => lowerMessage.startsWith(word + " "))
  );
}

/**
 * Calculate match score between query and FAQ
 */
function calculateMatchScore(query: string, faq: FAQItem): number {
  const queryWords = extractKeywords(query);
  const faqWords = new Set([
    ...extractKeywords(faq.question),
    ...extractKeywords(faq.answer),
    ...faq.keywords,
  ]);

  if (queryWords.length === 0) return 0;

  const matches = queryWords.filter((word) => faqWords.has(word)).length;
  return matches / queryWords.length;
}

/**
 * Export metadata for template registration
 */
export const faqBotTemplate = {
  id: "faq-bot",
  name: "FAQ Bot",
  description: "Answer frequently asked questions using knowledge base",
  category: "utility" as const,
  icon: "❓",
  configSchema: {
    type: "object",
    properties: {
      autoRespond: {
        type: "boolean",
        title: "Auto-respond",
        description: "Automatically answer questions when a match is found",
        default: true,
      },
      minMatchScore: {
        type: "number",
        title: "Minimum Match Score",
        description: "Minimum confidence score (0-1) to auto-respond",
        default: 0.6,
        minimum: 0,
        maximum: 1,
      },
    },
  },
  defaultConfig: {
    faqs: [],
    autoRespond: true,
    minMatchScore: 0.6,
  },
  isFeatured: true,
};
