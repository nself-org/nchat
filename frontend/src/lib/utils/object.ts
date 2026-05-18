/**
 * Object utilities for nself-chat
 * @module utils/object
 */

/**
 * Generic object type
 */
export type AnyObject = Record<string, unknown>;

/**
 * Check if a value is a plain object
 * @param value - Value to check
 * @returns Whether the value is a plain object
 */
export function isPlainObject(value: unknown): value is AnyObject {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Deep merge two or more objects
 * @param target - Target object
 * @param sources - Source objects to merge
 * @returns Merged object
 * @example
 * deepMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } })
 * // { a: 1, b: { c: 2, d: 3 } }
 */
export function deepMerge<T extends AnyObject>(
  target: T,
  ...sources: Partial<T>[]
): T {
  if (!sources.length) {
    return target;
  }

  const result = { ...target } as T;

  for (const source of sources) {
    if (!isPlainObject(source)) {
      continue;
    }

    for (const key of Object.keys(source)) {
      const sourceValue = source[key as keyof typeof source];
      const targetValue = result[key as keyof T];

      if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
        (result as AnyObject)[key] = deepMerge(
          targetValue as AnyObject,
          sourceValue as AnyObject,
        );
      } else if (sourceValue !== undefined) {
        (result as AnyObject)[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * Pick specific keys from an object
 * @param obj - Source object
 * @param keys - Keys to pick
 * @returns Object with only the specified keys
 * @example
 * pick({ a: 1, b: 2, c: 3 }, ['a', 'c']) // { a: 1, c: 3 }
 */
export function pick<T extends AnyObject, K extends keyof T>(
  obj: T,
  keys: K[],
): Pick<T, K> {
  if (!obj || typeof obj !== "object") {
    return {} as Pick<T, K>;
  }

  const result = {} as Pick<T, K>;

  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Omit specific keys from an object
 * @param obj - Source object
 * @param keys - Keys to omit
 * @returns Object without the specified keys
 * @example
 * omit({ a: 1, b: 2, c: 3 }, ['b']) // { a: 1, c: 3 }
 */
export function omit<T extends AnyObject, K extends keyof T>(
  obj: T,
  keys: K[],
): Omit<T, K> {
  if (!obj || typeof obj !== "object") {
    return {} as Omit<T, K>;
  }

  const keysToOmit = new Set<string | number | symbol>(keys);
  const result = {} as Omit<T, K>;

  for (const key of Object.keys(obj)) {
    if (!keysToOmit.has(key)) {
      (result as AnyObject)[key] = obj[key];
    }
  }

  return result;
}

/**
 * Deep clone an object
 * @param obj - Object to clone
 * @returns Deep cloned object
 * @example
 * const original = { a: { b: 1 } };
 * const clone = deepClone(original);
 * clone.a.b = 2;
 * // console.log(original.a.b); // 1
 */
export function deepClone<T>(obj: T): T {
  // Handle primitives and null
  if (obj === null || typeof obj !== "object") {
    return obj;
  }

  // Handle Date
  if (obj instanceof Date) {
    return new Date(obj.getTime()) as T;
  }

  // Handle Array
  if (Array.isArray(obj)) {
    return obj.map((item) => deepClone(item)) as T;
  }

  // Handle Map
  if (obj instanceof Map) {
    const result = new Map();
    obj.forEach((value, key) => {
      result.set(deepClone(key), deepClone(value));
    });
    return result as T;
  }

  // Handle Set
  if (obj instanceof Set) {
    const result = new Set();
    obj.forEach((value) => {
      result.add(deepClone(value));
    });
    return result as T;
  }

  // Handle plain objects
  if (isPlainObject(obj)) {
    const result: AnyObject = {};
    for (const key of Object.keys(obj)) {
      result[key] = deepClone(obj[key]);
    }
    return result as T;
  }

  // For other objects, try structuredClone if available, otherwise return reference
  if (typeof structuredClone === "function") {
    try {
      return structuredClone(obj);
    } catch {
      // Fall through to return original
    }
  }

  return obj;
}

/**
 * Deep equality check for two values
 * @param a - First value
 * @param b - Second value
 * @returns Whether the values are deeply equal
 * @example
 * isEqual({ a: 1 }, { a: 1 }) // true
 * isEqual({ a: 1 }, { a: 2 }) // false
 * isEqual([1, 2, 3], [1, 2, 3]) // true
 */
export function isEqual(a: unknown, b: unknown): boolean {
  // Same reference or primitive equality
  if (a === b) {
    return true;
  }

  // Handle null/undefined
  if (a === null || b === null || a === undefined || b === undefined) {
    return a === b;
  }

  // Different types
  if (typeof a !== typeof b) {
    return false;
  }

  // Handle Date
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() === b.getTime();
  }

  // Handle RegExp
  if (a instanceof RegExp && b instanceof RegExp) {
    return a.toString() === b.toString();
  }

  // Handle Array
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!isEqual(a[i], b[i])) {
        return false;
      }
    }
    return true;
  }

  // Handle Map
  if (a instanceof Map && b instanceof Map) {
    if (a.size !== b.size) {
      return false;
    }
    for (const [key, value] of a) {
      if (!b.has(key) || !isEqual(value, b.get(key))) {
        return false;
      }
    }
    return true;
  }

  // Handle Set
  if (a instanceof Set && b instanceof Set) {
    if (a.size !== b.size) {
      return false;
    }
    for (const value of a) {
      if (!b.has(value)) {
        return false;
      }
    }
    return true;
  }

  // Handle objects
  if (typeof a === "object" && typeof b === "object") {
    const aObj = a as AnyObject;
    const bObj = b as AnyObject;

    const aKeys = Object.keys(aObj);
    const bKeys = Object.keys(bObj);

    if (aKeys.length !== bKeys.length) {
      return false;
    }

    for (const key of aKeys) {
      if (!Object.prototype.hasOwnProperty.call(bObj, key)) {
        return false;
      }
      if (!isEqual(aObj[key], bObj[key])) {
        return false;
      }
    }

    return true;
  }

  return false;
}

/**
 * Check if an object is empty
 * @param obj - Object to check
 * @returns Whether the object is empty
 */
export function isEmpty(obj: unknown): boolean {
  if (obj === null || obj === undefined) {
    return true;
  }

  if (Array.isArray(obj)) {
    return obj.length === 0;
  }

  if (obj instanceof Map || obj instanceof Set) {
    return obj.size === 0;
  }

  if (typeof obj === "object") {
    return Object.keys(obj).length === 0;
  }

  if (typeof obj === "string") {
    return obj.length === 0;
  }

  return false;
}

/**
 * Get a nested property value by path
 * @param obj - Source object
 * @param path - Property path (dot notation or array)
 * @param defaultValue - Default value if not found
 * @returns Value at path or default
 * @example
 * get({ a: { b: { c: 1 } } }, 'a.b.c') // 1
 * get({ a: { b: 1 } }, 'a.c', 'default') // 'default'
 * get({ a: [1, 2, 3] }, 'a.1') // 2
 */
export function get<T = unknown>(
  obj: unknown,
  path: string | string[],
  defaultValue?: T,
): T {
  if (!obj || typeof obj !== "object") {
    return defaultValue as T;
  }

  const keys = Array.isArray(path) ? path : path.split(".");

  let result: unknown = obj;

  for (const key of keys) {
    if (result === null || result === undefined) {
      return defaultValue as T;
    }

    if (typeof result !== "object") {
      return defaultValue as T;
    }

    result = (result as AnyObject)[key];
  }

  return (result === undefined ? defaultValue : result) as T;
}

/**
 * Set a nested property value by path
 * @param obj - Target object
 * @param path - Property path (dot notation or array)
 * @param value - Value to set
 * @returns New object with value set
 * @example
 * set({ a: { b: 1 } }, 'a.c', 2) // { a: { b: 1, c: 2 } }
 */
export function set<T extends AnyObject>(
  obj: T,
  path: string | string[],
  value: unknown,
): T {
  const keys = Array.isArray(path) ? path : path.split(".");
  const result = deepClone(obj);

  let current: AnyObject = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      // Determine if next key is array index
      const nextKey = keys[i + 1];
      current[key] = /^\d+$/.test(nextKey) ? [] : {};
    }
    current = current[key] as AnyObject;
  }

  const lastKey = keys[keys.length - 1];
  current[lastKey] = value;

  return result;
}

/**
 * Delete a nested property by path
 * @param obj - Target object
 * @param path - Property path (dot notation or array)
 * @returns New object with property deleted
 */
export function unset<T extends AnyObject>(obj: T, path: string | string[]): T {
  const keys = Array.isArray(path) ? path : path.split(".");
  const result = deepClone(obj);

  if (keys.length === 0) {
    return result;
  }

  let current: AnyObject = result;

  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!(key in current) || typeof current[key] !== "object") {
      return result; // Path doesn't exist
    }
    current = current[key] as AnyObject;
  }

  const lastKey = keys[keys.length - 1];
  delete current[lastKey];

  return result;
}

/**
 * Check if an object has a nested property
 * @param obj - Object to check
 * @param path - Property path
 * @returns Whether the property exists
 */
export function has(obj: unknown, path: string | string[]): boolean {
  if (!obj || typeof obj !== "object") {
    return false;
  }

  const keys = Array.isArray(path) ? path : path.split(".");
  let current: unknown = obj;

  for (const key of keys) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return false;
    }
    if (!Object.prototype.hasOwnProperty.call(current, key)) {
      return false;
    }
    current = (current as AnyObject)[key];
  }

  return true;
}

/**
 * Flatten a nested object into dot notation
 * @param obj - Object to flatten
 * @param prefix - Key prefix (for recursion)
 * @returns Flattened object
 * @example
 * flatten({ a: { b: 1, c: { d: 2 } } }) // { 'a.b': 1, 'a.c.d': 2 }
 */
export function flattenObject(
  obj: AnyObject,
  prefix: string = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    const newKey = prefix ? `${prefix}.${key}` : key;

    if (isPlainObject(value)) {
      Object.assign(result, flattenObject(value, newKey));
    } else {
      result[newKey] = value;
    }
  }

  return result;
}

/**
 * Unflatten a dot-notation object into nested structure
 * @param obj - Flattened object
 * @returns Nested object
 * @example
 * unflattenObject({ 'a.b': 1, 'a.c.d': 2 }) // { a: { b: 1, c: { d: 2 } } }
 */
export function unflattenObject(obj: Record<string, unknown>): AnyObject {
  const result: AnyObject = {};

  for (const key of Object.keys(obj)) {
    const keys = key.split(".");
    let current = result;

    for (let i = 0; i < keys.length - 1; i++) {
      const k = keys[i];
      if (!(k in current)) {
        current[k] = {};
      }
      current = current[k] as AnyObject;
    }

    current[keys[keys.length - 1]] = obj[key];
  }

  return result;
}

/**
 * Map over object values
 * @param obj - Source object
 * @param fn - Mapping function
 * @returns New object with mapped values
 * @example
 * mapValues({ a: 1, b: 2 }, n => n * 2) // { a: 2, b: 4 }
 */
export function mapValues<T extends AnyObject, U>(
  obj: T,
  fn: (value: T[keyof T], key: keyof T) => U,
): Record<keyof T, U> {
  if (!obj || typeof obj !== "object") {
    return {} as Record<keyof T, U>;
  }

  const result = {} as Record<keyof T, U>;

  for (const key of Object.keys(obj) as (keyof T)[]) {
    result[key] = fn(obj[key], key);
  }

  return result;
}

/**
 * Map over object keys
 * @param obj - Source object
 * @param fn - Mapping function
 * @returns New object with mapped keys
 */
export function mapKeys<T extends AnyObject>(
  obj: T,
  fn: (key: keyof T, value: T[keyof T]) => string,
): Record<string, T[keyof T]> {
  if (!obj || typeof obj !== "object") {
    return {};
  }

  const result: Record<string, T[keyof T]> = {};

  for (const key of Object.keys(obj) as (keyof T)[]) {
    const newKey = fn(key, obj[key]);
    result[newKey] = obj[key];
  }

  return result;
}

/**
 * Filter object by predicate
 * @param obj - Source object
 * @param predicate - Filter function
 * @returns Filtered object
 * @example
 * filterObject({ a: 1, b: 2, c: 3 }, v => v > 1) // { b: 2, c: 3 }
 */
export function filterObject<T extends AnyObject>(
  obj: T,
  predicate: (value: T[keyof T], key: keyof T) => boolean,
): Partial<T> {
  if (!obj || typeof obj !== "object") {
    return {};
  }

  const result: Partial<T> = {};

  for (const key of Object.keys(obj) as (keyof T)[]) {
    if (predicate(obj[key], key)) {
      result[key] = obj[key];
    }
  }

  return result;
}

/**
 * Remove null and undefined values from an object
 * @param obj - Source object
 * @returns Object without nullish values
 */
export function compact<T extends AnyObject>(obj: T): Partial<T> {
  return filterObject(obj, (value) => value !== null && value !== undefined);
}

/**
 * Create an object from key-value pairs
 * @param entries - Array of [key, value] pairs
 * @returns Object
 */
export function fromEntries<K extends string | number, V>(
  entries: [K, V][],
): Record<K, V> {
  const result = {} as Record<K, V>;

  for (const [key, value] of entries) {
    result[key] = value;
  }

  return result;
}

/**
 * Invert object keys and values
 * @param obj - Source object
 * @returns Inverted object
 * @example
 * invert({ a: '1', b: '2' }) // { '1': 'a', '2': 'b' }
 */
export function invert<T extends Record<string, string | number>>(
  obj: T,
): Record<string, keyof T> {
  const result: Record<string, keyof T> = {};

  for (const key of Object.keys(obj)) {
    const value = obj[key];
    if (typeof value === "string" || typeof value === "number") {
      result[String(value)] = key;
    }
  }

  return result;
}

/**
 * Merge objects with custom merge function
 * @param target - Target object
 * @param source - Source object
 * @param customizer - Custom merge function
 * @returns Merged object
 */
export function mergeWith<T extends AnyObject>(
  target: T,
  source: Partial<T>,
  customizer: (
    targetValue: unknown,
    sourceValue: unknown,
    key: string,
  ) => unknown,
): T {
  const result = { ...target } as T;

  for (const key of Object.keys(source)) {
    const targetValue = result[key as keyof T];
    const sourceValue = source[key as keyof T];
    const customValue = customizer(targetValue, sourceValue, key);

    if (customValue !== undefined) {
      (result as AnyObject)[key] = customValue;
    } else if (isPlainObject(sourceValue) && isPlainObject(targetValue)) {
      (result as AnyObject)[key] = mergeWith(
        targetValue as AnyObject,
        sourceValue as Partial<AnyObject>,
        customizer,
      );
    } else if (sourceValue !== undefined) {
      (result as AnyObject)[key] = sourceValue;
    }
  }

  return result;
}

/**
 * Get differences between two objects
 * @param obj1 - First object
 * @param obj2 - Second object
 * @returns Object containing only changed/added properties
 */
export function diff<T extends AnyObject>(obj1: T, obj2: T): Partial<T> {
  const result: Partial<T> = {};

  const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);

  for (const key of allKeys) {
    const val1 = obj1[key as keyof T];
    const val2 = obj2[key as keyof T];

    if (!isEqual(val1, val2)) {
      result[key as keyof T] = val2;
    }
  }

  return result;
}
