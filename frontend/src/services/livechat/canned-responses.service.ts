/**
 * Canned Responses Service
 *
 * Provides quick reply functionality for support agents with:
 * - Global, department, and personal response scopes
 * - Shortcut-based quick access (!shortcut syntax)
 * - Variable substitution ({{visitor.name}}, {{agent.name}}, etc.)
 * - Usage tracking and analytics
 * - Tag-based organization
 *
 * @module services/livechat/canned-responses.service
 * @version 1.0.0
 */

import { createLogger } from "@/lib/logger";
import { v4 as uuidv4 } from "uuid";
import type { APIResponse } from "@/types/api";
import type {
  CannedResponse,
  CreateCannedResponseInput,
  UpdateCannedResponseInput,
  LivechatListResult,
  LivechatListOptions,
  Visitor,
  Agent,
  Conversation,
} from "./types";

const log = createLogger("CannedResponsesService");

// ============================================================================
// TYPES
// ============================================================================

/**
 * Variable context for substitution
 */
export interface VariableContext {
  visitor?: Visitor;
  agent?: Agent;
  conversation?: Conversation;
  custom?: Record<string, string>;
}

/**
 * Search options for canned responses
 */
export interface CannedResponseSearchOptions extends LivechatListOptions {
  scope?: "global" | "department" | "personal" | "all";
  departmentId?: string;
  agentId?: string;
  query?: string;
  tags?: string[];
}

/**
 * Analytics for canned responses
 */
export interface CannedResponseAnalytics {
  totalResponses: number;
  totalUsage: number;
  topResponses: Array<{
    id: string;
    shortcut: string;
    title: string;
    usageCount: number;
  }>;
  byScope: {
    global: number;
    department: number;
    personal: number;
  };
  recentlyUsed: Array<{
    id: string;
    shortcut: string;
    usedAt: Date;
  }>;
}

/**
 * Canned response with rendered text
 */
export interface RenderedCannedResponse extends CannedResponse {
  renderedText: string;
}

// ============================================================================
// IN-MEMORY STORES
// ============================================================================

const cannedResponses = new Map<string, CannedResponse>();
const usageHistory: Array<{
  responseId: string;
  usedAt: Date;
  agentId: string;
}> = [];

// Built-in default responses
const DEFAULT_RESPONSES: Array<
  Omit<CannedResponse, "id" | "createdAt" | "updatedAt">
> = [
  {
    shortcut: "greeting",
    title: "Standard Greeting",
    text: "Hello {{visitor.name}}! Thank you for contacting support. My name is {{agent.name}}, and I'll be happy to assist you today. How can I help?",
    scope: "global",
    tags: ["greeting", "welcome"],
    usageCount: 0,
    createdBy: "system",
  },
  {
    shortcut: "hold",
    title: "Please Hold",
    text: "Thank you for your patience. I'm looking into this for you. Please hold for a moment.",
    scope: "global",
    tags: ["hold", "waiting"],
    usageCount: 0,
    createdBy: "system",
  },
  {
    shortcut: "transfer",
    title: "Transfer Notice",
    text: "I'm going to transfer you to a specialist who can better assist with your request. Please hold while I connect you.",
    scope: "global",
    tags: ["transfer"],
    usageCount: 0,
    createdBy: "system",
  },
  {
    shortcut: "thanks",
    title: "Thank You",
    text: "Thank you for contacting us! Is there anything else I can help you with today?",
    scope: "global",
    tags: ["closing"],
    usageCount: 0,
    createdBy: "system",
  },
  {
    shortcut: "bye",
    title: "Closing Message",
    text: "Thank you for chatting with us today, {{visitor.name}}. If you have any more questions in the future, feel free to reach out. Have a great day!",
    scope: "global",
    tags: ["closing", "goodbye"],
    usageCount: 0,
    createdBy: "system",
  },
  {
    shortcut: "offline",
    title: "Offline Message",
    text: "Thank you for your message. Our support team is currently offline. We'll respond to your inquiry as soon as possible during business hours.",
    scope: "global",
    tags: ["offline"],
    usageCount: 0,
    createdBy: "system",
  },
  {
    shortcut: "email",
    title: "Request Email",
    text: "Could you please provide your email address so I can send you additional information?",
    scope: "global",
    tags: ["information"],
    usageCount: 0,
    createdBy: "system",
  },
  {
    shortcut: "screenshot",
    title: "Request Screenshot",
    text: "Could you please share a screenshot of the issue you're experiencing? This will help me better understand and resolve the problem.",
    scope: "global",
    tags: ["troubleshooting"],
    usageCount: 0,
    createdBy: "system",
  },
];

// ============================================================================
// CANNED RESPONSES SERVICE CLASS
// ============================================================================

export class CannedResponsesService {
  constructor() {
    // Initialize with default responses if empty
    if (cannedResponses.size === 0) {
      this.initializeDefaults();
    }
  }

  /**
   * Initialize default canned responses
   */
  private initializeDefaults(): void {
    const now = new Date();

    for (const response of DEFAULT_RESPONSES) {
      const id = uuidv4();
      cannedResponses.set(id, {
        id,
        ...response,
        createdAt: now,
        updatedAt: now,
      });
    }

    log.info("Default canned responses initialized", {
      count: DEFAULT_RESPONSES.length,
    });
  }

  // ==========================================================================
  // CRUD OPERATIONS
  // ==========================================================================

  /**
   * Create a new canned response
   */
  async create(
    input: CreateCannedResponseInput,
    createdBy: string,
  ): Promise<APIResponse<CannedResponse>> {
    try {
      log.debug("Creating canned response", {
        shortcut: input.shortcut,
        scope: input.scope,
      });

      // Validate shortcut format
      if (!this.isValidShortcut(input.shortcut)) {
        return {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            status: 400,
            message:
              "Shortcut must be alphanumeric with dashes/underscores, 2-50 characters",
          },
        };
      }

      // Check for duplicate shortcut within the same scope
      const scope = input.scope || "personal";
      const existingResult = await this.getByShortcut(input.shortcut, {
        scope,
        departmentId: input.departmentId,
        agentId: scope === "personal" ? createdBy : undefined,
      });

      if (existingResult.success && existingResult.data) {
        return {
          success: false,
          error: {
            code: "CONFLICT",
            status: 409,
            message: `Shortcut "${input.shortcut}" already exists in this scope`,
          },
        };
      }

      const id = uuidv4();
      const now = new Date();

      const cannedResponse: CannedResponse = {
        id,
        shortcut: input.shortcut.toLowerCase(),
        title: input.title,
        text: input.text,
        scope,
        departmentId: input.departmentId,
        agentId: scope === "personal" ? createdBy : undefined,
        tags: input.tags || [],
        usageCount: 0,
        createdBy,
        createdAt: now,
        updatedAt: now,
      };

      cannedResponses.set(id, cannedResponse);

      log.info("Canned response created", { id, shortcut: input.shortcut });

      return {
        success: true,
        data: cannedResponse,
      };
    } catch (error) {
      log.error("Failed to create canned response", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get a canned response by ID
   */
  async get(id: string): Promise<APIResponse<CannedResponse | null>> {
    try {
      const response = cannedResponses.get(id);
      return {
        success: true,
        data: response || null,
      };
    } catch (error) {
      log.error("Failed to get canned response", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get a canned response by shortcut
   */
  async getByShortcut(
    shortcut: string,
    options?: { scope?: string; departmentId?: string; agentId?: string },
  ): Promise<APIResponse<CannedResponse | null>> {
    try {
      const normalizedShortcut = shortcut.toLowerCase().replace(/^!/, "");

      const responses = Array.from(cannedResponses.values()).filter((r) => {
        if (r.shortcut !== normalizedShortcut) return false;

        // Filter by scope
        if (options?.scope && options.scope !== "all") {
          if (r.scope !== options.scope) return false;
        }

        // Filter by department
        if (options?.departmentId && r.scope === "department") {
          if (r.departmentId !== options.departmentId) return false;
        }

        // Filter by agent (for personal responses)
        if (options?.agentId && r.scope === "personal") {
          if (r.agentId !== options.agentId) return false;
        }

        return true;
      });

      // Return the most specific match
      if (responses.length === 0) {
        return { success: true, data: null };
      }

      // Priority: personal > department > global
      const priorityOrder = ["personal", "department", "global"];
      responses.sort((a, b) => {
        return priorityOrder.indexOf(a.scope) - priorityOrder.indexOf(b.scope);
      });

      return {
        success: true,
        data: responses[0],
      };
    } catch (error) {
      log.error("Failed to get canned response by shortcut", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Update a canned response
   */
  async update(
    id: string,
    input: UpdateCannedResponseInput,
    updatedBy: string,
  ): Promise<APIResponse<CannedResponse>> {
    try {
      const existing = cannedResponses.get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Canned response not found",
          },
        };
      }

      // Validate shortcut if being changed
      if (input.shortcut && input.shortcut !== existing.shortcut) {
        if (!this.isValidShortcut(input.shortcut)) {
          return {
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              status: 400,
              message:
                "Shortcut must be alphanumeric with dashes/underscores, 2-50 characters",
            },
          };
        }

        // Check for conflicts
        const conflictResult = await this.getByShortcut(input.shortcut, {
          scope: existing.scope,
          departmentId: existing.departmentId,
          agentId: existing.agentId,
        });

        if (
          conflictResult.success &&
          conflictResult.data &&
          conflictResult.data.id !== id
        ) {
          return {
            success: false,
            error: {
              code: "CONFLICT",
              status: 409,
              message: `Shortcut "${input.shortcut}" already exists in this scope`,
            },
          };
        }
      }

      const updated: CannedResponse = {
        ...existing,
        shortcut: input.shortcut?.toLowerCase() ?? existing.shortcut,
        title: input.title ?? existing.title,
        text: input.text ?? existing.text,
        tags: input.tags ?? existing.tags,
        updatedAt: new Date(),
      };

      cannedResponses.set(id, updated);

      log.info("Canned response updated", { id });

      return {
        success: true,
        data: updated,
      };
    } catch (error) {
      log.error("Failed to update canned response", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Delete a canned response
   */
  async delete(id: string): Promise<APIResponse<{ deleted: boolean }>> {
    try {
      const existing = cannedResponses.get(id);
      if (!existing) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Canned response not found",
          },
        };
      }

      cannedResponses.delete(id);

      log.info("Canned response deleted", { id });

      return {
        success: true,
        data: { deleted: true },
      };
    } catch (error) {
      log.error("Failed to delete canned response", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // SEARCH AND LIST
  // ==========================================================================

  /**
   * Search and list canned responses
   */
  async search(
    options: CannedResponseSearchOptions,
  ): Promise<APIResponse<LivechatListResult<CannedResponse>>> {
    try {
      const {
        limit = 50,
        offset = 0,
        scope = "all",
        departmentId,
        agentId,
        query,
        tags,
        sortBy = "shortcut",
        sortOrder = "asc",
      } = options;

      let results = Array.from(cannedResponses.values());

      // Filter by scope
      if (scope !== "all") {
        results = results.filter((r) => r.scope === scope);
      }

      // Filter by department
      if (departmentId) {
        results = results.filter((r) => {
          if (r.scope === "department") return r.departmentId === departmentId;
          return r.scope === "global"; // Include global responses
        });
      }

      // Filter by agent (include personal and higher scopes)
      if (agentId) {
        results = results.filter((r) => {
          if (r.scope === "personal") return r.agentId === agentId;
          if (r.scope === "department" && departmentId)
            return r.departmentId === departmentId;
          return r.scope === "global";
        });
      }

      // Search by query
      if (query) {
        const queryLower = query.toLowerCase();
        results = results.filter(
          (r) =>
            r.shortcut.includes(queryLower) ||
            r.title.toLowerCase().includes(queryLower) ||
            r.text.toLowerCase().includes(queryLower),
        );
      }

      // Filter by tags
      if (tags && tags.length > 0) {
        results = results.filter((r) =>
          tags.some((tag) => r.tags.includes(tag)),
        );
      }

      // Sort
      results.sort((a, b) => {
        let aVal: string | number;
        let bVal: string | number;

        switch (sortBy) {
          case "shortcut":
            aVal = a.shortcut;
            bVal = b.shortcut;
            break;
          case "title":
            aVal = a.title;
            bVal = b.title;
            break;
          case "usageCount":
            aVal = a.usageCount;
            bVal = b.usageCount;
            break;
          case "createdAt":
            aVal = a.createdAt.getTime();
            bVal = b.createdAt.getTime();
            break;
          default:
            aVal = a.shortcut;
            bVal = b.shortcut;
        }

        if (typeof aVal === "string" && typeof bVal === "string") {
          return sortOrder === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }

        return sortOrder === "asc"
          ? (aVal as number) - (bVal as number)
          : (bVal as number) - (aVal as number);
      });

      const totalCount = results.length;
      const items = results.slice(offset, offset + limit);

      return {
        success: true,
        data: {
          items,
          totalCount,
          hasMore: offset + limit < totalCount,
          offset,
          limit,
        },
      };
    } catch (error) {
      log.error("Failed to search canned responses", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get available canned responses for an agent
   */
  async getForAgent(
    agentId: string,
    departmentId?: string,
  ): Promise<APIResponse<CannedResponse[]>> {
    try {
      const responses = Array.from(cannedResponses.values()).filter((r) => {
        // Include global responses
        if (r.scope === "global") return true;

        // Include department responses for matching department
        if (
          r.scope === "department" &&
          departmentId &&
          r.departmentId === departmentId
        )
          return true;

        // Include personal responses for this agent
        if (r.scope === "personal" && r.agentId === agentId) return true;

        return false;
      });

      // Sort by scope priority, then by shortcut
      responses.sort((a, b) => {
        const priorityOrder = { personal: 0, department: 1, global: 2 };
        const scopeDiff = priorityOrder[a.scope] - priorityOrder[b.scope];
        if (scopeDiff !== 0) return scopeDiff;
        return a.shortcut.localeCompare(b.shortcut);
      });

      return {
        success: true,
        data: responses,
      };
    } catch (error) {
      log.error("Failed to get canned responses for agent", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // TEXT RENDERING
  // ==========================================================================

  /**
   * Render a canned response with variable substitution
   */
  async render(
    id: string,
    context: VariableContext,
  ): Promise<APIResponse<RenderedCannedResponse>> {
    try {
      const response = cannedResponses.get(id);
      if (!response) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Canned response not found",
          },
        };
      }

      const renderedText = this.substituteVariables(response.text, context);

      return {
        success: true,
        data: {
          ...response,
          renderedText,
        },
      };
    } catch (error) {
      log.error("Failed to render canned response", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Render a canned response by shortcut
   */
  async renderByShortcut(
    shortcut: string,
    context: VariableContext,
    options?: { scope?: string; departmentId?: string; agentId?: string },
  ): Promise<APIResponse<RenderedCannedResponse | null>> {
    try {
      const responseResult = await this.getByShortcut(shortcut, options);
      if (!responseResult.success) {
        return { success: false, error: responseResult.error };
      }

      if (!responseResult.data) {
        return { success: true, data: null };
      }

      const renderedText = this.substituteVariables(
        responseResult.data.text,
        context,
      );

      return {
        success: true,
        data: {
          ...responseResult.data,
          renderedText,
        },
      };
    } catch (error) {
      log.error("Failed to render canned response by shortcut", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Substitute variables in text
   */
  private substituteVariables(text: string, context: VariableContext): string {
    const variables: Record<string, string | undefined> = {
      // Visitor variables
      "visitor.name": context.visitor?.name || "valued customer",
      "visitor.email": context.visitor?.email || "",
      "visitor.phone": context.visitor?.phone || "",

      // Agent variables
      "agent.name": context.agent?.displayName || "Support Agent",
      "agent.email": context.agent?.email || "",

      // Conversation variables
      "conversation.id": context.conversation?.id || "",
      "conversation.department": context.conversation?.department || "",

      // Date/time variables
      date: new Date().toLocaleDateString(),
      time: new Date().toLocaleTimeString(),
      datetime: new Date().toLocaleString(),

      // Custom variables
      ...context.custom,
    };

    return text.replace(/\{\{(\w+(?:\.\w+)?)\}\}/g, (match, key) => {
      const value = variables[key];
      return value !== undefined ? value : match;
    });
  }

  // ==========================================================================
  // USAGE TRACKING
  // ==========================================================================

  /**
   * Record usage of a canned response
   */
  async recordUsage(id: string, agentId: string): Promise<APIResponse<void>> {
    try {
      const response = cannedResponses.get(id);
      if (!response) {
        return {
          success: false,
          error: {
            code: "NOT_FOUND",
            status: 404,
            message: "Canned response not found",
          },
        };
      }

      // Increment usage count
      response.usageCount++;
      response.updatedAt = new Date();
      cannedResponses.set(id, response);

      // Add to usage history
      usageHistory.push({
        responseId: id,
        usedAt: new Date(),
        agentId,
      });

      // Trim history if too large
      if (usageHistory.length > 10000) {
        usageHistory.splice(0, 1000);
      }

      log.debug("Canned response usage recorded", { id, agentId });

      return {
        success: true,
        data: undefined,
      };
    } catch (error) {
      log.error("Failed to record usage", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Get canned response analytics
   */
  async getAnalytics(options?: {
    agentId?: string;
    period?: { start: Date; end: Date };
  }): Promise<APIResponse<CannedResponseAnalytics>> {
    try {
      const responses = Array.from(cannedResponses.values());

      // Filter by agent if specified
      let relevantResponses = responses;
      let relevantHistory = usageHistory;

      if (options?.agentId) {
        relevantResponses = responses.filter((r) =>
          r.scope === "personal" ? r.agentId === options.agentId : true,
        );
        relevantHistory = usageHistory.filter(
          (h) => h.agentId === options.agentId,
        );
      }

      if (options?.period) {
        relevantHistory = relevantHistory.filter(
          (h) =>
            h.usedAt >= options.period!.start &&
            h.usedAt <= options.period!.end,
        );
      }

      // Calculate analytics
      const analytics: CannedResponseAnalytics = {
        totalResponses: relevantResponses.length,
        totalUsage: relevantHistory.length,
        topResponses: relevantResponses
          .sort((a, b) => b.usageCount - a.usageCount)
          .slice(0, 10)
          .map((r) => ({
            id: r.id,
            shortcut: r.shortcut,
            title: r.title,
            usageCount: r.usageCount,
          })),
        byScope: {
          global: relevantResponses.filter((r) => r.scope === "global").length,
          department: relevantResponses.filter((r) => r.scope === "department")
            .length,
          personal: relevantResponses.filter((r) => r.scope === "personal")
            .length,
        },
        recentlyUsed: relevantHistory
          .sort((a, b) => b.usedAt.getTime() - a.usedAt.getTime())
          .slice(0, 10)
          .map((h) => {
            const response = cannedResponses.get(h.responseId);
            return {
              id: h.responseId,
              shortcut: response?.shortcut || "unknown",
              usedAt: h.usedAt,
            };
          }),
      };

      return {
        success: true,
        data: analytics,
      };
    } catch (error) {
      log.error("Failed to get analytics", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // UTILITIES
  // ==========================================================================

  /**
   * Validate shortcut format
   */
  private isValidShortcut(shortcut: string): boolean {
    // 2-50 characters, alphanumeric with dashes and underscores
    const pattern = /^[a-zA-Z0-9][a-zA-Z0-9_-]{1,49}$/;
    return pattern.test(shortcut);
  }

  /**
   * Get all unique tags
   */
  async getTags(): Promise<APIResponse<string[]>> {
    try {
      const tagSet = new Set<string>();

      for (const response of cannedResponses.values()) {
        for (const tag of response.tags) {
          tagSet.add(tag);
        }
      }

      return {
        success: true,
        data: Array.from(tagSet).sort(),
      };
    } catch (error) {
      log.error("Failed to get tags", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Bulk import canned responses
   */
  async bulkImport(
    responses: CreateCannedResponseInput[],
    createdBy: string,
  ): Promise<
    APIResponse<{ imported: number; failed: number; errors: string[] }>
  > {
    try {
      let imported = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const input of responses) {
        const result = await this.create(input, createdBy);
        if (result.success) {
          imported++;
        } else {
          failed++;
          errors.push(`${input.shortcut}: ${result.error?.message}`);
        }
      }

      log.info("Bulk import completed", { imported, failed });

      return {
        success: true,
        data: { imported, failed, errors },
      };
    } catch (error) {
      log.error("Failed to bulk import", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  /**
   * Export canned responses
   */
  async export(options?: {
    scope?: string;
    departmentId?: string;
  }): Promise<APIResponse<CannedResponse[]>> {
    try {
      let responses = Array.from(cannedResponses.values());

      if (options?.scope) {
        responses = responses.filter((r) => r.scope === options.scope);
      }

      if (options?.departmentId) {
        responses = responses.filter(
          (r) =>
            r.scope !== "department" || r.departmentId === options.departmentId,
        );
      }

      return {
        success: true,
        data: responses,
      };
    } catch (error) {
      log.error("Failed to export", error);
      return {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          status: 500,
          message: (error as Error).message,
        },
      };
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  /**
   * Clear all data (for testing)
   */
  clearAll(): void {
    cannedResponses.clear();
    usageHistory.length = 0;
    this.initializeDefaults();
    log.debug("Canned responses service cleared");
  }

  /**
   * Get store size (for debugging)
   */
  getStoreSize(): number {
    return cannedResponses.size;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let cannedResponsesServiceInstance: CannedResponsesService | null = null;

/**
 * Get or create the canned responses service singleton
 */
export function getCannedResponsesService(): CannedResponsesService {
  if (!cannedResponsesServiceInstance) {
    cannedResponsesServiceInstance = new CannedResponsesService();
  }
  return cannedResponsesServiceInstance;
}

/**
 * Create a new canned responses service instance (for testing)
 */
export function createCannedResponsesService(): CannedResponsesService {
  return new CannedResponsesService();
}

/**
 * Reset the singleton instance (for testing)
 */
export function resetCannedResponsesService(): void {
  if (cannedResponsesServiceInstance) {
    cannedResponsesServiceInstance.clearAll();
  }
  cannedResponsesServiceInstance = null;
}

export default CannedResponsesService;
