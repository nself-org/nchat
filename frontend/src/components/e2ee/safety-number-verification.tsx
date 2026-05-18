/**
 * Safety Number Verification Component
 * Allows users to verify end-to-end encryption with their contacts
 */

"use client";

import { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  CheckCircle2,
  XCircle,
  Copy,
  Scan,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useE2EEContext } from "@/contexts/e2ee-context";
import { cn } from "@/lib/utils";

// ============================================================================
// TYPES
// ============================================================================

export interface SafetyNumberVerificationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  localUserId: string;
  peerUserId: string;
  peerDeviceId: string;
  peerName?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SafetyNumberVerification({
  open,
  onOpenChange,
  localUserId,
  peerUserId,
  peerDeviceId,
  peerName = "Unknown User",
}: SafetyNumberVerificationProps) {
  const { toast } = useToast();
  const { generateSafetyNumber, formatSafetyNumber } = useE2EEContext();

  const [safetyNumber, setSafetyNumber] = useState<string>("");
  const [formattedSafetyNumber, setFormattedSafetyNumber] =
    useState<string>("");
  const [qrCodeData, setQrCodeData] = useState<string>("");
  const [isVerified, setIsVerified] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Load safety number when dialog opens
  useEffect(() => {
    if (open && localUserId && peerUserId) {
      loadSafetyNumber();
    }
  }, [open, localUserId, peerUserId]);

  /**
   * Load safety number from server
   */
  const loadSafetyNumber = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/e2ee/safety-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          localUserId,
          peerUserId,
          peerDeviceId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate safety number");
      }

      const data = await response.json();

      setSafetyNumber(data.safetyNumber);
      setFormattedSafetyNumber(data.formattedSafetyNumber);
      setQrCodeData(data.qrCodeData);
    } catch (err: any) {
      setError(err.message || "Failed to load safety number");
      toast({
        title: "Error",
        description: "Failed to generate safety number",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Copy safety number to clipboard
   */
  const copySafetyNumber = async () => {
    try {
      await navigator.clipboard.writeText(safetyNumber);
      toast({
        title: "Copied",
        description: "Safety number copied to clipboard",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to copy safety number",
        variant: "destructive",
      });
    }
  };

  /**
   * Mark safety number as verified
   */
  const markAsVerified = async () => {
    try {
      const response = await fetch("/api/e2ee/safety-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "verify",
          localUserId,
          peerUserId,
          peerDeviceId,
          safetyNumber,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to verify safety number");
      }

      const data = await response.json();

      if (data.isValid) {
        setIsVerified(true);
        toast({
          title: "Verified",
          description: "Safety number verified successfully",
        });
      } else {
        toast({
          title: "Invalid",
          description: "Safety number does not match",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Failed to verify safety number",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Verify Safety Number
          </DialogTitle>
          <DialogDescription>
            Compare this safety number with {peerName} through a trusted channel
            to verify end-to-end encryption.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Status Alert */}
          {isVerified ? (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-950">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertTitle className="text-green-800 dark:text-green-200">
                Verified Connection
              </AlertTitle>
              <AlertDescription className="text-green-700 dark:text-green-300">
                This conversation is end-to-end encrypted and the safety number
                has been verified.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertTitle className="text-yellow-800 dark:text-yellow-200">
                Unverified Connection
              </AlertTitle>
              <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                This conversation is end-to-end encrypted but not yet verified.
                Compare the safety number below to ensure secure communication.
              </AlertDescription>
            </Alert>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Safety Number Display */}
          {!isLoading && !error && (
            <div className="grid gap-4 md:grid-cols-2">
              {/* QR Code */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">QR Code</CardTitle>
                  <CardDescription>
                    Scan with {peerName}&apos;s device to verify
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  {qrCodeData && (
                    <div className="rounded-lg bg-white p-4">
                      <QRCodeSVG value={qrCodeData} size={200} level="H" />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Safety Number */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Safety Number</CardTitle>
                  <CardDescription>
                    Compare this number with {peerName}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="rounded-lg bg-muted p-4">
                    <div className="font-mono text-sm leading-relaxed">
                      {formattedSafetyNumber.split(" ").map((chunk, index) => (
                        <div key={index} className="mb-1">
                          {chunk}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={copySafetyNumber}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Copy Number
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">How to Verify</CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="space-y-2 text-sm">
                <li className="flex gap-2">
                  <span className="font-semibold text-primary">1.</span>
                  <span>
                    Meet {peerName} in person or contact them through a trusted
                    channel (phone call, video call).
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-primary">2.</span>
                  <span>
                    Compare the safety number above with the one shown on their
                    device. They should match exactly.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-primary">3.</span>
                  <span>
                    Alternatively, scan their QR code or have them scan yours to
                    verify automatically.
                  </span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold text-primary">4.</span>
                  <span>
                    Once verified, mark this conversation as verified to
                    indicate you&apos;ve completed the process.
                  </span>
                </li>
              </ol>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {!isVerified && !isLoading && !error && (
            <Button onClick={markAsVerified}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as Verified
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// SAFETY NUMBER BADGE COMPONENT
// ============================================================================

export interface SafetyNumberBadgeProps {
  isVerified: boolean;
  onClick?: () => void;
  className?: string;
}

export function SafetyNumberBadge({
  isVerified,
  onClick,
  className,
}: SafetyNumberBadgeProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
        isVerified
          ? "bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900 dark:text-green-300"
          : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 dark:bg-yellow-900 dark:text-yellow-300",
        className,
      )}
    >
      {isVerified ? (
        <>
          <CheckCircle2 className="h-3 w-3" />
          <span>Verified</span>
        </>
      ) : (
        <>
          <AlertTriangle className="h-3 w-3" />
          <span>Unverified</span>
        </>
      )}
    </button>
  );
}

export default SafetyNumberVerification;
