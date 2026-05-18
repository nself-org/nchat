/**
 * Magic Link Request Page
 *
 * Allows users to request a passwordless magic link for authentication.
 */

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import {
  Loader2,
  Mail,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "@/contexts/auth-context";

export default function MagicLinkPage() {
  const router = useRouter();
  const { sendMagicLink } = useAuth();

  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus("idle");
    setMessage("");

    try {
      const result = await sendMagicLink(email);

      if (result.success) {
        setStatus("success");
        setMessage("Magic link sent! Check your email to sign in.");
      } else {
        setStatus("error");
        setMessage("Failed to send magic link. Please try again.");
      }
    } catch (error) {
      setStatus("error");
      setMessage("An error occurred. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-50 via-white to-purple-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-4 flex justify-center">
            <Mail className="h-12 w-12 text-indigo-600" />
          </div>
          <CardTitle>Sign In with Magic Link</CardTitle>
          <CardDescription>
            Enter your email address and we'll send you a magic link to sign in
          </CardDescription>
        </CardHeader>

        <CardContent>
          {status === "success" ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {message}
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <p className="text-center text-sm text-muted-foreground">
                  Check your email for a magic link. Click the link to sign in
                  instantly.
                </p>
                <p className="text-center text-xs text-muted-foreground">
                  The link will expire in 15 minutes for security reasons.
                </p>
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      setStatus("idle");
                      setEmail("");
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    Send Another
                  </Button>
                  <Button
                    onClick={() => router.push("/login")}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {status === "error" && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{message}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  /* eslint-disable-next-line jsx-a11y/no-autofocus */
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  We'll send a magic link to this email address
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending Magic Link...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Magic Link
                  </>
                )}
              </Button>

              <div className="text-center">
                <Button
                  variant="link"
                  onClick={() => router.push("/login")}
                  type="button"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Login
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
