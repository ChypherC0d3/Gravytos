import { useEffect, useRef } from 'react';
import { useWalletStore } from '@gravytos/state';

export function useBtcBalance() {
  const btcAddress = useWalletStore((s) => s.btcAddress);
  const updateBalances = useWalletStore((s) => s.updateBalances);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!btcAddress) return;

    const fetchBalance = async () => {
      try {
        const res = await fetch(`https://blockstream.info/api/address/${btcAddress}`);
        if (!res.ok) return;
        const data = await res.json();
        const confirmed =
          data.chain_stats?.funded_txo_sum - data.chain_stats?.spent_txo_sum || 0;
        const btcBalance = confirmed / 100_000_000; // satoshis to BTC

        updateBalances('bitcoin-mainnet', {
          BTC: {
            symbol: 'BTC',
            raw: confirmed.toString(),
            formatted: btcBalance.toFixed(8),
            decimals: 8,
            lastUpdated: Date.now(),
          },
        });
      } catch {
        /* network error */
      }
    };

    fetchBalance();
    intervalRef.current = setInterval(fetchBalance, 30000);
    return () => clearInterval(intervalRef.current);
  }, [btcAddress, updateBalances]);
}
