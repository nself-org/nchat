"use client";

import * as React from "react";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useWalletStore } from "@/stores/wallet-store";
import { cn } from "@/lib/utils";

interface WalletConnectButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
}

export function WalletConnectButton({
  className,
  variant = "default",
  size = "default",
}: WalletConnectButtonProps) {
  const { isConnected, isConnecting, address, formatAddress } = useWallet();
  const { setWalletModalOpen } = useWalletStore();

  const handleClick = () => {
    if (!isConnected) {
      setWalletModalOpen(true);
    }
  };

  if (isConnected && address) {
    return (
      <Button
        variant={variant}
        size={size}
        className={cn("gap-2", className)}
        onClick={() => setWalletModalOpen(true)}
      >
        <Wallet className="h-4 w-4" />
        <span>{formatAddress(address)}</span>
      </Button>
    );
  }

  return (
    <Button
      variant={variant}
      size={size}
      className={cn("gap-2", className)}
      onClick={handleClick}
      disabled={isConnecting}
    >
      <Wallet className="h-4 w-4" />
      <span>{isConnecting ? "Connecting..." : "Connect Wallet"}</span>
    </Button>
  );
}
