"use client";

import { useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useSecurity, type Session } from "@/lib/security/use-security";
import {
  formatLocation,
  formatSessionTime,
  getDeviceIcon,
} from "@/lib/security/session-store";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  LogOut,
  AlertCircle,
  Loader2,
  Shield,
  Globe,
  CheckCircle2,
} from "lucide-react";

export function ActiveSessions() {
  const { isDevMode } = useAuth();
  const {
    sessions,
    currentSession,
    loadingSessions,
    revokeSession,
    revokeAllOtherSessions,
    isRevoking,
    revokeError,
    refetchSessions,
  } = useSecurity();

  // Refresh sessions on mount
  useEffect(() => {
    refetchSessions();
  }, [refetchSessions]);

  // Handle single session revoke
  const handleRevokeSession = useCallback(
    async (sessionId: string) => {
      await revokeSession(sessionId);
    },
    [revokeSession],
  );

  // Handle revoke all other sessions
  const handleRevokeAllOthers = useCallback(async () => {
    await revokeAllOtherSessions();
  }, [revokeAllOtherSessions]);

  // Get device icon component
  const getDeviceIconComponent = (device: string) => {
    switch (device.toLowerCase()) {
      case "mobile":
        return Smartphone;
      case "tablet":
        return Tablet;
      default:
        return Monitor;
    }
  };

  // Demo sessions for development mode
  const demoSessions: Session[] = [
    {
      id: "current-session",
      userId: "user-1",
      device: "Desktop",
      browser: "Chrome",
      os: "macOS",
      ipAddress: "192.168.1.100",
      location: { city: "New York", country: "United States" },
      isCurrent: true,
      createdAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "session-2",
      userId: "user-1",
      device: "Mobile",
      browser: "Safari",
      os: "iOS",
      ipAddress: "192.168.1.101",
      location: { city: "New York", country: "United States" },
      isCurrent: false,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "session-3",
      userId: "user-1",
      device: "Tablet",
      browser: "Firefox",
      os: "Android",
      ipAddress: "192.168.1.102",
      location: { city: "Los Angeles", country: "United States" },
      isCurrent: false,
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      lastActiveAt: new Date(
        Date.now() - 3 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      expiresAt: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // Use demo sessions in dev mode if no real sessions
  const displaySessions =
    isDevMode && sessions.length === 0 ? demoSessions : sessions;
  const displayCurrentSession =
    isDevMode && !currentSession ? demoSessions[0] : currentSession;
  const otherSessions = displaySessions.filter((s: Session) => !s.isCurrent);

  // Loading state
  if (loadingSessions && !isDevMode) {
    return (
      <div className="space-y-4">
        <SessionSkeleton isCurrent />
        <SessionSkeleton />
        <SessionSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Dev Mode Notice */}
      {isDevMode && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            In development mode, sessions are simulated. Actions will not
            persist.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {revokeError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{revokeError}</AlertDescription>
        </Alert>
      )}

      {/* Current Session */}
      {displayCurrentSession && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            Current Session
          </h3>
          <SessionCard session={displayCurrentSession} isCurrent />
        </div>
      )}

      {/* Other Sessions */}
      {otherSessions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-muted-foreground">
              Other Active Sessions ({otherSessions.length})
            </h3>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={isRevoking}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out All Others
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Sign out all other sessions?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This will sign you out of all devices except this one. You
                    will need to sign in again on those devices.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleRevokeAllOthers}
                    className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                  >
                    {isRevoking ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Sign Out All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          <div className="space-y-3">
            {otherSessions.map((session: Session) => (
              <SessionCard
                key={session.id}
                session={session}
                onRevoke={() => handleRevokeSession(session.id)}
                isRevoking={isRevoking}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Other Sessions */}
      {otherSessions.length === 0 && (
        <div className="py-8 text-center text-muted-foreground">
          <Shield className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>No other active sessions</p>
          <p className="text-sm">You are only signed in on this device</p>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Session Card Component
// ============================================================================

interface SessionCardProps {
  session: Session;
  isCurrent?: boolean;
  onRevoke?: () => void;
  isRevoking?: boolean;
}

function SessionCard({
  session,
  isCurrent,
  onRevoke,
  isRevoking,
}: SessionCardProps) {
  const DeviceIcon =
    session.device.toLowerCase() === "mobile"
      ? Smartphone
      : session.device.toLowerCase() === "tablet"
        ? Tablet
        : Monitor;

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-lg border p-4",
        isCurrent && "bg-primary/5 border-primary/20",
      )}
    >
      {/* Device Icon */}
      <div
        className={cn(
          "rounded-full p-2",
          isCurrent ? "bg-primary/10" : "bg-muted",
        )}
      >
        <DeviceIcon
          className={cn(
            "h-5 w-5",
            isCurrent ? "text-primary" : "text-muted-foreground",
          )}
        />
      </div>

      {/* Session Details */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium">
            {session.browser} on {session.os}
          </span>
          {isCurrent && (
            <Badge
              variant="secondary"
              className="border-green-500/20 bg-green-500/10 text-green-600"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              This device
            </Badge>
          )}
        </div>

        <div className="mt-1 space-y-1 text-sm text-muted-foreground">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {formatLocation(session.location)}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {session.ipAddress}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {isCurrent
              ? "Active now"
              : `Last active ${formatSessionTime(session.lastActiveAt)}`}
          </div>
        </div>
      </div>

      {/* Revoke Button */}
      {!isCurrent && onRevoke && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="hover:bg-destructive/10 text-destructive hover:text-destructive"
              disabled={isRevoking}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Sign out this session?</AlertDialogTitle>
              <AlertDialogDescription>
                This will sign you out of {session.browser} on {session.os}. You
                will need to sign in again on that device.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={onRevoke}
                className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
              >
                Sign Out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function SessionSkeleton({ isCurrent }: { isCurrent?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-lg border p-4",
        isCurrent && "bg-primary/5 border-primary/20",
      )}
    >
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
