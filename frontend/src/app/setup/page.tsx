"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppConfig } from "@/contexts/app-config-context";
import { setupSteps } from "@/config/app-config";
import { SetupWizard } from "@/components/setup/setup-wizard";
import { ThemeToggle } from "@/components/theme-toggle";

export default function SetupPage() {
  const { config } = useAppConfig();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // If setup is already completed, redirect to home
    if (config.setup.isCompleted) {
      router.push("/");
      return;
    }

    // Redirect to step 1
    const currentStep = config.setup.currentStep || 0;
    router.push(`/setup/${currentStep + 1}`);
  }, [config, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950">
      <div className="text-center">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-b-2 border-sky-600"></div>
        <p className="text-zinc-600 dark:text-zinc-400">
          Redirecting to setup...
        </p>
      </div>
    </div>
  );
}
