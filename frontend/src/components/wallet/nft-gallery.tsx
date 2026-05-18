"use client";

import * as React from "react";
import { ImageIcon, RefreshCw, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useNFTs } from "@/hooks/use-nfts";
import { cn } from "@/lib/utils";
import type { NFTInfo } from "@/lib/wallet/token-manager";

interface NFTGalleryProps {
  className?: string;
  contractAddresses?: string[];
}

export function NFTGallery({
  className,
  contractAddresses = [],
}: NFTGalleryProps) {
  const { nfts, isLoadingNFTs, fetchUserNFTs } = useNFTs();
  const [selectedNFT, setSelectedNFT] = React.useState<NFTInfo | null>(null);

  const handleRefresh = async () => {
    if (contractAddresses.length > 0) {
      await fetchUserNFTs(contractAddresses);
    }
  };

  React.useEffect(() => {
    if (contractAddresses.length > 0) {
      fetchUserNFTs(contractAddresses);
    }
  }, [contractAddresses, fetchUserNFTs]);

  return (
    <>
      <div className={cn("space-y-4", className)}>
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <ImageIcon className="h-5 w-5" />
            NFTs
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoadingNFTs}
          >
            <RefreshCw
              className={cn("h-4 w-4", isLoadingNFTs && "animate-spin")}
            />
          </Button>
        </div>

        {isLoadingNFTs ? (
          <div className="flex h-48 items-center justify-center">
            <div className="text-center text-sm text-muted-foreground">
              <RefreshCw className="mx-auto mb-2 h-8 w-8 animate-spin" />
              Loading NFTs...
            </div>
          </div>
        ) : nfts.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-lg border border-dashed">
            <div className="text-center text-sm text-muted-foreground">
              <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
              No NFTs found
            </div>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="grid grid-cols-2 gap-4 p-1">
              {nfts.map((nft) => (
                <button
                  key={`${nft.contractAddress}-${nft.tokenId}`}
                  onClick={() => setSelectedNFT(nft)}
                  className="group relative overflow-hidden rounded-lg border bg-card transition-all hover:shadow-lg"
                >
                  {nft.image ? (
                    <div className="aspect-square overflow-hidden">
                      <img
                        src={nft.image}
                        alt={nft.name ?? `NFT #${nft.tokenId}`}
                        className="h-full w-full object-cover transition-transform group-hover:scale-105"
                      />
                    </div>
                  ) : (
                    <div className="flex aspect-square items-center justify-center bg-muted">
                      <ImageIcon className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <div className="p-2">
                    <p className="truncate text-sm font-medium">
                      {nft.name ?? `NFT #${nft.tokenId}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Token ID: {nft.tokenId}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* NFT Details Modal */}
      <Dialog open={!!selectedNFT} onOpenChange={() => setSelectedNFT(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {selectedNFT?.name ?? `NFT #${selectedNFT?.tokenId}`}
            </DialogTitle>
            <DialogDescription>
              Token ID: {selectedNFT?.tokenId}
            </DialogDescription>
          </DialogHeader>

          {selectedNFT && (
            <div className="space-y-4">
              {selectedNFT.image && (
                <div className="overflow-hidden rounded-lg border">
                  <img
                    src={selectedNFT.image}
                    alt={selectedNFT.name ?? `NFT #${selectedNFT.tokenId}`}
                    className="w-full"
                  />
                </div>
              )}

              {selectedNFT.description && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Description</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedNFT.description}
                  </p>
                </div>
              )}

              {selectedNFT.attributes && selectedNFT.attributes.length > 0 && (
                <div>
                  <h4 className="mb-2 text-sm font-semibold">Attributes</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedNFT.attributes.map((attr, index) => (
                      <div
                        key={index}
                        className="rounded-lg border bg-muted p-2"
                      >
                        <div className="text-xs text-muted-foreground">
                          {attr.trait_type}
                        </div>
                        <div className="text-sm font-medium">{attr.value}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2 rounded-lg border bg-muted p-3 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Contract</span>
                  <span className="font-mono">
                    {selectedNFT.contractAddress.slice(0, 6)}...
                    {selectedNFT.contractAddress.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Chain</span>
                  <span>{selectedNFT.chainId}</span>
                </div>
              </div>

              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => {
                  const explorerUrls: Record<string, string> = {
                    "0x1": "https://etherscan.io",
                    "0x89": "https://polygonscan.com",
                  };
                  const explorer = explorerUrls[selectedNFT.chainId];
                  if (explorer) {
                    window.open(
                      `${explorer}/token/${selectedNFT.contractAddress}?a=${selectedNFT.tokenId}`,
                      "_blank",
                    );
                  }
                }}
              >
                <ExternalLink className="h-4 w-4" />
                View on Explorer
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
