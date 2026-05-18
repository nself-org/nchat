/**
 * Workflows Plugin Service
 * Client-side service for interacting with Workflows plugin API
 */

export interface WorkflowTrigger {
  type: "event" | "schedule";
  eventType?: string;
  schedule?: string;
  conditions?: Record<string, any>;
}

export interface WorkflowAction {
  type: string;
  params: Record<string, any>;
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkflowRequest {
  name: string;
  description: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  status: "pending" | "running" | "completed" | "failed";
  startedAt: string;
  completedAt?: string;
  error?: string;
  result?: any;
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
}

class WorkflowsService {
  private baseUrl = "/api/plugins/workflows";

  async listWorkflows(): Promise<Workflow[]> {
    const response = await fetch(`${this.baseUrl}/list`);

    if (!response.ok) {
      throw new Error(`Failed to fetch workflows: ${response.statusText}`);
    }

    const data = await response.json();
    return data.workflows || [];
  }

  async createWorkflow(request: CreateWorkflowRequest): Promise<Workflow> {
    const response = await fetch(`${this.baseUrl}/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      throw new Error(`Failed to create workflow: ${response.statusText}`);
    }

    const data = await response.json();
    return data.workflow;
  }

  async executeWorkflow(
    id: string,
    payload?: Record<string, any>,
  ): Promise<WorkflowExecution> {
    const response = await fetch(`${this.baseUrl}/${id}/execute`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ payload: payload || {} }),
    });

    if (!response.ok) {
      throw new Error(`Failed to execute workflow: ${response.statusText}`);
    }

    const data = await response.json();
    return data.execution;
  }

  async getTemplates(): Promise<WorkflowTemplate[]> {
    const response = await fetch(`${this.baseUrl}/templates`);

    if (!response.ok) {
      throw new Error(`Failed to fetch templates: ${response.statusText}`);
    }

    const data = await response.json();
    return data.templates || [];
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      return response.json();
    } catch (error) {
      return {
        status: "unhealthy",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const workflowsService = new WorkflowsService();
