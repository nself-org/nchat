/**
 * Safety Number Display Component
 * Shows and verifies safety numbers for identity verification
 */

"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Shield, Check, Copy, QrCode } from "lucide-react";
import { useSafetyNumbers } from "@/hooks/use-safety-numbers";
import QRCode from "qrcode";

import { logger } from "@/lib/logger";

export interface SafetyNumberDisplayProps {
  localUserId: string;
  peerUserId: string;
  peerDeviceId: string;
  peerName: string;
  onVerified?: () => void;
}

export function SafetyNumberDisplay({
  localUserId,
  peerUserId,
  peerDeviceId,
  peerName,
  onVerified,
}: SafetyNumberDisplayProps) {
  const {
    safetyNumber,
    isLoading,
    generateSafetyNumber,
    verifySafetyNumber,
    loadSafetyNumber,
  } = useSafetyNumbers();

  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [showQR, setShowQR] = useState(false);

  // Load or generate safety number
  useEffect(() => {
    const init = async () => {
      const existing = await loadSafetyNumber(peerUserId);
      if (!existing) {
        await generateSafetyNumber(localUserId, peerUserId, peerDeviceId);
      }
    };

    init();
  }, [
    localUserId,
    peerUserId,
    peerDeviceId,
    generateSafetyNumber,
    loadSafetyNumber,
  ]);

  // Generate QR code
  useEffect(() => {
    if (safetyNumber?.qrCodeData) {
      QRCode.toDataURL(safetyNumber.qrCodeData, {
        width: 300,
        margin: 2,
      })
        .then((url) => setQrCodeUrl(url))
        .catch((err) => logger.error("QR code generation error:", err));
    }
  }, [safetyNumber]);

  const handleCopy = () => {
    if (safetyNumber) {
      navigator.clipboard.writeText(safetyNumber.safetyNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleVerify = async () => {
    await verifySafetyNumber(peerUserId);
    onVerified?.();
  };

  if (isLoading || !safetyNumber) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle>Safety Number</CardTitle>
          </div>
          {safetyNumber.isVerified && (
            <Badge variant="default" className="gap-1">
              <Check className="h-3 w-3" />
              Verified
            </Badge>
          )}
        </div>
        <CardDescription>
          Verify this number with {peerName} to ensure your conversation is
          secure
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Compare this number with {peerName}&apos;s safety number. If they
            match, your conversation is secure and no one is intercepting your
            messages.
          </AlertDescription>
        </Alert>

        {showQR && qrCodeUrl ? (
          <div className="flex flex-col items-center space-y-4">
            <img
              src={qrCodeUrl}
              alt="Safety Number QR Code"
              className="h-64 w-64"
            />
            <Button variant="outline" onClick={() => setShowQR(false)}>
              Show Number
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <p className="text-center font-mono text-lg tracking-wider">
                {safetyNumber.formattedSafetyNumber}
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={handleCopy}>
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
              {qrCodeUrl && (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowQR(true)}
                >
                  <QrCode className="mr-2 h-4 w-4" />
                  Show QR Code
                </Button>
              )}
            </div>
          </div>
        )}

        {!safetyNumber.isVerified && (
          <Alert>
            <AlertDescription>
              <strong>How to verify:</strong> Compare this number with{" "}
              {peerName} in person, over a video call, or through another
              trusted channel. If the numbers match, mark it as verified.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter>
        {!safetyNumber.isVerified && (
          <Button className="w-full" onClick={handleVerify}>
            <Check className="mr-2 h-4 w-4" />
            Mark as Verified
          </Button>
        )}
        {safetyNumber.isVerified && safetyNumber.verifiedAt && (
          <p className="w-full text-center text-sm text-muted-foreground">
            Verified on {safetyNumber.verifiedAt.toLocaleDateString()}
          </p>
        )}
      </CardFooter>
    </Card>
  );
}

export default SafetyNumberDisplay;
