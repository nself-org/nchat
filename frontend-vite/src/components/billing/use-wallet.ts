/**
 * Purpose:    Browser wallet hook (EIP-1193 / window.ethereum) for the Vite SPA, ported
 *             from the legacy zustand-backed useWallet + wallet-connector lib (which do
 *             not exist in frontend-vite). Provides connect/disconnect, account + chain
 *             tracking, balance refresh, message signing, and address/wei helpers.
 * Inputs:     window.ethereum (injected provider, e.g. MetaMask). None if absent.
 * Outputs:    WalletState + actions. Result-shaped returns ({ success, error }) match
 *             the legacy hook so consuming components port verbatim.
 * Constraints:Client-only. No node-only web3 SDK in the bundle — uses the injected
 *             provider's JSON-RPC. The chain-RPC bridge (server reads) is a BFF
 *             backend plugin (web3, 5 routes, N-2-S5) that is not live yet; balance is
 *             read straight from the injected provider, which works without it.
 * SOT:        F-NCHAT-VITE-ROUTE — /wallet
 */
import { useCallback, useEffect, useState } from 'react'

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>
  on?: (event: string, handler: (...args: unknown[]) => void) => void
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider
  }
}

interface ActionResult {
  success: boolean
  error?: string
}

function getProvider(): Eip1193Provider | null {
  return typeof window !== 'undefined' && window.ethereum ? window.ethereum : null
}

export function isWalletAvailable(): boolean {
  return getProvider() !== null
}

export function formatAddress(addr?: string, start = 6, end = 4): string {
  if (!addr) return ''
  if (addr.length <= start + end) return addr
  return `${addr.slice(0, start)}…${addr.slice(-end)}`
}

export function weiToEther(weiHex?: string): string {
  if (!weiHex) return '0'
  try {
    const wei = BigInt(weiHex)
    const ether = Number(wei) / 1e18
    return ether.toString()
  } catch {
    return '0'
  }
}

export interface WalletState {
  isConnected: boolean
  address: string | null
  chainId: string | null
  balance: string | null
  isConnecting: boolean
  error: string | null
}

export function useWallet() {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    balance: null,
    isConnecting: false,
    error: null,
  })

  const refreshBalance = useCallback(async (addr?: string): Promise<ActionResult & { balance?: string }> => {
    const provider = getProvider()
    const target = addr ?? state.address
    if (!provider || !target) return { success: false }
    try {
      const balance = (await provider.request({
        method: 'eth_getBalance',
        params: [target, 'latest'],
      })) as string
      setState((s) => ({ ...s, balance }))
      return { success: true, balance }
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Unknown error' }
    }
  }, [state.address])

  const connect = useCallback(async (): Promise<ActionResult> => {
    const provider = getProvider()
    if (!provider) {
      const error = 'No wallet detected. Install MetaMask or a compatible wallet.'
      setState((s) => ({ ...s, error }))
      return { success: false, error }
    }
    setState((s) => ({ ...s, isConnecting: true, error: null }))
    try {
      const accounts = (await provider.request({ method: 'eth_requestAccounts' })) as string[]
      const chainId = (await provider.request({ method: 'eth_chainId' })) as string
      const address = accounts[0] ?? null
      setState((s) => ({ ...s, isConnected: !!address, address, chainId, isConnecting: false }))
      if (address) await refreshBalance(address)
      return { success: !!address }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Failed to connect wallet'
      setState((s) => ({ ...s, isConnecting: false, error }))
      return { success: false, error }
    }
  }, [refreshBalance])

  const disconnect = useCallback(async (): Promise<ActionResult> => {
    // EIP-1193 has no programmatic disconnect; clear local state.
    setState({
      isConnected: false,
      address: null,
      chainId: null,
      balance: null,
      isConnecting: false,
      error: null,
    })
    return { success: true }
  }, [])

  const signMessage = useCallback(
    async (message: string): Promise<ActionResult & { data?: string }> => {
      const provider = getProvider()
      if (!provider || !state.address) return { success: false, error: 'Wallet not connected' }
      try {
        const signature = (await provider.request({
          method: 'personal_sign',
          params: [message, state.address],
        })) as string
        return { success: true, data: signature }
      } catch (err) {
        const error = err instanceof Error ? err.message : 'Failed to sign message'
        setState((s) => ({ ...s, error }))
        return { success: false, error }
      }
    },
    [state.address],
  )

  // Track account + chain changes from the injected provider.
  useEffect(() => {
    const provider = getProvider()
    if (!provider?.on || !provider.removeListener) return

    const onAccounts = (...args: unknown[]) => {
      const accounts = args[0] as string[]
      const address = accounts?.[0] ?? null
      setState((s) => ({ ...s, isConnected: !!address, address }))
    }
    const onChain = (...args: unknown[]) => {
      const chainId = args[0] as string
      setState((s) => ({ ...s, chainId }))
    }

    provider.on('accountsChanged', onAccounts)
    provider.on('chainChanged', onChain)
    return () => {
      provider.removeListener?.('accountsChanged', onAccounts)
      provider.removeListener?.('chainChanged', onChain)
    }
  }, [])

  return {
    ...state,
    available: isWalletAvailable(),
    connect,
    disconnect,
    refreshBalance,
    signMessage,
    formatAddress,
    weiToEther,
  }
}
