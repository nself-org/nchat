/**
 * TemplateService Tests
 */

import {
  TemplateService,
  getTemplateService,
  resetTemplateService,
  renderTemplate,
  NCHAT_TEMPLATES,
} from "../template.service";

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe("TemplateService", () => {
  let service: TemplateService;

  beforeEach(() => {
    jest.clearAllMocks();
    resetTemplateService();
    service = new TemplateService({
      config: {
        apiUrl: "http://localhost:3102",
        emailEnabled: true,
        pushEnabled: true,
        smsEnabled: false,
        defaultCategory: "transactional",
        retry: { maxAttempts: 1, delayMs: 100 },
      },
    });
  });

  describe("renderTemplate", () => {
    it("should render simple variables", () => {
      const result = renderTemplate("Hello, {{name}}!", { name: "John" });
      expect(result).toBe("Hello, John!");
    });

    it("should render multiple variables", () => {
      const result = renderTemplate(
        "{{greeting}}, {{name}}! Welcome to {{channel}}.",
        {
          greeting: "Hello",
          name: "John",
          channel: "general",
        },
      );
      expect(result).toBe("Hello, John! Welcome to general.");
    });

    it("should handle missing variables", () => {
      const result = renderTemplate("Hello, {{name}}!", {});
      expect(result).toBe("Hello, !");
    });

    it("should handle conditional blocks", () => {
      const template = "{{#if show}}Visible{{/if}}";

      expect(renderTemplate(template, { show: true })).toBe("Visible");
      expect(renderTemplate(template, { show: false })).toBe("");
      expect(renderTemplate(template, {})).toBe("");
    });

    it("should handle whitespace", () => {
      const result = renderTemplate("  {{ name }}  ", { name: "John" });
      expect(result).toBe("John");
    });
  });

  describe("listTemplates", () => {
    it("should fetch templates from API", async () => {
      const mockTemplates = [
        { id: "1", name: "template1" },
        { id: "2", name: "template2" },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      const result = await service.listTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockFetch).toHaveBeenCalledWith(
        "http://localhost:3102/api/templates",
        expect.objectContaining({ method: "GET" }),
      );
    });

    it("should return default templates on error", async () => {
      mockFetch.mockRejectedValueOnce(new Error("Network error"));

      const result = await service.listTemplates();

      expect(result.length).toBeGreaterThan(0);
      expect(result.some((t) => t.name === "nchat_new_message")).toBe(true);
    });

    it("should cache templates", async () => {
      const mockTemplates = [{ id: "1", name: "template1" }];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      await service.listTemplates();
      await service.listTemplates();

      // Should only fetch once due to caching
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should force refresh cache", async () => {
      const mockTemplates = [{ id: "1", name: "template1" }];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      await service.listTemplates();
      await service.listTemplates(true);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("getTemplate", () => {
    it("should fetch template by name", async () => {
      const mockTemplate = { id: "1", name: "test_template", subject: "Test" };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ template: mockTemplate }),
      });

      const result = await service.getTemplate("test_template");

      expect(result).toEqual(mockTemplate);
    });

    it("should return default template if not found in API", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Not found",
      });

      const result = await service.getTemplate("nchat_new_message");

      expect(result).toBeTruthy();
      expect(result?.name).toBe("nchat_new_message");
    });

    it("should return null for unknown template", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Not found",
      });

      const result = await service.getTemplate("unknown_template");

      expect(result).toBeNull();
    });
  });

  describe("render", () => {
    it("should render template with variables", () => {
      const template = {
        id: "1",
        name: "test",
        category: "transactional" as const,
        channels: ["email" as const],
        subject: "Hello {{name}}",
        body_text: "Welcome, {{name}}!",
        body_html: "<p>Welcome, {{name}}!</p>",
        push_title: "Hi {{name}}",
        push_body: "You have a message",
        metadata: {},
        variables: ["name"],
        active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const result = service.render(template, { name: "John" });

      expect(result.subject).toBe("Hello John");
      expect(result.body_text).toBe("Welcome, John!");
      expect(result.body_html).toBe("<p>Welcome, John!</p>");
      expect(result.push_title).toBe("Hi John");
      expect(result.push_body).toBe("You have a message");
    });
  });

  describe("renderByName", () => {
    it("should render template by name", async () => {
      const mockTemplate = {
        id: "1",
        name: "test",
        subject: "Hello {{name}}",
        body_text: "Welcome, {{name}}!",
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ template: mockTemplate }),
      });

      const result = await service.renderByName("test", { name: "John" });

      expect(result?.subject).toBe("Hello John");
      expect(result?.body_text).toBe("Welcome, John!");
    });

    it("should return null for unknown template", async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        text: async () => "Not found",
      });

      const result = await service.renderByName("unknown", {});

      expect(result).toBeNull();
    });
  });

  describe("getDefaultTemplates", () => {
    it("should return all default templates", () => {
      const templates = service.getDefaultTemplates();

      expect(templates.length).toBe(Object.keys(NCHAT_TEMPLATES).length);
      expect(templates.every((t) => t.id && t.name)).toBe(true);
    });
  });

  describe("getTemplateVariables", () => {
    it("should return variables for known template", () => {
      const variables = service.getTemplateVariables("nchat_new_message");

      expect(variables).toContain("actor_name");
      expect(variables).toContain("channel_name");
    });

    it("should return empty array for unknown template", () => {
      const variables = service.getTemplateVariables("unknown");

      expect(variables).toEqual([]);
    });
  });

  describe("previewTemplate", () => {
    it("should preview template with sample data", () => {
      const preview = service.previewTemplate("nchat_new_message");

      expect(preview).toBeTruthy();
      expect(preview?.subject).toContain("John Doe");
      expect(preview?.push_body).toContain("Hello everyone");
    });

    it("should preview with custom variables", () => {
      const preview = service.previewTemplate("nchat_new_message", {
        actor_name: "Alice",
        channel_name: "random",
        message_preview: "Custom message",
      });

      expect(preview).toBeTruthy();
      expect(preview?.subject).toContain("Alice");
      expect(preview?.subject).toContain("random");
    });

    it("should return null for unknown template", () => {
      const preview = service.previewTemplate("unknown");

      expect(preview).toBeNull();
    });
  });

  describe("clearCache", () => {
    it("should clear template cache", async () => {
      const mockTemplates = [{ id: "1", name: "template1" }];

      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ templates: mockTemplates }),
      });

      await service.listTemplates();
      service.clearCache();
      await service.listTemplates();

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });

  describe("singleton", () => {
    it("should return same instance", () => {
      const instance1 = getTemplateService();
      const instance2 = getTemplateService();

      expect(instance1).toBe(instance2);
    });

    it("should reset instance", () => {
      const instance1 = getTemplateService();
      resetTemplateService();
      const instance2 = getTemplateService();

      expect(instance1).not.toBe(instance2);
    });
  });
});

describe("NCHAT_TEMPLATES", () => {
  it("should have all required templates", () => {
    const requiredTemplates = [
      "nchat_new_message",
      "nchat_mention",
      "nchat_reaction",
      "nchat_thread_reply",
      "nchat_direct_message",
      "nchat_channel_invite",
      "nchat_channel_join",
      "nchat_channel_leave",
      "nchat_reminder",
      "nchat_announcement",
    ];

    requiredTemplates.forEach((name) => {
      expect(
        NCHAT_TEMPLATES[name as keyof typeof NCHAT_TEMPLATES],
      ).toBeDefined();
    });
  });

  it("should have valid template structure", () => {
    Object.values(NCHAT_TEMPLATES).forEach((template) => {
      expect(template.name).toBeTruthy();
      expect(template.category).toBeTruthy();
      expect(template.channels.length).toBeGreaterThan(0);
      expect(template.variables).toBeInstanceOf(Array);
    });
  });
});
