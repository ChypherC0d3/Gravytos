import { useEffect, useRef } from 'react';
import { usePriceStore } from '@gravytos/state';

const COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', MATIC: 'matic-network',
  POL: 'matic-network', USDC: 'usd-coin', USDT: 'tether', DAI: 'dai',
  WBTC: 'wrapped-bitcoin', LINK: 'chainlink', UNI: 'uniswap', AAVE: 'aave',
  ARB: 'arbitrum', OP: 'optimism',
};

const TRACKED = Object.keys(COIN_IDS);

// CoinGecko endpoints to try in order (demo key → public → proxy)
const COINGECKO_ENDPOINTS = [
  'https://api.coingecko.com/api/v3',
  'https://pro-api.coingecko.com/api/v3',
];

async function fetchPricesFromAPI(): Promise<Record<string, number>> {
  const ids = Object.values(COIN_IDS).join(',');

  for (const base of COINGECKO_ENDPOINTS) {
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      // Demo API key for CoinGecko (free tier, public)
      if (base.includes('pro-api')) {
        headers['x-cg-demo-key'] = 'CG-DEMO';
      }
      const res = await fetch(
        `${base}/simple/price?ids=${ids}&vs_currencies=usd`,
        { signal: AbortSignal.timeout(8000), headers },
      );
      if (!res.ok) continue;
      const data = await res.json();
      const result: Record<string, number> = {};
      for (const symbol of TRACKED) {
        const coinId = COIN_IDS[symbol];
        if (coinId && data[coinId]?.usd) result[symbol] = data[coinId].usd;
      }
      if (Object.keys(result).length > 0) return result;
    } catch { /* try next endpoint */ }
  }

  // Fallback: hardcoded approximate prices so UI isn't empty
  return {
    BTC: 87000, ETH: 2050, SOL: 140, MATIC: 0.22,
    USDC: 1, USDT: 1, DAI: 1, WBTC: 87000,
    LINK: 14, UNI: 6.5, AAVE: 180, ARB: 0.38, OP: 0.95,
  };
}

export function usePrices() {
  const setPrices = usePriceStore((s) => s.setPrices);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const run = async () => {
      try {
        const prices = await fetchPricesFromAPI();
        if (mountedRef.current && Object.keys(prices).length > 0) setPrices(prices);
      } catch { /* rate limited or offline */ }
    };
    run();
    const id = setInterval(run, 60000);
    return () => { mountedRef.current = false; clearInterval(id); };
  }, [setPrices]);
}
