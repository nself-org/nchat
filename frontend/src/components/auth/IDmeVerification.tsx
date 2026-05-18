/**
 * ID.me Verification Component
 *
 * Displays ID.me verification status and allows users to initiate verification.
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
} from "lucide-react";

interface IDmeVerificationProps {
  userId?: string;
  onVerificationComplete?: () => void;
}

interface VerificationStatus {
  verified: boolean;
  verificationType?: string;
  verificationGroup?: string;
  verifiedAt?: string;
}

export function IDmeVerification({
  userId,
  onVerificationComplete,
}: IDmeVerificationProps) {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    loadVerificationStatus();
  }, [userId]);

  const loadVerificationStatus = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/auth/idme/status?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to load verification status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const initiateVerification = async () => {
    setIsVerifying(true);
    setError("");

    try {
      // Generate state with user ID
      const state = Buffer.from(JSON.stringify({ userId })).toString("base64");

      // Construct ID.me authorization URL
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
      const redirectUri = `${baseUrl}/api/auth/idme/callback`;
      const clientId = process.env.NEXT_PUBLIC_IDME_CLIENT_ID;

      const authUrl = new URL("https://api.id.me/oauth/authorize");
      authUrl.searchParams.set("client_id", clientId!);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set(
        "scope",
        "military student responder teacher government",
      );
      authUrl.searchParams.set("state", state);

      // Redirect to ID.me
      window.location.href = authUrl.toString();
    } catch (error) {
      setError("Failed to initiate verification");
      setIsVerifying(false);
    }
  };

  const getVerificationBadge = (type: string) => {
    const badges: Record<
      string,
      { label: string; variant: "default" | "secondary" | "outline" }
    > = {
      military: { label: "🎖️ Military", variant: "default" },
      responder: { label: "🚒 First Responder", variant: "default" },
      student: { label: "🎓 Student", variant: "secondary" },
      teacher: { label: "👨‍🏫 Teacher", variant: "secondary" },
      government: { label: "🏛️ Government", variant: "secondary" },
      verified: { label: "✓ Verified", variant: "outline" },
    };

    const badge = badges[type] || badges.verified;
    return <Badge variant={badge.variant}>{badge.label}</Badge>;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-6">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-indigo-600" />
          <CardTitle>ID.me Verification</CardTitle>
        </div>
        <CardDescription>
          Verify your identity to unlock exclusive features and badges
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {status?.verified ? (
          <>
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your identity has been verified with ID.me
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Verification Status</span>
                {status.verificationType &&
                  getVerificationBadge(status.verificationType)}
              </div>

              {status.verifiedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    Verified
                  </span>
                  <span className="text-sm">
                    {new Date(status.verifiedAt).toLocaleDateString()}
                  </span>
                </div>
              )}

              {status.verificationGroup && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Group</span>
                  <span className="text-sm capitalize">
                    {status.verificationGroup}
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <p className="text-xs text-muted-foreground">
                Your verification is managed by ID.me, a trusted identity
                verification service.
              </p>
            </div>
          </>
        ) : (
          <>
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Verify your identity as a member of:
              </p>

              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="text-lg">🎖️</span>
                  <span>Military (Active, Reserve, Veteran, Family)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">🚒</span>
                  <span>First Responders (Police, Fire, EMT)</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">🎓</span>
                  <span>Students & Teachers</span>
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-lg">🏛️</span>
                  <span>Government Employees</span>
                </li>
              </ul>

              <Button
                onClick={initiateVerification}
                disabled={isVerifying}
                className="w-full"
                size="lg"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Connecting to ID.me...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-4 w-4" />
                    Verify with ID.me
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-muted-foreground">
                Secure verification powered by{" "}
                <a
                  href="https://www.id.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-indigo-600 hover:underline"
                >
                  ID.me
                </a>
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
