/**
 * Wallet Connector Component
 * Connect crypto wallets (MetaMask, Coinbase Wallet)
 */

"use client";

import { useState, useEffect } from "react";
import { Wallet, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  connectWallet,
  disconnectWallet,
  getWalletInfo,
  getAvailableWallets,
  switchNetwork,
  onAccountsChanged,
  onChainChanged,
  removeListeners,
  type WalletProvider,
  type WalletInfo,
} from "@/lib/crypto/wallet-connector";
import type { CryptoNetwork } from "@/types/billing";
import { CRYPTO_NETWORKS } from "@/config/billing-plans";

interface WalletConnectorProps {
  onConnect?: (info: WalletInfo) => void;
  onDisconnect?: () => void;
  requiredNetwork?: CryptoNetwork;
}

export function WalletConnector({
  onConnect,
  onDisconnect,
  requiredNetwork = "ethereum",
}: WalletConnectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<WalletProvider[]>(
    [],
  );

  useEffect(() => {
    // Check available wallets
    setAvailableWallets(getAvailableWallets());

    // Check if already connected
    loadWalletInfo();

    // Listen for account/network changes
    onAccountsChanged((accounts) => {
      if (accounts.length === 0) {
        handleDisconnect();
      } else {
        loadWalletInfo();
      }
    });

    onChainChanged(() => {
      loadWalletInfo();
    });

    return () => {
      removeListeners();
    };
  }, []);

  const loadWalletInfo = async () => {
    const info = await getWalletInfo();
    if (info) {
      setWalletInfo(info);
      if (onConnect) onConnect(info);
    }
  };

  const handleConnect = async (provider: WalletProvider) => {
    setIsConnecting(true);
    setError(null);

    try {
      const result = await connectWallet(provider);

      if (result.success && result.address && result.network) {
        const info: WalletInfo = {
          address: result.address,
          network: result.network,
          provider,
          balance: "0",
        };

        // Switch to required network if needed
        if (requiredNetwork && result.network !== requiredNetwork) {
          const switched = await switchNetwork(requiredNetwork);
          if (switched) {
            info.network = requiredNetwork;
          } else {
            setError(
              `Please switch to ${CRYPTO_NETWORKS[requiredNetwork].name}`,
            );
            setIsConnecting(false);
            return;
          }
        }

        // Load full wallet info
        const fullInfo = await getWalletInfo();
        if (fullInfo) {
          setWalletInfo(fullInfo);
          if (onConnect) onConnect(fullInfo);
        }

        setIsOpen(false);
      } else {
        setError(result.error || "Failed to connect wallet");
      }
    } catch (err: any) {
      setError(err.message || "Failed to connect wallet");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    await disconnectWallet();
    setWalletInfo(null);
    if (onDisconnect) onDisconnect();
  };

  const handleSwitchNetwork = async (network: CryptoNetwork) => {
    const success = await switchNetwork(network);
    if (success) {
      await loadWalletInfo();
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getWalletIcon = (provider: WalletProvider) => {
    // In production, use actual wallet logos
    return <Wallet className="h-5 w-5" />;
  };

  const getWalletName = (provider: WalletProvider) => {
    switch (provider) {
      case "metamask":
        return "MetaMask";
      case "coinbase":
        return "Coinbase Wallet";
      case "walletconnect":
        return "WalletConnect";
      default:
        return provider;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {walletInfo ? (
          <Button variant="outline" className="gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            {formatAddress(walletInfo.address)}
            <Badge variant="secondary" className="ml-1">
              {CRYPTO_NETWORKS[walletInfo.network].symbol}
            </Badge>
          </Button>
        ) : (
          <Button variant="default" className="gap-2">
            <Wallet className="h-4 w-4" />
            Connect Wallet
          </Button>
        )}
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {walletInfo ? "Wallet Connected" : "Connect Wallet"}
          </DialogTitle>
          <DialogDescription>
            {walletInfo
              ? "Manage your connected wallet"
              : "Choose a wallet to connect"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {walletInfo ? (
            /* Connected Wallet Info */
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Address</span>
                  <code className="font-mono text-sm">
                    {formatAddress(walletInfo.address)}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Network</span>
                  <Badge variant="secondary">
                    {CRYPTO_NETWORKS[walletInfo.network].name}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Balance</span>
                  <span className="text-sm font-medium">
                    {walletInfo.balance}{" "}
                    {CRYPTO_NETWORKS[walletInfo.network].symbol}
                  </span>
                </div>
              </div>

              {/* Network Switcher */}
              <div className="space-y-2">
                <p className="text-sm font-medium">Switch Network</p>
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(CRYPTO_NETWORKS).map(([key, network]) => (
                    <Button
                      key={key}
                      variant={
                        walletInfo.network === key ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => handleSwitchNetwork(key as CryptoNetwork)}
                      disabled={walletInfo.network === key}
                    >
                      {network.name}
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                variant="destructive"
                className="w-full"
                onClick={handleDisconnect}
              >
                Disconnect Wallet
              </Button>
            </div>
          ) : (
            /* Wallet Selection */
            <div className="space-y-3">
              {availableWallets.length === 0 ? (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No Web3 wallet detected. Please install MetaMask or Coinbase
                    Wallet.
                  </AlertDescription>
                </Alert>
              ) : (
                availableWallets.map((provider) => (
                  <Button
                    key={provider}
                    variant="outline"
                    className="h-auto w-full justify-start gap-3 py-3"
                    onClick={() => handleConnect(provider)}
                    disabled={isConnecting}
                  >
                    {isConnecting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      getWalletIcon(provider)
                    )}
                    <div className="flex-1 text-left">
                      <p className="font-medium">{getWalletName(provider)}</p>
                      <p className="text-xs text-muted-foreground">
                        Connect with {getWalletName(provider)}
                      </p>
                    </div>
                  </Button>
                ))
              )}

              <div className="border-t pt-4">
                <p className="text-center text-xs text-muted-foreground">
                  By connecting your wallet, you agree to our{" "}
                  <a href="/terms" className="underline">
                    Terms of Service
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="underline">
                    Privacy Policy
                  </a>
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
