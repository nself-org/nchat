/**
 * Jira Client Tests
 *
 * Comprehensive tests for the Jira integration client including
 * OAuth flow, issue operations, and utility functions.
 */

import {
  JiraApiClient,
  JiraApiError,
  JiraIntegrationProvider,
  createJiraProvider,
  extractJiraIssueKey,
  containsJiraIssueKey,
  extractAllJiraIssueKeys,
  JIRA_AUTH_URL,
  JIRA_TOKEN_URL,
  JIRA_RESOURCES_URL,
  JIRA_DEFAULT_SCOPES,
} from "../jira-client";
import type {
  IntegrationCredentials,
  JiraUser,
  JiraProject,
  JiraIssue,
} from "../../types";

// ============================================================================
// Mock Setup
// ============================================================================

const mockFetch = jest.fn();
global.fetch = mockFetch;

const createMockResponse = (data: unknown, ok = true, status = 200) => ({
  ok,
  status,
  json: jest.fn().mockResolvedValue(data),
});

// ============================================================================
// Test Data
// ============================================================================

const mockJiraUser: JiraUser = {
  accountId: "abc123",
  displayName: "Test User",
  emailAddress: "test@example.com",
  avatarUrls: {
    "48x48": "https://avatar.atlassian.com/48",
    "24x24": "https://avatar.atlassian.com/24",
    "16x16": "https://avatar.atlassian.com/16",
  },
  active: true,
};

const mockJiraProject: JiraProject = {
  id: "10000",
  key: "TEST",
  name: "Test Project",
  description: "A test project",
  avatarUrls: {
    "48x48": "https://avatar.atlassian.com/project/48",
  },
  projectTypeKey: "software",
};

const mockJiraIssue: JiraIssue = {
  id: "10001",
  key: "TEST-123",
  self: "https://test.atlassian.net/rest/api/3/issue/10001",
  fields: {
    summary: "Test Issue Summary",
    description: "Test issue description",
    issuetype: {
      id: "10001",
      name: "Bug",
      description: "A bug",
      iconUrl: "https://...",
      subtask: false,
    },
    project: mockJiraProject,
    status: {
      id: "1",
      name: "Open",
      statusCategory: {
        id: 2,
        key: "new",
        colorName: "blue-gray",
        name: "To Do",
      },
    },
    priority: {
      id: "3",
      name: "Medium",
      iconUrl: "https://...",
    },
    assignee: mockJiraUser,
    reporter: mockJiraUser,
    created: "2024-01-01T00:00:00.000Z",
    updated: "2024-01-01T00:00:00.000Z",
    labels: ["bug", "urgent"],
  },
};

const mockCredentials: IntegrationCredentials = {
  accessToken: "test-jira-token",
  refreshToken: "test-refresh-token",
  expiresAt: new Date(Date.now() + 3600000).toISOString(),
  tokenType: "Bearer",
  scope: "read:jira-work write:jira-work",
};

const mockClientConfig = {
  clientId: "test-client-id",
  clientSecret: "test-client-secret",
  redirectUri: "https://app.example.com/integrations/callback",
};

const mockCloudId = "test-cloud-id-123";

// ============================================================================
// JiraApiClient Tests
// ============================================================================

describe("JiraApiClient", () => {
  let client: JiraApiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new JiraApiClient("test-token", mockCloudId);
  });

  describe("get", () => {
    it("should make authenticated GET request", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockJiraUser));

      await client.get("/myself");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining(`/ex/jira/${mockCloudId}/rest/api/3/myself`),
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        }),
      );
    });

    it("should include query parameters", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({ values: [] }));

      await client.get("/search", { jql: "project = TEST", maxResults: "50" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("jql=project"),
        expect.anything(),
      );
    });

    it("should throw JiraApiError on API error", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ message: "Issue not found" }, false, 404),
      );

      await expect(client.get("/issue/TEST-999")).rejects.toThrow(JiraApiError);
    });
  });

  describe("post", () => {
    it("should make authenticated POST request", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockJiraIssue));

      await client.post("/issue", { fields: { summary: "Test" } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });
  });

  describe("put", () => {
    it("should make authenticated PUT request", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, true, 204));

      await client.put("/issue/TEST-123", { fields: { summary: "Updated" } });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });

  describe("getCurrentUser", () => {
    it("should get current user", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockJiraUser));

      const user = await client.getCurrentUser();

      expect(user.displayName).toBe("Test User");
    });
  });

  describe("searchUsers", () => {
    it("should search users", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse([mockJiraUser]));

      const users = await client.searchUsers("test");

      expect(users).toHaveLength(1);
    });
  });

  describe("getProjects", () => {
    it("should get projects", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ values: [mockJiraProject] }),
      );

      const projects = await client.getProjects();

      expect(projects).toHaveLength(1);
      expect(projects[0].key).toBe("TEST");
    });
  });

  describe("getProject", () => {
    it("should get project by key", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockJiraProject));

      const project = await client.getProject("TEST");

      expect(project.key).toBe("TEST");
    });
  });

  describe("getIssue", () => {
    it("should get issue by key", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockJiraIssue));

      const issue = await client.getIssue("TEST-123");

      expect(issue.key).toBe("TEST-123");
      expect(issue.fields.summary).toBe("Test Issue Summary");
    });
  });

  describe("searchIssues", () => {
    it("should search issues using JQL", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          issues: [mockJiraIssue],
          total: 1,
          startAt: 0,
          maxResults: 50,
        }),
      );

      const result = await client.searchIssues("project = TEST");

      expect(result.issues).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it("should pass pagination options", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          issues: [],
          total: 0,
          startAt: 10,
          maxResults: 25,
        }),
      );

      await client.searchIssues("project = TEST", {
        startAt: 10,
        maxResults: 25,
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("startAt=10"),
        expect.anything(),
      );
    });
  });

  describe("createIssue", () => {
    it("should create issue", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockJiraIssue));

      const issue = await client.createIssue({
        projectKey: "TEST",
        issueType: "Bug",
        summary: "New bug",
        description: "Bug description",
      });

      expect(issue.key).toBe("TEST-123");
    });

    it("should include optional fields", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse(mockJiraIssue));

      await client.createIssue({
        projectKey: "TEST",
        issueType: "Bug",
        summary: "New bug",
        priority: "High",
        assignee: "user-123",
        labels: ["urgent"],
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: expect.stringContaining("priority"),
        }),
      );
    });
  });

  describe("transitionIssue", () => {
    it("should transition issue", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await client.transitionIssue("TEST-123", "21");

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/issue/TEST-123/transitions"),
        expect.anything(),
      );
    });
  });

  describe("getTransitions", () => {
    it("should get available transitions", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          transitions: [
            {
              id: "21",
              name: "In Progress",
              to: { id: "3", name: "In Progress", statusCategory: {} },
            },
          ],
        }),
      );

      const transitions = await client.getTransitions("TEST-123");

      expect(transitions).toHaveLength(1);
      expect(transitions[0].name).toBe("In Progress");
    });
  });

  describe("addComment", () => {
    it("should add comment to issue", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          id: "10001",
          body: {},
          created: "2024-01-01",
          author: mockJiraUser,
        }),
      );

      const comment = await client.addComment("TEST-123", "Test comment");

      expect(comment.id).toBe("10001");
    });
  });

  describe("updateIssue", () => {
    it("should update issue", async () => {
      mockFetch.mockResolvedValueOnce(createMockResponse({}, true, 204));

      await client.updateIssue("TEST-123", { summary: "Updated summary" });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining("/issue/TEST-123"),
        expect.objectContaining({ method: "PUT" }),
      );
    });
  });
});

// ============================================================================
// JiraApiError Tests
// ============================================================================

describe("JiraApiError", () => {
  it("should create error with status code and endpoint", () => {
    const error = new JiraApiError("Issue not found", 404, "/issue/TEST-999");

    expect(error.name).toBe("JiraApiError");
    expect(error.statusCode).toBe(404);
    expect(error.endpoint).toBe("/issue/TEST-999");
    expect(error.message).toContain("Issue not found");
  });
});

// ============================================================================
// Utility Functions Tests
// ============================================================================

describe("Jira URL/Key Utilities", () => {
  describe("extractJiraIssueKey", () => {
    it("should extract issue key from text", () => {
      expect(extractJiraIssueKey("Check out TEST-123 for details")).toBe(
        "TEST-123",
      );
      expect(extractJiraIssueKey("Working on PROJ-1")).toBe("PROJ-1");
      expect(extractJiraIssueKey("ABC-99999")).toBe("ABC-99999");
    });

    it("should extract from URL", () => {
      expect(
        extractJiraIssueKey("https://test.atlassian.net/browse/TEST-123"),
      ).toBe("TEST-123");
    });

    it("should return null for no match", () => {
      expect(extractJiraIssueKey("no issue key here")).toBeNull();
      expect(extractJiraIssueKey("123-TEST")).toBeNull(); // Wrong format
    });
  });

  describe("containsJiraIssueKey", () => {
    it("should return true for text with issue key", () => {
      expect(containsJiraIssueKey("See TEST-123")).toBe(true);
    });

    it("should return false for text without issue key", () => {
      expect(containsJiraIssueKey("no key here")).toBe(false);
    });
  });

  describe("extractAllJiraIssueKeys", () => {
    it("should extract all issue keys", () => {
      const keys = extractAllJiraIssueKeys(
        "Check TEST-123 and PROJ-456, also TEST-789",
      );
      expect(keys).toContain("TEST-123");
      expect(keys).toContain("PROJ-456");
      expect(keys).toContain("TEST-789");
    });

    it("should deduplicate keys", () => {
      const keys = extractAllJiraIssueKeys("TEST-123 and TEST-123 again");
      expect(keys).toHaveLength(1);
    });

    it("should return empty array for no matches", () => {
      expect(extractAllJiraIssueKeys("no keys")).toEqual([]);
    });
  });
});

// ============================================================================
// JiraIntegrationProvider Tests
// ============================================================================

describe("JiraIntegrationProvider", () => {
  let provider: JiraIntegrationProvider;

  beforeEach(() => {
    jest.clearAllMocks();
    provider = new JiraIntegrationProvider(mockClientConfig);
  });

  describe("constructor", () => {
    it("should create provider with default scopes", () => {
      expect(provider.scopes).toEqual(JIRA_DEFAULT_SCOPES);
    });

    it("should use custom scopes if provided", () => {
      const customProvider = new JiraIntegrationProvider({
        ...mockClientConfig,
        scopes: ["read:jira-work"],
      });

      expect(customProvider.scopes).toEqual(["read:jira-work"]);
    });
  });

  describe("properties", () => {
    it("should have correct id", () => {
      expect(provider.id).toBe("jira");
    });

    it("should have correct name", () => {
      expect(provider.name).toBe("Jira");
    });

    it("should have correct category", () => {
      expect(provider.category).toBe("productivity");
    });
  });

  describe("getAuthUrl", () => {
    it("should return correct auth URL", () => {
      const url = provider.getAuthUrl({ state: "test-state" });

      expect(url).toContain(JIRA_AUTH_URL);
      expect(url).toContain("client_id=test-client-id");
      expect(url).toContain("state=test-state");
      expect(url).toContain("audience=api.atlassian.com");
    });
  });

  describe("handleCallback", () => {
    it("should exchange code for tokens and get cloud ID", async () => {
      // Token exchange
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          access_token: "new-token",
          refresh_token: "new-refresh",
          expires_in: 3600,
          token_type: "Bearer",
        }),
      );
      // Accessible resources
      mockFetch.mockResolvedValueOnce(
        createMockResponse([
          {
            id: mockCloudId,
            url: "https://test.atlassian.net",
            name: "Test",
            scopes: [],
          },
        ]),
      );

      const credentials = await provider.handleCallback({
        code: "test-code",
        state: "test-state",
      });

      expect(credentials.accessToken).toBe("new-token");
      expect(provider.getCloudId()).toBe(mockCloudId);
    });

    it("should throw error on missing code", async () => {
      await expect(
        provider.handleCallback({ code: "", state: "test" }),
      ).rejects.toThrow("Missing authorization code");
    });

    it("should throw error when no accessible sites", async () => {
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ access_token: "token" }))
        .mockResolvedValueOnce(createMockResponse([]));

      await expect(
        provider.handleCallback({ code: "test", state: "test" }),
      ).rejects.toThrow("No accessible Jira sites found");
    });
  });

  describe("refreshToken", () => {
    it("should refresh token", async () => {
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          access_token: "new-access-token",
          refresh_token: "new-refresh-token",
          expires_in: 3600,
        }),
      );

      const newCredentials = await provider.refreshToken(mockCredentials);

      expect(newCredentials.accessToken).toBe("new-access-token");
    });

    it("should throw error without refresh token", async () => {
      await expect(
        provider.refreshToken({ accessToken: "test" }),
      ).rejects.toThrow("No refresh token available");
    });
  });

  describe("getStatus", () => {
    it("should return disconnected status without client", async () => {
      const status = await provider.getStatus();

      expect(status.status).toBe("disconnected");
    });

    it("should return connected status with valid client", async () => {
      // Setup connection
      mockFetch
        .mockResolvedValueOnce(createMockResponse({ access_token: "token" }))
        .mockResolvedValueOnce(
          createMockResponse([{ id: mockCloudId, url: "", name: "" }]),
        );

      await provider.handleCallback({ code: "test", state: "test" });

      mockFetch.mockResolvedValueOnce(createMockResponse(mockJiraUser));
      const status = await provider.getStatus();

      expect(status.status).toBe("connected");
      expect(status.config.user).toBe("Test User");
    });
  });

  describe("validateCredentials", () => {
    it("should return false without cloud ID", async () => {
      const isValid = await provider.validateCredentials(mockCredentials);
      expect(isValid).toBe(false);
    });

    it("should return true for valid credentials", async () => {
      provider.setCloudId(mockCloudId);
      mockFetch.mockResolvedValueOnce(createMockResponse(mockJiraUser));

      const isValid = await provider.validateCredentials(mockCredentials);
      expect(isValid).toBe(true);
    });
  });

  describe("disconnect", () => {
    it("should disconnect", async () => {
      provider.setCloudId(mockCloudId);
      await provider.disconnect();

      expect(provider.getCloudId()).toBeNull();
    });
  });

  describe("getClient", () => {
    it("should throw error when not connected", () => {
      expect(() => provider.getClient()).toThrow("Jira client not initialized");
    });

    it("should return client with credentials", () => {
      const client = provider.getClient(mockCredentials, mockCloudId);
      expect(client).toBeInstanceOf(JiraApiClient);
    });
  });

  describe("lookupIssue", () => {
    it("should look up issue", async () => {
      provider.setCloudId(mockCloudId);
      mockFetch.mockResolvedValueOnce(createMockResponse(mockJiraIssue));

      const issue = await provider.lookupIssue(mockCredentials, "TEST-123");

      expect(issue.key).toBe("TEST-123");
    });
  });

  describe("createIssueFromMessage", () => {
    it("should create issue from message", async () => {
      provider.setCloudId(mockCloudId);
      mockFetch.mockResolvedValueOnce(createMockResponse(mockJiraIssue));

      const issue = await provider.createIssueFromMessage(mockCredentials, {
        projectKey: "TEST",
        issueType: "Bug",
        summary: "Issue from chat",
      });

      expect(issue.key).toBe("TEST-123");
    });
  });

  describe("updateIssueStatus", () => {
    it("should update issue status", async () => {
      provider.setCloudId(mockCloudId);
      // Get transitions
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          transitions: [
            {
              id: "21",
              name: "Done",
              to: { id: "3", name: "Done", statusCategory: {} },
            },
          ],
        }),
      );
      // Transition issue
      mockFetch.mockResolvedValueOnce(createMockResponse({}));

      await provider.updateIssueStatus(mockCredentials, "TEST-123", "Done");

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("should throw error for invalid status", async () => {
      provider.setCloudId(mockCloudId);
      mockFetch.mockResolvedValueOnce(
        createMockResponse({
          transitions: [
            {
              id: "21",
              name: "Done",
              to: { id: "3", name: "Done", statusCategory: {} },
            },
          ],
        }),
      );

      await expect(
        provider.updateIssueStatus(mockCredentials, "TEST-123", "Invalid"),
      ).rejects.toThrow("Cannot transition to status");
    });
  });

  describe("getProjects", () => {
    it("should get projects", async () => {
      provider.setCloudId(mockCloudId);
      mockFetch.mockResolvedValueOnce(
        createMockResponse({ values: [mockJiraProject] }),
      );

      const projects = await provider.getProjects(mockCredentials);

      expect(projects).toHaveLength(1);
    });
  });

  describe("lookupIssuesInText", () => {
    it("should look up all issues found in text", async () => {
      provider.setCloudId(mockCloudId);
      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockJiraIssue))
        .mockResolvedValueOnce(
          createMockResponse({ ...mockJiraIssue, key: "TEST-456" }),
        );

      const issues = await provider.lookupIssuesInText(
        mockCredentials,
        "Check TEST-123 and TEST-456",
      );

      expect(issues).toHaveLength(2);
    });

    it("should skip issues that fail to load", async () => {
      provider.setCloudId(mockCloudId);
      mockFetch
        .mockResolvedValueOnce(createMockResponse(mockJiraIssue))
        .mockResolvedValueOnce(createMockResponse({}, false, 404));

      const issues = await provider.lookupIssuesInText(
        mockCredentials,
        "Check TEST-123 and TEST-999",
      );

      expect(issues).toHaveLength(1);
    });

    it("should return empty array for no keys", async () => {
      provider.setCloudId(mockCloudId);

      const issues = await provider.lookupIssuesInText(
        mockCredentials,
        "no keys here",
      );

      expect(issues).toEqual([]);
    });
  });
});

// ============================================================================
// Factory Function Tests
// ============================================================================

describe("createJiraProvider", () => {
  it("should create a JiraIntegrationProvider", () => {
    const provider = createJiraProvider(mockClientConfig);
    expect(provider).toBeInstanceOf(JiraIntegrationProvider);
  });
});
