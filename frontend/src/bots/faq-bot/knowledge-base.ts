/**
 * FAQ Knowledge Base
 * Storage and search for FAQ entries
 */

import { createLogger } from "@/lib/logger";

const logger = createLogger("FAQKnowledgeBase");

// ============================================================================
// TYPES
// ============================================================================

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category?: string;
  keywords: string[];
  relatedLinks?: { title: string; url: string }[];
  addedBy?: string;
  createdAt: Date;
  updatedAt: Date;
  viewCount: number;
  helpfulCount: number;
}

export interface FAQSearchResult extends FAQ {
  score: number; // Relevance score 0-1
}

// ============================================================================
// STORAGE
// ============================================================================

const faqs = new Map<string, FAQ>();
let idCounter = 1;

/**
 * Generate unique FAQ ID
 */
function generateId(): string {
  return `faq_${Date.now()}_${(idCounter++).toString(36)}`;
}

// ============================================================================
// CRUD OPERATIONS
// ============================================================================

/**
 * Add a new FAQ
 */
export function addFAQ(data: {
  question: string;
  answer: string;
  category?: string;
  keywords?: string[];
  relatedLinks?: { title: string; url: string }[];
  addedBy?: string;
}): FAQ {
  const faq: FAQ = {
    id: generateId(),
    question: data.question,
    answer: data.answer,
    category: data.category,
    keywords: data.keywords || [],
    relatedLinks: data.relatedLinks,
    addedBy: data.addedBy,
    createdAt: new Date(),
    updatedAt: new Date(),
    viewCount: 0,
    helpfulCount: 0,
  };

  faqs.set(faq.id, faq);
  logger.info("FAQ added", { id: faq.id, question: faq.question });

  return faq;
}

/**
 * Get FAQ by ID
 */
export function getFAQ(id: string): FAQ | undefined {
  const faq = faqs.get(id);
  if (faq) {
    faq.viewCount++;
  }
  return faq;
}

/**
 * Update FAQ
 */
export function updateFAQ(id: string, updates: Partial<FAQ>): FAQ | undefined {
  const faq = faqs.get(id);
  if (!faq) return undefined;

  Object.assign(faq, updates, { updatedAt: new Date() });
  logger.info("FAQ updated", { id, updates });

  return faq;
}

/**
 * Remove FAQ
 */
export function removeFAQ(id: string): boolean {
  const deleted = faqs.delete(id);
  if (deleted) {
    logger.info("FAQ removed", { id });
  }
  return deleted;
}

/**
 * Get all FAQs
 */
export function getAllFAQs(): FAQ[] {
  return Array.from(faqs.values()).sort((a, b) =>
    a.question.localeCompare(b.question),
  );
}

/**
 * Get FAQs by category
 */
export function getFAQsByCategory(category: string): FAQ[] {
  return Array.from(faqs.values())
    .filter((f) => f.category === category)
    .sort((a, b) => a.question.localeCompare(b.question));
}

/**
 * Get all categories
 */
export function getFAQCategories(): string[] {
  const categories = new Set<string>();
  for (const faq of faqs.values()) {
    if (faq.category) {
      categories.add(faq.category);
    }
  }
  return Array.from(categories).sort();
}

// ============================================================================
// SEARCH
// ============================================================================

/**
 * Search FAQs using keyword matching and similarity
 */
export function searchFAQs(query: string, maxResults = 5): FAQSearchResult[] {
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);

  const results: FAQSearchResult[] = [];

  for (const faq of faqs.values()) {
    let score = 0;

    // Exact match in question
    if (faq.question.toLowerCase().includes(queryLower)) {
      score += 1.0;
    }

    // Exact match in answer
    if (faq.answer.toLowerCase().includes(queryLower)) {
      score += 0.5;
    }

    // Word matches in question
    const questionLower = faq.question.toLowerCase();
    for (const word of queryWords) {
      if (questionLower.includes(word)) {
        score += 0.3;
      }
    }

    // Word matches in answer
    const answerLower = faq.answer.toLowerCase();
    for (const word of queryWords) {
      if (answerLower.includes(word)) {
        score += 0.1;
      }
    }

    // Keyword matches
    for (const keyword of faq.keywords) {
      for (const word of queryWords) {
        if (keyword.toLowerCase().includes(word)) {
          score += 0.2;
        }
      }
    }

    // Normalize score
    score = Math.min(score, 1.0);

    if (score > 0) {
      results.push({ ...faq, score });
    }
  }

  // Sort by score (descending) and return top results
  return results.sort((a, b) => b.score - a.score).slice(0, maxResults);
}

/**
 * Find similar FAQs
 */
export function findSimilarFAQs(faqId: string, maxResults = 3): FAQ[] {
  const faq = faqs.get(faqId);
  if (!faq) return [];

  // Search using the question
  const results = searchFAQs(faq.question, maxResults + 1);

  // Remove the original FAQ from results
  return results.filter((r) => r.id !== faqId).slice(0, maxResults);
}

// ============================================================================
// STATISTICS
// ============================================================================

/**
 * Get FAQ statistics
 */
export function getStats(): {
  total: number;
  byCategory: Record<string, number>;
  mostViewed: FAQ[];
  mostHelpful: FAQ[];
} {
  const byCategory: Record<string, number> = {};

  for (const faq of faqs.values()) {
    const cat = faq.category || "Uncategorized";
    byCategory[cat] = (byCategory[cat] || 0) + 1;
  }

  const allFAQs = Array.from(faqs.values());

  const mostViewed = [...allFAQs]
    .sort((a, b) => b.viewCount - a.viewCount)
    .slice(0, 5);

  const mostHelpful = [...allFAQs]
    .sort((a, b) => b.helpfulCount - a.helpfulCount)
    .slice(0, 5);

  return {
    total: faqs.size,
    byCategory,
    mostViewed,
    mostHelpful,
  };
}

/**
 * Mark FAQ as helpful
 */
export function markHelpful(id: string): boolean {
  const faq = faqs.get(id);
  if (!faq) return false;

  faq.helpfulCount++;
  return true;
}

// ============================================================================
// PERSISTENCE
// ============================================================================

/**
 * Export all FAQs for persistence
 */
export function exportFAQs(): FAQ[] {
  return Array.from(faqs.values());
}

/**
 * Import FAQs from persistence
 */
export function importFAQs(savedFAQs: FAQ[]): void {
  faqs.clear();

  for (const faq of savedFAQs) {
    // Rehydrate dates
    faq.createdAt = new Date(faq.createdAt);
    faq.updatedAt = new Date(faq.updatedAt);

    faqs.set(faq.id, faq);
  }

  logger.info("Imported FAQs", { count: faqs.size });
}

/**
 * Clear all FAQs
 */
export function clearAllFAQs(): void {
  faqs.clear();
  logger.info("All FAQs cleared");
}

// ============================================================================
// BULK OPERATIONS
// ============================================================================

/**
 * Import FAQs from JSON
 */
export function importFromJSON(json: string): {
  success: number;
  failed: number;
} {
  let success = 0;
  let failed = 0;

  try {
    const data = JSON.parse(json);
    if (!Array.isArray(data)) {
      throw new Error("Invalid JSON format: expected array");
    }

    for (const item of data) {
      try {
        addFAQ({
          question: item.question,
          answer: item.answer,
          category: item.category,
          keywords: item.keywords || [],
          relatedLinks: item.relatedLinks,
        });
        success++;
      } catch (error) {
        logger.error("Failed to import FAQ", error as Error, { item });
        failed++;
      }
    }
  } catch (error) {
    logger.error("Failed to parse JSON", error as Error);
    failed++;
  }

  return { success, failed };
}

/**
 * Export FAQs to JSON
 */
export function exportToJSON(): string {
  return JSON.stringify(exportFAQs(), null, 2);
}
