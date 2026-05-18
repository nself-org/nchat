"use client";

import { useState, useCallback, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Circle,
  CircleCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useWhiteLabelStore,
  selectCurrentStep,
  selectIsFirstStep,
  selectIsLastStep,
  selectProgress,
} from "@/stores/white-label-store";

// Step components
import { Step1AppInfo } from "./Step1AppInfo";
import { Step2LogoBuilder } from "./Step2LogoBuilder";
import { Step3FaviconGenerator } from "./Step3FaviconGenerator";
import { Step4ColorScheme } from "./Step4ColorScheme";
import { Step5Typography } from "./Step5Typography";
import { Step6EmailTemplates } from "./Step6EmailTemplates";
import { Step7LandingPage } from "./Step7LandingPage";
import { Step8CustomDomain } from "./Step8CustomDomain";
import { Step9Review } from "./Step9Review";

interface WhiteLabelWizardProps {
  onComplete?: () => void;
  onClose?: () => void;
  className?: string;
}

export function WhiteLabelWizard({
  onComplete,
  onClose,
  className,
}: WhiteLabelWizardProps) {
  const {
    currentStep,
    steps,
    nextStep,
    prevStep,
    setCurrentStep,
    closeWizard,
    saveToLocalStorage,
  } = useWhiteLabelStore();

  const currentStepData = useWhiteLabelStore(selectCurrentStep);
  const isFirstStep = useWhiteLabelStore(selectIsFirstStep);
  const isLastStep = useWhiteLabelStore(selectIsLastStep);
  const progress = useWhiteLabelStore(selectProgress);

  const [stepValid, setStepValid] = useState<Record<string, boolean>>({});

  const handleClose = useCallback(() => {
    closeWizard();
    onClose?.();
  }, [closeWizard, onClose]);

  const handleComplete = useCallback(() => {
    saveToLocalStorage();
    closeWizard();
    onComplete?.();
  }, [saveToLocalStorage, closeWizard, onComplete]);

  const handleStepValidChange = useCallback(
    (isValid: boolean) => {
      setStepValid((prev) => ({
        ...prev,
        [currentStepData?.id || ""]: isValid,
      }));
    },
    [currentStepData?.id],
  );

  const canProceed =
    currentStepData?.skippable || stepValid[currentStepData?.id || ""];

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <Step1AppInfo onValidChange={handleStepValidChange} />;
      case 1:
        return <Step2LogoBuilder onValidChange={handleStepValidChange} />;
      case 2:
        return <Step3FaviconGenerator onValidChange={handleStepValidChange} />;
      case 3:
        return <Step4ColorScheme onValidChange={handleStepValidChange} />;
      case 4:
        return <Step5Typography onValidChange={handleStepValidChange} />;
      case 5:
        return <Step6EmailTemplates onValidChange={handleStepValidChange} />;
      case 6:
        return <Step7LandingPage onValidChange={handleStepValidChange} />;
      case 7:
        return <Step8CustomDomain onValidChange={handleStepValidChange} />;
      case 8:
        return <Step9Review onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white dark:bg-zinc-900",
        className,
      )}
    >
      {/* Header */}
      <div className="flex-shrink-0 border-b border-zinc-200 dark:border-zinc-700">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold text-zinc-900 dark:text-white">
              White Label Setup
            </h1>
            <p className="text-sm text-zinc-500">
              Step {currentStep + 1} of {steps.length}: {currentStepData?.title}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-2 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
            aria-label="Close wizard"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pb-4">
          <div className="h-1.5 overflow-hidden rounded-full bg-zinc-100 dark:bg-zinc-800">
            <div
              className="h-full bg-sky-500 transition-all duration-300"
              style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Step indicators */}
        <div className="overflow-x-auto px-6 pb-4">
          <div className="flex min-w-max items-center gap-2">
            {steps.map((step, index) => {
              const isActive = index === currentStep;
              const isCompleted = step.completed;
              const isPast = index < currentStep;

              return (
                <button
                  key={step.id}
                  onClick={() => {
                    if (isPast || isCompleted) {
                      setCurrentStep(index);
                    }
                  }}
                  disabled={!isPast && !isCompleted && index !== currentStep}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                    isActive
                      ? "dark:bg-sky-900/30 bg-sky-100 text-sky-700 dark:text-sky-300"
                      : isCompleted
                        ? "cursor-pointer bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                        : isPast
                          ? "cursor-pointer bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                          : "cursor-not-allowed bg-zinc-50 text-zinc-400 dark:bg-zinc-800/50 dark:text-zinc-500",
                  )}
                >
                  {isCompleted ? (
                    <CircleCheck className="h-4 w-4" />
                  ) : (
                    <Circle className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">{step.title}</span>
                  <span className="sm:hidden">{index + 1}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-4xl px-6 py-8">{renderStep()}</div>
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 border-t border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800/50">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            {!isFirstStep ? (
              <Button type="button" variant="outline" onClick={prevStep}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center gap-3">
            {currentStepData?.skippable && !isLastStep && (
              <Button
                type="button"
                variant="ghost"
                onClick={nextStep}
                className="text-zinc-500"
              >
                Skip
              </Button>
            )}

            {isLastStep ? (
              <Button type="button" onClick={handleComplete}>
                <Check className="mr-1 h-4 w-4" />
                Complete Setup
              </Button>
            ) : (
              <Button type="button" onClick={nextStep} disabled={!canProceed}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// Modal wrapper for the wizard
interface WhiteLabelWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
}

export function WhiteLabelWizardModal({
  isOpen,
  onClose,
  onComplete,
}: WhiteLabelWizardModalProps) {
  // Lock body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            onClose();
          }
        }}
        role="button"
        tabIndex={0}
        aria-label="Close wizard"
      />

      {/* Modal */}
      <div className="absolute inset-4 overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900 md:inset-8 lg:inset-12">
        <WhiteLabelWizard onClose={onClose} onComplete={onComplete} />
      </div>
    </div>
  );
}

// Hook to open the wizard
export function useWhiteLabelWizard() {
  const { isWizardOpen, openWizard, closeWizard } = useWhiteLabelStore();

  return {
    isOpen: isWizardOpen,
    open: openWizard,
    close: closeWizard,
  };
}
