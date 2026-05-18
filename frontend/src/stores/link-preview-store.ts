/**
 * Link Preview Store - Manages link preview state and settings
 *
 * Handles preview data, loading states, removed previews, and user settings
 */

import { create } from "zustand";
import { devtools, persist, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  LinkPreviewData,
  LinkPreviewSettings,
  PreviewStatus,
} from "@/lib/link-preview";
import { DEFAULT_PREVIEW_SETTINGS } from "@/lib/link-preview";

// ============================================================================
// Types
// ============================================================================

export interface PreviewEntry {
  url: string;
  data: LinkPreviewData | null;
  status: PreviewStatus;
  error?: string;
  fetchedAt?: number;
  messageId?: string;
}

export interface LinkPreviewState {
  // Previews by URL
  previews: Record<string, PreviewEntry>;

  // URLs that user has removed previews for (per message)
  removedPreviews: Record<string, string[]>; // messageId -> removed URLs

  // Loading states
  loadingUrls: Set<string>;

  // User settings
  settings: LinkPreviewSettings;

  // Admin settings (blocked domains, etc.)
  adminBlockedDomains: string[];
}

export interface LinkPreviewActions {
  // Preview management
  setPreview: (url: string, data: LinkPreviewData, messageId?: string) => void;
  setPreviewLoading: (url: string) => void;
  setPreviewError: (url: string, error: string) => void;
  removePreview: (url: string, messageId: string) => void;
  restorePreview: (url: string, messageId: string) => void;
  clearPreview: (url: string) => void;
  clearAllPreviews: () => void;

  // Check if preview should show
  isPreviewRemoved: (url: string, messageId: string) => boolean;
  isPreviewLoading: (url: string) => boolean;
  getPreview: (url: string) => PreviewEntry | null;

  // Settings
  updateSettings: (settings: Partial<LinkPreviewSettings>) => void;
  resetSettings: () => void;
  toggleAutoUnfurl: () => void;
  addBlockedDomain: (domain: string) => void;
  removeBlockedDomain: (domain: string) => void;

  // Admin
  setAdminBlockedDomains: (domains: string[]) => void;

  // Utility
  isDomainBlocked: (url: string) => boolean;
  pruneExpired: () => void;
}

export type LinkPreviewStore = LinkPreviewState & LinkPreviewActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: LinkPreviewState = {
  previews: {},
  removedPreviews: {},
  loadingUrls: new Set(),
  settings: DEFAULT_PREVIEW_SETTINGS,
  adminBlockedDomains: [],
};

// ============================================================================
// Store
// ============================================================================

export const useLinkPreviewStore = create<LinkPreviewStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((set, get) => ({
          ...initialState,

          // Preview management
          setPreview: (url, data, messageId) =>
            set(
              (state) => {
                state.previews[url] = {
                  url,
                  data,
                  status: data.status,
                  fetchedAt: Date.now(),
                  messageId,
                };
                state.loadingUrls.delete(url);
              },
              false,
              "linkPreview/setPreview",
            ),

          setPreviewLoading: (url) =>
            set(
              (state) => {
                state.loadingUrls.add(url);
                if (!state.previews[url]) {
                  state.previews[url] = {
                    url,
                    data: null,
                    status: "loading",
                  };
                } else {
                  state.previews[url].status = "loading";
                }
              },
              false,
              "linkPreview/setPreviewLoading",
            ),

          setPreviewError: (url, error) =>
            set(
              (state) => {
                state.previews[url] = {
                  url,
                  data: null,
                  status: "error",
                  error,
                  fetchedAt: Date.now(),
                };
                state.loadingUrls.delete(url);
              },
              false,
              "linkPreview/setPreviewError",
            ),

          removePreview: (url, messageId) =>
            set(
              (state) => {
                if (!state.removedPreviews[messageId]) {
                  state.removedPreviews[messageId] = [];
                }
                if (!state.removedPreviews[messageId].includes(url)) {
                  state.removedPreviews[messageId].push(url);
                }
              },
              false,
              "linkPreview/removePreview",
            ),

          restorePreview: (url, messageId) =>
            set(
              (state) => {
                if (state.removedPreviews[messageId]) {
                  state.removedPreviews[messageId] = state.removedPreviews[
                    messageId
                  ].filter((u) => u !== url);
                  if (state.removedPreviews[messageId].length === 0) {
                    delete state.removedPreviews[messageId];
                  }
                }
              },
              false,
              "linkPreview/restorePreview",
            ),

          clearPreview: (url) =>
            set(
              (state) => {
                delete state.previews[url];
                state.loadingUrls.delete(url);
              },
              false,
              "linkPreview/clearPreview",
            ),

          clearAllPreviews: () =>
            set(
              (state) => {
                state.previews = {};
                state.loadingUrls.clear();
              },
              false,
              "linkPreview/clearAllPreviews",
            ),

          // Check functions
          isPreviewRemoved: (url, messageId) => {
            const state = get();
            return state.removedPreviews[messageId]?.includes(url) ?? false;
          },

          isPreviewLoading: (url) => {
            const state = get();
            return state.loadingUrls.has(url);
          },

          getPreview: (url) => {
            const state = get();
            return state.previews[url] ?? null;
          },

          // Settings
          updateSettings: (settings) =>
            set(
              (state) => {
                state.settings = { ...state.settings, ...settings };
              },
              false,
              "linkPreview/updateSettings",
            ),

          resetSettings: () =>
            set(
              (state) => {
                state.settings = DEFAULT_PREVIEW_SETTINGS;
              },
              false,
              "linkPreview/resetSettings",
            ),

          toggleAutoUnfurl: () =>
            set(
              (state) => {
                state.settings.autoUnfurl = !state.settings.autoUnfurl;
              },
              false,
              "linkPreview/toggleAutoUnfurl",
            ),

          addBlockedDomain: (domain) =>
            set(
              (state) => {
                const normalizedDomain = domain
                  .toLowerCase()
                  .replace(/^www\./, "");
                if (!state.settings.blockedDomains.includes(normalizedDomain)) {
                  state.settings.blockedDomains.push(normalizedDomain);
                }
              },
              false,
              "linkPreview/addBlockedDomain",
            ),

          removeBlockedDomain: (domain) =>
            set(
              (state) => {
                const normalizedDomain = domain
                  .toLowerCase()
                  .replace(/^www\./, "");
                state.settings.blockedDomains =
                  state.settings.blockedDomains.filter(
                    (d) => d !== normalizedDomain,
                  );
              },
              false,
              "linkPreview/removeBlockedDomain",
            ),

          // Admin
          setAdminBlockedDomains: (domains) =>
            set(
              (state) => {
                state.adminBlockedDomains = domains.map((d) =>
                  d.toLowerCase().replace(/^www\./, ""),
                );
              },
              false,
              "linkPreview/setAdminBlockedDomains",
            ),

          // Utility
          isDomainBlocked: (url) => {
            const state = get();
            try {
              const domain = new URL(url).hostname
                .toLowerCase()
                .replace(/^www\./, "");

              // Check user blocked domains
              const isUserBlocked = state.settings.blockedDomains.some(
                (blocked) =>
                  domain === blocked || domain.endsWith(`.${blocked}`),
              );

              // Check admin blocked domains
              const isAdminBlocked = state.adminBlockedDomains.some(
                (blocked) =>
                  domain === blocked || domain.endsWith(`.${blocked}`),
              );

              return isUserBlocked || isAdminBlocked;
            } catch {
              return false;
            }
          },

          pruneExpired: () =>
            set(
              (state) => {
                const now = Date.now();
                const maxAge = 24 * 60 * 60 * 1000; // 24 hours

                for (const [url, entry] of Object.entries(state.previews)) {
                  if (entry.fetchedAt && now - entry.fetchedAt > maxAge) {
                    delete state.previews[url];
                  }
                }
              },
              false,
              "linkPreview/pruneExpired",
            ),
        })),
      ),
      {
        name: "nchat-link-previews",
        // Only persist settings and removed previews, not actual preview data
        partialize: (state) => ({
          settings: state.settings,
          removedPreviews: state.removedPreviews,
          adminBlockedDomains: state.adminBlockedDomains,
        }),
      },
    ),
    { name: "link-preview-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectPreview = (url: string) => (state: LinkPreviewStore) =>
  state.previews[url] ?? null;

export const selectIsLoading = (url: string) => (state: LinkPreviewStore) =>
  state.loadingUrls.has(url);

export const selectSettings = (state: LinkPreviewStore) => state.settings;

export const selectAutoUnfurl = (state: LinkPreviewStore) =>
  state.settings.autoUnfurl;

export const selectEnabled = (state: LinkPreviewStore) =>
  state.settings.enabled;

export const selectBlockedDomains = (state: LinkPreviewStore) =>
  state.settings.blockedDomains;

export const selectAllBlockedDomains = (state: LinkPreviewStore) => [
  ...state.settings.blockedDomains,
  ...state.adminBlockedDomains,
];

// ============================================================================
// Helpers
// ============================================================================

/**
 * Get all previews for a message (based on URLs in message content)
 */
export function getPreviewsForMessage(
  state: LinkPreviewStore,
  messageId: string,
  urls: string[],
): PreviewEntry[] {
  const removedForMessage = state.removedPreviews[messageId] ?? [];

  return urls
    .filter((url) => !removedForMessage.includes(url))
    .map((url) => state.previews[url])
    .filter((entry): entry is PreviewEntry => entry !== undefined);
}

/**
 * Check if any previews are loading for given URLs
 */
export function hasLoadingPreviews(
  state: LinkPreviewStore,
  urls: string[],
): boolean {
  return urls.some((url) => state.loadingUrls.has(url));
}
