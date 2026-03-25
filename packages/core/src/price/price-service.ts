const COINGECKO_API = 'https://api.coingecko.com/api/v3';

const COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin',
  ETH: 'ethereum',
  SOL: 'solana',
  MATIC: 'matic-network',
  POL: 'matic-network',
  USDC: 'usd-coin',
  USDT: 'tether',
  DAI: 'dai',
  WBTC: 'wrapped-bitcoin',
  LINK: 'chainlink',
  UNI: 'uniswap',
  AAVE: 'aave',
  ARB: 'arbitrum',
  OP: 'optimism',
};

export class PriceService {
  private cache: Map<string, { price: number; timestamp: number }> = new Map();
  private cacheTTL = 60000; // 60 seconds

  async getPrices(symbols: string[]): Promise<Record<string, number>> {
    // Check cache first
    const result: Record<string, number> = {};
    const toFetch: string[] = [];

    for (const symbol of symbols) {
      const cached = this.cache.get(symbol);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        result[symbol] = cached.price;
      } else {
        toFetch.push(symbol);
      }
    }

    if (toFetch.length === 0) return result;

    // Fetch from CoinGecko
    const ids = toFetch
      .map((s) => COIN_IDS[s.toUpperCase()])
      .filter(Boolean)
      .join(',');

    if (!ids) return result;

    try {
      const response = await fetch(
        `${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(10000) },
      );

      if (!response.ok) return result;
      const data = await response.json();

      // Map back to symbols
      for (const symbol of toFetch) {
        const coinId = COIN_IDS[symbol.toUpperCase()];
        if (coinId && data[coinId]?.usd) {
          const price = data[coinId].usd;
          result[symbol] = price;
          this.cache.set(symbol, { price, timestamp: Date.now() });
        }
      }
    } catch {
      // Rate limited or network error -- return cached/empty
    }

    return result;
  }

  getPrice(symbol: string): number | undefined {
    return this.cache.get(symbol)?.price;
  }
}
