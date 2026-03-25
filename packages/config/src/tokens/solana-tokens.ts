// ===================================================================
// NEXORA VAULT -- Solana Token Definitions
// SPL token mint addresses and metadata for Solana mainnet
// ===================================================================

export interface SolanaToken {
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** SPL token mint address (empty string for native SOL) */
  mint: string;
  /** Token decimals */
  decimals: number;
  /** CoinGecko ID for price feeds */
  coingeckoId: string;
  /** Logo URL */
  logoUrl: string;
}

export const SOLANA_TOKENS: SolanaToken[] = [
  {
    symbol: 'SOL',
    name: 'Solana',
    mint: '',
    decimals: 9,
    coingeckoId: 'solana',
    logoUrl: '/tokens/sol.svg',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
    decimals: 6,
    coingeckoId: 'usd-coin',
    logoUrl: '/tokens/usdc.svg',
  },
  {
    symbol: 'USDT',
    name: 'Tether USD',
    mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
    decimals: 6,
    coingeckoId: 'tether',
    logoUrl: '/tokens/usdt.svg',
  },
  {
    symbol: 'BONK',
    name: 'Bonk',
    mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    decimals: 5,
    coingeckoId: 'bonk',
    logoUrl: '/tokens/bonk.svg',
  },
  {
    symbol: 'JUP',
    name: 'Jupiter',
    mint: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
    decimals: 6,
    coingeckoId: 'jupiter-exchange-solana',
    logoUrl: '/tokens/jup.svg',
  },
  {
    symbol: 'WIF',
    name: 'dogwifhat',
    mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
    decimals: 6,
    coingeckoId: 'dogwifcoin',
    logoUrl: '/tokens/wif.svg',
  },
  {
    symbol: 'PYTH',
    name: 'Pyth Network',
    mint: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
    decimals: 6,
    coingeckoId: 'pyth-network',
    logoUrl: '/tokens/pyth.svg',
  },
  {
    symbol: 'RAY',
    name: 'Raydium',
    mint: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
    decimals: 6,
    coingeckoId: 'raydium',
    logoUrl: '/tokens/ray.svg',
  },
  {
    symbol: 'ORCA',
    name: 'Orca',
    mint: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
    decimals: 6,
    coingeckoId: 'orca',
    logoUrl: '/tokens/orca.svg',
  },
  {
    symbol: 'RENDER',
    name: 'Render Token',
    mint: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
    decimals: 8,
    coingeckoId: 'render-token',
    logoUrl: '/tokens/render.svg',
  },
  {
    symbol: 'JTO',
    name: 'Jito',
    mint: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
    decimals: 9,
    coingeckoId: 'jito-governance-token',
    logoUrl: '/tokens/jto.svg',
  },
  {
    symbol: 'SAMO',
    name: 'Samoyedcoin',
    mint: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU',
    decimals: 9,
    coingeckoId: 'samoyedcoin',
    logoUrl: '/tokens/samo.svg',
  },
];

/**
 * Look up a Solana token by its symbol.
 */
export function getSolanaToken(symbol: string): SolanaToken | undefined {
  return SOLANA_TOKENS.find((t) => t.symbol === symbol);
}

/**
 * Look up a Solana token by its mint address.
 */
export function getSolanaTokenByMint(mint: string): SolanaToken | undefined {
  return SOLANA_TOKENS.find((t) => t.mint === mint);
}
