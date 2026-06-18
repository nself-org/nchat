/**
 * Purpose:    /wallet — Crypto Wallet. Ported from legacy frontend/src/app/wallet/page.tsx.
 *             Connect/status header, a Tokens/NFTs/Transactions tab set when connected, a
 *             connect prompt when not, plus the token-gating and crypto-tipping demo
 *             sections.
 * Inputs:     useWallet() (EIP-1193 connection state).
 * Outputs:    The full wallet screen.
 * Constraints:Token/NFT/transaction reads require the backend web3 RPC bridge (BFF,
 *             Wave N-2-S5) which is NOT live yet — those panels degrade through
 *             @nself/ui AsyncScreen states (see backend_pending). Wallet connect, the
 *             token-gate ERC-20 check, and tipping use the connected wallet's provider
 *             directly, so they work without the bridge.
 * SOT:        F-NCHAT-VITE-ROUTE — /wallet
 */
import { useState } from 'react'
import { Wallet } from 'lucide-react'
import { useWallet } from '@/components/billing/use-wallet'
import {
  WalletConnectButton,
  WalletStatus,
  TokenList,
  NFTGallery,
  TransactionHistory,
  TokenGate,
  TipButton,
} from '@/components/billing/WalletComponents'

type WalletTab = 'tokens' | 'nfts' | 'transactions'

const WALLET_TABS: ReadonlyArray<{ id: WalletTab; label: string }> = [
  { id: 'tokens', label: 'Tokens' },
  { id: 'nfts', label: 'NFTs' },
  { id: 'transactions', label: 'Transactions' },
]

export default function WalletPage() {
  const { isConnected } = useWallet()
  const [tab, setTab] = useState<WalletTab>('tokens')

  return (
    <div data-testid="wallet-container" className="mx-auto max-w-6xl space-y-8 py-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-100">
            <Wallet className="h-8 w-8" />
            Crypto Wallet
          </h1>
          <p className="mt-2 text-slate-400">Connect your wallet to access Web3 features</p>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? <WalletStatus /> : <WalletConnectButton />}
        </div>
      </div>

      {/* Main content */}
      {isConnected ? (
        <div>
          <div role="tablist" className="grid grid-cols-3 gap-2 rounded-md border border-slate-800 p-1">
            {WALLET_TABS.map((tabItem) => (
              <button
                key={tabItem.id}
                role="tab"
                aria-selected={tab === tabItem.id}
                onClick={() => setTab(tabItem.id)}
                className={`rounded px-3 py-2 text-sm ${
                  tab === tabItem.id ? 'bg-sky-500 text-white' : 'text-slate-300 hover:text-white'
                }`}
              >
                {tabItem.label}
              </button>
            ))}
          </div>
          <div className="mt-6">
            {tab === 'tokens' && <TokenList />}
            {tab === 'nfts' && <NFTGallery contractAddresses={[]} />}
            {tab === 'transactions' && <TransactionHistory />}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-700 p-16">
          <div className="max-w-md space-y-4 text-center">
            <Wallet className="mx-auto h-16 w-16 text-slate-400" />
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-slate-100">Connect Your Wallet</h2>
              <p className="text-sm text-slate-400">
                Connect your crypto wallet to view your tokens, NFTs, and transaction history
              </p>
            </div>
            <div className="flex justify-center">
              <WalletConnectButton />
            </div>
          </div>
        </div>
      )}

      {/* Token-gating demo */}
      <section className="space-y-4 rounded-lg border border-slate-800 p-6">
        <h2 className="text-xl font-semibold text-slate-100">Token Gating Demo</h2>
        <p className="text-sm text-slate-400">
          This section demonstrates token-gated content. Connect your wallet and hold the required
          tokens to access.
        </p>
        <TokenGate
          config={{
            type: 'token',
            contractAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on Ethereum
            minimumBalance: '1000000', // 1 USDC (6 decimals)
          }}
          fallback={
            <div className="rounded-lg border border-dashed border-slate-700 p-8 text-center">
              <p className="text-sm text-slate-400">
                Token gated content appears here when you hold sufficient tokens
              </p>
            </div>
          }
        >
          <div className="rounded-lg border border-slate-800 bg-sky-500/5 p-8 text-center">
            <h3 className="text-lg font-semibold text-slate-100">Exclusive Content</h3>
            <p className="mt-2 text-sm text-slate-400">
              You have access to this token-gated content!
            </p>
          </div>
        </TokenGate>
      </section>

      {/* Tipping demo */}
      <section className="space-y-4 rounded-lg border border-slate-800 p-6">
        <h2 className="text-xl font-semibold text-slate-100">Crypto Tipping Demo</h2>
        <p className="text-sm text-slate-400">
          Send crypto tips to other users directly from messages
        </p>
        <div className="space-y-2 rounded-lg border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-slate-200">Sample Message</p>
              <p className="text-sm text-slate-400">This is a great idea! Thanks for sharing.</p>
            </div>
            <TipButton
              recipientAddress="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
              recipientName="vitalik.eth"
              showLabel
            />
          </div>
        </div>
      </section>
    </div>
  )
}
