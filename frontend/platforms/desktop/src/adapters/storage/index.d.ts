/**
 * Storage Adapter for Desktop
 *
 * Provides a unified storage interface using electron-store
 * Compatible with LocalStorage interface for web compatibility
 */
import Store from 'electron-store';
/**
 * Storage adapter interface matching Web Storage API
 */
export interface StorageAdapter {
    getItem(key: string): string | null;
    setItem(key: string, value: string): void;
    removeItem(key: string): void;
    clear(): void;
    keys(): string[];
}
/**
 * Desktop storage implementation using electron-store
 *
 * Provides persistent storage across app restarts
 *
 * @example
 * ```typescript
 * import { desktopStorage } from '@/adapters/storage'
 *
 * // Store data
 * desktopStorage.setItem('user_token', 'abc123')
 *
 * // Retrieve data
 * const token = desktopStorage.getItem('user_token')
 *
 * // Remove data
 * desktopStorage.removeItem('user_token')
 *
 * // Clear all data
 * desktopStorage.clear()
 * ```
 */
export declare const desktopStorage: StorageAdapter;
/**
 * Typed storage helpers for common use cases
 */
export declare const typedStorage: {
    /**
     * Get a JSON object from storage
     */
    getJSON<T>(key: string): T | null;
    /**
     * Set a JSON object in storage
     */
    setJSON<T>(key: string, value: T): void;
    /**
     * Get a boolean from storage
     */
    getBoolean(key: string): boolean | null;
    /**
     * Set a boolean in storage
     */
    setBoolean(key: string, value: boolean): void;
    /**
     * Get a number from storage
     */
    getNumber(key: string): number | null;
    /**
     * Set a number in storage
     */
    setNumber(key: string, value: number): void;
};
/**
 * Get the electron-store instance for advanced usage
 */
export declare function getStore(): Store;
/**
 * Get the storage file path
 */
export declare function getStoragePath(): string;
export default desktopStorage;
//# sourceMappingURL=index.d.ts.map