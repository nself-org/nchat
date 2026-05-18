"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Globe,
  Check,
  X,
  AlertCircle,
  Copy,
  ExternalLink,
  Shield,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWhiteLabelStore } from "@/stores/white-label-store";

interface Step8CustomDomainProps {
  onValidChange?: (isValid: boolean) => void;
  className?: string;
}

export function Step8CustomDomain({
  onValidChange,
  className,
}: Step8CustomDomainProps) {
  const { config, updateCustomDomain, markStepComplete } = useWhiteLabelStore();
  const [domainInput, setDomainInput] = useState(
    config.customDomain.domain || "",
  );
  const [isValidating, setIsValidating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  // Mark step as complete (this step is optional)
  useEffect(() => {
    markStepComplete("domain");
    onValidChange?.(true);
  }, [markStepComplete, onValidChange]);

  const handleDomainChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value.toLowerCase().replace(/[^a-z0-9.-]/g, "");
      setDomainInput(value);
    },
    [],
  );

  const handleSaveDomain = useCallback(() => {
    if (!domainInput.trim()) {
      updateCustomDomain({
        domain: undefined,
        status: "none",
        dnsRecords: [],
      });
      return;
    }

    // Simulate DNS records
    const dnsRecords = [
      {
        type: "A" as const,
        name: domainInput,
        value: "76.76.21.21",
        verified: false,
      },
      {
        type: "CNAME" as const,
        name: `www.${domainInput}`,
        value: "cname.vercel-dns.com",
        verified: false,
      },
      {
        type: "TXT" as const,
        name: `_acme-challenge.${domainInput}`,
        value: `verify-${Math.random().toString(36).substr(2, 9)}`,
        verified: false,
      },
    ];

    updateCustomDomain({
      domain: domainInput,
      status: "pending",
      dnsRecords,
    });
  }, [domainInput, updateCustomDomain]);

  const handleVerify = useCallback(async () => {
    setIsValidating(true);

    // Simulate verification delay
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Simulate random verification result
    const success = Math.random() > 0.3;

    if (success) {
      updateCustomDomain({
        status: "active",
        sslEnabled: true,
        dnsRecords: config.customDomain.dnsRecords?.map((r) => ({
          ...r,
          verified: true,
        })),
      });
    } else {
      updateCustomDomain({
        status: "verifying",
      });
    }

    setIsValidating(false);
  }, [config.customDomain.dnsRecords, updateCustomDomain]);

  const handleCopyRecord = useCallback(async (value: string, key: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }, []);

  const handleRemoveDomain = useCallback(() => {
    setDomainInput("");
    updateCustomDomain({
      domain: undefined,
      status: "none",
      sslEnabled: false,
      dnsRecords: [],
    });
  }, [updateCustomDomain]);

  const statusColors = {
    none: "text-zinc-500",
    pending: "text-yellow-500",
    verifying: "text-blue-500",
    active: "text-green-500",
    failed: "text-red-500",
  };

  const statusLabels = {
    none: "Not configured",
    pending: "Pending verification",
    verifying: "Verifying...",
    active: "Active",
    failed: "Verification failed",
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center">
        <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 shadow-lg">
          <Globe className="h-6 w-6 text-white" />
        </div>
        <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-white">
          Custom Domain
        </h2>
        <p className="mx-auto max-w-md text-zinc-600 dark:text-zinc-400">
          Connect your own domain to make your app accessible at your custom
          URL.
        </p>
      </div>

      <div className="mx-auto max-w-xl space-y-6">
        {/* Domain input */}
        <div className="space-y-3">
          <label
            htmlFor="custom-domain"
            className="text-sm font-medium text-zinc-700 dark:text-zinc-300"
          >
            Domain Name
          </label>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                id="custom-domain"
                type="text"
                value={domainInput}
                onChange={handleDomainChange}
                placeholder="app.yourdomain.com"
                disabled={config.customDomain.status === "active"}
                className="w-full rounded-lg border border-zinc-200 bg-white py-2.5 pl-10 pr-4 text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100"
              />
            </div>
            {config.customDomain.status === "active" ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleRemoveDomain}
              >
                Remove
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSaveDomain}
                disabled={!domainInput.trim()}
              >
                Save
              </Button>
            )}
          </div>

          {/* Status indicator */}
          {config.customDomain.domain && (
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  "text-sm",
                  statusColors[config.customDomain.status],
                )}
              >
                {statusLabels[config.customDomain.status]}
              </span>
              {config.customDomain.status === "active" &&
                config.customDomain.sslEnabled && (
                  <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                    <Shield className="h-3 w-3" />
                    SSL Active
                  </span>
                )}
            </div>
          )}
        </div>

        {/* DNS Records */}
        {config.customDomain.dnsRecords &&
          config.customDomain.dnsRecords.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-zinc-900 dark:text-white">
                  DNS Configuration
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleVerify}
                  disabled={
                    isValidating || config.customDomain.status === "active"
                  }
                >
                  {isValidating ? (
                    <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-1 h-4 w-4" />
                  )}
                  Verify
                </Button>
              </div>

              <div className="rounded-xl bg-zinc-50 p-4 dark:bg-zinc-800/50">
                <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-400">
                  Add these records to your domain's DNS settings:
                </p>

                <div className="space-y-3">
                  {config.customDomain.dnsRecords.map((record, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800"
                    >
                      <div className="flex items-center gap-3">
                        {record.verified ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <X className="h-4 w-4 text-zinc-400" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded bg-zinc-100 px-1.5 py-0.5 font-mono text-xs dark:bg-zinc-700">
                              {record.type}
                            </span>
                            <span className="font-mono text-sm text-zinc-700 dark:text-zinc-300">
                              {record.name}
                            </span>
                          </div>
                          <span className="font-mono text-xs text-zinc-500">
                            {record.value}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyRecord(
                            record.value,
                            `${record.type}-${index}`,
                          )
                        }
                        className="rounded p-1.5 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-700"
                        title="Copy value"
                      >
                        {copied === `${record.type}-${index}` ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4 text-zinc-400" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Help text */}
              <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                  <div className="text-sm">
                    <p className="font-medium text-blue-800 dark:text-blue-200">
                      DNS propagation can take up to 48 hours
                    </p>
                    <p className="mt-1 text-blue-600 dark:text-blue-400">
                      After adding the records, click "Verify" to check if
                      they're propagated. You can continue with the setup and
                      verify later.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

        {/* No domain configured */}
        {!config.customDomain.domain && (
          <div className="rounded-xl bg-zinc-50 py-8 text-center dark:bg-zinc-800/50">
            <Globe className="mx-auto mb-3 h-12 w-12 text-zinc-300 dark:text-zinc-600" />
            <p className="text-zinc-500">
              Enter your domain above to get started
            </p>
            <p className="mt-2 text-xs text-zinc-400">
              This step is optional. You can skip it and configure later.
            </p>
          </div>
        )}

        {/* Domain provider links */}
        <div className="border-t border-zinc-200 pt-4 dark:border-zinc-700">
          <p className="mb-3 text-sm text-zinc-500">
            Need help with DNS? Here are some popular providers:
          </p>
          <div className="flex flex-wrap gap-2">
            {["Cloudflare", "Namecheap", "GoDaddy", "Google Domains"].map(
              (provider) => (
                <a
                  key={provider}
                  href={`https://www.google.com/search?q=${encodeURIComponent(`${provider} DNS settings`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-sky-600 hover:underline dark:text-sky-400"
                >
                  {provider}
                  <ExternalLink className="h-3 w-3" />
                </a>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
