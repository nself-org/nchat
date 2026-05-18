/**
 * Crypto Payment Component
 * Process cryptocurrency payments for subscriptions
 */

"use client";

import { useState } from "react";
import {
  Coins,
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { WalletConnector } from "./WalletConnector";
import type { WalletInfo } from "@/lib/crypto/wallet-connector";
import type { CryptoNetwork, PlanTier, BillingInterval } from "@/types/billing";
import { CRYPTO_NETWORKS, PLANS } from "@/config/billing-plans";
import { cn } from "@/lib/utils";

interface CryptoPaymentProps {
  planId: PlanTier;
  interval: BillingInterval;
  onPaymentComplete?: (txHash: string) => void;
  className?: string;
}

type CryptoCurrency = "ETH" | "USDC" | "USDT";

export function CryptoPayment({
  planId,
  interval,
  onPaymentComplete,
  className,
}: CryptoPaymentProps) {
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [selectedNetwork, setSelectedNetwork] =
    useState<CryptoNetwork>("ethereum");
  const [selectedCurrency, setSelectedCurrency] =
    useState<CryptoCurrency>("USDC");
  const [processing, setProcessing] = useState(false);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const plan = PLANS[planId];
  const price = interval === "month" ? plan.price.monthly : plan.price.yearly;

  // Get crypto price
  const getCryptoPrice = () => {
    if (!plan.price.cryptoMonthly) return 0;

    const monthlyPrice = plan.price.cryptoMonthly;
    const basePrice = interval === "month" ? 1 : 12;

    switch (selectedCurrency) {
      case "ETH":
        return monthlyPrice.eth * basePrice;
      case "USDC":
        return monthlyPrice.usdc * basePrice;
      case "USDT":
        return monthlyPrice.usdt * basePrice;
      default:
        return 0;
    }
  };

  const cryptoPrice = getCryptoPrice();

  // Payment address (in production, generate unique address per transaction)
  const paymentAddress = "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb";

  const handleWalletConnect = (info: WalletInfo) => {
    setWalletInfo(info);
    setSelectedNetwork(info.network);
  };

  const handleWalletDisconnect = () => {
    setWalletInfo(null);
    setError(null);
  };

  const handlePayment = async () => {
    if (!walletInfo) {
      setError("Please connect your wallet first");
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // In production, this would:
      // 1. Create a payment intent on the server
      // 2. Get a unique payment address
      // 3. Initiate the transaction via Web3
      // 4. Monitor for confirmations
      // 5. Update subscription status

      // For now, simulate payment
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Mock transaction hash
      const mockTxHash = `0x${Math.random().toString(16).substring(2, 66)}`;
      setTxHash(mockTxHash);

      if (onPaymentComplete) {
        onPaymentComplete(mockTxHash);
      }
    } catch (err: any) {
      setError(err.message || "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getBlockExplorerUrl = (txHash: string) => {
    const explorers: Record<CryptoNetwork, string> = {
      ethereum: `https://etherscan.io/tx/${txHash}`,
      polygon: `https://polygonscan.com/tx/${txHash}`,
      bsc: `https://bscscan.com/tx/${txHash}`,
      arbitrum: `https://arbiscan.io/tx/${txHash}`,
    };
    return explorers[selectedNetwork];
  };

  if (txHash) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
            Payment Submitted
          </CardTitle>
          <CardDescription>
            Your payment is being processed on the blockchain
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>Transaction Submitted</AlertTitle>
            <AlertDescription>
              Your payment has been submitted to the blockchain. It may take a
              few minutes to confirm.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label>Transaction Hash</Label>
            <div className="flex gap-2">
              <Input value={txHash} readOnly className="font-mono text-xs" />
              <Button
                variant="outline"
                size="icon"
                onClick={() => copyToClipboard(txHash)}
              >
                <Copy className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" asChild>
                <a
                  href={getBlockExplorerUrl(txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg border p-4 text-sm">
            <p className="mb-2 font-medium">What happens next?</p>
            <ol className="list-inside list-decimal space-y-1 text-muted-foreground">
              <li>Your transaction will be confirmed on the blockchain</li>
              <li>We'll verify the payment (usually takes 1-3 minutes)</li>
              <li>Your subscription will be activated</li>
              <li>You'll receive a confirmation email</li>
            </ol>
          </div>

          <Button className="w-full" onClick={() => window.location.reload()}>
            Return to Dashboard
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="h-6 w-6" />
          Pay with Cryptocurrency
        </CardTitle>
        <CardDescription>
          Subscribe to {plan.name} with crypto payments
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Wallet Connection */}
        <div className="flex items-center justify-between rounded-lg border p-4">
          <div>
            <p className="font-medium">Wallet</p>
            <p className="text-sm text-muted-foreground">
              {walletInfo ? "Connected" : "Connect your wallet to continue"}
            </p>
          </div>
          <WalletConnector
            onConnect={handleWalletConnect}
            onDisconnect={handleWalletDisconnect}
          />
        </div>

        {walletInfo && (
          <>
            {/* Network Selection */}
            <div className="space-y-2">
              <Label>Network</Label>
              <Select
                value={selectedNetwork}
                onValueChange={(v) => setSelectedNetwork(v as CryptoNetwork)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(CRYPTO_NETWORKS).map(([key, network]) => (
                    <SelectItem key={key} value={key}>
                      {network.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Currency Selection */}
            <div className="space-y-2">
              <Label>Currency</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(v) => setSelectedCurrency(v as CryptoCurrency)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ETH">
                    {CRYPTO_NETWORKS[selectedNetwork].symbol}
                  </SelectItem>
                  <SelectItem value="USDC">USDC</SelectItem>
                  <SelectItem value="USDT">USDT</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Summary */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-medium">Payment Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Plan</span>
                  <span className="font-medium">{plan.name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Billing</span>
                  <span className="font-medium capitalize">{interval}ly</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">USD Price</span>
                  <span className="font-medium">${price}</span>
                </div>
                <div className="flex items-center justify-between border-t pt-2">
                  <span className="font-medium">Total (Crypto)</span>
                  <Badge variant="default" className="px-3 py-1 text-base">
                    {cryptoPrice} {selectedCurrency}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Payment Address */}
            <div className="space-y-2">
              <Label>Payment Address</Label>
              <div className="flex gap-2">
                <Input
                  value={paymentAddress}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(paymentAddress)}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Pay Button */}
            <Button
              className="w-full"
              size="lg"
              onClick={handlePayment}
              disabled={processing}
            >
              {processing
                ? "Processing..."
                : `Pay ${cryptoPrice} ${selectedCurrency}`}
            </Button>

            {/* Info */}
            <div className="bg-muted/50 rounded-lg border p-4 text-sm text-muted-foreground">
              <p className="mb-2 font-medium text-foreground">Important:</p>
              <ul className="list-inside list-disc space-y-1">
                <li>
                  Send exactly {cryptoPrice} {selectedCurrency}
                </li>
                <li>Use {CRYPTO_NETWORKS[selectedNetwork].name} network</li>
                <li>Payment confirmation takes 1-3 minutes</li>
                <li>Do not send from an exchange (use a personal wallet)</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
