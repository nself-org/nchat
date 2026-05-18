/**
 * Analytics Store - Zustand store for analytics state management
 *
 * Manages analytics data, filters, and UI state for the analytics dashboard
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";

import type {
  DateRange,
  DateRangePreset,
  TimeGranularity,
  AnalyticsFilters,
  DashboardData,
  AnalyticsSummary,
  MessageVolumeData,
  UserActivityData,
  ChannelActivityData,
  ReactionData,
  FileUploadData,
  SearchQueryData,
  PeakHoursData,
  TopMessageData,
  InactiveUserData,
  UserGrowthData,
  ActiveUsersData,
  ScheduledReportConfig,
  ReportHistory,
  ExportFormat,
  AnalyticsSectionType,
} from "@/lib/analytics/analytics-types";

import { getAnalyticsAggregator } from "@/lib/analytics/analytics-aggregator";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export type AnalyticsViewType =
  | "overview"
  | "messages"
  | "users"
  | "channels"
  | "reactions"
  | "files"
  | "search"
  | "bots"
  | "reports";

export interface AnalyticsState {
  // View State
  currentView: AnalyticsViewType;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Filters
  dateRange: DateRange;
  dateRangePreset: DateRangePreset;
  granularity: TimeGranularity;
  selectedChannelIds: string[];
  selectedUserIds: string[];
  includeBots: boolean;

  // Dashboard Data
  dashboardData: DashboardData | null;
  summary: AnalyticsSummary | null;

  // Individual Section Data (for detailed views)
  messageVolume: MessageVolumeData[];
  userActivity: UserActivityData[];
  channelActivity: ChannelActivityData[];
  reactions: ReactionData[];
  fileUploads: FileUploadData[];
  searchQueries: SearchQueryData[];
  peakHours: PeakHoursData[];
  topMessages: TopMessageData[];
  inactiveUsers: InactiveUserData[];
  userGrowth: UserGrowthData[];
  activeUsers: ActiveUsersData | null;

  // Comparison Data
  comparisonEnabled: boolean;
  comparisonDateRange: DateRange | null;
  comparisonData: DashboardData | null;

  // Reports
  scheduledReports: ScheduledReportConfig[];
  reportHistory: ReportHistory[];

  // Export State
  isExporting: boolean;
  exportProgress: number;

  // UI State
  sidebarCollapsed: boolean;
  selectedChartType: "line" | "bar" | "area";
  showDataLabels: boolean;
}

export interface AnalyticsActions {
  // View Actions
  setCurrentView: (view: AnalyticsViewType) => void;

  // Filter Actions
  setDateRange: (range: DateRange) => void;
  setDateRangePreset: (preset: DateRangePreset) => void;
  setGranularity: (granularity: TimeGranularity) => void;
  setSelectedChannels: (channelIds: string[]) => void;
  setSelectedUsers: (userIds: string[]) => void;
  toggleIncludeBots: () => void;
  resetFilters: () => void;

  // Data Actions
  fetchDashboardData: () => Promise<void>;
  fetchSectionData: (section: AnalyticsSectionType) => Promise<void>;
  refreshData: () => Promise<void>;
  clearData: () => void;

  // Comparison Actions
  toggleComparison: () => void;
  setComparisonDateRange: (range: DateRange | null) => void;
  fetchComparisonData: () => Promise<void>;

  // Report Actions
  addScheduledReport: (report: ScheduledReportConfig) => void;
  updateScheduledReport: (
    id: string,
    updates: Partial<ScheduledReportConfig>,
  ) => void;
  deleteScheduledReport: (id: string) => void;
  addReportHistory: (history: ReportHistory) => void;

  // Export Actions
  exportData: (
    format: ExportFormat,
    sections: AnalyticsSectionType[],
  ) => Promise<void>;
  setExportProgress: (progress: number) => void;

  // UI Actions
  toggleSidebar: () => void;
  setChartType: (type: "line" | "bar" | "area") => void;
  toggleDataLabels: () => void;

  // Error Handling
  setError: (error: string | null) => void;
  clearError: () => void;
}

export type AnalyticsStore = AnalyticsState & AnalyticsActions;

// ============================================================================
// Initial State
// ============================================================================

const getDefaultDateRange = (): DateRange => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return {
    start: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000),
    end: new Date(today.getTime() + 24 * 60 * 60 * 1000),
    preset: "last30days",
  };
};

const initialState: AnalyticsState = {
  // View State
  currentView: "overview",
  isLoading: false,
  error: null,
  lastUpdated: null,

  // Filters
  dateRange: getDefaultDateRange(),
  dateRangePreset: "last30days",
  granularity: "day",
  selectedChannelIds: [],
  selectedUserIds: [],
  includeBots: false,

  // Dashboard Data
  dashboardData: null,
  summary: null,

  // Individual Section Data
  messageVolume: [],
  userActivity: [],
  channelActivity: [],
  reactions: [],
  fileUploads: [],
  searchQueries: [],
  peakHours: [],
  topMessages: [],
  inactiveUsers: [],
  userGrowth: [],
  activeUsers: null,

  // Comparison Data
  comparisonEnabled: false,
  comparisonDateRange: null,
  comparisonData: null,

  // Reports
  scheduledReports: [],
  reportHistory: [],

  // Export State
  isExporting: false,
  exportProgress: 0,

  // UI State
  sidebarCollapsed: false,
  selectedChartType: "area",
  showDataLabels: false,
};

// ============================================================================
// Store
// ============================================================================

export const useAnalyticsStore = create<AnalyticsStore>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // View Actions
      setCurrentView: (view) =>
        set(
          (state) => {
            state.currentView = view;
          },
          false,
          "analytics/setCurrentView",
        ),

      // Filter Actions
      setDateRange: (range) =>
        set(
          (state) => {
            state.dateRange = range;
            if (range.preset) {
              state.dateRangePreset = range.preset;
            }
          },
          false,
          "analytics/setDateRange",
        ),

      setDateRangePreset: (preset) =>
        set(
          (state) => {
            state.dateRangePreset = preset;
            const aggregator = getAnalyticsAggregator();
            if (preset !== "custom") {
              state.dateRange = aggregator.getDateRangePreset(preset);
            }
          },
          false,
          "analytics/setDateRangePreset",
        ),

      setGranularity: (granularity) =>
        set(
          (state) => {
            state.granularity = granularity;
          },
          false,
          "analytics/setGranularity",
        ),

      setSelectedChannels: (channelIds) =>
        set(
          (state) => {
            state.selectedChannelIds = channelIds;
          },
          false,
          "analytics/setSelectedChannels",
        ),

      setSelectedUsers: (userIds) =>
        set(
          (state) => {
            state.selectedUserIds = userIds;
          },
          false,
          "analytics/setSelectedUsers",
        ),

      toggleIncludeBots: () =>
        set(
          (state) => {
            state.includeBots = !state.includeBots;
          },
          false,
          "analytics/toggleIncludeBots",
        ),

      resetFilters: () =>
        set(
          (state) => {
            state.dateRange = getDefaultDateRange();
            state.dateRangePreset = "last30days";
            state.granularity = "day";
            state.selectedChannelIds = [];
            state.selectedUserIds = [];
            state.includeBots = false;
          },
          false,
          "analytics/resetFilters",
        ),

      // Data Actions
      fetchDashboardData: async () => {
        const {
          dateRange,
          granularity,
          selectedChannelIds,
          selectedUserIds,
          includeBots,
        } = get();

        set(
          (state) => {
            state.isLoading = true;
            state.error = null;
          },
          false,
          "analytics/fetchDashboardData/start",
        );

        try {
          const aggregator = getAnalyticsAggregator();
          const filters: AnalyticsFilters = {
            dateRange,
            granularity,
            channelIds:
              selectedChannelIds.length > 0 ? selectedChannelIds : undefined,
            userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
            includeBots,
          };

          const data = await aggregator.aggregateDashboardData(filters);

          set(
            (state) => {
              state.dashboardData = data;
              state.summary = data.summary;
              state.messageVolume = data.messageVolume;
              state.userActivity = data.topUsers;
              state.channelActivity = data.channelActivity;
              state.reactions = data.reactions;
              state.fileUploads = data.fileUploads;
              state.peakHours = data.peakHours;
              state.topMessages = data.topMessages;
              state.inactiveUsers = data.inactiveUsers;
              state.userGrowth = data.userGrowth;
              state.activeUsers = data.activeUsers;
              state.isLoading = false;
              state.lastUpdated = new Date();
            },
            false,
            "analytics/fetchDashboardData/success",
          );
        } catch (error) {
          set(
            (state) => {
              state.isLoading = false;
              state.error =
                error instanceof Error
                  ? error.message
                  : "Failed to fetch analytics data";
            },
            false,
            "analytics/fetchDashboardData/error",
          );
        }
      },

      fetchSectionData: async (section) => {
        const {
          dateRange,
          granularity,
          selectedChannelIds,
          selectedUserIds,
          includeBots,
        } = get();

        set(
          (state) => {
            state.isLoading = true;
            state.error = null;
          },
          false,
          `analytics/fetchSectionData/${section}/start`,
        );

        try {
          const aggregator = getAnalyticsAggregator();
          const filters: AnalyticsFilters = {
            dateRange,
            granularity,
            channelIds:
              selectedChannelIds.length > 0 ? selectedChannelIds : undefined,
            userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
            includeBots,
          };

          switch (section) {
            case "messages":
              const messageData =
                await aggregator.aggregateMessageData(filters);
              set(
                (state) => {
                  state.messageVolume = messageData.volume;
                  state.topMessages = messageData.topMessages;
                },
                false,
                "analytics/fetchSectionData/messages",
              );
              break;

            case "users":
              const userData = await aggregator.aggregateUserData(filters);
              set(
                (state) => {
                  state.userActivity = userData.topUsers;
                  state.inactiveUsers = userData.inactiveUsers;
                  state.userGrowth = userData.growth;
                  state.activeUsers = userData.activeUsers;
                },
                false,
                "analytics/fetchSectionData/users",
              );
              break;

            case "channels":
              const channelData =
                await aggregator.aggregateChannelData(filters);
              set(
                (state) => {
                  state.channelActivity = channelData.channels;
                },
                false,
                "analytics/fetchSectionData/channels",
              );
              break;

            case "reactions":
              const reactionData =
                await aggregator.aggregateReactionData(filters);
              set(
                (state) => {
                  state.reactions = reactionData.reactions;
                },
                false,
                "analytics/fetchSectionData/reactions",
              );
              break;

            case "files":
              const fileData = await aggregator.aggregateFileData(filters);
              set(
                (state) => {
                  state.fileUploads = fileData.uploads;
                },
                false,
                "analytics/fetchSectionData/files",
              );
              break;

            case "search":
              const searchData = await aggregator.aggregateSearchData(filters);
              set(
                (state) => {
                  state.searchQueries = searchData.topQueries;
                },
                false,
                "analytics/fetchSectionData/search",
              );
              break;

            case "peakHours":
              const peakData = await aggregator.aggregatePeakHoursData(filters);
              set(
                (state) => {
                  state.peakHours = peakData.hours;
                },
                false,
                "analytics/fetchSectionData/peakHours",
              );
              break;
          }

          set(
            (state) => {
              state.isLoading = false;
              state.lastUpdated = new Date();
            },
            false,
            `analytics/fetchSectionData/${section}/complete`,
          );
        } catch (error) {
          set(
            (state) => {
              state.isLoading = false;
              state.error =
                error instanceof Error
                  ? error.message
                  : `Failed to fetch ${section} data`;
            },
            false,
            `analytics/fetchSectionData/${section}/error`,
          );
        }
      },

      refreshData: async () => {
        const { currentView, fetchDashboardData, fetchSectionData } = get();

        if (currentView === "overview") {
          await fetchDashboardData();
        } else {
          const sectionMap: Record<
            AnalyticsViewType,
            AnalyticsSectionType | null
          > = {
            overview: null,
            messages: "messages",
            users: "users",
            channels: "channels",
            reactions: "reactions",
            files: "files",
            search: "search",
            bots: "bots",
            reports: null,
          };

          const section = sectionMap[currentView];
          if (section) {
            await fetchSectionData(section);
          }
        }
      },

      clearData: () =>
        set(
          (state) => {
            state.dashboardData = null;
            state.summary = null;
            state.messageVolume = [];
            state.userActivity = [];
            state.channelActivity = [];
            state.reactions = [];
            state.fileUploads = [];
            state.searchQueries = [];
            state.peakHours = [];
            state.topMessages = [];
            state.inactiveUsers = [];
            state.userGrowth = [];
            state.activeUsers = null;
            state.lastUpdated = null;
          },
          false,
          "analytics/clearData",
        ),

      // Comparison Actions
      toggleComparison: () =>
        set(
          (state) => {
            state.comparisonEnabled = !state.comparisonEnabled;
            if (!state.comparisonEnabled) {
              state.comparisonDateRange = null;
              state.comparisonData = null;
            } else {
              // Default to previous period
              const aggregator = getAnalyticsAggregator();
              state.comparisonDateRange = aggregator.getPreviousDateRange(
                state.dateRange,
              );
            }
          },
          false,
          "analytics/toggleComparison",
        ),

      setComparisonDateRange: (range) =>
        set(
          (state) => {
            state.comparisonDateRange = range;
          },
          false,
          "analytics/setComparisonDateRange",
        ),

      fetchComparisonData: async () => {
        const {
          comparisonDateRange,
          granularity,
          selectedChannelIds,
          selectedUserIds,
          includeBots,
        } = get();

        if (!comparisonDateRange) return;

        set(
          (state) => {
            state.isLoading = true;
          },
          false,
          "analytics/fetchComparisonData/start",
        );

        try {
          const aggregator = getAnalyticsAggregator();
          const filters: AnalyticsFilters = {
            dateRange: comparisonDateRange,
            granularity,
            channelIds:
              selectedChannelIds.length > 0 ? selectedChannelIds : undefined,
            userIds: selectedUserIds.length > 0 ? selectedUserIds : undefined,
            includeBots,
          };

          const data = await aggregator.aggregateDashboardData(filters);

          set(
            (state) => {
              state.comparisonData = data;
              state.isLoading = false;
            },
            false,
            "analytics/fetchComparisonData/success",
          );
        } catch (error) {
          set(
            (state) => {
              state.isLoading = false;
              state.error =
                error instanceof Error
                  ? error.message
                  : "Failed to fetch comparison data";
            },
            false,
            "analytics/fetchComparisonData/error",
          );
        }
      },

      // Report Actions
      addScheduledReport: (report) =>
        set(
          (state) => {
            state.scheduledReports.push(report);
          },
          false,
          "analytics/addScheduledReport",
        ),

      updateScheduledReport: (id, updates) =>
        set(
          (state) => {
            const index = state.scheduledReports.findIndex((r) => r.id === id);
            if (index !== -1) {
              Object.assign(state.scheduledReports[index], updates);
            }
          },
          false,
          "analytics/updateScheduledReport",
        ),

      deleteScheduledReport: (id) =>
        set(
          (state) => {
            state.scheduledReports = state.scheduledReports.filter(
              (r) => r.id !== id,
            );
          },
          false,
          "analytics/deleteScheduledReport",
        ),

      addReportHistory: (history) =>
        set(
          (state) => {
            state.reportHistory.unshift(history);
            // Keep only last 100 entries
            if (state.reportHistory.length > 100) {
              state.reportHistory = state.reportHistory.slice(0, 100);
            }
          },
          false,
          "analytics/addReportHistory",
        ),

      // Export Actions
      exportData: async (format, sections) => {
        const { dashboardData, dateRange, setExportProgress } = get();

        if (!dashboardData) {
          logger.warn("No data to export");
          return;
        }

        set(
          (state) => {
            state.isExporting = true;
            state.exportProgress = 0;
          },
          false,
          "analytics/exportData/start",
        );

        try {
          // Dynamic import to avoid bundling export module in main chunk
          const { exportFullReport } =
            await import("@/lib/analytics/analytics-export");

          setExportProgress(30);

          const reportData = {
            summary: dashboardData.summary,
            messageVolume: dashboardData.messageVolume,
            userActivity: dashboardData.topUsers,
            channelActivity: dashboardData.channelActivity,
            reactions: dashboardData.reactions,
            fileUploads: dashboardData.fileUploads,
            searchQueries: dashboardData.searchQueries,
            peakHours: dashboardData.peakHours,
            topMessages: dashboardData.topMessages,
            inactiveUsers: dashboardData.inactiveUsers,
            userGrowth: dashboardData.userGrowth,
            dateRange,
          };

          setExportProgress(60);

          exportFullReport(reportData, {
            format,
            sections,
            dateRange,
            includeCharts: false,
          });

          setExportProgress(100);

          set(
            (state) => {
              state.isExporting = false;
              state.exportProgress = 0;
            },
            false,
            "analytics/exportData/success",
          );
        } catch (error) {
          set(
            (state) => {
              state.isExporting = false;
              state.exportProgress = 0;
              state.error =
                error instanceof Error ? error.message : "Export failed";
            },
            false,
            "analytics/exportData/error",
          );
        }
      },

      setExportProgress: (progress) =>
        set(
          (state) => {
            state.exportProgress = progress;
          },
          false,
          "analytics/setExportProgress",
        ),

      // UI Actions
      toggleSidebar: () =>
        set(
          (state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
          },
          false,
          "analytics/toggleSidebar",
        ),

      setChartType: (type) =>
        set(
          (state) => {
            state.selectedChartType = type;
          },
          false,
          "analytics/setChartType",
        ),

      toggleDataLabels: () =>
        set(
          (state) => {
            state.showDataLabels = !state.showDataLabels;
          },
          false,
          "analytics/toggleDataLabels",
        ),

      // Error Handling
      setError: (error) =>
        set(
          (state) => {
            state.error = error;
          },
          false,
          "analytics/setError",
        ),

      clearError: () =>
        set(
          (state) => {
            state.error = null;
          },
          false,
          "analytics/clearError",
        ),
    })),
    { name: "analytics-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectFilters = (state: AnalyticsStore): AnalyticsFilters => ({
  dateRange: state.dateRange,
  granularity: state.granularity,
  channelIds:
    state.selectedChannelIds.length > 0 ? state.selectedChannelIds : undefined,
  userIds: state.selectedUserIds.length > 0 ? state.selectedUserIds : undefined,
  includeBots: state.includeBots,
});

export const selectIsDataLoaded = (state: AnalyticsStore): boolean =>
  state.dashboardData !== null;

export const selectHasError = (state: AnalyticsStore): boolean =>
  state.error !== null;

export const selectMessageStats = (state: AnalyticsStore) =>
  state.summary?.messages || null;

export const selectUserStats = (state: AnalyticsStore) =>
  state.summary?.users || null;

export const selectChannelStats = (state: AnalyticsStore) =>
  state.summary?.channels || null;
