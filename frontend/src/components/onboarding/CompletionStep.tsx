'use client'

import { CheckCircle, Sparkles, MessageSquare, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { isFullBundleInstalled, missingPlugins } from '@/lib/features'
import confetti from 'canvas-confetti'
import { useEffect } from 'react'

interface CompletionStepProps {
  onComplete: () => void
  userName?: string
  appName?: string
  channelsJoined?: number
  invitationsSent?: number
}

export function CompletionStep({
  onComplete,
  userName,
  appName = 'nchat',
  channelsJoined = 0,
  invitationsSent = 0,
}: CompletionStepProps) {
  // Fire confetti on mount
  useEffect(() => {
    const duration = 2000
    const animationEnd = Date.now() + duration

    const randomInRange = (min: number, max: number) => {
      return Math.random() * (max - min) + min
    }

    const interval = setInterval(() => {
      const timeLeft = animationEnd - Date.now()

      if (timeLeft <= 0) {
        clearInterval(interval)
        return
      }

      const particleCount = 50 * (timeLeft / duration)

      // Fire confetti from both sides
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.1, 0.3),
          y: Math.random() - 0.2,
        },
        colors: ['#38BDF8', '#0EA5E9', '#0284C7', '#7C3AED', '#EC4899'],
      })
      confetti({
        particleCount,
        startVelocity: 30,
        spread: 360,
        origin: {
          x: randomInRange(0.7, 0.9),
          y: Math.random() - 0.2,
        },
        colors: ['#38BDF8', '#0EA5E9', '#0284C7', '#7C3AED', '#EC4899'],
      })
    }, 250)

    return () => clearInterval(interval)
  }, [])

  const achievements = [
    channelsJoined > 0 && {
      icon: '📢',
      text: `Joined ${channelsJoined} channel${channelsJoined !== 1 ? 's' : ''}`,
    },
    invitationsSent > 0 && {
      icon: '✉️',
      text: `Invited ${invitationsSent} teammate${invitationsSent !== 1 ? 's' : ''}`,
    },
    { icon: '✅', text: 'Profile set up' },
    { icon: '🔔', text: 'Notifications configured' },
  ].filter(Boolean) as { icon: string; text: string }[]

  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      {/* Success Icon */}
      <div className="relative mb-6">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-400 to-green-600">
          <CheckCircle className="h-12 w-12 text-white" />
        </div>
        <div className="absolute -right-2 -top-2 flex h-8 w-8 animate-bounce items-center justify-center rounded-full bg-yellow-400">
          <Sparkles className="h-4 w-4 text-yellow-900" />
        </div>
      </div>

      {/* Congratulations */}
      <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-white">
        You're All Set{userName ? `, ${userName}` : ''}!
      </h1>
      <p className="mb-8 max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        Welcome to {appName}. Your team communication hub is ready to go.
      </p>

      {/* Achievements */}
      {achievements.length > 0 && (
        <div className="mb-8 w-full max-w-sm">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
            What you've done
          </h3>
          <div className="space-y-2">
            {achievements.map((achievement, index) => (
              <div
                key={index}
                className="flex items-center gap-3 rounded-lg bg-zinc-50 p-3 dark:bg-zinc-800/50"
              >
                <span className="text-xl">{achievement.icon}</span>
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{achievement.text}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Tips */}
      <div className="mb-8 w-full max-w-sm">
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
          Quick tips to get started
        </h3>
        <div className="space-y-2 text-left">
          <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <MessageSquare className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                Say hello in #general
              </p>
              <p className="text-xs text-zinc-500">Introduce yourself to the team</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <span className="flex-shrink-0 text-lg">⌨️</span>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                Press ? for shortcuts
              </p>
              <p className="text-xs text-zinc-500">Learn keyboard shortcuts to work faster</p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
            <span className="flex-shrink-0 text-lg">🔍</span>
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-white">
                Use Cmd/Ctrl+K to search
              </p>
              <p className="text-xs text-zinc-500">Find channels, people, and messages instantly</p>
            </div>
          </div>
        </div>
      </div>

      {/* Bundle Upsell */}
      {!isFullBundleInstalled() && (
        <div className="mb-6 w-full max-w-sm rounded-xl border border-indigo-200 bg-indigo-50 p-4 text-left dark:border-indigo-800 dark:bg-indigo-950/30">
          <p className="font-semibold text-indigo-900 dark:text-indigo-200">
            Activate the nChat bundle for full feature access
          </p>
          <p className="mt-1 text-sm text-indigo-700 dark:text-indigo-300">
            Voice calls, recording, moderation, and bots require the nChat bundle — $0.99/mo.
            {missingPlugins().length > 0 && (
              <span className="mt-1 block text-xs text-indigo-600 dark:text-indigo-400">
                Not yet installed: {missingPlugins().join(', ')}
              </span>
            )}
          </p>
          <a
            href="https://nself.org/pricing"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            View pricing at nself.org
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      )}

      {/* CTA */}
      <Button size="lg" onClick={onComplete} className="min-w-[200px]">
        Go to {appName}
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>

      <p className="mt-4 text-xs text-zinc-500">
        You can always access settings to customize your experience
      </p>
    </div>
  )
}
