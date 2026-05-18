"use client";

import { useState, useEffect } from "react";
import { Type, MessageSquare, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWhiteLabelStore } from "@/stores/white-label-store";

interface Step1AppInfoProps {
  onValidChange?: (isValid: boolean) => void;
  className?: string;
}

export function Step1AppInfo({ onValidChange, className }: Step1AppInfoProps) {
  const { config, updateAppInfo, markStepComplete, markStepIncomplete } =
    useWhiteLabelStore();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!config.appInfo.appName.trim()) {
      newErrors.appName = "App name is required";
    } else if (config.appInfo.appName.trim().length < 2) {
      newErrors.appName = "App name must be at least 2 characters";
    } else if (config.appInfo.appName.length > 50) {
      newErrors.appName = "App name must be 50 characters or less";
    }

    if (config.appInfo.tagline.length > 100) {
      newErrors.tagline = "Tagline must be 100 characters or less";
    }

    if (config.appInfo.description && config.appInfo.description.length > 500) {
      newErrors.description = "Description must be 500 characters or less";
    }

    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;

    if (isValid) {
      markStepComplete("app-info");
    } else {
      markStepIncomplete("app-info");
    }

    onValidChange?.(isValid);
    return isValid;
  };

  useEffect(() => {
    validate();
  }, [config.appInfo]);

  const handleChange = (field: keyof typeof config.appInfo, value: string) => {
    updateAppInfo({ [field]: value });
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-sky-600 shadow-lg">
          <Type className="h-6 w-6 text-white" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          App Information
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Give your app a name and tagline that will appear across your
          platform.
        </p>
      </div>

      {/* Form */}
      <div className="mx-auto max-w-md space-y-5">
        {/* App Name */}
        <div>
          <label
            htmlFor="appName"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            App Name <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <Type className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <input
              id="appName"
              type="text"
              value={config.appInfo.appName}
              onChange={(e) => handleChange("appName", e.target.value)}
              placeholder="My App"
              className={cn(
                "w-full rounded-lg border bg-white py-2.5 pl-10 pr-4 text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-zinc-800 dark:text-zinc-100",
                errors.appName
                  ? "border-red-500"
                  : "border-zinc-200 dark:border-zinc-700",
              )}
            />
          </div>
          {errors.appName && (
            <p className="mt-1 text-sm text-red-500">{errors.appName}</p>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            {config.appInfo.appName.length}/50 characters
          </p>
        </div>

        {/* Tagline */}
        <div>
          <label
            htmlFor="tagline"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Tagline
          </label>
          <div className="relative">
            <MessageSquare className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <input
              id="tagline"
              type="text"
              value={config.appInfo.tagline}
              onChange={(e) => handleChange("tagline", e.target.value)}
              placeholder="Your catchy tagline here"
              className={cn(
                "w-full rounded-lg border bg-white py-2.5 pl-10 pr-4 text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-zinc-800 dark:text-zinc-100",
                errors.tagline
                  ? "border-red-500"
                  : "border-zinc-200 dark:border-zinc-700",
              )}
            />
          </div>
          {errors.tagline && (
            <p className="mt-1 text-sm text-red-500">{errors.tagline}</p>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            {config.appInfo.tagline.length}/100 characters
          </p>
        </div>

        {/* Description (optional) */}
        <div>
          <label
            htmlFor="description"
            className="mb-2 block text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Description <span className="text-zinc-400">(optional)</span>
          </label>
          <div className="relative">
            <Info className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <textarea
              id="description"
              value={config.appInfo.description || ""}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="A brief description of your app..."
              rows={3}
              className={cn(
                "w-full resize-none rounded-lg border bg-white py-2.5 pl-10 pr-4 text-zinc-900 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-zinc-800 dark:text-zinc-100",
                errors.description
                  ? "border-red-500"
                  : "border-zinc-200 dark:border-zinc-700",
              )}
            />
          </div>
          {errors.description && (
            <p className="mt-1 text-sm text-red-500">{errors.description}</p>
          )}
          <p className="mt-1 text-xs text-zinc-500">
            {(config.appInfo.description || "").length}/500 characters
          </p>
        </div>
      </div>

      {/* Preview */}
      <div className="mx-auto mt-8 max-w-md">
        <div className="dark:to-sky-900/30 rounded-xl border border-sky-200 bg-gradient-to-br from-sky-50 to-sky-100 p-5 dark:border-sky-800 dark:from-sky-950/30">
          <h3 className="mb-3 text-sm font-medium text-sky-900 dark:text-sky-100">
            Preview
          </h3>
          <div className="rounded-lg bg-white p-4 shadow-sm dark:bg-zinc-800">
            <h4 className="text-xl font-bold text-zinc-900 dark:text-white">
              {config.appInfo.appName || "Your App Name"}
            </h4>
            {config.appInfo.tagline && (
              <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                {config.appInfo.tagline}
              </p>
            )}
            {config.appInfo.description && (
              <p className="mt-3 line-clamp-2 text-xs text-zinc-500">
                {config.appInfo.description}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
