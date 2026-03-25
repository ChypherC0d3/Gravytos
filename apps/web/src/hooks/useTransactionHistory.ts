import { useState, useEffect, useRef, useCallback } from 'react';
import { TransactionHistoryService, type HistoricalTransaction } from '@gravytos/core';
import { useWalletStore } from '@gravytos/state';

export function useTransactionHistory() {
  const [transactions, setTransactions] = useState<HistoricalTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const serviceRef = useRef(new TransactionHistoryService());

  const evmAddress = useWalletStore((s) => s.evmAddress);
  const evmChainId = useWalletStore((s) => s.evmChainId);
  const btcAddress = useWalletStore((s) => s.btcAddress);
  const solanaAddress = useWalletStore((s) => s.solanaAddress);

  const fetchHistory = useCallback(async () => {
    if (!evmAddress && !btcAddress && !solanaAddress) {
      setTransactions([]);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const history = await serviceRef.current.getAllHistory({
        evm: evmAddress && evmChainId ? { address: evmAddress, chainId: evmChainId } : undefined,
        btc: btcAddress || undefined,
        sol: solanaAddress || undefined,
      });
      setTransactions(history);
    } catch (e: any) {
      setError(e.message || 'Failed to fetch history');
    } finally {
      setIsLoading(false);
    }
  }, [evmAddress, evmChainId, btcAddress, solanaAddress]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { transactions, isLoading, error, refetch: fetchHistory };
}
