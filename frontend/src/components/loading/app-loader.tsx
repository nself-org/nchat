"use client";

import { cn } from "@/lib/utils";
import { Spinner } from "./spinner";

interface AppLoaderProps {
  /** App name to display */
  appName?: string;
  /** Custom logo element or URL */
  logo?: React.ReactNode | string;
  /** Loading message */
  message?: string;
  /** Show progress indicator */
  showProgress?: boolean;
  /** Progress value (0-100) */
  progress?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Full-screen app loading component
 * Displays during initial app load or route transitions
 */
export function AppLoader({
  appName = "nchat",
  logo,
  message = "Loading...",
  showProgress = false,
  progress = 0,
  className,
}: AppLoaderProps) {
  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex flex-col items-center justify-center",
        "bg-background",
        className,
      )}
    >
      {/* Logo */}
      <div className="mb-8">
        {logo ? (
          typeof logo === "string" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt={`${appName} logo`}
              className="h-16 w-16 object-contain"
            />
          ) : (
            logo
          )
        ) : (
          <DefaultLogo appName={appName} />
        )}
      </div>

      {/* App name */}
      <h1 className="mb-6 bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] bg-clip-text text-2xl font-bold text-transparent">
        {appName}
      </h1>

      {/* Spinner */}
      <Spinner size="lg" className="mb-4" />

      {/* Loading message */}
      <p className="text-sm text-muted-foreground">{message}</p>

      {/* Progress bar (optional) */}
      {showProgress && (
        <div className="mt-6 w-48">
          <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9] transition-all duration-300 ease-out"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
          <p className="mt-2 text-center text-xs text-muted-foreground">
            {Math.round(progress)}%
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Default logo component matching nchat branding
 */
function DefaultLogo({ appName }: { appName: string }) {
  return (
    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#00D4FF] to-[#0EA5E9] shadow-lg">
      <span className="text-3xl font-bold text-white">
        {appName.charAt(0).toUpperCase()}
      </span>
    </div>
  );
}

/**
 * Minimal app loader for quick transitions
 */
export function MinimalAppLoader({
  message,
  className,
}: Pick<AppLoaderProps, "message" | "className">) {
  return (
    <div
      className={cn(
        "bg-background/80 fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm",
        className,
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" />
        {message && <p className="text-sm text-muted-foreground">{message}</p>}
      </div>
    </div>
  );
}

/**
 * Route transition loader
 * Shows a top progress bar during navigation
 */
export function RouteLoader({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "fixed left-0 right-0 top-0 z-50 h-0.5 overflow-hidden bg-muted",
        className,
      )}
    >
      <div className="h-full w-1/3 animate-[slide_1s_ease-in-out_infinite] bg-gradient-to-r from-[#00D4FF] to-[#0EA5E9]" />
    </div>
  );
}
