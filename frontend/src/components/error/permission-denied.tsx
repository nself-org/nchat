"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ShieldX, Home, ArrowLeft, Mail, Lock, UserX, Ban } from "lucide-react";

type DenialReason =
  | "unauthorized"
  | "forbidden"
  | "suspended"
  | "banned"
  | "generic";

interface PermissionDeniedProps {
  /**
   * Reason for denial
   */
  reason?: DenialReason;
  /**
   * Resource that was denied
   */
  resourceType?: string;
  /**
   * Custom title
   */
  title?: string;
  /**
   * Custom description
   */
  description?: string;
  /**
   * Show request access button
   */
  showRequestAccess?: boolean;
  /**
   * Callback when request access is clicked
   */
  onRequestAccess?: () => void;
  /**
   * Email to contact for access
   */
  contactEmail?: string;
  /**
   * Show home button
   */
  showHomeButton?: boolean;
  /**
   * Show back button
   */
  showBackButton?: boolean;
  /**
   * Show sign in button (for unauthorized)
   */
  showSignInButton?: boolean;
  /**
   * Sign in URL
   */
  signInUrl?: string;
  /**
   * Custom className
   */
  className?: string;
}

const reasonConfig: Record<
  DenialReason,
  { icon: typeof ShieldX; defaultTitle: string; defaultDescription: string }
> = {
  unauthorized: {
    icon: Lock,
    defaultTitle: "Sign In Required",
    defaultDescription: "You need to sign in to access this content.",
  },
  forbidden: {
    icon: ShieldX,
    defaultTitle: "Access Denied",
    defaultDescription: "You do not have permission to access this resource.",
  },
  suspended: {
    icon: UserX,
    defaultTitle: "Account Suspended",
    defaultDescription:
      "Your account has been suspended. Please contact support for assistance.",
  },
  banned: {
    icon: Ban,
    defaultTitle: "Access Revoked",
    defaultDescription:
      "Your access has been revoked. Please contact an administrator.",
  },
  generic: {
    icon: ShieldX,
    defaultTitle: "Permission Denied",
    defaultDescription:
      "You do not have the required permissions to view this content.",
  },
};

/**
 * Permission denied component for 403 and access errors.
 */
export function PermissionDenied({
  reason = "generic",
  resourceType,
  title,
  description,
  showRequestAccess = false,
  onRequestAccess,
  contactEmail,
  showHomeButton = true,
  showBackButton = true,
  showSignInButton,
  signInUrl = "/auth/signin",
  className,
}: PermissionDeniedProps) {
  const [requestSent, setRequestSent] = React.useState(false);
  const config = reasonConfig[reason];
  const Icon = config.icon;

  // Show sign in button for unauthorized
  const shouldShowSignIn = showSignInButton ?? reason === "unauthorized";

  const displayTitle = title || config.defaultTitle;
  const displayDescription = resourceType
    ? `${config.defaultDescription.replace(".", "")} for this ${resourceType.toLowerCase()}.`
    : description || config.defaultDescription;

  const handleBack = () => {
    window.history.back();
  };

  const handleHome = () => {
    window.location.href = "/";
  };

  const handleSignIn = () => {
    window.location.href = signInUrl;
  };

  const handleRequestAccess = () => {
    if (onRequestAccess) {
      onRequestAccess();
      setRequestSent(true);
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-[400px] flex-col items-center justify-center p-8 text-center",
        className,
      )}
    >
      {/* Icon */}
      <div className="mb-6 rounded-full bg-red-100 p-4 dark:bg-red-900/30">
        <Icon className="h-12 w-12 text-red-600 dark:text-red-400" />
      </div>

      {/* Title */}
      <h2 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        {displayTitle}
      </h2>

      {/* Description */}
      <p className="mb-8 max-w-md text-base text-zinc-600 dark:text-zinc-400">
        {displayDescription}
      </p>

      {/* Action buttons */}
      <div className="mb-6 flex flex-wrap justify-center gap-3">
        {shouldShowSignIn && (
          <Button onClick={handleSignIn} variant="default" className="gap-2">
            <Lock className="h-4 w-4" />
            Sign In
          </Button>
        )}

        {showRequestAccess && !requestSent && (
          <Button
            onClick={handleRequestAccess}
            variant={shouldShowSignIn ? "outline" : "default"}
            className="gap-2"
          >
            <Mail className="h-4 w-4" />
            Request Access
          </Button>
        )}

        {requestSent && (
          <div className="flex items-center gap-2 rounded-md bg-green-100 px-4 py-2 text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <Mail className="h-4 w-4" />
            Access request sent
          </div>
        )}

        {showHomeButton && (
          <Button onClick={handleHome} variant="outline" className="gap-2">
            <Home className="h-4 w-4" />
            Go Home
          </Button>
        )}

        {showBackButton && (
          <Button onClick={handleBack} variant="ghost" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </Button>
        )}
      </div>

      {/* Contact info */}
      {contactEmail && (
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Need help?{" "}
          <a
            href={`mailto:${contactEmail}`}
            className="text-primary hover:underline"
          >
            Contact {contactEmail}
          </a>
        </p>
      )}
    </div>
  );
}

/**
 * Unauthorized component (401)
 */
export function Unauthorized(props: Omit<PermissionDeniedProps, "reason">) {
  return <PermissionDenied reason="unauthorized" {...props} />;
}

/**
 * Forbidden component (403)
 */
export function Forbidden(props: Omit<PermissionDeniedProps, "reason">) {
  return <PermissionDenied reason="forbidden" {...props} />;
}

/**
 * Account suspended component
 */
export function AccountSuspended({
  contactEmail = "support@example.com",
  ...props
}: Omit<PermissionDeniedProps, "reason">) {
  return (
    <PermissionDenied
      reason="suspended"
      showHomeButton={false}
      showBackButton={false}
      showRequestAccess={false}
      contactEmail={contactEmail}
      {...props}
    />
  );
}

/**
 * Account banned component
 */
export function AccountBanned({
  contactEmail = "support@example.com",
  ...props
}: Omit<PermissionDeniedProps, "reason">) {
  return (
    <PermissionDenied
      reason="banned"
      showHomeButton={false}
      showBackButton={false}
      showRequestAccess={false}
      contactEmail={contactEmail}
      {...props}
    />
  );
}

export default PermissionDenied;
