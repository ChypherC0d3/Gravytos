import { useEffect, useRef } from 'react';
import { useWalletStore } from '@gravytos/state';

export function useSolBalance() {
  const solanaAddress = useWalletStore((s) => s.solanaAddress);
  const updateBalances = useWalletStore((s) => s.updateBalances);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    if (!solanaAddress) return;

    const fetchBalance = async () => {
      try {
        const res = await fetch('https://api.mainnet-beta.solana.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [solanaAddress],
          }),
        });
        if (!res.ok) return;
        const data = await res.json();
        const lamports = data.result?.value || 0;
        const solBalance = lamports / 1_000_000_000;

        updateBalances('solana-mainnet', {
          SOL: {
            symbol: 'SOL',
            raw: lamports.toString(),
            formatted: solBalance.toFixed(6),
            decimals: 9,
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
  }, [solanaAddress, updateBalances]);
}
