/**
 * Purpose:    Shared helpers for the wallet UI components — urql-to-AsyncScreen result
 *             adapter, block explorer URL lookup, and human-readable relative time.
 * Inputs:     urql query state (fetching, error, data) or primitive values.
 * Outputs:    Result<T,AppError>|'loading' / URL string / relative-time string.
 * Constraints:Pure functions — no React or side-effects. Importable by all WalletComponents splits.
 * SOT:        F-NCHAT-VITE-ROUTE — /wallet
 */
import { ok, err, type Result, type AppError } from '@nself/errors'

/** Map a urql query into the Result<T,AppError>|'loading' shape AsyncScreen expects. */
export function toResult<T>(
  fetching: boolean,
  error: unknown,
  data: T | undefined,
): Result<T, AppError> | 'loading' {
  if (fetching) return 'loading'
  if (error) {
    return err({
      code: 'internal',
      status: 500,
      message: error instanceof Error ? error.message : 'Request failed',
    } satisfies AppError)
  }
  return ok((data ?? ([] as unknown as T)) as T)
}

/** Return the block explorer base URL for a given chainId hex string. */
export function explorerBase(chainId: string | null): string {
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

/** Format an ISO timestamp as a human-readable relative string (e.g. "3h ago"). */
export function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'Just now'
}
