/**
 * Tests for modal-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { ModalStore, ModalConfig, ModalType } from "../modal-store";
import {
  selectModals,
  selectIsAnyModalOpen,
  selectTopModal,
} from "../modal-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeModal(overrides?: Partial<Record<string, unknown>>): ModalConfig {
  return {
    id: "modal-1",
    type: "confirm" as ModalType,
    props: {},
    priority: 0,
    ...overrides,
  } as ModalConfig;
}

function makeState(overrides?: Partial<Record<string, unknown>>): ModalStore {
  const defaultState = {
    modals: [],
    isAnyModalOpen: false,
    // stub actions — selectors only read state fields
    openModal: () => "",
    closeModal: () => undefined,
    closeTopModal: () => undefined,
    closeAllModals: () => undefined,
    updateModal: () => undefined,
    getModal: () => undefined,
    getTopModal: () => undefined,
  };
  return { ...defaultState, ...overrides } as unknown as ModalStore;
}

// ---------------------------------------------------------------------------
// selectModals
// ---------------------------------------------------------------------------

describe("selectModals", () => {
  it("returns empty array by default", () => {
    expect(selectModals(makeState())).toEqual([]);
  });

  it("returns the modals array", () => {
    const modals = [makeModal()];
    expect(selectModals(makeState({ modals }))).toBe(modals);
  });
});

// ---------------------------------------------------------------------------
// selectIsAnyModalOpen
// ---------------------------------------------------------------------------

describe("selectIsAnyModalOpen", () => {
  it("returns false by default", () => {
    expect(selectIsAnyModalOpen(makeState())).toBe(false);
  });

  it("returns true when a modal is open", () => {
    expect(selectIsAnyModalOpen(makeState({ isAnyModalOpen: true }))).toBe(
      true,
    );
  });
});

// ---------------------------------------------------------------------------
// selectTopModal
// ---------------------------------------------------------------------------

describe("selectTopModal", () => {
  it("returns undefined when no modals are open", () => {
    expect(selectTopModal(makeState())).toBeUndefined();
  });

  it("returns the last modal when multiple modals are stacked", () => {
    const first = makeModal({ id: "modal-1" });
    const second = makeModal({ id: "modal-2", type: "alert" as ModalType });
    const modals = [first, second];
    const result = selectTopModal(makeState({ modals }));
    expect(result).toBe(second);
  });

  it("returns the only modal when one modal is open", () => {
    const modal = makeModal({ id: "modal-confirm" });
    const result = selectTopModal(makeState({ modals: [modal] }));
    expect(result).toBe(modal);
  });
});
