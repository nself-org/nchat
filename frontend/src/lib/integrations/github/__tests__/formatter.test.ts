/**
 * Unit tests for GitHub webhook formatter.
 */
import {
  formatGitHubNotification,
  formatNotificationAsMessage,
} from "../formatter";

const baseRepo = {
  full_name: "nself/nchat",
  html_url: "https://github.com/nself/nchat",
};
const baseSender = {
  login: "alice",
  avatar_url: "https://avatars.example/alice",
};
const mkPayload = (over: any = {}) =>
  ({
    repository: baseRepo,
    sender: baseSender,
    ...over,
  }) as any;

describe("formatGitHubNotification — issues", () => {
  const issue = {
    number: 42,
    title: "Bug",
    html_url: "https://github.com/nself/nchat/issues/42",
    labels: [{ name: "bug" }, { name: "p1" }],
  };
  it("opened → green issue-opened", () => {
    const n = formatGitHubNotification(
      "issues",
      mkPayload({ action: "opened", issue }),
    );
    expect(n.icon).toBe("issue-opened");
    expect(n.color).toBe("green");
    expect(n.title).toContain("#42");
    expect(n.metadata.labels).toEqual(["bug", "p1"]);
  });
  it("closed → purple issue-closed", () => {
    const n = formatGitHubNotification(
      "issues",
      mkPayload({ action: "closed", issue }),
    );
    expect(n.icon).toBe("issue-closed");
    expect(n.color).toBe("purple");
  });
  it("reopened → green", () => {
    const n = formatGitHubNotification(
      "issues",
      mkPayload({ action: "reopened", issue }),
    );
    expect(n.icon).toBe("issue-reopened");
    expect(n.color).toBe("green");
  });
  it("unknown action → blue", () => {
    const n = formatGitHubNotification(
      "issues",
      mkPayload({ action: "labeled", issue }),
    );
    expect(n.color).toBe("blue");
  });
  it("missing action defaults", () => {
    const n = formatGitHubNotification("issues", mkPayload({ issue }));
    expect(n.icon).toBe("issue-opened");
  });
});

describe("formatGitHubNotification — pull_request", () => {
  const pr = {
    number: 7,
    title: "New feature",
    html_url: "https://github.com/x/y/pull/7",
    merged: false,
    additions: 100,
    deletions: 50,
    head: { ref: "feature-x" },
    labels: [{ name: "feat" }],
  };
  it("opened", () => {
    const n = formatGitHubNotification(
      "pull_request",
      mkPayload({ action: "opened", pull_request: pr }),
    );
    expect(n.icon).toBe("pr-open");
    expect(n.color).toBe("green");
    expect(n.body).toContain("+100 -50");
    expect(n.metadata.branch).toBe("feature-x");
  });
  it("ready_for_review includes title + diffs", () => {
    const n = formatGitHubNotification(
      "pull_request",
      mkPayload({ action: "ready_for_review", pull_request: pr }),
    );
    expect(n.body).toContain("New feature");
  });
  it("closed (merged) → purple pr-merged", () => {
    const n = formatGitHubNotification(
      "pull_request",
      mkPayload({ action: "closed", pull_request: { ...pr, merged: true } }),
    );
    expect(n.icon).toBe("pr-merged");
    expect(n.color).toBe("purple");
    expect(n.title.toLowerCase()).toContain("merged");
  });
  it("closed (not merged) → red pr-closed", () => {
    const n = formatGitHubNotification(
      "pull_request",
      mkPayload({ action: "closed", pull_request: pr }),
    );
    expect(n.icon).toBe("pr-closed");
    expect(n.color).toBe("red");
  });
  it("other action → blue", () => {
    const n = formatGitHubNotification(
      "pull_request",
      mkPayload({ action: "labeled", pull_request: pr }),
    );
    expect(n.color).toBe("blue");
  });
});

describe("formatGitHubNotification — push", () => {
  it("no commits", () => {
    const n = formatGitHubNotification(
      "push",
      mkPayload({ ref: "refs/heads/main", commits: [] }),
    );
    expect(n.title).toContain("main");
    expect(n.body).toContain("0 commits");
  });
  it('single commit (no "s")', () => {
    const n = formatGitHubNotification(
      "push",
      mkPayload({
        ref: "refs/heads/dev",
        commits: [{ message: "fix bug", sha: "abc", html_url: "https://x" }],
      }),
    );
    expect(n.body).toContain("1 commit");
    expect(n.body).not.toContain("1 commits");
  });
  it("many commits with preview + truncation", () => {
    const commits = Array.from({ length: 5 }, (_, i) => ({
      message: `commit ${i}`,
      sha: `s${i}`,
      html_url: `https://x/${i}`,
    }));
    const n = formatGitHubNotification(
      "push",
      mkPayload({ ref: "refs/heads/main", commits }),
    );
    expect(n.body).toContain("and 2 more");
  });
  it("no ref → unknown branch", () => {
    const n = formatGitHubNotification("push", mkPayload({ commits: [] }));
    expect(n.title).toContain("unknown");
  });
});

describe("formatGitHubNotification — issue_comment", () => {
  const issue = { number: 1, title: "t", html_url: "https://x" };
  it("created", () => {
    const n = formatGitHubNotification(
      "issue_comment",
      mkPayload({
        action: "created",
        issue,
        comment: { body: "hi", html_url: "https://x/c" },
      }),
    );
    expect(n.icon).toBe("comment");
    expect(n.body).toContain("commented");
  });
  it("truncates long comment bodies", () => {
    const n = formatGitHubNotification(
      "issue_comment",
      mkPayload({
        action: "created",
        issue,
        comment: { body: "x".repeat(200), html_url: "" },
      }),
    );
    expect(n.body).toContain("...");
  });
});

describe("formatGitHubNotification — pull_request_review", () => {
  const pr = { number: 9, title: "t", html_url: "https://x" };
  it("approved → green", () => {
    const n = formatGitHubNotification(
      "pull_request_review",
      mkPayload({ pull_request: pr, review: { state: "approved" } }),
    );
    expect(n.color).toBe("green");
    expect(n.title).toContain("approved");
  });
  it("changes_requested → red", () => {
    const n = formatGitHubNotification(
      "pull_request_review",
      mkPayload({ pull_request: pr, review: { state: "changes_requested" } }),
    );
    expect(n.color).toBe("red");
  });
  it("commented", () => {
    const n = formatGitHubNotification(
      "pull_request_review",
      mkPayload({ pull_request: pr, review: { state: "commented" } }),
    );
    expect(n.title).toContain("Review comment");
  });
  it("default/submitted → blue", () => {
    const n = formatGitHubNotification(
      "pull_request_review",
      mkPayload({ pull_request: pr }),
    );
    expect(n.color).toBe("blue");
  });
});

describe("formatGitHubNotification — review comment", () => {
  const pr = { number: 9, title: "t", html_url: "https://x" };
  it("created", () => {
    const n = formatGitHubNotification(
      "pull_request_review_comment",
      mkPayload({
        action: "created",
        pull_request: pr,
        comment: { body: "hi" },
      }),
    );
    expect(n.title).toContain("#9");
  });
});

describe("create / delete / release / fork / watch / commit_comment events", () => {
  it("create branch", () => {
    const n = formatGitHubNotification(
      "create",
      mkPayload({ ref: "dev", ref_type: "branch" }),
    );
    expect(n.icon).toBe("branch");
    expect(n.color).toBe("green");
  });
  it("create tag", () => {
    const n = formatGitHubNotification(
      "create",
      mkPayload({ ref: "v1", ref_type: "tag" }),
    );
    expect(n.icon).toBe("tag");
  });
  it("create no ref_type", () => {
    const n = formatGitHubNotification("create", mkPayload({ ref: "x" }));
    expect(n.icon).toBe("branch");
  });
  it("delete", () => {
    const n = formatGitHubNotification(
      "delete",
      mkPayload({ ref: "old", ref_type: "branch" }),
    );
    expect(n.color).toBe("red");
  });
  it("release published → green", () => {
    const n = formatGitHubNotification(
      "release",
      mkPayload({
        action: "published",
        release: {
          name: "1.0",
          tag_name: "v1",
          html_url: "x",
          prerelease: false,
          draft: false,
        },
      }),
    );
    expect(n.color).toBe("green");
  });
  it("release created → blue", () => {
    const n = formatGitHubNotification(
      "release",
      mkPayload({
        action: "created",
        release: {
          tag_name: "v1",
          name: "",
          html_url: "",
          prerelease: false,
          draft: false,
        },
      }),
    );
    expect(n.color).toBe("blue");
  });
  it("fork", () => {
    const n = formatGitHubNotification(
      "fork",
      mkPayload({ forkee: { full_name: "a/b", html_url: "x" } }),
    );
    expect(n.icon).toBe("fork");
  });
  it("fork with missing forkee", () => {
    const n = formatGitHubNotification("fork", mkPayload({}));
    expect(n.body).toContain("unknown");
  });
  it("watch", () => {
    expect(
      formatGitHubNotification("watch", mkPayload({ action: "started" })).icon,
    ).toBe("star");
  });
  it("commit_comment", () => {
    const n = formatGitHubNotification(
      "commit_comment",
      mkPayload({
        comment: { body: "note", commit_id: "abcdef1234", html_url: "x" },
      }),
    );
    expect(n.title).toContain("abcdef1");
  });
  it("commit_comment no commit_id", () => {
    const n = formatGitHubNotification(
      "commit_comment",
      mkPayload({ comment: { body: "" } }),
    );
    expect(n.title).toContain("unknown");
  });
});

describe("check_run / check_suite / deployment(_status)", () => {
  it("check_run success → green", () => {
    const n = formatGitHubNotification(
      "check_run",
      mkPayload({
        action: "completed",
        check_run: {
          name: "ci",
          conclusion: "success",
          status: "completed",
          html_url: "x",
        },
      }),
    );
    expect(n.color).toBe("green");
    expect(n.title).toContain("passed");
  });
  it("check_run failure → red", () => {
    const n = formatGitHubNotification(
      "check_run",
      mkPayload({
        action: "completed",
        check_run: {
          name: "ci",
          conclusion: "failure",
          status: "completed",
          html_url: "x",
        },
      }),
    );
    expect(n.color).toBe("red");
  });
  it("check_run cancelled → red", () => {
    const n = formatGitHubNotification(
      "check_run",
      mkPayload({
        action: "completed",
        check_run: {
          name: "ci",
          conclusion: "cancelled",
          status: "completed",
          html_url: "x",
        },
      }),
    );
    expect(n.color).toBe("red");
  });
  it("check_run in_progress → yellow", () => {
    const n = formatGitHubNotification(
      "check_run",
      mkPayload({
        check_run: {
          name: "ci",
          conclusion: null,
          status: "in_progress",
          html_url: "x",
        },
      }),
    );
    expect(n.color).toBe("yellow");
  });
  it("check_run default → blue", () => {
    const n = formatGitHubNotification("check_run", mkPayload({}));
    expect(n.color).toBe("blue");
  });
  it("check_suite success", () => {
    const n = formatGitHubNotification(
      "check_suite",
      mkPayload({
        check_suite: { conclusion: "success", status: "", head_branch: "main" },
      }),
    );
    expect(n.title).toContain("passed");
  });
  it("check_suite failure", () => {
    const n = formatGitHubNotification(
      "check_suite",
      mkPayload({
        check_suite: { conclusion: "failure", status: "", head_branch: "dev" },
      }),
    );
    expect(n.color).toBe("red");
  });
  it("check_suite default", () => {
    const n = formatGitHubNotification("check_suite", mkPayload({}));
    expect(n.color).toBe("blue");
  });
  it("deployment", () => {
    const n = formatGitHubNotification(
      "deployment",
      mkPayload({ deployment: { environment: "prod", ref: "x", sha: "y" } }),
    );
    expect(n.title).toContain("prod");
  });
  it("deployment missing env", () => {
    expect(
      formatGitHubNotification("deployment", mkPayload({})).title,
    ).toContain("unknown");
  });
  it("deployment_status success → green", () => {
    const n = formatGitHubNotification(
      "deployment_status",
      mkPayload({
        deployment_status: {
          state: "success",
          description: "ok",
          target_url: "u",
        },
        deployment: { environment: "prod" },
      }),
    );
    expect(n.color).toBe("green");
  });
  it("deployment_status failure → red", () => {
    const n = formatGitHubNotification(
      "deployment_status",
      mkPayload({
        deployment_status: {
          state: "failure",
          description: "",
          target_url: "",
        },
      }),
    );
    expect(n.color).toBe("red");
  });
  it("deployment_status pending → yellow", () => {
    const n = formatGitHubNotification(
      "deployment_status",
      mkPayload({
        deployment_status: {
          state: "pending",
          description: "",
          target_url: "",
        },
      }),
    );
    expect(n.color).toBe("yellow");
  });
  it("deployment_status default → blue", () => {
    expect(
      formatGitHubNotification("deployment_status", mkPayload({})).color,
    ).toBe("blue");
  });
});

describe("unknown event + formatNotificationAsMessage", () => {
  it("unknown event falls back", () => {
    const n = formatGitHubNotification(
      "custom_event",
      mkPayload({ action: "x" }),
    );
    expect(n.icon).toBe("github");
    expect(n.color).toBe("gray");
    expect(n.title).toContain("custom_event");
  });
  it("unknown event no action", () => {
    const n = formatGitHubNotification("custom_event", mkPayload({}));
    expect(n.body).not.toContain("()");
  });
  it("formatNotificationAsMessage produces all 3 formats", () => {
    const n = formatGitHubNotification(
      "issues",
      mkPayload({
        action: "opened",
        issue: {
          number: 1,
          title: "<script>hi</script>",
          html_url: "https://x",
        },
      }),
    );
    const m = formatNotificationAsMessage(n);
    expect(m.text).toContain("[GitHub]");
    expect(m.html).toContain("&lt;script&gt;");
    expect(m.embed?.color).toMatch(/^#/);
    expect(m.embed?.footer).toBe("nself/nchat");
  });
  it("html escape covers all 4 chars", () => {
    const n = formatGitHubNotification(
      "issues",
      mkPayload({
        action: "opened",
        issue: { number: 1, title: 'a&b"c', html_url: "https://x" },
      }),
    );
    const m = formatNotificationAsMessage(n);
    expect(m.html).toContain("&amp;");
    expect(m.html).toContain("&quot;");
  });
  it("message without url still works", () => {
    const notif: any = {
      title: "t",
      body: "b",
      icon: "github",
      color: "gray",
      timestamp: "",
      metadata: {
        eventType: "x",
        repositoryName: "r",
        repositoryUrl: "u",
        senderLogin: "a",
      },
    };
    const m = formatNotificationAsMessage(notif);
    expect(m.text).toBe("[GitHub] t\nb");
  });
});
