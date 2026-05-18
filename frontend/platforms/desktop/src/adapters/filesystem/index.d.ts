/**
 * Filesystem Adapter for Desktop
 *
 * Provides file system access using web File System Access API
 * and Electron's shell API
 */
/**
 * Filesystem adapter interface
 */
export interface FilesystemAdapter {
    selectFile(options?: FilePickerOptions): Promise<File | null>;
    selectFiles(options?: FilePickerOptions): Promise<File[]>;
    selectDirectory(): Promise<FileSystemDirectoryHandle | null>;
    saveFile(filename: string, content: Blob | string): Promise<boolean>;
    openPath(path: string): Promise<void>;
    showInFolder(path: string): Promise<void>;
}
/**
 * File picker options
 */
export interface FilePickerOptions {
    accept?: {
        [key: string]: string[];
    };
    multiple?: boolean;
    description?: string;
}
/**
 * Desktop filesystem implementation
 *
 * @example
 * ```typescript
 * import { desktopFilesystem } from '@/adapters/filesystem'
 *
 * // Select single file
 * const file = await desktopFilesystem.selectFile({
 *   accept: { 'image/*': ['.png', '.jpg', '.gif'] }
 * })
 *
 * // Select multiple files
 * const files = await desktopFilesystem.selectFiles()
 *
 * // Save file
 * await desktopFilesystem.saveFile('export.json', jsonData)
 *
 * // Show file in folder (Electron)
 * await desktopFilesystem.showInFolder('/path/to/file.txt')
 * ```
 */
export declare const desktopFilesystem: FilesystemAdapter;
/**
 * Filesystem helper functions
 */
export declare const filesystemHelpers: {
    /**
     * Read file as text
     */
    readAsText(file: File): Promise<string>;
    /**
     * Read file as data URL
     */
    readAsDataUrl(file: File): Promise<string>;
    /**
     * Read file as array buffer
     */
    readAsArrayBuffer(file: File): Promise<ArrayBuffer>;
};
export default desktopFilesystem;
//# sourceMappingURL=index.d.ts.map