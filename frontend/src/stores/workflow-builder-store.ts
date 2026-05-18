/**
 * Workflow Builder Store - Manages workflow builder state
 *
 * Handles the visual workflow builder including canvas state,
 * selected elements, drag-drop, and undo/redo
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  Workflow,
  WorkflowStep,
  WorkflowEdge,
  WorkflowVariable,
  Position,
  CanvasState,
  StepType,
  ValidationResult,
  WorkflowStatus,
} from "@/lib/workflows/workflow-types";

import {
  createWorkflow,
  addStep as engineAddStep,
  updateStep as engineUpdateStep,
  removeStep as engineRemoveStep,
  addEdge as engineAddEdge,
  removeEdge as engineRemoveEdge,
  addVariable as engineAddVariable,
  updateVariable as engineUpdateVariable,
  removeVariable as engineRemoveVariable,
  updateSettings as engineUpdateSettings,
  validateWorkflow,
  cloneWorkflow,
} from "@/lib/workflows/workflow-engine";

import { createStep, cloneStep } from "@/lib/workflows/workflow-steps";

// ============================================================================
// Types
// ============================================================================

export interface HistoryEntry {
  workflow: Workflow;
  description: string;
  timestamp: number;
}

export interface WorkflowBuilderState {
  // Current workflow
  workflow: Workflow | null;
  originalWorkflow: Workflow | null; // For detecting changes
  isDirty: boolean;

  // Canvas state
  canvas: CanvasState;

  // Clipboard
  clipboard: {
    steps: WorkflowStep[];
    edges: WorkflowEdge[];
  } | null;

  // History for undo/redo
  history: HistoryEntry[];
  historyIndex: number;
  maxHistoryLength: number;

  // UI state
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  validation: ValidationResult | null;

  // Sidebar state
  sidebarTab: "steps" | "variables" | "settings" | "properties";
  propertiesPanelOpen: boolean;

  // Drag state
  draggedStepType: StepType | null;
  draggedStepId: string | null;

  // Connection state
  isConnecting: boolean;
  connectionStart: { stepId: string; handleId?: string } | null;
}

export interface WorkflowBuilderActions {
  // Workflow management
  newWorkflow: (name: string, createdBy: string) => void;
  loadWorkflow: (workflow: Workflow) => void;
  saveWorkflow: () => Promise<void>;
  closeWorkflow: () => void;
  duplicateWorkflow: (newName: string, createdBy: string) => Workflow | null;

  // Step operations
  addStep: (type: StepType, position: Position) => WorkflowStep | null;
  updateStep: (stepId: string, updates: Partial<WorkflowStep>) => void;
  deleteStep: (stepId: string) => void;
  duplicateStep: (stepId: string) => WorkflowStep | null;
  moveStep: (stepId: string, position: Position) => void;

  // Edge operations
  addEdge: (edge: Omit<WorkflowEdge, "id">) => WorkflowEdge | null;
  deleteEdge: (edgeId: string) => void;

  // Variable operations
  addVariable: (variable: Omit<WorkflowVariable, "id">) => void;
  updateVariable: (
    variableId: string,
    updates: Partial<WorkflowVariable>,
  ) => void;
  deleteVariable: (variableId: string) => void;

  // Selection
  selectStep: (stepId: string, addToSelection?: boolean) => void;
  selectSteps: (stepIds: string[]) => void;
  selectEdge: (edgeId: string) => void;
  clearSelection: () => void;
  selectAll: () => void;

  // Clipboard
  copySelection: () => void;
  cutSelection: () => void;
  paste: (offset?: Position) => void;

  // Canvas
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomToFit: () => void;
  resetZoom: () => void;
  setPan: (pan: Position) => void;
  centerCanvas: () => void;

  // Drag and drop
  startDrag: (stepType: StepType) => void;
  startStepDrag: (stepId: string) => void;
  endDrag: () => void;

  // Connection
  startConnection: (stepId: string, handleId?: string) => void;
  endConnection: (stepId: string, handleId?: string) => void;
  cancelConnection: () => void;

  // History
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // UI
  setSidebarTab: (
    tab: "steps" | "variables" | "settings" | "properties",
  ) => void;
  togglePropertiesPanel: () => void;
  setPropertiesPanelOpen: (open: boolean) => void;

  // Validation
  validate: () => ValidationResult;
  clearValidation: () => void;

  // Utility
  setError: (error: string | null) => void;
  setLoading: (loading: boolean) => void;
  setSaving: (saving: boolean) => void;
  reset: () => void;
}

export type WorkflowBuilderStore = WorkflowBuilderState &
  WorkflowBuilderActions;

// ============================================================================
// Initial State
// ============================================================================

const initialCanvasState: CanvasState = {
  zoom: 1,
  pan: { x: 0, y: 0 },
  selectedStepIds: [],
  selectedEdgeId: undefined,
  isDragging: false,
  isConnecting: false,
};

const initialState: WorkflowBuilderState = {
  workflow: null,
  originalWorkflow: null,
  isDirty: false,
  canvas: initialCanvasState,
  clipboard: null,
  history: [],
  historyIndex: -1,
  maxHistoryLength: 50,
  isLoading: false,
  isSaving: false,
  error: null,
  validation: null,
  sidebarTab: "steps",
  propertiesPanelOpen: true,
  draggedStepType: null,
  draggedStepId: null,
  isConnecting: false,
  connectionStart: null,
};

// ============================================================================
// Store
// ============================================================================

export const useWorkflowBuilderStore = create<WorkflowBuilderStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // ========================================
        // Workflow Management
        // ========================================

        newWorkflow: (name, createdBy) => {
          const workflow = createWorkflow(name, createdBy);
          set(
            (state) => {
              state.workflow = workflow;
              state.originalWorkflow = JSON.parse(JSON.stringify(workflow));
              state.isDirty = false;
              state.history = [
                {
                  workflow: JSON.parse(JSON.stringify(workflow)),
                  description: "Created workflow",
                  timestamp: Date.now(),
                },
              ];
              state.historyIndex = 0;
              state.canvas = { ...initialCanvasState };
              state.validation = null;
              state.error = null;
            },
            false,
            "workflow/new",
          );
        },

        loadWorkflow: (workflow) => {
          set(
            (state) => {
              state.workflow = workflow;
              state.originalWorkflow = JSON.parse(JSON.stringify(workflow));
              state.isDirty = false;
              state.history = [
                {
                  workflow: JSON.parse(JSON.stringify(workflow)),
                  description: "Loaded workflow",
                  timestamp: Date.now(),
                },
              ];
              state.historyIndex = 0;
              state.canvas = { ...initialCanvasState };
              state.validation = null;
              state.error = null;
            },
            false,
            "workflow/load",
          );
        },

        saveWorkflow: async () => {
          const { workflow } = get();
          if (!workflow) return;

          set((state) => {
            state.isSaving = true;
          });

          try {
            // In a real implementation, this would call an API
            // await saveWorkflowToBackend(workflow)

            set(
              (state) => {
                state.originalWorkflow = JSON.parse(
                  JSON.stringify(state.workflow),
                );
                state.isDirty = false;
                state.isSaving = false;
              },
              false,
              "workflow/save",
            );
          } catch (error) {
            set((state) => {
              state.error =
                error instanceof Error ? error.message : "Failed to save";
              state.isSaving = false;
            });
          }
        },

        closeWorkflow: () => {
          set(
            () => ({
              ...initialState,
            }),
            false,
            "workflow/close",
          );
        },

        duplicateWorkflow: (newName, createdBy) => {
          const { workflow } = get();
          if (!workflow) return null;

          const cloned = cloneWorkflow(workflow, newName, createdBy);

          set(
            (state) => {
              state.workflow = cloned;
              state.originalWorkflow = JSON.parse(JSON.stringify(cloned));
              state.isDirty = false;
              state.history = [
                {
                  workflow: JSON.parse(JSON.stringify(cloned)),
                  description: "Duplicated workflow",
                  timestamp: Date.now(),
                },
              ];
              state.historyIndex = 0;
            },
            false,
            "workflow/duplicate",
          );

          return cloned;
        },

        // ========================================
        // Step Operations
        // ========================================

        addStep: (type, position) => {
          const { workflow } = get();
          if (!workflow) return null;

          const step = createStep(type, position);

          set(
            (state) => {
              if (!state.workflow) return;
              state.workflow = engineAddStep(state.workflow, step);
              state.isDirty = true;
              state.canvas.selectedStepIds = [step.id];
              state.canvas.selectedEdgeId = undefined;
              pushHistory(state, `Added ${type} step`);
            },
            false,
            "workflow/addStep",
          );

          return step;
        },

        updateStep: (stepId, updates) => {
          set(
            (state) => {
              if (!state.workflow) return;
              state.workflow = engineUpdateStep(
                state.workflow,
                stepId,
                updates,
              );
              state.isDirty = true;
              pushHistory(state, "Updated step");
            },
            false,
            "workflow/updateStep",
          );
        },

        deleteStep: (stepId) => {
          set(
            (state) => {
              if (!state.workflow) return;
              state.workflow = engineRemoveStep(state.workflow, stepId);
              state.isDirty = true;
              state.canvas.selectedStepIds =
                state.canvas.selectedStepIds.filter((id) => id !== stepId);
              pushHistory(state, "Deleted step");
            },
            false,
            "workflow/deleteStep",
          );
        },

        duplicateStep: (stepId) => {
          const { workflow } = get();
          if (!workflow) return null;

          const step = workflow.steps.find((s) => s.id === stepId);
          if (!step) return null;

          const cloned = cloneStep(step, { x: 50, y: 50 });

          set(
            (state) => {
              if (!state.workflow) return;
              state.workflow = engineAddStep(state.workflow, cloned);
              state.isDirty = true;
              state.canvas.selectedStepIds = [cloned.id];
              pushHistory(state, "Duplicated step");
            },
            false,
            "workflow/duplicateStep",
          );

          return cloned;
        },

        moveStep: (stepId, position) => {
          set(
            (state) => {
              if (!state.workflow) return;
              const step = state.workflow.steps.find((s) => s.id === stepId);
              if (step) {
                step.position = position;
                state.isDirty = true;
              }
            },
            false,
            "workflow/moveStep",
          );
        },

        // ========================================
        // Edge Operations
        // ========================================

        addEdge: (edgeData) => {
          const { workflow } = get();
          if (!workflow) return null;

          const edge: WorkflowEdge = {
            ...edgeData,
            id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          };

          set(
            (state) => {
              if (!state.workflow) return;
              state.workflow = engineAddEdge(state.workflow, edge);
              state.isDirty = true;
              pushHistory(state, "Added connection");
            },
            false,
            "workflow/addEdge",
          );

          return edge;
        },

        deleteEdge: (edgeId) => {
          set(
            (state) => {
              if (!state.workflow) return;
              state.workflow = engineRemoveEdge(state.workflow, edgeId);
              state.isDirty = true;
              if (state.canvas.selectedEdgeId === edgeId) {
                state.canvas.selectedEdgeId = undefined;
              }
              pushHistory(state, "Deleted connection");
            },
            false,
            "workflow/deleteEdge",
          );
        },

        // ========================================
        // Variable Operations
        // ========================================

        addVariable: (variableData) => {
          const variable: WorkflowVariable = {
            ...variableData,
            id: `var_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          };

          set(
            (state) => {
              if (!state.workflow) return;
              state.workflow = engineAddVariable(state.workflow, variable);
              state.isDirty = true;
              pushHistory(state, "Added variable");
            },
            false,
            "workflow/addVariable",
          );
        },

        updateVariable: (variableId, updates) => {
          set(
            (state) => {
              if (!state.workflow) return;
              state.workflow = engineUpdateVariable(
                state.workflow,
                variableId,
                updates,
              );
              state.isDirty = true;
              pushHistory(state, "Updated variable");
            },
            false,
            "workflow/updateVariable",
          );
        },

        deleteVariable: (variableId) => {
          set(
            (state) => {
              if (!state.workflow) return;
              state.workflow = engineRemoveVariable(state.workflow, variableId);
              state.isDirty = true;
              pushHistory(state, "Deleted variable");
            },
            false,
            "workflow/deleteVariable",
          );
        },

        // ========================================
        // Selection
        // ========================================

        selectStep: (stepId, addToSelection = false) => {
          set(
            (state) => {
              if (addToSelection) {
                if (state.canvas.selectedStepIds.includes(stepId)) {
                  state.canvas.selectedStepIds =
                    state.canvas.selectedStepIds.filter((id) => id !== stepId);
                } else {
                  state.canvas.selectedStepIds.push(stepId);
                }
              } else {
                state.canvas.selectedStepIds = [stepId];
              }
              state.canvas.selectedEdgeId = undefined;
            },
            false,
            "canvas/selectStep",
          );
        },

        selectSteps: (stepIds) => {
          set(
            (state) => {
              state.canvas.selectedStepIds = stepIds;
              state.canvas.selectedEdgeId = undefined;
            },
            false,
            "canvas/selectSteps",
          );
        },

        selectEdge: (edgeId) => {
          set(
            (state) => {
              state.canvas.selectedEdgeId = edgeId;
              state.canvas.selectedStepIds = [];
            },
            false,
            "canvas/selectEdge",
          );
        },

        clearSelection: () => {
          set(
            (state) => {
              state.canvas.selectedStepIds = [];
              state.canvas.selectedEdgeId = undefined;
            },
            false,
            "canvas/clearSelection",
          );
        },

        selectAll: () => {
          set(
            (state) => {
              if (!state.workflow) return;
              state.canvas.selectedStepIds = state.workflow.steps.map(
                (s) => s.id,
              );
              state.canvas.selectedEdgeId = undefined;
            },
            false,
            "canvas/selectAll",
          );
        },

        // ========================================
        // Clipboard
        // ========================================

        copySelection: () => {
          const { workflow, canvas } = get();
          if (!workflow || canvas.selectedStepIds.length === 0) return;

          const selectedSteps = workflow.steps.filter((s) =>
            canvas.selectedStepIds.includes(s.id),
          );
          const selectedStepIds = new Set(canvas.selectedStepIds);
          const selectedEdges = workflow.edges.filter(
            (e) =>
              selectedStepIds.has(e.sourceId) &&
              selectedStepIds.has(e.targetId),
          );

          set(
            (state) => {
              state.clipboard = {
                steps: JSON.parse(JSON.stringify(selectedSteps)),
                edges: JSON.parse(JSON.stringify(selectedEdges)),
              };
            },
            false,
            "clipboard/copy",
          );
        },

        cutSelection: () => {
          const { copySelection, canvas } = get();
          copySelection();

          set(
            (state) => {
              if (!state.workflow) return;
              // Remove selected steps
              for (const stepId of canvas.selectedStepIds) {
                state.workflow = engineRemoveStep(state.workflow!, stepId);
              }
              state.isDirty = true;
              state.canvas.selectedStepIds = [];
              pushHistory(state, "Cut selection");
            },
            false,
            "clipboard/cut",
          );
        },

        paste: (offset = { x: 100, y: 100 }) => {
          const { clipboard, workflow } = get();
          if (!clipboard || !workflow) return;

          // Create new IDs for pasted steps
          const idMap = new Map<string, string>();
          const newSteps: WorkflowStep[] = [];

          for (const step of clipboard.steps) {
            const newId = `${step.type}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
            idMap.set(step.id, newId);
            newSteps.push({
              ...step,
              id: newId,
              position: {
                x: step.position.x + offset.x,
                y: step.position.y + offset.y,
              },
            });
          }

          // Update edges with new IDs
          const newEdges: WorkflowEdge[] = clipboard.edges.map((edge) => ({
            ...edge,
            id: `edge_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            sourceId: idMap.get(edge.sourceId) || edge.sourceId,
            targetId: idMap.get(edge.targetId) || edge.targetId,
          }));

          set(
            (state) => {
              if (!state.workflow) return;
              // Add new steps
              for (const step of newSteps) {
                state.workflow = engineAddStep(state.workflow!, step);
              }
              // Add new edges
              for (const edge of newEdges) {
                state.workflow = engineAddEdge(state.workflow!, edge);
              }
              state.isDirty = true;
              state.canvas.selectedStepIds = newSteps.map((s) => s.id);
              pushHistory(state, "Pasted selection");
            },
            false,
            "clipboard/paste",
          );
        },

        // ========================================
        // Canvas
        // ========================================

        setZoom: (zoom) => {
          set(
            (state) => {
              state.canvas.zoom = Math.min(Math.max(zoom, 0.1), 3);
            },
            false,
            "canvas/setZoom",
          );
        },

        zoomIn: () => {
          set(
            (state) => {
              state.canvas.zoom = Math.min(state.canvas.zoom + 0.1, 3);
            },
            false,
            "canvas/zoomIn",
          );
        },

        zoomOut: () => {
          set(
            (state) => {
              state.canvas.zoom = Math.max(state.canvas.zoom - 0.1, 0.1);
            },
            false,
            "canvas/zoomOut",
          );
        },

        zoomToFit: () => {
          // In a real implementation, this would calculate bounds
          set(
            (state) => {
              state.canvas.zoom = 1;
              state.canvas.pan = { x: 0, y: 0 };
            },
            false,
            "canvas/zoomToFit",
          );
        },

        resetZoom: () => {
          set(
            (state) => {
              state.canvas.zoom = 1;
            },
            false,
            "canvas/resetZoom",
          );
        },

        setPan: (pan) => {
          set(
            (state) => {
              state.canvas.pan = pan;
            },
            false,
            "canvas/setPan",
          );
        },

        centerCanvas: () => {
          set(
            (state) => {
              state.canvas.pan = { x: 0, y: 0 };
            },
            false,
            "canvas/center",
          );
        },

        // ========================================
        // Drag and Drop
        // ========================================

        startDrag: (stepType) => {
          set(
            (state) => {
              state.draggedStepType = stepType;
              state.canvas.isDragging = true;
            },
            false,
            "drag/start",
          );
        },

        startStepDrag: (stepId) => {
          set(
            (state) => {
              state.draggedStepId = stepId;
              state.canvas.isDragging = true;
            },
            false,
            "drag/startStep",
          );
        },

        endDrag: () => {
          set(
            (state) => {
              state.draggedStepType = null;
              state.draggedStepId = null;
              state.canvas.isDragging = false;
            },
            false,
            "drag/end",
          );
        },

        // ========================================
        // Connection
        // ========================================

        startConnection: (stepId, handleId) => {
          set(
            (state) => {
              state.isConnecting = true;
              state.connectionStart = { stepId, handleId };
              state.canvas.isConnecting = true;
              state.canvas.connectionSource = { stepId, handleId };
            },
            false,
            "connection/start",
          );
        },

        endConnection: (stepId, handleId) => {
          const { connectionStart, addEdge } = get();
          if (!connectionStart || connectionStart.stepId === stepId) {
            get().cancelConnection();
            return;
          }

          addEdge({
            sourceId: connectionStart.stepId,
            targetId: stepId,
            sourceHandle: connectionStart.handleId,
            targetHandle: handleId,
            type:
              connectionStart.handleId === "true"
                ? "true"
                : connectionStart.handleId === "false"
                  ? "false"
                  : "default",
          });

          set(
            (state) => {
              state.isConnecting = false;
              state.connectionStart = null;
              state.canvas.isConnecting = false;
              state.canvas.connectionSource = undefined;
            },
            false,
            "connection/end",
          );
        },

        cancelConnection: () => {
          set(
            (state) => {
              state.isConnecting = false;
              state.connectionStart = null;
              state.canvas.isConnecting = false;
              state.canvas.connectionSource = undefined;
            },
            false,
            "connection/cancel",
          );
        },

        // ========================================
        // History
        // ========================================

        undo: () => {
          set(
            (state) => {
              if (state.historyIndex > 0) {
                state.historyIndex--;
                state.workflow = JSON.parse(
                  JSON.stringify(state.history[state.historyIndex].workflow),
                );
                state.isDirty = true;
              }
            },
            false,
            "history/undo",
          );
        },

        redo: () => {
          set(
            (state) => {
              if (state.historyIndex < state.history.length - 1) {
                state.historyIndex++;
                state.workflow = JSON.parse(
                  JSON.stringify(state.history[state.historyIndex].workflow),
                );
                state.isDirty = true;
              }
            },
            false,
            "history/redo",
          );
        },

        canUndo: () => {
          const { historyIndex } = get();
          return historyIndex > 0;
        },

        canRedo: () => {
          const { historyIndex, history } = get();
          return historyIndex < history.length - 1;
        },

        // ========================================
        // UI
        // ========================================

        setSidebarTab: (tab) => {
          set(
            (state) => {
              state.sidebarTab = tab;
            },
            false,
            "ui/setSidebarTab",
          );
        },

        togglePropertiesPanel: () => {
          set(
            (state) => {
              state.propertiesPanelOpen = !state.propertiesPanelOpen;
            },
            false,
            "ui/togglePropertiesPanel",
          );
        },

        setPropertiesPanelOpen: (open) => {
          set(
            (state) => {
              state.propertiesPanelOpen = open;
            },
            false,
            "ui/setPropertiesPanelOpen",
          );
        },

        // ========================================
        // Validation
        // ========================================

        validate: () => {
          const { workflow } = get();
          if (!workflow) {
            return {
              isValid: false,
              errors: [
                { message: "No workflow loaded", severity: "error" as const },
              ],
              warnings: [],
            };
          }

          const result = validateWorkflow(workflow);

          set(
            (state) => {
              state.validation = result;
            },
            false,
            "workflow/validate",
          );

          return result;
        },

        clearValidation: () => {
          set(
            (state) => {
              state.validation = null;
            },
            false,
            "workflow/clearValidation",
          );
        },

        // ========================================
        // Utility
        // ========================================

        setError: (error) => {
          set(
            (state) => {
              state.error = error;
            },
            false,
            "setError",
          );
        },

        setLoading: (loading) => {
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            "setLoading",
          );
        },

        setSaving: (saving) => {
          set(
            (state) => {
              state.isSaving = saving;
            },
            false,
            "setSaving",
          );
        },

        reset: () => {
          set(
            () => ({
              ...initialState,
            }),
            false,
            "reset",
          );
        },
      })),
    ),
    { name: "workflow-builder-store" },
  ),
);

// ============================================================================
// Helper Functions
// ============================================================================

function pushHistory(state: WorkflowBuilderState, description: string): void {
  if (!state.workflow) return;

  // Remove any future history entries
  state.history = state.history.slice(0, state.historyIndex + 1);

  // Add new entry
  state.history.push({
    workflow: JSON.parse(JSON.stringify(state.workflow)),
    description,
    timestamp: Date.now(),
  });

  // Limit history length
  if (state.history.length > state.maxHistoryLength) {
    state.history = state.history.slice(-state.maxHistoryLength);
  }

  state.historyIndex = state.history.length - 1;
}

// ============================================================================
// Selectors
// ============================================================================

export const selectWorkflow = (state: WorkflowBuilderStore) => state.workflow;
export const selectSelectedSteps = (state: WorkflowBuilderStore) =>
  state.workflow?.steps.filter((s) =>
    state.canvas.selectedStepIds.includes(s.id),
  ) || [];
export const selectSelectedStep = (state: WorkflowBuilderStore) =>
  state.canvas.selectedStepIds.length === 1
    ? state.workflow?.steps.find(
        (s) => s.id === state.canvas.selectedStepIds[0],
      )
    : undefined;
export const selectSelectedEdge = (state: WorkflowBuilderStore) =>
  state.canvas.selectedEdgeId
    ? state.workflow?.edges.find((e) => e.id === state.canvas.selectedEdgeId)
    : undefined;
export const selectCanvasState = (state: WorkflowBuilderStore) => state.canvas;
export const selectIsDirty = (state: WorkflowBuilderStore) => state.isDirty;
export const selectValidation = (state: WorkflowBuilderStore) =>
  state.validation;
