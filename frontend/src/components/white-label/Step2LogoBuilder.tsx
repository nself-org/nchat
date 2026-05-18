"use client";

import { useState, useCallback } from "react";
import { Image as ImageIcon, Upload, Sparkles, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWhiteLabelStore } from "@/stores/white-label-store";
import { LogoUploader } from "./LogoUploader";
import { LogoEditor } from "./LogoEditor";
import { LogoPresets } from "./LogoPresets";
import {
  createLogoVariants,
  type ProcessedLogo,
} from "@/lib/white-label/logo-processor";

import { logger } from "@/lib/logger";

interface Step2LogoBuilderProps {
  onValidChange?: (isValid: boolean) => void;
  className?: string;
}

type Tab = "upload" | "generate" | "edit";

export function Step2LogoBuilder({
  onValidChange,
  className,
}: Step2LogoBuilderProps) {
  const { config, updateLogo, setPreviewLogo, markStepComplete } =
    useWhiteLabelStore();
  const [activeTab, setActiveTab] = useState<Tab>("upload");
  const [tempLogo, setTempLogo] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleLogoUpload = useCallback(
    async (dataUrl: string | null) => {
      if (!dataUrl) {
        updateLogo({ original: undefined, light: undefined, dark: undefined });
        setPreviewLogo(null);
        return;
      }

      setIsProcessing(true);
      try {
        const variants = await createLogoVariants(dataUrl);
        updateLogo({
          original: variants.original.dataUrl,
          light: variants.light.dataUrl,
          dark: variants.dark.dataUrl,
          width: variants.original.width,
          height: variants.original.height,
          format: variants.original.format as "png" | "svg" | "jpg" | "webp",
        });
        setPreviewLogo(variants.original.dataUrl);
        markStepComplete("logo");
        onValidChange?.(true);
      } catch (error) {
        logger.error("Failed to process logo:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [updateLogo, setPreviewLogo, markStepComplete, onValidChange],
  );

  const handlePresetSelect = useCallback(
    async (_preset: unknown, dataUrl: string) => {
      setIsProcessing(true);
      try {
        const variants = await createLogoVariants(dataUrl);
        updateLogo({
          original: variants.original.dataUrl,
          light: variants.light.dataUrl,
          dark: variants.dark.dataUrl,
          width: variants.original.width,
          height: variants.original.height,
          format: "png",
        });
        setPreviewLogo(variants.original.dataUrl);
        markStepComplete("logo");
        onValidChange?.(true);
      } catch (error) {
        logger.error("Failed to process preset logo:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [updateLogo, setPreviewLogo, markStepComplete, onValidChange],
  );

  const handleEditClick = useCallback(() => {
    if (config.logo.original) {
      setTempLogo(config.logo.original);
      setActiveTab("edit");
    }
  }, [config.logo.original]);

  const handleEditSave = useCallback(
    async (result: ProcessedLogo) => {
      setIsProcessing(true);
      try {
        const variants = await createLogoVariants(result.dataUrl);
        updateLogo({
          original: variants.original.dataUrl,
          light: variants.light.dataUrl,
          dark: variants.dark.dataUrl,
          width: variants.original.width,
          height: variants.original.height,
          format: "png",
        });
        setPreviewLogo(variants.original.dataUrl);
        setTempLogo(null);
        setActiveTab("upload");
      } catch (error) {
        logger.error("Failed to save edited logo:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [updateLogo, setPreviewLogo],
  );

  const handleEditCancel = useCallback(() => {
    setTempLogo(null);
    setActiveTab("upload");
  }, []);

  const tabs = [
    { id: "upload" as const, label: "Upload", icon: Upload },
    { id: "generate" as const, label: "Generate", icon: Sparkles },
  ];

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 shadow-lg">
          <ImageIcon className="h-6 w-6 text-white" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Logo Builder
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Upload your logo or generate one from a template. We'll create light
          and dark variants automatically.
        </p>
      </div>

      {/* Tab content */}
      <div className="mx-auto max-w-lg">
        {activeTab === "edit" && tempLogo ? (
          <LogoEditor
            src={tempLogo}
            onSave={handleEditSave}
            onCancel={handleEditCancel}
          />
        ) : (
          <>
            {/* Tab buttons */}
            <div className="mb-6 flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "dark:bg-sky-900/30 bg-sky-100 text-sky-700 dark:text-sky-300"
                      : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:bg-zinc-700",
                  )}
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Upload tab */}
            {activeTab === "upload" && (
              <div className="space-y-4">
                {config.logo.original ? (
                  <div className="space-y-4">
                    {/* Current logo preview */}
                    <div className="relative rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-700 dark:bg-zinc-800">
                      <img
                        src={config.logo.original}
                        alt="Current logo"
                        className="mx-auto max-h-32 object-contain"
                      />
                      <div className="absolute right-2 top-2 flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={handleEditClick}
                          className="h-8 w-8"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Logo variants */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-700">
                        <p className="mb-2 text-center text-xs text-zinc-500">
                          Light Mode
                        </p>
                        {config.logo.light && (
                          <img
                            src={config.logo.light}
                            alt="Light variant"
                            className="mx-auto max-h-16 object-contain"
                          />
                        )}
                      </div>
                      <div className="rounded-xl border border-zinc-200 bg-zinc-900 p-4 dark:border-zinc-700">
                        <p className="mb-2 text-center text-xs text-zinc-400">
                          Dark Mode
                        </p>
                        {config.logo.dark && (
                          <img
                            src={config.logo.dark}
                            alt="Dark variant"
                            className="mx-auto max-h-16 object-contain"
                          />
                        )}
                      </div>
                    </div>

                    {/* Replace button */}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => handleLogoUpload(null)}
                      className="w-full"
                    >
                      Replace Logo
                    </Button>
                  </div>
                ) : (
                  <LogoUploader
                    value={undefined}
                    onChange={handleLogoUpload}
                    placeholder="Drop your logo here or click to upload"
                    showPreview={false}
                  />
                )}

                {isProcessing && (
                  <div className="py-4 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                      Processing logo variants...
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generate tab */}
            {activeTab === "generate" && (
              <div className="space-y-4">
                <LogoPresets
                  appName={config.appInfo.appName}
                  onSelect={handlePresetSelect}
                />

                {isProcessing && (
                  <div className="py-4 text-center">
                    <div className="inline-flex items-center gap-2 text-sm text-zinc-500">
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
                      Generating logo...
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Tips */}
      <div className="mx-auto max-w-lg">
        <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
          <h4 className="mb-2 text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Tips for best results
          </h4>
          <ul className="list-inside list-disc space-y-1 text-xs text-zinc-500">
            <li>Use a PNG or SVG file with transparent background</li>
            <li>Minimum recommended size: 512x512 pixels</li>
            <li>Simple, recognizable shapes work best</li>
            <li>We'll generate light and dark variants automatically</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
