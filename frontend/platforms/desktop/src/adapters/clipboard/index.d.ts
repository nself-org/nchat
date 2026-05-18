/**
 * Clipboard Adapter for Desktop
 *
 * Provides clipboard access using Electron's clipboard API
 */
/**
 * Clipboard adapter interface
 */
export interface ClipboardAdapter {
    readText(): Promise<string>;
    writeText(text: string): Promise<void>;
    readImage(): Promise<string | null>;
    writeImage(dataUrl: string): Promise<void>;
    clear(): Promise<void>;
}
/**
 * Desktop clipboard implementation using navigator.clipboard
 * with Electron enhancements
 *
 * @example
 * ```typescript
 * import { desktopClipboard } from '@/adapters/clipboard'
 *
 * // Read text
 * const text = await desktopClipboard.readText()
 *
 * // Write text
 * await desktopClipboard.writeText('Hello World')
 *
 * // Read image
 * const imageData = await desktopClipboard.readImage()
 *
 * // Write image
 * await desktopClipboard.writeImage('data:image/png;base64,...')
 * ```
 */
export declare const desktopClipboard: ClipboardAdapter;
/**
 * Clipboard helper functions
 */
export declare const clipboardHelpers: {
    /**
     * Copy text to clipboard with feedback
     */
    copyText(text: string): Promise<boolean>;
    /**
     * Paste text from clipboard
     */
    pasteText(): Promise<string>;
    /**
     * Check if clipboard has text
     */
    hasText(): Promise<boolean>;
    /**
     * Check if clipboard has image
     */
    hasImage(): Promise<boolean>;
};
export default desktopClipboard;
//# sourceMappingURL=index.d.ts.map