// ===================================================================
// GRAVYTOS — ERC20 Approval Hook
// Checks and requests ERC20 token approvals for DEX routers / spenders
// ===================================================================

import { useReadContract, useWriteContract, useAccount, useChainId } from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import { ERC20_ALLOWANCE_ABI, ERC20_APPROVE_ABI, DEX_ROUTER_ADDRESSES } from '@gravytos/core';

export function useERC20Approval(tokenAddress: string | undefined, spenderOverride?: string) {
  const { address: userAddress } = useAccount();
  const chainId = useChainId();
  const spender = spenderOverride || DEX_ROUTER_ADDRESSES[chainId] || '';

  // Check current allowance
  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: ERC20_ALLOWANCE_ABI,
    functionName: 'allowance',
    args: userAddress && spender ? [userAddress, spender as `0x${string}`] : undefined,
    query: { enabled: !!tokenAddress && !!userAddress && !!spender },
  });

  // Write approval
  const { writeContract: approve, isPending: isApproving, data: approvalHash } = useWriteContract();

  const requestApproval = (amount?: bigint) => {
    if (!tokenAddress || !spender) return;
    approve({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_APPROVE_ABI,
      functionName: 'approve',
      args: [spender as `0x${string}`, amount || maxUint256],
    });
  };

  const needsApproval = (amount: string, decimals: number): boolean => {
    if (!allowance) return true;
    const required = parseUnits(amount, decimals);
    return (allowance as bigint) < required;
  };

  return { allowance, needsApproval, requestApproval, isApproving, approvalHash, refetchAllowance };
}
