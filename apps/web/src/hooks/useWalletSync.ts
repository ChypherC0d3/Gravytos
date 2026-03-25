import { useEffect } from 'react';
import { useAccount, useChainId, useBalance } from 'wagmi';
import { useWalletStore } from '@gravytos/state';

export function useWalletSync() {
  const { address: evmAddress, isConnected: evmConnected } = useAccount();
  const chainId = useChainId();
  const { data: evmBalance } = useBalance({ address: evmAddress });

  const setEvmWallet = useWalletStore((s) => s.setEvmWallet);
  const updateBalances = useWalletStore((s) => s.updateBalances);

  // Sync EVM wallet
  useEffect(() => {
    if (evmConnected && evmAddress) {
      setEvmWallet(evmAddress, chainId);
    } else {
      setEvmWallet(null, null);
    }
  }, [evmConnected, evmAddress, chainId, setEvmWallet]);

  // Sync EVM balance
  useEffect(() => {
    if (evmBalance && evmAddress) {
      const chainKey = `ethereum-${chainId}`;
      updateBalances(chainKey, {
        ETH: {
          symbol: 'ETH',
          raw: evmBalance.value.toString(),
          formatted: evmBalance.formatted,
          decimals: 18,
          lastUpdated: Date.now(),
        },
      });
    }
  }, [evmBalance, evmAddress, chainId, updateBalances]);

  return {
    evmConnected,
    evmAddress,
  };
}
