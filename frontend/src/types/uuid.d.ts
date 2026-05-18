/**
 * Type declarations for uuid package
 */
declare module "uuid" {
  /**
   * Generate a RFC4122 version 1 (timestamp-based) UUID
   */
  export function v1(
    options?: {
      node?: number[];
      clockseq?: number;
      msecs?: number;
      nsecs?: number;
      random?: number[];
      rng?: () => number[];
    },
    buf?: number[],
    offset?: number,
  ): string;

  /**
   * Generate a RFC4122 version 3 (namespace w/ MD5) UUID
   */
  export function v3(
    name: string | number[],
    namespace: string | number[],
  ): string;
  export namespace v3 {
    const DNS: string;
    const URL: string;
  }

  /**
   * Generate a RFC4122 version 4 (random) UUID
   */
  export function v4(
    options?: {
      random?: number[];
      rng?: () => number[];
    },
    buf?: number[],
    offset?: number,
  ): string;

  /**
   * Generate a RFC4122 version 5 (namespace w/ SHA-1) UUID
   */
  export function v5(
    name: string | number[],
    namespace: string | number[],
  ): string;
  export namespace v5 {
    const DNS: string;
    const URL: string;
  }

  /**
   * The nil UUID (all zeros)
   */
  export const NIL: string;

  /**
   * Parse a UUID string to an array of bytes
   */
  export function parse(uuid: string): Uint8Array;

  /**
   * Convert array of bytes to a UUID string
   */
  export function stringify(arr: Uint8Array, offset?: number): string;

  /**
   * Validate a UUID string
   */
  export function validate(uuid: string): boolean;

  /**
   * Detect the version of a UUID
   */
  export function version(uuid: string): number;
}
