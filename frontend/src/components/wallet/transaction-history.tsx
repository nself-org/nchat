"use client";

import * as React from "react";
import {
  History,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useWalletStore } from "@/stores/wallet-store";
import { useWallet } from "@/hooks/use-wallet";
import { cn } from "@/lib/utils";
import type { PendingTransaction } from "@/lib/wallet/transaction-manager";

interface TransactionHistoryProps {
  className?: string;
}

export function TransactionHistory({ className }: TransactionHistoryProps) {
  const { pendingTransactions } = useWalletStore();
  const { chainId } = useWallet();

  const getStatusIcon = (status: PendingTransaction["status"]) => {
    switch (status) {
      case "confirmed":
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-600" />;
      case "pending":
      case "submitted":
      case "confirming":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-600" />;
      case "cancelled":
        return <XCircle className="h-4 w-4 text-gray-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusText = (status: PendingTransaction["status"]) => {
    switch (status) {
      case "confirmed":
        return "Confirmed";
      case "failed":
        return "Failed";
      case "pending":
        return "Pending";
      case "submitted":
        return "Submitted";
      case "confirming":
        return "Confirming";
      case "cancelled":
        return "Cancelled";
      default:
        return status;
    }
  };

  const getExplorerUrl = (hash: string) => {
    const explorers: Record<string, string> = {
      "0x1": "https://etherscan.io",
      "0x5": "https://goerli.etherscan.io",
      "0xaa36a7": "https://sepolia.etherscan.io",
      "0x89": "https://polygonscan.com",
      "0x13881": "https://mumbai.polygonscan.com",
      "0xa4b1": "https://arbiscan.io",
      "0x2105": "https://basescan.org",
    };

    const explorer = chainId ? explorers[chainId] : explorers["0x1"];
    return `${explorer}/tx/${hash}`;
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (minutes > 0) return `${minutes}m ago`;
    return "Just now";
  };

  return (
    <div className={cn("space-y-4", className)}>
      <h3 className="flex items-center gap-2 text-lg font-semibold">
        <History className="h-5 w-5" />
        Transaction History
      </h3>

      {pendingTransactions.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center text-sm text-muted-foreground">
            <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
            No transactions yet
          </div>
        </div>
      ) : (
        <ScrollArea className="h-[400px] rounded-lg border">
          <div className="space-y-3 p-4">
            {pendingTransactions
              .slice()
              .reverse()
              .map((tx) => (
                <div
                  key={tx.hash}
                  className="flex items-start justify-between rounded-lg border bg-card p-3"
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(tx.status)}
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">
                          {getStatusText(tx.status)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatTimestamp(tx.submittedAt)}
                        </span>
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">
                        {tx.hash.slice(0, 10)}...{tx.hash.slice(-8)}
                      </div>
                      {tx.request.to && (
                        <div className="text-xs text-muted-foreground">
                          To: {tx.request.to.slice(0, 6)}...
                          {tx.request.to.slice(-4)}
                        </div>
                      )}
                      {tx.request.value && tx.request.value !== "0x0" && (
                        <div className="text-xs text-muted-foreground">
                          Value: {parseInt(tx.request.value, 16) / 1e18} ETH
                        </div>
                      )}
                      {tx.error && (
                        <div className="text-xs text-red-600">
                          Error: {tx.error}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() =>
                      window.open(getExplorerUrl(tx.hash), "_blank")
                    }
                  >
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                </div>
              ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
