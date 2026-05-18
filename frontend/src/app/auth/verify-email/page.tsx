/**
 * Email Verification Page
 *
 * Verifies email address using token from URL.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, CheckCircle2, XCircle, Mail } from "lucide-react";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying",
  );
  const [message, setMessage] = useState("");
  const [alreadyVerified, setAlreadyVerified] = useState(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    verifyEmail();
  }, [token]);

  const verifyEmail = async () => {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message || "Email verified successfully!");
        setAlreadyVerified(data.alreadyVerified || false);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login?verified=true");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error?.message || "Failed to verify email");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred while verifying your email");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            {status === "verifying" && (
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
            )}
            {status === "success" && (
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            )}
            {status === "error" && (
              <XCircle className="h-12 w-12 text-red-600" />
            )}
          </div>
          <CardTitle>
            {status === "verifying" && "Verifying Email..."}
            {status === "success" &&
              (alreadyVerified ? "Already Verified" : "Email Verified!")}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription>
            {status === "verifying" &&
              "Please wait while we verify your email address"}
            {status === "success" &&
              (alreadyVerified
                ? "Your email has already been verified"
                : "Your email has been successfully verified")}
            {status === "error" && "We could not verify your email address"}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {status === "success" && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {message}
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === "success" && (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                Redirecting you to login page in 3 seconds...
              </p>
              <Button onClick={() => router.push("/login")} className="w-full">
                Continue to Login
              </Button>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">
                The verification link may have expired or is invalid.
              </p>
              <Button
                onClick={() => router.push("/auth/resend-verification")}
                className="w-full"
                variant="outline"
              >
                <Mail className="mr-2 h-4 w-4" />
                Request New Link
              </Button>
              <Button
                onClick={() => router.push("/login")}
                className="w-full"
                variant="ghost"
              >
                Back to Login
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
