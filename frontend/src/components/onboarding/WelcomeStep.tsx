"use client";

import { Sparkles, MessageSquare, Users, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OnboardingStepProps } from "@/lib/onboarding/onboarding-types";

interface WelcomeStepProps extends OnboardingStepProps {
  appName?: string;
  userName?: string;
}

export function WelcomeStep({
  onNext,
  appName = "nchat",
  userName,
}: WelcomeStepProps) {
  const features = [
    {
      icon: MessageSquare,
      title: "Team Messaging",
      description: "Communicate with your team in real-time",
    },
    {
      icon: Users,
      title: "Channels & Groups",
      description: "Organize conversations by topic or team",
    },
    {
      icon: Zap,
      title: "Fast & Reliable",
      description: "Built for speed and always available",
    },
  ];

  return (
    <div className="flex flex-col items-center px-4 py-8 text-center">
      {/* Icon */}
      <div className="from-primary/20 to-primary/10 mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br">
        <Sparkles className="h-10 w-10 text-primary" />
      </div>

      {/* Welcome Text */}
      <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-white">
        Welcome{userName ? `, ${userName}` : ""}!
      </h1>
      <p className="mb-8 max-w-md text-lg text-zinc-600 dark:text-zinc-400">
        {`Let's get you set up with ${appName}. This will only take a few minutes.`}
      </p>

      {/* Feature Highlights */}
      <div className="mb-8 grid w-full max-w-2xl grid-cols-1 gap-4 sm:grid-cols-3">
        {features.map((feature) => (
          <div
            key={feature.title}
            className="flex flex-col items-center rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50"
          >
            <feature.icon className="mb-3 h-8 w-8 text-primary" />
            <h3 className="mb-1 font-semibold text-zinc-900 dark:text-white">
              {feature.title}
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Time Estimate */}
      <p className="mb-6 text-sm text-zinc-500 dark:text-zinc-400">
        Estimated time: 2-3 minutes
      </p>

      {/* CTA Button */}
      <Button size="lg" onClick={onNext} className="min-w-[200px]">
        Get Started
      </Button>
    </div>
  );
}
