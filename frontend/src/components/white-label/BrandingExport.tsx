"use client";

import { useState, useCallback } from "react";
import {
  Download,
  Copy,
  Check,
  FileJson,
  FileCode,
  Palette,
  Package,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BrandingConfig } from "@/lib/white-label/branding-schema";
import type { GeneratedFavicon } from "@/lib/white-label/favicon-generator";
import { logger } from "@/lib/logger";
import {
  exportAsJSON,
  exportAsCSS,
  exportAsTailwindConfig,
  exportAsSCSS,
  exportAsZip,
  downloadFile,
  copyToClipboard,
} from "@/lib/white-label/branding-export";

interface BrandingExportProps {
  config: BrandingConfig;
  favicons?: GeneratedFavicon[];
  className?: string;
}

type ExportFormat = "json" | "css" | "tailwind" | "scss" | "zip";

interface ExportOption {
  id: ExportFormat;
  label: string;
  description: string;
  icon: React.ElementType;
  extension: string;
}

const EXPORT_OPTIONS: ExportOption[] = [
  {
    id: "json",
    label: "JSON Configuration",
    description: "Complete branding config for import",
    icon: FileJson,
    extension: "json",
  },
  {
    id: "css",
    label: "CSS Variables",
    description: "CSS custom properties",
    icon: FileCode,
    extension: "css",
  },
  {
    id: "tailwind",
    label: "Tailwind Config",
    description: "Tailwind CSS theme configuration",
    icon: Palette,
    extension: "js",
  },
  {
    id: "scss",
    label: "SCSS Variables",
    description: "SCSS/Sass variables file",
    icon: FileCode,
    extension: "scss",
  },
  {
    id: "zip",
    label: "Complete Package",
    description: "All assets and configurations",
    icon: Package,
    extension: "zip",
  },
];

export function BrandingExport({
  config,
  favicons = [],
  className,
}: BrandingExportProps) {
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("json");
  const [isExporting, setIsExporting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [previewContent, setPreviewContent] = useState<string>("");

  // Generate preview content when format changes
  const generatePreview = useCallback(
    (format: ExportFormat): string => {
      switch (format) {
        case "json":
          return exportAsJSON(config);
        case "css":
          return exportAsCSS(config);
        case "tailwind":
          return exportAsTailwindConfig(config);
        case "scss":
          return exportAsSCSS(config);
        case "zip":
          return "// ZIP package includes:\n// - branding.json\n// - css/variables.css\n// - scss/_variables.scss\n// - tailwind.config.js\n// - favicons/\n// - logo/\n// - emails/";
        default:
          return "";
      }
    },
    [config],
  );

  const handleFormatChange = useCallback(
    (format: ExportFormat) => {
      setSelectedFormat(format);
      setPreviewContent(generatePreview(format));
    },
    [generatePreview],
  );

  const handleDownload = useCallback(async () => {
    setIsExporting(true);
    try {
      const filename = `${config.appInfo.appName.toLowerCase().replace(/\s+/g, "-")}-branding`;

      switch (selectedFormat) {
        case "json":
          downloadFile(exportAsJSON(config), `${filename}.json`);
          break;
        case "css":
          downloadFile(exportAsCSS(config), `${filename}.css`);
          break;
        case "tailwind":
          downloadFile(exportAsTailwindConfig(config), `tailwind.config.js`);
          break;
        case "scss":
          downloadFile(exportAsSCSS(config), `_${filename}.scss`);
          break;
        case "zip":
          const blob = await exportAsZip(
            config,
            favicons.map((f) => ({
              name: f.name,
              blob: f.blob!,
            })),
          );
          downloadFile(blob, `${filename}.zip`);
          break;
      }
    } catch (error) {
      logger.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  }, [config, selectedFormat, favicons]);

  const handleCopy = useCallback(async () => {
    if (selectedFormat === "zip") return;

    const content = generatePreview(selectedFormat);
    await copyToClipboard(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [selectedFormat, generatePreview]);

  // Initialize preview
  useState(() => {
    setPreviewContent(generatePreview("json"));
  });

  const selectedOption = EXPORT_OPTIONS.find((o) => o.id === selectedFormat)!;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Format selection */}
      <div className="space-y-3">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Export Format
        </span>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {EXPORT_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => handleFormatChange(option.id)}
              className={cn(
                "flex flex-col items-start rounded-xl border-2 p-3 text-left transition-all",
                selectedFormat === option.id
                  ? "dark:bg-sky-900/20 border-sky-500 bg-sky-50"
                  : "border-zinc-200 hover:border-zinc-300 dark:border-zinc-700 dark:hover:border-zinc-600",
              )}
            >
              <option.icon
                className={cn(
                  "mb-2 h-5 w-5",
                  selectedFormat === option.id
                    ? "text-sky-600 dark:text-sky-400"
                    : "text-zinc-400",
                )}
              />
              <span className="text-sm font-medium text-zinc-900 dark:text-white">
                {option.label}
              </span>
              <span className="mt-0.5 text-xs text-zinc-500">
                {option.description}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Preview */}
      {selectedFormat !== "zip" && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
              Preview
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleCopy}
              className="h-7 text-xs"
            >
              {copied ? (
                <>
                  <Check className="mr-1 h-3 w-3 text-green-500" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="mr-1 h-3 w-3" />
                  Copy
                </>
              )}
            </Button>
          </div>
          <div className="relative">
            <pre className="max-h-64 overflow-x-auto overflow-y-auto rounded-xl bg-zinc-900 p-4 font-mono text-xs text-zinc-100">
              <code>{previewContent || generatePreview(selectedFormat)}</code>
            </pre>
            <div className="absolute right-2 top-2">
              <span className="rounded bg-zinc-700 px-2 py-0.5 font-mono text-[10px] text-zinc-300">
                .{selectedOption.extension}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ZIP contents preview */}
      {selectedFormat === "zip" && (
        <div className="space-y-2">
          <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Package Contents
          </span>
          <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800">
            <ul className="space-y-2 text-sm">
              {[
                {
                  name: "branding.json",
                  desc: "Complete branding configuration",
                },
                { name: "css/variables.css", desc: "CSS custom properties" },
                { name: "css/typography.css", desc: "Typography styles" },
                { name: "scss/_variables.scss", desc: "SCSS variables" },
                { name: "tailwind.config.js", desc: "Tailwind theme" },
                {
                  name: "favicons/",
                  desc: `${favicons.length} favicon sizes + manifests`,
                },
                {
                  name: "logo/",
                  desc: "Logo variants (original, light, dark)",
                },
                { name: "emails/", desc: "5 email templates" },
                { name: "README.md", desc: "Usage documentation" },
              ].map((file) => (
                <li key={file.name} className="flex items-start gap-2">
                  <span className="flex-shrink-0 font-mono text-xs text-sky-600 dark:text-sky-400">
                    {file.name}
                  </span>
                  <span className="text-xs text-zinc-500">{file.desc}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Download button */}
      <Button
        type="button"
        onClick={handleDownload}
        disabled={isExporting}
        className="w-full"
      >
        {isExporting ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Download className="mr-2 h-4 w-4" />
        )}
        {isExporting ? "Preparing..." : `Download ${selectedOption.label}`}
      </Button>

      {/* File info */}
      <p className="text-center text-xs text-zinc-500">
        Downloads as{" "}
        <span className="font-mono">.{selectedOption.extension}</span> file
        {selectedFormat === "zip" && favicons.length > 0 && (
          <> with {favicons.length} favicon sizes</>
        )}
      </p>
    </div>
  );
}
