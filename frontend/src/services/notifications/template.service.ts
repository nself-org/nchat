/**
 * Notification Template Service - Manage notification templates
 *
 * Provides access to notification templates from the plugin API.
 */

import { logger } from "@/lib/logger";
import {
  NotificationTemplate,
  NotificationPluginConfig,
  defaultNotificationConfig,
  TemplateVariables,
} from "@/types/notifications";

// =============================================================================
// Types
// =============================================================================

export interface TemplateServiceOptions {
  config?: Partial<NotificationPluginConfig>;
  getAuthToken?: () => Promise<string | null>;
}

export interface RenderedTemplate {
  subject?: string;
  body_text?: string;
  body_html?: string;
  push_title?: string;
  push_body?: string;
  sms_body?: string;
}

// =============================================================================
// Default nchat Templates
// =============================================================================

export const NCHAT_TEMPLATES = {
  // New message notification
  nchat_new_message: {
    name: "nchat_new_message",
    category: "transactional" as const,
    channels: ["email", "push"] as const,
    subject: "New message from {{actor_name}} in #{{channel_name}}",
    body_text:
      '{{actor_name}} sent a message in #{{channel_name}}: "{{message_preview}}"',
    body_html: `
      <p><strong>{{actor_name}}</strong> sent a message in <strong>#{{channel_name}}</strong>:</p>
      <blockquote>{{message_preview}}</blockquote>
      <p><a href="{{action_url}}">View message</a></p>
    `,
    push_title: "{{actor_name}} in #{{channel_name}}",
    push_body: "{{message_preview}}",
    variables: ["actor_name", "channel_name", "message_preview", "action_url"],
  },

  // Mention notification
  nchat_mention: {
    name: "nchat_mention",
    category: "transactional" as const,
    channels: ["email", "push"] as const,
    subject: "{{actor_name}} mentioned you in #{{channel_name}}",
    body_text:
      '{{actor_name}} mentioned you in #{{channel_name}}: "{{message_preview}}"',
    body_html: `
      <p><strong>{{actor_name}}</strong> mentioned you in <strong>#{{channel_name}}</strong>:</p>
      <blockquote>{{message_preview}}</blockquote>
      <p><a href="{{action_url}}">View mention</a></p>
    `,
    push_title: "{{actor_name}} mentioned you",
    push_body: "in #{{channel_name}}: {{message_preview}}",
    variables: ["actor_name", "channel_name", "message_preview", "action_url"],
  },

  // Reaction notification
  nchat_reaction: {
    name: "nchat_reaction",
    category: "transactional" as const,
    channels: ["push"] as const,
    push_title: "{{actor_name}} reacted {{emoji}}",
    push_body: "to your message in #{{channel_name}}",
    variables: ["actor_name", "emoji", "channel_name", "action_url"],
  },

  // Thread reply notification
  nchat_thread_reply: {
    name: "nchat_thread_reply",
    category: "transactional" as const,
    channels: ["email", "push"] as const,
    subject: "{{actor_name}} replied to your thread",
    body_text:
      '{{actor_name}} replied to your thread in #{{channel_name}}: "{{message_preview}}"',
    body_html: `
      <p><strong>{{actor_name}}</strong> replied to your thread in <strong>#{{channel_name}}</strong>:</p>
      <blockquote>{{message_preview}}</blockquote>
      <p><a href="{{action_url}}">View thread</a></p>
    `,
    push_title: "{{actor_name}} replied to your thread",
    push_body: "{{message_preview}}",
    variables: ["actor_name", "channel_name", "message_preview", "action_url"],
  },

  // Direct message notification
  nchat_direct_message: {
    name: "nchat_direct_message",
    category: "transactional" as const,
    channels: ["email", "push"] as const,
    subject: "New message from {{actor_name}}",
    body_text:
      '{{actor_name}} sent you a direct message: "{{message_preview}}"',
    body_html: `
      <p><strong>{{actor_name}}</strong> sent you a direct message:</p>
      <blockquote>{{message_preview}}</blockquote>
      <p><a href="{{action_url}}">Reply</a></p>
    `,
    push_title: "{{actor_name}}",
    push_body: "{{message_preview}}",
    variables: ["actor_name", "message_preview", "action_url"],
  },

  // Channel invite notification
  nchat_channel_invite: {
    name: "nchat_channel_invite",
    category: "transactional" as const,
    channels: ["email", "push"] as const,
    subject: "{{actor_name}} invited you to #{{channel_name}}",
    body_text:
      "{{actor_name}} invited you to join the channel #{{channel_name}}.",
    body_html: `
      <p><strong>{{actor_name}}</strong> invited you to join <strong>#{{channel_name}}</strong>.</p>
      <p><a href="{{action_url}}">Accept invitation</a></p>
    `,
    push_title: "Channel invitation",
    push_body: "{{actor_name}} invited you to #{{channel_name}}",
    variables: ["actor_name", "channel_name", "action_url"],
  },

  // Channel join notification
  nchat_channel_join: {
    name: "nchat_channel_join",
    category: "system" as const,
    channels: ["push"] as const,
    push_title: "New member",
    push_body: "{{actor_name}} joined #{{channel_name}}",
    variables: ["actor_name", "channel_name"],
  },

  // Channel leave notification
  nchat_channel_leave: {
    name: "nchat_channel_leave",
    category: "system" as const,
    channels: ["push"] as const,
    push_title: "Member left",
    push_body: "{{actor_name}} left #{{channel_name}}",
    variables: ["actor_name", "channel_name"],
  },

  // Reminder notification
  nchat_reminder: {
    name: "nchat_reminder",
    category: "alert" as const,
    channels: ["email", "push"] as const,
    subject: "Reminder: {{reminder_title}}",
    body_text: "Your reminder is due: {{reminder_title}}",
    body_html: `
      <p>Your reminder is due:</p>
      <h3>{{reminder_title}}</h3>
      {{#if reminder_description}}<p>{{reminder_description}}</p>{{/if}}
      <p><a href="{{action_url}}">View details</a></p>
    `,
    push_title: "Reminder",
    push_body: "{{reminder_title}}",
    variables: ["reminder_title", "reminder_description", "action_url"],
  },

  // Announcement notification
  nchat_announcement: {
    name: "nchat_announcement",
    category: "system" as const,
    channels: ["email", "push"] as const,
    subject: "Announcement: {{announcement_title}}",
    body_text: "{{announcement_title}}: {{announcement_body}}",
    body_html: `
      <h2>{{announcement_title}}</h2>
      <p>{{announcement_body}}</p>
      {{#if action_url}}<p><a href="{{action_url}}">Learn more</a></p>{{/if}}
    `,
    push_title: "{{announcement_title}}",
    push_body: "{{announcement_body}}",
    variables: ["announcement_title", "announcement_body", "action_url"],
  },
};

// =============================================================================
// Simple Template Engine
// =============================================================================

/**
 * Simple Handlebars-like template rendering for client-side use
 */
export function renderTemplate(
  template: string,
  variables: TemplateVariables,
): string {
  let result = template;

  // Handle simple variable substitution: {{variable_name}}
  result = result.replace(/\{\{([^{}]+)\}\}/g, (match, key) => {
    const trimmedKey = key.trim();

    // Handle conditional helpers: {{#if variable}}...{{/if}}
    if (trimmedKey.startsWith("#if ") || trimmedKey.startsWith("/if")) {
      return match; // Handle separately below
    }

    const value = variables[trimmedKey];
    return value !== undefined && value !== null ? String(value) : "";
  });

  // Handle simple conditionals: {{#if variable}}content{{/if}}
  result = result.replace(
    /\{\{#if\s+([^}]+)\}\}([\s\S]*?)\{\{\/if\}\}/g,
    (match, variable, content) => {
      const value = variables[variable.trim()];
      return value ? content : "";
    },
  );

  // Clean up any remaining curly braces
  result = result.replace(/\{\{[^}]*\}\}/g, "");

  return result.trim();
}

// =============================================================================
// Template Service
// =============================================================================

export class TemplateService {
  private config: NotificationPluginConfig;
  private getAuthToken?: () => Promise<string | null>;
  private cache: Map<
    string,
    { templates: NotificationTemplate[]; expiresAt: number }
  > = new Map();
  private cacheTimeout = 10 * 60 * 1000; // 10 minutes

  constructor(options: TemplateServiceOptions = {}) {
    this.config = { ...defaultNotificationConfig, ...options.config };
    this.getAuthToken = options.getAuthToken;
  }

  /**
   * Get request headers with optional auth token
   */
  private async getHeaders(): Promise<HeadersInit> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };

    if (this.getAuthToken) {
      const token = await this.getAuthToken();
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }

    return headers;
  }

  /**
   * Make API request
   */
  private async request<T>(
    method: string,
    endpoint: string,
    body?: unknown,
  ): Promise<T> {
    const url = `${this.config.apiUrl}${endpoint}`;
    const headers = await this.getHeaders();

    const response = await fetch(url, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    return response.json();
  }

  /**
   * List all available templates
   */
  async listTemplates(forceRefresh = false): Promise<NotificationTemplate[]> {
    // Check cache first
    const cacheKey = "all";
    if (!forceRefresh) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.templates;
      }
    }

    try {
      const response = await this.request<{
        templates: NotificationTemplate[];
      }>("GET", "/api/templates");

      // Cache the result
      this.cache.set(cacheKey, {
        templates: response.templates,
        expiresAt: Date.now() + this.cacheTimeout,
      });

      return response.templates;
    } catch (error) {
      logger.warn("Failed to fetch templates:", {
        error: error instanceof Error ? error.message : String(error),
      });
      // Return default nchat templates on error
      return this.getDefaultTemplates();
    }
  }

  /**
   * Get a specific template by name
   */
  async getTemplate(name: string): Promise<NotificationTemplate | null> {
    try {
      const response = await this.request<{ template: NotificationTemplate }>(
        "GET",
        `/api/templates/${name}`,
      );
      return response.template;
    } catch (error) {
      // Check default templates
      const defaultTemplate =
        NCHAT_TEMPLATES[name as keyof typeof NCHAT_TEMPLATES];
      if (defaultTemplate) {
        return {
          id: name,
          ...defaultTemplate,
          metadata: {},
          active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as unknown as NotificationTemplate;
      }

      return null;
    }
  }

  /**
   * Render a template with variables (client-side)
   */
  render(
    template: NotificationTemplate,
    variables: TemplateVariables,
  ): RenderedTemplate {
    const result: RenderedTemplate = {};

    if (template.subject) {
      result.subject = renderTemplate(template.subject, variables);
    }

    if (template.body_text) {
      result.body_text = renderTemplate(template.body_text, variables);
    }

    if (template.body_html) {
      result.body_html = renderTemplate(template.body_html, variables);
    }

    if (template.push_title) {
      result.push_title = renderTemplate(template.push_title, variables);
    }

    if (template.push_body) {
      result.push_body = renderTemplate(template.push_body, variables);
    }

    if (template.sms_body) {
      result.sms_body = renderTemplate(template.sms_body, variables);
    }

    return result;
  }

  /**
   * Render a template by name
   */
  async renderByName(
    templateName: string,
    variables: TemplateVariables,
  ): Promise<RenderedTemplate | null> {
    const template = await this.getTemplate(templateName);
    if (!template) {
      return null;
    }

    return this.render(template, variables);
  }

  /**
   * Get default nchat templates
   */
  getDefaultTemplates(): NotificationTemplate[] {
    return Object.entries(NCHAT_TEMPLATES).map(([name, template]) => ({
      id: name,
      ...template,
      channels:
        template.channels as unknown as NotificationTemplate["channels"],
      metadata: {},
      active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })) as unknown as NotificationTemplate[];
  }

  /**
   * Get template variables for a specific template
   */
  getTemplateVariables(templateName: string): string[] {
    const template =
      NCHAT_TEMPLATES[templateName as keyof typeof NCHAT_TEMPLATES];
    return template?.variables || [];
  }

  /**
   * Preview a template with sample variables
   */
  previewTemplate(
    templateName: string,
    sampleVariables?: TemplateVariables,
  ): RenderedTemplate | null {
    const template =
      NCHAT_TEMPLATES[templateName as keyof typeof NCHAT_TEMPLATES];
    if (!template) {
      return null;
    }

    // Generate sample variables if not provided
    const variables = sampleVariables || {
      actor_name: "John Doe",
      channel_name: "general",
      message_preview: "Hello everyone! This is a sample message.",
      action_url: "https://example.com/chat",
      emoji: "123",
      reminder_title: "Team meeting",
      reminder_description: "Weekly sync call",
      announcement_title: "New Feature Released",
      announcement_body: "We have released a new feature!",
    };

    return this.render(
      {
        id: templateName,
        ...template,
        channels:
          template.channels as unknown as NotificationTemplate["channels"],
        metadata: {},
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      } as unknown as NotificationTemplate,
      variables,
    );
  }

  /**
   * Clear template cache
   */
  clearCache(): void {
    this.cache.clear();
  }
}

// =============================================================================
// Singleton Instance
// =============================================================================

let templateServiceInstance: TemplateService | null = null;

export function getTemplateService(
  options?: TemplateServiceOptions,
): TemplateService {
  if (!templateServiceInstance) {
    templateServiceInstance = new TemplateService(options);
  }
  return templateServiceInstance;
}

export function resetTemplateService(): void {
  templateServiceInstance = null;
}
