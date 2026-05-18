/**
 * FAQ Bot
 * Automatically answer frequently asked questions
 */

import { bot, command } from "@/lib/bots";
import type {
  CommandContext,
  MessageContext,
  BotApi,
  BotResponse,
} from "@/lib/bots";
import { response, embed, error, success } from "@/lib/bots";
import { createLogger } from "@/lib/logger";
import {
  addFAQ,
  removeFAQ,
  getFAQ,
  searchFAQs,
  getAllFAQs,
  updateFAQ,
  getFAQCategories,
  getFAQsByCategory,
  exportFAQs,
  importFAQs,
  type FAQ,
} from "./knowledge-base";
import manifest from "./manifest.json";

const logger = createLogger("FAQBot");

// ============================================================================
// COMMAND HANDLERS
// ============================================================================

/**
 * /faq command - Search and display FAQ
 */
const faqCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const query = ctx.args.query as string;

  if (!query) {
    return error(
      "Missing query",
      "Usage: `/faq <question>`\nExample: `/faq how to reset password`",
    );
  }

  const results = searchFAQs(query);

  if (results.length === 0) {
    return response()
      .embed(
        embed()
          .title("❓ No answers found")
          .description(`I couldn't find an answer to: "${query}"`)
          .footer(
            "Try rephrasing or use /listfaqs to see all available questions",
          )
          .color("#F59E0B"),
      )
      .build();
  }

  // Show top result
  const faq = results[0];

  const embedBuilder = embed()
    .title(`❓ ${faq.question}`)
    .description(faq.answer)
    .color("#10B981")
    .footer(`FAQ ID: ${faq.id} | Category: ${faq.category || "General"}`);

  if (faq.relatedLinks && faq.relatedLinks.length > 0) {
    embedBuilder.field(
      "Related Links",
      faq.relatedLinks.map((l) => `• [${l.title}](${l.url})`).join("\n"),
    );
  }

  if (results.length > 1) {
    embedBuilder.field(
      "Related Questions",
      results
        .slice(1, 4)
        .map((f) => `• ${f.question}`)
        .join("\n"),
      false,
    );
  }

  return response().embed(embedBuilder).build();
};

/**
 * /addfaq command - Add new FAQ
 */
const addFAQCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const question = ctx.args.question as string;
  const answer = ctx.args.answer as string;
  const category = (ctx.args.category as string) || "General";

  if (!question || !answer) {
    return error(
      "Missing required arguments",
      'Usage: `/addfaq "<question>" "<answer>" [category]`\nExample: `/addfaq "How do I reset my password?" "Go to Settings > Security > Reset Password"`',
    );
  }

  const faq = addFAQ({
    question,
    answer,
    category,
    keywords: extractKeywords(question),
    addedBy: ctx.user.id,
  });

  // Save to storage
  try {
    await api.setStorage("faqs", exportFAQs());
  } catch (error) {
    logger.error("Failed to save FAQs", error as Error);
  }

  return success(
    "FAQ added!",
    `Question: "${question}"\nCategory: ${category}\nFAQ ID: ${faq.id}`,
  );
};

/**
 * /removefaq command - Remove FAQ
 */
const removeFAQCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const faqId = ctx.args.faq_id as string;

  if (!faqId) {
    return error("Missing FAQ ID", "Usage: `/removefaq <faq_id>`");
  }

  const success_result = removeFAQ(faqId);

  if (!success_result) {
    return error("FAQ not found", `No FAQ found with ID: ${faqId}`);
  }

  // Save to storage
  try {
    await api.setStorage("faqs", exportFAQs());
  } catch (error) {
    logger.error("Failed to save FAQs", error as Error);
  }

  return success(
    "FAQ removed",
    `FAQ ${faqId} has been removed from the knowledge base.`,
  );
};

/**
 * /editfaq command - Edit existing FAQ
 */
const editFAQCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const faqId = ctx.args.faq_id as string;
  const question = ctx.args.question as string;
  const answer = ctx.args.answer as string;
  const category = ctx.args.category as string;

  if (!faqId) {
    return error(
      "Missing FAQ ID",
      "Usage: `/editfaq <faq_id> [question] [answer] [category]`",
    );
  }

  const updates: Partial<FAQ> = {};
  if (question) updates.question = question;
  if (answer) updates.answer = answer;
  if (category) updates.category = category;

  if (Object.keys(updates).length === 0) {
    return error(
      "No updates provided",
      "Specify at least one field to update (question, answer, or category)",
    );
  }

  const updated = updateFAQ(faqId, updates);

  if (!updated) {
    return error("FAQ not found", `No FAQ found with ID: ${faqId}`);
  }

  // Save to storage
  try {
    await api.setStorage("faqs", exportFAQs());
  } catch (error) {
    logger.error("Failed to save FAQs", error as Error);
  }

  return success("FAQ updated", `FAQ ${faqId} has been updated.`);
};

/**
 * /listfaqs command - List all FAQs
 */
const listFAQsCommand = async (
  ctx: CommandContext,
  api: BotApi,
): Promise<BotResponse> => {
  const category = ctx.args.category as string;

  const faqs = category ? getFAQsByCategory(category) : getAllFAQs();
  const categories = getFAQCategories();

  if (faqs.length === 0) {
    return response()
      .embed(
        embed()
          .title("📚 FAQ Knowledge Base")
          .description("No FAQs available yet. Use `/addfaq` to add one!")
          .color("#94A3B8"),
      )
      .build();
  }

  const embedBuilder = embed()
    .title(category ? `📚 FAQs: ${category}` : "📚 FAQ Knowledge Base")
    .description(
      `**${faqs.length}** question${faqs.length === 1 ? "" : "s"} available`,
    )
    .color("#6366F1");

  // Group by category
  const grouped: Record<string, FAQ[]> = {};
  for (const faq of faqs) {
    const cat = faq.category || "General";
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(faq);
  }

  // Add fields for each category
  for (const [cat, catFAQs] of Object.entries(grouped)) {
    const questions = catFAQs
      .slice(0, 5)
      .map((f) => `• ${f.question}`)
      .join("\n");

    embedBuilder.field(
      `${cat} (${catFAQs.length})`,
      questions +
        (catFAQs.length > 5 ? `\n_...and ${catFAQs.length - 5} more_` : ""),
      false,
    );
  }

  if (!category && categories.length > 1) {
    embedBuilder.footer(
      `Categories: ${categories.join(", ")} | Use /listfaqs <category> to filter`,
    );
  }

  return response().embed(embedBuilder).build();
};

/**
 * Auto-answer handler - Detect questions in messages
 */
const handleMessage = async (
  ctx: MessageContext,
  api: BotApi,
): Promise<BotResponse | void> => {
  const config = api.getBotConfig();
  const autoAnswer = (config.settings?.auto_answer as boolean) !== false;
  const minConfidence = (config.settings?.min_confidence as number) || 0.7;

  if (!autoAnswer || ctx.isCommand) return;

  // Check if message is a question
  const isQuestion =
    ctx.message.content.includes("?") ||
    /^(how|what|when|where|why|who|can|does|is|are)\b/i.test(
      ctx.message.content,
    );

  if (!isQuestion) return;

  // Search FAQs
  const results = searchFAQs(ctx.message.content);
  if (results.length === 0 || results[0].score < minConfidence) return;

  const faq = results[0];

  // Send answer
  await ctx.message; // This would be implemented in the actual message context
  return response()
    .embed(
      embed()
        .title("💡 I think I can help!")
        .description(`**Q:** ${faq.question}\n\n**A:** ${faq.answer}`)
        .color("#3B82F6")
        .footer(`Not what you were looking for? Try /faq <your question>`),
    )
    .build();
};

// ============================================================================
// BOT FACTORY
// ============================================================================

/**
 * Create and configure the FAQ Bot
 */
export function createFAQBot() {
  return (
    bot(manifest.id)
      .name(manifest.name)
      .description(manifest.description)
      .version(manifest.version)
      .author(manifest.author)
      .icon(manifest.icon)
      .permissions("read_messages", "send_messages")

      // Register commands
      .command(
        command("faq")
          .description("Search the FAQ knowledge base")
          .aliases("ask", "help")
          .stringArg("query", "Your question", true)
          .example(
            "/faq how to reset password",
            "/faq what is the refund policy",
          ),
        faqCommand,
      )
      .command(
        command("addfaq")
          .description("Add a new FAQ")
          .stringArg("question", "The question", true)
          .stringArg("answer", "The answer", true)
          .stringArg("category", "Category (optional)")
          .example('/addfaq "How to reset password?" "Go to Settings > Reset"')
          .cooldown(10),
        addFAQCommand,
      )
      .command(
        command("removefaq")
          .description("Remove an FAQ")
          .stringArg("faq_id", "FAQ ID to remove", true)
          .example("/removefaq faq_abc123"),
        removeFAQCommand,
      )
      .command(
        command("editfaq")
          .description("Edit an existing FAQ")
          .stringArg("faq_id", "FAQ ID", true)
          .stringArg("question", "New question (optional)")
          .stringArg("answer", "New answer (optional)")
          .stringArg("category", "New category (optional)")
          .example('/editfaq faq_abc123 --answer "Updated answer"'),
        editFAQCommand,
      )
      .command(
        command("listfaqs")
          .description("List all FAQs")
          .aliases("faqs")
          .stringArg("category", "Filter by category (optional)")
          .example("/listfaqs", "/listfaqs General"),
        listFAQsCommand,
      )

      // Auto-answer questions
      .onMessage(handleMessage)

      // Initialization
      .onInit(async (instance, api) => {
        // Load saved FAQs
        try {
          const savedFAQs = await api.getStorage<FAQ[]>("faqs");
          if (savedFAQs && savedFAQs.length > 0) {
            importFAQs(savedFAQs);
            logger.info("Loaded FAQs from storage", {
              count: savedFAQs.length,
            });
          }
        } catch (error) {
          logger.error("Failed to load FAQs", error as Error);
        }

        // Periodic save
        const saveInterval = setInterval(
          async () => {
            try {
              await api.setStorage("faqs", exportFAQs());
            } catch (error) {
              logger.error("Failed to save FAQs", error as Error);
            }
          },
          5 * 60 * 1000,
        ); // Every 5 minutes

        instance.registerCleanup(() => {
          clearInterval(saveInterval);
        });
      })

      .build()
  );
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Extract keywords from question
 */
function extractKeywords(text: string): string[] {
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "is",
    "are",
    "was",
    "were",
    "to",
    "in",
    "on",
    "at",
    "how",
    "what",
    "when",
    "where",
    "why",
    "who",
    "do",
    "does",
    "can",
    "i",
    "you",
    "we",
    "they",
  ]);

  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

// ============================================================================
// EXPORTS
// ============================================================================

export default createFAQBot;
export { manifest };
