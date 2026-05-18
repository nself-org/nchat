"use client";

import { useEffect } from "react";
import { type AppConfig } from "@/config/app-config";
import { Card, CardContent } from "@/components/ui/card";
import {
  MessageSquare,
  Users,
  Shield,
  Palette,
  Settings,
  Zap,
} from "lucide-react";

interface WelcomeStepProps {
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  onValidate: (isValid: boolean) => void;
}

export function WelcomeStep({
  config,
  onUpdate,
  onValidate,
}: WelcomeStepProps) {
  useEffect(() => {
    onValidate(true); // Welcome step is always valid
  }, [onValidate]);

  const features = [
    {
      icon: MessageSquare,
      title: "Team Communication",
      description: "Real-time messaging with channels and direct messages",
    },
    {
      icon: Users,
      title: "User Management",
      description: "Flexible authentication and permission systems",
    },
    {
      icon: Shield,
      title: "Security First",
      description: "Enterprise-grade security with role-based access",
    },
    {
      icon: Palette,
      title: "Full Customization",
      description: "Brand your platform with custom themes and styling",
    },
    {
      icon: Settings,
      title: "Easy Configuration",
      description: "No-code setup for all features and integrations",
    },
    {
      icon: Zap,
      title: "Multiple Deployments",
      description: "Corporate, community, SaaS, or white-label ready",
    },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-10 text-center">
        <h1 className="mb-4 text-3xl font-bold text-zinc-900 dark:text-white">
          Welcome to nChat Setup
        </h1>
        <p className="mx-auto max-w-2xl text-lg leading-relaxed text-zinc-600 dark:text-zinc-400">
          Transform nChat into your perfect communication platform. Whether
          you're building an internal corporate tool, a community forum, or a
          customer-facing SaaS platform, we'll help you configure everything in
          just a few minutes.
        </p>
      </div>

      <div className="mb-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {features.map((feature, index) => (
          <div
            key={index}
            className="group relative rounded-xl border border-zinc-900/10 bg-white p-5 ring-1 ring-zinc-900/5 transition-all hover:border-[#00D4FF]/30 hover:shadow-lg hover:shadow-zinc-900/5 dark:border-white/10 dark:bg-zinc-900 dark:ring-white/5 dark:hover:border-[#00D4FF]/40 dark:hover:shadow-none"
          >
            <feature.icon className="mb-3 h-7 w-7 text-[#00D4FF] transition-transform group-hover:scale-110 dark:text-[#00D4FF]" />
            <h3 className="mb-2 text-sm font-semibold text-zinc-900 dark:text-white">
              {feature.title}
            </h3>
            <p className="text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 ring-1 ring-zinc-900/5 dark:border-zinc-700 dark:bg-zinc-800/50 dark:ring-white/5">
        <div className="flex items-start gap-4">
          <div className="shadow-glow flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#00D4FF] ring-1 ring-zinc-900/5">
            <Settings className="h-5 w-5 text-zinc-900" />
          </div>
          <div className="flex-1">
            <h3 className="mb-3 font-semibold text-zinc-900 dark:text-white">
              What we'll configure together:
            </h3>
            <div className="grid gap-3 text-sm text-zinc-700 dark:text-zinc-300 md:grid-cols-2">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9] dark:bg-[#00D4FF]"></div>
                App branding and identity
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9] dark:bg-[#00D4FF]"></div>
                Authentication methods
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9] dark:bg-[#00D4FF]"></div>
                Landing page themes
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9] dark:bg-[#00D4FF]"></div>
                Access permissions
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9] dark:bg-[#00D4FF]"></div>
                Visual customization
              </div>
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-[#0EA5E9] dark:bg-[#00D4FF]"></div>
                Features & integrations
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Ready to get started? Click "Next" to begin configuring your platform.
        </p>
      </div>
    </div>
  );
}
