"use client";

import * as React from "react";
import { Wallet, ChevronDown, RefreshCw } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useWalletStore } from "@/stores/wallet-store";
import { cn } from "@/lib/utils";

interface WalletStatusProps {
  className?: string;
}

export function WalletStatus({ className }: WalletStatusProps) {
  const {
    isConnected,
    address,
    balance,
    formatAddress,
    weiToEther,
    refreshBalance,
  } = useWallet();
  const { setWalletModalOpen, setTransactionModalOpen } = useWalletStore();
  const [isRefreshing, setIsRefreshing] = React.useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refreshBalance();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  if (!isConnected || !address) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn("gap-2", className)}>
          <Wallet className="h-4 w-4" />
          <div className="flex flex-col items-start">
            <span className="font-mono text-xs">{formatAddress(address)}</span>
            {balance && (
              <span className="text-xs text-muted-foreground">
                {parseFloat(weiToEther(balance)).toFixed(4)} ETH
              </span>
            )}
          </div>
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => setWalletModalOpen(true)}>
          <Wallet className="mr-2 h-4 w-4" />
          Wallet Details
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTransactionModalOpen(true)}>
          <Wallet className="mr-2 h-4 w-4" />
          Send/Receive
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleRefresh} disabled={isRefreshing}>
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")}
          />
          Refresh Balance
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setWalletModalOpen(true)}>
          Disconnect
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
