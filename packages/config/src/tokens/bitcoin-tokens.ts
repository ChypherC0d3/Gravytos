// ===================================================================
// NEXORA VAULT -- Bitcoin Token Definitions
// Native BTC token configuration
// ===================================================================

export interface BitcoinToken {
  /** Token symbol */
  symbol: string;
  /** Token name */
  name: string;
  /** Token decimals (satoshi = 8) */
  decimals: number;
  /** CoinGecko ID for price feeds */
  coingeckoId: string;
  /** Logo URL */
  logoUrl: string;
}

export const BITCOIN_TOKENS: BitcoinToken[] = [
  {
    symbol: 'BTC',
    name: 'Bitcoin',
    decimals: 8,
    coingeckoId: 'bitcoin',
    logoUrl: '/tokens/btc.svg',
  },
];

/**
 * Get the native BTC token configuration.
 */
export function getBitcoinToken(): BitcoinToken {
  return BITCOIN_TOKENS[0];
}
