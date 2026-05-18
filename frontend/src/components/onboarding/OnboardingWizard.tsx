"use client";

import { useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type {
  OnboardingStepId,
  OnboardingStepStatus,
} from "@/lib/onboarding/onboarding-types";
import {
  onboardingSteps,
  getStepById,
  canSkipStep,
} from "@/lib/onboarding/onboarding-steps";
import { useOnboardingStore } from "@/stores/onboarding-store";

import { ProgressIndicator } from "./ProgressIndicator";
import { WelcomeStep } from "./WelcomeStep";
import { ProfileSetupStep } from "./ProfileSetupStep";
import { AvatarUploadStep } from "./AvatarUploadStep";
import { PreferencesStep } from "./PreferencesStep";
import { NotificationPermissionStep } from "./NotificationPermissionStep";
import { JoinChannelsStep } from "./JoinChannelsStep";
import { InviteTeamStep } from "./InviteTeamStep";
import { TourStep } from "./TourStep";
import { CompletionStep } from "./CompletionStep";

interface OnboardingWizardProps {
  appName?: string;
  onComplete?: () => void;
  onSkip?: () => void;
  showCloseButton?: boolean;
  className?: string;
}

export function OnboardingWizard({
  appName = "nchat",
  onComplete,
  onSkip,
  showCloseButton = false,
  className,
}: OnboardingWizardProps) {
  const {
    onboarding,
    profileData,
    preferencesData,
    notificationSettings,
    selectedChannels,
    teamInvitations,
    completeStep,
    skipStep,
    previousStep,
    goToStep,
    skipAllOnboarding,
    updateProfileData,
    updatePreferencesData,
    updateNotificationSettings,
    setSelectedChannels,
    startTour,
  } = useOnboardingStore();

  const currentStepId = onboarding?.currentStepId ?? "welcome";
  const currentStep = getStepById(currentStepId);
  const currentStepIndex = onboardingSteps.findIndex(
    (s) => s.id === currentStepId,
  );
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === onboardingSteps.length - 1;

  // Build step statuses for progress indicator
  const stepStatuses = useMemo(() => {
    const statuses: Record<OnboardingStepId, OnboardingStepStatus> =
      {} as Record<OnboardingStepId, OnboardingStepStatus>;

    onboardingSteps.forEach((step) => {
      const stepState = onboarding?.steps.find((s) => s.stepId === step.id);
      statuses[step.id] = stepState?.status ?? "pending";
    });

    return statuses;
  }, [onboarding?.steps]);

  const handleNext = useCallback(() => {
    // Collect step data before completing
    let stepData: Record<string, unknown> = {};

    switch (currentStepId) {
      case "profile-setup":
        stepData = { profile: profileData };
        break;
      case "preferences":
        stepData = { preferences: preferencesData };
        break;
      case "notification-permission":
        stepData = { notificationSettings };
        break;
      case "join-channels":
        stepData = { selectedChannels };
        break;
      case "invite-team":
        stepData = { invitations: teamInvitations };
        break;
    }

    completeStep(stepData);
  }, [
    currentStepId,
    profileData,
    preferencesData,
    notificationSettings,
    selectedChannels,
    teamInvitations,
    completeStep,
  ]);

  const handleSkip = useCallback(() => {
    skipStep();
  }, [skipStep]);

  const handlePrevious = useCallback(() => {
    previousStep();
  }, [previousStep]);

  const handleStepClick = useCallback(
    (stepId: OnboardingStepId) => {
      goToStep(stepId);
    },
    [goToStep],
  );

  const handleComplete = useCallback(() => {
    completeStep();
    onComplete?.();
  }, [completeStep, onComplete]);

  const handleSkipAll = useCallback(() => {
    skipAllOnboarding();
    onSkip?.();
  }, [skipAllOnboarding, onSkip]);

  const handleStartTour = useCallback(() => {
    startTour();
  }, [startTour]);

  const renderCurrentStep = () => {
    const stepProps = {
      onNext: handleNext,
      onPrev: handlePrevious,
      onSkip: canSkipStep(currentStepId) ? handleSkip : undefined,
      isFirst: isFirstStep,
      isLast: isLastStep,
      canSkip: canSkipStep(currentStepId),
    };

    switch (currentStepId) {
      case "welcome":
        return (
          <WelcomeStep
            {...stepProps}
            appName={appName}
            userName={profileData.displayName}
          />
        );

      case "profile-setup":
        return (
          <ProfileSetupStep
            {...stepProps}
            initialData={profileData}
            onDataChange={updateProfileData}
          />
        );

      case "avatar-upload":
        return (
          <AvatarUploadStep
            {...stepProps}
            userName={profileData.displayName || profileData.fullName}
            onDataChange={(data) => {
              // Store avatar data in profile
              updateProfileData({ ...profileData, ...data } as any);
            }}
          />
        );

      case "preferences":
        return (
          <PreferencesStep
            {...stepProps}
            initialData={preferencesData}
            onDataChange={updatePreferencesData}
          />
        );

      case "notification-permission":
        return (
          <NotificationPermissionStep
            {...stepProps}
            initialSettings={notificationSettings}
            onSettingsChange={updateNotificationSettings}
          />
        );

      case "join-channels":
        return (
          <JoinChannelsStep
            {...stepProps}
            selectedChannelIds={selectedChannels}
            onSelectionChange={setSelectedChannels}
          />
        );

      case "invite-team":
        return (
          <InviteTeamStep
            {...stepProps}
            invitations={teamInvitations}
            onInvitationsChange={(invitations) => {
              invitations.forEach((inv) => {
                useOnboardingStore.getState().addTeamInvitation(inv);
              });
            }}
          />
        );

      case "tour":
        return <TourStep {...stepProps} onStartTour={handleStartTour} />;

      case "completion":
        return (
          <CompletionStep
            onComplete={handleComplete}
            userName={profileData.displayName}
            appName={appName}
            channelsJoined={selectedChannels.length}
            invitationsSent={teamInvitations.length}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div
      className={cn(
        "mx-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 dark:border-zinc-700">
        <div className="flex-1">
          <ProgressIndicator
            currentStepId={currentStepId}
            stepStatuses={stepStatuses}
            onStepClick={handleStepClick}
            variant="dots"
          />
        </div>

        {showCloseButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSkipAll}
            className="ml-4"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Step Content */}
      <div className="min-h-[500px]">{renderCurrentStep()}</div>

      {/* Footer - Skip All Option */}
      {currentStepId !== "welcome" &&
        currentStepId !== "completion" &&
        onboarding?.status === "in_progress" && (
          <div className="border-t border-zinc-200 px-6 py-3 text-center dark:border-zinc-700">
            <button
              type="button"
              onClick={handleSkipAll}
              className="text-sm text-zinc-500 transition-colors hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              Skip setup and start using {appName}
            </button>
          </div>
        )}
    </div>
  );
}
