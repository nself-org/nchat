/**
 * Plugin Hooks Index
 * Central export for all plugin hooks
 */

// Analytics Plugin
export {
  useAnalyticsDashboard,
  useUserAnalytics,
  useChannelAnalytics,
  useAnalyticsTracking,
  useAnalyticsHealth,
} from "./use-analytics-plugin";

// Advanced Search Plugin
export {
  useAdvancedSearch,
  useSearchSuggestions,
  useSearchHealth,
} from "./use-search-plugin";

// Media Pipeline Plugin
export {
  useMediaUpload,
  useMediaMetadata,
  useMediaHealth,
} from "./use-media-plugin";

// AI Orchestration Plugin
export {
  useAIChat,
  useContentModeration,
  useTextSummarization,
  useAIHealth,
} from "./use-ai-plugin";

// Workflows Plugin
export {
  useWorkflows,
  useCreateWorkflow,
  useWorkflowExecution,
  useWorkflowTemplates,
  useWorkflowsHealth,
} from "./use-workflows-plugin";
