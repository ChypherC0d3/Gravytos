// ═══════════════════════════════════════════════════════════════
// NEXORA VAULT — Chain Types
// Multi-chain support: Bitcoin (UTXO), EVM (Account), Solana
// ═══════════════════════════════════════════════════════════════

export enum ChainFamily {
  Bitcoin = 'bitcoin',
  EVM = 'evm',
  Solana = 'solana',
}

export interface ChainConfig {
  /** Unique chain identifier, e.g., 'bitcoin-mainnet', 'ethereum-1', 'solana-mainnet' */
  id: string;
  /** Chain family for adapter routing */
  family: ChainFamily;
  /** Human-readable name */
  name: string;
  /** Native currency symbol */
  symbol: string;
  /** Native currency decimals */
  decimals: number;
  /** Brand color (hex) */
  color: string;
  /** Chain logo URL */
  logoUrl: string;
  /** RPC endpoints (multiple for rotation) */
  rpcUrls: string[];
  /** Block explorer base URL */
  explorerUrl: string;
  /** EVM chain ID (only for EVM chains) */
  evmChainId?: number;
  /** Whether this is a testnet */
  isTestnet: boolean;
  /** Average block time in seconds */
  blockTimeSeconds: number;
  /** Whether the chain is enabled in the current config */
  enabled: boolean;
}

export interface TokenConfig {
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Token decimals */
  decimals: number;
  /** Logo URL */
  logoUrl: string;
  /** Contract/mint address per chain (chainId -> address). Empty string for native tokens */
  addresses: Record<string, string>;
  /** Whether this is the native token of any chain */
  isNative: boolean;
  /** CoinGecko ID for price feeds */
  coingeckoId?: string;
}

export type ChainId = string;
export type TokenAddress = string;
