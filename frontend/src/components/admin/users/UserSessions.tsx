"use client";

import { useState } from "react";
import {
  Monitor,
  Smartphone,
  Tablet,
  RefreshCw,
  LogOut,
  MapPin,
  Clock,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import type { UserSession, DeviceType } from "@/lib/admin/users/user-types";

interface UserSessionsProps {
  sessions: UserSession[];
  userId: string;
  isLoading?: boolean;
  onRevokeSession?: (sessionId: string) => Promise<void>;
  onRevokeAllSessions?: () => Promise<void>;
  onRefresh?: () => void;
}

const deviceIcons: Record<DeviceType, React.ReactNode> = {
  desktop: <Monitor className="h-4 w-4" />,
  mobile: <Smartphone className="h-4 w-4" />,
  tablet: <Tablet className="h-4 w-4" />,
  unknown: <Monitor className="h-4 w-4" />,
};

const statusColors = {
  active: "bg-green-500",
  expired: "bg-gray-400",
  revoked: "bg-red-500",
};

export function UserSessions({
  sessions,
  userId,
  isLoading = false,
  onRevokeSession,
  onRevokeAllSessions,
  onRefresh,
}: UserSessionsProps) {
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [revokeAllDialogOpen, setRevokeAllDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<UserSession | null>(
    null,
  );
  const [isRevoking, setIsRevoking] = useState(false);

  const activeSessions = sessions.filter((s) => s.status === "active");

  const handleRevokeSession = async () => {
    if (!selectedSession || !onRevokeSession) return;

    setIsRevoking(true);
    try {
      await onRevokeSession(selectedSession.id);
    } finally {
      setIsRevoking(false);
      setRevokeDialogOpen(false);
      setSelectedSession(null);
    }
  };

  const handleRevokeAllSessions = async () => {
    if (!onRevokeAllSessions) return;

    setIsRevoking(true);
    try {
      await onRevokeAllSessions();
    } finally {
      setIsRevoking(false);
      setRevokeAllDialogOpen(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return "Active now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;

    return date.toLocaleDateString();
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Active Sessions</CardTitle>
              <CardDescription>
                Manage user login sessions across devices
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              {activeSessions.length > 0 && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setRevokeAllDialogOpen(true)}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Revoke All
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 rounded-lg border p-4"
                >
                  <div className="h-10 w-10 animate-pulse rounded bg-muted" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Monitor className="mx-auto h-12 w-12 opacity-50" />
              <p className="mt-2">No active sessions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className={cn(
                    "flex items-center justify-between rounded-lg border p-4",
                    session.isCurrent && "bg-primary/5 border-primary",
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                      {deviceIcons[session.deviceType]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">
                          {session.browser || "Unknown Browser"}
                          {session.os && ` on ${session.os}`}
                        </span>
                        <div
                          className={cn(
                            "h-2 w-2 rounded-full",
                            statusColors[session.status],
                          )}
                        />
                        {session.isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {session.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {session.location.city}
                            {session.location.country &&
                              `, ${session.location.country}`}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(session.lastActiveAt)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        IP: {session.ipAddress}
                      </div>
                    </div>
                  </div>
                  {session.status === "active" && !session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedSession(session);
                        setRevokeDialogOpen(true);
                      }}
                      className="text-destructive hover:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Single Session Dialog */}
      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Session</AlertDialogTitle>
            <AlertDialogDescription>
              This will log out the user from this device. They will need to
              sign in again to continue using the application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRevokeSession();
              }}
              disabled={isRevoking}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              Revoke Session
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke All Sessions Dialog */}
      <AlertDialog
        open={revokeAllDialogOpen}
        onOpenChange={setRevokeAllDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Revoke All Sessions
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will log out the user from all {activeSessions.length} active
              device(s). They will need to sign in again on each device to
              continue using the application.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isRevoking}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleRevokeAllSessions();
              }}
              disabled={isRevoking}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              Revoke All Sessions
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default UserSessions;
