/**
 * Purpose:    TipButton component — inline action for sending ETH micro-tips to a
 *             recipient address using the connected EIP-1193 wallet provider.
 * Inputs:     recipientAddress (hex), optional recipientName, optional showLabel flag.
 *             useWallet() for connected address, balance, weiToEther helper.
 * Outputs:    A ghost button that opens a modal dialog; sends eth_sendTransaction on confirm.
 * Constraints:Hidden when the recipient is the connected address.
 *             Requires an injected EIP-1193 provider (MetaMask et al) — no Ledger/WC support yet.
 * SOT:        F-NCHAT-VITE-ROUTE — /wallet
 */
import { useMemo, useState } from 'react'
import { Coins, Send } from 'lucide-react'
import { Button } from '@nself/ui'
import { useWallet } from './use-wallet'

const PRESET_TIPS = ['0.001', '0.005', '0.01', '0.05']

/** Inline tip button with a dialog for sending ETH to a recipient address. */
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
