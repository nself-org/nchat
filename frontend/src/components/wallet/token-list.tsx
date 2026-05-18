"use client";

import * as React from "react";
import { Coins, RefreshCw, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useTokens } from "@/hooks/use-tokens";
import { useWalletStore } from "@/stores/wallet-store";
import { cn } from "@/lib/utils";

interface TokenListProps {
  className?: string;
  onTokenSelect?: (tokenAddress: string) => void;
}

export function TokenList({ className, onTokenSelect }: TokenListProps) {
  const { tokens, isLoadingTokens, fetchCommonTokens } = useTokens();
  const { setTransactionModalOpen, setSelectedToken } = useWalletStore();

  const handleRefresh = async () => {
    await fetchCommonTokens();
  };

  const handleTokenClick = (tokenAddress: string) => {
    if (onTokenSelect) {
      onTokenSelect(tokenAddress);
    }
  };

  const handleSendToken = (token: (typeof tokens)[0]) => {
    setSelectedToken(token);
    setTransactionModalOpen(true);
  };

  React.useEffect(() => {
    fetchCommonTokens();
  }, [fetchCommonTokens]);

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold">
          <Coins className="h-5 w-5" />
          Tokens
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          disabled={isLoadingTokens}
        >
          <RefreshCw
            className={cn("h-4 w-4", isLoadingTokens && "animate-spin")}
          />
        </Button>
      </div>

      {isLoadingTokens ? (
        <div className="flex h-48 items-center justify-center">
          <div className="text-center text-sm text-muted-foreground">
            <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin" />
            Loading tokens...
          </div>
        </div>
      ) : tokens.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
          <div className="text-center text-sm text-muted-foreground">
            <Coins className="mx-auto mb-2 h-8 w-8 opacity-50" />
            No tokens found
          </div>
        </div>
      ) : (
        <ScrollArea className="h-[400px] rounded-lg border">
          <div className="space-y-2 p-4">
            {tokens.map((token) => (
              <div
                key={`${token.token.chainId}-${token.token.address}`}
                className="flex cursor-pointer items-center justify-between rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                onClick={() => handleTokenClick(token.token.address)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleTokenClick(token.token.address);
                  }
                }}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-center gap-3">
                  {token.token.logoUri ? (
                    <img
                      src={token.token.logoUri}
                      alt={token.token.symbol}
                      className="h-8 w-8 rounded-full"
                    />
                  ) : (
                    <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold">
                      {token.token.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <div className="font-medium">{token.token.symbol}</div>
                    <div className="text-xs text-muted-foreground">
                      {token.token.name}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="text-right">
                    <div className="font-medium">{token.balanceFormatted}</div>
                    <div className="text-xs text-muted-foreground">
                      {token.token.symbol}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSendToken(token);
                    }}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
