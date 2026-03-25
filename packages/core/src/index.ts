// ===================================================================
// NEXORA VAULT -- Core Package
// ===================================================================

// ── Chain Adapters ─────────────────────────────────────────────
export type { ChainAdapter } from './chain-adapters/types';
export { ChainAdapterRegistry } from './chain-adapters/registry';
export { EVMAdapter } from './chain-adapters/evm/evm-adapter';
export { ERC20_ABI, NATIVE_TOKEN_ADDRESS, isNativeToken } from './chain-adapters/evm/erc20';
export { SolanaAdapter } from './chain-adapters/solana/solana-adapter';

// ── Bitcoin Adapter ───────────────────────────────────────────
export { BitcoinAdapter } from './chain-adapters/bitcoin/bitcoin-adapter';
export { BitcoinRPC } from './chain-adapters/bitcoin/bitcoin-rpc';
export type { BlockstreamUTXO, AddressStats } from './chain-adapters/bitcoin/bitcoin-rpc';
export { UTXOManager } from './chain-adapters/bitcoin/utxo-manager';
export { BitcoinTransactionBuilder } from './chain-adapters/bitcoin/bitcoin-tx-builder';
export type { BuildTransactionParams, BuildTransactionResult } from './chain-adapters/bitcoin/bitcoin-tx-builder';

// ── Privacy Engine ─────────────────────────────────────────────
export { PrivacyEngine } from './privacy-engine/privacy-engine';
export type { PrivacyValidationResult } from './privacy-engine/privacy-engine';
export { BitcoinPrivacyEngine } from './privacy-engine/btc-privacy';
export { EVMPrivacyEngine } from './privacy-engine/evm-privacy';
export { SolanaPrivacyEngine } from './privacy-engine/sol-privacy';

// ── CoinJoin ────────────────────────────────────────────────────
export {
  CoinJoinCoordinator,
  CoinJoinParticipantClient,
  CoinJoinRoundStatus,
  DEFAULT_COINJOIN_CONFIG,
} from './privacy-engine/coinjoin';
export type {
  CoinJoinRound,
  CoinJoinParticipant,
  CoinJoinInput,
  CoinJoinOutput,
  CoinJoinProof,
  CoinJoinConfig,
} from './privacy-engine/coinjoin';

// ── Audit Engine ───────────────────────────────────────────────
export { AuditEngine } from './audit-engine/audit-engine';
export type { LogEventParams } from './audit-engine/audit-engine';
export { InMemoryAuditStorage } from './audit-engine/audit-storage';
export type { AuditStorage } from './audit-engine/audit-storage';
export { IndexedDBAuditStorage } from './audit-engine/indexeddb-storage';
export { AuditExporter } from './audit-engine/audit-exporter';

// ── Transaction Engine ────────────────────────────────────────
export { TransactionEngine } from './transaction-engine/transaction-engine';
export { SwapEngine } from './transaction-engine/swap-engine';
export { BridgeEngine } from './transaction-engine/bridge-engine';

// ── Network ────────────────────────────────────────────────────
export { NetworkManager } from './network/network-manager';

// ── Key Management ────────────────────────────────────────────
export {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  deriveBitcoinKey,
  deriveEthereumKey,
  deriveSolanaKey,
  encryptSeed,
  decryptSeed,
  WebSecureStorage,
  InMemorySecureStorage,
} from './key-management';
export type { EncryptedVault, SecureStorage } from './key-management';

// ── Wallet ────────────────────────────────────────────────────
export { WalletManager } from './wallet';

// ── Errors ─────────────────────────────────────────────────────
export {
  GravytosError,
  InsufficientBalanceError,
  TransactionRejectedError,
  RPCError,
  PrivacyConstraintError,
  ChainNotSupportedError,
} from './errors';
