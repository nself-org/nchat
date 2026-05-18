"use client";

import { useState, useEffect } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  Download,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import {
  generateFavicons,
  downloadFaviconsAsZip,
  FAVICON_SIZES,
  type GeneratedFavicon,
} from "@/lib/white-label/favicon-generator";

interface FaviconPreviewProps {
  source?: string;
  appName?: string;
  themeColor?: string;
  backgroundColor?: string;
  onFaviconsGenerated?: (favicons: GeneratedFavicon[]) => void;
  className?: string;
}

type PreviewDevice = "browser" | "mobile" | "tablet";

export function FaviconPreview({
  source,
  appName = "My App",
  themeColor = "#3B82F6",
  backgroundColor = "#FFFFFF",
  onFaviconsGenerated,
  className,
}: FaviconPreviewProps) {
  const [favicons, setFavicons] = useState<GeneratedFavicon[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [activeDevice, setActiveDevice] = useState<PreviewDevice>("browser");
  const [error, setError] = useState<string | null>(null);

  // Generate favicons when source changes
  useEffect(() => {
    if (!source) {
      setFavicons([]);
      return;
    }

    const generate = async () => {
      setIsGenerating(true);
      setError(null);
      try {
        const generated = await generateFavicons(source, {
          padding: 10,
          borderRadius: 20,
        });
        setFavicons(generated);
        onFaviconsGenerated?.(generated);
      } catch (err) {
        setError("Failed to generate favicons");
        logger.error("Failed to generate favicons", { error: err });
      } finally {
        setIsGenerating(false);
      }
    };

    generate();
  }, [source, onFaviconsGenerated]);

  const handleDownload = async () => {
    if (favicons.length === 0) return;

    setIsDownloading(true);
    try {
      await downloadFaviconsAsZip(
        favicons,
        appName,
        themeColor,
        backgroundColor,
      );
    } catch (err) {
      logger.error("Failed to download favicons:", err as Error);
    } finally {
      setIsDownloading(false);
    }
  };

  const getFavicon = (size: number): string | undefined => {
    return favicons.find((f) => f.size === size)?.dataUrl;
  };

  const devices = [
    { id: "browser" as const, label: "Browser", icon: Globe },
    { id: "mobile" as const, label: "Mobile", icon: Smartphone },
    { id: "tablet" as const, label: "Tablet", icon: Tablet },
  ];

  if (!source) {
    return (
      <div
        className={cn(
          "rounded-xl border border-zinc-200 p-8 text-center dark:border-zinc-700",
          className,
        )}
      >
        <Monitor className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-600" />
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Upload a logo to generate favicon previews
        </p>
      </div>
    );
  }

  if (isGenerating) {
    return (
      <div
        className={cn(
          "rounded-xl border border-zinc-200 p-8 text-center dark:border-zinc-700",
          className,
        )}
      >
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-sky-500" />
        <p className="mt-3 text-sm text-zinc-500 dark:text-zinc-400">
          Generating favicons...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className={cn(
          "rounded-xl border border-red-200 bg-red-50 p-8 text-center dark:border-red-800 dark:bg-red-900/20",
          className,
        )}
      >
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {/* Device tabs */}
      <div className="flex gap-2">
        {devices.map((device) => (
          <button
            key={device.id}
            onClick={() => setActiveDevice(device.id)}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors",
              activeDevice === device.id
                ? "dark:bg-sky-900/30 bg-sky-100 text-sky-700 dark:text-sky-300"
                : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800",
            )}
          >
            <device.icon className="h-4 w-4" />
            {device.label}
          </button>
        ))}
      </div>

      {/* Preview area */}
      <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-700 dark:bg-zinc-800">
        {activeDevice === "browser" && (
          <div className="space-y-4">
            {/* Browser tab mockup */}
            <div className="overflow-hidden rounded-lg bg-white shadow-lg dark:bg-zinc-900">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 bg-zinc-100 px-3 py-2 dark:bg-zinc-800">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-400" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400" />
                  <div className="h-3 w-3 rounded-full bg-green-400" />
                </div>
                {/* Tab */}
                <div className="ml-2 flex items-center gap-2 rounded-t-lg bg-white px-3 py-1 dark:bg-zinc-900">
                  {getFavicon(16) && (
                    <img
                      src={getFavicon(16)}
                      alt="Favicon"
                      className="h-4 w-4"
                    />
                  )}
                  <span className="max-w-[100px] truncate text-xs text-zinc-700 dark:text-zinc-300">
                    {appName}
                  </span>
                </div>
              </div>
              {/* Address bar */}
              <div className="border-t border-zinc-200 bg-zinc-50 px-3 py-1.5 dark:border-zinc-700 dark:bg-zinc-800">
                <div className="rounded bg-white px-2 py-0.5 text-xs text-zinc-500 dark:bg-zinc-900">
                  https://example.com
                </div>
              </div>
              {/* Content area */}
              <div className="h-24 bg-white dark:bg-zinc-900" />
            </div>

            {/* Bookmark bar mockup */}
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Bookmarks bar:</span>
              <div className="flex items-center gap-1.5 rounded bg-white px-2 py-1 shadow-sm dark:bg-zinc-900">
                {getFavicon(16) && (
                  <img src={getFavicon(16)} alt="Favicon" className="h-4 w-4" />
                )}
                <span className="text-zinc-700 dark:text-zinc-300">
                  {appName}
                </span>
              </div>
            </div>
          </div>
        )}

        {activeDevice === "mobile" && (
          <div className="flex justify-center">
            {/* iPhone mockup */}
            <div className="w-[200px] rounded-[2rem] bg-black p-2 shadow-xl">
              <div className="overflow-hidden rounded-[1.5rem] bg-white dark:bg-zinc-900">
                {/* Status bar */}
                <div className="flex items-center justify-between bg-zinc-100 px-4 py-2 dark:bg-zinc-800">
                  <span className="text-[10px] text-zinc-600 dark:text-zinc-400">
                    9:41
                  </span>
                  <div className="flex gap-1">
                    <div className="h-2 w-4 rounded-sm bg-zinc-400" />
                  </div>
                </div>
                {/* Home screen with icon */}
                <div className="flex h-48 items-center justify-center p-6">
                  <div className="text-center">
                    {getFavicon(180) && (
                      <img
                        src={getFavicon(180)}
                        alt="App icon"
                        className="mx-auto h-16 w-16 rounded-2xl shadow-lg"
                      />
                    )}
                    <span className="mt-2 block truncate text-xs text-zinc-700 dark:text-zinc-300">
                      {appName}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeDevice === "tablet" && (
          <div className="flex justify-center">
            {/* iPad mockup */}
            <div className="w-[300px] rounded-xl bg-black p-2 shadow-xl">
              <div className="overflow-hidden rounded-lg bg-white dark:bg-zinc-900">
                {/* PWA splash simulation */}
                <div
                  className="flex h-48 items-center justify-center"
                  style={{ backgroundColor: backgroundColor }}
                >
                  {getFavicon(512) && (
                    <img
                      src={getFavicon(512)}
                      alt="PWA icon"
                      className="h-24 w-24"
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Generated sizes */}
      <div className="space-y-2">
        <div className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Generated Sizes
        </div>
        <div className="flex flex-wrap gap-2">
          {FAVICON_SIZES.slice(0, 6).map((sizeInfo) => {
            const favicon = getFavicon(sizeInfo.size);
            return (
              <div
                key={sizeInfo.size}
                className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-2 py-1 dark:border-zinc-700 dark:bg-zinc-800"
                title={sizeInfo.purpose}
              >
                {favicon && (
                  <img src={favicon} alt={sizeInfo.name} className="h-4 w-4" />
                )}
                <span className="text-xs text-zinc-500">{sizeInfo.size}px</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Download button */}
      <Button
        onClick={handleDownload}
        disabled={favicons.length === 0 || isDownloading}
        className="w-full"
      >
        {isDownloading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {isDownloading
          ? "Preparing download..."
          : "Download All Favicons (ZIP)"}
      </Button>
    </div>
  );
}
