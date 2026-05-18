"use client";

import { useState } from "react";
import { SettingsSection } from "./settings-section";
import { Button } from "@/components/ui/button";
import {
  Check,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  MoreVertical,
  LogOut,
  AlertCircle,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { formatDistanceToNow } from "date-fns";

interface Session {
  id: string;
  device: string;
  deviceType: "desktop" | "mobile" | "tablet" | "unknown";
  browser: string;
  location: string;
  ip: string;
  lastActive: Date;
  isCurrent: boolean;
}

interface SessionsSettingsProps {
  className?: string;
}

// Mock sessions data
const mockSessions: Session[] = [
  {
    id: "1",
    device: "MacBook Pro",
    deviceType: "desktop",
    browser: "Chrome 120",
    location: "New York, US",
    ip: "192.168.1.1",
    lastActive: new Date(),
    isCurrent: true,
  },
  {
    id: "2",
    device: "iPhone 15",
    deviceType: "mobile",
    browser: "Safari",
    location: "New York, US",
    ip: "192.168.1.2",
    lastActive: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    isCurrent: false,
  },
  {
    id: "3",
    device: "Windows PC",
    deviceType: "desktop",
    browser: "Firefox 121",
    location: "Boston, US",
    ip: "192.168.1.3",
    lastActive: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2), // 2 days ago
    isCurrent: false,
  },
];

const deviceIcons = {
  desktop: Monitor,
  mobile: Smartphone,
  tablet: Tablet,
  unknown: Globe,
};

/**
 * SessionsSettings - Manage active sessions
 */
export function SessionsSettings({ className }: SessionsSettingsProps) {
  const [sessions, setSessions] = useState<Session[]>(mockSessions);
  const [loading, setLoading] = useState<string | null>(null);
  const [revokeAllOpen, setRevokeAllOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRevokeSession = async (sessionId: string) => {
    setLoading(sessionId);
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch {
      setError("Failed to revoke session");
    } finally {
      setLoading(null);
    }
  };

  const handleRevokeAllOthers = async () => {
    setLoading("all");
    setError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      setSessions((prev) => prev.filter((s) => s.isCurrent));
      setRevokeAllOpen(false);
    } catch {
      setError("Failed to revoke sessions");
    } finally {
      setLoading(null);
    }
  };

  const otherSessions = sessions.filter((s) => !s.isCurrent);

  return (
    <SettingsSection
      title="Active Sessions"
      description="Manage your active login sessions across devices"
      className={className}
    >
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {sessions.map((session) => {
          const DeviceIcon = deviceIcons[session.deviceType];

          return (
            <div
              key={session.id}
              className={cn(
                "flex items-center justify-between rounded-lg border p-4",
                session.isCurrent &&
                  "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950",
              )}
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    session.isCurrent
                      ? "bg-green-100 dark:bg-green-900"
                      : "bg-muted",
                  )}
                >
                  <DeviceIcon
                    className={cn(
                      "h-5 w-5",
                      session.isCurrent
                        ? "text-green-600 dark:text-green-400"
                        : "text-muted-foreground",
                    )}
                  />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{session.device}</p>
                    {session.isCurrent && (
                      <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900 dark:text-green-300">
                        <Check className="h-3 w-3" />
                        Current
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {session.browser} - {session.location}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {session.isCurrent
                      ? "Active now"
                      : `Last active ${formatDistanceToNow(session.lastActive, { addSuffix: true })}`}
                  </p>
                </div>
              </div>

              {!session.isCurrent && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={loading === session.id}
                    >
                      {loading === session.id ? (
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : (
                        <MoreVertical className="h-4 w-4" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => handleRevokeSession(session.id)}
                      className="text-destructive focus:text-destructive"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out this device
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          );
        })}
      </div>

      {otherSessions.length > 0 && (
        <Button
          variant="outline"
          onClick={() => setRevokeAllOpen(true)}
          disabled={loading === "all"}
          className="mt-4 w-full gap-2"
        >
          <LogOut className="h-4 w-4" />
          Sign out of all other sessions
        </Button>
      )}

      {/* Revoke All Dialog */}
      <AlertDialog open={revokeAllOpen} onOpenChange={setRevokeAllOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of all other sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              This will sign you out of {otherSessions.length} other{" "}
              {otherSessions.length === 1 ? "session" : "sessions"}. You will
              need to sign in again on those devices.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevokeAllOthers}
              className="hover:bg-destructive/90 bg-destructive text-destructive-foreground"
            >
              {loading === "all" ? "Signing out..." : "Sign out all"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </SettingsSection>
  );
}
