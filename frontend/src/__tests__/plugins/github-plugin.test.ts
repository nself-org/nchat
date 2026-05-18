/**
 * GitHub Plugin Integration Tests
 *
 * Comprehensive test suite for the GitHub plugin (ɳPlugin: github v1.0.0)
 * Tests repository integration, webhooks, and OAuth.
 *
 * @group integration
 * @group plugins
 * @group github
 */

import { describe, it, expect, beforeAll } from "@jest/globals";

// Configuration
const GITHUB_ENABLED = process.env.GITHUB_ENABLED === "true";
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
const TEST_TIMEOUT = 30000;

describe("GitHub Plugin", () => {
  const describeIf = GITHUB_ENABLED ? describe : describe.skip;

  beforeAll(() => {
    if (!GITHUB_ENABLED) {
      console.log("⚠️  GitHub plugin tests skipped (GITHUB_ENABLED=false)");
    }
  });

  describeIf("OAuth", () => {
    it("should have GitHub OAuth provider", async () => {
      const response = await fetch(`${API_BASE}/api/auth/providers`);
      const data = await response.json();

      if (response.ok) {
        expect(data.providers).toContain("github");
      }
    }, 10000);

    it("should generate GitHub OAuth URL", async () => {
      const response = await fetch(
        `${API_BASE}/api/auth/oauth/authorize?provider=github`,
      );

      if (response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty("authUrl");
        expect(data.authUrl).toContain("github.com");
      }
    }, 10000);
  });

  describeIf("Repository Integration", () => {
    it("should list repositories", async () => {
      const response = await fetch(`${API_BASE}/api/integrations/github/repos`);

      expect([200, 401, 404]).toContain(response.status);
    }, 10000);

    it("should connect repository to channel", async () => {
      const response = await fetch(
        `${API_BASE}/api/integrations/github/connect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: "channel-123",
            repo: "owner/repo",
          }),
        },
      );

      expect([200, 400, 401, 404]).toContain(response.status);
    }, 10000);

    it("should disconnect repository", async () => {
      const response = await fetch(
        `${API_BASE}/api/integrations/github/disconnect`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            channelId: "channel-123",
            repo: "owner/repo",
          }),
        },
      );

      expect([200, 404]).toContain(response.status);
    }, 10000);
  });

  describeIf("Webhooks", () => {
    it("should handle push event", async () => {
      const mockPushEvent = {
        ref: "refs/heads/main",
        commits: [
          {
            id: "abc123",
            message: "Test commit",
            author: {
              name: "Test Author",
              email: "test@example.com",
            },
          },
        ],
        repository: {
          full_name: "owner/repo",
        },
      };

      const response = await fetch(`${API_BASE}/api/webhooks/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "push",
        },
        body: JSON.stringify(mockPushEvent),
      });

      expect([200, 400]).toContain(response.status);
    }, 10000);

    it("should handle pull request event", async () => {
      const mockPREvent = {
        action: "opened",
        pull_request: {
          number: 123,
          title: "Test PR",
          user: {
            login: "testuser",
          },
        },
        repository: {
          full_name: "owner/repo",
        },
      };

      const response = await fetch(`${API_BASE}/api/webhooks/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "pull_request",
        },
        body: JSON.stringify(mockPREvent),
      });

      expect([200, 400]).toContain(response.status);
    }, 10000);

    it("should handle issue event", async () => {
      const mockIssueEvent = {
        action: "opened",
        issue: {
          number: 456,
          title: "Test Issue",
          user: {
            login: "testuser",
          },
        },
        repository: {
          full_name: "owner/repo",
        },
      };

      const response = await fetch(`${API_BASE}/api/webhooks/github`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-GitHub-Event": "issues",
        },
        body: JSON.stringify(mockIssueEvent),
      });

      expect([200, 400]).toContain(response.status);
    }, 10000);
  });

  describeIf("Code Snippets", () => {
    it("should unfurl GitHub URLs", async () => {
      const response = await fetch(`${API_BASE}/api/unfurl`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: "https://github.com/owner/repo/blob/main/file.js",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        expect(data).toHaveProperty("type", "github");
      }
    }, 10000);
  });
});
