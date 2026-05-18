"use client";

/**
 * Backend Setup Step
 *
 * Guides users through nself CLI backend setup:
 * - Install nself CLI (if needed)
 * - Initialize backend (nself init)
 * - Build configuration (nself build)
 * - Start services (nself start)
 * - Verify all services are running
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
  Play,
  Square,
  RefreshCw,
  Terminal,
  ExternalLink,
  Copy,
  Check,
  AlertTriangle,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type AppConfig } from "@/config/app-config";

import { logger } from "@/lib/logger";

interface BackendSetupStepProps {
  config: AppConfig;
  onUpdate: (updates: Partial<AppConfig>) => void;
  onValidate: (isValid: boolean) => void;
}

// Extended config for backend-specific settings
interface BackendSettings {
  initialized?: boolean;
  running?: boolean;
  services?: Record<string, ServiceStatus>;
  urls?: {
    graphql: string;
    auth: string;
    storage: string;
    socket?: string;
  };
}

interface ServiceStatus {
  name: string;
  running: boolean;
  healthy: boolean;
  url?: string;
}

type SetupPhase =
  | "checking"
  | "install"
  | "init"
  | "build"
  | "start"
  | "verify"
  | "complete"
  | "error";

export function BackendSetupStep({
  config,
  onUpdate,
  onValidate,
}: BackendSetupStepProps) {
  const [phase, setPhase] = useState<SetupPhase>("checking");
  const [status, setStatus] = useState<{
    nshelfInstalled: boolean;
    backendExists: boolean;
    backendInitialized: boolean;
    backendRunning: boolean;
    services: Record<string, ServiceStatus>;
  } | null>(null);
  const [output, setOutput] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedCommand, setCopiedCommand] = useState<string | null>(null);

  // Check current status
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/setup/backend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "status" }),
      });
      const data = await res.json();

      setStatus({
        nshelfInstalled: data.nshelfInstalled || false,
        backendExists: data.exists || false,
        backendInitialized: data.initialized || false,
        backendRunning: data.running || false,
        services: data.services || {},
      });

      // Determine phase based on status
      if (!data.nshelfInstalled) {
        setPhase("install");
      } else if (!data.initialized) {
        setPhase("init");
      } else if (!data.running) {
        setPhase("start");
      } else {
        setPhase("complete");
        onValidate(true);

        // Update parent with backend URLs
        const urlRes = await fetch("/api/setup/backend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "urls" }),
        });
        const urlData = await urlRes.json();

        // Store backend settings as extended config
        onUpdate({
          // @ts-expect-error - backendSettings is an extension to AppConfig for wizard state
          backendSettings: {
            initialized: true,
            running: true,
            services: data.services,
            urls: urlData.urls,
          },
        });
      }
    } catch (err) {
      logger.error("Status check failed:", err);
      setError("Failed to check backend status");
      setPhase("error");
    }
  }, [onUpdate, onValidate]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Execute backend command
  const executeCommand = async (
    action: string,
    options?: Record<string, unknown>,
  ) => {
    setIsProcessing(true);
    setError(null);
    setOutput((prev) => [...prev, `> Running: nself ${action}...`]);

    try {
      const res = await fetch("/api/setup/backend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, options }),
      });
      const data = await res.json();

      if (data.success) {
        setOutput((prev) => [
          ...prev,
          data.output || "Command completed successfully",
          "",
        ]);
        await checkStatus();
      } else {
        setError(data.error || data.message || "Command failed");
        setOutput((prev) => [
          ...prev,
          `Error: ${data.error || data.message}`,
          "",
        ]);
        setPhase("error");
      }
    } catch (err) {
      setError(String(err));
      setOutput((prev) => [...prev, `Error: ${err}`, ""]);
      setPhase("error");
    } finally {
      setIsProcessing(false);
    }
  };

  // Copy command to clipboard
  const copyCommand = (command: string) => {
    navigator.clipboard.writeText(command);
    setCopiedCommand(command);
    setTimeout(() => setCopiedCommand(null), 2000);
  };

  // Render phase-specific content
  const renderPhaseContent = () => {
    switch (phase) {
      case "checking":
        return (
          <div className="flex flex-col items-center space-y-4 py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="text-lg">Checking backend status...</p>
          </div>
        );

      case "install":
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-yellow-500" />
                <div>
                  <h4 className="font-semibold text-yellow-600 dark:text-yellow-400">
                    nself CLI Not Found
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The nself CLI is required to run the backend services.
                    Install it with one command:
                  </p>
                </div>
              </div>
            </div>

            <CommandBlock
              command="curl -sSL https://install.nself.org | bash"
              onCopy={copyCommand}
              copied={
                copiedCommand === "curl -sSL https://install.nself.org | bash"
              }
            />

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Info className="h-4 w-4" />
              <span>
                After installation, click &quot;Refresh&quot; to continue.
              </span>
            </div>

            <div className="flex gap-3">
              <button
                onClick={checkStatus}
                disabled={isProcessing}
                className="text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg bg-primary px-4 py-2 disabled:opacity-50"
              >
                <RefreshCw
                  className={cn("h-4 w-4", isProcessing && "animate-spin")}
                />
                Refresh Status
              </button>
              <a
                href="https://nself.org"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" />
                nself Documentation
              </a>
            </div>
          </div>
        );

      case "init":
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                <div>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400">
                    Initialize Backend
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    The backend folder exists but hasn&apos;t been initialized.
                    This will create the configuration files needed to run
                    services.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => executeCommand("init", { demo: true })}
                disabled={isProcessing}
                className="hover:bg-primary/5 flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all hover:border-primary disabled:opacity-50"
              >
                <Server className="h-8 w-8 text-primary" />
                <div className="text-center">
                  <h4 className="font-semibold">Full Demo Setup</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    All services enabled with sample data
                  </p>
                </div>
              </button>

              <button
                onClick={() => executeCommand("init")}
                disabled={isProcessing}
                className="hover:bg-primary/5 flex flex-col items-center gap-3 rounded-lg border-2 p-6 transition-all hover:border-primary disabled:opacity-50"
              >
                <Database className="h-8 w-8 text-muted-foreground" />
                <div className="text-center">
                  <h4 className="font-semibold">Minimal Setup</h4>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Core services only, configure later
                  </p>
                </div>
              </button>
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Initializing backend... This may take a moment.
              </div>
            )}
          </div>
        );

      case "build":
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
              <div className="flex items-start gap-3">
                <Info className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-500" />
                <div>
                  <h4 className="font-semibold text-blue-600 dark:text-blue-400">
                    Build Backend
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Generate Docker configuration and prepare services for
                    launch.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => executeCommand("build")}
              disabled={isProcessing}
              className="text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg bg-primary px-6 py-3 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <HardDrive className="h-5 w-5" />
              )}
              Build Backend Configuration
            </button>
          </div>
        );

      case "start":
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <h4 className="font-semibold text-green-600 dark:text-green-400">
                    Ready to Start
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Backend is configured and ready to launch. This will start
                    all required services.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => executeCommand("start")}
              disabled={isProcessing}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-white hover:bg-green-700 disabled:opacity-50"
            >
              {isProcessing ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Play className="h-5 w-5" />
              )}
              Start Backend Services
            </button>

            {isProcessing && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Starting services... This may take up to a minute.
              </div>
            )}
          </div>
        );

      case "complete":
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 p-4">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-green-500" />
                <div>
                  <h4 className="font-semibold text-green-600 dark:text-green-400">
                    Backend Running
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">
                    All backend services are up and running. You can proceed to
                    the next step.
                  </p>
                </div>
              </div>
            </div>

            {/* Service Status Grid */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {Object.entries(status?.services || {}).map(([name, service]) => (
                <ServiceCard key={name} name={name} service={service} />
              ))}
            </div>

            {/* Service Control Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => executeCommand("restart")}
                disabled={isProcessing}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw
                  className={cn("h-4 w-4", isProcessing && "animate-spin")}
                />
                Restart
              </button>
              <button
                onClick={() => executeCommand("stop")}
                disabled={isProcessing}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-muted disabled:opacity-50"
              >
                <Square className="h-4 w-4" />
                Stop
              </button>
              <button
                onClick={checkStatus}
                disabled={isProcessing}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-muted disabled:opacity-50"
              >
                <RefreshCw
                  className={cn("h-4 w-4", isProcessing && "animate-spin")}
                />
                Refresh
              </button>
            </div>
          </div>
        );

      case "error":
        return (
          <div className="space-y-6">
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-4">
              <div className="flex items-start gap-3">
                <XCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-500" />
                <div>
                  <h4 className="font-semibold text-red-600 dark:text-red-400">
                    Setup Error
                  </h4>
                  <p className="mt-1 text-sm text-muted-foreground">{error}</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={checkStatus}
                className="text-primary-foreground hover:bg-primary/90 flex items-center gap-2 rounded-lg bg-primary px-4 py-2"
              >
                <RefreshCw className="h-4 w-4" />
                Try Again
              </button>
              <a
                href="https://nself.org/docs/troubleshooting"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-lg border px-4 py-2 hover:bg-muted"
              >
                <ExternalLink className="h-4 w-4" />
                Troubleshooting Guide
              </a>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Steps */}
      <div className="flex items-center justify-between">
        {(["install", "init", "build", "start", "verify"] as const).map(
          (step, index) => {
            const stepIndex = [
              "install",
              "init",
              "build",
              "start",
              "verify",
            ].indexOf(phase);
            const isComplete =
              index < stepIndex ||
              phase === "complete" ||
              (phase === "error" && index < stepIndex);
            const isCurrent =
              step === phase || (phase === "complete" && step === "verify");

            return (
              <div key={step} className="flex items-center">
                <div
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium",
                    isComplete
                      ? "bg-green-500 text-white"
                      : isCurrent
                        ? "text-primary-foreground bg-primary"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {isComplete ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < 4 && (
                  <div
                    className={cn(
                      "mx-2 h-1 w-full",
                      isComplete ? "bg-green-500" : "bg-muted",
                    )}
                    style={{ width: "60px" }}
                  />
                )}
              </div>
            );
          },
        )}
      </div>

      {/* Phase Labels */}
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>Install</span>
        <span>Initialize</span>
        <span>Build</span>
        <span>Start</span>
        <span>Verify</span>
      </div>

      {/* Phase Content */}
      {renderPhaseContent()}

      {/* Terminal Output */}
      {output.length > 0 && (
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-2">
            <Terminal className="h-4 w-4" />
            <span className="text-sm font-medium">Command Output</span>
          </div>
          <div className="max-h-48 overflow-y-auto rounded-lg bg-gray-900 p-4 font-mono text-xs text-gray-100">
            {output.map((line, i) => (
              <div
                key={i}
                className={cn(line.startsWith(">") ? "text-green-400" : "")}
              >
                {line || "\u00A0"}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Command Block Component
function CommandBlock({
  command,
  onCopy,
  copied,
}: {
  command: string;
  onCopy: (cmd: string) => void;
  copied: boolean;
}) {
  return (
    <div className="relative rounded-lg bg-gray-900 p-4 font-mono text-sm text-gray-100">
      <code>{command}</code>
      <button
        onClick={() => onCopy(command)}
        className="absolute right-2 top-2 rounded p-2 hover:bg-gray-800"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-400" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}

// Service Card Component
function ServiceCard({
  name,
  service,
}: {
  name: string;
  service: ServiceStatus;
}) {
  const statusColor = service.healthy
    ? "text-green-500 bg-green-500/10 border-green-500/20"
    : service.running
      ? "text-yellow-500 bg-yellow-500/10 border-yellow-500/20"
      : "text-red-500 bg-red-500/10 border-red-500/20";

  const StatusIcon = service.healthy
    ? CheckCircle2
    : service.running
      ? AlertTriangle
      : XCircle;

  return (
    <div className={cn("rounded-lg border p-3", statusColor)}>
      <div className="flex items-center gap-2">
        <StatusIcon className="h-4 w-4" />
        <span className="text-sm font-medium capitalize">{name}</span>
      </div>
      <p className="mt-1 text-xs opacity-70">
        {service.healthy ? "Healthy" : service.running ? "Running" : "Stopped"}
      </p>
    </div>
  );
}
