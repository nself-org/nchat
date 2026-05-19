"use client";

import * as React from "react";
import { Wallet } from "lucide-react";
import {
  WalletConnectButton,
  WalletModal,
  WalletStatus,
  TransactionModal,
  TokenList,
  NFTGallery,
  TransactionHistory,
  TokenGate,
  TokenGateBadge,
  TipButton,
} from "@/components/wallet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/hooks/use-wallet";

export default function WalletPage() {
  const { isConnected } = useWallet();

  return (
    <div data-testid="wallet-container" className="container mx-auto max-w-6xl space-y-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            <Wallet className="h-8 w-8" />
            Crypto Wallet
          </h1>
          <p className="mt-2 text-muted-foreground">
            Connect your wallet to access Web3 features
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? <WalletStatus /> : <WalletConnectButton />}
        </div>
      </div>

      {/* Main Content */}
      {isConnected ? (
        <Tabs defaultValue="tokens" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="tokens">Tokens</TabsTrigger>
            <TabsTrigger value="nfts">NFTs</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
          </TabsList>

          <TabsContent value="tokens" className="mt-6">
            <TokenList />
          </TabsContent>

          <TabsContent value="nfts" className="mt-6">
            <NFTGallery
              contractAddresses={
                [
                  // Add your NFT contract addresses here
                  // Example: '0x...'
                ]
              }
            />
          </TabsContent>

          <TabsContent value="transactions" className="mt-6">
            <TransactionHistory />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed p-16">
          <div className="max-w-md space-y-4 text-center">
            <Wallet className="mx-auto h-16 w-16 text-muted-foreground" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold">Connect Your Wallet</h2>
              <p className="text-sm text-muted-foreground">
                Connect your crypto wallet to view your tokens, NFTs, and
                transaction history
              </p>
            </div>
            <WalletConnectButton />
          </div>
        </div>
      )}

      {/* Demo Section - Token Gating */}
      <div className="space-y-4 rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Token Gating Demo</h2>
        <p className="text-sm text-muted-foreground">
          This section demonstrates token-gated content. Connect your wallet and
          hold the required tokens to access.
        </p>

        <TokenGate
          config={{
            type: "token",
            contractAddress: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48", // USDC on Ethereum
            minimumBalance: "1000000", // 1 USDC (6 decimals)
          }}
          fallback={
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Token gated content appears here when you hold sufficient tokens
              </p>
            </div>
          }
        >
          <div className="bg-primary/5 rounded-lg border p-8 text-center">
            <h3 className="text-lg font-semibold">Exclusive Content</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              You have access to this token-gated content!
            </p>
          </div>
        </TokenGate>
      </div>

      {/* Demo Section - Tipping */}
      <div className="space-y-4 rounded-lg border p-6">
        <h2 className="text-xl font-semibold">Crypto Tipping Demo</h2>
        <p className="text-sm text-muted-foreground">
          Send crypto tips to other users directly from messages
        </p>

        <div className="space-y-2 rounded-lg border bg-muted p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium">Sample Message</p>
              <p className="text-sm text-muted-foreground">
                This is a great idea! Thanks for sharing.
              </p>
            </div>
            <TipButton
              recipientAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
              recipientName="vitalik.eth"
              showLabel
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <WalletModal />
      <TransactionModal />
    </div>
  );
}
