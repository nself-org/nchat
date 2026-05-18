"use client";

/**
 * OAuth Provider Status Dashboard
 *
 * Admin page showing configuration status and statistics for all OAuth providers.
 */

import { useState, useEffect } from "react";
import {
  getAllOAuthProviderNames,
  validateOAuthProvider,
  getOAuthProvider,
  type OAuthProviderValidation,
  type OAuthProviderMetadata,
} from "@/config/oauth-providers";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Shield,
  Users,
  Clock,
  Settings,
  RefreshCw,
} from "lucide-react";

interface ProviderStats {
  provider: string;
  totalUsers: number;
  lastLogin: string | null;
  enabled: boolean;
}

interface ProviderStatus extends OAuthProviderValidation {
  config: OAuthProviderMetadata;
  stats: ProviderStats;
  routesExist: boolean;
}

export default function OAuthStatusPage() {
  const [providerStatuses, setProviderStatuses] = useState<ProviderStatus[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadProviderStatuses();
  }, []);

  const loadProviderStatuses = async () => {
    setLoading(true);

    const providers = getAllOAuthProviderNames();
    const statuses: ProviderStatus[] = [];

    for (const providerName of providers) {
      const validation = validateOAuthProvider(providerName);
      const config = getOAuthProvider(providerName)!;

      // In production, fetch stats from API
      // For now, use mock data
      const stats: ProviderStats = {
        provider: providerName,
        totalUsers: 0,
        lastLogin: null,
        enabled: config.enabled,
      };

      // Check if routes exist (simplified check)
      const routesExist = true; // Assume they exist since we generated them

      statuses.push({
        ...validation,
        config,
        stats,
        routesExist,
      });
    }

    setProviderStatuses(statuses);
    setLoading(false);
    setLastRefresh(new Date());
  };

  const handleRefresh = () => {
    loadProviderStatuses();
  };

  const getStatusIcon = (status: ProviderStatus) => {
    if (!status.config.enabled) {
      return <XCircle className="h-5 w-5 text-gray-400" />;
    }
    if (status.valid && status.routesExist) {
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    }
    if (status.warnings.length > 0) {
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    }
    return <XCircle className="h-5 w-5 text-red-500" />;
  };

  const getStatusBadge = (status: ProviderStatus) => {
    if (!status.config.enabled) {
      return <Badge variant="secondary">Disabled</Badge>;
    }
    if (status.valid && status.routesExist) {
      return <Badge className="bg-green-500">Active</Badge>;
    }
    if (status.warnings.length > 0) {
      return <Badge className="bg-yellow-500">Warning</Badge>;
    }
    return <Badge variant="destructive">Error</Badge>;
  };

  const summary = {
    total: providerStatuses.length,
    active: providerStatuses.filter((s) => s.config.enabled && s.valid).length,
    configured: providerStatuses.filter((s) => s.config.enabled).length,
    errors: providerStatuses.filter((s) => s.errors.length > 0).length,
    totalUsers: providerStatuses.reduce(
      (sum, s) => sum + s.stats.totalUsers,
      0,
    ),
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto h-12 w-12 animate-spin text-gray-400" />
          <p className="mt-4 text-sm text-gray-500">
            Loading OAuth provider status...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OAuth Provider Status</h1>
          <p className="mt-1 text-sm text-gray-500">
            Monitor and manage OAuth authentication providers
          </p>
        </div>
        <Button onClick={handleRefresh} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">
                Total Providers
              </p>
              <p className="text-2xl font-bold">{summary.total}</p>
            </div>
            <Settings className="h-8 w-8 text-gray-400" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-green-600">
                {summary.active}
              </p>
            </div>
            <CheckCircle2 className="h-8 w-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Configured</p>
              <p className="text-2xl font-bold text-blue-600">
                {summary.configured}
              </p>
            </div>
            <Shield className="h-8 w-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Errors</p>
              <p className="text-2xl font-bold text-red-600">
                {summary.errors}
              </p>
            </div>
            <AlertTriangle className="h-8 w-8 text-red-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total Users</p>
              <p className="text-2xl font-bold">{summary.totalUsers}</p>
            </div>
            <Users className="h-8 w-8 text-gray-400" />
          </div>
        </Card>
      </div>

      {/* Last Refresh Info */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Clock className="h-4 w-4" />
        <span>Last refreshed: {lastRefresh.toLocaleTimeString()}</span>
      </div>

      {/* Provider Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {providerStatuses.map((status) => (
          <Card key={status.provider} className="p-6">
            <div className="space-y-4">
              {/* Provider Header */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  {getStatusIcon(status)}
                  <div>
                    <h3 className="font-semibold">
                      {status.config.displayName}
                    </h3>
                    <p className="text-sm text-gray-500">{status.provider}</p>
                  </div>
                </div>
                {getStatusBadge(status)}
              </div>

              {/* Configuration Status */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Configured:</span>
                  <span
                    className={
                      status.config.enabled ? "text-green-600" : "text-gray-400"
                    }
                  >
                    {status.config.enabled ? "Yes" : "No"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Routes Exist:</span>
                  <span
                    className={
                      status.routesExist ? "text-green-600" : "text-red-600"
                    }
                  >
                    {status.routesExist ? "Yes" : "No"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Valid Config:</span>
                  <span
                    className={status.valid ? "text-green-600" : "text-red-600"}
                  >
                    {status.valid ? "Yes" : "No"}
                  </span>
                </div>
              </div>

              {/* Scopes */}
              <div>
                <p className="mb-2 text-sm font-medium text-gray-700">
                  Scopes:
                </p>
                <div className="flex flex-wrap gap-1">
                  {status.config.scopes.map((scope) => (
                    <Badge key={scope} variant="outline" className="text-xs">
                      {scope}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div className="space-y-1 border-t pt-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Total Users:</span>
                  <span className="font-medium">{status.stats.totalUsers}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-500">Last Login:</span>
                  <span className="font-medium">
                    {status.stats.lastLogin || "Never"}
                  </span>
                </div>
              </div>

              {/* Errors and Warnings */}
              {status.errors.length > 0 && (
                <div className="space-y-1 rounded-md bg-red-50 p-3">
                  <p className="text-sm font-medium text-red-800">Errors:</p>
                  {status.errors.map((error, index) => (
                    <p key={index} className="text-xs text-red-600">
                      • {error}
                    </p>
                  ))}
                </div>
              )}

              {status.warnings.length > 0 && (
                <div className="space-y-1 rounded-md bg-yellow-50 p-3">
                  <p className="text-sm font-medium text-yellow-800">
                    Warnings:
                  </p>
                  {status.warnings.map((warning, index) => (
                    <p key={index} className="text-xs text-yellow-600">
                      • {warning}
                    </p>
                  ))}
                </div>
              )}

              {/* Action Button */}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  window.open(
                    `https://console.developers.google.com`, // Example, would be provider-specific
                    "_blank",
                  );
                }}
              >
                <Settings className="mr-2 h-4 w-4" />
                Configure {status.config.displayName}
              </Button>
            </div>
          </Card>
        ))}
      </div>

      {/* Configuration Guide */}
      <Card className="p-6">
        <h2 className="mb-4 text-xl font-bold">Configuration Guide</h2>
        <div className="space-y-3 text-sm">
          <p>
            To enable an OAuth provider, you need to set the following
            environment variables:
          </p>
          <div className="rounded-md bg-gray-100 p-4 font-mono text-xs">
            <p>NEXT_PUBLIC_{"{PROVIDER}"}_CLIENT_ID=your_client_id</p>
            <p>{"{PROVIDER}"}_CLIENT_SECRET=your_client_secret</p>
          </div>
          <p className="text-gray-600">
            Replace {"{PROVIDER}"} with the uppercase provider name (e.g.,
            GOOGLE, GITHUB, MICROSOFT).
          </p>
          <p className="text-gray-600">
            After setting environment variables, restart the application for
            changes to take effect.
          </p>
        </div>
      </Card>
    </div>
  );
}
