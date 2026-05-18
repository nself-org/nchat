/**
 * useNFTs Hook - Manage NFT operations
 *
 * Provides NFT fetching, ownership verification, and NFT gating
 */

import { useCallback } from "react";
import { useWalletStore } from "@/stores/wallet-store";
import { getTokenManager } from "@/lib/wallet/token-manager";
import { getWalletConnector } from "@/lib/wallet/wallet-connector";
import type { NFTInfo } from "@/lib/wallet/token-manager";

export function useNFTs() {
  const { address, chainId, nfts, isLoadingNFTs, setNFTs, setLoadingNFTs } =
    useWalletStore();

  const walletConnector = getWalletConnector();
  const tokenManager = getTokenManager(
    walletConnector.getEthereumProvider() ?? undefined,
  );

  // Get NFT owner
  const getNFTOwner = useCallback(
    async (contractAddress: string, tokenId: string) => {
      try {
        const result = await tokenManager.getNFTOwner(contractAddress, tokenId);
        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [tokenManager],
  );

  // Get NFT token URI
  const getNFTTokenURI = useCallback(
    async (contractAddress: string, tokenId: string) => {
      try {
        const result = await tokenManager.getNFTTokenURI(
          contractAddress,
          tokenId,
        );
        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [tokenManager],
  );

  // Get NFT balance for user
  const getNFTBalance = useCallback(
    async (contractAddress: string) => {
      if (!address) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        const result = await tokenManager.getNFTBalance(
          contractAddress,
          address,
        );
        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [address, tokenManager],
  );

  // Check if user owns specific NFT
  const isNFTOwner = useCallback(
    async (contractAddress: string, tokenId: string) => {
      if (!address) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        const result = await tokenManager.isNFTOwner(
          contractAddress,
          tokenId,
          address,
        );
        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [address, tokenManager],
  );

  // Check if user owns any NFT from collection (for NFT gating)
  const ownsNFTFromCollection = useCallback(
    async (contractAddress: string): Promise<boolean> => {
      if (!address) {
        return false;
      }

      try {
        const result = await tokenManager.getNFTBalance(
          contractAddress,
          address,
        );

        if (result.success && result.data !== undefined) {
          return result.data > 0;
        }

        return false;
      } catch {
        return false;
      }
    },
    [address, tokenManager],
  );

  // Transfer NFT
  const transferNFT = useCallback(
    async (contractAddress: string, to: string, tokenId: string) => {
      if (!address) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        const result = await tokenManager.transferNFT(
          contractAddress,
          address,
          to,
          tokenId,
        );
        return result;
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      }
    },
    [address, tokenManager],
  );

  // Fetch NFT metadata from token URI
  const fetchNFTMetadata = useCallback(
    async (tokenURI: string): Promise<Partial<NFTInfo> | null> => {
      try {
        // Handle IPFS URIs
        let fetchURI = tokenURI;
        if (tokenURI.startsWith("ipfs://")) {
          fetchURI = `https://ipfs.io/ipfs/${tokenURI.substring(7)}`;
        }

        const response = await fetch(fetchURI);
        if (!response.ok) {
          return null;
        }

        const metadata = await response.json();
        return {
          name: metadata.name,
          description: metadata.description,
          image: metadata.image?.startsWith("ipfs://")
            ? `https://ipfs.io/ipfs/${metadata.image.substring(7)}`
            : metadata.image,
          attributes: metadata.attributes,
        };
      } catch {
        return null;
      }
    },
    [],
  );

  // Fetch NFT collection for user
  const fetchUserNFTs = useCallback(
    async (contractAddresses: string[]) => {
      if (!address || !chainId) {
        return { success: false, error: "Wallet not connected" };
      }

      try {
        setLoadingNFTs(true);
        const fetchedNFTs: NFTInfo[] = [];

        for (const contractAddress of contractAddresses) {
          const balanceResult = await tokenManager.getNFTBalance(
            contractAddress,
            address,
          );

          if (
            balanceResult.success &&
            balanceResult.data &&
            balanceResult.data > 0
          ) {
            // For simplicity, we'll just fetch the first few NFTs
            // In production, you'd want to use a proper indexer like The Graph or Alchemy
            const maxTokensToFetch = Math.min(balanceResult.data, 10);

            for (let tokenId = 0; tokenId < maxTokensToFetch; tokenId++) {
              try {
                const ownerResult = await tokenManager.getNFTOwner(
                  contractAddress,
                  tokenId.toString(),
                );

                if (
                  ownerResult.success &&
                  ownerResult.data &&
                  ownerResult.data.toLowerCase() === address.toLowerCase()
                ) {
                  const uriResult = await tokenManager.getNFTTokenURI(
                    contractAddress,
                    tokenId.toString(),
                  );

                  let metadata: Partial<NFTInfo> = {};
                  if (uriResult.success && uriResult.data) {
                    metadata = (await fetchNFTMetadata(uriResult.data)) ?? {};
                  }

                  fetchedNFTs.push({
                    contractAddress,
                    tokenId: tokenId.toString(),
                    owner: address,
                    chainId,
                    ...metadata,
                  });
                }
              } catch {
                // Skip NFTs that fail to fetch
              }
            }
          }
        }

        setNFTs(fetchedNFTs);
        return { success: true, data: fetchedNFTs };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      } finally {
        setLoadingNFTs(false);
      }
    },
    [address, chainId, tokenManager, setNFTs, setLoadingNFTs, fetchNFTMetadata],
  );

  return {
    // State
    nfts,
    isLoadingNFTs,

    // Actions
    getNFTOwner,
    getNFTTokenURI,
    getNFTBalance,
    isNFTOwner,
    ownsNFTFromCollection,
    transferNFT,
    fetchNFTMetadata,
    fetchUserNFTs,
  };
}
