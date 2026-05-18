import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
/**
 * Merges Tailwind CSS class names, deduplicating conflicting utilities.
 * Uses clsx for conditional classes and tailwind-merge for conflict resolution.
 */
export function cn(...inputs) {
    return twMerge(clsx(inputs));
}
