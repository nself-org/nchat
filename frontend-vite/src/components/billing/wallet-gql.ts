/**
 * Purpose:    GraphQL documents for the crypto wallet surface, targeting backend web3
 *             Actions per the P3 API migration plan (nchat-api-migration-tickets.md,
 *             Wave N-2-S5 — web3 BFF, 5 routes). Token balances, NFT enumeration, and
 *             tx history require a chain-RPC indexer that cannot run in the client; the
 *             SPA calls Actions that proxy the bridge. These Actions are NOT live yet,
 *             so the wallet page degrades via AsyncScreen empty/error states.
 * Inputs:     None — exports gql document strings + typed result shapes.
 * Outputs:    WALLET_TOKENS_QUERY, WALLET_NFTS_QUERY, WALLET_TX_HISTORY_QUERY.
 * Constraints:Server-side web3 SDK only (no node-only web3 code in the client bundle).
 *             Reads are scoped to the connected address passed as an Action argument.
 * SOT:        F-NCHAT-VITE-ROUTE — /wallet
 */

/** Legacy use-tokens fetchCommonTokens → web3 plugin Action `wallet_tokens`. */
export const WALLET_TOKENS_QUERY = /* GraphQL */ `
  query WalletTokens($address: String!, $chainId: String!) {
    wallet_tokens(address: $address, chainId: $chainId) {
      address
      symbol
      name
      logoUri
      balanceFormatted
    }
  }
`

export interface WalletToken {
  address: string
  symbol: string
  name: string
  logoUri: string | null
  balanceFormatted: string
}

export interface WalletTokensData {
  wallet_tokens: WalletToken[]
}

/** Legacy use-nfts fetchUserNFTs → web3 plugin Action `wallet_nfts`. */
export const WALLET_NFTS_QUERY = /* GraphQL */ `
  query WalletNfts($address: String!, $contractAddresses: [String!]) {
    wallet_nfts(address: $address, contractAddresses: $contractAddresses) {
      contractAddress
      tokenId
      name
      description
      image
      chainId
    }
  }
`

export interface WalletNft {
  contractAddress: string
  tokenId: string
  name: string | null
  description: string | null
  image: string | null
  chainId: string
}

export interface WalletNftsData {
  wallet_nfts: WalletNft[]
}

/** Legacy transaction history → web3 plugin Action `wallet_transactions`. */
export const WALLET_TX_HISTORY_QUERY = /* GraphQL */ `
  query WalletTransactions($address: String!, $chainId: String!) {
    wallet_transactions(address: $address, chainId: $chainId) {
      hash
      status
      to
      value
      submittedAt
      error
    }
  }
`

export interface WalletTransaction {
  hash: string
  status: 'pending' | 'submitted' | 'confirming' | 'confirmed' | 'failed' | 'cancelled'
  to: string | null
  value: string | null
  submittedAt: string
  error: string | null
}

export interface WalletTxHistoryData {
  wallet_transactions: WalletTransaction[]
}
