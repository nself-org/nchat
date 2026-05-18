"use client";

/**
 * Environment Detection & Setup Mode Step
 *
 * First real step after welcome - detects existing configuration
 * and lets user choose how to proceed:
 * - Fresh setup (full wizard)
 * - Connect to existing backend
 * - Skip to specific section
 */

import { useEffect, useState, useCallback } from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Server,
  Database,
  Shield,
  HardDrive,
  AlertCircle,
  ChevronRight,
  Zap,
  Settings,
  Cloud,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type AppConfig } from "@/config/app-config";

import { logger } from "@/lib/logger";

interface EnvironmentStepProps {
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  onValidate: (isValid: boolean) => void;
}

// Extended config for environment-specific settings (stored in AppConfig)
interface EnvironmentSettings {
  setupMode?: "fresh" | "existing" | "skip";
  backendType?: "nself" | "custom" | "none";
  backendUrls?: {
    graphql?: string;
    auth?: string;
    storage?: string;
    socket?: string;
  };
  environment?: "development" | "staging" | "production";
}

interface DetectionResult {
  backend: {
    exists: boolean;
    initialized: boolean;
    running: boolean;
    nshelfInstalled: boolean;
    services: Record<string, { running: boolean; healthy: boolean }>;
  };
  envFiles: {
    local: { exists: boolean };
    development: { exists: boolean };
    staging: { exists: boolean };
    production: { exists: boolean };
  };
  config: {
    exists: boolean;
    source: string;
    isComplete: boolean;
  };
}

export function EnvironmentStep({
  config,
  onUpdate,
  onValidate,
}: EnvironmentStepProps) {
  const [detecting, setDetecting] = useState(true);
  const [detection, setDetection] = useState<DetectionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Get initial values from config's extended settings
  const envSettings = (
    config as AppConfig & { environmentSettings?: EnvironmentSettings }
  ).environmentSettings;
  const [setupMode, setSetupMode] = useState<EnvironmentSettings["setupMode"]>(
    envSettings?.setupMode || "fresh",
  );
  const [backendType, setBackendType] = useState<
    EnvironmentSettings["backendType"]
  >(envSettings?.backendType || "nself");
  const [environment, setEnvironment] = useState<
    EnvironmentSettings["environment"]
  >(envSettings?.environment || "development");

  // Detect existing environment
  const detectEnvironment = useCallback(async () => {
    setDetecting(true);
    setError(null);

    try {
      // Detect backend status
      const backendRes = await fetch("/api/setup/backend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "detect" }),
      });
      const backend = await backendRes.json();

      // Detect env files
      const envRes = await fetch("/api/setup/env");
      const envData = await envRes.json();

      setDetection({
        backend: {
          exists: backend.exists || false,
          initialized: backend.initialized || false,
          running: backend.running || false,
          nshelfInstalled: backend.nshelfInstalled || false,
          services: backend.services || {},
        },
        envFiles: envData.files || {},
        config: {
          exists: Object.keys(envData.configFromEnv || {}).length > 0,
          source: envData.files?.local?.exists ? "env" : "none",
          isComplete: false, // Would need to check all required vars
        },
      });

      // Auto-select setup mode based on detection
      if (backend.initialized && backend.running) {
        setSetupMode("existing");
      }
    } catch (err) {
      logger.error("Environment detection failed:", err);
      setError(
        "Failed to detect environment. You can still proceed with fresh setup.",
      );
    } finally {
      setDetecting(false);
    }
  }, []);

  useEffect(() => {
    detectEnvironment();
  }, [detectEnvironment]);

  // Update parent whenever selection changes
  useEffect(() => {
    // Store environment settings as extended config
    onUpdate({
      // @ts-expect-error - environmentSettings is an extension to AppConfig for wizard state
      environmentSettings: {
        setupMode,
        backendType,
        environment,
      },
    });
    onValidate(true); // Always valid - user must make a choice
  }, [setupMode, backendType, environment, onUpdate, onValidate]);

  if (detecting) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-16">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="text-lg text-muted-foreground">
          Detecting your environment...
        </p>
        <p className="text-sm text-muted-foreground">
          Checking for existing configuration and services
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Environment Detection Results */}
      {detection && (
        <div className="space-y-4">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Settings className="h-5 w-5" />
            Environment Status
          </h3>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <StatusCard
              icon={Server}
              label="nself CLI"
              status={detection.backend.nshelfInstalled ? "success" : "warning"}
              detail={
                detection.backend.nshelfInstalled ? "Installed" : "Not found"
              }
            />
            <StatusCard
              icon={Database}
              label="Backend"
              status={
                detection.backend.initialized
                  ? detection.backend.running
                    ? "success"
                    : "warning"
                  : "neutral"
              }
              detail={
                detection.backend.running
                  ? "Running"
                  : detection.backend.initialized
                    ? "Stopped"
                    : "Not configured"
              }
            />
            <StatusCard
              icon={HardDrive}
              label="Config Files"
              status={detection.envFiles.local?.exists ? "success" : "neutral"}
              detail={
                detection.envFiles.local?.exists
                  ? ".env.local exists"
                  : "No config"
              }
            />
            <StatusCard
              icon={Shield}
              label="Services"
              status={
                Object.values(detection.backend.services || {}).some(
                  (s) => s.running,
                )
                  ? "success"
                  : "neutral"
              }
              detail={
                Object.values(detection.backend.services || {}).filter(
                  (s) => s.running,
                ).length + " running"
              }
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-3 text-yellow-600 dark:text-yellow-400">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="text-sm">{error}</span>
            </div>
          )}
        </div>
      )}

      {/* Setup Mode Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">
          How would you like to proceed?
        </h3>

        <div className="grid gap-4">
          <SetupModeCard
            selected={setupMode === "fresh"}
            onClick={() => setSetupMode("fresh")}
            icon={Zap}
            title="Fresh Setup"
            description="Start from scratch with the complete wizard. Best for new projects."
            recommended={!detection?.backend.initialized}
            badge="Recommended"
          />

          <SetupModeCard
            selected={setupMode === "existing"}
            onClick={() => setSetupMode("existing")}
            icon={Server}
            title="Use Existing Backend"
            description="Connect to an already running nself backend or custom services."
            recommended={
              detection?.backend.initialized && detection?.backend.running
            }
            disabled={
              !detection?.backend.nshelfInstalled &&
              !detection?.backend.initialized
            }
          />

          <SetupModeCard
            selected={setupMode === "skip"}
            onClick={() => setSetupMode("skip")}
            icon={ChevronRight}
            title="Quick Configure"
            description="Skip backend setup and configure only what you need. Good for development."
          />
        </div>
      </div>

      {/* Backend Type Selection (for fresh setup) */}
      {setupMode === "fresh" && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Backend Infrastructure</h3>

          <div className="grid gap-3">
            <BackendTypeCard
              selected={backendType === "nself"}
              onClick={() => setBackendType("nself")}
              icon={Server}
              title="nself CLI (Recommended)"
              description="Full-featured backend with PostgreSQL, Hasura GraphQL, Auth, and Storage"
              features={[
                "Auto-setup with one command",
                "Production-ready",
                "All services included",
              ]}
            />

            <BackendTypeCard
              selected={backendType === "custom"}
              onClick={() => setBackendType("custom")}
              icon={Cloud}
              title="Custom Backend"
              description="Connect to your own Hasura, Auth, and Storage services"
              features={[
                "Bring your own infrastructure",
                "Manual configuration",
                "Full control",
              ]}
            />

            <BackendTypeCard
              selected={backendType === "none"}
              onClick={() => setBackendType("none")}
              icon={Settings}
              title="Development Only"
              description="Use mock data and test users for local development"
              features={[
                "No backend required",
                "Test users included",
                "Limited features",
              ]}
            />
          </div>
        </div>
      )}

      {/* Environment Selection */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Environment</h3>

        <div className="flex gap-3">
          {(["development", "staging", "production"] as const).map((env) => (
            <button
              key={env}
              onClick={() => setEnvironment(env)}
              className={cn(
                "flex-1 rounded-lg border-2 px-4 py-3 transition-all",
                environment === env
                  ? "bg-primary/5 border-primary text-primary"
                  : "hover:border-primary/50 border-border",
              )}
            >
              <span className="font-medium capitalize">{env}</span>
            </button>
          ))}
        </div>

        <p className="text-sm text-muted-foreground">
          {environment === "development" &&
            "Local development with test users and hot reload."}
          {environment === "staging" &&
            "Testing environment that mirrors production."}
          {environment === "production" &&
            "Live environment with real users and data."}
        </p>
      </div>
    </div>
  );
}

// Status Card Component
function StatusCard({
  icon: Icon,
  label,
  status,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  status: "success" | "warning" | "error" | "neutral";
  detail: string;
}) {
  const statusColors = {
    success: "text-green-500 bg-green-500/10 border-green-500/20",
    warning: "text-yellow-500 bg-yellow-500/10 border-yellow-500/20",
    error: "text-red-500 bg-red-500/10 border-red-500/20",
    neutral: "text-muted-foreground bg-muted/50 border-border",
  };

  const StatusIcon =
    status === "success" ? CheckCircle2 : status === "error" ? XCircle : Icon;

  return (
    <div className={cn("rounded-lg border p-4", statusColors[status])}>
      <div className="mb-2 flex items-center gap-2">
        <StatusIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="text-xs opacity-80">{detail}</p>
    </div>
  );
}

// Setup Mode Card Component
function SetupModeCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  recommended,
  disabled,
  badge,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
  recommended?: boolean;
  disabled?: boolean;
  badge?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "relative flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all",
        selected
          ? "bg-primary/5 border-primary"
          : disabled
            ? "cursor-not-allowed border-border opacity-50"
            : "hover:border-primary/50 border-border",
      )}
    >
      <div
        className={cn(
          "rounded-lg p-2",
          selected ? "text-primary-foreground bg-primary" : "bg-muted",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <h4 className="font-semibold">{title}</h4>
          {(recommended || badge) && (
            <span className="bg-primary/10 rounded-full px-2 py-0.5 text-xs font-medium text-primary">
              {badge || "Detected"}
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border-2",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30",
        )}
      >
        {selected && (
          <CheckCircle2 className="text-primary-foreground h-3 w-3" />
        )}
      </div>
    </button>
  );
}

// Backend Type Card Component
function BackendTypeCard({
  selected,
  onClick,
  icon: Icon,
  title,
  description,
  features,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ElementType;
  title: string;
  description: string;
  features: string[];
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-start gap-4 rounded-lg border-2 p-4 text-left transition-all",
        selected
          ? "bg-primary/5 border-primary"
          : "hover:border-primary/50 border-border",
      )}
    >
      <div
        className={cn(
          "rounded-lg p-2",
          selected ? "text-primary-foreground bg-primary" : "bg-muted",
        )}
      >
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold">{title}</h4>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        <ul className="mt-2 space-y-1">
          {features.map((feature, i) => (
            <li
              key={i}
              className="flex items-center gap-1 text-xs text-muted-foreground"
            >
              <CheckCircle2 className="h-3 w-3 text-green-500" />
              {feature}
            </li>
          ))}
        </ul>
      </div>
      <div
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border-2",
          selected ? "border-primary bg-primary" : "border-muted-foreground/30",
        )}
      >
        {selected && (
          <CheckCircle2 className="text-primary-foreground h-3 w-3" />
        )}
      </div>
    </button>
  );
}
