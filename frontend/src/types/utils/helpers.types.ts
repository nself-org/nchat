/**
 * Type Helper Utilities for nself-chat
 *
 * Common TypeScript utility types used throughout the application.
 * These extend the built-in TypeScript utility types.
 */

// ============================================================================
// Object Manipulation Types
// ============================================================================

/**
 * Make all properties in T optional recursively.
 */
export type DeepPartial<T> = T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * Make all properties in T required recursively.
 */
export type DeepRequired<T> = T extends object
  ? { [P in keyof T]-?: DeepRequired<T[P]> }
  : T;

/**
 * Make all properties in T readonly recursively.
 */
export type DeepReadonly<T> = T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

/**
 * Make all properties in T mutable recursively.
 */
export type DeepMutable<T> = T extends object
  ? { -readonly [P in keyof T]: DeepMutable<T[P]> }
  : T;

/**
 * Make specific keys K of T optional.
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Make specific keys K of T required.
 */
export type RequiredBy<T, K extends keyof T> = Omit<T, K> &
  Required<Pick<T, K>>;

/**
 * Make specific keys K of T nullable.
 */
export type NullableBy<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};

/**
 * Merge two types, with T2 taking precedence.
 */
export type Merge<T1, T2> = Omit<T1, keyof T2> & T2;

/**
 * Create a type with only the specified keys from T.
 */
export type PickByValue<T, V> = Pick<
  T,
  { [K in keyof T]: T[K] extends V ? K : never }[keyof T]
>;

/**
 * Create a type excluding keys with specific value types.
 */
export type OmitByValue<T, V> = Pick<
  T,
  { [K in keyof T]: T[K] extends V ? never : K }[keyof T]
>;

/**
 * Get keys of T that have values assignable to V.
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Get the type of values in an object.
 */
export type ValueOf<T> = T[keyof T];

/**
 * Make all function properties return Promise.
 */
export type Asyncify<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R
    ? (...args: A) => Promise<R>
    : T[K];
};

// ============================================================================
// Array Types
// ============================================================================

/**
 * Get the type of array elements.
 */
export type ArrayElement<T> = T extends readonly (infer E)[] ? E : never;

/**
 * Create a tuple type of length N with elements of type T.
 */
export type Tuple<
  T,
  N extends number,
  R extends T[] = [],
> = R["length"] extends N ? R : Tuple<T, N, [T, ...R]>;

/**
 * Get the first element type of a tuple.
 */
export type Head<T extends unknown[]> = T extends [infer H, ...unknown[]]
  ? H
  : never;

/**
 * Get all but the first element of a tuple.
 */
export type Tail<T extends unknown[]> = T extends [unknown, ...infer R]
  ? R
  : never;

/**
 * Get the last element type of a tuple.
 */
export type Last<T extends unknown[]> = T extends [...unknown[], infer L]
  ? L
  : never;

/**
 * Ensure a value is an array.
 */
export type Arrayify<T> = T extends unknown[] ? T : [T];

/**
 * Non-empty array type.
 */
export type NonEmptyArray<T> = [T, ...T[]];

// ============================================================================
// Function Types
// ============================================================================

/**
 * Extract the parameter types of a function.
 */
export type Params<T> = T extends (...args: infer P) => unknown ? P : never;

/**
 * Extract the return type of a function.
 */
export type Return<T> = T extends (...args: unknown[]) => infer R ? R : never;

/**
 * Extract the awaited type of a Promise.
 */
export type Await<T> = T extends Promise<infer U> ? U : T;

/**
 * Create a function type with typed arguments and return.
 */
export type TypedFunction<TArgs extends unknown[], TReturn> = (
  ...args: TArgs
) => TReturn;

/**
 * Create an async function type.
 */
export type AsyncFunction<TArgs extends unknown[], TReturn> = (
  ...args: TArgs
) => Promise<TReturn>;

/**
 * Extract the "this" type from a function.
 */
export type ThisType<T> = T extends (
  this: infer U,
  ...args: unknown[]
) => unknown
  ? U
  : never;

// ============================================================================
// Union Types
// ============================================================================

/**
 * Convert a union type to an intersection type.
 */
export type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Get the last type in a union.
 */
export type LastOfUnion<T> =
  UnionToIntersection<T extends unknown ? () => T : never> extends () => infer R
    ? R
    : never;

/**
 * Convert a union type to a tuple type.
 */
export type UnionToTuple<T, L = LastOfUnion<T>> = [T] extends [never]
  ? []
  : [...UnionToTuple<Exclude<T, L>>, L];

/**
 * Exclude null and undefined from a type.
 */
export type NonNullable<T> = T extends null | undefined ? never : T;

/**
 * Make a union type strict (no extra properties).
 */
export type Strict<T> = T & { [K in Exclude<keyof T, keyof T>]?: never };

// ============================================================================
// String Types
// ============================================================================

/**
 * Convert string to lowercase.
 */
export type Lowercase<S extends string> = S extends `${infer F}${infer R}`
  ? `${F extends Uppercase<F> ? Lowercase<F> : F}${Lowercase<R>}`
  : S;

/**
 * Convert string to uppercase.
 */
export type Uppercase<S extends string> = S extends `${infer F}${infer R}`
  ? `${F extends Lowercase<F> ? Uppercase<F> : F}${Uppercase<R>}`
  : S;

/**
 * Capitalize first letter.
 */
export type Capitalize<S extends string> = S extends `${infer F}${infer R}`
  ? `${Uppercase<F>}${R}`
  : S;

/**
 * Convert snake_case to camelCase.
 */
export type SnakeToCamel<S extends string> = S extends `${infer T}_${infer U}`
  ? `${T}${Capitalize<SnakeToCamel<U>>}`
  : S;

/**
 * Convert camelCase to snake_case.
 */
export type CamelToSnake<S extends string> = S extends `${infer T}${infer U}`
  ? T extends Uppercase<T>
    ? `_${Lowercase<T>}${CamelToSnake<U>}`
    : `${T}${CamelToSnake<U>}`
  : S;

/**
 * String literal type.
 */
export type StringLiteral<T> = T extends string
  ? string extends T
    ? never
    : T
  : never;

// ============================================================================
// Conditional Types
// ============================================================================

/**
 * If condition type.
 */
export type If<C extends boolean, T, F> = C extends true ? T : F;

/**
 * Check if types are equal.
 */
export type IsEqual<A, B> =
  (<G>() => G extends A ? 1 : 2) extends <G>() => G extends B ? 1 : 2
    ? true
    : false;

/**
 * Check if type is any.
 */
export type IsAny<T> = 0 extends 1 & T ? true : false;

/**
 * Check if type is never.
 */
export type IsNever<T> = [T] extends [never] ? true : false;

/**
 * Check if type is unknown.
 */
export type IsUnknown<T> =
  IsAny<T> extends true ? false : unknown extends T ? true : false;

/**
 * Check if type is a union.
 */
export type IsUnion<T, U extends T = T> = T extends unknown
  ? [U] extends [T]
    ? false
    : true
  : false;

// ============================================================================
// Record Types
// ============================================================================

/**
 * Create a record type with optional values.
 */
export type OptionalRecord<K extends keyof never, V> = Partial<Record<K, V>>;

/**
 * Create a record type with readonly values.
 */
export type ReadonlyRecord<K extends keyof never, V> = Readonly<Record<K, V>>;

/**
 * Dictionary type (string keys).
 */
export type Dictionary<T> = Record<string, T>;

/**
 * Numeric dictionary type (number keys).
 */
export type NumericDictionary<T> = Record<number, T>;

// ============================================================================
// Utility Functions as Types
// ============================================================================

/**
 * Remove index signature from type.
 */
export type RemoveIndex<T> = {
  [K in keyof T as string extends K
    ? never
    : number extends K
      ? never
      : K]: T[K];
};

/**
 * Get property path types.
 */
export type Path<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends Record<string, unknown>
    ? `${K}` | `${K}.${Path<T[K]>}`
    : `${K}`
  : never;

/**
 * Get type at property path.
 */
export type PathValue<T, P extends string> = P extends `${infer K}.${infer R}`
  ? K extends keyof T
    ? PathValue<T[K], R>
    : never
  : P extends keyof T
    ? T[P]
    : never;

// ============================================================================
// Assertion Types
// ============================================================================

/**
 * Assert that types are equal (compile-time check).
 */
export type AssertEqual<T, U> =
  IsEqual<T, U> extends true
    ? true
    : { error: "Types are not equal"; expected: T; actual: U };

/**
 * Assert that type extends another.
 */
export type AssertExtends<T, U> = T extends U
  ? true
  : { error: "Type does not extend"; expected: U; actual: T };

/**
 * Assert that type is not any.
 */
export type AssertNotAny<T> =
  IsAny<T> extends true ? { error: "Type is any" } : true;

// ============================================================================
// Brand/Nominal Types Support
// ============================================================================

/**
 * Create a nominal/branded type.
 */
export type Nominal<T, Tag extends string> = T & { readonly __tag: Tag };

/**
 * Extract the base type from a nominal type.
 */
export type BaseType<T> = T extends Nominal<infer U, string> ? U : T;
