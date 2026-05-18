"use client";

import * as React from "react";
import { Coins, Send, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/hooks/use-wallet";
import { useTransactions } from "@/hooks/use-transactions";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface TipButtonProps {
  recipientAddress: string;
  recipientName?: string;
  className?: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "icon";
  showLabel?: boolean;
}

const PRESET_AMOUNTS = ["0.001", "0.005", "0.01", "0.05"];

export function TipButton({
  recipientAddress,
  recipientName,
  className,
  variant = "ghost",
  size = "sm",
  showLabel = false,
}: TipButtonProps) {
  const { isConnected, address, balance, weiToEther } = useWallet();
  const { sendETH, estimateGas, weiToEther: txWeiToEther } = useTransactions();

  const [isOpen, setIsOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [gasEstimate, setGasEstimate] = React.useState<string | null>(null);

  // Estimate gas when amount changes - must be before early return
  React.useEffect(() => {
    const estimateTipGas = async () => {
      if (!amount || !isOpen) {
        setGasEstimate(null);
        return;
      }

      try {
        const estimate = await estimateGas({
          to: recipientAddress,
          value: `0x${(parseFloat(amount) * 1e18).toString(16)}`,
        });

        if (estimate) {
          setGasEstimate(estimate.estimatedCostEther);
        }
      } catch {
        setGasEstimate(null);
      }
    };

    const debounce = setTimeout(estimateTipGas, 500);
    return () => clearTimeout(debounce);
  }, [amount, recipientAddress, estimateGas, isOpen]);

  // Don't show tip button for your own messages
  if (address?.toLowerCase() === recipientAddress.toLowerCase()) {
    return null;
  }

  const handleTip = async () => {
    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    setIsSending(true);

    try {
      const result = await sendETH(recipientAddress, amount);

      if (result.success) {
        toast.success(
          `Tip sent to ${recipientName ?? recipientAddress.slice(0, 8)}!`,
          {
            description: `${amount} ETH sent`,
          },
        );
        setAmount("");
        setIsOpen(false);
      } else {
        toast.error(result.error ?? "Failed to send tip");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to send tip");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant={variant}
          size={size}
          className={cn("gap-1.5", className)}
          disabled={!isConnected}
          title={!isConnected ? "Connect wallet to tip" : "Send tip"}
        >
          <Coins className="h-3.5 w-3.5" />
          {showLabel && <span>Tip</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send a Tip</DialogTitle>
          <DialogDescription>
            {recipientName
              ? `Send crypto to ${recipientName}`
              : `Send crypto to ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-6)}`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Preset Amounts */}
          <div className="space-y-2">
            <Label>Quick Amounts</Label>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_AMOUNTS.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  variant={amount === preset ? "default" : "outline"}
                  size="sm"
                  onClick={() => setAmount(preset)}
                >
                  {preset} ETH
                </Button>
              ))}
            </div>
          </div>

          {/* Custom Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="tip-amount">Custom Amount (ETH)</Label>
              {balance && (
                <span className="text-xs text-muted-foreground">
                  Balance: {parseFloat(weiToEther(balance)).toFixed(4)} ETH
                </span>
              )}
            </div>
            <Input
              id="tip-amount"
              type="number"
              step="0.001"
              placeholder="0.0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>

          {/* Gas Estimate */}
          {gasEstimate && (
            <div className="space-y-1 rounded-lg border bg-muted p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount:</span>
                <span className="font-medium">{amount} ETH</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gas Fee:</span>
                <span className="font-medium">{gasEstimate} ETH</span>
              </div>
              <div className="flex justify-between border-t pt-1">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">
                  {(
                    parseFloat(amount || "0") + parseFloat(gasEstimate)
                  ).toFixed(6)}{" "}
                  ETH
                </span>
              </div>
            </div>
          )}

          {/* Recipient Info */}
          <div className="rounded-lg border bg-muted p-3 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">To:</span>
              <span className="font-mono">
                {recipientAddress.slice(0, 10)}...{recipientAddress.slice(-8)}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsOpen(false)}
            disabled={isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleTip}
            disabled={!amount || parseFloat(amount) <= 0 || isSending}
            className="gap-2"
          >
            {isSending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Tip
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
