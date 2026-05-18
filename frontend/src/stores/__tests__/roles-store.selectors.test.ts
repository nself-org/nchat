/**
 * Tests for roles-store selectors
 *
 * All selectors are pure functions that receive the store state.
 * Tests construct minimal plain-object state and call selectors directly.
 */

import type { RolesStore } from "../roles-store";
import {
  selectRoles,
  selectRolesById,
  selectSelectedRole,
  selectEditingRole,
  selectIsLoading,
  selectError,
  selectIsDirty,
  selectValidationErrors,
  selectBulkAssignment,
  selectHistory,
} from "../roles-store";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeState(overrides?: Partial<Record<string, unknown>>): RolesStore {
  const defaultState = {
    roles: [],
    rolesById: {},
    isLoading: false,
    error: null,
    selectedRoleId: null,
    editingRole: null,
    isDirty: false,
    validationErrors: [],
    userRoles: {},
    roleMembers: {},
    history: [],
    historyLoading: false,
    bulkAssignment: {
      userIds: [],
      roleIds: [],
      action: "add",
      isProcessing: false,
      progress: 0,
      errors: [],
    },
    matrixExpandedCategories: ["general", "messages"],
    searchQuery: "",
    filterBuiltIn: null,
    sortBy: "position",
    sortOrder: "desc",
  };
  return { ...defaultState, ...overrides } as unknown as RolesStore;
}

// ---------------------------------------------------------------------------
// selectRoles
// ---------------------------------------------------------------------------

describe("selectRoles", () => {
  it("returns empty array by default", () => {
    expect(selectRoles(makeState())).toEqual([]);
  });

  it("returns the roles array", () => {
    const roles = [{ id: "r1", name: "Admin" } as never];
    expect(selectRoles(makeState({ roles }))).toBe(roles);
  });
});

// ---------------------------------------------------------------------------
// selectRolesById
// ---------------------------------------------------------------------------

describe("selectRolesById", () => {
  it("returns empty object by default", () => {
    expect(selectRolesById(makeState())).toEqual({});
  });

  it("returns the rolesById map", () => {
    const rolesById = { r1: { id: "r1", name: "Admin" } as never };
    expect(selectRolesById(makeState({ rolesById }))).toBe(rolesById);
  });
});

// ---------------------------------------------------------------------------
// selectSelectedRole
// ---------------------------------------------------------------------------

describe("selectSelectedRole", () => {
  it("returns null when no role is selected", () => {
    expect(selectSelectedRole(makeState())).toBeNull();
  });

  it("returns undefined when selectedRoleId has no matching role", () => {
    expect(
      selectSelectedRole(
        makeState({ selectedRoleId: "missing", rolesById: {} }),
      ),
    ).toBeUndefined();
  });

  it("returns the role when selectedRoleId matches", () => {
    const role = { id: "r1", name: "Admin" } as never;
    expect(
      selectSelectedRole(
        makeState({ selectedRoleId: "r1", rolesById: { r1: role } }),
      ),
    ).toBe(role);
  });
});

// ---------------------------------------------------------------------------
// selectEditingRole
// ---------------------------------------------------------------------------

describe("selectEditingRole", () => {
  it("returns null by default", () => {
    expect(selectEditingRole(makeState())).toBeNull();
  });

  it("returns the editing role when set", () => {
    const editingRole = { name: "Draft Role" } as never;
    expect(selectEditingRole(makeState({ editingRole }))).toBe(editingRole);
  });
});

// ---------------------------------------------------------------------------
// selectIsLoading
// ---------------------------------------------------------------------------

describe("selectIsLoading", () => {
  it("returns false by default", () => {
    expect(selectIsLoading(makeState())).toBe(false);
  });

  it("returns true when loading", () => {
    expect(selectIsLoading(makeState({ isLoading: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectError
// ---------------------------------------------------------------------------

describe("selectError", () => {
  it("returns null by default", () => {
    expect(selectError(makeState())).toBeNull();
  });

  it("returns the error string when set", () => {
    expect(selectError(makeState({ error: "Failed to fetch roles" }))).toBe(
      "Failed to fetch roles",
    );
  });
});

// ---------------------------------------------------------------------------
// selectIsDirty
// ---------------------------------------------------------------------------

describe("selectIsDirty", () => {
  it("returns false by default", () => {
    expect(selectIsDirty(makeState())).toBe(false);
  });

  it("returns true when dirty", () => {
    expect(selectIsDirty(makeState({ isDirty: true }))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// selectValidationErrors
// ---------------------------------------------------------------------------

describe("selectValidationErrors", () => {
  it("returns empty array by default", () => {
    expect(selectValidationErrors(makeState())).toEqual([]);
  });

  it("returns the validation errors array", () => {
    const validationErrors = ["Name is required", "Permission denied"];
    expect(selectValidationErrors(makeState({ validationErrors }))).toBe(
      validationErrors,
    );
  });
});

// ---------------------------------------------------------------------------
// selectBulkAssignment
// ---------------------------------------------------------------------------

describe("selectBulkAssignment", () => {
  it("returns the default bulk assignment state", () => {
    const result = selectBulkAssignment(makeState());
    expect(result.isProcessing).toBe(false);
    expect(result.progress).toBe(0);
    expect(result.errors).toEqual([]);
  });

  it("returns the custom bulk assignment state", () => {
    const bulkAssignment = {
      userIds: ["u1"],
      roleIds: ["r1"],
      action: "add",
      isProcessing: true,
      progress: 50,
      errors: [],
    } as never;
    expect(selectBulkAssignment(makeState({ bulkAssignment }))).toBe(
      bulkAssignment,
    );
  });
});

// ---------------------------------------------------------------------------
// selectHistory
// ---------------------------------------------------------------------------

describe("selectHistory", () => {
  it("returns empty array by default", () => {
    expect(selectHistory(makeState())).toEqual([]);
  });

  it("returns the history array", () => {
    const history = [{ id: "h1", action: "create" } as never];
    expect(selectHistory(makeState({ history }))).toBe(history);
  });
});
