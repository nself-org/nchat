/**
 * Social Account Manager Component
 * Manages connected social media accounts
 */

"use client";

import { useState } from "react";
import { useSocialAccounts } from "@/hooks/use-social-accounts";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  AlertCircle,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
  Twitter,
  Instagram,
  Linkedin,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { formatDistanceToNow } from "date-fns";
import type { SocialPlatform } from "@/lib/social/types";

import { logger } from "@/lib/logger";

const PLATFORM_ICONS = {
  twitter: Twitter,
  instagram: Instagram,
  linkedin: Linkedin,
};

const PLATFORM_COLORS = {
  twitter: "bg-blue-500",
  instagram: "bg-pink-500",
  linkedin: "bg-blue-700",
};

const PLATFORM_NAMES = {
  twitter: "Twitter/X",
  instagram: "Instagram",
  linkedin: "LinkedIn",
};

export function SocialAccountManager() {
  const {
    accounts,
    activeAccounts,
    loading,
    error,
    connectAccount,
    toggleAccountStatus,
    deleteAccount,
    triggerImport,
    isPlatformConnected,
  } = useSocialAccounts();

  const [importingId, setImportingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleConnect = (platform: SocialPlatform) => {
    connectAccount(platform);
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    setTogglingId(id);
    try {
      await toggleAccountStatus(id, !currentStatus);
    } catch (error) {
      logger.error("Failed to toggle status:", error);
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to remove this account? All integrations will be deleted.",
      )
    ) {
      return;
    }

    setDeletingId(id);
    try {
      await deleteAccount(id);
    } catch (error) {
      logger.error("Failed to delete account:", error);
    } finally {
      setDeletingId(null);
    }
  };

  const handleImport = async (id: string) => {
    setImportingId(id);
    try {
      const result = await triggerImport(id);
      alert(
        `Import complete!\n\nFetched: ${result.fetched}\nImported: ${result.imported}\nFiltered: ${result.filtered}\nPosted: ${result.posted}`,
      );
    } catch (error) {
      logger.error("Failed to trigger import:", error);
      alert("Import failed. Please try again.");
    } finally {
      setImportingId(null);
    }
  };

  if (loading && accounts.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load social accounts. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Connect Social Accounts</CardTitle>
          <CardDescription>
            Link your social media accounts to automatically import posts to
            channels
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {(["twitter", "instagram", "linkedin"] as const).map((platform) => {
              const Icon = PLATFORM_ICONS[platform];
              const isConnected = isPlatformConnected(platform);
              const colorClass = PLATFORM_COLORS[platform];

              return (
                <Button
                  key={platform}
                  variant={isConnected ? "outline" : "default"}
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => handleConnect(platform)}
                  disabled={isConnected}
                >
                  <div className={`rounded-full p-3 ${colorClass} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="font-semibold">
                    {PLATFORM_NAMES[platform]}
                  </span>
                  {isConnected && (
                    <Badge variant="secondary" className="text-xs">
                      <Check className="mr-1 h-3 w-3" />
                      Connected
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Connected Accounts ({activeAccounts.length})</CardTitle>
            <CardDescription>
              Manage your connected social media accounts
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {accounts.map((account) => {
                const Icon = PLATFORM_ICONS[account.platform];
                const colorClass = PLATFORM_COLORS[account.platform];
                const isImporting = importingId === account.id;
                const isDeleting = deletingId === account.id;
                const isToggling = togglingId === account.id;

                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex flex-1 items-center gap-4">
                      <div
                        className={`rounded-full p-2 ${colorClass} text-white`}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold">
                            {account.account_name}
                          </h4>
                          {account.account_handle && (
                            <span className="text-sm text-muted-foreground">
                              @{account.account_handle}
                            </span>
                          )}
                          <Badge
                            variant={
                              account.is_active ? "default" : "secondary"
                            }
                          >
                            {account.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {account.last_poll_time ? (
                            <>
                              Last polled{" "}
                              {formatDistanceToNow(
                                new Date(account.last_poll_time),
                                {
                                  addSuffix: true,
                                },
                              )}
                            </>
                          ) : (
                            "Never polled"
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Active Toggle */}
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={account.is_active}
                          onCheckedChange={() =>
                            handleToggleStatus(account.id, account.is_active)
                          }
                          disabled={isToggling}
                        />
                      </div>

                      {/* Test Import */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleImport(account.id)}
                        disabled={!account.is_active || isImporting}
                      >
                        {isImporting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>

                      {/* View Profile */}
                      {account.account_handle && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={getProfileUrl(
                              account.platform,
                              account.account_handle,
                            )}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}

                      {/* Delete */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(account.id)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4 text-destructive" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {accounts.length === 0 && (
        <Card>
          <CardContent className="py-12">
            <div className="space-y-2 text-center">
              <h3 className="text-lg font-semibold">No accounts connected</h3>
              <p className="text-sm text-muted-foreground">
                Connect your social media accounts to start importing posts
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function getProfileUrl(platform: SocialPlatform, handle: string): string {
  const urls = {
    twitter: `https://twitter.com/${handle}`,
    instagram: `https://instagram.com/${handle}`,
    linkedin: `https://linkedin.com/in/${handle}`,
  };
  return urls[platform];
}
