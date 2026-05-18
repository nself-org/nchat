"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { InstalledApps } from "@/components/app-directory";

export default function InstalledAppsPage() {
  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/apps"
          className="mb-4 flex w-fit items-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to App Directory
        </Link>

        <h1 className="text-3xl font-bold tracking-tight">Installed Apps</h1>
        <p className="mt-2 text-muted-foreground">
          Manage the apps installed in your workspace
        </p>
      </div>

      {/* Installed Apps List */}
      <InstalledApps />
    </div>
  );
}
