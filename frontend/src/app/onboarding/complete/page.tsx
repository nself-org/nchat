"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { gql, useMutation } from "@apollo/client";
import { CompletionStep } from "@/components/onboarding";
import { useOnboardingStore } from "@/stores/onboarding-store";
import { useAuth } from "@/contexts/auth-context";

// ============================================================================
// GraphQL
// ============================================================================

const COMPLETE_ONBOARDING = gql`
  mutation CompleteOnboarding($userId: uuid!) {
    update_nchat_user_onboarding(
      where: { user_id: { _eq: $userId } }
      _set: { status: "completed", completed_at: "now()" }
    ) {
      affected_rows
      returning {
        id
        status
        completed_at
      }
    }
  }
`;

// ============================================================================
// Page
// ============================================================================

export default function OnboardingCompletePage() {
  const router = useRouter();
  const { user, loading, isAuthenticated } = useAuth();
  const {
    onboarding,
    profileData,
    selectedChannels,
    teamInvitations,
    initialize,
    completeStep,
  } = useOnboardingStore();

  const [completeOnboarding] = useMutation(COMPLETE_ONBOARDING);

  // Redirect unauthenticated visitors to login before completion page can load.
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace("/login?redirect=/onboarding/complete");
    }
  }, [loading, isAuthenticated, router]);

  useEffect(() => {
    if (!user?.id) return;
    initialize(user.id);
  }, [user?.id, initialize]);

  const handleComplete = async () => {
    // Advance local store state
    completeStep();

    // Persist completion to DB so the onboarding gate knows this user is done
    if (user?.id) {
      await completeOnboarding({ variables: { userId: user.id } }).catch(() => {
        // Non-fatal: local store is the source of truth for routing;
        // DB write will be retried next time the store syncs.
      });
    }

    router.push("/chat");
  };

  // Guard render during auth resolution.
  if (loading || !isAuthenticated || !user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 p-4 dark:from-zinc-900 dark:to-zinc-950">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
        <CompletionStep
          onComplete={handleComplete}
          userName={profileData.displayName}
          appName="nchat"
          channelsJoined={selectedChannels.length}
          invitationsSent={teamInvitations.length}
        />
      </div>
    </div>
  );
}
