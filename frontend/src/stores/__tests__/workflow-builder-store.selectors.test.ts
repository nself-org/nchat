/**
 * Tests for workflow-builder-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type {
  WorkflowBuilderStore,
  WorkflowBuilderState,
} from "../workflow-builder-store";
import {
  selectWorkflow,
  selectSelectedSteps,
  selectSelectedStep,
  selectSelectedEdge,
  selectCanvasState,
  selectIsDirty,
  selectValidation,
} from "../workflow-builder-store";

import type {
  Workflow,
  WorkflowStep,
  WorkflowEdge,
  CanvasState,
  ValidationResult,
} from "@/lib/workflows/workflow-types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStep(overrides?: Partial<WorkflowStep>): WorkflowStep {
  return {
    id: "step1",
    type: "action",
    name: "Test Step",
    position: { x: 0, y: 0 },
    config: {},
    ...overrides,
  } as WorkflowStep;
}

function makeEdge(overrides?: Partial<WorkflowEdge>): WorkflowEdge {
  return {
    id: "edge1",
    sourceStepId: "step1",
    targetStepId: "step2",
    ...overrides,
  } as WorkflowEdge;
}

function makeWorkflow(overrides?: Partial<Workflow>): Workflow {
  return {
    id: "wf1",
    name: "Test Workflow",
    steps: [],
    edges: [],
    variables: [],
    ...overrides,
  } as Workflow;
}

function makeCanvas(overrides?: Partial<CanvasState>): CanvasState {
  return {
    zoom: 1,
    pan: { x: 0, y: 0 },
    selectedStepIds: [],
    selectedEdgeId: undefined,
    isDragging: false,
    isConnecting: false,
    ...overrides,
  };
}

function makeState(
  overrides?: Partial<WorkflowBuilderState>,
): WorkflowBuilderStore {
  const defaultState: WorkflowBuilderState = {
    workflow: null,
    originalWorkflow: null,
    isDirty: false,
    canvas: makeCanvas(),
    clipboard: null,
    history: [],
    historyIndex: -1,
    maxHistoryLength: 50,
    isLoading: false,
    isSaving: false,
    error: null,
    validation: null,
    sidebarTab: "steps",
    propertiesPanelOpen: false,
    draggedStepType: null,
    draggedStepId: null,
    isConnecting: false,
    connectionStart: null,
  };
  return { ...defaultState, ...overrides } as unknown as WorkflowBuilderStore;
}

// ---------------------------------------------------------------------------
// selectWorkflow
// ---------------------------------------------------------------------------

describe("selectWorkflow", () => {
  it("returns null when no workflow is loaded", () => {
    expect(selectWorkflow(makeState())).toBeNull();
  });

  it("returns the loaded workflow", () => {
    const workflow = makeWorkflow();
    expect(selectWorkflow(makeState({ workflow }))).toBe(workflow);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedSteps
// ---------------------------------------------------------------------------

describe("selectSelectedSteps", () => {
  it("returns empty array when no workflow", () => {
    expect(selectSelectedSteps(makeState())).toEqual([]);
  });

  it("returns empty array when no steps are selected", () => {
    const workflow = makeWorkflow({
      steps: [makeStep({ id: "s1" }), makeStep({ id: "s2" })],
    });
    const canvas = makeCanvas({ selectedStepIds: [] });
    expect(selectSelectedSteps(makeState({ workflow, canvas }))).toEqual([]);
  });

  it("returns the selected steps", () => {
    const s1 = makeStep({ id: "s1" });
    const s2 = makeStep({ id: "s2" });
    const workflow = makeWorkflow({ steps: [s1, s2] });
    const canvas = makeCanvas({ selectedStepIds: ["s1"] });
    const result = selectSelectedSteps(makeState({ workflow, canvas }));
    expect(result).toHaveLength(1);
    expect(result[0]).toBe(s1);
  });

  it("returns multiple selected steps", () => {
    const s1 = makeStep({ id: "s1" });
    const s2 = makeStep({ id: "s2" });
    const s3 = makeStep({ id: "s3" });
    const workflow = makeWorkflow({ steps: [s1, s2, s3] });
    const canvas = makeCanvas({ selectedStepIds: ["s1", "s3"] });
    const result = selectSelectedSteps(makeState({ workflow, canvas }));
    expect(result).toHaveLength(2);
    const ids = result.map((s) => s.id);
    expect(ids).toContain("s1");
    expect(ids).toContain("s3");
  });
});

// ---------------------------------------------------------------------------
// selectSelectedStep
// ---------------------------------------------------------------------------

describe("selectSelectedStep", () => {
  it("returns undefined when no workflow", () => {
    expect(selectSelectedStep(makeState())).toBeUndefined();
  });

  it("returns undefined when no steps are selected", () => {
    const workflow = makeWorkflow({ steps: [makeStep({ id: "s1" })] });
    const canvas = makeCanvas({ selectedStepIds: [] });
    expect(selectSelectedStep(makeState({ workflow, canvas }))).toBeUndefined();
  });

  it("returns undefined when multiple steps are selected", () => {
    const workflow = makeWorkflow({
      steps: [makeStep({ id: "s1" }), makeStep({ id: "s2" })],
    });
    const canvas = makeCanvas({ selectedStepIds: ["s1", "s2"] });
    expect(selectSelectedStep(makeState({ workflow, canvas }))).toBeUndefined();
  });

  it("returns the single selected step", () => {
    const s1 = makeStep({ id: "s1" });
    const workflow = makeWorkflow({ steps: [s1] });
    const canvas = makeCanvas({ selectedStepIds: ["s1"] });
    expect(selectSelectedStep(makeState({ workflow, canvas }))).toBe(s1);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedEdge
// ---------------------------------------------------------------------------

describe("selectSelectedEdge", () => {
  it("returns undefined when no workflow", () => {
    expect(selectSelectedEdge(makeState())).toBeUndefined();
  });

  it("returns undefined when no edge is selected", () => {
    const workflow = makeWorkflow({ edges: [makeEdge({ id: "e1" })] });
    const canvas = makeCanvas({ selectedEdgeId: undefined });
    expect(selectSelectedEdge(makeState({ workflow, canvas }))).toBeUndefined();
  });

  it("returns the selected edge", () => {
    const edge = makeEdge({ id: "e1" });
    const workflow = makeWorkflow({ edges: [edge] });
    const canvas = makeCanvas({ selectedEdgeId: "e1" });
    expect(selectSelectedEdge(makeState({ workflow, canvas }))).toBe(edge);
  });

  it("returns undefined when selected edge id not in workflow", () => {
    const workflow = makeWorkflow({ edges: [] });
    const canvas = makeCanvas({ selectedEdgeId: "missing" });
    expect(selectSelectedEdge(makeState({ workflow, canvas }))).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// selectCanvasState
// ---------------------------------------------------------------------------

describe("selectCanvasState", () => {
  it("returns the canvas state", () => {
    const canvas = makeCanvas({ zoom: 1.5 });
    expect(selectCanvasState(makeState({ canvas }))).toBe(canvas);
  });

  it("returns default canvas state", () => {
    const state = makeState();
    const canvas = selectCanvasState(state);
    expect(canvas.zoom).toBe(1);
    expect(canvas.selectedStepIds).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// selectIsDirty
// ---------------------------------------------------------------------------

describe("selectIsDirty", () => {
  it("returns false when workflow is not dirty", () => {
    expect(selectIsDirty(makeState())).toBe(false);
  });

  it("returns true when workflow is dirty", () => {
    expect(selectIsDirty(makeState({ isDirty: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectValidation
// ---------------------------------------------------------------------------

describe("selectValidation", () => {
  it("returns null when validation has not run", () => {
    expect(selectValidation(makeState())).toBeNull();
  });

  it("returns the validation result", () => {
    const validation: ValidationResult = {
      isValid: true,
      errors: [],
      warnings: [],
    } as ValidationResult;
    expect(selectValidation(makeState({ validation }))).toBe(validation);
  });

  it("returns validation result with errors", () => {
    const validation: ValidationResult = {
      isValid: false,
      errors: [{ message: "Step is missing config" } as never],
      warnings: [],
    } as ValidationResult;
    const result = selectValidation(makeState({ validation }));
    expect(result).toBe(validation);
    expect(result?.isValid).toBe(false);
  });
});
