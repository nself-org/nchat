"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  setupSteps,
  setupPhases,
  landingThemeTemplates,
  authProviderDescriptions,
  authPermissionDescriptions,
  type AppConfig,
} from "@/config/app-config";
import { Button } from "@/components/ui/button";
import { ProgressStepper } from "./progress-stepper";
import { ChevronLeft, ChevronRight } from "lucide-react";

// Step components
import { WelcomeStep } from "./steps/welcome-step";
import { EnvironmentStep } from "./steps/environment-step";
import { BackendSetupStep } from "./steps/backend-setup-step";
import { OwnerInfoStep } from "./steps/owner-info-step";
import { BrandingStep } from "./steps/branding-step";
import { ThemeStep } from "./steps/theme-step";
import { LandingPageStep } from "./steps/landing-page-step";
import { AuthMethodsStep } from "./steps/auth-methods-step";
import { AccessPermissionsStep } from "./steps/access-permissions-step";
import { FeaturesStep } from "./steps/features-step";
import { DeploymentStep } from "./steps/deployment-step";
import { ReviewStep } from "./steps/review-step";

interface SetupWizardProps {
  initialConfig: AppConfig;
  onComplete: (config: AppConfig) => void;
  initialStep?: number;
  visitedSteps?: Set<number>;
  setVisitedSteps?: (visitedSteps: Set<number>) => void;
  onConfigUpdate?: (updates: Partial<AppConfig>) => void;
}

export function SetupWizard({
  initialConfig,
  onComplete,
  initialStep,
  visitedSteps: externalVisitedSteps,
  setVisitedSteps: setExternalVisitedSteps,
  onConfigUpdate,
}: SetupWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(
    initialStep ?? initialConfig.setup.currentStep ?? 0,
  );
  const [config, setConfig] = useState<AppConfig>(initialConfig);
  const [isValid, setIsValid] = useState(true);
  const [visitedSteps, setVisitedSteps] = useState<Set<number>>(
    externalVisitedSteps || new Set(initialConfig.setup.visitedSteps || [0]),
  );

  const totalSteps = setupSteps.length;
  const progress = (currentStep / totalSteps) * 100;

  // Sync step with URL
  useEffect(() => {
    if (initialStep !== undefined && initialStep !== currentStep) {
      setCurrentStep(initialStep);
    }
  }, [initialStep]);

  const updateConfig = (updates: Partial<AppConfig>) => {
    // Deep merge known nested sections to avoid losing fields
    const newConfig = { ...config };
    for (const [key, value] of Object.entries(updates)) {
      if (
        value &&
        typeof value === "object" &&
        !Array.isArray(value) &&
        key in config
      ) {
        (newConfig as any)[key] = { ...(config as any)[key], ...value };
      } else {
        (newConfig as any)[key] = value;
      }
    }
    newConfig.setup = {
      ...config.setup,
      currentStep: currentStep,
      visitedSteps: Array.from(visitedSteps),
    };
    setConfig(newConfig);

    // Also update the global config
    if (onConfigUpdate) {
      onConfigUpdate(newConfig);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      const nextStepNum = currentStep + 1;
      setCurrentStep(nextStepNum);
      const newVisitedSteps = new Set([...visitedSteps, nextStepNum]);
      setVisitedSteps(newVisitedSteps);
      if (setExternalVisitedSteps) {
        setExternalVisitedSteps(newVisitedSteps);
      }
      router.push(`/setup/${nextStepNum + 1}`, { scroll: false });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      const prevStepNum = currentStep - 1;
      setCurrentStep(prevStepNum);
      router.push(`/setup/${prevStepNum + 1}`, { scroll: false });
    }
  };

  const handleStepClick = (step: number) => {
    // Allow navigation to any previously visited step or earlier steps
    if (visitedSteps.has(step) || step < currentStep) {
      setCurrentStep(step);
      router.push(`/setup/${step + 1}`, { scroll: false });
    }
  };

  const handleComplete = () => {
    onComplete(config);
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <WelcomeStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      case 1:
        return (
          <EnvironmentStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      case 2:
        return (
          <BackendSetupStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      case 3:
        return (
          <OwnerInfoStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      case 4:
        return (
          <BrandingStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      case 5:
        return (
          <ThemeStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      case 6:
        return (
          <LandingPageStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      case 7:
        return (
          <AuthMethodsStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      case 8:
        return (
          <AccessPermissionsStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      case 9:
        return (
          <FeaturesStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      case 10:
        return (
          <DeploymentStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      case 11:
        return (
          <ReviewStep
            config={config}
            onUpdate={updateConfig}
            onValidate={setIsValid}
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === totalSteps - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="w-full overflow-hidden rounded-xl bg-white dark:bg-zinc-900">
      {/* Step Content */}
      <div className="min-h-[500px] bg-white px-6 py-8 dark:bg-zinc-900">
        {renderStep()}
      </div>

      {/* Navigation Footer - Protocol style */}
      <div className="flex justify-between rounded-b-xl border-t border-zinc-900/10 bg-zinc-100 px-6 py-4 dark:border-white/10 dark:bg-zinc-800/40">
        {!isFirstStep ? (
          <button
            onClick={prevStep}
            className="inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-full bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 transition hover:bg-zinc-200 dark:bg-zinc-800/40 dark:text-zinc-400 dark:ring-1 dark:ring-inset dark:ring-zinc-800 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          >
            <span className="flex items-center text-sm leading-none">‹</span>
            Back
          </button>
        ) : (
          <div /> // Empty div to maintain flex layout
        )}

        {isLastStep ? (
          <button
            onClick={handleComplete}
            disabled={!isValid}
            className="inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#00D4FF]/10 dark:text-[#00D4FF] dark:ring-1 dark:ring-inset dark:ring-[#00D4FF]/20 dark:hover:bg-[#00D4FF]/10 dark:hover:text-[#0EA5E9] dark:hover:ring-[#0EA5E9]"
          >
            Complete Setup
            <span className="text-base leading-none">✓</span>
          </button>
        ) : (
          <button
            onClick={nextStep}
            disabled={!isValid}
            className="inline-flex items-center justify-center gap-1.5 overflow-hidden rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#00D4FF]/10 dark:text-[#00D4FF] dark:ring-1 dark:ring-inset dark:ring-[#00D4FF]/20 dark:hover:bg-[#00D4FF]/10 dark:hover:text-[#0EA5E9] dark:hover:ring-[#0EA5E9]"
          >
            Next
            <span className="flex items-center text-sm leading-none">›</span>
          </button>
        )}
      </div>
    </div>
  );
}
