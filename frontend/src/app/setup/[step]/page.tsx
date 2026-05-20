"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { useAppConfig } from "@/contexts/app-config-context";
import { setupSteps } from "@/config/app-config";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { ThemeToggle } from "@/components/theme-toggle";
import { ProgressStepper } from "@/components/setup/progress-stepper";

import { logger } from "@/lib/logger";

export default function SetupStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = use(params);
  const router = useRouter();
  const { config, updateConfig } = useAppConfig();
  const [isLoading, setIsLoading] = useState(true);

  // Initialize visited steps from config, ensuring current step is included
  const initVisitedSteps = () => {
    const steps = config.setup.visitedSteps || [0];
    return new Set(steps);
  };
  const [visitedSteps, setVisitedSteps] =
    useState<Set<number>>(initVisitedSteps());

  // Parse step number from URL
  const stepNumber = step ? parseInt(step) - 1 : 0;

  // Sync visited steps from config
  useEffect(() => {
    if (config.setup.visitedSteps) {
      setVisitedSteps(new Set(config.setup.visitedSteps));
    }
  }, [config.setup.visitedSteps]);

  useEffect(() => {
    // If setup is already completed, redirect to home
    if (config.setup.isCompleted) {
      router.push("/");
      return;
    }

    // Validate step number and redirect if invalid
    if (stepNumber < 0 || stepNumber >= setupSteps.length) {
      router.push("/setup/1");
      return;
    }

    // Add current step to visited steps
    const newVisitedSteps = new Set([...visitedSteps, stepNumber]);
    setVisitedSteps(newVisitedSteps);

    // Update global config with visited steps
    updateConfig({
      setup: {
        ...config.setup,
        currentStep: stepNumber,
        visitedSteps: Array.from(newVisitedSteps),
      },
    });

    setIsLoading(false);
  }, [config.setup.isCompleted, router, stepNumber]);

  const handleSetupComplete = async (finalConfig: any) => {
    try {
      const completedConfig = {
        ...finalConfig,
        setup: {
          ...finalConfig.setup,
          isCompleted: true,
          currentStep: setupSteps.length - 1,
          visitedSteps:
            finalConfig.setup?.visitedSteps ||
            Array.from({ length: setupSteps.length }, (_, i) => i),
          completedAt: new Date(),
        },
      };

      await updateConfig(completedConfig);

      // Redirect based on homepage mode
      if (completedConfig.homepage.mode === "redirect") {
        router.push(completedConfig.homepage.redirectTo || "/auth/signin");
      } else if (completedConfig.homepage.mode === "chat") {
        router.push("/chat");
      } else {
        router.push("/");
      }
    } catch (error) {
      logger.error("Setup completion failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-sky-600"></div>
          <p className="text-zinc-600 dark:text-zinc-400">Loading setup...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white antialiased dark:bg-zinc-900">
      {/* Background decoration - Protocol style with nself glows */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -right-32 -top-40 h-96 w-96 rounded-full bg-[#00D4FF]/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-32 h-96 w-96 rounded-full bg-[#0EA5E9]/5 blur-3xl" />
      </div>

      <div className="relative z-10">
        {/* Header - Protocol style with nself branding */}
        <div
          className="backdrop-blur-xs bg-white/(--bg-opacity-light) dark:bg-zinc-900/(--bg-opacity-dark) fixed inset-x-0 top-0 z-50 flex h-14 items-center justify-between gap-12 px-4 transition sm:px-6 lg:px-8 lg:backdrop-blur-sm"
          style={
            {
              "--bg-opacity-light": "90%",
              "--bg-opacity-dark": "80%",
            } as React.CSSProperties
          }
        >
          <div className="container mx-auto max-w-4xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {config.branding.logo ? (
                  // If logo exists, show it (logo should contain the brand name)
                  <img
                    src={config.branding.logo}
                    alt={config.branding.appName}
                    className="w-auto object-contain"
                    style={{
                      height: `${32 * (config.branding.logoScale || 1.0)}px`,
                    }}
                  />
                ) : (
                  // If no logo, show icon + text
                  <>
                    {config.branding.favicon ? (
                      <img
                        src={config.branding.favicon}
                        alt={config.branding.appName}
                        className="h-8 w-8 object-contain"
                      />
                    ) : (
                      <div className="shadow-glow flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0EA5E9]">
                        <span className="text-sm font-bold text-zinc-900">
                          ɳ
                        </span>
                      </div>
                    )}
                    <h1 className="text-xl font-semibold text-zinc-900 dark:text-white">
                      {config.branding.appName || "nChat"}
                    </h1>
                  </>
                )}
                <span className="ml-2 text-sm text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                  Setup
                </span>
              </div>
              <div className="flex items-center space-x-3">
                <span className="text-sm text-zinc-600 transition hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white">
                  Step-by-step configuration
                </span>
                <ThemeToggle />
              </div>
            </div>
          </div>
          {/* Protocol border separator */}
          <div className="bg-zinc-900/7.5 dark:bg-white/7.5 absolute inset-x-0 top-full h-px" />
        </div>

        {/* Progress Stepper - Protocol spacing */}
        <div className="pt-14">
          <ProgressStepper
            currentStep={stepNumber}
            totalSteps={setupSteps.length}
            onStepClick={(step) => {
              // Allow clicking on any visited step or earlier steps
              if (visitedSteps.has(step) || step <= stepNumber) {
                router.push(`/setup/${step + 1}`);
              }
            }}
            visitedSteps={visitedSteps}
          />
        </div>

        {/* Main content - Protocol card styling */}
        <div className="relative flex flex-col px-4 pb-8 pt-8 sm:px-6 lg:px-8">
          <div className="container mx-auto max-w-4xl">
            <div className="shadow-glow overflow-hidden rounded-xl border border-zinc-900/10 bg-white dark:border-white/10 dark:bg-zinc-900">
              <SetupWizard
                initialConfig={config}
                onComplete={handleSetupComplete}
                initialStep={stepNumber}
                visitedSteps={visitedSteps}
                setVisitedSteps={setVisitedSteps}
                onConfigUpdate={updateConfig}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
