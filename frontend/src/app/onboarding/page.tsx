'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { OnboardingWizard } from '@/components/onboarding'
import { TourOverlay } from '@/components/onboarding'
import { useOnboardingStore } from '@/stores/onboarding-store'
import { useAuth } from '@/contexts/auth-context'

export default function OnboardingPage() {
  const router = useRouter()
  const { user, loading, isAuthenticated } = useAuth()
  const { onboarding, tourActive, initialize, startOnboarding } = useOnboardingStore()

  // Redirect unauthenticated visitors to login before onboarding can begin.
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/login?redirect=/onboarding')
    }
  }, [loading, isAuthenticated, router])

  // Initialize onboarding for the authenticated user.
  useEffect(() => {
    if (!user?.id) return
    initialize(user.id)

    if (!onboarding || onboarding.status === 'not_started') {
      startOnboarding()
    }
  }, [user?.id, onboarding?.status, initialize, startOnboarding])

  const handleComplete = () => {
    router.push('/chat')
  }

  const handleSkip = () => {
    router.push('/chat')
  }

  // If onboarding is already completed, redirect
  useEffect(() => {
    if (onboarding?.status === 'completed' || onboarding?.status === 'skipped') {
      router.push('/chat')
    }
  }, [onboarding?.status, router])

  // Guard render during auth resolution to avoid flashing the wizard to
  // unauthenticated visitors mid-redirect.
  if (loading || !isAuthenticated || !user?.id) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-sm text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 p-4 dark:from-zinc-900 dark:to-zinc-950">
      <OnboardingWizard
        appName="nchat"
        onComplete={handleComplete}
        onSkip={handleSkip}
        showCloseButton={true}
      />

      {/* Tour Overlay */}
      <TourOverlay isActive={tourActive} onComplete={handleComplete} onDismiss={handleComplete} />
    </div>
  )
}
