/**
 * Array utilities for nself-chat
 * @module utils/array
 */

/**
 * Group an array by a key or key function
 * @param array - Array to group
 * @param keyOrFn - Property key or function returning the group key
 * @returns Object with grouped items
 * @example
 * groupBy([{ type: 'a', val: 1 }, { type: 'b', val: 2 }, { type: 'a', val: 3 }], 'type')
 * // { a: [{ type: 'a', val: 1 }, { type: 'a', val: 3 }], b: [{ type: 'b', val: 2 }] }
 */
export function groupBy<T, K extends string | number>(
  array: T[],
  keyOrFn: keyof T | ((item: T) => K),
): Record<K, T[]> {
  if (!array || !Array.isArray(array)) {
    return {} as Record<K, T[]>;
  }

  const getKey =
    typeof keyOrFn === "function"
      ? keyOrFn
      : (item: T) => item[keyOrFn] as unknown as K;

  return array.reduce(
    (result, item) => {
      const key = getKey(item);
      if (key !== undefined && key !== null) {
        if (!result[key]) {
          result[key] = [];
        }
        result[key].push(item);
      }
      return result;
    },
    {} as Record<K, T[]>,
  );
}

/**
 * Sort direction
 */
export type SortDirection = "asc" | "desc";

/**
 * Sort configuration
 */
export interface SortConfig<T> {
  /** Key to sort by */
  key: keyof T;
  /** Sort direction (default: 'asc') */
  direction?: SortDirection;
}

/**
 * Sort an array by one or more keys
 * @param array - Array to sort
 * @param keyOrConfigs - Key, array of keys, or sort configurations
 * @param direction - Sort direction (when using single key)
 * @returns New sorted array
 * @example
 * sortBy([{ name: 'b', age: 1 }, { name: 'a', age: 2 }], 'name') // [{ name: 'a', age: 2 }, { name: 'b', age: 1 }]
 * sortBy(users, 'createdAt', 'desc') // Sort by createdAt descending
 * sortBy(users, [{ key: 'role', direction: 'asc' }, { key: 'name', direction: 'asc' }])
 */
export function sortBy<T>(
  array: T[],
  keyOrConfigs: keyof T | SortConfig<T> | (keyof T | SortConfig<T>)[],
  direction: SortDirection = "asc",
): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }

  // Normalize to array of configs
  const configs: SortConfig<T>[] = (
    Array.isArray(keyOrConfigs) ? keyOrConfigs : [keyOrConfigs]
  ).map((item) => {
    if (typeof item === "object" && "key" in item) {
      return { direction: "asc", ...item };
    }
    return { key: item as keyof T, direction };
  });

  return [...array].sort((a, b) => {
    for (const config of configs) {
      const { key, direction: dir = "asc" } = config;
      const aVal = a[key];
      const bVal = b[key];

      // Handle nullish values
      if (aVal == null && bVal == null) continue;
      if (aVal == null) return dir === "asc" ? 1 : -1;
      if (bVal == null) return dir === "asc" ? -1 : 1;

      // Compare values
      let comparison = 0;
      if (typeof aVal === "string" && typeof bVal === "string") {
        comparison = aVal.localeCompare(bVal);
      } else if (aVal < bVal) {
        comparison = -1;
      } else if (aVal > bVal) {
        comparison = 1;
      }

      if (comparison !== 0) {
        return dir === "asc" ? comparison : -comparison;
      }
    }
    return 0;
  });
}

/**
 * Get unique items from an array by a key or function
 * @param array - Array to filter
 * @param keyOrFn - Key or function to determine uniqueness
 * @returns Array with unique items (first occurrence kept)
 * @example
 * uniqueBy([{ id: 1 }, { id: 2 }, { id: 1 }], 'id') // [{ id: 1 }, { id: 2 }]
 */
export function uniqueBy<T>(
  array: T[],
  keyOrFn?: keyof T | ((item: T) => unknown),
): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }

  // If no key provided, use Set for primitives or reference equality
  if (keyOrFn === undefined) {
    return [...new Set(array)];
  }

  const getKey =
    typeof keyOrFn === "function" ? keyOrFn : (item: T) => item[keyOrFn];

  const seen = new Set<unknown>();

  return array.filter((item) => {
    const key = getKey(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

/**
 * Split an array into chunks of a specified size
 * @param array - Array to chunk
 * @param size - Size of each chunk
 * @returns Array of chunks
 * @example
 * chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
 */
export function chunk<T>(array: T[], size: number): T[][] {
  if (!array || !Array.isArray(array) || size < 1) {
    return [];
  }

  const result: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

/**
 * Move an item from one index to another (for drag and drop)
 * @param array - Array to modify
 * @param fromIndex - Source index
 * @param toIndex - Destination index
 * @returns New array with item moved
 * @example
 * move(['a', 'b', 'c', 'd'], 0, 2) // ['b', 'c', 'a', 'd']
 */
export function move<T>(array: T[], fromIndex: number, toIndex: number): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }

  const len = array.length;
  if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len) {
    return [...array];
  }

  if (fromIndex === toIndex) {
    return [...array];
  }

  const result = [...array];
  const [item] = result.splice(fromIndex, 1);
  result.splice(toIndex, 0, item);
  return result;
}

/**
 * Insert an item at a specific index
 * @param array - Array to modify
 * @param index - Index to insert at
 * @param item - Item to insert
 * @returns New array with item inserted
 * @example
 * insertAt(['a', 'b', 'd'], 2, 'c') // ['a', 'b', 'c', 'd']
 */
export function insertAt<T>(array: T[], index: number, item: T): T[] {
  if (!array || !Array.isArray(array)) {
    return [item];
  }

  const result = [...array];
  const insertIndex = Math.max(0, Math.min(index, result.length));
  result.splice(insertIndex, 0, item);
  return result;
}

/**
 * Remove an item at a specific index
 * @param array - Array to modify
 * @param index - Index to remove
 * @returns New array with item removed
 * @example
 * removeAt(['a', 'b', 'c'], 1) // ['a', 'c']
 */
export function removeAt<T>(array: T[], index: number): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }

  if (index < 0 || index >= array.length) {
    return [...array];
  }

  const result = [...array];
  result.splice(index, 1);
  return result;
}

/**
 * Remove items matching a predicate
 * @param array - Array to modify
 * @param predicate - Function to determine what to remove
 * @returns New array with matching items removed
 * @example
 * removeWhere([1, 2, 3, 4], n => n % 2 === 0) // [1, 3]
 */
export function removeWhere<T>(
  array: T[],
  predicate: (item: T) => boolean,
): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }

  return array.filter((item) => !predicate(item));
}

/**
 * Update an item at a specific index
 * @param array - Array to modify
 * @param index - Index to update
 * @param updater - New value or update function
 * @returns New array with item updated
 * @example
 * updateAt([1, 2, 3], 1, 5) // [1, 5, 3]
 * updateAt([{ n: 1 }], 0, prev => ({ ...prev, n: 2 })) // [{ n: 2 }]
 */
export function updateAt<T>(
  array: T[],
  index: number,
  updater: T | ((item: T) => T),
): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }

  if (index < 0 || index >= array.length) {
    return [...array];
  }

  const result = [...array];
  result[index] =
    typeof updater === "function"
      ? (updater as (item: T) => T)(result[index])
      : updater;
  return result;
}

/**
 * Find the first item matching a predicate and update it
 * @param array - Array to modify
 * @param predicate - Function to find the item
 * @param updater - New value or update function
 * @returns New array with item updated
 */
export function updateWhere<T>(
  array: T[],
  predicate: (item: T) => boolean,
  updater: Partial<T> | ((item: T) => T),
): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }

  const index = array.findIndex(predicate);
  if (index === -1) {
    return [...array];
  }

  const result = [...array];
  if (typeof updater === "function") {
    result[index] = updater(result[index]);
  } else {
    result[index] = { ...result[index], ...updater };
  }
  return result;
}

/**
 * Flatten a nested array
 * @param array - Nested array
 * @param depth - Maximum depth to flatten (default: 1)
 * @returns Flattened array
 * @example
 * flatten([[1, 2], [3, [4, 5]]]) // [1, 2, 3, [4, 5]]
 * flatten([[1, 2], [3, [4, 5]]], 2) // [1, 2, 3, 4, 5]
 */
export function flatten<T>(array: unknown[], depth: number = 1): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }

  return array.flat(depth) as T[];
}

/**
 * Get the first n items from an array
 * @param array - Source array
 * @param n - Number of items
 * @returns First n items
 */
export function first<T>(array: T[], n: number = 1): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  return array.slice(0, n);
}

/**
 * Get the last n items from an array
 * @param array - Source array
 * @param n - Number of items
 * @returns Last n items
 */
export function last<T>(array: T[], n: number = 1): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }
  return array.slice(-n);
}

/**
 * Get the intersection of two arrays
 * @param a - First array
 * @param b - Second array
 * @param keyOrFn - Key or function for comparison (for objects)
 * @returns Items present in both arrays
 * @example
 * intersection([1, 2, 3], [2, 3, 4]) // [2, 3]
 */
export function intersection<T>(
  a: T[],
  b: T[],
  keyOrFn?: keyof T | ((item: T) => unknown),
): T[] {
  if (!a || !b) return [];

  if (!keyOrFn) {
    const setB = new Set(b);
    return a.filter((item) => setB.has(item));
  }

  const getKey =
    typeof keyOrFn === "function" ? keyOrFn : (item: T) => item[keyOrFn];

  const keysB = new Set(b.map(getKey));
  return a.filter((item) => keysB.has(getKey(item)));
}

/**
 * Get the difference of two arrays (items in a but not in b)
 * @param a - First array
 * @param b - Second array
 * @param keyOrFn - Key or function for comparison (for objects)
 * @returns Items in a but not in b
 * @example
 * difference([1, 2, 3], [2, 3, 4]) // [1]
 */
export function difference<T>(
  a: T[],
  b: T[],
  keyOrFn?: keyof T | ((item: T) => unknown),
): T[] {
  if (!a) return [];
  if (!b) return [...a];

  if (!keyOrFn) {
    const setB = new Set(b);
    return a.filter((item) => !setB.has(item));
  }

  const getKey =
    typeof keyOrFn === "function" ? keyOrFn : (item: T) => item[keyOrFn];

  const keysB = new Set(b.map(getKey));
  return a.filter((item) => !keysB.has(getKey(item)));
}

/**
 * Get the union of two arrays
 * @param a - First array
 * @param b - Second array
 * @param keyOrFn - Key or function for uniqueness
 * @returns Combined unique items
 * @example
 * union([1, 2], [2, 3]) // [1, 2, 3]
 */
export function union<T>(
  a: T[],
  b: T[],
  keyOrFn?: keyof T | ((item: T) => unknown),
): T[] {
  return uniqueBy([...(a || []), ...(b || [])], keyOrFn);
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 * @param array - Array to shuffle
 * @returns New shuffled array
 * @example
 * shuffle([1, 2, 3, 4, 5]) // [3, 1, 5, 2, 4] (random order)
 */
export function shuffle<T>(array: T[]): T[] {
  if (!array || !Array.isArray(array)) {
    return [];
  }

  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Get a random item from an array
 * @param array - Source array
 * @returns Random item or undefined if empty
 */
export function sample<T>(array: T[]): T | undefined {
  if (!array || array.length === 0) {
    return undefined;
  }
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * Get n random items from an array
 * @param array - Source array
 * @param n - Number of items to get
 * @returns Array of random items
 */
export function sampleN<T>(array: T[], n: number): T[] {
  if (!array || array.length === 0 || n < 1) {
    return [];
  }
  return shuffle(array).slice(0, n);
}

/**
 * Partition an array into two based on a predicate
 * @param array - Array to partition
 * @param predicate - Function to determine partition
 * @returns Tuple of [truthy items, falsy items]
 * @example
 * partition([1, 2, 3, 4], n => n % 2 === 0) // [[2, 4], [1, 3]]
 */
export function partition<T>(
  array: T[],
  predicate: (item: T) => boolean,
): [T[], T[]] {
  if (!array || !Array.isArray(array)) {
    return [[], []];
  }

  const truthy: T[] = [];
  const falsy: T[] = [];

  for (const item of array) {
    if (predicate(item)) {
      truthy.push(item);
    } else {
      falsy.push(item);
    }
  }

  return [truthy, falsy];
}

/**
 * Count items matching a predicate
 * @param array - Array to count
 * @param predicate - Function to match items (optional)
 * @returns Count of matching items
 */
export function count<T>(array: T[], predicate?: (item: T) => boolean): number {
  if (!array || !Array.isArray(array)) {
    return 0;
  }

  if (!predicate) {
    return array.length;
  }

  return array.reduce((sum, item) => sum + (predicate(item) ? 1 : 0), 0);
}

/**
 * Create an array of numbers in a range
 * @param start - Start value (inclusive)
 * @param end - End value (exclusive)
 * @param step - Step value (default: 1)
 * @returns Array of numbers
 * @example
 * range(0, 5) // [0, 1, 2, 3, 4]
 * range(0, 10, 2) // [0, 2, 4, 6, 8]
 */
export function range(start: number, end: number, step: number = 1): number[] {
  if (step === 0) {
    return [];
  }

  const result: number[] = [];
  if (step > 0) {
    for (let i = start; i < end; i += step) {
      result.push(i);
    }
  } else {
    for (let i = start; i > end; i += step) {
      result.push(i);
    }
  }
  return result;
}

/**
 * Zip multiple arrays together
 * @param arrays - Arrays to zip
 * @returns Array of tuples
 * @example
 * zip([1, 2], ['a', 'b']) // [[1, 'a'], [2, 'b']]
 */
export function zip<T extends unknown[][]>(...arrays: T): unknown[][] {
  if (arrays.length === 0) return [];

  const maxLength = Math.max(...arrays.map((a) => a.length));
  const result: unknown[][] = [];

  for (let i = 0; i < maxLength; i++) {
    result.push(arrays.map((a) => a[i]));
  }

  return result;
}

/**
 * Find the index of an item by predicate
 * @param array - Array to search
 * @param predicate - Function to match
 * @returns Index or -1 if not found
 */
export function findIndex<T>(
  array: T[],
  predicate: (item: T) => boolean,
): number {
  if (!array || !Array.isArray(array)) {
    return -1;
  }
  return array.findIndex(predicate);
}

/**
 * Check if all items match a predicate
 * @param array - Array to check
 * @param predicate - Function to match
 * @returns Whether all items match
 */
export function every<T>(array: T[], predicate: (item: T) => boolean): boolean {
  if (!array || !Array.isArray(array)) {
    return true;
  }
  return array.every(predicate);
}

/**
 * Check if any item matches a predicate
 * @param array - Array to check
 * @param predicate - Function to match
 * @returns Whether any item matches
 */
export function some<T>(array: T[], predicate: (item: T) => boolean): boolean {
  if (!array || !Array.isArray(array)) {
    return false;
  }
  return array.some(predicate);
}

/**
 * Convert an array to a lookup object
 * @param array - Array to convert
 * @param keyOrFn - Key or function to get the key
 * @returns Lookup object
 * @example
 * toLookup([{ id: 1, name: 'a' }, { id: 2, name: 'b' }], 'id')
 * // { 1: { id: 1, name: 'a' }, 2: { id: 2, name: 'b' } }
 */
export function toLookup<T, K extends string | number>(
  array: T[],
  keyOrFn: keyof T | ((item: T) => K),
): Record<K, T> {
  if (!array || !Array.isArray(array)) {
    return {} as Record<K, T>;
  }

  const getKey =
    typeof keyOrFn === "function"
      ? keyOrFn
      : (item: T) => item[keyOrFn] as unknown as K;

  return array.reduce(
    (result, item) => {
      const key = getKey(item);
      if (key !== undefined && key !== null) {
        result[key] = item;
      }
      return result;
    },
    {} as Record<K, T>,
  );
}
