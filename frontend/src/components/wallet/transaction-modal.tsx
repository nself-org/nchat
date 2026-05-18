"use client";

import * as React from "react";
import { Send, ArrowDownToLine, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useWallet } from "@/hooks/use-wallet";
import { useTransactions } from "@/hooks/use-transactions";
import { useWalletStore } from "@/stores/wallet-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function TransactionModal() {
  const { isTransactionModalOpen, setTransactionModalOpen } = useWalletStore();
  const { address, balance, weiToEther } = useWallet();
  const {
    sendETH,
    estimateGas,
    weiToEther: txWeiToEther,
    etherToWei,
  } = useTransactions();

  const [recipient, setRecipient] = React.useState("");
  const [amount, setAmount] = React.useState("");
  const [isSending, setIsSending] = React.useState(false);
  const [gasEstimate, setGasEstimate] = React.useState<string | null>(null);

  // Estimate gas when amount and recipient change
  React.useEffect(() => {
    const estimateTransactionGas = async () => {
      if (!recipient || !amount || !address) {
        setGasEstimate(null);
        return;
      }

      try {
        const amountWei = etherToWei(amount);
        const estimate = await estimateGas({ to: recipient, value: amountWei });

        if (estimate) {
          setGasEstimate(estimate.estimatedCostEther);
        }
      } catch {
        setGasEstimate(null);
      }
    };

    const debounce = setTimeout(estimateTransactionGas, 500);
    return () => clearTimeout(debounce);
  }, [recipient, amount, address, estimateGas, etherToWei]);

  const handleSend = async () => {
    if (!recipient || !amount) {
      toast.error("Please enter recipient and amount");
      return;
    }

    setIsSending(true);

    try {
      const result = await sendETH(recipient, amount);

      if (result.success) {
        toast.success("Transaction sent successfully", {
          description: `Hash: ${result.hash?.slice(0, 10)}...`,
        });
        setRecipient("");
        setAmount("");
        setTransactionModalOpen(false);
      } else {
        toast.error(result.error ?? "Failed to send transaction");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Transaction failed");
    } finally {
      setIsSending(false);
    }
  };

  const handleMaxAmount = () => {
    if (balance) {
      const balanceEth = parseFloat(weiToEther(balance));
      // Leave some for gas
      const maxAmount = Math.max(0, balanceEth - 0.001);
      setAmount(maxAmount.toFixed(6));
    }
  };

  return (
    <Dialog
      open={isTransactionModalOpen}
      onOpenChange={setTransactionModalOpen}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send & Receive</DialogTitle>
          <DialogDescription>Transfer crypto to other users</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="send" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="send" className="gap-2">
              <Send className="h-4 w-4" />
              Send
            </TabsTrigger>
            <TabsTrigger value="receive" className="gap-2">
              <ArrowDownToLine className="h-4 w-4" />
              Receive
            </TabsTrigger>
          </TabsList>

          <TabsContent value="send" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="0x..."
                value={recipient}
                onChange={(e) => setRecipient(e.target.value)}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="amount">Amount (ETH)</Label>
                {balance && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0 text-xs"
                    onClick={handleMaxAmount}
                  >
                    Max: {parseFloat(weiToEther(balance)).toFixed(4)} ETH
                  </Button>
                )}
              </div>
              <Input
                id="amount"
                type="number"
                step="0.000001"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            {gasEstimate && (
              <div className="rounded-lg border bg-muted p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Estimated Gas:</span>
                  <span className="font-medium">{gasEstimate} ETH</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Total Cost:</span>
                  <span className="font-medium">
                    {(
                      parseFloat(amount || "0") + parseFloat(gasEstimate)
                    ).toFixed(6)}{" "}
                    ETH
                  </span>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                onClick={handleSend}
                disabled={!recipient || !amount || isSending}
                className="w-full gap-2"
              >
                {isSending && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSending ? "Sending..." : "Send Transaction"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="receive" className="space-y-4">
            <div className="space-y-2">
              <Label>Your Address</Label>
              <div className="rounded-md border bg-muted p-3">
                <p className="break-all font-mono text-sm">{address}</p>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this address to receive crypto payments
              </p>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  if (address) {
                    navigator.clipboard.writeText(address);
                    toast.success("Address copied to clipboard");
                  }
                }}
              >
                Copy Address
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
