"use client";

/**
 * WorkflowBuilder - Main visual workflow builder component
 *
 * Provides a drag-and-drop interface for creating and editing workflows
 */

import * as React from "react";
import { cn } from "@/lib/utils";
import { useWorkflowBuilderStore } from "@/stores/workflow-builder-store";
import { WorkflowCanvas } from "./WorkflowCanvas";
import { WorkflowSidebar } from "./WorkflowSidebar";
import { WorkflowToolbar } from "./WorkflowToolbar";
import { WorkflowProperties } from "./WorkflowProperties";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, Loader2, Save, X } from "lucide-react";

interface WorkflowBuilderProps {
  className?: string;
  onSave?: () => void;
  onClose?: () => void;
}

export function WorkflowBuilder({
  className,
  onSave,
  onClose,
}: WorkflowBuilderProps) {
  const {
    workflow,
    isDirty,
    isLoading,
    isSaving,
    error,
    validation,
    propertiesPanelOpen,
    canvas,
    saveWorkflow,
    validate,
    setError,
  } = useWorkflowBuilderStore();

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Save: Ctrl/Cmd + S
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }

      // Undo: Ctrl/Cmd + Z
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        useWorkflowBuilderStore.getState().undo();
      }

      // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
      if (
        ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === "z") ||
        ((e.metaKey || e.ctrlKey) && e.key === "y")
      ) {
        e.preventDefault();
        useWorkflowBuilderStore.getState().redo();
      }

      // Delete: Backspace or Delete
      if (e.key === "Backspace" || e.key === "Delete") {
        const state = useWorkflowBuilderStore.getState();
        if (state.canvas.selectedStepIds.length > 0) {
          for (const stepId of state.canvas.selectedStepIds) {
            state.deleteStep(stepId);
          }
        } else if (state.canvas.selectedEdgeId) {
          state.deleteEdge(state.canvas.selectedEdgeId);
        }
      }

      // Select all: Ctrl/Cmd + A
      if ((e.metaKey || e.ctrlKey) && e.key === "a") {
        e.preventDefault();
        useWorkflowBuilderStore.getState().selectAll();
      }

      // Copy: Ctrl/Cmd + C
      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        e.preventDefault();
        useWorkflowBuilderStore.getState().copySelection();
      }

      // Cut: Ctrl/Cmd + X
      if ((e.metaKey || e.ctrlKey) && e.key === "x") {
        e.preventDefault();
        useWorkflowBuilderStore.getState().cutSelection();
      }

      // Paste: Ctrl/Cmd + V
      if ((e.metaKey || e.ctrlKey) && e.key === "v") {
        e.preventDefault();
        useWorkflowBuilderStore.getState().paste();
      }

      // Escape: Clear selection or cancel connection
      if (e.key === "Escape") {
        const state = useWorkflowBuilderStore.getState();
        if (state.isConnecting) {
          state.cancelConnection();
        } else {
          state.clearSelection();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSave = async () => {
    const validationResult = validate();

    if (!validationResult.isValid) {
      return;
    }

    await saveWorkflow();
    onSave?.();
  };

  const handleClose = () => {
    if (isDirty) {
      // Could show a confirmation dialog here
      if (
        !window.confirm(
          "You have unsaved changes. Are you sure you want to close?",
        )
      ) {
        return;
      }
    }
    onClose?.();
  };

  if (isLoading) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <p className="text-muted-foreground">No workflow loaded</p>
      </div>
    );
  }

  return (
    <div className={cn("flex h-full flex-col bg-background", className)}>
      {/* Header */}
      <div className="flex items-center justify-between border-b bg-card px-4 py-2">
        <div className="flex items-center gap-4">
          <h2 className="text-lg font-semibold">{workflow.name}</h2>
          {isDirty && (
            <span className="text-xs text-muted-foreground">(unsaved)</span>
          )}
          {workflow.status === "active" && (
            <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
              Active
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Validation status */}
          {validation && (
            <div className="flex items-center gap-1 text-sm">
              {validation.isValid ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
              <span className="text-muted-foreground">
                {validation.errors.length} errors, {validation.warnings.length}{" "}
                warnings
              </span>
            </div>
          )}

          {/* Save button */}
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-1 h-4 w-4" />
            )}
            Save
          </Button>

          {/* Close button */}
          {onClose && (
            <Button variant="ghost" size="sm" onClick={handleClose}>
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-destructive/10 flex items-center justify-between px-4 py-2 text-sm text-destructive">
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="h-6 w-6 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <WorkflowSidebar className="w-64 border-r" />

        {/* Canvas area */}
        <div className="flex flex-1 flex-col">
          {/* Toolbar */}
          <WorkflowToolbar className="border-b" />

          {/* Canvas */}
          <WorkflowCanvas className="flex-1" />
        </div>

        {/* Properties panel */}
        {propertiesPanelOpen && (
          <WorkflowProperties className="w-80 border-l" />
        )}
      </div>
    </div>
  );
}

export default WorkflowBuilder;
