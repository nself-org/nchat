/**
 * Token Gated Channel Component
 * Display and verify NFT/token requirements for channel access
 */

"use client";

import { useState, useEffect } from "react";
import {
  Lock,
  Unlock,
  Wallet,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { WalletConnector } from "./WalletConnector";
import type { TokenRequirement } from "@/types/billing";
import type { VerificationResult } from "@/lib/crypto/nft-verifier";
import { verifyTokenRequirement } from "@/lib/crypto/nft-verifier";
import type { WalletInfo } from "@/lib/crypto/wallet-connector";
import { CRYPTO_NETWORKS } from "@/config/billing-plans";
import { cn } from "@/lib/utils";

interface TokenGatedChannelProps {
  channelId: string;
  channelName: string;
  requirements: TokenRequirement[];
  onAccessGranted?: () => void;
  className?: string;
}

export function TokenGatedChannel({
  channelId,
  channelName,
  requirements,
  onAccessGranted,
  className,
}: TokenGatedChannelProps) {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verificationResults, setVerificationResults] = useState<
    Map<string, VerificationResult>
  >(new Map());
  const [hasAccess, setHasAccess] = useState(false);

  const activeRequirements = requirements.filter((r) => r.enabled);

  useEffect(() => {
    if (walletInfo) {
      verifyAccess();
    }
  }, [walletInfo]);

  const verifyAccess = async () => {
    if (!walletInfo) return;

    setVerifying(true);
    const results = new Map<string, VerificationResult>();

    try {
      for (const requirement of activeRequirements) {
        const result = await verifyTokenRequirement(
          requirement,
          walletInfo.address,
        );
        results.set(requirement.id, result);
      }

      setVerificationResults(results);

      // Check if all requirements are met
      const allVerified = Array.from(results.values()).every((r) => r.verified);
      setHasAccess(allVerified);

      if (allVerified && onAccessGranted) {
        onAccessGranted();
      }
    } catch (error) {
      console.error("Verification error:", error);
    } finally {
      setVerifying(false);
    }
  };

  const handleWalletConnect = (info: WalletInfo) => {
    setWalletInfo(info);
  };

  const handleWalletDisconnect = () => {
    setWalletInfo(null);
    setVerificationResults(new Map());
    setHasAccess(false);
  };

  const getTokenTypeLabel = (type: string) => {
    switch (type) {
      case "erc20":
        return "ERC-20 Token";
      case "erc721":
        return "NFT (ERC-721)";
      case "erc1155":
        return "NFT (ERC-1155)";
      default:
        return type;
    }
  };

  const RequirementCard = ({
    requirement,
  }: {
    requirement: TokenRequirement;
  }) => {
    const result = verificationResults.get(requirement.id);
    const verified = result?.verified ?? false;

    return (
      <div
        className={cn(
          "flex items-start gap-3 rounded-lg border p-4",
          verified && "border-green-500 bg-green-50",
          result && !verified && "border-red-500 bg-red-50",
        )}
      >
        <div className="mt-0.5">
          {!result && <Lock className="h-5 w-5 text-muted-foreground" />}
          {result && verified && (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          )}
          {result && !verified && <XCircle className="h-5 w-5 text-red-600" />}
        </div>

        <div className="flex-1 space-y-2">
          <div>
            <h4 className="font-medium">{requirement.name}</h4>
            {requirement.description && (
              <p className="text-sm text-muted-foreground">
                {requirement.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">
              {getTokenTypeLabel(requirement.tokenType)}
            </Badge>
            <Badge variant="outline">
              {CRYPTO_NETWORKS[requirement.network].name}
            </Badge>
            {requirement.minBalance && (
              <Badge variant="outline">Min: {requirement.minBalance}</Badge>
            )}
            {requirement.minTokenCount && (
              <Badge variant="outline">
                Min: {requirement.minTokenCount} NFTs
              </Badge>
            )}
          </div>

          <div className="font-mono text-xs text-muted-foreground">
            {requirement.contractAddress.slice(0, 10)}...
            {requirement.contractAddress.slice(-8)}
          </div>

          {result && (
            <div className="text-sm">
              {verified ? (
                <p className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Requirement met
                  {result.balance && ` (Balance: ${result.balance})`}
                </p>
              ) : (
                <p className="flex items-center gap-1 text-red-600">
                  <XCircle className="h-4 w-4" />
                  {result.error || "Requirement not met"}
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (activeRequirements.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Unlock className="h-5 w-5" />
            {channelName}
          </CardTitle>
          <CardDescription>This channel is publicly accessible</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          {channelName} - Token Gated
        </CardTitle>
        <CardDescription>
          Connect your wallet and verify token ownership to access this channel
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Wallet Connection */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Connect Wallet</p>
            <p className="text-sm text-muted-foreground">
              {walletInfo
                ? "Wallet connected"
                : "Connect your wallet to verify access"}
            </p>
          </div>
          <WalletConnector
            onConnect={handleWalletConnect}
            onDisconnect={handleWalletDisconnect}
          />
        </div>

        {/* Requirements */}
        {walletInfo && (
          <>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Token Requirements</h3>
                {verifying && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Verifying...
                  </div>
                )}
              </div>

              {activeRequirements.map((requirement) => (
                <RequirementCard
                  key={requirement.id}
                  requirement={requirement}
                />
              ))}
            </div>

            {/* Re-verify Button */}
            <Button
              variant="outline"
              className="w-full"
              onClick={verifyAccess}
              disabled={verifying}
            >
              {verifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                <>Re-verify Access</>
              )}
            </Button>

            {/* Access Status */}
            {verificationResults.size > 0 && (
              <Alert variant={hasAccess ? "default" : "destructive"}>
                {hasAccess ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Access Granted</AlertTitle>
                    <AlertDescription>
                      You meet all requirements for this channel. You can now
                      access the content.
                    </AlertDescription>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                      You do not meet all the requirements for this channel.
                      Please acquire the required tokens to gain access.
                    </AlertDescription>
                  </>
                )}
              </Alert>
            )}
          </>
        )}

        {/* Help Text */}
        {!walletInfo && (
          <div className="bg-muted/50 rounded-lg border p-4 text-sm text-muted-foreground">
            <h4 className="mb-2 font-medium text-foreground">How it works:</h4>
            <ol className="list-inside list-decimal space-y-1">
              <li>Connect your crypto wallet (MetaMask, Coinbase Wallet)</li>
              <li>We'll verify your token/NFT ownership</li>
              <li>
                If you meet the requirements, you'll gain access to the channel
              </li>
            </ol>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
