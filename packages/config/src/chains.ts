// ===================================================================
// GRAVYTOS -- Chain Configurations
// MVP chain definitions for Bitcoin, EVM, and Solana
// ===================================================================

import type { ChainConfig, ChainId } from '@gravytos/types';
import { ChainFamily } from '@gravytos/types';

export const MVP_CHAINS: ChainConfig[] = [
  // ── Bitcoin ──────────────────────────────────────────────────
  {
    id: 'bitcoin-mainnet',
    family: ChainFamily.Bitcoin,
    name: 'Bitcoin',
    symbol: 'BTC',
    decimals: 8,
    color: '#F7931A',
    logoUrl: '/chains/bitcoin.svg',
    rpcUrls: [
      'https://blockstream.info/api',
      'https://mempool.space/api',
    ],
    explorerUrl: 'https://mempool.space',
    isTestnet: false,
    blockTimeSeconds: 600,
    enabled: true,
  },

  // ── EVM Chains ───────────────────────────────────────────────
  {
    id: 'ethereum-1',
    family: ChainFamily.EVM,
    name: 'Ethereum',
    symbol: 'ETH',
    decimals: 18,
    color: '#627EEA',
    logoUrl: '/chains/ethereum.svg',
    rpcUrls: [
      'https://eth.llamarpc.com',
      'https://rpc.ankr.com/eth',
      'https://ethereum-rpc.publicnode.com',
    ],
    explorerUrl: 'https://etherscan.io',
    evmChainId: 1,
    isTestnet: false,
    blockTimeSeconds: 12,
    enabled: true,
  },
  {
    id: 'polygon-137',
    family: ChainFamily.EVM,
    name: 'Polygon',
    symbol: 'POL',
    decimals: 18,
    color: '#8247E5',
    logoUrl: '/chains/polygon.svg',
    rpcUrls: [
      'https://polygon.llamarpc.com',
      'https://rpc.ankr.com/polygon',
      'https://polygon-bor-rpc.publicnode.com',
    ],
    explorerUrl: 'https://polygonscan.com',
    evmChainId: 137,
    isTestnet: false,
    blockTimeSeconds: 2,
    enabled: true,
  },
  {
    id: 'arbitrum-42161',
    family: ChainFamily.EVM,
    name: 'Arbitrum',
    symbol: 'ETH',
    decimals: 18,
    color: '#28A0F0',
    logoUrl: '/chains/arbitrum.svg',
    rpcUrls: [
      'https://arbitrum.llamarpc.com',
      'https://rpc.ankr.com/arbitrum',
      'https://arbitrum-one-rpc.publicnode.com',
    ],
    explorerUrl: 'https://arbiscan.io',
    evmChainId: 42161,
    isTestnet: false,
    blockTimeSeconds: 0.25,
    enabled: true,
  },
  {
    id: 'optimism-10',
    family: ChainFamily.EVM,
    name: 'Optimism',
    symbol: 'ETH',
    decimals: 18,
    color: '#FF0420',
    logoUrl: '/chains/optimism.svg',
    rpcUrls: [
      'https://optimism.llamarpc.com',
      'https://rpc.ankr.com/optimism',
      'https://optimism-rpc.publicnode.com',
    ],
    explorerUrl: 'https://optimistic.etherscan.io',
    evmChainId: 10,
    isTestnet: false,
    blockTimeSeconds: 2,
    enabled: true,
  },
  {
    id: 'base-8453',
    family: ChainFamily.EVM,
    name: 'Base',
    symbol: 'ETH',
    decimals: 18,
    color: '#0052FF',
    logoUrl: '/chains/base.svg',
    rpcUrls: [
      'https://base.llamarpc.com',
      'https://rpc.ankr.com/base',
      'https://base-rpc.publicnode.com',
    ],
    explorerUrl: 'https://basescan.org',
    evmChainId: 8453,
    isTestnet: false,
    blockTimeSeconds: 2,
    enabled: true,
  },

  // ── Solana ───────────────────────────────────────────────────
  {
    id: 'solana-mainnet',
    family: ChainFamily.Solana,
    name: 'Solana',
    symbol: 'SOL',
    decimals: 9,
    color: '#9945FF',
    logoUrl: '/chains/solana.svg',
    rpcUrls: [
      'https://api.mainnet-beta.solana.com',
      'https://solana-rpc.publicnode.com',
    ],
    explorerUrl: 'https://solscan.io',
    isTestnet: false,
    blockTimeSeconds: 0.4,
    enabled: true,
  },
];

/**
 * Look up a chain configuration by its ID.
 * Returns undefined if the chain is not found.
 */
export function getChainConfig(chainId: ChainId): ChainConfig | undefined {
  return MVP_CHAINS.find((c) => c.id === chainId);
}

/**
 * Get all chains belonging to a specific family.
 */
export function getChainsByFamily(family: ChainFamily): ChainConfig[] {
  return MVP_CHAINS.filter((c) => c.family === family);
}

/**
 * Look up a chain configuration by its EVM chain ID.
 * Returns undefined for non-EVM chains or unknown chain IDs.
 */
export function getChainByEvmId(evmChainId: number): ChainConfig | undefined {
  return MVP_CHAINS.find((c) => c.evmChainId === evmChainId);
}
