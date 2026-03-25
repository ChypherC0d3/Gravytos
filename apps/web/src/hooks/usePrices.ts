import { useEffect, useRef } from 'react';
import { PriceService } from '@gravytos/core';
import { usePriceStore } from '@gravytos/state';

const TRACKED_SYMBOLS = [
  'BTC', 'ETH', 'SOL', 'USDC', 'USDT', 'MATIC', 'ARB', 'OP', 'LINK', 'UNI', 'DAI', 'WBTC', 'AAVE',
];

export function usePrices() {
  const serviceRef = useRef(new PriceService());
  const setPrices = usePriceStore((s) => s.setPrices);

  useEffect(() => {
    let cancelled = false;

    const fetchPrices = async () => {
      try {
        const prices = await serviceRef.current.getPrices(TRACKED_SYMBOLS);
        if (!cancelled && Object.keys(prices).length > 0) {
          setPrices(prices);
        }
      } catch {
        /* ignore */
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 60000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [setPrices]);
}
