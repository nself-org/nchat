"use client";

import { useState, useCallback, useRef } from "react";
import { Upload, FileJson, AlertCircle, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { BrandingConfig } from "@/lib/white-label/branding-schema";
import { importFromJSON } from "@/lib/white-label/branding-export";
import { validateBrandingConfig } from "@/lib/white-label/branding-schema";

interface BrandingImportProps {
  onImport: (config: BrandingConfig) => void;
  onCancel?: () => void;
  className?: string;
}

export function BrandingImport({
  onImport,
  onCancel,
  className,
}: BrandingImportProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewConfig, setPreviewConfig] = useState<BrandingConfig | null>(
    null,
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const processFile = useCallback(async (file: File) => {
    setIsProcessing(true);
    setError(null);
    setValidationErrors([]);

    try {
      // Check file type
      if (!file.name.endsWith(".json")) {
        throw new Error("Please upload a JSON file");
      }

      // Read file
      const text = await file.text();

      // Parse and validate
      const config = importFromJSON(text);
      const validation = validateBrandingConfig(config);

      if (!validation.valid) {
        setValidationErrors(validation.errors);
        setPreviewConfig(config); // Still show preview with warnings
      } else {
        setPreviewConfig(config);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to import configuration",
      );
      setPreviewConfig(null);
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleConfirmImport = useCallback(() => {
    if (previewConfig) {
      onImport(previewConfig);
    }
  }, [previewConfig, onImport]);

  const handleReset = useCallback(() => {
    setPreviewConfig(null);
    setError(null);
    setValidationErrors([]);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Upload area */}
      {!previewConfig && (
        <>
          <div
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={cn(
              "cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all",
              isDragging
                ? "border-sky-500 bg-sky-50 dark:bg-sky-950/30"
                : "border-zinc-300 hover:border-sky-400 dark:border-zinc-600 dark:hover:border-sky-500",
              isProcessing && "pointer-events-none opacity-50",
            )}
            role="button"
            tabIndex={isProcessing ? -1 : 0}
            aria-label="Upload branding configuration file"
          >
            {isProcessing ? (
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-sky-500" />
            ) : (
              <FileJson className="mx-auto h-10 w-10 text-zinc-400 dark:text-zinc-500" />
            )}
            <p className="mt-3 text-sm text-zinc-600 dark:text-zinc-400">
              {isProcessing
                ? "Processing..."
                : "Drop your branding.json file here"}
            </p>
            <p className="mt-1 text-xs text-zinc-500">or click to browse</p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleInputChange}
            className="hidden"
            aria-label="Upload branding configuration JSON file"
          />

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/20">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}
        </>
      )}

      {/* Preview */}
      {previewConfig && (
        <div className="space-y-4">
          {/* Validation warnings */}
          {validationErrors.length > 0 && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20">
              <div className="flex items-start gap-2">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    Validation warnings
                  </p>
                  <ul className="mt-1 list-inside list-disc text-xs text-yellow-600 dark:text-yellow-500">
                    {validationErrors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Config preview */}
          <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-700">
            <div className="border-b border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-700 dark:bg-zinc-800">
              <h3 className="font-medium text-zinc-900 dark:text-white">
                Import Preview
              </h3>
            </div>
            <div className="space-y-4 p-4">
              {/* App info */}
              <div className="flex items-start gap-4">
                {previewConfig.logo.original && (
                  <img
                    src={previewConfig.logo.original}
                    alt="Logo"
                    className="h-12 w-12 rounded-lg bg-zinc-100 object-contain dark:bg-zinc-800"
                  />
                )}
                <div>
                  <h4 className="font-semibold text-zinc-900 dark:text-white">
                    {previewConfig.appInfo.appName}
                  </h4>
                  <p className="text-sm text-zinc-500">
                    {previewConfig.appInfo.tagline}
                  </p>
                </div>
              </div>

              {/* Colors preview */}
              <div>
                <p className="mb-2 text-xs text-zinc-500">Colors</p>
                <div className="flex gap-1">
                  {[
                    previewConfig.colors.primary,
                    previewConfig.colors.secondary,
                    previewConfig.colors.accent,
                    previewConfig.colors.background,
                    previewConfig.colors.foreground,
                  ].map((color, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded border border-zinc-200 dark:border-zinc-700"
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>

              {/* Typography preview */}
              <div>
                <p className="mb-2 text-xs text-zinc-500">Typography</p>
                <div className="space-y-1">
                  <p className="text-sm">
                    <span className="text-zinc-500">Heading:</span>{" "}
                    <span className="font-medium">
                      {previewConfig.typography.headingFont}
                    </span>
                  </p>
                  <p className="text-sm">
                    <span className="text-zinc-500">Body:</span>{" "}
                    <span className="font-medium">
                      {previewConfig.typography.bodyFont}
                    </span>
                  </p>
                </div>
              </div>

              {/* Metadata */}
              <div className="border-t border-zinc-200 pt-3 dark:border-zinc-700">
                <p className="text-xs text-zinc-500">
                  Version: {previewConfig.metadata.version}
                  {previewConfig.metadata.exportedFrom && (
                    <> | Exported from: {previewConfig.metadata.exportedFrom}</>
                  )}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmImport}
              className="flex-1"
            >
              <Check className="mr-2 h-4 w-4" />
              Import Configuration
            </Button>
          </div>
        </div>
      )}

      {/* Cancel button when not previewing */}
      {!previewConfig && onCancel && (
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="w-full"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}
