/**
 * Safety Number Dialog Component
 * Complete UI for safety number verification with QR scanning and manual comparison
 */

"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  Check,
  Copy,
  AlertTriangle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  QrCode as QrCodeIcon,
  Camera,
  RefreshCw,
  Clock,
  History,
  X,
  ChevronDown,
  ChevronUp,
  Smartphone,
  AlertCircle,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
import type {
  TrustLevel,
  VerificationMethod,
  VerificationRecord,
  IdentityKeyChange,
} from "@/lib/e2ee/safety-number";

// ============================================================================
// TYPES
// ============================================================================

export interface SafetyNumberDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog should close */
  onOpenChange: (open: boolean) => void;
  /** Current user's ID */
  localUserId: string;
  /** Peer's user ID */
  peerUserId: string;
  /** Peer's display name */
  peerDisplayName: string;
  /** Peer's avatar URL */
  peerAvatarUrl?: string;
  /** Initial tab to show */
  initialTab?: "number" | "qr" | "scan" | "history";
  /** Callback when verification status changes */
  onVerificationChange?: (
    verified: boolean,
    method?: VerificationMethod,
  ) => void;
  /** Callback when key change is acknowledged */
  onKeyChangeAcknowledged?: () => void;
  /** Custom class name */
  className?: string;
}

interface VerificationState {
  loading: boolean;
  safetyNumber: string;
  formattedSafetyNumber: string;
  displayGrid: string[][];
  qrCodeData: string;
  isVerified: boolean;
  verifiedAt: string | null;
  verificationMethod: VerificationMethod | null;
  trustLevel: TrustLevel;
  hasKeyChanged: boolean;
  keyChangeHistory: IdentityKeyChange[];
  verificationHistory: VerificationRecord[];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SafetyNumberDialog({
  open,
  onOpenChange,
  localUserId,
  peerUserId,
  peerDisplayName,
  peerAvatarUrl,
  initialTab = "number",
  onVerificationChange,
  onKeyChangeAcknowledged,
  className,
}: SafetyNumberDialogProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [notes, setNotes] = useState("");
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [state, setState] = useState<VerificationState>({
    loading: true,
    safetyNumber: "",
    formattedSafetyNumber: "",
    displayGrid: [[], []],
    qrCodeData: "",
    isVerified: false,
    verifiedAt: null,
    verificationMethod: null,
    trustLevel: "unknown",
    hasKeyChanged: false,
    keyChangeHistory: [],
    verificationHistory: [],
  });

  // Load verification state on mount
  useEffect(() => {
    if (open) {
      loadVerificationState();
    }
    return () => {
      stopScanner();
    };
  }, [open, peerUserId]);

  const loadVerificationState = useCallback(async () => {
    try {
      setState((prev) => ({ ...prev, loading: true }));

      const response = await fetch(`/api/e2ee/verification/${peerUserId}`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to load verification state");
      }

      const data = await response.json();

      setState({
        loading: false,
        safetyNumber: data.safetyNumber,
        formattedSafetyNumber: data.formattedSafetyNumber,
        displayGrid: data.displayGrid || [[], []],
        qrCodeData: data.qrCodeData,
        isVerified: data.isVerified,
        verifiedAt: data.verifiedAt,
        verificationMethod: data.verificationMethod,
        trustLevel: data.trustLevel || "unknown",
        hasKeyChanged: data.hasKeyChanged || false,
        keyChangeHistory: data.keyChangeHistory || [],
        verificationHistory: data.verificationHistory || [],
      });
    } catch (error) {
      logger.error("Failed to load verification state:", error);
      toast({
        title: "Error",
        description: "Failed to load safety number information",
        variant: "destructive",
      });
      setState((prev) => ({ ...prev, loading: false }));
    }
  }, [peerUserId, toast]);

  const handleVerify = async (method: VerificationMethod) => {
    try {
      setVerifying(true);

      const safetyNumber =
        method === "numeric_comparison" ? manualInput : state.safetyNumber;

      const response = await fetch(
        `/api/e2ee/verification/${peerUserId}/verify`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            safetyNumber,
            method,
            notes: notes || undefined,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Verification failed");
      }

      toast({
        title: "Verified",
        description: `Safety number verified for ${peerDisplayName}`,
      });

      onVerificationChange?.(true, method);
      await loadVerificationState();
    } catch (error) {
      logger.error("Verification failed:", error);
      toast({
        title: "Verification Failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleUnverify = async () => {
    try {
      setVerifying(true);

      const response = await fetch(
        `/api/e2ee/verification/${peerUserId}/verify`,
        {
          method: "DELETE",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to remove verification");
      }

      toast({
        title: "Verification Removed",
        description: `Safety number unverified for ${peerDisplayName}`,
      });

      onVerificationChange?.(false);
      await loadVerificationState();
    } catch (error) {
      logger.error("Failed to unverify:", error);
      toast({
        title: "Error",
        description: "Failed to remove verification",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleAcknowledgeKeyChange = async () => {
    try {
      await fetch(
        `/api/e2ee/verification/${peerUserId}/acknowledge-key-change`,
        {
          method: "POST",
        },
      );

      onKeyChangeAcknowledged?.();
      await loadVerificationState();
    } catch (error) {
      logger.error("Failed to acknowledge key change:", error);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(state.formattedSafetyNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({
      title: "Copied",
      description: "Safety number copied to clipboard",
    });
  };

  const startScanner = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setScannerActive(true);
    } catch (error) {
      logger.error("Failed to start camera:", error);
      toast({
        title: "Camera Error",
        description: "Failed to access camera for QR scanning",
        variant: "destructive",
      });
    }
  };

  const stopScanner = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setScannerActive(false);
  };

  const handleQRScanned = async (data: string) => {
    try {
      stopScanner();

      const response = await fetch(
        `/api/e2ee/verification/${peerUserId}/scan`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ qrData: data }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "QR verification failed");
      }

      const result = await response.json();

      if (result.verified) {
        toast({
          title: "Verified",
          description: "QR code verification successful",
        });
        onVerificationChange?.(true, "qr_code_scan");
        await loadVerificationState();
      } else {
        toast({
          title: "Verification Failed",
          description: result.message || "QR code does not match",
          variant: "destructive",
        });
      }
    } catch (error) {
      logger.error("QR scan failed:", error);
      toast({
        title: "Scan Failed",
        description:
          error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const getTrustIcon = (trustLevel: TrustLevel) => {
    switch (trustLevel) {
      case "verified":
        return <ShieldCheck className="h-5 w-5 text-green-500" />;
      case "unverified":
        return <ShieldAlert className="h-5 w-5 text-yellow-500" />;
      case "compromised":
        return <ShieldAlert className="h-5 w-5 text-red-500" />;
      default:
        return <Shield className="h-5 w-5 text-gray-400" />;
    }
  };

  const getTrustBadge = (trustLevel: TrustLevel) => {
    switch (trustLevel) {
      case "verified":
        return (
          <Badge variant="default" className="bg-green-500">
            Verified
          </Badge>
        );
      case "unverified":
        return (
          <Badge variant="default" className="bg-yellow-500">
            Key Changed
          </Badge>
        );
      case "compromised":
        return <Badge variant="destructive">Compromised</Badge>;
      default:
        return <Badge variant="secondary">Not Verified</Badge>;
    }
  };

  if (state.loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className={cn("max-w-2xl", className)}>
          <DialogHeader>
            <DialogTitle>Loading Safety Number...</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn("max-w-2xl max-h-[90vh] overflow-y-auto", className)}
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {getTrustIcon(state.trustLevel)}
              <div>
                <DialogTitle className="text-xl">
                  Verify {peerDisplayName}
                </DialogTitle>
                <DialogDescription>
                  Ensure your messages are securely encrypted
                </DialogDescription>
              </div>
            </div>
            {getTrustBadge(state.trustLevel)}
          </div>
        </DialogHeader>

        {/* Key Change Warning */}
        {state.hasKeyChanged && state.trustLevel === "unverified" && (
          <Alert variant="destructive" className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Security Alert: Identity Key Changed</AlertTitle>
            <AlertDescription className="space-y-2">
              <p>
                {peerDisplayName}'s encryption key has changed. This could mean:
              </p>
              <ul className="list-disc list-inside text-sm">
                <li>They reinstalled the app</li>
                <li>They switched to a new device</li>
                <li>
                  Someone may be impersonating them (unlikely but possible)
                </li>
              </ul>
              <div className="mt-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAcknowledgeKeyChange}
                >
                  I Understand
                </Button>
                <Button size="sm" onClick={() => setActiveTab("number")}>
                  Verify New Key
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Verification Status */}
        {state.isVerified && !state.hasKeyChanged && (
          <Alert className="mt-4 border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Verified</AlertTitle>
            <AlertDescription className="text-green-700">
              You verified this safety number on{" "}
              {new Date(state.verifiedAt!).toLocaleDateString()}
              {state.verificationMethod && (
                <> via {state.verificationMethod.replace(/_/g, " ")}</>
              )}
            </AlertDescription>
          </Alert>
        )}

        <Tabs
          value={activeTab}
          onValueChange={(val) => setActiveTab(val as typeof activeTab)}
          className="mt-4"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="number">
              <span className="hidden sm:inline">Safety </span>Number
            </TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
            <TabsTrigger value="scan">Scan</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Safety Number Tab */}
          <TabsContent value="number" className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label>Your Safety Number with {peerDisplayName}</Label>
              <div className="relative">
                <div className="bg-muted rounded-lg p-4 font-mono text-lg text-center select-all">
                  {state.displayGrid.map((row, rowIndex) => (
                    <div
                      key={rowIndex}
                      className="flex justify-center gap-4 mb-2"
                    >
                      {row.map((group, groupIndex) => (
                        <span key={groupIndex} className="tracking-wider">
                          {group}
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-2 top-2"
                  onClick={handleCopy}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium">How to verify:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>
                  Contact {peerDisplayName} through another channel (call,
                  video, in person)
                </li>
                <li>
                  Compare the numbers above - they should be identical on both
                  devices
                </li>
                <li>If they match, click "Mark as Verified" below</li>
              </ol>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label htmlFor="manual-compare">
                Or enter their safety number to compare:
              </Label>
              <div className="flex gap-2">
                <Input
                  id="manual-compare"
                  placeholder="Enter 60-digit safety number"
                  value={manualInput}
                  onChange={(e) =>
                    setManualInput(e.target.value.replace(/[^0-9\s]/g, ""))
                  }
                  className="font-mono"
                />
                <Button
                  variant="secondary"
                  disabled={
                    manualInput.replace(/\s/g, "").length !== 60 || verifying
                  }
                  onClick={() => handleVerify("numeric_comparison")}
                >
                  Compare
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qr" className="space-y-4 mt-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg shadow-sm">
                <QRCodeSVG
                  value={state.qrCodeData}
                  size={200}
                  level="M"
                  includeMargin
                />
              </div>
              <p className="text-sm text-muted-foreground text-center max-w-sm">
                Have {peerDisplayName} scan this code with their device to
                verify your encryption keys match.
              </p>
            </div>

            <Alert>
              <Smartphone className="h-4 w-4" />
              <AlertDescription>
                Both parties should scan each other's codes. If both scans
                succeed, verification is complete.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* Scan Tab */}
          <TabsContent value="scan" className="space-y-4 mt-4">
            <div className="flex flex-col items-center space-y-4">
              {scannerActive ? (
                <>
                  <div className="relative w-full max-w-[300px] aspect-square bg-black rounded-lg overflow-hidden">
                    <video
                      ref={videoRef}
                      className="w-full h-full object-cover"
                      playsInline
                      muted
                    />
                    <div className="absolute inset-0 border-2 border-white/50 rounded-lg m-8" />
                  </div>
                  <Button variant="secondary" onClick={stopScanner}>
                    <X className="h-4 w-4 mr-2" />
                    Stop Scanner
                  </Button>
                </>
              ) : (
                <>
                  <div className="w-full max-w-[300px] aspect-square bg-muted rounded-lg flex items-center justify-center">
                    <Camera className="h-16 w-16 text-muted-foreground" />
                  </div>
                  <Button onClick={startScanner}>
                    <Camera className="h-4 w-4 mr-2" />
                    Start Scanner
                  </Button>
                </>
              )}
            </div>

            <Alert>
              <QrCodeIcon className="h-4 w-4" />
              <AlertDescription>
                Point your camera at {peerDisplayName}'s QR code to verify their
                identity.
              </AlertDescription>
            </Alert>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-4 mt-4">
            {state.verificationHistory.length === 0 &&
            state.keyChangeHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No verification history yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {state.keyChangeHistory.length > 0 && (
                  <Collapsible open={showHistory} onOpenChange={setShowHistory}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full justify-between"
                      >
                        <span className="flex items-center gap-2">
                          <AlertCircle className="h-4 w-4 text-yellow-500" />
                          Key Changes ({state.keyChangeHistory.length})
                        </span>
                        {showHistory ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-2 mt-2">
                      {state.keyChangeHistory.map((change, index) => (
                        <div
                          key={index}
                          className="p-3 bg-muted rounded-lg text-sm"
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <Clock className="h-3 w-3" />
                            <span className="text-muted-foreground">
                              {new Date(change.detectedAt).toLocaleString()}
                            </span>
                          </div>
                          <p>
                            Identity key changed
                            {change.wasVerified && (
                              <span className="text-yellow-600">
                                {" "}
                                (was verified)
                              </span>
                            )}
                          </p>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                )}

                <Separator />

                <div className="space-y-2">
                  <h4 className="font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    Verification History
                  </h4>
                  {state.verificationHistory.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No previous verifications
                    </p>
                  ) : (
                    state.verificationHistory.map((record, index) => (
                      <div
                        key={index}
                        className={cn(
                          "p-3 rounded-lg text-sm",
                          record.isValid ? "bg-green-50" : "bg-muted",
                        )}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium">
                            {record.method.replace(/_/g, " ")}
                          </span>
                          <Badge
                            variant={record.isValid ? "default" : "secondary"}
                          >
                            {record.isValid ? "Active" : "Superseded"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {new Date(record.verifiedAt).toLocaleString()}
                        </div>
                        {record.notes && (
                          <p className="mt-1 text-muted-foreground">
                            {record.notes}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Optional Notes */}
        {!state.isVerified && activeTab !== "history" && (
          <div className="space-y-2 mt-4">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="e.g., Verified in person at coffee shop"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
            />
          </div>
        )}

        <DialogFooter className="mt-6 gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          {state.isVerified ? (
            <Button
              variant="destructive"
              onClick={handleUnverify}
              disabled={verifying}
            >
              {verifying ? "Processing..." : "Remove Verification"}
            </Button>
          ) : (
            <Button
              onClick={() =>
                handleVerify(
                  activeTab === "qr" ? "qr_code_scan" : "numeric_comparison",
                )
              }
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Mark as Verified
                </>
              )}
            </Button>
          )}
        </DialogFooter>

        {/* Information Section */}
        <Collapsible className="mt-4">
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
            >
              <span>What is a safety number?</span>
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 p-4 bg-muted rounded-lg text-sm space-y-2">
            <p>
              A safety number is a unique fingerprint derived from your
              encryption keys and {peerDisplayName}'s encryption keys.
            </p>
            <p>
              If this number matches on both devices, you can be confident that
              your messages are encrypted end-to-end and not being intercepted.
            </p>
            <p className="text-muted-foreground">
              <strong>Note:</strong> This number will change if either of you
              reinstalls the app or switches devices. You'll see a security
              alert when this happens.
            </p>
          </CollapsibleContent>
        </Collapsible>
      </DialogContent>
    </Dialog>
  );
}

export default SafetyNumberDialog;
