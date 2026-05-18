/**
 * Session Management Component
 *
 * Complete session management interface with:
 * - Active sessions list with device details
 * - Session actions (revoke, revoke all)
 * - Real-time activity indicators
 * - Security notifications and alerts
 * - Suspicious activity warnings
 * - Geographic anomaly detection
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSessions } from "@/hooks/use-sessions";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  formatSessionTime,
  formatLocation,
} from "@/lib/security/session-store";
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
  Bell,
  X,
  MoreVertical,
  RefreshCw,
  AlertTriangle,
  Activity,
  Info,
  ExternalLink,
} from "lucide-react";

export function SessionManagement() {
  const { isDevMode } = useAuth();
  const {
    sessions,
    currentSession,
    otherSessions,
    loading,
    error,
    refreshSessions,
    revokeSession,
    revokeAllOtherSessions,
    notifications,
    unreadCount,
    markNotificationRead,
    markAllNotificationsRead,
    clearNotifications,
    suspiciousActivityScore,
    hasGeoAnomaly,
    requiresVerification,
  } = useSessions();

  const [isRevoking, setIsRevoking] = useState(false);
  const [revokingSessionId, setRevokingSessionId] = useState<string | null>(
    null,
  );
  const [showNotifications, setShowNotifications] = useState(false);

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleRevokeSession = async (sessionId: string) => {
    setRevokingSessionId(sessionId);
    setIsRevoking(true);
    try {
      const success = await revokeSession(sessionId);
      if (success) {
        await refreshSessions();
      }
    } finally {
      setIsRevoking(false);
      setRevokingSessionId(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setIsRevoking(true);
    try {
      const success = await revokeAllOtherSessions();
      if (success) {
        await refreshSessions();
      }
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRefresh = async () => {
    await refreshSessions();
  };

  // ============================================================================
  // Device Icon Helper
  // ============================================================================

  const getDeviceIcon = (device: string) => {
    switch (device.toLowerCase()) {
      case "mobile":
        return Smartphone;
      case "tablet":
        return Tablet;
      default:
        return Monitor;
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Session Management</h2>
          <p className="text-sm text-muted-foreground">
            Manage your active login sessions across all devices
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Notifications Badge */}
          <Button
            variant="outline"
            size="sm"
            className="relative"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center p-0 text-xs"
              >
                {unreadCount}
              </Badge>
            )}
          </Button>

          {/* Refresh Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
        </div>
      </div>

      {/* Dev Mode Notice */}
      {isDevMode && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            Development mode: Sessions are simulated. Actions will not persist
            to database.
          </AlertDescription>
        </Alert>
      )}

      {/* Security Warnings */}
      {requiresVerification && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Verification Required</AlertTitle>
          <AlertDescription>
            Suspicious activity detected on your account. Please verify your
            identity.
          </AlertDescription>
        </Alert>
      )}

      {hasGeoAnomaly && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unusual Location Detected</AlertTitle>
          <AlertDescription>
            We detected a login from an unusual location. If this wasn't you,
            please revoke all sessions and change your password immediately.
          </AlertDescription>
        </Alert>
      )}

      {suspiciousActivityScore !== null && suspiciousActivityScore >= 50 && (
        <Alert variant="destructive">
          <Shield className="h-4 w-4" />
          <AlertTitle>Security Alert</AlertTitle>
          <AlertDescription>
            Suspicious activity score: {suspiciousActivityScore}/100. Please
            review your active sessions below.
          </AlertDescription>
        </Alert>
      )}

      {/* Error Message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Notifications Panel */}
      {showNotifications && notifications.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Security Notifications</CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllNotificationsRead}
                >
                  Mark all read
                </Button>
                <Button variant="ghost" size="sm" onClick={clearNotifications}>
                  Clear
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowNotifications(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="max-h-96 space-y-2 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={cn(
                  "hover:bg-accent/50 flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors",
                  !notification.read && "bg-accent/30",
                )}
                role="button"
                tabIndex={0}
                onClick={() => markNotificationRead(notification.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    markNotificationRead(notification.id);
                  }
                }}
              >
                <div
                  className={cn(
                    "mt-0.5 rounded-full p-1.5",
                    notification.severity === "critical" &&
                      "bg-red-500/10 text-red-500",
                    notification.severity === "warning" &&
                      "bg-yellow-500/10 text-yellow-600",
                    notification.severity === "info" &&
                      "bg-blue-500/10 text-blue-500",
                  )}
                >
                  {notification.severity === "critical" ? (
                    <AlertTriangle className="h-4 w-4" />
                  ) : notification.severity === "warning" ? (
                    <AlertCircle className="h-4 w-4" />
                  ) : (
                    <Info className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium">{notification.title}</p>
                    {!notification.read && (
                      <Badge
                        variant="secondary"
                        className="h-1.5 w-1.5 rounded-full p-0"
                      />
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {notification.message}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatSessionTime(notification.timestamp)}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Security Score */}
      {suspiciousActivityScore !== null && suspiciousActivityScore > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Activity className="h-4 w-4" />
              Security Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full transition-all",
                      suspiciousActivityScore < 30 && "bg-green-500",
                      suspiciousActivityScore >= 30 &&
                        suspiciousActivityScore < 60 &&
                        "bg-yellow-500",
                      suspiciousActivityScore >= 60 &&
                        suspiciousActivityScore < 80 &&
                        "bg-orange-500",
                      suspiciousActivityScore >= 80 && "bg-red-500",
                    )}
                    style={{ width: `${suspiciousActivityScore}%` }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium">
                {suspiciousActivityScore}/100
              </span>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              {suspiciousActivityScore < 30 &&
                "Your account activity looks normal"}
              {suspiciousActivityScore >= 30 &&
                suspiciousActivityScore < 60 &&
                "Some unusual activity detected"}
              {suspiciousActivityScore >= 60 &&
                suspiciousActivityScore < 80 &&
                "Suspicious activity detected"}
              {suspiciousActivityScore >= 80 &&
                "High-risk activity detected - take action now"}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Current Session */}
      {currentSession && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Current Session</CardTitle>
            <CardDescription>
              This is the device you're using right now
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SessionCard session={currentSession} isCurrent />
          </CardContent>
        </Card>
      )}

      {/* Other Sessions */}
      {otherSessions.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Other Active Sessions</CardTitle>
                <CardDescription>
                  {otherSessions.length} other active session(s)
                </CardDescription>
              </div>
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
                      This will sign you out of {otherSessions.length} other
                      device
                      {otherSessions.length !== 1 ? "s" : ""}. You will need to
                      sign in again on those devices.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleRevokeAllOthers}
                      className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
                    >
                      {isRevoking ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing out...
                        </>
                      ) : (
                        "Sign Out All"
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {otherSessions.map((session) => (
              <SessionCard
                key={session.id}
                session={session}
                onRevoke={() => handleRevokeSession(session.id)}
                isRevoking={isRevoking && revokingSessionId === session.id}
              />
            ))}
          </CardContent>
        </Card>
      )}

      {/* No Other Sessions */}
      {!loading && otherSessions.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <Shield className="mx-auto mb-4 h-12 w-12 text-muted-foreground opacity-50" />
            <p className="text-lg font-medium">No other active sessions</p>
            <p className="mt-1 text-sm text-muted-foreground">
              You are only signed in on this device
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {loading && sessions.length === 0 && (
        <div className="space-y-4">
          <Card>
            <CardContent className="pt-6">
              <SessionSkeleton isCurrent />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-3 pt-6">
              <SessionSkeleton />
              <SessionSkeleton />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Session Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Sessions are automatically created when you sign in and expire after
            a period of inactivity.
          </p>
          <p>
            For security, we recommend signing out of devices you no longer use
            or recognize.
          </p>
          <p>
            If you notice suspicious activity, sign out all sessions and change
            your password immediately.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Session Card Component
// ============================================================================

interface SessionCardProps {
  session: any;
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
        "flex items-start gap-4 rounded-lg border p-4 transition-colors",
        isCurrent && "bg-primary/5 border-primary/20",
      )}
    >
      {/* Device Icon */}
      <div
        className={cn(
          "shrink-0 rounded-full p-2.5",
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
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {session.browser} on {session.os}
          </span>
          {isCurrent && (
            <Badge
              variant="secondary"
              className="border-green-500/20 bg-green-500/10 text-green-600"
            >
              <CheckCircle2 className="mr-1 h-3 w-3" />
              Current Device
            </Badge>
          )}
        </div>

        <div className="mt-2 space-y-1.5 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {formatLocation(session.location)}
            </span>
            <span className="flex items-center gap-1.5">
              <Globe className="h-3.5 w-3.5" />
              {session.ipAddress}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            {isCurrent
              ? "Active now"
              : `Last active ${formatSessionTime(session.lastActiveAt)}`}
          </div>
          <div className="text-xs">
            Created {formatSessionTime(session.createdAt)}
          </div>
        </div>
      </div>

      {/* Actions */}
      {!isCurrent && onRevoke && (
        <AlertDialog>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="shrink-0"
                disabled={isRevoking}
              >
                {isRevoking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <MoreVertical className="h-4 w-4" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Session Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <AlertDialogTrigger asChild>
                <DropdownMenuItem className="text-destructive focus:text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out this device
                </DropdownMenuItem>
              </AlertDialogTrigger>
            </DropdownMenuContent>
          </DropdownMenu>
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
      <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-32" />
      </div>
    </div>
  );
}
