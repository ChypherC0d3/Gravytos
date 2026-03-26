// ===================================================================
// GRAVYTOS -- Configuration Package
// ===================================================================

export {
  MVP_CHAINS,
  getChainConfig,
  getChainsByFamily,
  getChainByEvmId,
} from './chains';

export {
  NATIVE_TOKEN_ADDRESS,
  TOKEN_ADDRESSES,
  getTokenAddress,
  isNativeToken,
  getAvailableTokens,
} from './tokens/evm-tokens';

export {
  SOLANA_TOKENS,
  getSolanaToken,
  getSolanaTokenByMint,
} from './tokens/solana-tokens';
export type { SolanaToken } from './tokens/solana-tokens';

export {
  BITCOIN_TOKENS,
  getBitcoinToken,
} from './tokens/bitcoin-tokens';
export type { BitcoinToken } from './tokens/bitcoin-tokens';

export {
  AAVE_POOL_ADDRESS,
  USDC_ADDRESS,
  USDT_ADDRESS,
  AAVE_ATOKEN_ADDRESS,
  getAavePoolAddress,
  getATokenAddress,
} from './contracts';

export { isDesktop, isWeb, getPlatform } from './platform';

export {
  getEnv,
  requireEnv,
  getSupabaseUrl,
  getSupabaseAnonKey,
  getWalletConnectProjectId,
  getAlchemyApiKey,
  getInfuraApiKey,
  isProduction,
  isDevelopment,
} from './env';
