"use client";

import { useState, useEffect, useCallback } from "react";
import { Mail, Eye, Code, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWhiteLabelStore } from "@/stores/white-label-store";
import { ColorPicker } from "./ColorPicker";
import { generateEmailTemplate } from "@/lib/white-label/branding-export";

interface Step6EmailTemplatesProps {
  onValidChange?: (isValid: boolean) => void;
  className?: string;
}

type EmailType =
  | "welcome"
  | "passwordReset"
  | "emailVerification"
  | "invitation"
  | "notification";
type ViewMode = "preview" | "code";

const EMAIL_TYPES: { id: EmailType; label: string; description: string }[] = [
  { id: "welcome", label: "Welcome", description: "Sent when a user signs up" },
  {
    id: "passwordReset",
    label: "Password Reset",
    description: "Sent for password recovery",
  },
  {
    id: "emailVerification",
    label: "Email Verification",
    description: "Sent to verify email address",
  },
  {
    id: "invitation",
    label: "Invitation",
    description: "Sent when inviting users",
  },
  {
    id: "notification",
    label: "Notification",
    description: "General notifications",
  },
];

export function Step6EmailTemplates({
  onValidChange,
  className,
}: Step6EmailTemplatesProps) {
  const { config, updateEmailTemplates, markStepComplete } =
    useWhiteLabelStore();
  const [selectedType, setSelectedType] = useState<EmailType>("welcome");
  const [viewMode, setViewMode] = useState<ViewMode>("preview");
  const [previewHtml, setPreviewHtml] = useState("");

  // Generate preview when config or selected type changes
  useEffect(() => {
    const html = generateEmailTemplate(config, selectedType);
    setPreviewHtml(html);
  }, [config, selectedType]);

  // Mark step as complete
  useEffect(() => {
    markStepComplete("email");
    onValidChange?.(true);
  }, [markStepComplete, onValidChange]);

  const handleColorChange = useCallback(
    (field: string, color: string) => {
      updateEmailTemplates({ [field]: color });
    },
    [updateEmailTemplates],
  );

  const handleFooterTextChange = useCallback(
    (text: string) => {
      updateEmailTemplates({ footerText: text });
    },
    [updateEmailTemplates],
  );

  const handleLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => {
          updateEmailTemplates({ headerLogo: reader.result as string });
        };
        reader.readAsDataURL(file);
      }
    },
    [updateEmailTemplates],
  );

  const useAppLogo = useCallback(() => {
    if (config.logo.original) {
      updateEmailTemplates({ headerLogo: config.logo.original });
    }
  }, [config.logo.original, updateEmailTemplates]);

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 to-cyan-600 shadow-lg">
          <Mail className="h-6 w-6 text-white" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Email Templates
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Customize how your emails look. These will be used for all
          transactional emails.
        </p>
      </div>

      <div className="mx-auto max-w-4xl">
        <div className="grid gap-6 md:grid-cols-[300px,1fr]">
          {/* Settings panel */}
          <div className="space-y-6">
            {/* Email type selector */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Email Type
              </span>
              <div className="space-y-1">
                {EMAIL_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setSelectedType(type.id)}
                    className={cn(
                      "w-full rounded-lg px-3 py-2 text-left transition-colors",
                      selectedType === type.id
                        ? "dark:bg-sky-900/30 bg-sky-100 text-sky-700 dark:text-sky-300"
                        : "hover:bg-zinc-100 dark:hover:bg-zinc-800",
                    )}
                  >
                    <span className="block text-sm font-medium">
                      {type.label}
                    </span>
                    <span className="block text-xs text-zinc-500">
                      {type.description}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Header logo */}
            <div className="space-y-2">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Header Logo
              </span>
              {config.emailTemplates.headerLogo ? (
                <div className="relative rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
                  <img
                    src={config.emailTemplates.headerLogo}
                    alt="Email logo"
                    className="mx-auto max-h-12"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      updateEmailTemplates({ headerLogo: undefined })
                    }
                    className="absolute right-1 top-1 text-xs text-red-500 hover:text-red-600"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {config.logo.original && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={useAppLogo}
                      className="w-full"
                      size="sm"
                    >
                      <ImageIcon className="mr-2 h-4 w-4" />
                      Use App Logo
                    </Button>
                  )}
                  <label className="block">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                    <div className="w-full cursor-pointer rounded-lg border border-dashed border-zinc-300 px-3 py-2 text-center text-sm transition-colors hover:border-sky-400 dark:border-zinc-600">
                      Upload custom logo
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Colors */}
            <div className="space-y-3">
              <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                Colors
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="mb-1 block text-xs text-zinc-500">
                    Button
                  </span>
                  <ColorPicker
                    value={
                      config.emailTemplates.primaryButtonColor ||
                      config.colors.primary
                    }
                    onChange={(color) =>
                      handleColorChange("primaryButtonColor", color)
                    }
                    showInput={false}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs text-zinc-500">
                    Background
                  </span>
                  <ColorPicker
                    value={
                      config.emailTemplates.backgroundColor ||
                      config.colors.muted
                    }
                    onChange={(color) =>
                      handleColorChange("backgroundColor", color)
                    }
                    showInput={false}
                  />
                </div>
              </div>
            </div>

            {/* Footer text */}
            <div className="space-y-2">
              <label
                htmlFor="email-footer-text"
                className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Footer Text
              </label>
              <input
                id="email-footer-text"
                type="text"
                value={config.emailTemplates.footerText || ""}
                onChange={(e) => handleFooterTextChange(e.target.value)}
                placeholder={`© ${new Date().getFullYear()} ${config.appInfo.appName}`}
                className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-800"
              />
            </div>
          </div>

          {/* Preview panel */}
          <div className="space-y-3">
            {/* View toggle */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setViewMode("preview")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  viewMode === "preview"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                )}
              >
                <Eye className="h-4 w-4" />
                Preview
              </button>
              <button
                type="button"
                onClick={() => setViewMode("code")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  viewMode === "code"
                    ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                    : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400",
                )}
              >
                <Code className="h-4 w-4" />
                HTML
              </button>
            </div>

            {/* Preview iframe */}
            {viewMode === "preview" ? (
              <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-700">
                <iframe
                  srcDoc={previewHtml}
                  title="Email preview"
                  className="h-[500px] w-full"
                  sandbox="allow-same-origin"
                />
              </div>
            ) : (
              <pre className="h-[500px] overflow-x-auto overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-900 p-4 text-xs text-zinc-100 dark:border-zinc-700">
                <code>{previewHtml}</code>
              </pre>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
