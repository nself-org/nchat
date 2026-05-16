/**
 * Formats a Date into a human-readable time string (HH:MM AM/PM).
 *
 * @param date - The date to format.
 * @returns A formatted time string, e.g. "2:34 PM".
 */
export declare function formatTimestamp(date: Date): string;
/**
 * Converts arbitrary text into a URL-safe slug.
 * Lowercases, strips non-alphanumeric characters, and collapses hyphens.
 *
 * @param text - The text to slugify.
 * @returns A lowercase hyphen-separated slug.
 */
export declare function slugify(text: string): string;
/**
 * Asserts that a code path is unreachable at compile time.
 * Use in exhaustive switch statements to enforce all cases are handled.
 *
 * @param x - The value that should be of type `never`.
 * @throws Always throws at runtime if reached.
 */
export declare function assertUnreachable(x: never): never;
//# sourceMappingURL=index.d.ts.map