import { useEffect, useRef } from 'react';
import { usePriceStore } from '@gravytos/state';

const COINGECKO_API = 'https://api.coingecko.com/api/v3';
const COIN_IDS: Record<string, string> = {
  BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana', MATIC: 'matic-network',
  POL: 'matic-network', USDC: 'usd-coin', USDT: 'tether', DAI: 'dai',
  WBTC: 'wrapped-bitcoin', LINK: 'chainlink', UNI: 'uniswap', AAVE: 'aave',
  ARB: 'arbitrum', OP: 'optimism',
};

const TRACKED = Object.keys(COIN_IDS);

async function fetchPricesFromAPI(): Promise<Record<string, number>> {
  const ids = Object.values(COIN_IDS).join(',');
  const res = await fetch(`${COINGECKO_API}/simple/price?ids=${ids}&vs_currencies=usd`, {
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return {};
  const data = await res.json();
  const result: Record<string, number> = {};
  for (const symbol of TRACKED) {
    const coinId = COIN_IDS[symbol];
    if (coinId && data[coinId]?.usd) result[symbol] = data[coinId].usd;
  }
  return result;
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
