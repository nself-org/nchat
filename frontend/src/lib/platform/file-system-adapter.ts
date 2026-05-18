/**
 * File System Adapter Module
 *
 * Provides a unified file system interface across platforms.
 * Supports web (File System Access API), mobile (Capacitor Filesystem),
 * and desktop (Node fs via Electron/Tauri).
 */

import {
  Platform,
  detectPlatform,
  hasFileSystemAccessAPI,
  isBrowser,
} from "./platform-detector";

// ============================================================================
// Types
// ============================================================================

/**
 * File encoding types
 */
export type FileEncoding = "utf8" | "base64" | "binary";

/**
 * Directory types for mobile platforms
 */
export type Directory =
  | "documents"
  | "data"
  | "cache"
  | "external"
  | "library"
  | "temp";

/**
 * File info structure
 */
export interface FileInfo {
  /** File name */
  name: string;
  /** Full path */
  path: string;
  /** File size in bytes */
  size: number;
  /** MIME type */
  type: string;
  /** Last modified timestamp */
  lastModified: number;
  /** Is directory */
  isDirectory: boolean;
  /** Is file */
  isFile: boolean;
}

/**
 * Read options
 */
export interface ReadOptions {
  /** File encoding */
  encoding?: FileEncoding;
  /** Directory (for mobile) */
  directory?: Directory;
}

/**
 * Write options
 */
export interface WriteOptions {
  /** File encoding */
  encoding?: FileEncoding;
  /** Directory (for mobile) */
  directory?: Directory;
  /** Create directory if not exists */
  recursive?: boolean;
  /** Append to file instead of overwrite */
  append?: boolean;
}

/**
 * File picker options
 */
export interface FilePickerOptions {
  /** Accepted file types (MIME types or extensions) */
  accept?: string[];
  /** Allow multiple file selection */
  multiple?: boolean;
  /** Starting directory (desktop only) */
  startIn?: string;
}

/**
 * Save file options
 */
export interface SaveFileOptions {
  /** Suggested file name */
  suggestedName?: string;
  /** Accepted file types */
  accept?: string[];
  /** Starting directory (desktop only) */
  startIn?: string;
}

/**
 * Directory picker options
 */
export interface DirectoryPickerOptions {
  /** Starting directory */
  startIn?: string;
  /** Mode (read or readwrite) */
  mode?: "read" | "readwrite";
}

/**
 * File system adapter interface
 */
export interface FileSystemAdapter {
  /** Read file contents */
  readFile(path: string, options?: ReadOptions): Promise<string | ArrayBuffer>;
  /** Write file contents */
  writeFile(
    path: string,
    data: string | ArrayBuffer,
    options?: WriteOptions,
  ): Promise<void>;
  /** Delete file */
  deleteFile(path: string, options?: { directory?: Directory }): Promise<void>;
  /** Check if file exists */
  exists(path: string, options?: { directory?: Directory }): Promise<boolean>;
  /** Get file info */
  stat(path: string, options?: { directory?: Directory }): Promise<FileInfo>;
  /** List directory contents */
  readDir(
    path: string,
    options?: { directory?: Directory },
  ): Promise<FileInfo[]>;
  /** Create directory */
  mkdir(path: string, options?: WriteOptions): Promise<void>;
  /** Delete directory */
  rmdir(
    path: string,
    options?: { directory?: Directory; recursive?: boolean },
  ): Promise<void>;
  /** Copy file */
  copy(
    source: string,
    destination: string,
    options?: { directory?: Directory },
  ): Promise<void>;
  /** Move/rename file */
  move(
    source: string,
    destination: string,
    options?: { directory?: Directory },
  ): Promise<void>;
  /** Open file picker dialog */
  pickFile?(options?: FilePickerOptions): Promise<File[]>;
  /** Open save dialog */
  saveFile?(
    data: string | ArrayBuffer,
    options?: SaveFileOptions,
  ): Promise<boolean>;
  /** Open directory picker */
  pickDirectory?(options?: DirectoryPickerOptions): Promise<string | null>;
  /** Check if file system access is available */
  isAvailable(): boolean;
}

/**
 * File system window properties (used with type intersection, not extension)
 */
interface FileSystemWindowExtras {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    types?: { description?: string; accept: Record<string, string[]> }[];
    startIn?: FileSystemHandle | string;
  }) => Promise<FileSystemFileHandle[]>;
  showSaveFilePicker?: (options?: {
    suggestedName?: string;
    types?: { description?: string; accept: Record<string, string[]> }[];
    startIn?: FileSystemHandle | string;
  }) => Promise<FileSystemFileHandle>;
  showDirectoryPicker?: (options?: {
    startIn?: FileSystemHandle | string;
    mode?: "read" | "readwrite";
  }) => Promise<FileSystemDirectoryHandle>;
  Capacitor?: {
    Plugins?: {
      Filesystem?: {
        readFile: (opts: {
          path: string;
          directory?: string;
          encoding?: string;
        }) => Promise<{ data: string }>;
        writeFile: (opts: {
          path: string;
          data: string;
          directory?: string;
          encoding?: string;
          recursive?: boolean;
        }) => Promise<void>;
        deleteFile: (opts: {
          path: string;
          directory?: string;
        }) => Promise<void>;
        stat: (opts: { path: string; directory?: string }) => Promise<{
          type: string;
          size: number;
          mtime: number;
          uri: string;
        }>;
        readdir: (opts: { path: string; directory?: string }) => Promise<{
          files: {
            name: string;
            type: string;
            size: number;
            mtime: number;
            uri: string;
          }[];
        }>;
        mkdir: (opts: {
          path: string;
          directory?: string;
          recursive?: boolean;
        }) => Promise<void>;
        rmdir: (opts: {
          path: string;
          directory?: string;
          recursive?: boolean;
        }) => Promise<void>;
        copy: (opts: {
          from: string;
          to: string;
          directory?: string;
        }) => Promise<void>;
        rename: (opts: {
          from: string;
          to: string;
          directory?: string;
        }) => Promise<void>;
      };
    };
  };
  electron?: {
    fs?: {
      readFile: (path: string, encoding?: string) => Promise<string | Buffer>;
      writeFile: (path: string, data: string | Buffer) => Promise<void>;
      unlink: (path: string) => Promise<void>;
      stat: (path: string) => Promise<{
        size: number;
        mtime: Date;
        isDirectory: () => boolean;
        isFile: () => boolean;
      }>;
      readdir: (path: string) => Promise<string[]>;
      mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
      rmdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
      copyFile: (src: string, dest: string) => Promise<void>;
      rename: (oldPath: string, newPath: string) => Promise<void>;
      exists: (path: string) => Promise<boolean>;
    };
    dialog?: {
      showOpenDialog: (
        options: Record<string, unknown>,
      ) => Promise<{ canceled: boolean; filePaths: string[] }>;
      showSaveDialog: (
        options: Record<string, unknown>,
      ) => Promise<{ canceled: boolean; filePath?: string }>;
    };
  };
  __TAURI__?: {
    core: {
      invoke: <T>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
    };
    event: {
      listen: <T>(
        event: string,
        handler: (event: { payload: T }) => void,
      ) => Promise<() => void>;
      emit: (event: string, payload?: unknown) => Promise<void>;
    };
    fs?: {
      readDir: (path: string, options?: unknown) => Promise<unknown>;
      readFile: (path: string, options?: unknown) => Promise<unknown>;
      writeFile: (
        path: string,
        contents: unknown,
        options?: unknown,
      ) => Promise<void>;
      removeFile: (path: string) => Promise<void>;
      exists: (path: string) => Promise<boolean>;
    };
  };
}

type FileSystemWindow = Window & FileSystemWindowExtras;

// ============================================================================
// Web File System Adapter
// ============================================================================

/**
 * Web File System Access API adapter
 */
export class WebFileSystemAdapter implements FileSystemAdapter {
  private fileHandles: Map<string, FileSystemFileHandle> = new Map();

  isAvailable(): boolean {
    return hasFileSystemAccessAPI();
  }

  async readFile(
    path: string,
    options?: ReadOptions,
  ): Promise<string | ArrayBuffer> {
    const handle = this.fileHandles.get(path);
    if (!handle) {
      throw new Error(`File not found: ${path}. Use pickFile() first.`);
    }

    const file = await handle.getFile();
    if (options?.encoding === "base64" || options?.encoding === "binary") {
      return file.arrayBuffer();
    }
    return file.text();
  }

  async writeFile(
    path: string,
    data: string | ArrayBuffer,
    options?: WriteOptions,
  ): Promise<void> {
    let handle = this.fileHandles.get(path);

    if (!handle) {
      // Try to create through save dialog
      const result = await this.saveFile(data, {
        suggestedName: path.split("/").pop(),
      });
      if (!result) {
        throw new Error("File save cancelled");
      }
      return;
    }

    const writable = await handle.createWritable();
    try {
      if (options?.append) {
        const file = await handle.getFile();
        const existingData = await file.text();
        await writable.write(
          existingData +
            (typeof data === "string" ? data : new TextDecoder().decode(data)),
        );
      } else {
        await writable.write(data);
      }
    } finally {
      await writable.close();
    }
  }

  async deleteFile(_path: string): Promise<void> {
    throw new Error("Web File System API does not support file deletion");
  }

  async exists(path: string): Promise<boolean> {
    return this.fileHandles.has(path);
  }

  async stat(path: string): Promise<FileInfo> {
    const handle = this.fileHandles.get(path);
    if (!handle) {
      throw new Error(`File not found: ${path}`);
    }

    const file = await handle.getFile();
    return {
      name: file.name,
      path: path,
      size: file.size,
      type: file.type,
      lastModified: file.lastModified,
      isDirectory: false,
      isFile: true,
    };
  }

  async readDir(_path: string): Promise<FileInfo[]> {
    throw new Error(
      "Web File System API directory listing requires directory handle",
    );
  }

  async mkdir(_path: string): Promise<void> {
    throw new Error("Web File System API does not support directory creation");
  }

  async rmdir(_path: string): Promise<void> {
    throw new Error("Web File System API does not support directory deletion");
  }

  async copy(_source: string, _destination: string): Promise<void> {
    throw new Error("Web File System API does not support file copy");
  }

  async move(_source: string, _destination: string): Promise<void> {
    throw new Error("Web File System API does not support file move");
  }

  async pickFile(options?: FilePickerOptions): Promise<File[]> {
    const win = window as FileSystemWindow;
    if (!win.showOpenFilePicker) {
      // Fallback to input element
      return this.pickFileViaInput(options);
    }

    try {
      const handles = await win.showOpenFilePicker({
        multiple: options?.multiple ?? false,
        types: options?.accept?.map((type) => ({
          accept: { [type]: type.startsWith(".") ? [type] : [] },
        })),
      });

      const files: File[] = [];
      for (const handle of handles) {
        const file = await handle.getFile();
        this.fileHandles.set(file.name, handle);
        files.push(file);
      }

      return files;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return [];
      }
      throw error;
    }
  }

  private async pickFileViaInput(options?: FilePickerOptions): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.multiple = options?.multiple ?? false;
      if (options?.accept) {
        input.accept = options.accept.join(",");
      }

      input.onchange = () => {
        const files = Array.from(input.files || []);
        resolve(files);
      };

      input.click();
    });
  }

  async saveFile(
    data: string | ArrayBuffer,
    options?: SaveFileOptions,
  ): Promise<boolean> {
    const win = window as FileSystemWindow;
    if (!win.showSaveFilePicker) {
      // Fallback to download link
      return this.saveFileViaDownload(data, options);
    }

    try {
      const handle = await win.showSaveFilePicker({
        suggestedName: options?.suggestedName,
        types: options?.accept?.map((type) => ({
          accept: { [type]: type.startsWith(".") ? [type] : [] },
        })),
      });

      const writable = await handle.createWritable();
      await writable.write(data);
      await writable.close();

      this.fileHandles.set(handle.name, handle);
      return true;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return false;
      }
      throw error;
    }
  }

  private saveFileViaDownload(
    data: string | ArrayBuffer,
    options?: SaveFileOptions,
  ): boolean {
    const blob =
      data instanceof ArrayBuffer
        ? new Blob([data])
        : new Blob([data], { type: "text/plain" });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = options?.suggestedName || "download";
    link.click();

    URL.revokeObjectURL(url);
    return true;
  }

  async pickDirectory(
    options?: DirectoryPickerOptions,
  ): Promise<string | null> {
    const win = window as FileSystemWindow;
    if (!win.showDirectoryPicker) {
      return null;
    }

    try {
      const handle = await win.showDirectoryPicker({
        mode: options?.mode,
      });
      return handle.name;
    } catch (error) {
      if ((error as Error).name === "AbortError") {
        return null;
      }
      throw error;
    }
  }
}

// ============================================================================
// Capacitor File System Adapter
// ============================================================================

/**
 * Capacitor Filesystem adapter for mobile
 */
export class CapacitorFileSystemAdapter implements FileSystemAdapter {
  private getFilesystem():
    | NonNullable<
        NonNullable<FileSystemWindow["Capacitor"]>["Plugins"]
      >["Filesystem"]
    | null {
    const win =
      typeof window !== "undefined" ? (window as FileSystemWindow) : null;
    return win?.Capacitor?.Plugins?.Filesystem ?? null;
  }

  private mapDirectory(dir?: Directory): string {
    switch (dir) {
      case "documents":
        return "DOCUMENTS";
      case "data":
        return "DATA";
      case "cache":
        return "CACHE";
      case "external":
        return "EXTERNAL";
      case "library":
        return "LIBRARY";
      case "temp":
        return "CACHE";
      default:
        return "DATA";
    }
  }

  isAvailable(): boolean {
    return !!this.getFilesystem();
  }

  async readFile(
    path: string,
    options?: ReadOptions,
  ): Promise<string | ArrayBuffer> {
    const Filesystem = this.getFilesystem();
    if (!Filesystem) {
      throw new Error("Capacitor Filesystem not available");
    }

    const encoding =
      options?.encoding === "binary" || options?.encoding === "base64"
        ? undefined
        : "utf8";

    const { data } = await Filesystem.readFile({
      path,
      directory: this.mapDirectory(options?.directory),
      encoding,
    });

    if (options?.encoding === "base64") {
      // Convert base64 to ArrayBuffer
      const binary = atob(data);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes.buffer;
    }

    return data;
  }

  async writeFile(
    path: string,
    data: string | ArrayBuffer,
    options?: WriteOptions,
  ): Promise<void> {
    const Filesystem = this.getFilesystem();
    if (!Filesystem) {
      throw new Error("Capacitor Filesystem not available");
    }

    let dataString: string;
    let encoding = "utf8";

    if (data instanceof ArrayBuffer) {
      const bytes = new Uint8Array(data);
      dataString = btoa(String.fromCharCode(...bytes));
      encoding = "base64" as unknown as string;
    } else {
      dataString = data;
    }

    await Filesystem.writeFile({
      path,
      data: dataString,
      directory: this.mapDirectory(options?.directory),
      encoding,
      recursive: options?.recursive,
    });
  }

  async deleteFile(
    path: string,
    options?: { directory?: Directory },
  ): Promise<void> {
    const Filesystem = this.getFilesystem();
    if (!Filesystem) {
      throw new Error("Capacitor Filesystem not available");
    }

    await Filesystem.deleteFile({
      path,
      directory: this.mapDirectory(options?.directory),
    });
  }

  async exists(
    path: string,
    options?: { directory?: Directory },
  ): Promise<boolean> {
    try {
      await this.stat(path, options);
      return true;
    } catch {
      return false;
    }
  }

  async stat(
    path: string,
    options?: { directory?: Directory },
  ): Promise<FileInfo> {
    const Filesystem = this.getFilesystem();
    if (!Filesystem) {
      throw new Error("Capacitor Filesystem not available");
    }

    const result = await Filesystem.stat({
      path,
      directory: this.mapDirectory(options?.directory),
    });

    return {
      name: path.split("/").pop() || "",
      path: result.uri,
      size: result.size,
      type: "",
      lastModified: result.mtime,
      isDirectory: result.type === "directory",
      isFile: result.type === "file",
    };
  }

  async readDir(
    path: string,
    options?: { directory?: Directory },
  ): Promise<FileInfo[]> {
    const Filesystem = this.getFilesystem();
    if (!Filesystem) {
      throw new Error("Capacitor Filesystem not available");
    }

    const { files } = await Filesystem.readdir({
      path,
      directory: this.mapDirectory(options?.directory),
    });

    return files.map((file) => ({
      name: file.name,
      path: file.uri,
      size: file.size,
      type: "",
      lastModified: file.mtime,
      isDirectory: file.type === "directory",
      isFile: file.type === "file",
    }));
  }

  async mkdir(path: string, options?: WriteOptions): Promise<void> {
    const Filesystem = this.getFilesystem();
    if (!Filesystem) {
      throw new Error("Capacitor Filesystem not available");
    }

    await Filesystem.mkdir({
      path,
      directory: this.mapDirectory(options?.directory),
      recursive: options?.recursive,
    });
  }

  async rmdir(
    path: string,
    options?: { directory?: Directory; recursive?: boolean },
  ): Promise<void> {
    const Filesystem = this.getFilesystem();
    if (!Filesystem) {
      throw new Error("Capacitor Filesystem not available");
    }

    await Filesystem.rmdir({
      path,
      directory: this.mapDirectory(options?.directory),
      recursive: options?.recursive,
    });
  }

  async copy(
    source: string,
    destination: string,
    options?: { directory?: Directory },
  ): Promise<void> {
    const Filesystem = this.getFilesystem();
    if (!Filesystem) {
      throw new Error("Capacitor Filesystem not available");
    }

    await Filesystem.copy({
      from: source,
      to: destination,
      directory: this.mapDirectory(options?.directory),
    });
  }

  async move(
    source: string,
    destination: string,
    options?: { directory?: Directory },
  ): Promise<void> {
    const Filesystem = this.getFilesystem();
    if (!Filesystem) {
      throw new Error("Capacitor Filesystem not available");
    }

    await Filesystem.rename({
      from: source,
      to: destination,
      directory: this.mapDirectory(options?.directory),
    });
  }
}

// ============================================================================
// Electron File System Adapter
// ============================================================================

/**
 * Electron fs adapter for desktop
 */
export class ElectronFileSystemAdapter implements FileSystemAdapter {
  private getElectron(): FileSystemWindow["electron"] | null {
    const win =
      typeof window !== "undefined" ? (window as FileSystemWindow) : null;
    return win?.electron ?? null;
  }

  isAvailable(): boolean {
    return !!this.getElectron()?.fs;
  }

  async readFile(
    path: string,
    options?: ReadOptions,
  ): Promise<string | ArrayBuffer> {
    const electron = this.getElectron();
    if (!electron?.fs) {
      throw new Error("Electron fs not available");
    }

    const encoding =
      options?.encoding === "binary" || options?.encoding === "base64"
        ? undefined
        : "utf8";

    const data = await electron.fs.readFile(path, encoding);

    if (typeof data === "string") {
      return data;
    }

    // Convert Buffer to ArrayBuffer
    return (data as { buffer: ArrayBuffer }).buffer;
  }

  async writeFile(path: string, data: string | ArrayBuffer): Promise<void> {
    const electron = this.getElectron();
    if (!electron?.fs) {
      throw new Error("Electron fs not available");
    }

    await electron.fs.writeFile(path, data as string);
  }

  async deleteFile(path: string): Promise<void> {
    const electron = this.getElectron();
    if (!electron?.fs) {
      throw new Error("Electron fs not available");
    }

    await electron.fs.unlink(path);
  }

  async exists(path: string): Promise<boolean> {
    const electron = this.getElectron();
    if (!electron?.fs) {
      return false;
    }

    return electron.fs.exists(path);
  }

  async stat(path: string): Promise<FileInfo> {
    const electron = this.getElectron();
    if (!electron?.fs) {
      throw new Error("Electron fs not available");
    }

    const stats = await electron.fs.stat(path);
    const name = path.split(/[/\\]/).pop() || "";

    return {
      name,
      path,
      size: stats.size,
      type: "",
      lastModified: stats.mtime.getTime(),
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile(),
    };
  }

  async readDir(path: string): Promise<FileInfo[]> {
    const electron = this.getElectron();
    if (!electron?.fs) {
      throw new Error("Electron fs not available");
    }

    const names = await electron.fs.readdir(path);
    const infos: FileInfo[] = [];

    for (const name of names) {
      const filePath = `${path}/${name}`;
      try {
        const info = await this.stat(filePath);
        infos.push(info);
      } catch {
        // Skip files that can't be stat'd
      }
    }

    return infos;
  }

  async mkdir(path: string, options?: WriteOptions): Promise<void> {
    const electron = this.getElectron();
    if (!electron?.fs) {
      throw new Error("Electron fs not available");
    }

    await electron.fs.mkdir(path, { recursive: options?.recursive });
  }

  async rmdir(path: string, options?: { recursive?: boolean }): Promise<void> {
    const electron = this.getElectron();
    if (!electron?.fs) {
      throw new Error("Electron fs not available");
    }

    await electron.fs.rmdir(path, { recursive: options?.recursive });
  }

  async copy(source: string, destination: string): Promise<void> {
    const electron = this.getElectron();
    if (!electron?.fs) {
      throw new Error("Electron fs not available");
    }

    await electron.fs.copyFile(source, destination);
  }

  async move(source: string, destination: string): Promise<void> {
    const electron = this.getElectron();
    if (!electron?.fs) {
      throw new Error("Electron fs not available");
    }

    await electron.fs.rename(source, destination);
  }

  async pickFile(options?: FilePickerOptions): Promise<File[]> {
    const electron = this.getElectron();
    if (!electron?.dialog) {
      return [];
    }

    const result = await electron.dialog.showOpenDialog({
      properties: options?.multiple
        ? ["openFile", "multiSelections"]
        : ["openFile"],
      filters: options?.accept?.map((ext) => ({
        name: ext,
        extensions: [ext.replace(".", "")],
      })),
    });

    if (result.canceled) {
      return [];
    }

    // Create File objects from paths
    const files: File[] = [];
    for (const filePath of result.filePaths) {
      const data = await this.readFile(filePath);
      const name = filePath.split(/[/\\]/).pop() || "";
      files.push(new File([data], name));
    }

    return files;
  }

  async saveFile(
    data: string | ArrayBuffer,
    options?: SaveFileOptions,
  ): Promise<boolean> {
    const electron = this.getElectron();
    if (!electron?.dialog || !electron?.fs) {
      return false;
    }

    const result = await electron.dialog.showSaveDialog({
      defaultPath: options?.suggestedName,
    });

    if (result.canceled || !result.filePath) {
      return false;
    }

    await electron.fs.writeFile(result.filePath, data as string);
    return true;
  }
}

// ============================================================================
// Noop File System Adapter
// ============================================================================

/**
 * No-op file system adapter (for SSR or unsupported platforms)
 */
export class NoopFileSystemAdapter implements FileSystemAdapter {
  isAvailable(): boolean {
    return false;
  }

  async readFile(_path: string): Promise<string> {
    throw new Error("File system not available");
  }

  async writeFile(_path: string, _data: string | ArrayBuffer): Promise<void> {
    throw new Error("File system not available");
  }

  async deleteFile(_path: string): Promise<void> {
    throw new Error("File system not available");
  }

  async exists(_path: string): Promise<boolean> {
    return false;
  }

  async stat(_path: string): Promise<FileInfo> {
    throw new Error("File system not available");
  }

  async readDir(_path: string): Promise<FileInfo[]> {
    return [];
  }

  async mkdir(_path: string): Promise<void> {
    throw new Error("File system not available");
  }

  async rmdir(_path: string): Promise<void> {
    throw new Error("File system not available");
  }

  async copy(_source: string, _destination: string): Promise<void> {
    throw new Error("File system not available");
  }

  async move(_source: string, _destination: string): Promise<void> {
    throw new Error("File system not available");
  }
}

// ============================================================================
// Factory Functions
// ============================================================================

/**
 * Detect the best file system backend for the current platform
 */
export function detectFileSystemBackend():
  | "web"
  | "capacitor"
  | "electron"
  | "tauri"
  | "none" {
  const platform = detectPlatform();
  const win =
    typeof window !== "undefined" ? (window as FileSystemWindow) : null;

  switch (platform) {
    case Platform.ELECTRON:
      return win?.electron?.fs ? "electron" : "web";
    case Platform.TAURI:
      return win?.__TAURI__?.fs ? "tauri" : "web";
    case Platform.IOS:
    case Platform.ANDROID:
      return win?.Capacitor?.Plugins?.Filesystem ? "capacitor" : "none";
    case Platform.WEB:
    default:
      return hasFileSystemAccessAPI() ? "web" : "none";
  }
}

/**
 * Create a file system adapter for the current platform
 */
export function createFileSystemAdapter(): FileSystemAdapter {
  const backend = detectFileSystemBackend();

  switch (backend) {
    case "electron":
      return new ElectronFileSystemAdapter();
    case "capacitor":
      return new CapacitorFileSystemAdapter();
    case "web":
      return new WebFileSystemAdapter();
    case "none":
    default:
      return new NoopFileSystemAdapter();
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let defaultAdapter: FileSystemAdapter | null = null;

/**
 * Get the default file system adapter
 */
export function getFileSystemAdapter(): FileSystemAdapter {
  if (!defaultAdapter) {
    defaultAdapter = createFileSystemAdapter();
  }
  return defaultAdapter;
}

/**
 * Reset the default file system adapter
 */
export function resetFileSystemAdapter(): void {
  defaultAdapter = null;
}

// ============================================================================
// Exports
// ============================================================================

export const FileSystem = {
  // Adapters
  WebFileSystemAdapter,
  CapacitorFileSystemAdapter,
  ElectronFileSystemAdapter,
  NoopFileSystemAdapter,

  // Factory
  createFileSystemAdapter,
  detectFileSystemBackend,
  getFileSystemAdapter,
  resetFileSystemAdapter,
};

export default FileSystem;
