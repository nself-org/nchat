/**
 * Workflows Plugin Hooks
 * React hooks for using Workflows plugin functionality
 */

import { useState, useCallback } from "react";
import useSWR from "swr";
import {
  workflowsService,
  type Workflow,
  type CreateWorkflowRequest,
  type WorkflowTemplate,
  type WorkflowExecution,
} from "@/services/plugins/workflows.service";

export function useWorkflows() {
  const { data, error, isLoading, mutate } = useSWR<Workflow[]>(
    "/workflows/list",
    () => workflowsService.listWorkflows(),
    { refreshInterval: 30000 },
  );

  return {
    workflows: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useCreateWorkflow() {
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createWorkflow = useCallback(
    async (request: CreateWorkflowRequest): Promise<Workflow | null> => {
      setIsCreating(true);
      setError(null);

      try {
        const workflow = await workflowsService.createWorkflow(request);
        return workflow;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to create workflow"),
        );
        return null;
      } finally {
        setIsCreating(false);
      }
    },
    [],
  );

  return {
    createWorkflow,
    isCreating,
    error,
  };
}

export function useWorkflowExecution() {
  const [isExecuting, setIsExecuting] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const executeWorkflow = useCallback(
    async (
      id: string,
      payload?: Record<string, any>,
    ): Promise<WorkflowExecution | null> => {
      setIsExecuting(true);
      setError(null);

      try {
        const execution = await workflowsService.executeWorkflow(id, payload);
        return execution;
      } catch (err) {
        setError(
          err instanceof Error ? err : new Error("Failed to execute workflow"),
        );
        return null;
      } finally {
        setIsExecuting(false);
      }
    },
    [],
  );

  return {
    executeWorkflow,
    isExecuting,
    error,
  };
}

export function useWorkflowTemplates() {
  const { data, error, isLoading, mutate } = useSWR<WorkflowTemplate[]>(
    "/workflows/templates",
    () => workflowsService.getTemplates(),
  );

  return {
    templates: data || [],
    isLoading,
    error,
    refresh: mutate,
  };
}

export function useWorkflowsHealth() {
  const { data, error, isLoading, mutate } = useSWR(
    "/workflows/health",
    () => workflowsService.checkHealth(),
    { refreshInterval: 30000 },
  );

  return {
    health: data,
    isHealthy: data?.status === "healthy",
    isLoading,
    error,
    checkHealth: mutate,
  };
}
