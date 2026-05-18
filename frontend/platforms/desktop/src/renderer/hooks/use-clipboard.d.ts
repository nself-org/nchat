/**
 * Clipboard Hook for ɳChat Desktop
 *
 * Wraps Electron's clipboard IPC bridge for reading/writing text and images.
 * Falls back to the browser Clipboard API when not running in Electron.
 *
 * @example
 * ```typescript
 * function MessageInput() {
 *   const { readText, writeText, readImage, hasImage } = useClipboard()
 *
 *   const handlePaste = async () => {
 *     if (await hasImage()) {
 *       const dataUrl = await readImage()
 *       // Insert image attachment
 *     } else {
 *       const text = await readText()
 *       insertText(text)
 *     }
 *   }
 * }
 * ```
 */
export declare function useClipboard(): {
    readText: () => Promise<string>;
    writeText: (text: string) => void;
    readImage: () => Promise<string | null>;
    writeImage: (dataUrl: string) => void;
    hasImage: () => Promise<boolean>;
};
//# sourceMappingURL=use-clipboard.d.ts.map