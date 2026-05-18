/**
 * White Label Store - Zustand store for white-label wizard state management
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  type BrandingConfig,
  type WizardStep,
  DEFAULT_BRANDING_CONFIG,
  WIZARD_STEPS,
  validateBrandingConfig,
} from "@/lib/white-label/branding-schema";
import type { GeneratedFavicon } from "@/lib/white-label/favicon-generator";

import { logger } from "@/lib/logger";

// ============================================================================
// Types
// ============================================================================

export interface WhiteLabelState {
  // Wizard State
  currentStep: number;
  steps: WizardStep[];
  isWizardOpen: boolean;

  // Branding Config
  config: BrandingConfig;
  isDirty: boolean;
  lastSaved: string | null;

  // Generated Assets
  generatedFavicons: GeneratedFavicon[];
  previewLogo: string | null;
  previewFavicon: string | null;

  // UI State
  isLoading: boolean;
  isSaving: boolean;
  isExporting: boolean;
  error: string | null;

  // Validation
  validationErrors: string[];
  isValid: boolean;
}

export interface WhiteLabelActions {
  // Wizard Navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  goToStep: (stepId: string) => void;
  markStepComplete: (stepId: string) => void;
  markStepIncomplete: (stepId: string) => void;
  openWizard: () => void;
  closeWizard: () => void;
  resetWizard: () => void;

  // Config Updates
  updateConfig: (updates: Partial<BrandingConfig>) => void;
  updateAppInfo: (appInfo: Partial<BrandingConfig["appInfo"]>) => void;
  updateLogo: (logo: Partial<BrandingConfig["logo"]>) => void;
  updateFavicon: (favicon: Partial<BrandingConfig["favicon"]>) => void;
  updateColors: (colors: Partial<BrandingConfig["colors"]>) => void;
  updateTypography: (typography: Partial<BrandingConfig["typography"]>) => void;
  updateEmailTemplates: (
    emailTemplates: Partial<BrandingConfig["emailTemplates"]>,
  ) => void;
  updateLandingPage: (
    landingPage: Partial<BrandingConfig["landingPage"]>,
  ) => void;
  updateCustomDomain: (
    customDomain: Partial<BrandingConfig["customDomain"]>,
  ) => void;
  setConfig: (config: BrandingConfig) => void;
  resetConfig: () => void;

  // Assets
  setGeneratedFavicons: (favicons: GeneratedFavicon[]) => void;
  setPreviewLogo: (url: string | null) => void;
  setPreviewFavicon: (url: string | null) => void;
  clearAssets: () => void;

  // Loading States
  setLoading: (isLoading: boolean) => void;
  setSaving: (isSaving: boolean) => void;
  setExporting: (isExporting: boolean) => void;
  setError: (error: string | null) => void;

  // Validation
  validate: () => boolean;
  clearValidationErrors: () => void;

  // Persistence
  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  exportConfig: () => string;
  importConfig: (json: string) => boolean;
}

export type WhiteLabelStore = WhiteLabelState & WhiteLabelActions;

// ============================================================================
// Initial State
// ============================================================================

const initialState: WhiteLabelState = {
  // Wizard State
  currentStep: 0,
  steps: WIZARD_STEPS.map((step) => ({ ...step })),
  isWizardOpen: false,

  // Branding Config
  config: { ...DEFAULT_BRANDING_CONFIG },
  isDirty: false,
  lastSaved: null,

  // Generated Assets
  generatedFavicons: [],
  previewLogo: null,
  previewFavicon: null,

  // UI State
  isLoading: false,
  isSaving: false,
  isExporting: false,
  error: null,

  // Validation
  validationErrors: [],
  isValid: true,
};

// ============================================================================
// Store
// ============================================================================

export const useWhiteLabelStore = create<WhiteLabelStore>()(
  devtools(
    persist(
      immer((set, get) => ({
        ...initialState,

        // Wizard Navigation
        setCurrentStep: (step) =>
          set(
            (state) => {
              state.currentStep = Math.max(
                0,
                Math.min(step, state.steps.length - 1),
              );
            },
            false,
            "whiteLabel/setCurrentStep",
          ),

        nextStep: () =>
          set(
            (state) => {
              if (state.currentStep < state.steps.length - 1) {
                state.currentStep++;
              }
            },
            false,
            "whiteLabel/nextStep",
          ),

        prevStep: () =>
          set(
            (state) => {
              if (state.currentStep > 0) {
                state.currentStep--;
              }
            },
            false,
            "whiteLabel/prevStep",
          ),

        goToStep: (stepId) =>
          set(
            (state) => {
              const index = state.steps.findIndex((s) => s.id === stepId);
              if (index >= 0) {
                state.currentStep = index;
              }
            },
            false,
            "whiteLabel/goToStep",
          ),

        markStepComplete: (stepId) =>
          set(
            (state) => {
              const step = state.steps.find((s) => s.id === stepId);
              if (step) {
                step.completed = true;
              }
            },
            false,
            "whiteLabel/markStepComplete",
          ),

        markStepIncomplete: (stepId) =>
          set(
            (state) => {
              const step = state.steps.find((s) => s.id === stepId);
              if (step) {
                step.completed = false;
              }
            },
            false,
            "whiteLabel/markStepIncomplete",
          ),

        openWizard: () =>
          set(
            (state) => {
              state.isWizardOpen = true;
            },
            false,
            "whiteLabel/openWizard",
          ),

        closeWizard: () =>
          set(
            (state) => {
              state.isWizardOpen = false;
            },
            false,
            "whiteLabel/closeWizard",
          ),

        resetWizard: () =>
          set(
            (state) => {
              state.currentStep = 0;
              state.steps = WIZARD_STEPS.map((step) => ({ ...step }));
              state.config = { ...DEFAULT_BRANDING_CONFIG };
              state.isDirty = false;
              state.generatedFavicons = [];
              state.previewLogo = null;
              state.previewFavicon = null;
              state.validationErrors = [];
              state.isValid = true;
            },
            false,
            "whiteLabel/resetWizard",
          ),

        // Config Updates
        updateConfig: (updates) =>
          set(
            (state) => {
              state.config = { ...state.config, ...updates };
              state.config.metadata.updatedAt = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "whiteLabel/updateConfig",
          ),

        updateAppInfo: (appInfo) =>
          set(
            (state) => {
              state.config.appInfo = { ...state.config.appInfo, ...appInfo };
              state.config.metadata.updatedAt = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "whiteLabel/updateAppInfo",
          ),

        updateLogo: (logo) =>
          set(
            (state) => {
              state.config.logo = { ...state.config.logo, ...logo };
              state.config.metadata.updatedAt = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "whiteLabel/updateLogo",
          ),

        updateFavicon: (favicon) =>
          set(
            (state) => {
              state.config.favicon = { ...state.config.favicon, ...favicon };
              state.config.metadata.updatedAt = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "whiteLabel/updateFavicon",
          ),

        updateColors: (colors) =>
          set(
            (state) => {
              state.config.colors = { ...state.config.colors, ...colors };
              state.config.metadata.updatedAt = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "whiteLabel/updateColors",
          ),

        updateTypography: (typography) =>
          set(
            (state) => {
              state.config.typography = {
                ...state.config.typography,
                ...typography,
              };
              state.config.metadata.updatedAt = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "whiteLabel/updateTypography",
          ),

        updateEmailTemplates: (emailTemplates) =>
          set(
            (state) => {
              state.config.emailTemplates = {
                ...state.config.emailTemplates,
                ...emailTemplates,
              };
              state.config.metadata.updatedAt = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "whiteLabel/updateEmailTemplates",
          ),

        updateLandingPage: (landingPage) =>
          set(
            (state) => {
              state.config.landingPage = {
                ...state.config.landingPage,
                ...landingPage,
              };
              state.config.metadata.updatedAt = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "whiteLabel/updateLandingPage",
          ),

        updateCustomDomain: (customDomain) =>
          set(
            (state) => {
              state.config.customDomain = {
                ...state.config.customDomain,
                ...customDomain,
              };
              state.config.metadata.updatedAt = new Date().toISOString();
              state.isDirty = true;
            },
            false,
            "whiteLabel/updateCustomDomain",
          ),

        setConfig: (config) =>
          set(
            (state) => {
              state.config = config;
              state.isDirty = false;
            },
            false,
            "whiteLabel/setConfig",
          ),

        resetConfig: () =>
          set(
            (state) => {
              state.config = { ...DEFAULT_BRANDING_CONFIG };
              state.isDirty = false;
            },
            false,
            "whiteLabel/resetConfig",
          ),

        // Assets
        setGeneratedFavicons: (favicons) =>
          set(
            (state) => {
              state.generatedFavicons = favicons;
            },
            false,
            "whiteLabel/setGeneratedFavicons",
          ),

        setPreviewLogo: (url) =>
          set(
            (state) => {
              state.previewLogo = url;
            },
            false,
            "whiteLabel/setPreviewLogo",
          ),

        setPreviewFavicon: (url) =>
          set(
            (state) => {
              state.previewFavicon = url;
            },
            false,
            "whiteLabel/setPreviewFavicon",
          ),

        clearAssets: () =>
          set(
            (state) => {
              state.generatedFavicons = [];
              state.previewLogo = null;
              state.previewFavicon = null;
            },
            false,
            "whiteLabel/clearAssets",
          ),

        // Loading States
        setLoading: (isLoading) =>
          set(
            (state) => {
              state.isLoading = isLoading;
            },
            false,
            "whiteLabel/setLoading",
          ),

        setSaving: (isSaving) =>
          set(
            (state) => {
              state.isSaving = isSaving;
            },
            false,
            "whiteLabel/setSaving",
          ),

        setExporting: (isExporting) =>
          set(
            (state) => {
              state.isExporting = isExporting;
            },
            false,
            "whiteLabel/setExporting",
          ),

        setError: (error) =>
          set(
            (state) => {
              state.error = error;
            },
            false,
            "whiteLabel/setError",
          ),

        // Validation
        validate: () => {
          const { config } = get();
          const result = validateBrandingConfig(config);
          set(
            (state) => {
              state.validationErrors = result.errors;
              state.isValid = result.valid;
            },
            false,
            "whiteLabel/validate",
          );
          return result.valid;
        },

        clearValidationErrors: () =>
          set(
            (state) => {
              state.validationErrors = [];
              state.isValid = true;
            },
            false,
            "whiteLabel/clearValidationErrors",
          ),

        // Persistence
        saveToLocalStorage: () => {
          const { config } = get();
          try {
            localStorage.setItem(
              "nchat-white-label-config",
              JSON.stringify(config),
            );
            set(
              (state) => {
                state.isDirty = false;
                state.lastSaved = new Date().toISOString();
              },
              false,
              "whiteLabel/saveToLocalStorage",
            );
          } catch (error) {
            logger.error("Failed to save config to localStorage:", error);
          }
        },

        loadFromLocalStorage: () => {
          try {
            const saved = localStorage.getItem("nchat-white-label-config");
            if (saved) {
              const config = JSON.parse(saved) as BrandingConfig;
              set(
                (state) => {
                  state.config = config;
                  state.isDirty = false;
                },
                false,
                "whiteLabel/loadFromLocalStorage",
              );
              return true;
            }
          } catch (error) {
            logger.error("Failed to load config from localStorage:", error);
          }
          return false;
        },

        exportConfig: () => {
          const { config } = get();
          return JSON.stringify(config, null, 2);
        },

        importConfig: (json) => {
          try {
            const config = JSON.parse(json) as BrandingConfig;
            const result = validateBrandingConfig(config);
            if (!result.valid) {
              set(
                (state) => {
                  state.validationErrors = result.errors;
                  state.error =
                    "Invalid configuration: " + result.errors.join(", ");
                },
                false,
                "whiteLabel/importConfig",
              );
              return false;
            }
            set(
              (state) => {
                state.config = config;
                state.isDirty = true;
                state.error = null;
              },
              false,
              "whiteLabel/importConfig",
            );
            return true;
          } catch (error) {
            set(
              (state) => {
                state.error = `Failed to parse configuration: ${error}`;
              },
              false,
              "whiteLabel/importConfig",
            );
            return false;
          }
        },
      })),
      {
        name: "nchat-white-label-store",
        partialize: (state) => ({
          config: state.config,
          steps: state.steps,
          currentStep: state.currentStep,
        }),
      },
    ),
    { name: "white-label-store" },
  ),
);

// ============================================================================
// Selectors
// ============================================================================

export const selectCurrentStep = (state: WhiteLabelStore) =>
  state.steps[state.currentStep];
export const selectCompletedSteps = (state: WhiteLabelStore) =>
  state.steps.filter((s) => s.completed);
export const selectProgress = (state: WhiteLabelStore) => {
  const completed = state.steps.filter((s) => s.completed).length;
  return Math.round((completed / state.steps.length) * 100);
};
export const selectIsFirstStep = (state: WhiteLabelStore) =>
  state.currentStep === 0;
export const selectIsLastStep = (state: WhiteLabelStore) =>
  state.currentStep === state.steps.length - 1;
export const selectCanProceed = (state: WhiteLabelStore) => {
  const current = state.steps[state.currentStep];
  return current.skippable || current.completed;
};
