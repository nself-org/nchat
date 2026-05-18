/**
 * Plugin Services Index
 * Central export for all plugin services
 */

export * from "./analytics.service";
export * from "./search.service";
export * from "./media.service";
export * from "./ai.service";
export * from "./workflows.service";
export * from "./operations.service";

// Re-export services for convenience
export { analyticsService } from "./analytics.service";
export { searchService } from "./search.service";
export { mediaService } from "./media.service";
export { aiService } from "./ai.service";
export { workflowsService } from "./workflows.service";
