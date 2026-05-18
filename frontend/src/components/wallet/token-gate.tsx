"use client";

import * as React from "react";
import { Lock, Unlock, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useTokens } from "@/hooks/use-tokens";
import { useNFTs } from "@/hooks/use-nfts";
import { useWalletStore } from "@/stores/wallet-store";
import { cn } from "@/lib/utils";

interface TokenGateConfig {
  type: "token" | "nft";
  contractAddress: string;
  minimumBalance?: string; // For ERC-20 tokens
  tokenId?: string; // For specific NFT
  chainId?: string;
}

interface TokenGateProps {
  config: TokenGateConfig;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
}

export function TokenGate({
  config,
  children,
  fallback,
  className,
}: TokenGateProps) {
  const { isConnected } = useWallet();
  const { hasMinimumTokenBalance } = useTokens();
  const { isNFTOwner, ownsNFTFromCollection } = useNFTs();
  const { setWalletModalOpen } = useWalletStore();

  const [hasAccess, setHasAccess] = React.useState<boolean | null>(null);
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    const checkAccess = async () => {
      if (!isConnected) {
        setHasAccess(false);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);

      try {
        if (config.type === "token" && config.minimumBalance) {
          const hasBalance = await hasMinimumTokenBalance(
            config.contractAddress,
            config.minimumBalance,
          );
          setHasAccess(hasBalance);
        } else if (config.type === "nft") {
          if (config.tokenId) {
            // Check for specific NFT
            const result = await isNFTOwner(
              config.contractAddress,
              config.tokenId,
            );
            setHasAccess(
              result.success && "data" in result && result.data === true,
            );
          } else {
            // Check for any NFT from collection
            const ownsNFT = await ownsNFTFromCollection(config.contractAddress);
            setHasAccess(ownsNFT);
          }
        } else {
          setHasAccess(false);
        }
      } catch {
        setHasAccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [
    isConnected,
    config,
    hasMinimumTokenBalance,
    isNFTOwner,
    ownsNFTFromCollection,
  ]);

  if (isChecking) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-center">
          <Lock className="mx-auto mb-2 h-8 w-8 animate-pulse text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Checking access...</p>
        </div>
      </div>
    );
  }

  if (hasAccess) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className={cn("flex items-center justify-center p-8", className)}>
      <div className="max-w-md space-y-4 text-center">
        <Lock className="mx-auto h-12 w-12 text-muted-foreground" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Access Restricted</h3>
          <p className="text-sm text-muted-foreground">
            {!isConnected
              ? "Connect your wallet to access this content"
              : config.type === "token"
                ? `You need to hold ${config.minimumBalance} tokens to access this content`
                : "You need to own an NFT from this collection to access this content"}
          </p>
        </div>
        {!isConnected && (
          <Button onClick={() => setWalletModalOpen(true)} className="gap-2">
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </Button>
        )}
      </div>
    </div>
  );
}

// Simpler hook-based version for conditional rendering
export function useTokenGate(config: TokenGateConfig): {
  hasAccess: boolean;
  isChecking: boolean;
} {
  const { isConnected } = useWallet();
  const { hasMinimumTokenBalance } = useTokens();
  const { isNFTOwner, ownsNFTFromCollection } = useNFTs();

  const [hasAccess, setHasAccess] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(true);

  React.useEffect(() => {
    const checkAccess = async () => {
      if (!isConnected) {
        setHasAccess(false);
        setIsChecking(false);
        return;
      }

      setIsChecking(true);

      try {
        if (config.type === "token" && config.minimumBalance) {
          const hasBalance = await hasMinimumTokenBalance(
            config.contractAddress,
            config.minimumBalance,
          );
          setHasAccess(hasBalance);
        } else if (config.type === "nft") {
          if (config.tokenId) {
            const result = await isNFTOwner(
              config.contractAddress,
              config.tokenId,
            );
            setHasAccess(
              result.success && "data" in result && result.data === true,
            );
          } else {
            const ownsNFT = await ownsNFTFromCollection(config.contractAddress);
            setHasAccess(ownsNFT);
          }
        } else {
          setHasAccess(false);
        }
      } catch {
        setHasAccess(false);
      } finally {
        setIsChecking(false);
      }
    };

    checkAccess();
  }, [
    isConnected,
    config,
    hasMinimumTokenBalance,
    isNFTOwner,
    ownsNFTFromCollection,
  ]);

  return { hasAccess, isChecking };
}

// Badge component to show token gate status
interface TokenGateBadgeProps {
  config: TokenGateConfig;
  className?: string;
}

export function TokenGateBadge({ config, className }: TokenGateBadgeProps) {
  const { hasAccess, isChecking } = useTokenGate(config);

  if (isChecking) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 text-xs text-muted-foreground",
          className,
        )}
      >
        <Lock className="h-3 w-3 animate-pulse" />
        Checking...
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium",
        hasAccess
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        className,
      )}
    >
      {hasAccess ? (
        <>
          <Unlock className="h-3 w-3" />
          Access Granted
        </>
      ) : (
        <>
          <Lock className="h-3 w-3" />
          Locked
        </>
      )}
    </div>
  );
}
