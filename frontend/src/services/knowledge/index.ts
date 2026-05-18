/**
 * Knowledge Base Services Index
 *
 * Central export for knowledge base and FAQ management.
 *
 * @module services/knowledge
 * @version 1.0.0
 */

// Knowledge Base Service
export {
  KnowledgeBaseService,
  getKnowledgeBaseService,
  createKnowledgeBaseService,
  resetKnowledgeBaseService,
} from "./knowledge-base.service";

// Re-export types from lib
export type {
  // Article types
  ArticleStatus,
  ArticleVisibility,
  ArticleContentType,
  KBArticle,
  KBAttachment,
  KBArticleAnalytics,
  KBArticleVersion,
  CreateArticleInput,
  UpdateArticleInput,
  // Category types
  KBCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
  // Search types
  ArticleSearchOptions,
  ArticleListOptions,
  ArticleListResult,
  ArticleSearchResult,
  // Feedback types
  ArticleFeedback,
  SubmitFeedbackInput,
  // FAQ types
  FAQEntry,
  CreateFAQInput,
  UpdateFAQInput,
  // Analytics types
  KBAnalytics,
  SearchAnalyticsEntry,
  // Event types
  KBEventType,
  KBEvent,
} from "@/lib/knowledge/knowledge-types";
