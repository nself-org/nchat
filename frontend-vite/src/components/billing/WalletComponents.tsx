/**
 * Purpose:    Crypto-wallet UI components barrel — WalletConnectButton, WalletStatus,
 *             TokenList, TokenGate (+hook +badge), TipButton. NFTGallery and TransactionHistory
 *             are split into WalletNFTs.tsx and WalletTxHistory.tsx; TokenGate/useTokenGate/
 *             TokenGateBadge into WalletTokenGate.tsx; TipButton into WalletTip.tsx.
 *             All are re-exported here so callers keep a single import path.
 * Inputs:     useWallet() (EIP-1193); urql useQuery against web3 Action contracts (wallet-gql.ts).
 * Outputs:    Wallet connect button, status bar, ERC-20 token list, and all gate variants.
 * Constraints:Token reads require the backend web3 RPC bridge (BFF, N-2-S5) which is NOT live
 *             yet — TokenList degrades gracefully via AsyncScreen.
 * SOT:        F-NCHAT-VITE-ROUTE — /wallet
 */
import { useState } from 'react'
import { useQuery } from 'urql'
import { Coins, RefreshCw, Wallet } from 'lucide-react'
import { Button, AsyncScreen } from '@nself/ui'
import { useWallet } from './use-wallet'
import { WALLET_TOKENS_QUERY, type WalletToken, type WalletTokensData } from './wallet-gql'
import { toResult } from './wallet-helpers'

// Re-export split components so callers importing from this file don't break.
export { NFTGallery } from './WalletNFTs'
export { TransactionHistory } from './WalletTxHistory'
export { useTokenGate, TokenGate, TokenGateBadge } from './WalletTokenGate'
export { TipButton } from './WalletTip'

/** Config for a token or NFT gate (defined here; imported by WalletTokenGate). */
export interface TokenGateConfig {
  type: 'token' | 'nft'
  contractAddress: string
  minimumBalance?: string
  tokenId?: string
}

// ── WalletConnectButton ───────────────────────────────────────────────────────

/** Primary connect-wallet CTA. Shows a loading state while connecting. */
export function WalletConnectButton() {
  const { connect, isConnecting, error } = useWallet()
  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="primary" loading={isConnecting} onClick={() => void connect()}>
        <Wallet className="me-2 h-4 w-4" />
        Connect Wallet
      </Button>
      {error && <span className="text-xs text-red-400">{error}</span>}
    </div>
  )
}

// ── WalletStatus ──────────────────────────────────────────────────────────────

/** Compact status bar showing the connected address, ETH balance, and disconnect action. */
export function WalletStatus() {
  const { isConnected, address, balance, formatAddress, weiToEther, refreshBalance, disconnect } =
    useWallet()
  const [refreshing, setRefreshing] = useState(false)

  if (!isConnected || !address) return null

  const handleRefresh = async () => {
    setRefreshing(true)
    await refreshBalance()
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <div className="flex items-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-3 py-2">
      <Wallet className="h-4 w-4 text-sky-400" />
      <div className="flex flex-col items-start">
        <span className="font-mono text-xs text-slate-200">{formatAddress(address)}</span>
        {balance && (
          <span className="text-xs text-slate-400">
            {parseFloat(weiToEther(balance)).toFixed(4)} ETH
          </span>
        )}
      </div>
      <Button variant="ghost" size="sm" onClick={() => void handleRefresh()} aria-label="Refresh balance">
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      </Button>
      <Button variant="ghost" size="sm" onClick={() => void disconnect()}>
        Disconnect
      </Button>
    </div>
  )
}

// ── TokenList ─────────────────────────────────────────────────────────────────

/** ERC-20 token holdings list for the connected wallet. */
export function TokenList() {
  const { address, chainId } = useWallet()
  const [result, reexecute] = useQuery<WalletTokensData>({
    query: WALLET_TOKENS_QUERY,
    variables: { address: address ?? '', chainId: chainId ?? '0x1' },
    pause: !address,
  })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
          <Coins className="h-5 w-5" />
          Tokens
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => reexecute({ requestPolicy: 'network-only' })}
          aria-label="Refresh tokens"
        >
          <RefreshCw className={`h-4 w-4 ${result.fetching ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      <AsyncScreen<WalletTokensData>
        result={toResult(result.fetching, result.error, result.data)}
        emptyCheck={(d) => (d.wallet_tokens?.length ?? 0) === 0}
        onRetry={() => reexecute({ requestPolicy: 'network-only' })}
        slots={{
          empty: (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-700">
              <div className="text-center text-sm text-slate-400">
                <Coins className="mx-auto mb-2 h-8 w-8 opacity-50" />
                No tokens found
              </div>
            </div>
          ),
        }}
        renderData={(d) => (
          <div className="max-h-[400px] space-y-2 overflow-y-auto rounded-lg border border-slate-800 p-4">
            {d.wallet_tokens.map((token: WalletToken) => (
              <div
                key={`${token.address}`}
                className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900 p-3"
              >
                <div className="flex items-center gap-3">
                  {token.logoUri ? (
                    <img src={token.logoUri} alt={token.symbol} className="h-8 w-8 rounded-full" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sky-500/10 text-xs font-bold text-sky-300">
                      {token.symbol.slice(0, 2)}
                    </div>
                  )}
                  <div>
                    <div className="font-medium text-slate-200">{token.symbol}</div>
                    <div className="text-xs text-slate-400">{token.name}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium text-slate-200">{token.balanceFormatted}</div>
                  <div className="text-xs text-slate-400">{token.symbol}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      />
    </div>
  )
}
