/**
 * Purpose:    Crypto-wallet UI components — ported 1:1 from the legacy
 *             frontend/src/components/wallet/* set: WalletStatus, TokenList, NFTGallery,
 *             TransactionHistory, TokenGate (+ badge), and TipButton. Group-local to the
 *             billing port so the Vite SPA carries no dependency on the legacy zustand
 *             store / wallet-manager libs.
 * Inputs:     useWallet() (EIP-1193); urql useQuery against web3 Action contracts
 *             (wallet-gql.ts). Per-component props mirror the legacy components.
 * Outputs:    Token/NFT/transaction lists, token-gated content, and a tip dialog.
 * Constraints:Token/NFT/tx reads require the backend web3 RPC bridge (BFF, N-2-S5) which
 *             is NOT live yet — those lists render @nself/ui AsyncScreen loading/empty/
 *             error states and degrade gracefully (no stubs). Tip send + token-gate
 *             balance check use the connected wallet's provider directly so they are real
 *             where a wallet + chain are present.
 * SOT:        F-NCHAT-VITE-ROUTE — /wallet
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useQuery } from 'urql'
import {
  Coins,
  RefreshCw,
  Send,
  History,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  ImageIcon,
  Lock,
  Unlock,
  Wallet,
} from 'lucide-react'
import { Button, AsyncScreen } from '@nself/ui'
import { ok, err, type Result, type AppError } from '@nself/errors'
import { useWallet } from './use-wallet'
import {
  WALLET_TOKENS_QUERY,
  WALLET_NFTS_QUERY,
  WALLET_TX_HISTORY_QUERY,
  type WalletToken,
  type WalletNft,
  type WalletTransaction,
  type WalletTokensData,
  type WalletNftsData,
  type WalletTxHistoryData,
} from './wallet-gql'

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Map a urql query into the Result<T,AppError>|'loading' shape AsyncScreen expects. */
function toResult<T>(
  fetching: boolean,
  error: unknown,
  data: T | undefined,
): Result<T, AppError> | 'loading' {
  if (fetching) return 'loading'
  if (error) {
    return err({
      code: 'INTERNAL',
      message: error instanceof Error ? error.message : 'Request failed',
    } as AppError)
  }
  return ok((data ?? ([] as unknown as T)) as T)
}

function explorerBase(chainId: string | null): string {
  const map: Record<string, string> = {
    '0x1': 'https://etherscan.io',
    '0x5': 'https://goerli.etherscan.io',
    '0xaa36a7': 'https://sepolia.etherscan.io',
    '0x89': 'https://polygonscan.com',
    '0x13881': 'https://mumbai.polygonscan.com',
    '0xa4b1': 'https://arbiscan.io',
    '0x2105': 'https://basescan.org',
  }
  return (chainId && map[chainId]) || map['0x1']
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}

// ── WalletConnectButton ───────────────────────────────────────────────────────

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

export function TokenList() {
  const { address, chainId } = useWallet()
  const [result, reexecute] = useQuery<WalletTokensData>({
    query: WALLET_TOKENS_QUERY,
    variables: { address: address ?? '', chainId: chainId ?? '0x1' },
    pause: !address,
  })
  const tokens = result.data?.wallet_tokens ?? []

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
      {tokens.length === 0 && !result.fetching && !result.error && null}
    </div>
  )
}

// ── NFTGallery ────────────────────────────────────────────────────────────────

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

      {/* NFT detail modal */}
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

// ── TransactionHistory ──────────────────────────────────────────────────────────

function txStatusIcon(status: WalletTransaction['status']) {
  switch (status) {
    case 'confirmed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-400" />
    case 'failed':
      return <XCircle className="h-4 w-4 text-red-400" />
    case 'cancelled':
      return <XCircle className="h-4 w-4 text-slate-400" />
    case 'pending':
    case 'submitted':
    case 'confirming':
      return <Loader2 className="h-4 w-4 animate-spin text-sky-400" />
    default:
      return <Clock className="h-4 w-4 text-slate-400" />
  }
}

function txStatusText(status: WalletTransaction['status']): string {
  const map: Record<WalletTransaction['status'], string> = {
    confirmed: 'Confirmed',
    failed: 'Failed',
    pending: 'Pending',
    submitted: 'Submitted',
    confirming: 'Confirming',
    cancelled: 'Cancelled',
  }
  return map[status] ?? status
}

export function TransactionHistory() {
  const { address, chainId } = useWallet()
  const [result, reexecute] = useQuery<WalletTxHistoryData>({
    query: WALLET_TX_HISTORY_QUERY,
    variables: { address: address ?? '', chainId: chainId ?? '0x1' },
    pause: !address,
  })

  return (
    <div className="space-y-4">
      <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
        <History className="h-5 w-5" />
        Transaction History
      </h3>
      <AsyncScreen<WalletTxHistoryData>
        result={toResult(result.fetching, result.error, result.data)}
        emptyCheck={(d) => (d.wallet_transactions?.length ?? 0) === 0}
        onRetry={() => reexecute({ requestPolicy: 'network-only' })}
        slots={{
          empty: (
            <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-slate-700">
              <div className="text-center text-sm text-slate-400">
                <History className="mx-auto mb-2 h-8 w-8 opacity-50" />
                No transactions yet
              </div>
            </div>
          ),
        }}
        renderData={(d) => (
          <div className="max-h-[400px] space-y-3 overflow-y-auto rounded-lg border border-slate-800 p-4">
            {d.wallet_transactions.map((tx: WalletTransaction) => (
              <div
                key={tx.hash}
                className="flex items-start justify-between rounded-lg border border-slate-800 bg-slate-900 p-3"
              >
                <div className="flex items-start gap-3">
                  {txStatusIcon(tx.status)}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-200">{txStatusText(tx.status)}</span>
                      <span className="text-xs text-slate-400">{relativeTime(tx.submittedAt)}</span>
                    </div>
                    <div className="font-mono text-xs text-slate-400">
                      {tx.hash.slice(0, 10)}…{tx.hash.slice(-8)}
                    </div>
                    {tx.to && (
                      <div className="text-xs text-slate-400">
                        To: {tx.to.slice(0, 6)}…{tx.to.slice(-4)}
                      </div>
                    )}
                    {tx.value && tx.value !== '0x0' && (
                      <div className="text-xs text-slate-400">
                        Value: {Number(BigInt(tx.value)) / 1e18} ETH
                      </div>
                    )}
                    {tx.error && <div className="text-xs text-red-400">Error: {tx.error}</div>}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => window.open(`${explorerBase(chainId)}/tx/${tx.hash}`, '_blank')}
                  aria-label="View on explorer"
                >
                  <ExternalLink className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        )}
      />
    </div>
  )
}

// ── TokenGate (+ hook + badge) ──────────────────────────────────────────────────

export interface TokenGateConfig {
  type: 'token' | 'nft'
  contractAddress: string
  minimumBalance?: string
  tokenId?: string
}

/**
 * ERC-20 balanceOf via the connected wallet's provider (real eth_call). Returns true
 * when balance >= minimumBalance. NFT ownership enumeration needs the indexer (web3
 * bridge, BFF-pending) — for NFT gates we conservatively return false until it lands.
 */
export function useTokenGate(config: TokenGateConfig): { hasAccess: boolean; isChecking: boolean } {
  const { isConnected, address } = useWallet()
  const [hasAccess, setHasAccess] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    let active = true
    const check = async () => {
      if (!isConnected || !address) {
        if (active) {
          setHasAccess(false)
          setIsChecking(false)
        }
        return
      }
      setIsChecking(true)
      try {
        if (config.type === 'token' && config.minimumBalance) {
          const provider = window.ethereum
          if (!provider) throw new Error('No provider')
          // balanceOf(address) selector 0x70a08231 + 32-byte padded address.
          const data = `0x70a08231000000000000000000000000${address.slice(2)}`
          const hex = (await provider.request({
            method: 'eth_call',
            params: [{ to: config.contractAddress, data }, 'latest'],
          })) as string
          const balance = BigInt(hex || '0x0')
          if (active) setHasAccess(balance >= BigInt(config.minimumBalance))
        } else {
          // NFT ownership requires the indexer (BFF-pending) — deny until available.
          if (active) setHasAccess(false)
        }
      } catch {
        if (active) setHasAccess(false)
      } finally {
        if (active) setIsChecking(false)
      }
    }
    void check()
    return () => {
      active = false
    }
  }, [isConnected, address, config])

  return { hasAccess, isChecking }
}

export function TokenGate({
  config,
  children,
  fallback,
}: {
  config: TokenGateConfig
  children: ReactNode
  fallback?: ReactNode
}) {
  const { isConnected, connect } = useWallet()
  const { hasAccess, isChecking } = useTokenGate(config)

  if (isChecking) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Lock className="mx-auto mb-2 h-8 w-8 animate-pulse text-slate-400" />
          <p className="text-sm text-slate-400">Checking access…</p>
        </div>
      </div>
    )
  }
  if (hasAccess) return <>{children}</>
  if (fallback) return <>{fallback}</>

  return (
    <div className="flex items-center justify-center p-8">
      <div className="max-w-md space-y-4 text-center">
        <Lock className="mx-auto h-12 w-12 text-slate-400" />
        <div className="space-y-2">
          <h3 className="text-lg font-semibold text-slate-100">Access Restricted</h3>
          <p className="text-sm text-slate-400">
            {!isConnected
              ? 'Connect your wallet to access this content'
              : config.type === 'token'
                ? `You need to hold ${config.minimumBalance} tokens to access this content`
                : 'You need to own an NFT from this collection to access this content'}
          </p>
        </div>
        {!isConnected && (
          <Button variant="primary" onClick={() => void connect()}>
            <Wallet className="me-2 h-4 w-4" />
            Connect Wallet
          </Button>
        )}
      </div>
    </div>
  )
}

export function TokenGateBadge({ config }: { config: TokenGateConfig }) {
  const { hasAccess, isChecking } = useTokenGate(config)
  if (isChecking) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
        <Lock className="h-3 w-3 animate-pulse" />
        Checking…
      </span>
    )
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
        hasAccess ? 'bg-emerald-900 text-emerald-200' : 'bg-red-900 text-red-200'
      }`}
    >
      {hasAccess ? (
        <>
          <Unlock className="h-3 w-3" />
          Access Granted
        </>
      ) : (
        <>
          <Lock className="h-3 w-3" />
          Locked
        </>
      )}
    </span>
  )
}

// ── TipButton ─────────────────────────────────────────────────────────────────

const PRESET_TIPS = ['0.001', '0.005', '0.01', '0.05']

export function TipButton({
  recipientAddress,
  recipientName,
  showLabel = false,
}: {
  recipientAddress: string
  recipientName?: string
  showLabel?: boolean
}) {
  const { isConnected, address, balance, weiToEther } = useWallet()
  const [open, setOpen] = useState(false)
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; msg: string } | null>(null)

  const isOwnAddress = useMemo(
    () => address?.toLowerCase() === recipientAddress.toLowerCase(),
    [address, recipientAddress],
  )
  if (isOwnAddress) return null

  const handleTip = async () => {
    const value = parseFloat(amount)
    if (!amount || value <= 0) {
      setFeedback({ type: 'err', msg: 'Please enter a valid amount' })
      return
    }
    setSending(true)
    setFeedback(null)
    try {
      const provider = window.ethereum
      if (!provider || !address) throw new Error('Wallet not connected')
      const weiHex = '0x' + BigInt(Math.floor(value * 1e18)).toString(16)
      const hash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [{ from: address, to: recipientAddress, value: weiHex }],
      })) as string
      setFeedback({
        type: 'ok',
        msg: `Tip sent to ${recipientName ?? recipientAddress.slice(0, 8)} (${hash.slice(0, 10)}…)`,
      })
      setAmount('')
      setOpen(false)
    } catch (e) {
      setFeedback({ type: 'err', msg: e instanceof Error ? e.message : 'Failed to send tip' })
    } finally {
      setSending(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        disabled={!isConnected}
        title={!isConnected ? 'Connect wallet to tip' : 'Send tip'}
        onClick={() => setOpen(true)}
      >
        <Coins className="me-1.5 h-3.5 w-3.5" />
        {showLabel && <span>Tip</span>}
      </Button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-md space-y-4 rounded-lg border border-slate-700 bg-slate-900 p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h4 className="text-lg font-semibold text-slate-100">Send a Tip</h4>
              <p className="text-sm text-slate-400">
                {recipientName
                  ? `Send crypto to ${recipientName}`
                  : `Send crypto to ${recipientAddress.slice(0, 8)}…${recipientAddress.slice(-6)}`}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm text-slate-300">Quick Amounts</label>
              <div className="grid grid-cols-4 gap-2">
                {PRESET_TIPS.map((p) => (
                  <Button
                    key={p}
                    variant={amount === p ? 'primary' : 'secondary'}
                    size="sm"
                    onClick={() => setAmount(p)}
                  >
                    {p} ETH
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="tip-amount" className="block text-sm text-slate-300">
                  Custom Amount (ETH)
                </label>
                {balance && (
                  <span className="text-xs text-slate-400">
                    Balance: {parseFloat(weiToEther(balance)).toFixed(4)} ETH
                  </span>
                )}
              </div>
              <input
                id="tip-amount"
                type="number"
                step="0.001"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200"
              />
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950 p-3 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">To:</span>
                <span className="font-mono text-slate-300">
                  {recipientAddress.slice(0, 10)}…{recipientAddress.slice(-8)}
                </span>
              </div>
            </div>

            {feedback && (
              <p className={`text-sm ${feedback.type === 'ok' ? 'text-emerald-400' : 'text-red-400'}`}>
                {feedback.msg}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="secondary" disabled={sending} onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={sending}
                disabled={!amount || parseFloat(amount) <= 0}
                onClick={() => void handleTip()}
              >
                <Send className="me-2 h-4 w-4" />
                Send Tip
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
