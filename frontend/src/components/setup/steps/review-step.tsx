"use client";

import { useEffect } from "react";
import { type AppConfig, landingThemeTemplates } from "@/config/app-config";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  User,
  Palette,
  Layout,
  Shield,
  Settings,
  Sparkles,
} from "lucide-react";

interface ReviewStepProps {
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  onValidate: (isValid: boolean) => void;
}

export function ReviewStep({ config, onUpdate, onValidate }: ReviewStepProps) {
  useEffect(() => {
    onValidate(true); // Review step is always valid
  }, [onValidate]);

  const enabledAuthProviders = Object.entries(config.authProviders)
    .filter(([key, value]) => {
      if (key === "idme") {
        return typeof value === "object" && value.enabled;
      }
      return value === true;
    })
    .map(([key]) => key);

  const enabledFeatures = Object.entries(config.features)
    .filter(([_, value]) => value)
    .map(([key]) => key);

  const selectedTheme = landingThemeTemplates[config.landingTheme];

  // Group features by category for better display
  const featureCategories = {
    Messaging: [
      "publicChannels",
      "privateChannels",
      "directMessages",
      "groupMessages",
      "threads",
      "messageEditing",
      "messageDeleting",
      "pinnedMessages",
    ],
    Media: [
      "fileUploads",
      "imagePreview",
      "reactions",
      "customEmojis",
      "codeBlocks",
      "markdownSupport",
      "linkPreviews",
      "socialEmbeds",
      "urlUnfurling",
    ],
    Organization: [
      "search",
      "mentions",
      "notifications",
      "unreadIndicators",
      "savedMessages",
      "userStatus",
      "typing",
    ],
    Users: [
      "userProfiles",
      "userDirectory",
      "roles",
      "permissions",
      "inviteLinks",
      "guestAccess",
    ],
    Integration: ["webhooks", "slashCommands", "bots", "apiAccess"],
    Admin: ["moderation", "userBanning", "exportData", "analytics", "auditLog"],
  };

  const getEnabledFeaturesByCategory = () => {
    const result: Record<string, string[]> = {};
    Object.entries(featureCategories).forEach(([category, features]) => {
      const enabled = features.filter((f) => enabledFeatures.includes(f));
      if (enabled.length > 0) {
        result[category] = enabled;
      }
    });
    return result;
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <div className="shadow-glow mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0EA5E9]">
          <Sparkles className="h-6 w-6 text-zinc-900" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-white">
          Review & Launch
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Review your configuration and launch your platform
        </p>
      </div>

      <div className="space-y-6">
        {/* Owner & Branding */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 text-base font-medium text-zinc-900 dark:text-white">
            <User className="h-4 w-4" />
            Platform Identity
          </Label>
          <div className="rounded-xl border border-zinc-900/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <div className="grid gap-3 text-sm md:grid-cols-2">
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">
                  App Name:
                </span>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {config.branding.appName || "Not set"}
                </p>
              </div>
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Owner:</span>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {config.owner.name}
                </p>
              </div>
              {config.branding.tagline && (
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Tagline:
                  </span>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {config.branding.tagline}
                  </p>
                </div>
              )}
              {config.branding.companyName && (
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Company:
                  </span>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {config.branding.companyName}
                  </p>
                </div>
              )}
              <div>
                <span className="text-zinc-500 dark:text-zinc-400">Email:</span>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {config.owner.email}
                </p>
              </div>
              {config.branding.websiteUrl && (
                <div>
                  <span className="text-zinc-500 dark:text-zinc-400">
                    Website:
                  </span>
                  <p className="font-medium text-zinc-900 dark:text-white">
                    {config.branding.websiteUrl}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Theme */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 text-base font-medium text-zinc-900 dark:text-white">
            <Palette className="h-4 w-4" />
            Visual Theme
          </Label>
          <div className="rounded-xl border border-zinc-900/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Theme Preset:
                </span>
                <p className="font-medium capitalize text-zinc-900 dark:text-white">
                  {config.theme.preset || "Custom"}
                </p>
              </div>
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Font Family:
                </span>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {config.theme.fontFamily.split(",")[0]}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Primary Color:
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded border border-zinc-300 dark:border-zinc-600"
                      style={{ backgroundColor: config.theme.primaryColor }}
                    />
                    <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                      {config.theme.primaryColor}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div>
                  <span className="text-sm text-zinc-500 dark:text-zinc-400">
                    Accent Color:
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <div
                      className="h-6 w-6 rounded border border-zinc-300 dark:border-zinc-600"
                      style={{ backgroundColor: config.theme.accentColor }}
                    />
                    <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                      {config.theme.accentColor}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Landing Theme */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 text-base font-medium text-zinc-900 dark:text-white">
            <Layout className="h-4 w-4" />
            Landing Page
          </Label>
          <div className="rounded-xl border border-zinc-900/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <div className="space-y-3">
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Theme:
                </span>
                <div className="mt-1 flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-zinc-300 dark:border-zinc-700"
                  >
                    {selectedTheme?.name}
                  </Badge>
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    {selectedTheme?.description}
                  </span>
                </div>
              </div>
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Homepage Mode:
                </span>
                <p className="font-medium text-zinc-900 dark:text-white">
                  {config.homepage.mode}
                  {config.homepage.redirectTo && (
                    <span className="text-zinc-600 dark:text-zinc-400">
                      {" "}
                      → {config.homepage.redirectTo}
                    </span>
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Authentication */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 text-base font-medium text-zinc-900 dark:text-white">
            <Shield className="h-4 w-4" />
            Authentication & Access
          </Label>
          <div className="rounded-xl border border-zinc-900/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <div className="space-y-3">
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Access Mode:
                </span>
                <div className="mt-1">
                  <Badge
                    variant="outline"
                    className="border-[#0EA5E9]/30 bg-[#00D4FF]/10 text-zinc-900 dark:text-white"
                  >
                    {config.authPermissions.mode
                      .replace(/-/g, " ")
                      .replace(/\b\w/g, (l) => l.toUpperCase())}
                  </Badge>
                </div>
              </div>
              <div>
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  Authentication Methods ({enabledAuthProviders.length}):
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {enabledAuthProviders.map((provider) => (
                    <Badge
                      key={provider}
                      variant="outline"
                      className="border-zinc-300 text-xs dark:border-zinc-700"
                    >
                      {provider === "emailPassword"
                        ? "Email/Password"
                        : provider === "magicLinks"
                          ? "Magic Links"
                          : provider === "facebook"
                            ? "Facebook"
                            : provider === "idme"
                              ? "ID.me"
                              : provider.charAt(0).toUpperCase() +
                                provider.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>
              {config.authPermissions.requireEmailVerification && (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  ✓ Email verification required
                </div>
              )}
              {config.authPermissions.requireApproval && (
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  ✓ Manual approval required
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-4">
          <Label className="flex items-center gap-2 text-base font-medium text-zinc-900 dark:text-white">
            <Settings className="h-4 w-4" />
            Features & Capabilities ({enabledFeatures.length} enabled)
          </Label>
          <div className="rounded-xl border border-zinc-900/10 bg-white p-4 dark:border-white/10 dark:bg-zinc-900">
            <div className="space-y-3">
              {Object.entries(getEnabledFeaturesByCategory()).map(
                ([category, features]) => (
                  <div key={category}>
                    <span className="text-sm text-zinc-500 dark:text-zinc-400">
                      {category}:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {features.map((feature) => (
                        <Badge
                          key={feature}
                          variant="outline"
                          className="border-zinc-300 text-xs text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
                        >
                          {feature.replace(/([A-Z])/g, " $1").trim()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Ready to Launch */}
        <div className="rounded-xl border border-[#0EA5E9]/20 bg-gradient-to-r from-[#00D4FF]/10 to-[#0EA5E9]/10 p-4 dark:border-[#00D4FF]/30 dark:from-[#00D4FF]/20 dark:to-[#0EA5E9]/20">
          <div className="flex gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0EA5E9]" />
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              <p className="mb-1 font-medium text-zinc-900 dark:text-white">
                Ready to Launch! 🚀
              </p>
              <p className="mb-2 text-zinc-600 dark:text-zinc-400">
                Your platform is configured and ready. Here's what happens next:
              </p>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li>• Configuration will be saved and activated</li>
                <li>
                  • Your workspace "{config.branding.appName}" will be created
                </li>
                <li>• You'll be set as the platform admin</li>
                <li>
                  • Users can join using {enabledAuthProviders.length}{" "}
                  authentication method
                  {enabledAuthProviders.length !== 1 ? "s" : ""}
                </li>
                <li>
                  • All {enabledFeatures.length} selected features will be
                  enabled
                </li>
              </ul>
              <p className="mt-3 text-xs font-medium text-zinc-700 dark:text-zinc-300">
                💡 You can modify these settings anytime through the admin
                panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
