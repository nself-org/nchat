"use client";

import { useEffect, useState } from "react";
import {
  MapPin,
  Shield,
  AlertCircle,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  type LocationPermissionState,
  checkLocationPermission,
  requestLocationPermission,
  watchLocationPermission,
  getPermissionMessage,
  getPermissionInstructions,
  isGeolocationSupported,
} from "@/lib/location";

// ============================================================================
// Types
// ============================================================================

interface LocationPermissionProps {
  /** Callback when permission is granted */
  onGranted?: () => void;
  /** Callback when permission is denied */
  onDenied?: () => void;
  /** Variant style */
  variant?: "card" | "inline" | "modal";
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Location Permission Component
// ============================================================================

/**
 * Location Permission Request Component
 *
 * Guides users through enabling location access.
 */
export function LocationPermission({
  onGranted,
  onDenied,
  variant = "card",
  className,
}: LocationPermissionProps) {
  const [permissionState, setPermissionState] =
    useState<LocationPermissionState>("prompt");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check initial permission state
  useEffect(() => {
    checkLocationPermission().then((result) => {
      setPermissionState(result.state);
      if (result.isGranted) {
        onGranted?.();
      }
    });
  }, [onGranted]);

  // Watch for permission changes
  useEffect(() => {
    const unwatch = watchLocationPermission((state) => {
      setPermissionState(state);
      if (state === "granted") {
        onGranted?.();
      } else if (state === "denied") {
        onDenied?.();
      }
    });

    return unwatch;
  }, [onGranted, onDenied]);

  const handleRequestPermission = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await requestLocationPermission();
      setPermissionState(result.state);

      if (result.isGranted) {
        onGranted?.();
      } else if (result.error) {
        setError(result.error);
        onDenied?.();
      }
    } catch (err) {
      setError("Failed to request location permission");
      onDenied?.();
    } finally {
      setIsLoading(false);
    }
  };

  // Check if geolocation is supported
  if (!isGeolocationSupported()) {
    return <PermissionUnavailable variant={variant} className={className} />;
  }

  // Already granted
  if (permissionState === "granted") {
    return <PermissionGranted variant={variant} className={className} />;
  }

  // Denied - show instructions
  if (permissionState === "denied") {
    return (
      <PermissionDenied variant={variant} error={error} className={className} />
    );
  }

  // Prompt - show request UI
  return (
    <PermissionPrompt
      variant={variant}
      isLoading={isLoading}
      onRequest={handleRequestPermission}
      className={className}
    />
  );
}

// ============================================================================
// Permission Prompt
// ============================================================================

interface PermissionPromptProps {
  variant: "card" | "inline" | "modal";
  isLoading: boolean;
  onRequest: () => void;
  className?: string;
}

function PermissionPrompt({
  variant,
  isLoading,
  onRequest,
  className,
}: PermissionPromptProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <MapPin className="h-5 w-5 text-muted-foreground" />
        <span className="text-sm text-muted-foreground">
          Enable location to share your position
        </span>
        <Button size="sm" onClick={onRequest} disabled={isLoading}>
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enable"}
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border bg-card p-6 text-center",
        variant === "modal" && "max-w-md",
        className,
      )}
    >
      <div className="bg-primary/10 mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full">
        <MapPin className="h-8 w-8 text-primary" />
      </div>

      <h3 className="mb-2 text-lg font-semibold">Enable Location Access</h3>

      <p className="mb-6 text-sm text-muted-foreground">
        To share your location with others, we need access to your device&apos;s
        location. Your location is only shared when you choose to share it.
      </p>

      <div className="space-y-3">
        <Button onClick={onRequest} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Requesting Access...
            </>
          ) : (
            <>
              <MapPin className="mr-2 h-4 w-4" />
              Allow Location Access
            </>
          )}
        </Button>

        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5" />
          <span>Your privacy is protected</span>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Permission Granted
// ============================================================================

interface PermissionGrantedProps {
  variant: "card" | "inline" | "modal";
  className?: string;
}

function PermissionGranted({ variant, className }: PermissionGrantedProps) {
  if (variant === "inline") {
    return (
      <div className={cn("flex items-center gap-2 text-green-600", className)}>
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm">Location access enabled</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-green-200 bg-green-50 p-4 dark:border-green-900 dark:bg-green-950",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-600" />
        <div>
          <p className="font-medium text-green-800 dark:text-green-200">
            Location Access Enabled
          </p>
          <p className="text-sm text-green-700 dark:text-green-300">
            You can now share your location with others.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Permission Denied
// ============================================================================

interface PermissionDeniedProps {
  variant: "card" | "inline" | "modal";
  error?: string | null;
  className?: string;
}

function PermissionDenied({
  variant,
  error,
  className,
}: PermissionDeniedProps) {
  const instructions = getPermissionInstructions();

  if (variant === "inline") {
    return (
      <div
        className={cn("flex items-center gap-2 text-destructive", className)}
      >
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">Location access denied</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "border-destructive/30 bg-destructive/5 rounded-lg border p-6",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-3">
        <div className="bg-destructive/10 flex h-10 w-10 items-center justify-center rounded-full">
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <h3 className="font-semibold text-destructive">
            Location Access Blocked
          </h3>
          <p className="text-sm text-muted-foreground">
            {error || "Location permission has been denied"}
          </p>
        </div>
      </div>

      <div className="rounded-md bg-muted p-4">
        <p className="mb-2 text-sm font-medium">How to enable location:</p>
        <p className="text-sm text-muted-foreground">{instructions}</p>
      </div>
    </div>
  );
}

// ============================================================================
// Permission Unavailable
// ============================================================================

interface PermissionUnavailableProps {
  variant: "card" | "inline" | "modal";
  className?: string;
}

function PermissionUnavailable({
  variant,
  className,
}: PermissionUnavailableProps) {
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 text-muted-foreground",
          className,
        )}
      >
        <AlertCircle className="h-4 w-4" />
        <span className="text-sm">Location not supported</span>
      </div>
    );
  }

  return (
    <div
      className={cn("bg-muted/50 rounded-lg border p-6 text-center", className)}
    >
      <AlertCircle className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
      <h3 className="mb-2 font-semibold">Location Not Available</h3>
      <p className="text-sm text-muted-foreground">
        Your browser or device doesn&apos;t support location services. Try using
        a different browser or device.
      </p>
    </div>
  );
}

// ============================================================================
// Permission Status Badge
// ============================================================================

interface PermissionStatusBadgeProps {
  /** Custom class name */
  className?: string;
}

/**
 * Small badge showing current permission status.
 */
export function PermissionStatusBadge({
  className,
}: PermissionStatusBadgeProps) {
  const [state, setState] = useState<LocationPermissionState>("prompt");

  useEffect(() => {
    checkLocationPermission().then((result) => setState(result.state));
    return watchLocationPermission(setState);
  }, []);

  const config = {
    granted: {
      icon: CheckCircle,
      text: "Location enabled",
      color: "text-green-600",
      bg: "bg-green-50 dark:bg-green-950",
    },
    denied: {
      icon: AlertCircle,
      text: "Location blocked",
      color: "text-red-600",
      bg: "bg-red-50 dark:bg-red-950",
    },
    prompt: {
      icon: MapPin,
      text: "Location not set",
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
    unavailable: {
      icon: AlertCircle,
      text: "Not supported",
      color: "text-muted-foreground",
      bg: "bg-muted",
    },
  };

  const current = config[state];
  const Icon = current.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs",
        current.bg,
        current.color,
        className,
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{current.text}</span>
    </div>
  );
}

export default LocationPermission;
