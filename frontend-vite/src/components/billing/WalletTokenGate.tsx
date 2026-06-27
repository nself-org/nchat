/**
 * Purpose:    Token/NFT gate components — useTokenGate hook, TokenGate wrapper, and
 *             TokenGateBadge inline badge. Restricts content to wallets satisfying an
 *             ERC-20 balance or NFT ownership requirement.
 * Inputs:     TokenGateConfig (type, contractAddress, minimumBalance, tokenId).
 *             useWallet() for connected address + connect action.
 * Outputs:    TokenGate renders children on access, fallback/prompt on denial.
 *             TokenGateBadge shows a compact granted/locked badge.
 * Constraints:NFT ownership requires the web3 indexer (BFF, N-2-S5 — not live yet);
 *             NFT gates conservatively deny until the bridge is available.
 * SOT:        F-NCHAT-VITE-ROUTE — /wallet
 */
import { useEffect, useState, type ReactNode } from 'react'
import { Wallet, Lock, Unlock } from 'lucide-react'
import { Button } from '@nself/ui'
import { useWallet } from './use-wallet'
import type { TokenGateConfig } from './WalletComponents'

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
        if (active) { setHasAccess(false); setIsChecking(false) }
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
    return () => { active = false }
  }, [isConnected, address, config])

  return { hasAccess, isChecking }
}

/** Content gate: renders children when the connected wallet satisfies the token/NFT config. */
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

/** Inline badge showing gate access status (granted / locked). */
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
        <><Unlock className="h-3 w-3" />Access Granted</>
      ) : (
        <><Lock className="h-3 w-3" />Locked</>
      )}
    </span>
  )
}
