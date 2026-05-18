// ============================================================================
// WORKFLOW CONDITIONS
// Condition evaluation and helpers for the nself-chat workflow system
// ============================================================================

import type {
  Condition,
  ConditionGroup,
  ConditionConfig,
  ConditionOperator,
  ConditionLogic,
  ConditionStep,
  WorkflowContext,
} from "./workflow-types";

// ============================================================================
// Condition Operators
// ============================================================================

export const conditionOperators: Record<
  ConditionOperator,
  {
    label: string;
    description: string;
    valueRequired: boolean;
    supportedTypes: string[];
  }
> = {
  equals: {
    label: "Equals",
    description: "Value equals the specified value",
    valueRequired: true,
    supportedTypes: ["string", "number", "boolean"],
  },
  not_equals: {
    label: "Not equals",
    description: "Value does not equal the specified value",
    valueRequired: true,
    supportedTypes: ["string", "number", "boolean"],
  },
  contains: {
    label: "Contains",
    description: "Value contains the specified text",
    valueRequired: true,
    supportedTypes: ["string", "array"],
  },
  not_contains: {
    label: "Does not contain",
    description: "Value does not contain the specified text",
    valueRequired: true,
    supportedTypes: ["string", "array"],
  },
  starts_with: {
    label: "Starts with",
    description: "Value starts with the specified text",
    valueRequired: true,
    supportedTypes: ["string"],
  },
  ends_with: {
    label: "Ends with",
    description: "Value ends with the specified text",
    valueRequired: true,
    supportedTypes: ["string"],
  },
  greater_than: {
    label: "Greater than",
    description: "Value is greater than the specified value",
    valueRequired: true,
    supportedTypes: ["number", "date"],
  },
  less_than: {
    label: "Less than",
    description: "Value is less than the specified value",
    valueRequired: true,
    supportedTypes: ["number", "date"],
  },
  greater_equal: {
    label: "Greater than or equal",
    description: "Value is greater than or equal to the specified value",
    valueRequired: true,
    supportedTypes: ["number", "date"],
  },
  less_equal: {
    label: "Less than or equal",
    description: "Value is less than or equal to the specified value",
    valueRequired: true,
    supportedTypes: ["number", "date"],
  },
  is_empty: {
    label: "Is empty",
    description: "Value is empty, null, or undefined",
    valueRequired: false,
    supportedTypes: ["string", "array", "object"],
  },
  is_not_empty: {
    label: "Is not empty",
    description: "Value is not empty, null, or undefined",
    valueRequired: false,
    supportedTypes: ["string", "array", "object"],
  },
  matches_regex: {
    label: "Matches pattern",
    description: "Value matches the regular expression pattern",
    valueRequired: true,
    supportedTypes: ["string"],
  },
  in_list: {
    label: "In list",
    description: "Value is in the specified list",
    valueRequired: true,
    supportedTypes: ["string", "number"],
  },
  not_in_list: {
    label: "Not in list",
    description: "Value is not in the specified list",
    valueRequired: true,
    supportedTypes: ["string", "number"],
  },
};

// ============================================================================
// Condition Evaluation
// ============================================================================

/**
 * Evaluate a condition configuration against a context
 */
export function evaluateConditionConfig(
  config: ConditionConfig,
  context: WorkflowContext,
): boolean {
  const { logic, conditions } = config;

  if (conditions.length === 0) {
    return true;
  }

  const results = conditions.map((condition) => {
    if (isConditionGroup(condition)) {
      return evaluateConditionGroup(condition, context);
    }
    return evaluateCondition(condition, context);
  });

  if (logic === "and") {
    return results.every((result) => result);
  }

  return results.some((result) => result);
}

/**
 * Evaluate a condition group
 */
export function evaluateConditionGroup(
  group: ConditionGroup,
  context: WorkflowContext,
): boolean {
  const { logic, conditions } = group;

  if (conditions.length === 0) {
    return true;
  }

  const results = conditions.map((condition) => {
    if (isConditionGroup(condition)) {
      return evaluateConditionGroup(condition, context);
    }
    return evaluateCondition(condition, context);
  });

  if (logic === "and") {
    return results.every((result) => result);
  }

  return results.some((result) => result);
}

/**
 * Evaluate a single condition
 */
export function evaluateCondition(
  condition: Condition,
  context: WorkflowContext,
): boolean {
  const { field, operator, value } = condition;

  // Get the field value from context
  const fieldValue = getFieldValue(field, context);

  return compareValues(fieldValue, operator, value);
}

/**
 * Compare two values using the specified operator
 */
export function compareValues(
  fieldValue: unknown,
  operator: ConditionOperator,
  compareValue: unknown,
): boolean {
  switch (operator) {
    case "equals":
      return isEqual(fieldValue, compareValue);

    case "not_equals":
      return !isEqual(fieldValue, compareValue);

    case "contains":
      return contains(fieldValue, compareValue);

    case "not_contains":
      return !contains(fieldValue, compareValue);

    case "starts_with":
      return startsWith(fieldValue, compareValue);

    case "ends_with":
      return endsWith(fieldValue, compareValue);

    case "greater_than":
      return greaterThan(fieldValue, compareValue);

    case "less_than":
      return lessThan(fieldValue, compareValue);

    case "greater_equal":
      return greaterEqual(fieldValue, compareValue);

    case "less_equal":
      return lessEqual(fieldValue, compareValue);

    case "is_empty":
      return isEmpty(fieldValue);

    case "is_not_empty":
      return !isEmpty(fieldValue);

    case "matches_regex":
      return matchesRegex(fieldValue, compareValue);

    case "in_list":
      return inList(fieldValue, compareValue);

    case "not_in_list":
      return !inList(fieldValue, compareValue);

    default:
      return false;
  }
}

// ============================================================================
// Comparison Helpers
// ============================================================================

function isEqual(a: unknown, b: unknown): boolean {
  // Handle null/undefined
  if (a === null || a === undefined) {
    return b === null || b === undefined;
  }

  // Handle arrays
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => isEqual(item, b[index]));
  }

  // Handle objects
  if (typeof a === "object" && typeof b === "object") {
    const aKeys = Object.keys(a as object);
    const bKeys = Object.keys(b as object);
    if (aKeys.length !== bKeys.length) return false;
    return aKeys.every((key) =>
      isEqual(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    );
  }

  // Handle primitives (case-insensitive for strings)
  if (typeof a === "string" && typeof b === "string") {
    return a.toLowerCase() === b.toLowerCase();
  }

  return a === b;
}

function contains(value: unknown, search: unknown): boolean {
  if (typeof value === "string" && typeof search === "string") {
    return value.toLowerCase().includes(search.toLowerCase());
  }

  if (Array.isArray(value)) {
    return value.some((item) => isEqual(item, search));
  }

  return false;
}

function startsWith(value: unknown, prefix: unknown): boolean {
  if (typeof value === "string" && typeof prefix === "string") {
    return value.toLowerCase().startsWith(prefix.toLowerCase());
  }
  return false;
}

function endsWith(value: unknown, suffix: unknown): boolean {
  if (typeof value === "string" && typeof suffix === "string") {
    return value.toLowerCase().endsWith(suffix.toLowerCase());
  }
  return false;
}

function greaterThan(a: unknown, b: unknown): boolean {
  const numA = toNumber(a);
  const numB = toNumber(b);

  if (numA !== null && numB !== null) {
    return numA > numB;
  }

  // Handle dates
  const dateA = toDate(a);
  const dateB = toDate(b);

  if (dateA && dateB) {
    return dateA.getTime() > dateB.getTime();
  }

  return false;
}

function lessThan(a: unknown, b: unknown): boolean {
  const numA = toNumber(a);
  const numB = toNumber(b);

  if (numA !== null && numB !== null) {
    return numA < numB;
  }

  // Handle dates
  const dateA = toDate(a);
  const dateB = toDate(b);

  if (dateA && dateB) {
    return dateA.getTime() < dateB.getTime();
  }

  return false;
}

function greaterEqual(a: unknown, b: unknown): boolean {
  return greaterThan(a, b) || isEqual(a, b);
}

function lessEqual(a: unknown, b: unknown): boolean {
  return lessThan(a, b) || isEqual(a, b);
}

function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  if (typeof value === "string") {
    return value.trim() === "";
  }

  if (Array.isArray(value)) {
    return value.length === 0;
  }

  if (typeof value === "object") {
    return Object.keys(value).length === 0;
  }

  return false;
}

function matchesRegex(value: unknown, pattern: unknown): boolean {
  if (typeof value !== "string" || typeof pattern !== "string") {
    return false;
  }

  try {
    const regex = new RegExp(pattern, "i");
    return regex.test(value);
  } catch {
    return false;
  }
}

function inList(value: unknown, list: unknown): boolean {
  if (!Array.isArray(list)) {
    // Try to parse as comma-separated string
    if (typeof list === "string") {
      const items = list.split(",").map((s) => s.trim());
      return items.some((item) => isEqual(value, item));
    }
    return false;
  }

  return list.some((item) => isEqual(value, item));
}

// ============================================================================
// Type Conversion Helpers
// ============================================================================

function toNumber(value: unknown): number | null {
  if (typeof value === "number") {
    return isNaN(value) ? null : value;
  }

  if (typeof value === "string") {
    const num = parseFloat(value);
    return isNaN(num) ? null : num;
  }

  return null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  return null;
}

// ============================================================================
// Context Field Access
// ============================================================================

/**
 * Get a field value from the workflow context
 * Supports dot notation for nested properties
 */
export function getFieldValue(
  field: string,
  context: WorkflowContext,
): unknown {
  const parts = field.split(".");

  let current: unknown = context;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }

    // Handle array index access like "items[0]"
    const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
    if (arrayMatch) {
      const [, key, index] = arrayMatch;
      current = (current as Record<string, unknown>)[key];
      if (Array.isArray(current)) {
        current = current[parseInt(index, 10)];
      } else {
        return undefined;
      }
    } else {
      current = (current as Record<string, unknown>)[part];
    }
  }

  return current;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if an item is a condition group
 */
export function isConditionGroup(
  item: Condition | ConditionGroup,
): item is ConditionGroup {
  return (
    "logic" in item && "conditions" in item && Array.isArray(item.conditions)
  );
}

// ============================================================================
// Condition Builder Helpers
// ============================================================================

/**
 * Create a new condition
 */
export function createCondition(
  field: string,
  operator: ConditionOperator,
  value: unknown,
): Condition {
  return {
    id: `condition_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    field,
    operator,
    value,
  };
}

/**
 * Create a new condition group
 */
export function createConditionGroup(
  logic: ConditionLogic,
  conditions: (Condition | ConditionGroup)[] = [],
): ConditionGroup {
  return {
    id: `group_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    logic,
    conditions,
  };
}

/**
 * Create a condition step
 */
export function createConditionStep(
  overrides?: Partial<ConditionStep>,
): ConditionStep {
  const id = `condition_step_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  return {
    id,
    type: "condition",
    name: "Condition",
    description: "Branch workflow based on conditions",
    position: { x: 200, y: 200 },
    config: {
      logic: "and",
      conditions: [],
    },
    metadata: {
      icon: "GitBranch",
      color: "#8B5CF6",
      category: "Logic",
    },
    ...overrides,
  };
}

/**
 * Validate a condition configuration
 */
export function validateConditionConfig(config: ConditionConfig): string[] {
  const errors: string[] = [];

  if (!config.conditions || config.conditions.length === 0) {
    errors.push("At least one condition is required");
    return errors;
  }

  const validateItem = (item: Condition | ConditionGroup, path: string) => {
    if (isConditionGroup(item)) {
      if (item.conditions.length === 0) {
        errors.push(`${path}: Group must have at least one condition`);
      }
      item.conditions.forEach((child, index) => {
        validateItem(child, `${path}[${index}]`);
      });
    } else {
      if (!item.field || item.field.trim() === "") {
        errors.push(`${path}: Field is required`);
      }
      const operatorInfo = conditionOperators[item.operator];
      if (!operatorInfo) {
        errors.push(`${path}: Invalid operator "${item.operator}"`);
      } else if (operatorInfo.valueRequired && item.value === undefined) {
        errors.push(
          `${path}: Value is required for operator "${item.operator}"`,
        );
      }
    }
  };

  config.conditions.forEach((item, index) => {
    validateItem(item, `conditions[${index}]`);
  });

  return errors;
}

// ============================================================================
// Common Condition Presets
// ============================================================================

export const conditionPresets = [
  {
    id: "message_contains_keyword",
    name: "Message contains keyword",
    description: "Check if message content contains a specific keyword",
    condition: createCondition("message.content", "contains", ""),
  },
  {
    id: "user_is_admin",
    name: "User is admin",
    description: "Check if the user has admin role",
    condition: createCondition("user.roles", "contains", "admin"),
  },
  {
    id: "channel_is_general",
    name: "Channel is general",
    description: "Check if the channel is the general channel",
    condition: createCondition("channel.name", "equals", "general"),
  },
  {
    id: "variable_is_set",
    name: "Variable is set",
    description: "Check if a workflow variable has a value",
    condition: createCondition("variables.variableName", "is_not_empty", null),
  },
  {
    id: "during_business_hours",
    name: "During business hours",
    description: "Check if current time is during business hours (9-5)",
    condition: createConditionGroup("and", [
      createCondition("trigger.data.hour", "greater_equal", 9),
      createCondition("trigger.data.hour", "less_than", 17),
    ]),
  },
];

// ============================================================================
// Human-Readable Description
// ============================================================================

/**
 * Get a human-readable description of a condition
 */
export function describeCondition(condition: Condition): string {
  const operatorInfo = conditionOperators[condition.operator];
  const operatorLabel = operatorInfo?.label || condition.operator;

  if (!operatorInfo?.valueRequired) {
    return `${condition.field} ${operatorLabel.toLowerCase()}`;
  }

  const valueStr = Array.isArray(condition.value)
    ? condition.value.join(", ")
    : String(condition.value);

  return `${condition.field} ${operatorLabel.toLowerCase()} "${valueStr}"`;
}

/**
 * Get a human-readable description of a condition configuration
 */
export function describeConditionConfig(config: ConditionConfig): string {
  if (config.conditions.length === 0) {
    return "No conditions";
  }

  const describeItem = (item: Condition | ConditionGroup): string => {
    if (isConditionGroup(item)) {
      const childDescriptions = item.conditions.map(describeItem);
      const connector = item.logic === "and" ? " AND " : " OR ";
      return `(${childDescriptions.join(connector)})`;
    }
    return describeCondition(item);
  };

  const descriptions = config.conditions.map(describeItem);
  const connector = config.logic === "and" ? " AND " : " OR ";

  return descriptions.join(connector);
}
