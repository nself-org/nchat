/**
 * Purpose:    Transaction history component — lists recent on-chain transactions for
 *             the connected wallet with status icons and block-explorer links.
 * Inputs:     useWallet() for address + chainId; urql useQuery against WALLET_TX_HISTORY_QUERY.
 * Outputs:    Scrollable transaction list; degrades gracefully via AsyncScreen when the
 *             backend web3 RPC bridge (BFF, N-2-S5) is not yet available.
 * Constraints:TX reads require the backend indexer — list renders gracefully until live.
 * SOT:        F-NCHAT-VITE-ROUTE — /wallet
 */
import { useQuery } from 'urql'
import { History, ExternalLink, CheckCircle2, XCircle, Clock, Loader2 } from 'lucide-react'
import { Button, AsyncScreen } from '@nself/ui'
import { useWallet } from './use-wallet'
import { WALLET_TX_HISTORY_QUERY, type WalletTransaction, type WalletTxHistoryData } from './wallet-gql'
import { toResult, explorerBase, relativeTime } from './wallet-helpers'

/** Icon for a transaction's current status. */
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

/** Human-readable label for a transaction status value. */
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

/** Scrollable on-chain transaction history for the connected wallet. */
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
