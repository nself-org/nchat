/**
 * Native Bridge Module
 *
 * Provides an abstraction layer for native platform APIs.
 * Implements a plugin system for extending functionality and
 * provides fallback implementations for non-native environments.
 */

import {
  Platform,
  detectPlatform,
  isNative,
  isBrowser,
} from "./platform-detector";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

/**
 * Plugin interface for extending native bridge
 */
export interface NativeBridgePlugin<T = unknown> {
  /** Unique plugin identifier */
  id: string;
  /** Human-readable plugin name */
  name: string;
  /** Plugin version */
  version: string;
  /** Platforms this plugin supports */
  supportedPlatforms: Platform[];
  /** Initialize the plugin */
  initialize: () => Promise<void>;
  /** Check if the plugin is available */
  isAvailable: () => boolean;
  /** Plugin API */
  api: T;
  /** Cleanup function */
  cleanup?: () => Promise<void>;
}

/**
 * Plugin registration options
 */
export interface PluginRegistrationOptions {
  /** Override existing plugin with same ID */
  override?: boolean;
  /** Initialize immediately after registration */
  autoInitialize?: boolean;
}

/**
 * Native bridge configuration
 */
export interface NativeBridgeConfig {
  /** Enable debug logging */
  debug?: boolean;
  /** Fallback to web APIs when native not available */
  enableFallbacks?: boolean;
  /** Plugin initialization timeout in ms */
  initTimeout?: number;
}

/**
 * Plugin state
 */
export interface PluginState {
  initialized: boolean;
  available: boolean;
  error?: Error;
}

/**
 * Bridge event types
 */
export type BridgeEventType =
  | "plugin:registered"
  | "plugin:initialized"
  | "plugin:error"
  | "plugin:removed"
  | "bridge:ready"
  | "bridge:error";

/**
 * Bridge event payload
 */
export interface BridgeEvent {
  type: BridgeEventType;
  pluginId?: string;
  data?: unknown;
  error?: Error;
  timestamp: number;
}

/**
 * Bridge event listener
 */
export type BridgeEventListener = (event: BridgeEvent) => void;

// ============================================================================
// Native Bridge Implementation
// ============================================================================

/**
 * Native Bridge class for managing platform plugins
 */
class NativeBridgeImpl {
  private plugins: Map<string, NativeBridgePlugin> = new Map();
  private pluginStates: Map<string, PluginState> = new Map();
  private eventListeners: Map<BridgeEventType, Set<BridgeEventListener>> =
    new Map();
  private config: NativeBridgeConfig;
  private initialized: boolean = false;
  private currentPlatform: Platform;

  constructor(config: NativeBridgeConfig = {}) {
    this.config = {
      debug: false,
      enableFallbacks: true,
      initTimeout: 5000,
      ...config,
    };
    this.currentPlatform = detectPlatform();
  }

  /**
   * Initialize the native bridge
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      this.log("Bridge already initialized");
      return;
    }

    try {
      this.log("Initializing native bridge...");
      this.currentPlatform = detectPlatform();
      this.initialized = true;
      this.emit({ type: "bridge:ready", timestamp: Date.now() });
      this.log("Native bridge initialized successfully");
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      this.emit({ type: "bridge:error", error: err, timestamp: Date.now() });
      throw err;
    }
  }

  /**
   * Register a plugin
   */
  registerPlugin<T>(
    plugin: NativeBridgePlugin<T>,
    options: PluginRegistrationOptions = {},
  ): boolean {
    const { override = false, autoInitialize = false } = options;

    // Check if plugin already exists
    if (this.plugins.has(plugin.id) && !override) {
      this.log(`Plugin ${plugin.id} already registered`);
      return false;
    }

    // Check platform support
    if (!plugin.supportedPlatforms.includes(this.currentPlatform)) {
      this.log(
        `Plugin ${plugin.id} does not support platform ${this.currentPlatform}`,
      );
      if (!this.config.enableFallbacks) {
        return false;
      }
    }

    this.plugins.set(plugin.id, plugin);
    this.pluginStates.set(plugin.id, {
      initialized: false,
      available: plugin.isAvailable(),
    });

    this.emit({
      type: "plugin:registered",
      pluginId: plugin.id,
      timestamp: Date.now(),
    });

    this.log(`Plugin ${plugin.id} registered`);

    if (autoInitialize) {
      this.initializePlugin(plugin.id).catch((error) => {
        this.log(`Auto-initialize failed for ${plugin.id}: ${error}`);
      });
    }

    return true;
  }

  /**
   * Unregister a plugin
   */
  async unregisterPlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    if (!plugin) {
      this.log(`Plugin ${pluginId} not found`);
      return false;
    }

    // Cleanup if needed
    if (plugin.cleanup) {
      try {
        await plugin.cleanup();
      } catch (error) {
        this.log(`Cleanup failed for ${pluginId}: ${error}`);
      }
    }

    this.plugins.delete(pluginId);
    this.pluginStates.delete(pluginId);

    this.emit({
      type: "plugin:removed",
      pluginId,
      timestamp: Date.now(),
    });

    this.log(`Plugin ${pluginId} unregistered`);
    return true;
  }

  /**
   * Initialize a specific plugin
   */
  async initializePlugin(pluginId: string): Promise<boolean> {
    const plugin = this.plugins.get(pluginId);
    const state = this.pluginStates.get(pluginId);

    if (!plugin || !state) {
      this.log(`Plugin ${pluginId} not found`);
      return false;
    }

    if (state.initialized) {
      this.log(`Plugin ${pluginId} already initialized`);
      return true;
    }

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`Plugin ${pluginId} initialization timeout`)),
          this.config.initTimeout,
        );
      });

      // Race initialization against timeout
      await Promise.race([plugin.initialize(), timeoutPromise]);

      this.pluginStates.set(pluginId, {
        ...state,
        initialized: true,
        available: plugin.isAvailable(),
      });

      this.emit({
        type: "plugin:initialized",
        pluginId,
        timestamp: Date.now(),
      });

      this.log(`Plugin ${pluginId} initialized`);
      return true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));

      this.pluginStates.set(pluginId, {
        ...state,
        initialized: false,
        error: err,
      });

      this.emit({
        type: "plugin:error",
        pluginId,
        error: err,
        timestamp: Date.now(),
      });

      this.log(`Plugin ${pluginId} initialization failed: ${err.message}`);
      return false;
    }
  }

  /**
   * Initialize all registered plugins
   */
  async initializeAllPlugins(): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    for (const pluginId of this.plugins.keys()) {
      const success = await this.initializePlugin(pluginId);
      results.set(pluginId, success);
    }

    return results;
  }

  /**
   * Get a plugin by ID
   */
  getPlugin<T>(pluginId: string): NativeBridgePlugin<T> | undefined {
    return this.plugins.get(pluginId) as NativeBridgePlugin<T> | undefined;
  }

  /**
   * Get plugin API
   */
  getPluginAPI<T>(pluginId: string): T | undefined {
    const plugin = this.plugins.get(pluginId) as
      | NativeBridgePlugin<T>
      | undefined;
    if (!plugin) {
      return undefined;
    }

    const state = this.pluginStates.get(pluginId);
    if (!state?.available) {
      return undefined;
    }

    return plugin.api;
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(pluginId: string): boolean {
    return this.plugins.has(pluginId);
  }

  /**
   * Check if a plugin is available
   */
  isPluginAvailable(pluginId: string): boolean {
    const state = this.pluginStates.get(pluginId);
    return state?.available ?? false;
  }

  /**
   * Check if a plugin is initialized
   */
  isPluginInitialized(pluginId: string): boolean {
    const state = this.pluginStates.get(pluginId);
    return state?.initialized ?? false;
  }

  /**
   * Get plugin state
   */
  getPluginState(pluginId: string): PluginState | undefined {
    return this.pluginStates.get(pluginId);
  }

  /**
   * Get all registered plugin IDs
   */
  getPluginIds(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get all plugins
   */
  getAllPlugins(): NativeBridgePlugin[] {
    return Array.from(this.plugins.values());
  }

  /**
   * Get current platform
   */
  getPlatform(): Platform {
    return this.currentPlatform;
  }

  /**
   * Check if running on native platform
   */
  isNativePlatform(): boolean {
    return isNative();
  }

  /**
   * Check if bridge is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Subscribe to bridge events
   */
  on(eventType: BridgeEventType, listener: BridgeEventListener): () => void {
    if (!this.eventListeners.has(eventType)) {
      this.eventListeners.set(eventType, new Set());
    }
    this.eventListeners.get(eventType)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(eventType)?.delete(listener);
    };
  }

  /**
   * Unsubscribe from bridge events
   */
  off(eventType: BridgeEventType, listener: BridgeEventListener): void {
    this.eventListeners.get(eventType)?.delete(listener);
  }

  /**
   * Emit a bridge event
   */
  private emit(event: BridgeEvent): void {
    const listeners = this.eventListeners.get(event.type);
    if (listeners) {
      listeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
          logger.error("Bridge event listener error:", error);
        }
      });
    }
  }

  /**
   * Log a message if debug is enabled
   */
  private log(message: string): void {
    if (this.config.debug) {
    }
  }

  /**
   * Reset the bridge (for testing)
   */
  reset(): void {
    this.plugins.clear();
    this.pluginStates.clear();
    this.eventListeners.clear();
    this.initialized = false;
    this.currentPlatform = detectPlatform();
  }

  /**
   * Update configuration
   */
  configure(config: Partial<NativeBridgeConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): NativeBridgeConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let bridgeInstance: NativeBridgeImpl | null = null;

/**
 * Get the native bridge instance
 */
export function getNativeBridge(config?: NativeBridgeConfig): NativeBridgeImpl {
  if (!bridgeInstance) {
    bridgeInstance = new NativeBridgeImpl(config);
  } else if (config) {
    bridgeInstance.configure(config);
  }
  return bridgeInstance;
}

/**
 * Reset the native bridge (for testing)
 */
export function resetNativeBridge(): void {
  if (bridgeInstance) {
    bridgeInstance.reset();
    bridgeInstance = null;
  }
}

// ============================================================================
// Plugin Helpers
// ============================================================================

/**
 * Create a plugin definition
 */
export function createPlugin<T>(
  config: Omit<NativeBridgePlugin<T>, "isAvailable"> & {
    isAvailable?: () => boolean;
  },
): NativeBridgePlugin<T> {
  return {
    ...config,
    isAvailable: config.isAvailable ?? (() => true),
  };
}

/**
 * Create a fallback plugin that provides web API implementations
 */
export function createFallbackPlugin<T>(
  id: string,
  name: string,
  api: T,
  options: {
    version?: string;
    initialize?: () => Promise<void>;
    cleanup?: () => Promise<void>;
    isAvailable?: () => boolean;
  } = {},
): NativeBridgePlugin<T> {
  return {
    id,
    name,
    version: options.version ?? "1.0.0",
    supportedPlatforms: [
      Platform.WEB,
      Platform.IOS,
      Platform.ANDROID,
      Platform.ELECTRON,
      Platform.TAURI,
    ],
    initialize: options.initialize ?? (async () => {}),
    isAvailable: options.isAvailable ?? (() => isBrowser()),
    api,
    cleanup: options.cleanup,
  };
}

// ============================================================================
// Convenience Functions
// ============================================================================

/**
 * Register a plugin with the native bridge
 */
export function registerPlugin<T>(
  plugin: NativeBridgePlugin<T>,
  options?: PluginRegistrationOptions,
): boolean {
  return getNativeBridge().registerPlugin(plugin, options);
}

/**
 * Get a plugin API from the native bridge
 */
export function getPluginAPI<T>(pluginId: string): T | undefined {
  return getNativeBridge().getPluginAPI<T>(pluginId);
}

/**
 * Check if a plugin is available
 */
export function isPluginAvailable(pluginId: string): boolean {
  return getNativeBridge().isPluginAvailable(pluginId);
}

/**
 * Subscribe to native bridge events
 */
export function onBridgeEvent(
  eventType: BridgeEventType,
  listener: BridgeEventListener,
): () => void {
  return getNativeBridge().on(eventType, listener);
}

// ============================================================================
// Exports
// ============================================================================

export { NativeBridgeImpl };

export const NativeBridge = {
  getInstance: getNativeBridge,
  reset: resetNativeBridge,
  createPlugin,
  createFallbackPlugin,
  registerPlugin,
  getPluginAPI,
  isPluginAvailable,
  onBridgeEvent,
};

export default NativeBridge;
