/**
 * Automation Store
 *
 * Zustand store for managing automation rules and executions
 */

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type {
  AutomationRule,
  AutomationExecution,
  AutomationStatus,
} from "./automation-engine";

// ============================================================================
// State Interface
// ============================================================================

export interface AutomationState {
  // Rules
  rules: AutomationRule[];
  selectedRule: AutomationRule | null;
  isLoadingRules: boolean;

  // Executions
  executions: AutomationExecution[];
  isLoadingExecutions: boolean;

  // Filters
  statusFilter: AutomationStatus | "all";
  searchQuery: string;

  // Pagination
  rulesPage: number;
  rulesPerPage: number;
  rulesTotal: number;
  executionsPage: number;
  executionsPerPage: number;
  executionsTotal: number;

  // Modals
  createRuleModalOpen: boolean;
  editRuleModalOpen: boolean;
  deleteRuleModalOpen: boolean;
  ruleTarget: AutomationRule | null;
}

// ============================================================================
// Actions Interface
// ============================================================================

export interface AutomationActions {
  // Rules
  setRules: (rules: AutomationRule[], total: number) => void;
  addRule: (rule: AutomationRule) => void;
  updateRule: (ruleId: string, updates: Partial<AutomationRule>) => void;
  removeRule: (ruleId: string) => void;
  setSelectedRule: (rule: AutomationRule | null) => void;
  setLoadingRules: (loading: boolean) => void;

  // Executions
  setExecutions: (executions: AutomationExecution[], total: number) => void;
  addExecution: (execution: AutomationExecution) => void;
  updateExecution: (
    executionId: string,
    updates: Partial<AutomationExecution>,
  ) => void;
  setLoadingExecutions: (loading: boolean) => void;

  // Filters
  setStatusFilter: (status: AutomationStatus | "all") => void;
  setSearchQuery: (query: string) => void;

  // Pagination
  setRulesPage: (page: number) => void;
  setExecutionsPage: (page: number) => void;

  // Modals
  openCreateRuleModal: () => void;
  closeCreateRuleModal: () => void;
  openEditRuleModal: (rule: AutomationRule) => void;
  closeEditRuleModal: () => void;
  openDeleteRuleModal: (rule: AutomationRule) => void;
  closeDeleteRuleModal: () => void;

  // Utility
  reset: () => void;
}

export type AutomationStore = AutomationState & AutomationActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: AutomationState = {
  rules: [],
  selectedRule: null,
  isLoadingRules: false,
  executions: [],
  isLoadingExecutions: false,
  statusFilter: "all",
  searchQuery: "",
  rulesPage: 1,
  rulesPerPage: 20,
  rulesTotal: 0,
  executionsPage: 1,
  executionsPerPage: 20,
  executionsTotal: 0,
  createRuleModalOpen: false,
  editRuleModalOpen: false,
  deleteRuleModalOpen: false,
  ruleTarget: null,
};

// ============================================================================
// Store
// ============================================================================

export const useAutomationStore = create<AutomationStore>()(
  devtools(
    immer((set) => ({
      ...initialState,

      // Rules
      setRules: (rules, total) =>
        set(
          (state) => {
            state.rules = rules;
            state.rulesTotal = total;
          },
          false,
          "automation/setRules",
        ),

      addRule: (rule) =>
        set(
          (state) => {
            state.rules.unshift(rule);
            state.rulesTotal++;
          },
          false,
          "automation/addRule",
        ),

      updateRule: (ruleId, updates) =>
        set(
          (state) => {
            const index = state.rules.findIndex((r) => r.id === ruleId);
            if (index !== -1) {
              state.rules[index] = { ...state.rules[index], ...updates };
            }
            if (state.selectedRule?.id === ruleId) {
              state.selectedRule = { ...state.selectedRule, ...updates };
            }
          },
          false,
          "automation/updateRule",
        ),

      removeRule: (ruleId) =>
        set(
          (state) => {
            state.rules = state.rules.filter((r) => r.id !== ruleId);
            state.rulesTotal--;
            if (state.selectedRule?.id === ruleId) {
              state.selectedRule = null;
            }
          },
          false,
          "automation/removeRule",
        ),

      setSelectedRule: (rule) =>
        set(
          (state) => {
            state.selectedRule = rule;
          },
          false,
          "automation/setSelectedRule",
        ),

      setLoadingRules: (loading) =>
        set(
          (state) => {
            state.isLoadingRules = loading;
          },
          false,
          "automation/setLoadingRules",
        ),

      // Executions
      setExecutions: (executions, total) =>
        set(
          (state) => {
            state.executions = executions;
            state.executionsTotal = total;
          },
          false,
          "automation/setExecutions",
        ),

      addExecution: (execution) =>
        set(
          (state) => {
            state.executions.unshift(execution);
            state.executionsTotal++;
          },
          false,
          "automation/addExecution",
        ),

      updateExecution: (executionId, updates) =>
        set(
          (state) => {
            const index = state.executions.findIndex(
              (e) => e.id === executionId,
            );
            if (index !== -1) {
              state.executions[index] = {
                ...state.executions[index],
                ...updates,
              };
            }
          },
          false,
          "automation/updateExecution",
        ),

      setLoadingExecutions: (loading) =>
        set(
          (state) => {
            state.isLoadingExecutions = loading;
          },
          false,
          "automation/setLoadingExecutions",
        ),

      // Filters
      setStatusFilter: (status) =>
        set(
          (state) => {
            state.statusFilter = status;
            state.rulesPage = 1;
          },
          false,
          "automation/setStatusFilter",
        ),

      setSearchQuery: (query) =>
        set(
          (state) => {
            state.searchQuery = query;
            state.rulesPage = 1;
          },
          false,
          "automation/setSearchQuery",
        ),

      // Pagination
      setRulesPage: (page) =>
        set(
          (state) => {
            state.rulesPage = page;
          },
          false,
          "automation/setRulesPage",
        ),

      setExecutionsPage: (page) =>
        set(
          (state) => {
            state.executionsPage = page;
          },
          false,
          "automation/setExecutionsPage",
        ),

      // Modals
      openCreateRuleModal: () =>
        set(
          (state) => {
            state.createRuleModalOpen = true;
          },
          false,
          "automation/openCreateRuleModal",
        ),

      closeCreateRuleModal: () =>
        set(
          (state) => {
            state.createRuleModalOpen = false;
          },
          false,
          "automation/closeCreateRuleModal",
        ),

      openEditRuleModal: (rule) =>
        set(
          (state) => {
            state.editRuleModalOpen = true;
            state.ruleTarget = rule;
          },
          false,
          "automation/openEditRuleModal",
        ),

      closeEditRuleModal: () =>
        set(
          (state) => {
            state.editRuleModalOpen = false;
            state.ruleTarget = null;
          },
          false,
          "automation/closeEditRuleModal",
        ),

      openDeleteRuleModal: (rule) =>
        set(
          (state) => {
            state.deleteRuleModalOpen = true;
            state.ruleTarget = rule;
          },
          false,
          "automation/openDeleteRuleModal",
        ),

      closeDeleteRuleModal: () =>
        set(
          (state) => {
            state.deleteRuleModalOpen = false;
            state.ruleTarget = null;
          },
          false,
          "automation/closeDeleteRuleModal",
        ),

      // Utility
      reset: () => set(() => initialState, false, "automation/reset"),
    })),
    { name: "automation-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectRules = (state: AutomationStore) => state.rules;
export const selectExecutions = (state: AutomationStore) => state.executions;
export const selectSelectedRule = (state: AutomationStore) =>
  state.selectedRule;

export const selectFilteredRules = (state: AutomationStore) => {
  let filtered = state.rules;

  // Filter by status
  if (state.statusFilter !== "all") {
    filtered = filtered.filter((rule) => rule.status === state.statusFilter);
  }

  // Filter by search query
  if (state.searchQuery) {
    const query = state.searchQuery.toLowerCase();
    filtered = filtered.filter(
      (rule) =>
        rule.name.toLowerCase().includes(query) ||
        rule.description?.toLowerCase().includes(query),
    );
  }

  return filtered;
};

export const selectRulesPagination = (state: AutomationStore) => ({
  page: state.rulesPage,
  perPage: state.rulesPerPage,
  total: state.rulesTotal,
  totalPages: Math.ceil(state.rulesTotal / state.rulesPerPage),
});

export const selectExecutionsPagination = (state: AutomationStore) => ({
  page: state.executionsPage,
  perPage: state.executionsPerPage,
  total: state.executionsTotal,
  totalPages: Math.ceil(state.executionsTotal / state.executionsPerPage),
});

export const selectCreateRuleModal = (state: AutomationStore) => ({
  isOpen: state.createRuleModalOpen,
});

export const selectEditRuleModal = (state: AutomationStore) => ({
  isOpen: state.editRuleModalOpen,
  target: state.ruleTarget,
});

export const selectDeleteRuleModal = (state: AutomationStore) => ({
  isOpen: state.deleteRuleModalOpen,
  target: state.ruleTarget,
});
