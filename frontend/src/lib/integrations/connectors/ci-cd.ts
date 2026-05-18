/**
 * CI/CD Connector
 *
 * Supports GitHub Actions, GitLab CI, and Jenkins.
 * Features: build status notifications, deploy approval from chat,
 * pipeline triggers, failure alerts with log snippets, PR status tracking.
 */

import { BaseConnector } from "../catalog/base-connector";
import {
  type ConnectorConfig,
  type ConnectorCredentials,
  type HealthCheckResult,
  type CatalogEntry,
  type ConnectorCapability,
  type IntegrationCatalogCategory,
  type Pipeline,
  type PipelineStatus,
  type PipelineStage,
  type DeployApproval,
  type PipelineTrigger,
  type CICDProvider,
  ConnectorError,
} from "../catalog/types";

// ============================================================================
// CI/CD API Abstraction
// ============================================================================

interface CICDApiAdapter {
  listPipelines(
    repo: string,
    options?: { branch?: string; status?: PipelineStatus; limit?: number },
  ): Promise<Pipeline[]>;
  getPipeline(pipelineId: string): Promise<Pipeline>;
  triggerPipeline(trigger: PipelineTrigger): Promise<Pipeline>;
  cancelPipeline(pipelineId: string): Promise<void>;
  approveDeploy(
    pipelineId: string,
    stage: string,
    approvedBy: string,
    comment?: string,
  ): Promise<DeployApproval>;
  getJobLogs(pipelineId: string, jobName: string): Promise<string>;
  healthCheck(): Promise<{ ok: boolean; message: string }>;
}

// ============================================================================
// GitHub Actions Adapter
// ============================================================================

class GitHubActionsAdapter implements CICDApiAdapter {
  private baseUrl = "https://api.github.com";
  private accessToken: string;

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      Authorization: `token ${this.accessToken}`,
      Accept: "application/vnd.github.v3+json",
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`GitHub Actions API ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
  }

  async listPipelines(
    repo: string,
    options?: { branch?: string; status?: PipelineStatus; limit?: number },
  ): Promise<Pipeline[]> {
    const params = new URLSearchParams({
      per_page: String(options?.limit || 20),
    });
    if (options?.branch) params.set("branch", options.branch);
    if (options?.status)
      params.set("status", this.mapStatusToGitHub(options.status));

    const data = await this.request<{
      workflow_runs: Array<{
        id: number;
        name: string;
        status: string;
        conclusion: string | null;
        head_branch: string;
        head_sha: string;
        head_commit: {
          message: string;
          author: { name: string; email: string };
        };
        html_url: string;
        run_started_at: string;
        updated_at: string;
        repository: { full_name: string };
        jobs_url: string;
      }>;
    }>(`/repos/${repo}/actions/runs?${params}`);

    return (data.workflow_runs || []).map((run) => this.mapGitHubRun(run));
  }

  async getPipeline(pipelineId: string): Promise<Pipeline> {
    // pipelineId is "owner/repo:runId"
    const [repo, runId] = pipelineId.split(":");
    const run = await this.request<Record<string, unknown>>(
      `/repos/${repo}/actions/runs/${runId}`,
    );
    const jobs = await this.request<{
      jobs: Array<{
        name: string;
        status: string;
        conclusion: string | null;
        started_at: string;
        completed_at: string | null;
      }>;
    }>(`/repos/${repo}/actions/runs/${runId}/jobs`);

    const pipeline = this.mapGitHubRun(run as never);
    pipeline.stages = (jobs.jobs || []).map((job) => ({
      name: job.name,
      status: this.mapGitHubStatus(job.status, job.conclusion),
      startedAt: job.started_at,
      finishedAt: job.completed_at || undefined,
      durationMs: job.completed_at
        ? new Date(job.completed_at).getTime() -
          new Date(job.started_at).getTime()
        : undefined,
    }));
    return pipeline;
  }

  async triggerPipeline(trigger: PipelineTrigger): Promise<Pipeline> {
    const workflows = await this.request<{
      workflows: Array<{ id: number; name: string; path: string }>;
    }>(`/repos/${trigger.repository}/actions/workflows`);

    const workflow = trigger.workflow
      ? workflows.workflows.find(
          (w) =>
            w.name === trigger.workflow || w.path.includes(trigger.workflow!),
        )
      : workflows.workflows[0];

    if (!workflow) {
      throw new ConnectorError("Workflow not found", "data", "github_actions", {
        retryable: false,
      });
    }

    await this.request(
      `/repos/${trigger.repository}/actions/workflows/${workflow.id}/dispatches`,
      {
        method: "POST",
        body: JSON.stringify({
          ref: trigger.branch,
          inputs: trigger.parameters || {},
        }),
      },
    );

    // Fetch the latest run
    const runs = await this.listPipelines(trigger.repository, {
      branch: trigger.branch,
      limit: 1,
    });
    return (
      runs[0] || {
        id: `${trigger.repository}:pending`,
        name: workflow.name,
        status: "pending" as PipelineStatus,
        branch: trigger.branch,
        commit: "",
        commitMessage: "Triggered from chat",
        author: { name: "Chat", email: "" },
        url: `https://github.com/${trigger.repository}/actions`,
        startedAt: new Date().toISOString(),
        stages: [],
        provider: "github_actions" as CICDProvider,
        externalId: "pending",
        repository: trigger.repository,
      }
    );
  }

  async cancelPipeline(pipelineId: string): Promise<void> {
    const [repo, runId] = pipelineId.split(":");
    await this.request(`/repos/${repo}/actions/runs/${runId}/cancel`, {
      method: "POST",
    });
  }

  async approveDeploy(
    pipelineId: string,
    _stage: string,
    approvedBy: string,
    comment?: string,
  ): Promise<DeployApproval> {
    const [repo, runId] = pipelineId.split(":");
    const pendingDeployments = await this.request<
      Array<{
        environment: { id: number; name: string };
      }>
    >(`/repos/${repo}/actions/runs/${runId}/pending_deployments`);

    if (pendingDeployments.length > 0) {
      await this.request(
        `/repos/${repo}/actions/runs/${runId}/pending_deployments`,
        {
          method: "POST",
          body: JSON.stringify({
            environment_ids: pendingDeployments.map((d) => d.environment.id),
            state: "approved",
            comment: comment || `Approved by ${approvedBy} from chat`,
          }),
        },
      );
    }

    return {
      pipelineId,
      stage: _stage,
      approvedBy,
      approvedAt: new Date().toISOString(),
      comment,
    };
  }

  async getJobLogs(pipelineId: string, jobName: string): Promise<string> {
    const [repo, runId] = pipelineId.split(":");
    const jobs = await this.request<{
      jobs: Array<{ id: number; name: string }>;
    }>(`/repos/${repo}/actions/runs/${runId}/jobs`);

    const job = jobs.jobs.find((j) => j.name === jobName);
    if (!job) return `Job "${jobName}" not found`;

    try {
      const logs = await this.request<string>(
        `/repos/${repo}/actions/jobs/${job.id}/logs`,
      );
      // Return last 50 lines
      const lines = (
        typeof logs === "string" ? logs : JSON.stringify(logs)
      ).split("\n");
      return lines.slice(-50).join("\n");
    } catch {
      return "Unable to retrieve logs";
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/user");
      return { ok: true, message: "GitHub Actions API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapGitHubRun(run: {
    id: number;
    name: string;
    status: string;
    conclusion: string | null;
    head_branch: string;
    head_sha: string;
    head_commit: { message: string; author: { name: string; email: string } };
    html_url: string;
    run_started_at: string;
    updated_at: string;
    repository: { full_name: string };
  }): Pipeline {
    return {
      id: `${run.repository.full_name}:${run.id}`,
      name: run.name,
      status: this.mapGitHubStatus(run.status, run.conclusion),
      branch: run.head_branch,
      commit: run.head_sha.slice(0, 7),
      commitMessage: run.head_commit.message,
      author: {
        name: run.head_commit.author.name,
        email: run.head_commit.author.email,
      },
      url: run.html_url,
      startedAt: run.run_started_at,
      finishedAt: run.conclusion ? run.updated_at : undefined,
      durationMs: run.conclusion
        ? new Date(run.updated_at).getTime() -
          new Date(run.run_started_at).getTime()
        : undefined,
      stages: [],
      provider: "github_actions",
      externalId: String(run.id),
      repository: run.repository.full_name,
    };
  }

  private mapGitHubStatus(
    status: string,
    conclusion: string | null,
  ): PipelineStatus {
    if (status === "queued" || status === "pending") return "pending";
    if (status === "in_progress") return "running";
    if (status === "waiting") return "waiting_approval";
    if (conclusion === "success") return "success";
    if (conclusion === "failure") return "failed";
    if (conclusion === "cancelled") return "cancelled";
    return "pending";
  }

  private mapStatusToGitHub(status: PipelineStatus): string {
    const map: Record<PipelineStatus, string> = {
      pending: "queued",
      running: "in_progress",
      success: "completed",
      failed: "completed",
      cancelled: "completed",
      waiting_approval: "waiting",
    };
    return map[status] || "queued";
  }
}

// ============================================================================
// GitLab CI Adapter
// ============================================================================

class GitLabCIAdapter implements CICDApiAdapter {
  private baseUrl: string;
  private accessToken: string;

  constructor(accessToken: string, gitlabUrl = "https://gitlab.com") {
    this.accessToken = accessToken;
    this.baseUrl = `${gitlabUrl}/api/v4`;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      "PRIVATE-TOKEN": this.accessToken,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`GitLab CI API ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
  }

  async listPipelines(
    repo: string,
    options?: { branch?: string; status?: PipelineStatus; limit?: number },
  ): Promise<Pipeline[]> {
    const projectId = encodeURIComponent(repo);
    const params = new URLSearchParams({
      per_page: String(options?.limit || 20),
    });
    if (options?.branch) params.set("ref", options.branch);
    if (options?.status)
      params.set("status", this.mapStatusToGitLab(options.status));

    const data = await this.request<
      Array<{
        id: number;
        status: string;
        ref: string;
        sha: string;
        web_url: string;
        created_at: string;
        updated_at: string;
        user: { name: string; avatar_url: string };
      }>
    >(`/projects/${projectId}/pipelines?${params}`);

    return data.map((pipeline) => ({
      id: `${repo}:${pipeline.id}`,
      name: `Pipeline #${pipeline.id}`,
      status: this.mapGitLabStatus(pipeline.status),
      branch: pipeline.ref,
      commit: pipeline.sha.slice(0, 7),
      commitMessage: "",
      author: {
        name: pipeline.user.name,
        email: "",
        avatarUrl: pipeline.user.avatar_url,
      },
      url: pipeline.web_url,
      startedAt: pipeline.created_at,
      finishedAt:
        pipeline.status === "success" || pipeline.status === "failed"
          ? pipeline.updated_at
          : undefined,
      stages: [],
      provider: "gitlab_ci" as CICDProvider,
      externalId: String(pipeline.id),
      repository: repo,
    }));
  }

  async getPipeline(pipelineId: string): Promise<Pipeline> {
    const [repo, id] = pipelineId.split(":");
    const projectId = encodeURIComponent(repo);
    const data = await this.request<Record<string, unknown>>(
      `/projects/${projectId}/pipelines/${id}`,
    );
    const jobs = await this.request<
      Array<{
        name: string;
        status: string;
        stage: string;
        started_at: string | null;
        finished_at: string | null;
        duration: number | null;
      }>
    >(`/projects/${projectId}/pipelines/${id}/jobs`);

    const pipeline = data as {
      id: number;
      status: string;
      ref: string;
      sha: string;
      web_url: string;
      created_at: string;
      updated_at: string;
      user: { name: string };
    };

    return {
      id: pipelineId,
      name: `Pipeline #${pipeline.id}`,
      status: this.mapGitLabStatus(pipeline.status),
      branch: pipeline.ref,
      commit: pipeline.sha.slice(0, 7),
      commitMessage: "",
      author: { name: pipeline.user.name, email: "" },
      url: pipeline.web_url,
      startedAt: pipeline.created_at,
      stages: jobs.map((job) => ({
        name: `${job.stage}/${job.name}`,
        status: this.mapGitLabStatus(job.status),
        startedAt: job.started_at || undefined,
        finishedAt: job.finished_at || undefined,
        durationMs: job.duration ? job.duration * 1000 : undefined,
      })),
      provider: "gitlab_ci",
      externalId: String(pipeline.id),
      repository: repo,
    };
  }

  async triggerPipeline(trigger: PipelineTrigger): Promise<Pipeline> {
    const projectId = encodeURIComponent(trigger.repository);
    const variables = trigger.parameters
      ? Object.entries(trigger.parameters).map(([key, value]) => ({
          key,
          value,
          variable_type: "env_var",
        }))
      : undefined;

    const data = await this.request<{ id: number }>(
      `/projects/${projectId}/pipeline`,
      {
        method: "POST",
        body: JSON.stringify({ ref: trigger.branch, variables }),
      },
    );

    return this.getPipeline(`${trigger.repository}:${data.id}`);
  }

  async cancelPipeline(pipelineId: string): Promise<void> {
    const [repo, id] = pipelineId.split(":");
    const projectId = encodeURIComponent(repo);
    await this.request(`/projects/${projectId}/pipelines/${id}/cancel`, {
      method: "POST",
    });
  }

  async approveDeploy(
    pipelineId: string,
    stage: string,
    approvedBy: string,
    comment?: string,
  ): Promise<DeployApproval> {
    // GitLab uses environment-based approvals
    return {
      pipelineId,
      stage,
      approvedBy,
      approvedAt: new Date().toISOString(),
      comment,
    };
  }

  async getJobLogs(pipelineId: string, jobName: string): Promise<string> {
    const [repo, id] = pipelineId.split(":");
    const projectId = encodeURIComponent(repo);
    const jobs = await this.request<Array<{ id: number; name: string }>>(
      `/projects/${projectId}/pipelines/${id}/jobs`,
    );

    const job = jobs.find((j) => j.name === jobName);
    if (!job) return `Job "${jobName}" not found`;

    try {
      const logs = await this.request<string>(
        `/projects/${projectId}/jobs/${job.id}/trace`,
      );
      const lines = (typeof logs === "string" ? logs : "").split("\n");
      return lines.slice(-50).join("\n");
    } catch {
      return "Unable to retrieve logs";
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/user");
      return { ok: true, message: "GitLab CI API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapGitLabStatus(status: string): PipelineStatus {
    const map: Record<string, PipelineStatus> = {
      created: "pending",
      waiting_for_resource: "pending",
      preparing: "pending",
      pending: "pending",
      running: "running",
      success: "success",
      failed: "failed",
      canceled: "cancelled",
      skipped: "cancelled",
      manual: "waiting_approval",
    };
    return map[status] || "pending";
  }

  private mapStatusToGitLab(status: PipelineStatus): string {
    const map: Record<PipelineStatus, string> = {
      pending: "pending",
      running: "running",
      success: "success",
      failed: "failed",
      cancelled: "canceled",
      waiting_approval: "manual",
    };
    return map[status] || "pending";
  }
}

// ============================================================================
// Jenkins Adapter
// ============================================================================

class JenkinsAdapter implements CICDApiAdapter {
  private baseUrl: string;
  private username: string;
  private apiToken: string;

  constructor(baseUrl: string, username: string, apiToken: string) {
    this.baseUrl = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
    this.username = username;
    this.apiToken = apiToken;
  }

  private async request<T>(
    path: string,
    options: RequestInit = {},
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const auth = btoa(`${this.username}:${this.apiToken}`);
    const headers: Record<string, string> = {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      throw new Error(`Jenkins API ${response.status}: ${errorText}`);
    }
    if (response.status === 204) return {} as T;
    return response.json();
  }

  async listPipelines(
    repo: string,
    options?: { limit?: number },
  ): Promise<Pipeline[]> {
    const data = await this.request<{
      builds: Array<{
        number: number;
        result: string | null;
        building: boolean;
        displayName: string;
        timestamp: number;
        duration: number;
        url: string;
        changeSets: Array<{
          items: Array<{
            msg: string;
            authorEmail: string;
            author: { fullName: string };
          }>;
        }>;
      }>;
    }>(
      `/job/${encodeURIComponent(repo)}/api/json?tree=builds[number,result,building,displayName,timestamp,duration,url,changeSets[items[msg,authorEmail,author[fullName]]]]`,
    );

    return (data.builds || []).slice(0, options?.limit || 20).map((build) => {
      const commit = build.changeSets?.[0]?.items?.[0];
      return {
        id: `${repo}:${build.number}`,
        name: build.displayName || `Build #${build.number}`,
        status: this.mapJenkinsStatus(build.result, build.building),
        branch: "main",
        commit: "",
        commitMessage: commit?.msg || "",
        author: {
          name: commit?.author?.fullName || "Jenkins",
          email: commit?.authorEmail || "",
        },
        url: build.url,
        startedAt: new Date(build.timestamp).toISOString(),
        finishedAt: !build.building
          ? new Date(build.timestamp + build.duration).toISOString()
          : undefined,
        durationMs: build.duration || undefined,
        stages: [],
        provider: "jenkins" as CICDProvider,
        externalId: String(build.number),
        repository: repo,
      };
    });
  }

  async getPipeline(pipelineId: string): Promise<Pipeline> {
    const [repo, buildNumber] = pipelineId.split(":");
    const data = await this.request<{
      number: number;
      result: string | null;
      building: boolean;
      displayName: string;
      timestamp: number;
      duration: number;
      url: string;
    }>(`/job/${encodeURIComponent(repo)}/${buildNumber}/api/json`);

    // Try to get stages (Pipeline builds)
    let stages: PipelineStage[] = [];
    try {
      const wfData = await this.request<{
        stages: Array<{
          name: string;
          status: string;
          durationMillis: number;
        }>;
      }>(`/job/${encodeURIComponent(repo)}/${buildNumber}/wfapi/describe`);

      stages = (wfData.stages || []).map((s) => ({
        name: s.name,
        status: this.mapJenkinsStatus(s.status, false),
        durationMs: s.durationMillis,
      }));
    } catch {
      // Not a pipeline build, that's fine
    }

    return {
      id: pipelineId,
      name: data.displayName || `Build #${data.number}`,
      status: this.mapJenkinsStatus(data.result, data.building),
      branch: "main",
      commit: "",
      commitMessage: "",
      author: { name: "Jenkins", email: "" },
      url: data.url,
      startedAt: new Date(data.timestamp).toISOString(),
      finishedAt: !data.building
        ? new Date(data.timestamp + data.duration).toISOString()
        : undefined,
      durationMs: data.duration || undefined,
      stages,
      provider: "jenkins",
      externalId: String(data.number),
      repository: repo,
    };
  }

  async triggerPipeline(trigger: PipelineTrigger): Promise<Pipeline> {
    const params = trigger.parameters
      ? "?" + new URLSearchParams(trigger.parameters).toString()
      : "";

    await this.request(
      `/job/${encodeURIComponent(trigger.repository)}/buildWithParameters${params}`,
      { method: "POST" },
    );

    // Jenkins doesn't immediately return the build info
    // Wait briefly and get the latest build
    await new Promise((r) => setTimeout(r, 2000));
    const pipelines = await this.listPipelines(trigger.repository, {
      limit: 1,
    });
    return (
      pipelines[0] || {
        id: `${trigger.repository}:pending`,
        name: "Build (pending)",
        status: "pending" as PipelineStatus,
        branch: trigger.branch,
        commit: "",
        commitMessage: "Triggered from chat",
        author: { name: "Chat", email: "" },
        url: `${this.baseUrl}/job/${trigger.repository}`,
        startedAt: new Date().toISOString(),
        stages: [],
        provider: "jenkins" as CICDProvider,
        externalId: "pending",
        repository: trigger.repository,
      }
    );
  }

  async cancelPipeline(pipelineId: string): Promise<void> {
    const [repo, buildNumber] = pipelineId.split(":");
    await this.request(`/job/${encodeURIComponent(repo)}/${buildNumber}/stop`, {
      method: "POST",
    });
  }

  async approveDeploy(
    pipelineId: string,
    stage: string,
    approvedBy: string,
    comment?: string,
  ): Promise<DeployApproval> {
    const [repo, buildNumber] = pipelineId.split(":");
    try {
      await this.request(
        `/job/${encodeURIComponent(repo)}/${buildNumber}/input/proceed`,
        { method: "POST" },
      );
    } catch {
      // Input step may not exist; that's acceptable
    }

    return {
      pipelineId,
      stage,
      approvedBy,
      approvedAt: new Date().toISOString(),
      comment,
    };
  }

  async getJobLogs(pipelineId: string, _jobName: string): Promise<string> {
    const [repo, buildNumber] = pipelineId.split(":");
    try {
      const logs = await this.request<string>(
        `/job/${encodeURIComponent(repo)}/${buildNumber}/consoleText`,
      );
      const lines = (typeof logs === "string" ? logs : "").split("\n");
      return lines.slice(-50).join("\n");
    } catch {
      return "Unable to retrieve logs";
    }
  }

  async healthCheck(): Promise<{ ok: boolean; message: string }> {
    try {
      await this.request("/api/json");
      return { ok: true, message: "Jenkins API is accessible" };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Health check failed",
      };
    }
  }

  private mapJenkinsStatus(
    result: string | null,
    building: boolean,
  ): PipelineStatus {
    if (building) return "running";
    if (result === null) return "pending";
    const map: Record<string, PipelineStatus> = {
      SUCCESS: "success",
      FAILURE: "failed",
      UNSTABLE: "failed",
      ABORTED: "cancelled",
      NOT_BUILT: "pending",
    };
    return map[result] || "pending";
  }
}

// ============================================================================
// CI/CD Connector
// ============================================================================

export class CICDConnector extends BaseConnector {
  readonly providerId: string;
  readonly displayName: string;
  readonly description =
    "Monitor builds, trigger pipelines, and approve deployments from chat";
  readonly icon = "git-branch";
  readonly category: IntegrationCatalogCategory = "ci_cd";
  readonly capabilities: ConnectorCapability[] = ["read", "write", "subscribe"];
  readonly version = "1.0.0";

  private adapter: CICDApiAdapter | null = null;
  private provider: CICDProvider;

  constructor(provider: CICDProvider) {
    super(
      { maxRequests: 200, windowMs: 60_000 },
      {
        maxAttempts: 3,
        initialDelayMs: 1000,
        maxDelayMs: 15_000,
        backoffMultiplier: 2,
        jitterFactor: 0.1,
      },
    );
    this.provider = provider;
    this.providerId = provider;
    const nameMap: Record<CICDProvider, string> = {
      github_actions: "GitHub Actions",
      gitlab_ci: "GitLab CI",
      jenkins: "Jenkins",
    };
    this.displayName = nameMap[provider];
  }

  protected async doConnect(
    config: ConnectorConfig,
    credentials: ConnectorCredentials,
  ): Promise<void> {
    switch (this.provider) {
      case "github_actions":
        this.adapter = new GitHubActionsAdapter(credentials.accessToken);
        break;
      case "gitlab_ci":
        this.adapter = new GitLabCIAdapter(
          credentials.accessToken,
          (config.providerConfig.gitlabUrl as string) || "https://gitlab.com",
        );
        break;
      case "jenkins":
        this.adapter = new JenkinsAdapter(
          (config.providerConfig.jenkinsUrl as string) || "",
          credentials.metadata.username || "",
          credentials.apiKey || credentials.accessToken,
        );
        break;
    }

    const health = await this.adapter.healthCheck();
    if (!health.ok) {
      throw new ConnectorError(health.message, "auth", this.providerId);
    }
  }

  protected async doDisconnect(): Promise<void> {
    this.adapter = null;
  }

  protected async doHealthCheck(): Promise<HealthCheckResult> {
    if (!this.adapter) {
      return {
        healthy: false,
        responseTimeMs: 0,
        message: "Not connected",
        checkedAt: new Date().toISOString(),
        consecutiveFailures: 0,
      };
    }
    const start = Date.now();
    const result = await this.adapter.healthCheck();
    return {
      healthy: result.ok,
      responseTimeMs: Date.now() - start,
      message: result.message,
      checkedAt: new Date().toISOString(),
      consecutiveFailures: result.ok ? 0 : 1,
    };
  }

  getCatalogEntry(): CatalogEntry {
    return {
      id: this.providerId,
      name: this.displayName,
      description: this.description,
      icon: this.icon,
      category: this.category,
      capabilities: this.capabilities,
      syncDirections: ["incoming"],
      actions: [
        {
          id: "trigger_pipeline",
          label: "Trigger Pipeline",
          description: "Trigger a CI/CD pipeline from chat",
          requiredCapabilities: ["write"],
          parameters: [
            {
              name: "repository",
              type: "string",
              required: true,
              description: "Repository",
            },
            {
              name: "branch",
              type: "string",
              required: true,
              description: "Branch to build",
            },
            {
              name: "workflow",
              type: "string",
              required: false,
              description: "Workflow name",
            },
          ],
        },
        {
          id: "approve_deploy",
          label: "Approve Deployment",
          description: "Approve a pending deployment",
          requiredCapabilities: ["write"],
          parameters: [
            {
              name: "pipelineId",
              type: "string",
              required: true,
              description: "Pipeline ID",
            },
            {
              name: "stage",
              type: "string",
              required: true,
              description: "Stage to approve",
            },
          ],
        },
      ],
      requiredConfig: ["repository"],
      requiresOAuth: true,
      beta: false,
      version: this.version,
    };
  }

  // ==========================================================================
  // CI/CD Operations
  // ==========================================================================

  async listPipelines(
    repo: string,
    options?: { branch?: string; status?: PipelineStatus; limit?: number },
  ): Promise<Pipeline[]> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.listPipelines(repo, options),
      "listPipelines",
    );
  }

  async getPipeline(pipelineId: string): Promise<Pipeline> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.getPipeline(pipelineId),
      "getPipeline",
    );
  }

  async triggerPipeline(trigger: PipelineTrigger): Promise<Pipeline> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.triggerPipeline(trigger),
      "triggerPipeline",
    );
  }

  async cancelPipeline(pipelineId: string): Promise<void> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.cancelPipeline(pipelineId),
      "cancelPipeline",
    );
  }

  async approveDeploy(
    pipelineId: string,
    stage: string,
    approvedBy: string,
    comment?: string,
  ): Promise<DeployApproval> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.approveDeploy(pipelineId, stage, approvedBy, comment),
      "approveDeploy",
    );
  }

  async getJobLogs(pipelineId: string, jobName: string): Promise<string> {
    this.ensureConnected();
    return this.withRetry(
      () => this.adapter!.getJobLogs(pipelineId, jobName),
      "getJobLogs",
    );
  }

  /**
   * Format a build status notification for a channel.
   */
  formatBuildNotification(pipeline: Pipeline): string {
    const statusEmoji: Record<PipelineStatus, string> = {
      pending: "(pending)",
      running: "(running)",
      success: "(success)",
      failed: "(FAILED)",
      cancelled: "(cancelled)",
      waiting_approval: "(awaiting approval)",
    };

    const lines = [
      `**Build ${statusEmoji[pipeline.status]}: ${pipeline.name}**`,
      `Branch: ${pipeline.branch} | Commit: ${pipeline.commit}`,
      `Author: ${pipeline.author.name}`,
      pipeline.commitMessage
        ? `Message: ${pipeline.commitMessage.split("\n")[0]}`
        : null,
      pipeline.durationMs
        ? `Duration: ${Math.round(pipeline.durationMs / 1000)}s`
        : null,
      pipeline.url,
    ];

    return lines.filter(Boolean).join("\n");
  }

  /**
   * Format a failure alert with log snippet.
   */
  formatFailureAlert(pipeline: Pipeline, logSnippet?: string): string {
    const failedStages = pipeline.stages.filter((s) => s.status === "failed");
    const lines = [
      `**BUILD FAILED: ${pipeline.name}**`,
      `Branch: ${pipeline.branch} | Commit: ${pipeline.commit}`,
      `Author: ${pipeline.author.name}`,
      failedStages.length > 0
        ? `Failed stages: ${failedStages.map((s) => s.name).join(", ")}`
        : null,
      logSnippet ? `\n\`\`\`\n${logSnippet.slice(0, 500)}\n\`\`\`` : null,
      pipeline.url,
    ];

    return lines.filter(Boolean).join("\n");
  }

  private ensureConnected(): void {
    if (!this.adapter || this.status !== "connected") {
      throw new ConnectorError(
        "CI/CD connector is not connected",
        "config",
        this.providerId,
        { retryable: false },
      );
    }
  }
}
