// ===================================================================
// NEXORA VAULT -- DeFi Contract Addresses
// Aave V3 and other protocol addresses per chain
// ===================================================================

/**
 * Aave V3 Pool contract addresses per EVM chain ID.
 */
export const AAVE_POOL_ADDRESS: Record<number, string> = {
  1: '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
  137: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  10: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
  42161: '0x794a61358D6845594F94dc1DB02A252b5b4814aD',
};

/**
 * USDC addresses per EVM chain ID (native USDC, not bridged).
 */
export const USDC_ADDRESS: Record<number, string> = {
  1: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  137: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
  10: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
  42161: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
};

/**
 * USDT addresses per EVM chain ID.
 */
export const USDT_ADDRESS: Record<number, string> = {
  1: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
  137: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
  10: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
  42161: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
};

/**
 * Aave V3 aToken addresses (interest-bearing deposit tokens).
 * Indexed by EVM chain ID, then by underlying token symbol.
 */
export const AAVE_ATOKEN_ADDRESS: Record<number, Record<string, string>> = {
  // ── Ethereum Mainnet (1) ─────────────────────────────────────
  1: {
    aUSDC: '0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c',
    aUSDT: '0x23878914EFE38d27C4D67Ab83ed1b93A74D4086a',
    aDAI: '0x018008bfb33d285247A21d44E50697654f754e63',
    aWETH: '0x4d5F47FA6A74757f35C14fD3a6Ef8E3C9BC514E8',
    aWBTC: '0x5Ee5bf7ae06D1Be5997A1A72006FE6C607eC6DE8',
  },

  // ── Polygon (137) ────────────────────────────────────────────
  137: {
    aUSDC: '0xA4D94019934D8333Ef880ABFFbF2FDd611C0f978',
    aUSDT: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620',
    aDAI: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE',
    aWETH: '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',
    aWBTC: '0x078f358208685046a11C85e8ad32895DED33A249',
    aWMATIC: '0x6d80113e533a2C0fe82EaBD35f1875DcEA89Ea97',
  },

  // ── Optimism (10) ────────────────────────────────────────────
  10: {
    aUSDC: '0x625E7708f30cA75bfd92586e17077590C60eb4cD',
    aUSDT: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620',
    aDAI: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE',
    aWETH: '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',
    aWBTC: '0x078f358208685046a11C85e8ad32895DED33A249',
  },

  // ── Arbitrum (42161) ─────────────────────────────────────────
  42161: {
    aUSDC: '0x625E7708f30cA75bfd92586e17077590C60eb4cD',
    aUSDT: '0x6ab707Aca953eDAeFBc4fD23bA73294241490620',
    aDAI: '0x82E64f49Ed5EC1bC6e43DAD4FC8Af9bb3A2312EE',
    aWETH: '0xe50fA9b3c56FfB159cB0FCA61F5c9D750e8128c8',
    aWBTC: '0x078f358208685046a11C85e8ad32895DED33A249',
  },
};

/**
 * Get the Aave V3 Pool address for a specific chain.
 */
export function getAavePoolAddress(evmChainId: number): string | undefined {
  return AAVE_POOL_ADDRESS[evmChainId];
}

/**
 * Get the aToken address for a given underlying token on a specific chain.
 */
export function getATokenAddress(
  evmChainId: number,
  aTokenSymbol: string,
): string | undefined {
  return AAVE_ATOKEN_ADDRESS[evmChainId]?.[aTokenSymbol];
}
