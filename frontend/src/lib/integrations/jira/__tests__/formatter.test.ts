/**
 * Unit tests for Jira formatter.
 */
import {
  formatJiraNotification,
  formatJiraNotificationAsMessage,
  formatJiraIssueUnfurl,
} from "../formatter";

const baseUser = {
  accountId: "a1",
  displayName: "Alice",
  avatarUrls: { "48x48": "https://x/alice" },
};
const baseIssue = (over: any = {}) => ({
  id: "i1",
  key: "PROJ-1",
  self: "https://acme.atlassian.net/rest/api/2/issue/i1",
  fields: {
    summary: "A bug",
    project: { key: "PROJ" },
    status: { name: "To Do", statusCategory: { key: "new" } },
    priority: { name: "High" },
    labels: ["bug"],
    ...over.fields,
  },
  ...over,
});

describe("formatJiraNotification — issue events", () => {
  it("issue_created", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_created",
      user: baseUser,
      issue: baseIssue(),
    } as any);
    expect(n.icon).toBe("issue-created");
    expect(n.color).toBe("green");
    expect(n.url).toContain("browse/PROJ-1");
  });
  it("issue_updated with changelog", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_updated",
      user: baseUser,
      issue: baseIssue(),
      changelog: {
        items: [
          { field: "status", fromString: "To Do", toString: "Done" },
          { field: "assignee", from: null, to: "bob" },
          { field: "priority", fromString: "Low", toString: "High" },
          { field: "resolution", fromString: "", toString: "Fixed" },
          { field: "misc", from: "", to: "something" },
        ],
      },
    } as any);
    expect(n.body).toContain("Status:");
  });
  it("issue_updated with no changelog", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_updated",
      user: baseUser,
      issue: baseIssue(),
    } as any);
    expect(n.icon).toBe("issue-updated");
  });
  it("issue_deleted", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "jira:issue_deleted",
        user: baseUser,
        issue: baseIssue(),
      } as any).color,
    ).toBe("red");
  });
  it("issue_* unknown", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_weird",
      user: baseUser,
      issue: baseIssue(),
    } as any);
    expect(n.title).toContain("PROJ-1");
  });
  it("no issue → unknown fallback", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_created",
      user: baseUser,
    } as any);
    expect(n.icon).toBe("jira");
  });
  it("bad self URL = relative browse path only", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_created",
      user: baseUser,
      issue: { ...baseIssue(), self: "not a url" },
    } as any);
    // getBaseUrl returns '' for invalid URLs; url becomes '/browse/PROJ-1'
    expect(n.url).toBe("/browse/PROJ-1");
  });
  it("getUpdateIcon assign / resolve / close / reopen", () => {
    const mk = (eventTypeName: string) =>
      formatJiraNotification({
        webhookEvent: "jira:issue_updated",
        issue_event_type_name: eventTypeName,
        user: baseUser,
        issue: baseIssue(),
      } as any);
    expect(mk("issue_assigned").icon).toBe("issue-assigned");
    expect(mk("issue_resolved").icon).toBe("issue-resolved");
    expect(mk("issue_closed").icon).toBe("issue-closed");
    expect(mk("issue_reopened").icon).toBe("issue-reopened");
  });
  it("getUpdateIcon via status changelog → done", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_updated",
      user: baseUser,
      issue: baseIssue(),
      changelog: { items: [{ field: "status", toString: "Done" }] },
    } as any);
    expect(n.icon).toBe("issue-resolved");
  });
  it("getUpdateIcon status=closed", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_updated",
      user: baseUser,
      issue: baseIssue(),
      changelog: { items: [{ field: "status", toString: "Closed" }] },
    } as any);
    expect(n.icon).toBe("issue-closed");
  });
  it("getUpdateColor progress → purple", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_updated",
      user: baseUser,
      issue: baseIssue(),
      changelog: { items: [{ field: "status", toString: "In Progress" }] },
    } as any);
    expect(n.color).toBe("purple");
  });
  it("getUpdateColor blocked → red", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_updated",
      user: baseUser,
      issue: baseIssue(),
      changelog: { items: [{ field: "status", toString: "Blocked" }] },
    } as any);
    expect(n.color).toBe("red");
  });
  it('changelog with 5 items shows "+2 more"', () => {
    const items = [
      { field: "a", toString: "1" },
      { field: "b", toString: "2" },
      { field: "c", toString: "3" },
      { field: "d", toString: "4" },
      { field: "e", toString: "5" },
    ];
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_updated",
      user: baseUser,
      issue: baseIssue(),
      changelog: { items },
    } as any);
    expect(n.body).toContain("more changes");
  });
});

describe("formatJiraNotification — comment events", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "hello " },
          { type: "text", text: "world" },
        ],
      },
    ],
  };
  it("comment_created", () => {
    const n = formatJiraNotification({
      webhookEvent: "comment_created",
      user: baseUser,
      issue: baseIssue(),
      comment: { body: doc },
    } as any);
    expect(n.icon).toBe("comment");
    expect(n.body).toContain("hello");
  });
  it("comment_updated", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "comment_updated",
        user: baseUser,
        issue: baseIssue(),
        comment: { body: doc },
      } as any).title,
    ).toContain("Updated");
  });
  it("comment_deleted", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "comment_deleted",
        user: baseUser,
        issue: baseIssue(),
        comment: { body: doc },
      } as any).title,
    ).toContain("Deleted");
  });
  it("comment no body", () => {
    const n = formatJiraNotification({
      webhookEvent: "comment_created",
      user: baseUser,
      issue: baseIssue(),
      comment: {},
    } as any);
    expect(n.body).not.toContain("hello");
  });
  it("comment missing issue → unknown", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "comment_created",
        user: baseUser,
        comment: { body: doc },
      } as any).icon,
    ).toBe("jira");
  });
  it("comment_unknown → default branch", () => {
    const n = formatJiraNotification({
      webhookEvent: "comment_other",
      user: baseUser,
      issue: baseIssue(),
      comment: { body: doc },
    } as any);
    expect(n.title).toContain("Activity");
  });
});

describe("formatJiraNotification — sprint + attachment", () => {
  it("sprint_created", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "sprint_created",
        user: baseUser,
        sprint: { name: "S1" },
      } as any).color,
    ).toBe("green");
  });
  it("sprint_started", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "sprint_started",
        user: baseUser,
        sprint: { name: "S1" },
      } as any).color,
    ).toBe("green");
  });
  it("sprint_closed", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "sprint_closed",
        user: baseUser,
        sprint: { name: "S1" },
      } as any).color,
    ).toBe("purple");
  });
  it("sprint_updated", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "sprint_updated",
        user: baseUser,
        sprint: { name: "S1" },
      } as any).title,
    ).toBe("Sprint Updated");
  });
  it("sprint_deleted", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "sprint_deleted",
        user: baseUser,
        sprint: { name: "S1" },
      } as any).color,
    ).toBe("red");
  });
  it("sprint unknown + no name", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "sprint_other",
        user: baseUser,
      } as any).body,
    ).toContain("Unknown");
  });
  it("attachment_created", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "attachment_created",
        user: baseUser,
        issue: baseIssue(),
      } as any).color,
    ).toBe("green");
  });
  it("attachment_deleted", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "attachment_deleted",
        user: baseUser,
        issue: baseIssue(),
      } as any).color,
    ).toBe("red");
  });
  it("attachment_other", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "attachment_other",
        user: baseUser,
        issue: baseIssue(),
      } as any).title,
    ).toContain("Activity");
  });
  it("attachment no issue → unknown", () => {
    expect(
      formatJiraNotification({
        webhookEvent: "attachment_created",
        user: baseUser,
      } as any).icon,
    ).toBe("jira");
  });
});

describe("formatJiraNotification — unknown + user fallbacks", () => {
  it("wholly unknown event", () => {
    const n = formatJiraNotification({
      webhookEvent: "some_weird_event",
      user: baseUser,
    } as any);
    expect(n.color).toBe("gray");
  });
  it("user with only accountId", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_created",
      user: { accountId: "a1" } as any,
      issue: baseIssue(),
    } as any);
    expect(n.body).toContain("a1");
  });
  it("user empty", () => {
    const n = formatJiraNotification({
      webhookEvent: "some_weird_event",
      user: {} as any,
    } as any);
    expect(n.body).toContain("Unknown User");
  });
});

describe("formatJiraNotificationAsMessage", () => {
  it("produces text + html + embed with fields", () => {
    const n = formatJiraNotification({
      webhookEvent: "jira:issue_created",
      user: baseUser,
      issue: baseIssue(),
    } as any);
    const m = formatJiraNotificationAsMessage(n);
    expect(m.text).toContain("[Jira]");
    expect(m.html).toContain("<strong>");
    expect(m.embed?.color).toMatch(/^#/);
    expect(m.embed?.fields?.length).toBeGreaterThanOrEqual(1);
  });
  it("HTML escapes all 4 chars", () => {
    const n: any = {
      title: "a & b",
      body: 'a "c" <d>',
      color: "blue",
      icon: "jira",
      timestamp: "",
      metadata: {
        eventType: "x",
        userDisplayName: "u",
      },
    };
    const m = formatJiraNotificationAsMessage(n);
    expect(m.html).toContain("&amp;");
    expect(m.html).toContain("&quot;");
    expect(m.html).toContain("&lt;");
    expect(m.html).toContain("&gt;");
  });
  it("no url → no link", () => {
    const n: any = {
      title: "t",
      body: "b",
      color: "blue",
      icon: "jira",
      timestamp: "",
      metadata: { eventType: "x", userDisplayName: "u" },
    };
    const m = formatJiraNotificationAsMessage(n);
    expect(m.text).not.toContain("http");
  });
  it("no status/priority → no fields", () => {
    const n: any = {
      title: "t",
      body: "b",
      color: "blue",
      icon: "jira",
      timestamp: "",
      metadata: { eventType: "x", userDisplayName: "u" },
    };
    expect(formatJiraNotificationAsMessage(n).embed?.fields).toBeUndefined();
  });
});

describe("formatJiraIssueUnfurl", () => {
  it("basic issue", () => {
    const u = formatJiraIssueUnfurl({
      key: "PROJ-1",
      self: "https://x.atlassian.net/rest/api/2/issue/1",
      fields: {
        summary: "Hi",
        description: "desc",
        status: { name: "Done", statusCategory: { key: "done" } },
        priority: { name: "High", iconUrl: "https://x/i" },
        assignee: {
          displayName: "Alice",
          avatarUrls: { "24x24": "https://x/a" },
        },
      },
    } as any);
    expect(u.title).toContain("PROJ-1");
    expect(u.statusColor).toBe("#36B37E");
    expect(u.priority).toBe("High");
  });
  it("in-progress status color", () => {
    const u = formatJiraIssueUnfurl({
      key: "P",
      self: "https://x.atl/rest/api/2/issue/1",
      fields: {
        summary: "s",
        status: {
          name: "In Progress",
          statusCategory: { key: "indeterminate" },
        },
      },
    } as any);
    expect(u.statusColor).toBe("#0052CC");
  });
  it("new status color", () => {
    const u = formatJiraIssueUnfurl({
      key: "P",
      self: "https://x.atl/rest/api/2/issue/1",
      fields: {
        summary: "s",
        status: { name: "To Do", statusCategory: { key: "new" } },
      },
    } as any);
    expect(u.statusColor).toBe("#6B778C");
  });
  it("no description", () => {
    const u = formatJiraIssueUnfurl({
      key: "P",
      self: "https://x.atl/rest/api/2/issue/1",
      fields: {
        summary: "s",
        status: { name: "x", statusCategory: { key: "done" } },
      },
    } as any);
    expect(u.description).toBe("");
  });
  it("description truncated", () => {
    const u = formatJiraIssueUnfurl({
      key: "P",
      self: "https://x.atl/rest/api/2/issue/1",
      fields: {
        summary: "s",
        description: "x".repeat(300),
        status: { name: "x", statusCategory: { key: "done" } },
      },
    } as any);
    expect(u.description).toContain("...");
  });
});
