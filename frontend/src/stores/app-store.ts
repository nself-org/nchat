/**
 * App Store - Global application state management
 *
 * Manages application-wide state including initialization status,
 * error states, feature flags, user session, and global settings.
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

// =============================================================================
// Types
// =============================================================================

export type InitializationStatus =
  | "idle"
  | "initializing"
  | "loading-config"
  | "loading-user"
  | "connecting-socket"
  | "loading-data"
  | "ready"
  | "error";

export type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export interface AppError {
  code: string;
  message: string;
  details?: string;
  timestamp: Date;
  recoverable: boolean;
  context?: Record<string, unknown>;
}

export interface FeatureFlags {
  // Core features
  channels: boolean;
  directMessages: boolean;
  threads: boolean;
  reactions: boolean;
  fileUploads: boolean;
  search: boolean;

  // Advanced features
  voiceMessages: boolean;
  videoConferencing: boolean;
  customEmojis: boolean;
  messageScheduling: boolean;

  // Integrations
  slackIntegration: boolean;
  githubIntegration: boolean;
  webhooks: boolean;

  // Admin features
  adminDashboard: boolean;
  userManagement: boolean;
  channelManagement: boolean;

  // Experimental
  experimentalFeatures: boolean;
}

export interface UserSession {
  userId: string;
  email: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  role: "owner" | "admin" | "moderator" | "member" | "guest";
  token?: string;
  expiresAt?: Date;
  isAuthenticated: boolean;
}

export interface GlobalSettings {
  // UI
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: "12h" | "24h";

  // Notifications
  soundEnabled: boolean;
  desktopNotifications: boolean;
  notificationSound: string;

  // Accessibility
  reducedMotion: boolean;
  highContrast: boolean;
  fontSize: "small" | "medium" | "large";

  // Privacy
  showOnlineStatus: boolean;
  showTypingIndicator: boolean;
  showReadReceipts: boolean;
}

export interface AppState {
  // Initialization
  initStatus: InitializationStatus;
  initProgress: number;
  initMessage: string;

  // Connection
  connectionStatus: ConnectionStatus;
  lastConnectedAt: Date | null;
  reconnectAttempts: number;

  // Errors
  errors: AppError[];
  lastError: AppError | null;
  hasUnrecoverableError: boolean;

  // Feature Flags
  featureFlags: FeatureFlags;

  // User Session
  session: UserSession | null;

  // Global Settings
  settings: GlobalSettings;

  // App State
  isSetupComplete: boolean;
  isFirstVisit: boolean;
  lastVisitedChannel: string | null;
  currentRoute: string;

  // Modals/Overlays
  activeModal: string | null;
  modalData: Record<string, unknown> | null;

  // Debug
  debugMode: boolean;
}

export interface AppActions {
  // Initialization
  setInitStatus: (status: InitializationStatus, message?: string) => void;
  setInitProgress: (progress: number) => void;
  completeInit: () => void;
  resetInit: () => void;

  // Connection
  setConnectionStatus: (status: ConnectionStatus) => void;
  incrementReconnectAttempts: () => void;
  resetReconnectAttempts: () => void;

  // Errors
  addError: (error: Omit<AppError, "timestamp">) => void;
  clearError: (code: string) => void;
  clearAllErrors: () => void;
  setUnrecoverableError: (error: Omit<AppError, "timestamp">) => void;

  // Feature Flags
  setFeatureFlags: (flags: Partial<FeatureFlags>) => void;
  toggleFeature: (feature: keyof FeatureFlags) => void;
  isFeatureEnabled: (feature: keyof FeatureFlags) => boolean;

  // Session
  setSession: (session: UserSession | null) => void;
  updateSession: (updates: Partial<UserSession>) => void;
  clearSession: () => void;

  // Settings
  setSettings: (settings: Partial<GlobalSettings>) => void;
  resetSettings: () => void;

  // App State
  setSetupComplete: (complete: boolean) => void;
  setFirstVisit: (isFirst: boolean) => void;
  setLastVisitedChannel: (channelId: string | null) => void;
  setCurrentRoute: (route: string) => void;

  // Modals
  openModal: (modalId: string, data?: Record<string, unknown>) => void;
  closeModal: () => void;

  // Debug
  setDebugMode: (enabled: boolean) => void;

  // Reset
  reset: () => void;
}

export type AppStore = AppState & AppActions;

// =============================================================================
// Initial State
// =============================================================================

const defaultFeatureFlags: FeatureFlags = {
  channels: true,
  directMessages: true,
  threads: true,
  reactions: true,
  fileUploads: true,
  search: true,
  voiceMessages: false,
  videoConferencing: false,
  customEmojis: false,
  messageScheduling: false,
  slackIntegration: false,
  githubIntegration: false,
  webhooks: false,
  adminDashboard: true,
  userManagement: true,
  channelManagement: true,
  experimentalFeatures: false,
};

const defaultSettings: GlobalSettings = {
  language: "en",
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  dateFormat: "MM/DD/YYYY",
  timeFormat: "12h",
  soundEnabled: true,
  desktopNotifications: true,
  notificationSound: "default",
  reducedMotion: false,
  highContrast: false,
  fontSize: "medium",
  showOnlineStatus: true,
  showTypingIndicator: true,
  showReadReceipts: true,
};

const initialState: AppState = {
  initStatus: "idle",
  initProgress: 0,
  initMessage: "",
  connectionStatus: "disconnected",
  lastConnectedAt: null,
  reconnectAttempts: 0,
  errors: [],
  lastError: null,
  hasUnrecoverableError: false,
  featureFlags: defaultFeatureFlags,
  session: null,
  settings: defaultSettings,
  isSetupComplete: false,
  isFirstVisit: true,
  lastVisitedChannel: null,
  currentRoute: "/",
  activeModal: null,
  modalData: null,
  debugMode: process.env.NODE_ENV === "development",
};

// =============================================================================
// Store
// =============================================================================

export const useAppStore = create<AppStore>()(
  devtools(
    subscribeWithSelector(
      persist(
        immer((set, get) => ({
          ...initialState,

          // Initialization
          setInitStatus: (status, message = "") =>
            set(
              (state) => {
                state.initStatus = status;
                state.initMessage = message;
              },
              false,
              "app/setInitStatus",
            ),

          setInitProgress: (progress) =>
            set(
              (state) => {
                state.initProgress = Math.min(Math.max(progress, 0), 100);
              },
              false,
              "app/setInitProgress",
            ),

          completeInit: () =>
            set(
              (state) => {
                state.initStatus = "ready";
                state.initProgress = 100;
                state.initMessage = "Ready";
                state.isFirstVisit = false;
              },
              false,
              "app/completeInit",
            ),

          resetInit: () =>
            set(
              (state) => {
                state.initStatus = "idle";
                state.initProgress = 0;
                state.initMessage = "";
              },
              false,
              "app/resetInit",
            ),

          // Connection
          setConnectionStatus: (status) =>
            set(
              (state) => {
                state.connectionStatus = status;
                if (status === "connected") {
                  state.lastConnectedAt = new Date();
                  state.reconnectAttempts = 0;
                }
              },
              false,
              "app/setConnectionStatus",
            ),

          incrementReconnectAttempts: () =>
            set(
              (state) => {
                state.reconnectAttempts += 1;
              },
              false,
              "app/incrementReconnectAttempts",
            ),

          resetReconnectAttempts: () =>
            set(
              (state) => {
                state.reconnectAttempts = 0;
              },
              false,
              "app/resetReconnectAttempts",
            ),

          // Errors
          addError: (error) =>
            set(
              (state) => {
                const newError: AppError = {
                  ...error,
                  timestamp: new Date(),
                };
                state.errors.push(newError);
                state.lastError = newError;

                // Keep only last 50 errors
                if (state.errors.length > 50) {
                  state.errors = state.errors.slice(-50);
                }
              },
              false,
              "app/addError",
            ),

          clearError: (code) =>
            set(
              (state) => {
                state.errors = state.errors.filter((e) => e.code !== code);
                if (state.lastError?.code === code) {
                  state.lastError =
                    state.errors[state.errors.length - 1] || null;
                }
              },
              false,
              "app/clearError",
            ),

          clearAllErrors: () =>
            set(
              (state) => {
                state.errors = [];
                state.lastError = null;
              },
              false,
              "app/clearAllErrors",
            ),

          setUnrecoverableError: (error) =>
            set(
              (state) => {
                const newError: AppError = {
                  ...error,
                  timestamp: new Date(),
                  recoverable: false,
                };
                state.lastError = newError;
                state.errors.push(newError);
                state.hasUnrecoverableError = true;
                state.initStatus = "error";
              },
              false,
              "app/setUnrecoverableError",
            ),

          // Feature Flags
          setFeatureFlags: (flags) =>
            set(
              (state) => {
                state.featureFlags = { ...state.featureFlags, ...flags };
              },
              false,
              "app/setFeatureFlags",
            ),

          toggleFeature: (feature) =>
            set(
              (state) => {
                state.featureFlags[feature] = !state.featureFlags[feature];
              },
              false,
              "app/toggleFeature",
            ),

          isFeatureEnabled: (feature) => get().featureFlags[feature],

          // Session
          setSession: (session) =>
            set(
              (state) => {
                state.session = session;
              },
              false,
              "app/setSession",
            ),

          updateSession: (updates) =>
            set(
              (state) => {
                if (state.session) {
                  state.session = { ...state.session, ...updates };
                }
              },
              false,
              "app/updateSession",
            ),

          clearSession: () =>
            set(
              (state) => {
                state.session = null;
              },
              false,
              "app/clearSession",
            ),

          // Settings
          setSettings: (settings) =>
            set(
              (state) => {
                state.settings = { ...state.settings, ...settings };
              },
              false,
              "app/setSettings",
            ),

          resetSettings: () =>
            set(
              (state) => {
                state.settings = defaultSettings;
              },
              false,
              "app/resetSettings",
            ),

          // App State
          setSetupComplete: (complete) =>
            set(
              (state) => {
                state.isSetupComplete = complete;
              },
              false,
              "app/setSetupComplete",
            ),

          setFirstVisit: (isFirst) =>
            set(
              (state) => {
                state.isFirstVisit = isFirst;
              },
              false,
              "app/setFirstVisit",
            ),

          setLastVisitedChannel: (channelId) =>
            set(
              (state) => {
                state.lastVisitedChannel = channelId;
              },
              false,
              "app/setLastVisitedChannel",
            ),

          setCurrentRoute: (route) =>
            set(
              (state) => {
                state.currentRoute = route;
              },
              false,
              "app/setCurrentRoute",
            ),

          // Modals
          openModal: (modalId, data) =>
            set(
              (state) => {
                state.activeModal = modalId;
                state.modalData = data ?? null;
              },
              false,
              "app/openModal",
            ),

          closeModal: () =>
            set(
              (state) => {
                state.activeModal = null;
                state.modalData = null;
              },
              false,
              "app/closeModal",
            ),

          // Debug
          setDebugMode: (enabled) =>
            set(
              (state) => {
                state.debugMode = enabled;
              },
              false,
              "app/setDebugMode",
            ),

          // Reset
          reset: () =>
            set(
              () => ({
                ...initialState,
                // Preserve some values
                settings: get().settings,
                featureFlags: get().featureFlags,
              }),
              false,
              "app/reset",
            ),
        })),
        {
          name: "nchat-app-store",
          partialize: (state) => ({
            // Only persist these fields
            settings: state.settings,
            isFirstVisit: state.isFirstVisit,
            lastVisitedChannel: state.lastVisitedChannel,
            debugMode: state.debugMode,
          }),
        },
      ),
    ),
    { name: "app-store" },
  ),
);

// =============================================================================
// Selectors
// =============================================================================

export const selectInitStatus = (state: AppStore) => state.initStatus;
export const selectIsReady = (state: AppStore) => state.initStatus === "ready";
export const selectIsLoading = (state: AppStore) =>
  state.initStatus !== "ready" &&
  state.initStatus !== "error" &&
  state.initStatus !== "idle";
export const selectConnectionStatus = (state: AppStore) =>
  state.connectionStatus;
export const selectIsConnected = (state: AppStore) =>
  state.connectionStatus === "connected";
export const selectSession = (state: AppStore) => state.session;
export const selectIsAuthenticated = (state: AppStore) =>
  state.session?.isAuthenticated ?? false;
export const selectSettings = (state: AppStore) => state.settings;
export const selectFeatureFlags = (state: AppStore) => state.featureFlags;
export const selectLastError = (state: AppStore) => state.lastError;
export const selectHasError = (state: AppStore) => state.hasUnrecoverableError;
export const selectActiveModal = (state: AppStore) => state.activeModal;
export const selectModalData = (state: AppStore) => state.modalData;

// =============================================================================
// Hooks
// =============================================================================

/**
 * Check if a feature is enabled
 */
export function useFeatureFlag(feature: keyof FeatureFlags): boolean {
  return useAppStore((state) => state.featureFlags[feature]);
}

/**
 * Get initialization status
 */
export function useInitStatus() {
  return useAppStore((state) => ({
    status: state.initStatus,
    progress: state.initProgress,
    message: state.initMessage,
    isReady: state.initStatus === "ready",
    isLoading:
      state.initStatus !== "ready" &&
      state.initStatus !== "error" &&
      state.initStatus !== "idle",
    hasError: state.initStatus === "error",
  }));
}

/**
 * Get connection status
 */
export function useConnectionStatus() {
  return useAppStore((state) => ({
    status: state.connectionStatus,
    isConnected: state.connectionStatus === "connected",
    isReconnecting: state.connectionStatus === "reconnecting",
    reconnectAttempts: state.reconnectAttempts,
    lastConnectedAt: state.lastConnectedAt,
  }));
}

/**
 * Get session info
 */
export function useSession() {
  return useAppStore((state) => state.session);
}

/**
 * Get global settings
 */
export function useSettings() {
  return useAppStore((state) => ({
    settings: state.settings,
    setSettings: state.setSettings,
    resetSettings: state.resetSettings,
  }));
}

export default useAppStore;
