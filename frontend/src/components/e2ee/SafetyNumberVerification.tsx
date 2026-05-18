/**
 * Safety Number Verification Component
 * Displays and manages safety number verification for E2EE contacts
 */

"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  Copy,
  AlertTriangle,
  Shield,
  QrCode as QrCodeIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";

import { logger } from "@/lib/logger";

// ============================================================================
// TYPES
// ============================================================================

interface SafetyNumberVerificationProps {
  localUserId: string;
  peerUserId: string;
  peerUserName: string;
  peerIdentityKey: Uint8Array;
  onVerify?: (verified: boolean) => void;
  onClose?: () => void;
}

interface SafetyNumberData {
  safetyNumber: string;
  formattedSafetyNumber: string;
  qrCodeData: string;
  isVerified: boolean;
  verifiedAt: string | null;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SafetyNumberVerification({
  localUserId,
  peerUserId,
  peerUserName,
  peerIdentityKey,
  onVerify,
  onClose,
}: SafetyNumberVerificationProps) {
  const [safetyNumberData, setSafetyNumberData] =
    useState<SafetyNumberData | null>(null);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState(false);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  // Load safety number on mount
  useEffect(() => {
    loadSafetyNumber();
  }, [localUserId, peerUserId]);

  async function loadSafetyNumber() {
    try {
      setLoading(true);

      const response = await fetch(
        `/api/e2ee/safety-number/${peerUserId}?format=both`,
        {
          method: "GET",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to load safety number");
      }

      const data = await response.json();
      setSafetyNumberData(data);
    } catch (error) {
      logger.error("Failed to load safety number:", error);
      toast({
        title: "Error",
        description: "Failed to load safety number",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify() {
    try {
      setVerifying(true);

      const response = await fetch(
        `/api/e2ee/safety-number/${peerUserId}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            safetyNumber: safetyNumberData?.safetyNumber,
          }),
        },
      );

      if (!response.ok) {
        throw new Error("Failed to verify safety number");
      }

      toast({
        title: "Verified",
        description: `Safety number verified for ${peerUserName}`,
      });

      if (onVerify) {
        onVerify(true);
      }

      // Reload to get updated verification status
      await loadSafetyNumber();
    } catch (error) {
      logger.error("Failed to verify safety number:", error);
      toast({
        title: "Error",
        description: "Failed to verify safety number",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  }

  async function handleUnverify() {
    try {
      setVerifying(true);

      const response = await fetch(
        `/api/e2ee/safety-number/${peerUserId}/verify`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to unverify safety number");
      }

      toast({
        title: "Unverified",
        description: `Safety number unverified for ${peerUserName}`,
      });

      if (onVerify) {
        onVerify(false);
      }

      // Reload to get updated verification status
      await loadSafetyNumber();
    } catch (error) {
      logger.error("Failed to unverify safety number:", error);
      toast({
        title: "Error",
        description: "Failed to unverify safety number",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  }

  function handleCopy() {
    if (!safetyNumberData) return;

    navigator.clipboard.writeText(safetyNumberData.formattedSafetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);

    toast({
      title: "Copied",
      description: "Safety number copied to clipboard",
    });
  }

  if (loading) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Loading Safety Number...</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!safetyNumberData) {
    return (
      <Card className="mx-auto w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Error Loading Safety Number</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Failed to load safety number</AlertTitle>
            <AlertDescription>
              Please try again or contact support if the problem persists.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6" />
            <div>
              <CardTitle>Safety Number</CardTitle>
              <CardDescription>
                Verify your end-to-end encryption with {peerUserName}
              </CardDescription>
            </div>
          </div>
          {safetyNumberData.isVerified && (
            <div className="flex items-center gap-2 text-green-600">
              <Check className="h-5 w-5" />
              <span className="text-sm font-medium">Verified</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Verification Status Alert */}
        {safetyNumberData.isVerified ? (
          <Alert className="border-green-200 bg-green-50">
            <Check className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">
              Safety Number Verified
            </AlertTitle>
            <AlertDescription className="text-green-700">
              You have verified this safety number on{" "}
              {new Date(safetyNumberData.verifiedAt!).toLocaleDateString()}
            </AlertDescription>
          </Alert>
        ) : (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Not Yet Verified</AlertTitle>
            <AlertDescription>
              Verify this safety number to ensure your messages are encrypted
              end-to-end and not being intercepted.
            </AlertDescription>
          </Alert>
        )}

        {/* Verification Methods */}
        <Tabs defaultValue="number" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="number">Safety Number</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>

          {/* Safety Number Tab */}
          <TabsContent value="number" className="space-y-4">
            <div className="space-y-2">
              <span className="text-sm font-medium">Your Safety Number</span>
              <div className="relative">
                <div className="select-all rounded-lg border bg-gray-50 p-4 text-center font-mono text-lg tracking-wider">
                  {safetyNumberData.formattedSafetyNumber
                    .split(" ")
                    .map((group, i) => (
                      <React.Fragment key={i}>
                        {group}
                        {i % 2 === 1 && i < 11 && <br />}
                        {i % 2 === 0 && i < 11 && " "}
                      </React.Fragment>
                    ))}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="absolute right-2 top-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <p className="font-medium">How to verify:</p>
              <ol className="ml-2 list-inside list-decimal space-y-1">
                <li>Compare this number with {peerUserName}'s number</li>
                <li>
                  You can do this in person, over a phone call, or via video
                </li>
                <li>If the numbers match, tap "Mark as Verified" below</li>
                <li>If they don't match, DO NOT mark as verified</li>
              </ol>
            </div>
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qr" className="space-y-4">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="rounded-lg border bg-white p-4">
                <QRCodeSVG
                  value={safetyNumberData.qrCodeData}
                  size={256}
                  level="M"
                  includeMargin={true}
                />
              </div>

              <div className="space-y-2 text-center text-sm text-gray-600">
                <p className="font-medium">How to verify:</p>
                <ol className="list-inside list-decimal space-y-1">
                  <li>Have {peerUserName} scan this QR code</li>
                  <li>Or scan {peerUserName}'s QR code</li>
                  <li>If you see a green checkmark, you're verified!</li>
                  <li>If you see a red X, DO NOT mark as verified</li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <Separator />

        {/* Information Section */}
        <div className="space-y-2 text-sm text-gray-600">
          <p className="font-medium">What is a safety number?</p>
          <p>
            A safety number is a unique fingerprint derived from your encryption
            keys and {peerUserName}'s encryption keys. If this number matches on
            both devices, you can be confident that your messages are encrypted
            end-to-end and not being intercepted by a third party.
          </p>
          <p className="mt-2">
            <strong>Important:</strong> This number will change if you or{" "}
            {peerUserName} reinstall the app or change devices. You'll be
            notified when this happens.
          </p>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
        <div className="flex gap-2">
          {safetyNumberData.isVerified ? (
            <Button
              variant="outline"
              onClick={handleUnverify}
              disabled={verifying}
            >
              Unverify
            </Button>
          ) : (
            <Button onClick={handleVerify} disabled={verifying}>
              {verifying ? (
                <>Verifying...</>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Mark as Verified
                </>
              )}
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

export default SafetyNumberVerification;
