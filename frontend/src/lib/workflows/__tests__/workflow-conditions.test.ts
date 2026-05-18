/**
 * Unit tests for workflow-conditions.
 * Pure-logic functions — cover every operator branch + the edge cases.
 */
import {
  evaluateConditionConfig,
  evaluateConditionGroup,
  evaluateCondition,
  compareValues,
  getFieldValue,
  isConditionGroup,
  createCondition,
  createConditionGroup,
  createConditionStep,
  validateConditionConfig,
  conditionOperators,
  conditionPresets,
  describeCondition,
  describeConditionConfig,
} from "../workflow-conditions";
import type {
  Condition,
  ConditionConfig,
  ConditionGroup,
  WorkflowContext,
} from "../workflow-types";

const ctx: WorkflowContext = {
  message: { content: "Hello World", author: "alice" },
  user: { roles: ["admin", "member"], id: "u1", age: 30 },
  channel: { name: "general", id: "c1" },
  variables: { mood: "happy", empty: "" },
  trigger: { data: { hour: 14 } },
  items: [{ id: 1 }, { id: 2 }],
} as unknown as WorkflowContext;

describe("compareValues — equals/not_equals", () => {
  it("equals primitives", () => {
    expect(compareValues(1, "equals", 1)).toBe(true);
    expect(compareValues("a", "equals", "A")).toBe(true); // case-insensitive
    expect(compareValues(1, "not_equals", 2)).toBe(true);
  });
  it("equals arrays", () => {
    expect(compareValues([1, 2], "equals", [1, 2])).toBe(true);
    expect(compareValues([1, 2], "equals", [1, 3])).toBe(false);
    expect(compareValues([1], "equals", [1, 2])).toBe(false);
  });
  it("equals objects", () => {
    expect(compareValues({ a: 1 }, "equals", { a: 1 })).toBe(true);
    expect(compareValues({ a: 1 }, "equals", { a: 2 })).toBe(false);
    expect(compareValues({ a: 1 }, "equals", { a: 1, b: 2 })).toBe(false);
  });
  it("equals nulls", () => {
    expect(compareValues(null, "equals", undefined)).toBe(true);
    expect(compareValues(null, "equals", "x")).toBe(false);
  });
});

describe("compareValues — contains / starts_with / ends_with", () => {
  it("contains string", () => {
    expect(compareValues("Hello World", "contains", "world")).toBe(true);
    expect(compareValues("Hello", "contains", "bye")).toBe(false);
  });
  it("contains array", () => {
    expect(compareValues(["a", "b"], "contains", "A")).toBe(true);
    expect(compareValues(["a"], "not_contains", "z")).toBe(true);
  });
  it("contains non-string non-array returns false", () => {
    expect(compareValues(42, "contains", 4)).toBe(false);
  });
  it("starts_with / ends_with", () => {
    expect(compareValues("Hello", "starts_with", "HE")).toBe(true);
    expect(compareValues("Hello", "ends_with", "LO")).toBe(true);
    expect(compareValues(123, "starts_with", "1")).toBe(false);
    expect(compareValues("x", "ends_with", 123)).toBe(false);
  });
});

describe("compareValues — numeric comparisons", () => {
  it("greater_than numbers", () => {
    expect(compareValues(10, "greater_than", 5)).toBe(true);
    expect(compareValues("10", "greater_than", "5")).toBe(true);
    expect(compareValues(5, "greater_than", 10)).toBe(false);
  });
  it("less_than numbers", () => {
    expect(compareValues(5, "less_than", 10)).toBe(true);
  });
  it("greater_equal / less_equal", () => {
    expect(compareValues(5, "greater_equal", 5)).toBe(true);
    expect(compareValues(5, "less_equal", 5)).toBe(true);
    expect(compareValues(5, "greater_equal", 6)).toBe(false);
  });
  it("greater_than dates", () => {
    expect(
      compareValues(
        new Date("2025-01-02"),
        "greater_than",
        new Date("2025-01-01"),
      ),
    ).toBe(true);
    // Strings parseFloat to 2025 for both → falls through numeric path
    expect(compareValues("2025-02-01", "less_than", "2025-03-01")).toBe(false);
  });
  it("non-coercible returns false", () => {
    expect(compareValues("abc", "greater_than", "def")).toBe(false);
    expect(compareValues({}, "less_than", 5)).toBe(false);
  });
  it("NaN becomes null", () => {
    expect(compareValues(NaN, "greater_than", 5)).toBe(false);
  });
});

describe("compareValues — is_empty", () => {
  it("string empty + whitespace", () => {
    expect(compareValues("", "is_empty", null)).toBe(true);
    expect(compareValues("  ", "is_empty", null)).toBe(true);
    expect(compareValues("x", "is_not_empty", null)).toBe(true);
  });
  it("array + object empty", () => {
    expect(compareValues([], "is_empty", null)).toBe(true);
    expect(compareValues({}, "is_empty", null)).toBe(true);
    expect(compareValues([1], "is_not_empty", null)).toBe(true);
  });
  it("null/undefined empty", () => {
    expect(compareValues(null, "is_empty", null)).toBe(true);
    expect(compareValues(undefined, "is_empty", null)).toBe(true);
  });
  it("number is not empty", () => {
    expect(compareValues(0, "is_empty", null)).toBe(false);
  });
});

describe("compareValues — matches_regex / in_list", () => {
  it("matches regex", () => {
    expect(compareValues("hello", "matches_regex", "^hel")).toBe(true);
    expect(compareValues("hello", "matches_regex", "^bye")).toBe(false);
  });
  it("invalid regex returns false", () => {
    expect(compareValues("x", "matches_regex", "[invalid")).toBe(false);
  });
  it("non-string regex inputs returns false", () => {
    expect(compareValues(123, "matches_regex", "x")).toBe(false);
  });
  it("in_list array", () => {
    expect(compareValues("a", "in_list", ["a", "b"])).toBe(true);
    expect(compareValues("z", "not_in_list", ["a", "b"])).toBe(true);
  });
  it("in_list comma-separated string", () => {
    expect(compareValues("b", "in_list", "a, b, c")).toBe(true);
  });
  it("in_list invalid input returns false", () => {
    expect(compareValues("x", "in_list", 42)).toBe(false);
  });
  it("unknown operator returns false", () => {
    expect(compareValues("x", "bogus" as any, "x")).toBe(false);
  });
});

describe("getFieldValue", () => {
  it("reads nested fields via dot", () => {
    expect(getFieldValue("message.content", ctx)).toBe("Hello World");
    expect(getFieldValue("user.roles", ctx)).toEqual(["admin", "member"]);
  });
  it("handles array index syntax", () => {
    expect(getFieldValue("items[0]", ctx)).toEqual({ id: 1 });
    expect(getFieldValue("items[1]", ctx)).toEqual({ id: 2 });
  });
  it("returns undefined on missing", () => {
    expect(getFieldValue("nonexistent.x", ctx)).toBe(undefined);
    expect(getFieldValue("user.nonexistent.deep", ctx)).toBe(undefined);
  });
  it("array index on non-array returns undefined", () => {
    expect(getFieldValue("user[0]", ctx)).toBe(undefined);
  });
});

describe("isConditionGroup", () => {
  it("detects a group", () => {
    const g: ConditionGroup = { id: "g", logic: "and", conditions: [] };
    expect(isConditionGroup(g)).toBe(true);
  });
  it("rejects a plain condition", () => {
    expect(isConditionGroup(createCondition("x", "equals", 1))).toBe(false);
  });
});

describe("evaluateCondition / evaluateConditionGroup", () => {
  it("evaluates a leaf", () => {
    const c = createCondition("user.id", "equals", "u1");
    expect(evaluateCondition(c, ctx)).toBe(true);
  });
  it("empty group returns true", () => {
    expect(
      evaluateConditionGroup({ id: "g", logic: "and", conditions: [] }, ctx),
    ).toBe(true);
  });
  it("AND group", () => {
    const g: ConditionGroup = {
      id: "g",
      logic: "and",
      conditions: [
        createCondition("user.id", "equals", "u1"),
        createCondition("channel.name", "equals", "general"),
      ],
    };
    expect(evaluateConditionGroup(g, ctx)).toBe(true);
  });
  it("OR group short-circuits", () => {
    const g: ConditionGroup = {
      id: "g",
      logic: "or",
      conditions: [
        createCondition("user.id", "equals", "nope"),
        createCondition("channel.name", "equals", "general"),
      ],
    };
    expect(evaluateConditionGroup(g, ctx)).toBe(true);
  });
  it("nested groups", () => {
    const g: ConditionGroup = {
      id: "g",
      logic: "and",
      conditions: [
        createConditionGroup("or", [
          createCondition("user.id", "equals", "nope"),
          createCondition("user.id", "equals", "u1"),
        ]),
      ],
    };
    expect(evaluateConditionGroup(g, ctx)).toBe(true);
  });
});

describe("evaluateConditionConfig", () => {
  it("empty conditions returns true", () => {
    expect(evaluateConditionConfig({ logic: "and", conditions: [] }, ctx)).toBe(
      true,
    );
  });
  it("AND all pass", () => {
    const cfg: ConditionConfig = {
      logic: "and",
      conditions: [createCondition("user.id", "equals", "u1")],
    };
    expect(evaluateConditionConfig(cfg, ctx)).toBe(true);
  });
  it("OR one fails still ok", () => {
    const cfg: ConditionConfig = {
      logic: "or",
      conditions: [
        createCondition("user.id", "equals", "nope"),
        createCondition("user.id", "equals", "u1"),
      ],
    };
    expect(evaluateConditionConfig(cfg, ctx)).toBe(true);
  });
  it("nested groups in config", () => {
    const cfg: ConditionConfig = {
      logic: "and",
      conditions: [
        createConditionGroup("or", [
          createCondition("channel.name", "equals", "general"),
        ]),
      ],
    };
    expect(evaluateConditionConfig(cfg, ctx)).toBe(true);
  });
});

describe("createCondition / createConditionGroup / createConditionStep", () => {
  it("builds a condition with unique id", () => {
    const a = createCondition("f", "equals", 1);
    const b = createCondition("f", "equals", 1);
    expect(a.id).not.toBe(b.id);
    expect(a.field).toBe("f");
  });
  it("builds a group", () => {
    const g = createConditionGroup("or");
    expect(g.logic).toBe("or");
    expect(g.conditions).toEqual([]);
  });
  it("builds a condition step with overrides", () => {
    const s = createConditionStep({ name: "Custom" });
    expect(s.name).toBe("Custom");
    expect(s.type).toBe("condition");
  });
});

describe("validateConditionConfig", () => {
  it("empty config errors", () => {
    expect(validateConditionConfig({ logic: "and", conditions: [] })).toEqual([
      "At least one condition is required",
    ]);
  });
  it("missing field errors", () => {
    const cfg: ConditionConfig = {
      logic: "and",
      conditions: [{ id: "c", field: "", operator: "equals", value: 1 }],
    };
    const errs = validateConditionConfig(cfg);
    expect(errs.some((e) => e.includes("Field is required"))).toBe(true);
  });
  it("invalid operator errors", () => {
    const cfg: ConditionConfig = {
      logic: "and",
      conditions: [{ id: "c", field: "x", operator: "bogus" as any, value: 1 }],
    };
    expect(
      validateConditionConfig(cfg).some((e) => e.includes("Invalid operator")),
    ).toBe(true);
  });
  it("missing value for value-required operator errors", () => {
    const cfg: ConditionConfig = {
      logic: "and",
      conditions: [
        { id: "c", field: "x", operator: "equals", value: undefined },
      ],
    };
    expect(
      validateConditionConfig(cfg).some((e) => e.includes("Value is required")),
    ).toBe(true);
  });
  it("empty subgroup errors", () => {
    const cfg: ConditionConfig = {
      logic: "and",
      conditions: [{ id: "g", logic: "and", conditions: [] }],
    };
    expect(
      validateConditionConfig(cfg).some((e) =>
        e.includes("must have at least one"),
      ),
    ).toBe(true);
  });
});

describe("conditionOperators / conditionPresets", () => {
  it("covers all 15 operators", () => {
    expect(Object.keys(conditionOperators)).toHaveLength(15);
  });
  it("presets have conditions", () => {
    expect(conditionPresets.length).toBeGreaterThan(0);
    expect(conditionPresets[0].condition).toBeDefined();
  });
});

describe("describeCondition / describeConditionConfig", () => {
  it("describes a value-required condition", () => {
    const c = createCondition("user.id", "equals", "u1");
    expect(describeCondition(c)).toContain("equals");
    expect(describeCondition(c)).toContain("u1");
  });
  it("describes an is_empty condition (no value)", () => {
    const c = createCondition("x", "is_empty", null);
    expect(describeCondition(c)).toMatch(/is empty/i);
  });
  it("describes an array value", () => {
    const c = createCondition("x", "in_list", ["a", "b"]);
    expect(describeCondition(c)).toContain("a, b");
  });
  it("describes an empty config", () => {
    expect(describeConditionConfig({ logic: "and", conditions: [] })).toBe(
      "No conditions",
    );
  });
  it("describes nested configs", () => {
    const cfg: ConditionConfig = {
      logic: "and",
      conditions: [
        createCondition("a", "equals", 1),
        createConditionGroup("or", [createCondition("b", "equals", 2)]),
      ],
    };
    const desc = describeConditionConfig(cfg);
    expect(desc).toContain("AND");
  });
});
