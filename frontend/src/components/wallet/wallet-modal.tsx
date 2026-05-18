"use client";

import * as React from "react";
import {
  Wallet,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Copy,
  LogOut,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useWallet } from "@/hooks/use-wallet";
import { useWalletStore } from "@/stores/wallet-store";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import type { WalletProvider } from "@/lib/wallet/wallet-connector";

const WALLET_PROVIDERS: Array<{
  id: WalletProvider;
  name: string;
  icon: string;
  description: string;
}> = [
  {
    id: "metamask",
    name: "MetaMask",
    icon: "🦊",
    description: "Connect with MetaMask browser extension",
  },
  {
    id: "coinbase",
    name: "Coinbase Wallet",
    icon: "🔵",
    description: "Connect with Coinbase Wallet",
  },
  {
    id: "walletconnect",
    name: "WalletConnect",
    icon: "🔗",
    description: "Scan QR code with your mobile wallet",
  },
];

export function WalletModal() {
  const { isWalletModalOpen, setWalletModalOpen } = useWalletStore();
  const {
    isConnected,
    address,
    balance,
    chainId,
    error,
    connect,
    disconnect,
    formatAddress,
    weiToEther,
    getAvailableProviders,
  } = useWallet();

  const [selectedProvider, setSelectedProvider] =
    React.useState<WalletProvider | null>(null);
  const availableProviders = getAvailableProviders();

  const handleConnect = async (provider: WalletProvider) => {
    setSelectedProvider(provider);
    const result = await connect({ provider });

    if (result.success) {
      toast.success("Wallet connected successfully");
      setWalletModalOpen(false);
    } else {
      toast.error(result.error ?? "Failed to connect wallet");
    }

    setSelectedProvider(null);
  };

  const handleDisconnect = async () => {
    await disconnect();
    toast.success("Wallet disconnected");
    setWalletModalOpen(false);
  };

  const handleCopyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      toast.success("Address copied to clipboard");
    }
  };

  const getBlockExplorerUrl = () => {
    if (!address || !chainId) return null;

    const explorers: Record<string, string> = {
      "0x1": "https://etherscan.io",
      "0x89": "https://polygonscan.com",
      "0xa4b1": "https://arbiscan.io",
      "0x2105": "https://basescan.org",
    };

    const explorer = explorers[chainId];
    return explorer ? `${explorer}/address/${address}` : null;
  };

  return (
    <Dialog open={isWalletModalOpen} onOpenChange={setWalletModalOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            {isConnected ? "Your Wallet" : "Connect Wallet"}
          </DialogTitle>
          <DialogDescription>
            {isConnected
              ? "Manage your wallet connection"
              : "Choose a wallet provider to connect"}
          </DialogDescription>
        </DialogHeader>

        {error && (
          <div className="border-destructive/50 bg-destructive/10 flex items-start gap-2 rounded-lg border p-3 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive" />
            <p className="flex-1 text-destructive">{error}</p>
          </div>
        )}

        {isConnected && address ? (
          <div className="space-y-4">
            {/* Connected Status */}
            <div className="bg-muted/50 flex items-center gap-2 rounded-lg border p-3">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Connected</span>
            </div>

            {/* Address */}
            <div className="space-y-2">
              <span className="text-sm font-medium">Address</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                  {formatAddress(address, 10, 8)}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyAddress}
                  title="Copy address"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                {getBlockExplorerUrl() && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() =>
                      window.open(getBlockExplorerUrl()!, "_blank")
                    }
                    title="View on block explorer"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>

            {/* Balance */}
            {balance && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Balance</span>
                <div className="rounded-md border bg-muted px-3 py-2 font-mono text-sm">
                  {parseFloat(weiToEther(balance)).toFixed(4)} ETH
                </div>
              </div>
            )}

            {/* Chain */}
            {chainId && (
              <div className="space-y-2">
                <span className="text-sm font-medium">Network</span>
                <div className="rounded-md border bg-muted px-3 py-2 text-sm">
                  {chainId === "0x1" && "Ethereum Mainnet"}
                  {chainId === "0x5" && "Goerli Testnet"}
                  {chainId === "0xaa36a7" && "Sepolia Testnet"}
                  {chainId === "0x89" && "Polygon"}
                  {chainId === "0x13881" && "Polygon Mumbai"}
                  {chainId === "0xa4b1" && "Arbitrum One"}
                  {chainId === "0x2105" && "Base"}
                  {![
                    "0x1",
                    "0x5",
                    "0xaa36a7",
                    "0x89",
                    "0x13881",
                    "0xa4b1",
                    "0x2105",
                  ].includes(chainId) && `Chain ID: ${chainId}`}
                </div>
              </div>
            )}

            {/* Disconnect Button */}
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={handleDisconnect}
            >
              <LogOut className="h-4 w-4" />
              Disconnect
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {WALLET_PROVIDERS.map((provider) => {
              const isAvailable = availableProviders.includes(provider.id);
              const isConnecting = selectedProvider === provider.id;

              return (
                <button
                  key={provider.id}
                  onClick={() => handleConnect(provider.id)}
                  disabled={!isAvailable || isConnecting}
                  className={cn(
                    "w-full rounded-lg border p-4 text-left transition-colors",
                    isAvailable
                      ? "hover:border-primary hover:bg-accent"
                      : "cursor-not-allowed opacity-50",
                    isConnecting && "border-primary bg-accent",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium">{provider.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {isConnecting
                          ? "Connecting..."
                          : !isAvailable
                            ? "Not available"
                            : provider.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}

            <p className="text-center text-xs text-muted-foreground">
              By connecting your wallet, you agree to our Terms of Service
            </p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
