/**
 * Purpose:    NFT gallery component — displays the connected wallet's NFT holdings in a
 *             grid with a detail modal. Ported from the legacy NFTGallery component.
 * Inputs:     contractAddresses prop (optional filter); useWallet() for the connected address.
 * Outputs:    NFT grid with detail modal; degrades gracefully via AsyncScreen when the
 *             backend web3 indexer (BFF, N-2-S5) is not yet available.
 * Constraints:NFT reads require the backend indexer — list renders gracefully in
 *             loading/empty/error states until it is live. No stubs.
 * SOT:        F-NCHAT-VITE-ROUTE — /wallet
 */
import { useState } from 'react'
import { useQuery } from 'urql'
import { RefreshCw, ImageIcon, ExternalLink } from 'lucide-react'
import { Button, AsyncScreen } from '@nself/ui'
import { useWallet } from './use-wallet'
import { WALLET_NFTS_QUERY, type WalletNft, type WalletNftsData } from './wallet-gql'
import { toResult, explorerBase } from './wallet-helpers'

/** NFT gallery for the connected wallet. Shows the full collection with a detail modal on click. */
export function NFTGallery({ contractAddresses = [] }: { contractAddresses?: string[] }) {
  const { address } = useWallet()
  const [selected, setSelected] = useState<WalletNft | null>(null)
  const [result, reexecute] = useQuery<WalletNftsData>({
    query: WALLET_NFTS_QUERY,
    variables: { address: address ?? '', contractAddresses },
    pause: !address,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <ImageIcon className="h-5 w-5" />
          NFTs
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => reexecute({ requestPolicy: 'network-only' })}
          aria-label="Refresh NFTs"
        >
          <RefreshCw className={`h-4 w-4 ${result.fetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <AsyncScreen<WalletNftsData>
        result={toResult(result.fetching, result.error, result.data)}
        emptyCheck={(d) => (d.wallet_nfts?.length ?? 0) === 0}
        onRetry={() => reexecute({ requestPolicy: 'network-only' })}
        slots={{
          empty: (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-700">
              <div className="text-center text-sm text-slate-400">
                <ImageIcon className="mx-auto mb-2 h-8 w-8 opacity-50" />
                No NFTs found
              </div>
            </div>
          ),
        }}
        renderData={(d) => (
          <div className="grid max-h-[400px] grid-cols-2 gap-4 overflow-y-auto p-1">
            {d.wallet_nfts.map((nft: WalletNft) => (
              <button
                key={`${nft.contractAddress}-${nft.tokenId}`}
                onClick={() => setSelected(nft)}
                className="group overflow-hidden rounded-lg border border-slate-800 bg-slate-900 text-left transition-all hover:shadow-lg"
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
                  <div className="flex aspect-square items-center justify-center bg-slate-800">
                    <ImageIcon className="h-12 w-12 text-slate-500" />
                  </div>
                )}
                <div className="p-2">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {nft.name ?? `NFT #${nft.tokenId}`}
                  </p>
                  <p className="text-xs text-slate-400">Token ID: {nft.tokenId}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      />

      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg border border-slate-700 bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h4 className="text-lg font-semibold text-slate-100">
                {selected.name ?? `NFT #${selected.tokenId}`}
              </h4>
              <p className="text-sm text-slate-400">Token ID: {selected.tokenId}</p>
            </div>
            {selected.image && (
              <div className="overflow-hidden rounded-lg border border-slate-800">
                <img src={selected.image} alt={selected.name ?? `NFT #${selected.tokenId}`} className="w-full" />
              </div>
            )}
            {selected.description && (
              <div>
                <h5 className="mb-1 text-sm font-semibold text-slate-200">Description</h5>
                <p className="text-sm text-slate-400">{selected.description}</p>
              </div>
            )}
            <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Contract</span>
                <span className="font-mono text-slate-300">
                  {selected.contractAddress.slice(0, 6)}…{selected.contractAddress.slice(-4)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Chain</span>
                <span className="text-slate-300">{selected.chainId}</span>
              </div>
            </div>
            <Button
              variant="secondary"
              onClick={() => {
                const base = explorerBase(selected.chainId)
                window.open(`${base}/token/${selected.contractAddress}?a=${selected.tokenId}`, '_blank')
              }}
            >
              <ExternalLink className="me-2 h-4 w-4" />
              View on Explorer
            </Button>
            <Button variant="ghost" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
