"use client";

import { useState, useEffect } from "react";
import { type AppConfig, authProviderDescriptions } from "@/config/app-config";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle } from "lucide-react";

interface AuthMethodsStepProps {
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  onValidate: (isValid: boolean) => void;
}

export function AuthMethodsStep({
  config,
  onUpdate,
  onValidate,
}: AuthMethodsStepProps) {
  const [authProviders, setAuthProviders] = useState(config.authProviders);

  useEffect(() => {
    // At least one auth provider must be enabled
    const hasProvider =
      authProviders.emailPassword ||
      authProviders.magicLinks ||
      authProviders.google ||
      authProviders.github ||
      authProviders.facebook ||
      (authProviders.idme && authProviders.idme.enabled);
    onValidate(hasProvider);
  }, [authProviders, onValidate]);

  const handleProviderToggle = (
    provider: keyof typeof authProviders,
    enabled: boolean,
  ) => {
    const updated = { ...authProviders, [provider]: enabled };
    setAuthProviders(updated);
    onUpdate({ authProviders: updated });
  };

  const popularProviders = [
    "emailPassword",
    "magicLinks",
    "google",
    "github",
    "facebook",
  ];

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <div className="shadow-glow mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0EA5E9]">
          <Shield className="h-6 w-6 text-zinc-900" />
        </div>
        <h2 className="mb-3 text-2xl font-bold text-zinc-900 dark:text-white">
          Authentication Methods
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Choose how users can sign in to your platform
        </p>
      </div>

      <div className="space-y-6">
        <div className="space-y-4">
          <Label className="text-base font-medium text-zinc-900 dark:text-white">
            Standard Methods
          </Label>

          <div className="space-y-4">
            {popularProviders.map((provider) => {
              const isEnabled =
                authProviders[provider as keyof typeof authProviders];

              return (
                <div
                  key={provider}
                  className="flex items-center justify-between rounded-xl border border-zinc-900/10 bg-white p-3 transition-all duration-300 hover:border-[#00D4FF]/30 dark:border-white/10 dark:bg-zinc-900 dark:hover:border-[#00D4FF]/30"
                >
                  <div>
                    <div className="font-medium capitalize text-zinc-900 dark:text-white">
                      {provider.replace(/([A-Z])/g, " $1").trim()}
                    </div>
                    <div className="text-sm text-zinc-600 dark:text-zinc-400">
                      {
                        authProviderDescriptions[
                          provider as keyof typeof authProviderDescriptions
                        ]
                      }
                    </div>
                  </div>
                  <Switch
                    checked={Boolean(isEnabled)}
                    onCheckedChange={(checked) =>
                      handleProviderToggle(
                        provider as keyof typeof authProviders,
                        checked,
                      )
                    }
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-4">
          <Label className="text-base font-medium text-zinc-900 dark:text-white">
            Special Verification
          </Label>

          <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-700 dark:bg-zinc-800/50">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-zinc-900 dark:text-white">
                  ID.me Verification
                </div>
                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                  Military, police, and government personnel verification
                </div>
              </div>
              <Switch
                checked={authProviders.idme.enabled}
                onCheckedChange={(checked) =>
                  handleProviderToggle("idme", {
                    ...authProviders.idme,
                    enabled: checked,
                  } as any)
                }
              />
            </div>

            {authProviders.idme.enabled && (
              <div className="mt-4 space-y-3">
                <Label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                  Allowed Groups
                </Label>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {[
                    { key: "allowMilitary", label: "Military Personnel" },
                    { key: "allowPolice", label: "Police Officers" },
                    { key: "allowFirstResponders", label: "First Responders" },
                    { key: "allowGovernment", label: "Government Workers" },
                  ].map(({ key, label }) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <span className="text-zinc-700 dark:text-zinc-300">
                        {label}
                      </span>
                      <Switch
                        checked={
                          authProviders.idme[
                            key as keyof typeof authProviders.idme
                          ] as boolean
                        }
                        onCheckedChange={(checked) => {
                          const updated = {
                            ...authProviders,
                            idme: { ...authProviders.idme, [key]: checked },
                          };
                          setAuthProviders(updated);
                          onUpdate({ authProviders: updated });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-[#0EA5E9]/20 bg-gradient-to-r from-[#00D4FF]/10 to-[#0EA5E9]/10 p-4 dark:border-[#00D4FF]/30 dark:from-[#00D4FF]/20 dark:to-[#0EA5E9]/20">
          <div className="flex gap-3">
            <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#0EA5E9]" />
            <div className="text-sm text-zinc-700 dark:text-zinc-300">
              <p className="mb-1 font-medium text-zinc-900 dark:text-white">
                Authentication Requirements
              </p>
              <ul className="space-y-1 text-xs text-zinc-600 dark:text-zinc-400">
                <li>• At least one authentication method must be enabled</li>
                <li>• Email/Password is recommended for reliability</li>
                <li>• Enable multiple methods for user convenience</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
