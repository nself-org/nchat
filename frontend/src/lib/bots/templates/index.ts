/**
 * Bot Templates Index
 * Pre-built bot templates for quick setup
 */

import {
  welcomeBotTemplate as _welcomeBot,
  createWelcomeBot,
} from "./welcome-bot";
import { faqBotTemplate as _faqBot, createFAQBot } from "./faq-bot";
import { pollBotTemplate as _pollBot, createPollBot } from "./poll-bot";
import {
  schedulerBotTemplate as _schedulerBot,
  createSchedulerBot,
} from "./scheduler-bot";
import {
  standupBotTemplate as _standupBot,
  createStandupBot,
} from "./standup-bot";

// Re-export all
export { createWelcomeBot, _welcomeBot as welcomeBotTemplate };
export { createFAQBot, _faqBot as faqBotTemplate };
export { createPollBot, _pollBot as pollBotTemplate };
export { createSchedulerBot, _schedulerBot as schedulerBotTemplate };
export { createStandupBot, _standupBot as standupBotTemplate };

/**
 * All available templates
 */
export const allTemplates = [
  _welcomeBot,
  _faqBot,
  _pollBot,
  _schedulerBot,
  _standupBot,
] as const;

/**
 * Get template by ID
 */
export function getTemplate(id: string) {
  return allTemplates.find((t) => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string) {
  return allTemplates.filter((t) => t.category === category);
}

/**
 * Get featured templates
 */
export function getFeaturedTemplates() {
  return allTemplates.filter((t) => t.isFeatured);
}
