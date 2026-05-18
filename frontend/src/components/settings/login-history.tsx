"use client";

import { useEffect, useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSecurity, type LoginAttempt } from "@/lib/security/use-security";
import {
  formatLocation,
  formatSessionTime,
} from "@/lib/security/session-store";
import { useAuth } from "@/contexts/auth-context";
import { cn } from "@/lib/utils";
import {
  Monitor,
  Smartphone,
  Tablet,
  MapPin,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Globe,
  Shield,
  Filter,
} from "lucide-react";

type FilterType = "all" | "success" | "failed";

export function LoginHistory() {
  const { isDevMode } = useAuth();
  const {
    loginHistory,
    loginHistoryTotal,
    loginHistoryPage,
    loadLoginHistory,
    loadingHistory,
  } = useSecurity();

  const [filter, setFilter] = useState<FilterType>("all");

  // Load history on mount
  useEffect(() => {
    loadLoginHistory(1);
  }, [loadLoginHistory]);

  // Filter change handler
  const handleFilterChange = useCallback(
    (value: string) => {
      setFilter(value as FilterType);
      loadLoginHistory(1);
    },
    [loadLoginHistory],
  );

  // Pagination handlers
  const handlePreviousPage = useCallback(() => {
    if (loginHistoryPage > 1) {
      loadLoginHistory(loginHistoryPage - 1);
    }
  }, [loginHistoryPage, loadLoginHistory]);

  const handleNextPage = useCallback(() => {
    const totalPages = Math.ceil(loginHistoryTotal / 10);
    if (loginHistoryPage < totalPages) {
      loadLoginHistory(loginHistoryPage + 1);
    }
  }, [loginHistoryPage, loginHistoryTotal, loadLoginHistory]);

  // Demo login history for development mode
  const demoHistory: LoginAttempt[] = [
    {
      id: "1",
      userId: "user-1",
      success: true,
      ipAddress: "192.168.1.100",
      device: "Desktop",
      browser: "Chrome",
      os: "macOS",
      location: { city: "New York", country: "United States" },
      createdAt: new Date().toISOString(),
    },
    {
      id: "2",
      userId: "user-1",
      success: true,
      ipAddress: "192.168.1.101",
      device: "Mobile",
      browser: "Safari",
      os: "iOS",
      location: { city: "New York", country: "United States" },
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "3",
      userId: "user-1",
      success: false,
      ipAddress: "10.0.0.55",
      device: "Desktop",
      browser: "Firefox",
      os: "Windows",
      location: { city: "Los Angeles", country: "United States" },
      failureReason: "Invalid password",
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "4",
      userId: "user-1",
      success: true,
      ipAddress: "192.168.1.102",
      device: "Tablet",
      browser: "Chrome",
      os: "Android",
      location: { city: "Chicago", country: "United States" },
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: "5",
      userId: "user-1",
      success: false,
      ipAddress: "203.0.113.50",
      device: "Desktop",
      browser: "Chrome",
      os: "Linux",
      location: { city: "Unknown", country: "Unknown" },
      failureReason: "Account locked",
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ];

  // Use demo history in dev mode if no real history
  const displayHistory =
    isDevMode && loginHistory.length === 0 ? demoHistory : loginHistory;

  // Apply filter
  const filteredHistory = displayHistory.filter((attempt) => {
    if (filter === "all") return true;
    if (filter === "success") return attempt.success;
    if (filter === "failed") return !attempt.success;
    return true;
  });

  // Calculate statistics
  const stats = {
    total: displayHistory.length,
    successful: displayHistory.filter((a) => a.success).length,
    failed: displayHistory.filter((a) => !a.success).length,
  };

  const totalPages = Math.ceil(loginHistoryTotal / 10) || 1;

  // Loading state
  if (loadingHistory && !isDevMode) {
    return (
      <div className="space-y-4">
        <div className="flex gap-4">
          <Skeleton className="h-20 flex-1" />
          <Skeleton className="h-20 flex-1" />
          <Skeleton className="h-20 flex-1" />
        </div>
        <HistorySkeleton />
        <HistorySkeleton />
        <HistorySkeleton />
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
            In development mode, login history is simulated.
          </AlertDescription>
        </Alert>
      )}

      {/* Statistics Cards */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard
          label="Total Logins"
          value={isDevMode ? stats.total : loginHistoryTotal}
          icon={Shield}
          variant="default"
        />
        <StatCard
          label="Successful"
          value={stats.successful}
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          label="Failed"
          value={stats.failed}
          icon={XCircle}
          variant="danger"
        />
      </div>

      {/* Filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filter} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All attempts</SelectItem>
              <SelectItem value="success">Successful only</SelectItem>
              <SelectItem value="failed">Failed only</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-muted-foreground">
          {filteredHistory.length} results
        </p>
      </div>

      {/* History List */}
      {filteredHistory.length > 0 ? (
        <div className="space-y-3">
          {filteredHistory.map((attempt) => (
            <LoginAttemptCard key={attempt.id} attempt={attempt} />
          ))}
        </div>
      ) : (
        <div className="py-8 text-center text-muted-foreground">
          <Shield className="mx-auto mb-4 h-12 w-12 opacity-50" />
          <p>No login attempts found</p>
          <p className="text-sm">
            {filter !== "all"
              ? "Try changing the filter"
              : "Login history will appear here"}
          </p>
        </div>
      )}

      {/* Pagination */}
      {!isDevMode && loginHistoryTotal > 10 && (
        <div className="flex items-center justify-between border-t pt-4">
          <p className="text-sm text-muted-foreground">
            Page {loginHistoryPage} of {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPage}
              disabled={loginHistoryPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={loginHistoryPage >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Statistics Card Component
// ============================================================================

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  variant: "default" | "success" | "danger";
}

function StatCard({ label, value, icon: Icon, variant }: StatCardProps) {
  const variantStyles = {
    default: "bg-muted text-foreground",
    success: "bg-green-500/10 text-green-600",
    danger: "bg-red-500/10 text-red-600",
  };

  const iconStyles = {
    default: "text-muted-foreground",
    success: "text-green-600",
    danger: "text-red-600",
  };

  return (
    <div className={cn("rounded-lg p-4", variantStyles[variant])}>
      <div className="flex items-center gap-2">
        <Icon className={cn("h-4 w-4", iconStyles[variant])} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

// ============================================================================
// Login Attempt Card Component
// ============================================================================

interface LoginAttemptCardProps {
  attempt: LoginAttempt;
}

function LoginAttemptCard({ attempt }: LoginAttemptCardProps) {
  const DeviceIcon =
    attempt.device.toLowerCase() === "mobile"
      ? Smartphone
      : attempt.device.toLowerCase() === "tablet"
        ? Tablet
        : Monitor;

  return (
    <div
      className={cn(
        "flex items-start gap-4 rounded-lg border p-4",
        !attempt.success && "border-red-500/20 bg-red-500/5",
      )}
    >
      {/* Status Icon */}
      <div
        className={cn(
          "rounded-full p-2",
          attempt.success ? "bg-green-500/10" : "bg-red-500/10",
        )}
      >
        {attempt.success ? (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        ) : (
          <XCircle className="h-5 w-5 text-red-600" />
        )}
      </div>

      {/* Attempt Details */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">
            {attempt.browser} on {attempt.os}
          </span>
          <Badge
            variant={attempt.success ? "secondary" : "destructive"}
            className={cn(
              attempt.success
                ? "border-green-500/20 bg-green-500/10 text-green-600"
                : "border-red-500/20 bg-red-500/10 text-red-600",
            )}
          >
            {attempt.success ? "Successful" : "Failed"}
          </Badge>
        </div>

        <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1">
              <DeviceIcon className="h-3 w-3" />
              {attempt.device}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {formatLocation(attempt.location)}
            </span>
            <span className="flex items-center gap-1">
              <Globe className="h-3 w-3" />
              {attempt.ipAddress}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatSessionTime(attempt.createdAt)}
            {" - "}
            {new Date(attempt.createdAt).toLocaleString()}
          </div>
          {!attempt.success && attempt.failureReason && (
            <div className="flex items-center gap-1 text-red-600">
              <AlertCircle className="h-3 w-3" />
              {attempt.failureReason}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Loading Skeleton
// ============================================================================

function HistorySkeleton() {
  return (
    <div className="flex items-start gap-4 rounded-lg border p-4">
      <Skeleton className="h-9 w-9 rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-4 w-64" />
        <Skeleton className="h-4 w-40" />
      </div>
    </div>
  );
}
