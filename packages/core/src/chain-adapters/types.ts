// ===================================================================
// GRAVYTOS -- Chain Adapter Interface
// Abstract interface that each chain family must implement
// ===================================================================

import type {
  ChainFamily,
  ChainConfig,
  ChainId,
  TransactionRequest,
  UnsignedTransaction,
  SignedTransaction,
  TransactionStatus,
  PrivacyCapability,
} from '@gravytos/types';

/**
 * Unified interface for interacting with any supported blockchain.
 * Each chain family (Bitcoin, EVM, Solana) provides its own implementation.
 */
export interface ChainAdapter {
  /** The chain family this adapter handles */
  readonly chainFamily: ChainFamily;

  /** The specific chain ID this adapter instance is configured for */
  readonly chainId: ChainId;

  /**
   * Initialize the adapter with chain-specific configuration.
   * Must be called before any other method.
   */
  initialize(config: ChainConfig): Promise<void>;

  /** Whether the adapter has been successfully initialized */
  isInitialized(): boolean;

  /**
   * Get the native token balance for an address.
   * @returns Balance as a decimal string in the token's base units
   */
  getBalance(address: string): Promise<string>;

  /**
   * Get the balance of a specific token for an address.
   * @param address - The wallet address
   * @param tokenAddress - Contract/mint address of the token
   * @returns Balance as a decimal string in the token's base units
   */
  getTokenBalance(address: string, tokenAddress: string): Promise<string>;

  /**
   * Build an unsigned transaction from a request.
   * Handles gas estimation, nonce management, UTXO selection, etc.
   */
  buildTransaction(request: TransactionRequest): Promise<UnsignedTransaction>;

  /**
   * Sign an unsigned transaction.
   * @param tx - The unsigned transaction to sign
   * @param privateKey - Optional private key bytes (if not using internal signer)
   */
  signTransaction(
    tx: UnsignedTransaction,
    privateKey?: Uint8Array,
  ): Promise<SignedTransaction>;

  /**
   * Broadcast a signed transaction to the network.
   * @returns The transaction hash
   */
  broadcastTransaction(tx: SignedTransaction): Promise<string>;

  /**
   * Check the status of a previously submitted transaction.
   */
  getTransactionStatus(txHash: string): Promise<TransactionStatus>;

  /**
   * List the privacy capabilities supported by this chain adapter.
   */
  getPrivacyCapabilities(): PrivacyCapability[];

  /**
   * Estimate the fee for a transaction without building it.
   * @returns Estimated fee as a decimal string in native token units
   */
  estimateFee(request: TransactionRequest): Promise<string>;
}
