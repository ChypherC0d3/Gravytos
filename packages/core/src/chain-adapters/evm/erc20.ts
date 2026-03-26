// ===================================================================
// GRAVYTOS -- ERC20 Token Helpers
// ABI definitions and utility functions for ERC20 interactions
// ===================================================================

export const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'name',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'string' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ type: 'uint256' }],
  },
  {
    name: 'transferFrom',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ type: 'bool' }],
  },
] as const;

/**
 * Sentinel address used to represent the native token (ETH/MATIC/etc.)
 * in contexts where a token contract address is expected.
 */
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/**
 * Check whether a given address represents the native token.
 * Matches the sentinel address, empty string, or zero address.
 */
export function isNativeToken(address: string): boolean {
  const lower = address.toLowerCase();
  return (
    lower === NATIVE_TOKEN_ADDRESS.toLowerCase() ||
    address === '' ||
    lower === '0x0' ||
    lower === '0x0000000000000000000000000000000000000000'
  );
}

// ─── Standalone ABI fragments for typed wagmi calls ──────────

export const ERC20_TRANSFER_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'to', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

export const ERC20_APPROVE_ABI = [
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }],
    outputs: [{ type: 'bool' }],
  },
] as const;

export const ERC20_ALLOWANCE_ABI = [
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'owner', type: 'address' }, { name: 'spender', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

// Spender addresses for DEX routers per chain
export const DEX_ROUTER_ADDRESSES: Record<number, string> = {
  1: '0x1111111254EEB25477B68fb85Ed929f73A960582',     // 1inch v5 Ethereum
  137: '0x1111111254EEB25477B68fb85Ed929f73A960582',   // 1inch v5 Polygon
  42161: '0x1111111254EEB25477B68fb85Ed929f73A960582', // 1inch v5 Arbitrum
  8453: '0x1111111254EEB25477B68fb85Ed929f73A960582',  // 1inch v5 Base
  10: '0x1111111254EEB25477B68fb85Ed929f73A960582',    // 1inch v5 Optimism
};
