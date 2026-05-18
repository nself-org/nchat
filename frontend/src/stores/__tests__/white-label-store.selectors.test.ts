/**
 * Tests for white-label-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { WhiteLabelStore } from "../white-label-store";
import {
  selectCurrentStep,
  selectCompletedSteps,
  selectProgress,
  selectIsFirstStep,
  selectIsLastStep,
  selectCanProceed,
} from "../white-label-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStep(
  id: string,
  overrides?: { completed?: boolean; skippable?: boolean },
) {
  return {
    id,
    title: id,
    description: `${id} description`,
    completed: overrides?.completed ?? false,
    skippable: overrides?.skippable ?? false,
  };
}

function makeState(overrides?: Partial<Record<string, unknown>>): WhiteLabelStore {
  const steps = [
    makeStep("app-info", { skippable: false }),
    makeStep("logo", { skippable: true }),
    makeStep("colors", { skippable: false }),
  ];
  const defaultState = {
    currentStep: 0,
    steps,
    isWizardOpen: false,
    config: {},
    isDirty: false,
    lastSaved: null,
    generatedFavicons: [],
    previewLogo: null,
    previewFavicon: null,
    isLoading: false,
    isSaving: false,
    isExporting: false,
    error: null,
    validationErrors: [],
    isValid: true,
  };
  return { ...defaultState, ...overrides } as unknown as WhiteLabelStore;
}

// ---------------------------------------------------------------------------
// selectCurrentStep
// ---------------------------------------------------------------------------

describe("selectCurrentStep", () => {
  it("returns the step at currentStep index 0", () => {
    const state = makeState();
    const result = selectCurrentStep(state);
    expect(result.id).toBe("app-info");
  });

  it("returns the step at currentStep index 1", () => {
    const state = makeState({ currentStep: 1 });
    const result = selectCurrentStep(state);
    expect(result.id).toBe("logo");
  });

  it("returns the step at currentStep index 2", () => {
    const state = makeState({ currentStep: 2 });
    const result = selectCurrentStep(state);
    expect(result.id).toBe("colors");
  });
});

// ---------------------------------------------------------------------------
// selectCompletedSteps
// ---------------------------------------------------------------------------

describe("selectCompletedSteps", () => {
  it("returns empty array when no steps are completed", () => {
    expect(selectCompletedSteps(makeState())).toEqual([]);
  });

  it("returns only completed steps", () => {
    const steps = [
      makeStep("app-info", { completed: true }),
      makeStep("logo", { completed: false }),
      makeStep("colors", { completed: true }),
    ];
    const result = selectCompletedSteps(makeState({ steps }));
    expect(result).toHaveLength(2);
    expect(result.every((s: { completed: boolean }) => s.completed)).toBe(true);
  });

  it("returns all steps when all are completed", () => {
    const steps = [
      makeStep("app-info", { completed: true }),
      makeStep("logo", { completed: true }),
      makeStep("colors", { completed: true }),
    ];
    expect(selectCompletedSteps(makeState({ steps }))).toHaveLength(3);
  });
});

// ---------------------------------------------------------------------------
// selectProgress
// ---------------------------------------------------------------------------

describe("selectProgress", () => {
  it("returns 0 when no steps are completed", () => {
    expect(selectProgress(makeState())).toBe(0);
  });

  it("returns 33 when 1 of 3 steps is completed", () => {
    const steps = [
      makeStep("app-info", { completed: true }),
      makeStep("logo", { completed: false }),
      makeStep("colors", { completed: false }),
    ];
    expect(selectProgress(makeState({ steps }))).toBe(33);
  });

  it("returns 100 when all steps are completed", () => {
    const steps = [
      makeStep("app-info", { completed: true }),
      makeStep("logo", { completed: true }),
      makeStep("colors", { completed: true }),
    ];
    expect(selectProgress(makeState({ steps }))).toBe(100);
  });

  it("returns 67 when 2 of 3 steps are completed", () => {
    const steps = [
      makeStep("app-info", { completed: true }),
      makeStep("logo", { completed: true }),
      makeStep("colors", { completed: false }),
    ];
    expect(selectProgress(makeState({ steps }))).toBe(67);
  });
});

// ---------------------------------------------------------------------------
// selectIsFirstStep
// ---------------------------------------------------------------------------

describe("selectIsFirstStep", () => {
  it("returns true when currentStep is 0", () => {
    expect(selectIsFirstStep(makeState())).toBe(true);
  });

  it("returns false when currentStep is 1", () => {
    expect(selectIsFirstStep(makeState({ currentStep: 1 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectIsLastStep
// ---------------------------------------------------------------------------

describe("selectIsLastStep", () => {
  it("returns false when on the first step of 3", () => {
    expect(selectIsLastStep(makeState())).toBe(false);
  });

  it("returns true when currentStep is the last index", () => {
    // 3 steps → last index is 2
    expect(selectIsLastStep(makeState({ currentStep: 2 }))).toBe(true);
  });

  it("returns false when on the middle step", () => {
    expect(selectIsLastStep(makeState({ currentStep: 1 }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectCanProceed
// ---------------------------------------------------------------------------

describe("selectCanProceed", () => {
  it("returns false when current step is not complete and not skippable", () => {
    // app-info: skippable=false, completed=false
    expect(selectCanProceed(makeState({ currentStep: 0 }))).toBe(false);
  });

  it("returns true when current step is skippable", () => {
    // logo: skippable=true, completed=false
    expect(selectCanProceed(makeState({ currentStep: 1 }))).toBe(true);
  });

  it("returns true when current step is completed", () => {
    const steps = [
      makeStep("app-info", { completed: true, skippable: false }),
      makeStep("logo", { completed: false, skippable: true }),
      makeStep("colors", { completed: false, skippable: false }),
    ];
    expect(selectCanProceed(makeState({ currentStep: 0, steps }))).toBe(true);
  });

  it("returns false when current step is not completed and not skippable", () => {
    // colors: skippable=false, completed=false
    expect(selectCanProceed(makeState({ currentStep: 2 }))).toBe(false);
  });
});
