// ===================================================================
// GRAVYTOS -- EVM Token Addresses
// Canonical contract addresses for supported EVM chains
// ===================================================================

/**
 * Sentinel address used to represent the native token on EVM chains.
 * Following the ERC-7528 standard / common convention.
 */
export const NATIVE_TOKEN_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/**
 * Token contract addresses indexed by EVM chain ID and token symbol.
 * Native tokens use the NATIVE_TOKEN_ADDRESS sentinel value.
 */
export const TOKEN_ADDRESSES: Record<number, Record<string, string>> = {
  // ── Ethereum Mainnet (1) ─────────────────────────────────────
  1: {
    ETH: NATIVE_TOKEN_ADDRESS,
    USDC: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    USDT: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    DAI: '0x6B175474E89094C44Da98b954EedeAC495271d0F',
    WETH: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    WBTC: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
    LINK: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
    UNI: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
    AAVE: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9',
    wstETH: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0',
    stETH: '0xae7ab96520DE3A18E5e111B5EaAb095312D7fE84',
    COMP: '0xc00e94Cb662C3520282E6f5717214004A7f26888',
    MKR: '0x9f8F72aA9304c8B593d555F12eF6589cC3A579A2',
    SNX: '0xC011a73ee8576Fb46F5E1c5751cA3B9Fe0af2a6F',
    CRV: '0xD533a949740bb3306d119CC777fa900bA034cd52',
    LDO: '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32',
    cbETH: '0xBe9895146f7AF43049ca1c1AE358B0541Ea49704',
    rETH: '0xae78736Cd615f374D3085123A210448E74Fc6393',
    PEPE: '0x6982508145454Ce325dDbE47a25d4ec3d2311933',
    SHIB: '0x95aD61b0a150d79219dCF64E1E6Cc01f0B64C4cE',
  },

  // ── Polygon (137) ────────────────────────────────────────────
  137: {
    POL: NATIVE_TOKEN_ADDRESS,
    USDC: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359',
    'USDC.e': '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    USDT: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    DAI: '0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063',
    WETH: '0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619',
    WBTC: '0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6',
    LINK: '0x53E0bca35eC356BD5ddDFebbD1Fc0fD03FaBad39',
    UNI: '0xb33EaAd8d922B1083446DC23f610c2567fB5180f',
    AAVE: '0xD6DF932A45C0f255f85145f286eA0b292B21C90B',
    wstETH: '0x03b54A6e9a984069379fae1a4fC4dBAE93B3bCCD',
    WMATIC: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
  },

  // ── Optimism (10) ────────────────────────────────────────────
  10: {
    ETH: NATIVE_TOKEN_ADDRESS,
    USDC: '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85',
    'USDC.e': '0x7F5c764cBc14f9669B88837ca1490cCa17c31607',
    USDT: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WETH: '0x4200000000000000000000000000000000000006',
    WBTC: '0x68f180fcCe6836688e9084f035309E29Bf0A2095',
    LINK: '0x350a791Bfc2C21F9Ed5d10980Dad2e2638ffa7f6',
    UNI: '0x6fd9d7AD17242c41f7131d257212c54A0e816691',
    AAVE: '0x76FB31fb4af56892A25e32cFC43De717950c9278',
    wstETH: '0x1F32b1c2345538c0c6f582fCB022739c4A194Ebb',
    OP: '0x4200000000000000000000000000000000000042',
  },

  // ── Arbitrum (42161) ─────────────────────────────────────────
  42161: {
    ETH: NATIVE_TOKEN_ADDRESS,
    USDC: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831',
    'USDC.e': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8',
    USDT: '0xFd086bC7CD5C481DCC9C85ebE478A1C0b69FCbb9',
    DAI: '0xDA10009cBd5D07dd0CeCc66161FC93D7c9000da1',
    WETH: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    WBTC: '0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f',
    LINK: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
    UNI: '0xFa7F8980b0f1E64A2062791cc3b0871572f1F7f0',
    AAVE: '0xba5DdD1f9d7F570dc94a51479a000E3BCE967196',
    wstETH: '0x5979D7b546E38E9Ab8793568Ab4b5Adaa1d4cEE8',
    ARB: '0x912CE59144191C1204E64559FE8253a0e49E6548',
    GMX: '0xfc5A1A6EB076a2C7aD06eD22C90d7E710E35ad0a',
  },

  // ── Base (8453) ──────────────────────────────────────────────
  8453: {
    ETH: NATIVE_TOKEN_ADDRESS,
    USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    USDbC: '0xd9aAEc86B65D86f6A7B5B1b0c42FFA531710b6CA',
    DAI: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    WETH: '0x4200000000000000000000000000000000000006',
    cbETH: '0x2Ae3F1Ec7F1F5012CFEab0185bfc7aa3cf0DEc22',
    wstETH: '0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452',
  },
};

/**
 * Get the contract address for a token on a specific EVM chain.
 * Returns undefined if the token is not configured for that chain.
 */
export function getTokenAddress(
  evmChainId: number,
  symbol: string,
): string | undefined {
  return TOKEN_ADDRESSES[evmChainId]?.[symbol];
}

/**
 * Check whether a token address represents the native token.
 */
export function isNativeToken(address: string): boolean {
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
}

/**
 * Get all token symbols available on a given EVM chain.
 */
export function getAvailableTokens(evmChainId: number): string[] {
  const chain = TOKEN_ADDRESSES[evmChainId];
  return chain ? Object.keys(chain) : [];
}
