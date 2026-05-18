/**
 * App Directory Store - Zustand store for the nchat app marketplace
 *
 * Manages app directory state including apps, installations, search, and filters
 */

import { create } from "zustand";
import { devtools, subscribeWithSelector } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  App,
  AppCategory,
  AppInstallation,
  AppFilters,
  AppSearchParams,
  AppSearchResult,
  InstallationConfig,
  AppDirectoryState,
  AppDirectoryActions,
  AppDirectoryStore,
} from "@/lib/app-directory/app-types";

import {
  getAllApps,
  getAppById,
  getAppBySlug,
  getFeaturedApps,
  getPopularApps,
  getRecentApps,
} from "@/lib/app-directory/app-registry";

import { APP_CATEGORIES } from "@/lib/app-directory/app-categories";
import { searchApps, DEFAULT_FILTERS } from "@/lib/app-directory/app-search";
import {
  installApp as installAppFn,
  uninstallApp as uninstallAppFn,
  getUserInstallations,
  isAppInstalled,
  getInstallation,
} from "@/lib/app-directory/app-installer";

// ============================================================================
// Initial State
// ============================================================================

const initialState: AppDirectoryState = {
  // App Data
  apps: new Map(),
  categories: [],
  featuredApps: [],
  popularApps: [],
  recentApps: [],

  // Installations
  installedApps: new Map(),

  // Search State
  searchQuery: "",
  searchResults: [],
  searchFilters: { ...DEFAULT_FILTERS },

  // UI State
  selectedAppId: null,
  activeCategory: null,
  isLoading: false,
  isInstalling: null,
  error: null,

  // Pagination
  hasMore: false,
  currentPage: 1,
};

// ============================================================================
// Store
// ============================================================================

export const useAppDirectoryStore = create<AppDirectoryStore>()(
  devtools(
    subscribeWithSelector(
      immer((set, get) => ({
        ...initialState,

        // ========================================
        // App Management
        // ========================================

        setApps: (apps) =>
          set(
            (state) => {
              state.apps = new Map(apps.map((app) => [app.id, app]));
            },
            false,
            "appDirectory/setApps",
          ),

        addApp: (app) =>
          set(
            (state) => {
              state.apps.set(app.id, app);
            },
            false,
            "appDirectory/addApp",
          ),

        updateApp: (appId, updates) =>
          set(
            (state) => {
              const app = state.apps.get(appId);
              if (app) {
                state.apps.set(appId, { ...app, ...updates });
              }
            },
            false,
            "appDirectory/updateApp",
          ),

        removeApp: (appId) =>
          set(
            (state) => {
              state.apps.delete(appId);
            },
            false,
            "appDirectory/removeApp",
          ),

        getAppById: (appId) => {
          const storeApp = get().apps.get(appId);
          return storeApp || getAppById(appId);
        },

        getAppBySlug: (slug) => {
          const apps = Array.from(get().apps.values());
          const storeApp = apps.find((app) => app.slug === slug);
          return storeApp || getAppBySlug(slug);
        },

        // ========================================
        // Categories
        // ========================================

        setCategories: (categories) =>
          set(
            (state) => {
              state.categories = categories;
            },
            false,
            "appDirectory/setCategories",
          ),

        setActiveCategory: (categoryId) =>
          set(
            (state) => {
              state.activeCategory = categoryId;
              state.currentPage = 1;
            },
            false,
            "appDirectory/setActiveCategory",
          ),

        // ========================================
        // Featured/Popular
        // ========================================

        setFeaturedApps: (appIds) =>
          set(
            (state) => {
              state.featuredApps = appIds;
            },
            false,
            "appDirectory/setFeaturedApps",
          ),

        setPopularApps: (appIds) =>
          set(
            (state) => {
              state.popularApps = appIds;
            },
            false,
            "appDirectory/setPopularApps",
          ),

        setRecentApps: (appIds) =>
          set(
            (state) => {
              state.recentApps = appIds;
            },
            false,
            "appDirectory/setRecentApps",
          ),

        // ========================================
        // Installations
        // ========================================

        setInstalledApps: (installations) =>
          set(
            (state) => {
              state.installedApps = new Map(
                installations.map((install) => [install.appId, install]),
              );
            },
            false,
            "appDirectory/setInstalledApps",
          ),

        installApp: async (appId, config) => {
          set(
            (state) => {
              state.isInstalling = appId;
              state.error = null;
            },
            false,
            "appDirectory/installApp/start",
          );

          try {
            // For demo purposes, use a mock user ID
            const userId = "current-user";
            const result = await installAppFn(appId, userId, config);

            if (result.success && result.installation) {
              set(
                (state) => {
                  state.installedApps.set(appId, result.installation!);
                  state.isInstalling = null;
                },
                false,
                "appDirectory/installApp/success",
              );
            } else {
              set(
                (state) => {
                  state.error = result.error || "Installation failed";
                  state.isInstalling = null;
                },
                false,
                "appDirectory/installApp/error",
              );
            }
          } catch (error) {
            set(
              (state) => {
                state.error =
                  error instanceof Error
                    ? error.message
                    : "Installation failed";
                state.isInstalling = null;
              },
              false,
              "appDirectory/installApp/error",
            );
          }
        },

        uninstallApp: async (appId) => {
          set(
            (state) => {
              state.isInstalling = appId;
              state.error = null;
            },
            false,
            "appDirectory/uninstallApp/start",
          );

          try {
            const userId = "current-user";
            const result = await uninstallAppFn(appId, userId);

            if (result.success) {
              set(
                (state) => {
                  state.installedApps.delete(appId);
                  state.isInstalling = null;
                },
                false,
                "appDirectory/uninstallApp/success",
              );
            } else {
              set(
                (state) => {
                  state.error = result.error || "Uninstallation failed";
                  state.isInstalling = null;
                },
                false,
                "appDirectory/uninstallApp/error",
              );
            }
          } catch (error) {
            set(
              (state) => {
                state.error =
                  error instanceof Error
                    ? error.message
                    : "Uninstallation failed";
                state.isInstalling = null;
              },
              false,
              "appDirectory/uninstallApp/error",
            );
          }
        },

        updateInstallation: (appId, updates) =>
          set(
            (state) => {
              const installation = state.installedApps.get(appId);
              if (installation) {
                state.installedApps.set(appId, { ...installation, ...updates });
              }
            },
            false,
            "appDirectory/updateInstallation",
          ),

        isAppInstalled: (appId) => {
          return get().installedApps.has(appId);
        },

        getInstallation: (appId) => {
          return get().installedApps.get(appId);
        },

        // ========================================
        // Search
        // ========================================

        setSearchQuery: (query) =>
          set(
            (state) => {
              state.searchQuery = query;
              state.currentPage = 1;
            },
            false,
            "appDirectory/setSearchQuery",
          ),

        setSearchResults: (results) =>
          set(
            (state) => {
              state.searchResults = results;
            },
            false,
            "appDirectory/setSearchResults",
          ),

        setSearchFilters: (filters) =>
          set(
            (state) => {
              state.searchFilters = { ...state.searchFilters, ...filters };
              state.currentPage = 1;
            },
            false,
            "appDirectory/setSearchFilters",
          ),

        resetSearchFilters: () =>
          set(
            (state) => {
              state.searchFilters = { ...DEFAULT_FILTERS };
              state.currentPage = 1;
            },
            false,
            "appDirectory/resetSearchFilters",
          ),

        searchApps: async (params) => {
          set(
            (state) => {
              state.isLoading = true;
              state.error = null;
            },
            false,
            "appDirectory/searchApps/start",
          );

          try {
            const result = await searchApps(params);

            set(
              (state) => {
                state.searchResults = result.apps;
                state.hasMore = result.hasMore;
                state.currentPage = result.page;
                state.isLoading = false;
              },
              false,
              "appDirectory/searchApps/success",
            );

            return result;
          } catch (error) {
            set(
              (state) => {
                state.error =
                  error instanceof Error ? error.message : "Search failed";
                state.isLoading = false;
              },
              false,
              "appDirectory/searchApps/error",
            );

            return {
              apps: [],
              total: 0,
              page: 1,
              limit: 20,
              hasMore: false,
              facets: { categories: [], types: [], pricing: [] },
            };
          }
        },

        // ========================================
        // Selection
        // ========================================

        selectApp: (appId) =>
          set(
            (state) => {
              state.selectedAppId = appId;
            },
            false,
            "appDirectory/selectApp",
          ),

        // ========================================
        // Loading
        // ========================================

        setLoading: (loading) =>
          set(
            (state) => {
              state.isLoading = loading;
            },
            false,
            "appDirectory/setLoading",
          ),

        setInstalling: (appId) =>
          set(
            (state) => {
              state.isInstalling = appId;
            },
            false,
            "appDirectory/setInstalling",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "appDirectory/setError",
          ),

        // ========================================
        // Pagination
        // ========================================

        setHasMore: (hasMore) =>
          set(
            (state) => {
              state.hasMore = hasMore;
            },
            false,
            "appDirectory/setHasMore",
          ),

        setCurrentPage: (page) =>
          set(
            (state) => {
              state.currentPage = page;
            },
            false,
            "appDirectory/setCurrentPage",
          ),

        loadMoreApps: async () => {
          const state = get();
          if (!state.hasMore || state.isLoading) return;

          const nextPage = state.currentPage + 1;
          const filterCategories = state.activeCategory
            ? [state.activeCategory]
            : state.searchFilters.categories;

          await get().searchApps({
            query: state.searchQuery,
            ...state.searchFilters,
            categories: filterCategories,
            page: nextPage,
          });
        },

        // ========================================
        // Utility
        // ========================================

        resetStore: () =>
          set(
            () => ({
              ...initialState,
              apps: new Map(),
              installedApps: new Map(),
            }),
            false,
            "appDirectory/resetStore",
          ),
      })),
    ),
    { name: "app-directory-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectAllApps = (state: AppDirectoryStore) =>
  Array.from(state.apps.values());

export const selectFeaturedApps = (state: AppDirectoryStore) =>
  state.featuredApps
    .map((id) => state.apps.get(id) || getAppById(id))
    .filter((app): app is App => app !== undefined);

export const selectPopularApps = (state: AppDirectoryStore) =>
  state.popularApps
    .map((id) => state.apps.get(id) || getAppById(id))
    .filter((app): app is App => app !== undefined);

export const selectRecentApps = (state: AppDirectoryStore) =>
  state.recentApps
    .map((id) => state.apps.get(id) || getAppById(id))
    .filter((app): app is App => app !== undefined);

export const selectInstalledApps = (state: AppDirectoryStore) =>
  Array.from(state.installedApps.values());

export const selectCategories = (state: AppDirectoryStore) =>
  state.categories.length > 0 ? state.categories : APP_CATEGORIES;

export const selectActiveCategory = (state: AppDirectoryStore) => {
  if (!state.activeCategory) return null;
  const categories =
    state.categories.length > 0 ? state.categories : APP_CATEGORIES;
  return categories.find((c) => c.id === state.activeCategory) || null;
};

export const selectSearchResults = (state: AppDirectoryStore) =>
  state.searchResults;

export const selectHasActiveFilters = (state: AppDirectoryStore) => {
  const { searchFilters } = state;
  return (
    searchFilters.categories.length > 0 ||
    searchFilters.types.length > 0 ||
    searchFilters.pricing.length > 0 ||
    searchFilters.minRating > 0 ||
    searchFilters.verified ||
    searchFilters.featured
  );
};

export const selectAppById = (appId: string) => (state: AppDirectoryStore) =>
  state.apps.get(appId) || getAppById(appId);

export const selectIsInstalled =
  (appId: string) => (state: AppDirectoryStore) =>
    state.installedApps.has(appId);

// ============================================================================
// Initialization Helper
// ============================================================================

export function initializeAppDirectory() {
  const store = useAppDirectoryStore.getState();

  // Load all apps
  const allApps = getAllApps();
  store.setApps(allApps);

  // Set categories
  store.setCategories(APP_CATEGORIES);

  // Set featured, popular, and recent apps
  store.setFeaturedApps(getFeaturedApps().map((a) => a.id));
  store.setPopularApps(getPopularApps(10).map((a) => a.id));
  store.setRecentApps(getRecentApps(10).map((a) => a.id));
}
