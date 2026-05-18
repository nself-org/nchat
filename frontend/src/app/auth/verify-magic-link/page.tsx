/**
 * Magic Link Verification Page
 *
 * Verifies magic link tokens and completes passwordless authentication.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";

export default function VerifyMagicLinkPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { verifyMagicLink } = useAuth();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading",
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const verifyToken = async () => {
      const token = searchParams.get("token");

      if (!token) {
        setStatus("error");
        setMessage("Invalid or missing verification token.");
        return;
      }

      try {
        await verifyMagicLink(token);
        setStatus("success");
        setMessage("Magic link verified! Redirecting to your account...");
        // Redirect is handled by the auth context
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error
            ? error.message
            : "This magic link is invalid or has expired. Please request a new one.",
        );
      }
    };

    verifyToken();
  }, [searchParams, verifyMagicLink]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "loading" && (
            <>
              <div className="mb-4 flex justify-center">
                <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
              </div>
              <CardTitle>Verifying Magic Link</CardTitle>
              <CardDescription>
                Please wait while we verify your magic link...
              </CardDescription>
            </>
          )}

          {status === "success" && (
            <>
              <div className="mb-4 flex justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <CardTitle>Verification Successful!</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}

          {status === "error" && (
            <>
              <div className="mb-4 flex justify-center">
                <AlertCircle className="h-12 w-12 text-red-600" />
              </div>
              <CardTitle>Verification Failed</CardTitle>
              <CardDescription>{message}</CardDescription>
            </>
          )}
        </CardHeader>

        {status === "error" && (
          <CardContent className="space-y-3">
            <Button
              onClick={() => router.push("/auth/magic-link")}
              className="w-full"
            >
              <Mail className="mr-2 h-4 w-4" />
              Request New Magic Link
            </Button>
            <Button
              onClick={() => router.push("/login")}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
