/**
 * Shared utility functions for @nself-chat/ui components.
 *
 * @module lib/utils
 */

import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merge Tailwind CSS class names without conflicts.
 * Combines clsx for conditional classes + tailwind-merge for dedup.
 *
 * @param inputs - Class names, conditionals, or falsy values
 * @returns Merged class string
 * @example
 * ```tsx
 * cn('px-4 py-2', isActive && 'bg-blue-500', 'text-white')
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Debounce a function — delay execution until calls have stopped for `delay` ms.
 *
 * @param fn - Function to debounce
 * @param delay - Delay in milliseconds
 * @returns Debounced function
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}
