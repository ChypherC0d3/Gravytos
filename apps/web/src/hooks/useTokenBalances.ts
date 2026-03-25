import { useEffect } from 'react';
import { useAccount, useBalance, useReadContracts } from 'wagmi';
import { useWalletStore } from '@gravytos/state';
import { TOKEN_ADDRESSES, NATIVE_TOKEN_ADDRESS } from '@gravytos/config';
import { formatUnits } from 'viem';

// ERC20 ABI for balanceOf
const erc20BalanceOfAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

export function useTokenBalances() {
  const { address, chainId } = useAccount();
  const updateBalances = useWalletStore((s) => s.updateBalances);

  // Native balance
  const { data: nativeBalance } = useBalance({
    address,
    query: { refetchInterval: 15000 },
  });

  // Get token addresses for current chain
  const tokenAddresses = chainId ? TOKEN_ADDRESSES[chainId] || {} : {};

  // Build multicall for all ERC20 balances
  const tokenEntries = Object.entries(tokenAddresses).filter(
    ([_, addr]) => addr !== NATIVE_TOKEN_ADDRESS,
  );

  const contracts = address
    ? tokenEntries.map(([_, addr]) => ({
        address: addr as `0x${string}`,
        abi: erc20BalanceOfAbi,
        functionName: 'balanceOf' as const,
        args: [address] as const,
      }))
    : [];

  const { data: tokenBalances } = useReadContracts({
    contracts,
    query: {
      enabled: !!address && tokenEntries.length > 0,
      refetchInterval: 15000,
    },
  });

  // Sync to store
  useEffect(() => {
    if (!address || !chainId) return;
    const balances: Record<string, {
      symbol: string;
      raw: string;
      formatted: string;
      decimals: number;
      lastUpdated: number;
    }> = {};

    if (nativeBalance) {
      const nativeSymbol = chainId === 137 ? 'POL' : 'ETH';
      balances[nativeSymbol] = {
        symbol: nativeSymbol,
        raw: nativeBalance.value.toString(),
        formatted: Number(nativeBalance.formatted).toFixed(6),
        decimals: 18,
        lastUpdated: Date.now(),
      };
    }

    if (tokenBalances) {
      tokenEntries.forEach(([symbol], index) => {
        const result = tokenBalances[index];
        if (result?.status === 'success' && result.result) {
          const decimals =
            symbol === 'USDC' || symbol === 'USDT' || symbol === 'USDC.e' ? 6 : 18;
          balances[symbol] = {
            symbol,
            raw: (result.result as bigint).toString(),
            formatted: Number(
              formatUnits(result.result as bigint, decimals),
            ).toFixed(6),
            decimals,
            lastUpdated: Date.now(),
          };
        }
      });
    }

    updateBalances(`ethereum-${chainId}`, balances);
  }, [nativeBalance, tokenBalances, chainId, address, updateBalances]);

  return { nativeBalance, tokenBalances };
}
