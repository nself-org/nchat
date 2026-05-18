"use client";

/**
 * JoinPage Component - Invite preview and acceptance page
 *
 * Displays invite information and allows users to accept the invite
 * to join a channel or workspace.
 */

import { useEffect, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Hash,
  Lock,
  Users,
  Clock,
  AlertCircle,
  CheckCircle,
  Loader2,
  ArrowRight,
  UserPlus,
  Home,
  LogIn,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useAppConfig } from "@/contexts/app-config-context";
import {
  useInvite,
  formatTimeUntilExpiry,
  isInviteExpired,
  hasReachedMaxUses,
  type InviteInfo,
  type InviteValidationError,
} from "@/lib/invite";

// ============================================================================
// Types
// ============================================================================

export interface JoinPageProps {
  /** The invite code to display/accept */
  code: string;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Error Messages
// ============================================================================

const ERROR_MESSAGES: Record<
  InviteValidationError | "unknown",
  { title: string; description: string }
> = {
  invalid_code: {
    title: "Invalid Invite",
    description: "This invite link appears to be invalid or malformed.",
  },
  not_found: {
    title: "Invite Not Found",
    description: "This invite link does not exist or has been deleted.",
  },
  expired: {
    title: "Invite Expired",
    description: "This invite link has expired and is no longer valid.",
  },
  max_uses_reached: {
    title: "Invite Limit Reached",
    description: "This invite link has reached its maximum number of uses.",
  },
  revoked: {
    title: "Invite Revoked",
    description: "This invite link has been revoked by the creator.",
  },
  already_member: {
    title: "Already a Member",
    description: "You are already a member of this channel.",
  },
  channel_archived: {
    title: "Channel Archived",
    description: "The channel this invite links to has been archived.",
  },
  permission_denied: {
    title: "Permission Denied",
    description: "You do not have permission to join this channel.",
  },
  unknown: {
    title: "Something Went Wrong",
    description: "An unexpected error occurred. Please try again.",
  },
};

// ============================================================================
// Loading State Component
// ============================================================================

function LoadingState() {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <Skeleton className="mx-auto mb-4 h-16 w-16 rounded-full" />
        <Skeleton className="mx-auto mb-2 h-6 w-48" />
        <Skeleton className="mx-auto h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="flex justify-center gap-2">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
      </CardContent>
      <CardFooter>
        <Skeleton className="h-10 w-full" />
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// Error State Component
// ============================================================================

interface ErrorStateProps {
  error: InviteValidationError | "unknown";
  showHomeButton?: boolean;
}

function ErrorState({ error, showHomeButton = true }: ErrorStateProps) {
  const { title, description } = ERROR_MESSAGES[error];

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <div className="bg-destructive/10 mx-auto mb-4 w-fit rounded-full p-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </CardHeader>
      {showHomeButton && (
        <CardFooter className="flex justify-center">
          <Button asChild variant="outline">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go Home
            </Link>
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}

// ============================================================================
// Success State Component
// ============================================================================

interface SuccessStateProps {
  invite: InviteInfo;
  onContinue: () => void;
}

function SuccessState({ invite, onContinue }: SuccessStateProps) {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 w-fit rounded-full bg-green-500/10 p-4">
          <CheckCircle className="h-8 w-8 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold">Welcome!</h2>
        <p className="text-muted-foreground">
          You have successfully joined{" "}
          {invite.channelName ? (
            <span className="font-medium">#{invite.channelName}</span>
          ) : (
            "the workspace"
          )}
        </p>
      </CardHeader>
      <CardFooter>
        <Button className="w-full" onClick={onContinue}>
          Continue to Chat
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// Auth Required State Component
// ============================================================================

interface AuthRequiredProps {
  code: string;
  invite: InviteInfo;
}

function AuthRequiredState({ code, invite }: AuthRequiredProps) {
  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader className="text-center">
        <div className="bg-primary/10 mx-auto mb-4 w-fit rounded-full p-4">
          {invite.channelIsPrivate ? (
            <Lock className="h-8 w-8 text-primary" />
          ) : (
            <Hash className="h-8 w-8 text-primary" />
          )}
        </div>
        <h2 className="text-xl font-semibold">
          Join {invite.channelName || "Channel"}
        </h2>
        <p className="text-muted-foreground">
          Sign in or create an account to accept this invite
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Invite Info */}
        <div className="bg-muted/50 space-y-3 rounded-xl p-4">
          {invite.channelDescription && (
            <p className="text-sm">{invite.channelDescription}</p>
          )}
          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">
              <Users className="mr-1 h-3 w-3" />
              {invite.channelMembersCount} member
              {invite.channelMembersCount !== 1 ? "s" : ""}
            </Badge>
            {invite.channelIsPrivate && (
              <Badge variant="secondary">
                <Lock className="mr-1 h-3 w-3" />
                Private
              </Badge>
            )}
          </div>
        </div>

        {/* Invited By */}
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <Avatar className="h-6 w-6">
            <AvatarImage src={invite.creatorAvatarUrl || undefined} />
            <AvatarFallback className="text-xs">
              {invite.creatorName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span>
            Invited by <span className="font-medium">{invite.creatorName}</span>
          </span>
        </div>
      </CardContent>

      <CardFooter className="flex-col gap-2">
        <Button asChild className="w-full">
          <Link href={`/auth/signin?redirect=/invite/${code}`}>
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Link>
        </Button>
        <Button asChild variant="outline" className="w-full">
          <Link href={`/auth/signup?redirect=/invite/${code}`}>
            <UserPlus className="mr-2 h-4 w-4" />
            Create Account
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function JoinPage({ code, className }: JoinPageProps) {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { config } = useAppConfig();

  const {
    fetchInvite,
    acceptInvite,
    invitePreview,
    isAccepting,
    acceptError,
    acceptSuccess,
  } = useInvite();

  const [hasAttemptedFetch, setHasAttemptedFetch] = useState(false);

  // Fetch invite on mount
  useEffect(() => {
    if (!hasAttemptedFetch) {
      setHasAttemptedFetch(true);
      fetchInvite(code);
    }
  }, [code, fetchInvite, hasAttemptedFetch]);

  // Handle accept
  const handleAccept = useCallback(async () => {
    const success = await acceptInvite(code);
    // Navigation handled in success state
  }, [code, acceptInvite]);

  // Handle continue after success
  const handleContinue = useCallback(() => {
    if (invitePreview?.invite?.channelSlug) {
      router.push(`/chat/c/${invitePreview.invite.channelSlug}`);
    } else if (invitePreview?.invite?.channelId) {
      router.push(`/chat/c/${invitePreview.invite.channelId}`);
    } else {
      router.push("/chat");
    }
  }, [invitePreview, router]);

  // Get invite info
  const invite = invitePreview?.invite;
  const isLoading =
    invitePreview?.isLoading || (!hasAttemptedFetch && !authLoading);
  const error = invitePreview?.error || (acceptError ? "unknown" : null);

  // Calculate metadata
  const expiresIn = invite?.expiresAt
    ? formatTimeUntilExpiry(invite.expiresAt)
    : null;

  return (
    <div className={cn("flex min-h-screen flex-col", className)}>
      {/* Header */}
      <header className="border-b py-4">
        <div className="container flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            {config?.branding?.logo ? (
              <img
                src={config.branding.logo}
                alt={config.branding?.appName || "nchat"}
                className="h-8"
              />
            ) : (
              <span className="text-xl font-bold">
                {config?.branding?.appName || "nchat"}
              </span>
            )}
          </Link>
          {!user && !authLoading && (
            <Button asChild variant="ghost">
              <Link href="/auth/signin">Sign In</Link>
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex flex-1 items-center justify-center p-4">
        {/* Loading State */}
        {isLoading && <LoadingState />}

        {/* Error State */}
        {!isLoading && error && <ErrorState error={error} />}

        {/* Success State (after accepting) */}
        {!isLoading && !error && acceptSuccess && invite && (
          <SuccessState invite={invite} onContinue={handleContinue} />
        )}

        {/* Auth Required State */}
        {!isLoading &&
          !error &&
          !acceptSuccess &&
          invite &&
          !user &&
          !authLoading && <AuthRequiredState code={code} invite={invite} />}

        {/* Invite Preview (logged in, ready to accept) */}
        {!isLoading && !error && !acceptSuccess && invite && user && (
          <Card className="mx-auto w-full max-w-md">
            <CardHeader className="text-center">
              <div className="bg-primary/10 mx-auto mb-4 w-fit rounded-full p-4">
                {invite.type === "workspace" ? (
                  <Globe className="h-8 w-8 text-primary" />
                ) : invite.channelIsPrivate ? (
                  <Lock className="h-8 w-8 text-primary" />
                ) : (
                  <Hash className="h-8 w-8 text-primary" />
                )}
              </div>
              <h2 className="text-xl font-semibold">
                {invite.type === "workspace"
                  ? "Join Workspace"
                  : `Join ${invite.channelName || "Channel"}`}
              </h2>
              <p className="text-muted-foreground">
                {invite.creatorName} has invited you to join
              </p>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Channel/Workspace Info */}
              <div className="bg-muted/50 space-y-3 rounded-xl p-4">
                {invite.channelDescription && (
                  <p className="text-sm">{invite.channelDescription}</p>
                )}
                <div className="flex flex-wrap gap-2">
                  {invite.type === "channel" && (
                    <Badge variant="secondary">
                      <Users className="mr-1 h-3 w-3" />
                      {invite.channelMembersCount} member
                      {invite.channelMembersCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  {invite.channelIsPrivate && (
                    <Badge variant="secondary">
                      <Lock className="mr-1 h-3 w-3" />
                      Private
                    </Badge>
                  )}
                  {expiresIn && (
                    <Badge variant="outline">
                      <Clock className="mr-1 h-3 w-3" />
                      Expires in {expiresIn}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Invited By */}
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={invite.creatorAvatarUrl || undefined} />
                  <AvatarFallback className="text-xs">
                    {invite.creatorName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span>
                  Invited by{" "}
                  <span className="font-medium">{invite.creatorName}</span>
                </span>
              </div>

              {/* Accept Error */}
              {acceptError && (
                <div className="bg-destructive/10 border-destructive/20 flex items-start gap-2 rounded-xl border p-3">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                  <p className="text-sm text-destructive">{acceptError}</p>
                </div>
              )}
            </CardContent>

            <CardFooter className="flex-col gap-2">
              <Button
                className="w-full"
                onClick={handleAccept}
                disabled={isAccepting}
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Accept Invite
                  </>
                )}
              </Button>
              <Button asChild variant="ghost" className="w-full">
                <Link href="/chat">Maybe Later</Link>
              </Button>
            </CardFooter>
          </Card>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t py-4">
        <div className="container text-center text-sm text-muted-foreground">
          {config?.branding?.companyName || "nself"} &copy;{" "}
          {new Date().getFullYear()}
        </div>
      </footer>
    </div>
  );
}

export default JoinPage;
