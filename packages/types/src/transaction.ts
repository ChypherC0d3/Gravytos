// ═══════════════════════════════════════════════════════════════
// GRAVYTOS — Transaction Types
// Multi-chain transaction building, signing, and broadcasting
// ═══════════════════════════════════════════════════════════════

import type { ChainId } from './chain';
import type { PrivacyLevel } from './privacy';

// ─── Transaction Status ──────────────────────────────────────

export type TransactionStatus =
  | 'pending'
  | 'signing'
  | 'broadcasting'
  | 'confirming'
  | 'confirmed'
  | 'failed';

// ─── UTXO (Bitcoin) ──────────────────────────────────────────

export interface UTXOInput {
  /** Transaction ID */
  txid: string;
  /** Output index */
  vout: number;
  /** Value in satoshis */
  value: number;
  /** Script pubkey (hex) */
  scriptPubKey: string;
  /** Address this UTXO belongs to */
  address: string;
  /** Number of confirmations */
  confirmations: number;
  /** User-assigned label for coin control */
  label?: string;
  /** Privacy score (0-100, computed by privacy engine) */
  privacyScore?: number;
  /** Whether this UTXO is frozen (excluded from auto-selection) */
  frozen?: boolean;
}

export enum UTXOSelectionStrategy {
  LargestFirst = 'largest_first',
  SmallestFirst = 'smallest_first',
  PrivacyOptimized = 'privacy_optimized',
  Manual = 'manual',
}

// ─── Transaction Request ─────────────────────────────────────

export interface TransactionRequest {
  /** Chain to execute on */
  chainId: ChainId;
  /** Sender address */
  from: string;
  /** Recipient address */
  to: string;
  /** Amount to send (as string, in native units) */
  value: string;
  /** Optional calldata (EVM) */
  data?: string;
  /** Token address (empty for native) */
  tokenAddress?: string;
  /** Parent wallet ID */
  walletId: string;

  // BTC-specific
  /** Selected UTXOs (for coin control) */
  utxos?: UTXOInput[];
  /** Change address override */
  changeAddress?: string;

  // Privacy
  /** Desired privacy level */
  privacyLevel: PrivacyLevel;
  /** Delay before broadcasting (ms) */
  delay?: number;

  // Fees
  /** Gas price / fee rate */
  feeRate?: string;
  /** Gas limit (EVM) */
  gasLimit?: string;
  /** Max priority fee (EVM EIP-1559) */
  maxPriorityFee?: string;
}

// ─── Unsigned / Signed Transactions ──────────────────────────

export interface UnsignedTransaction {
  /** Chain ID */
  chainId: ChainId;
  /** Serialized unsigned transaction (chain-specific format) */
  raw: Uint8Array;
  /** Human-readable summary */
  summary: TransactionSummary;
  /** Estimated fee */
  estimatedFee: string;
}

export interface SignedTransaction {
  /** Chain ID */
  chainId: ChainId;
  /** Serialized signed transaction */
  raw: Uint8Array;
  /** Transaction hash (pre-computed) */
  txHash: string;
}

// ─── Transaction Result ──────────────────────────────────────

export interface TransactionResult {
  /** Transaction hash */
  txHash: string;
  /** Current status */
  status: TransactionStatus;
  /** Chain ID */
  chainId: ChainId;
  /** Block number (when confirmed) */
  blockNumber?: number;
  /** Actual fee paid */
  fee: string;
  /** Timestamp */
  timestamp: number;
  /** Explorer URL */
  explorerUrl?: string;
}

export interface TransactionSummary {
  /** Type of transaction */
  type: 'send' | 'swap' | 'bridge' | 'approve' | 'deposit' | 'withdraw';
  /** From address */
  from: string;
  /** To address */
  to: string;
  /** Value being transferred */
  value: string;
  /** Token symbol */
  tokenSymbol: string;
  /** Estimated fee */
  estimatedFee: string;
  /** Fee token symbol */
  feeTokenSymbol: string;
}

// ─── Swap Types ──────────────────────────────────────────────

export interface SwapQuoteParams {
  chainId: ChainId;
  fromToken: string;
  toToken: string;
  amount: string;
  slippage: number;
  userAddress: string;
}

export interface SwapQuote {
  /** Provider name */
  provider: string;
  /** Input amount */
  inputAmount: string;
  /** Output amount (after fees) */
  outputAmount: string;
  /** Platform fee */
  platformFee: string;
  /** Estimated gas cost */
  estimatedGas: string;
  /** Price impact percentage */
  priceImpact: number;
  /** Route details */
  route: SwapRoute[];
  /** Transaction data (ready to sign) */
  tx?: {
    to: string;
    data: string;
    value: string;
    gasLimit?: string;
  };
  /** Quote expiry timestamp */
  expiresAt: number;
}

export interface SwapRoute {
  /** DEX/protocol name */
  protocol: string;
  /** Input token */
  fromToken: string;
  /** Output token */
  toToken: string;
  /** Percentage of total through this route */
  percentage: number;
}

// ─── Bridge Types ────────────────────────────────────────────

export interface BridgeQuoteParams {
  fromChainId: ChainId;
  toChainId: ChainId;
  fromToken: string;
  toToken: string;
  amount: string;
  userAddress: string;
  recipientAddress?: string;
}

export interface BridgeQuote {
  /** Provider name */
  provider: string;
  /** Input amount */
  inputAmount: string;
  /** Output amount */
  outputAmount: string;
  /** Platform fee */
  platformFee: string;
  /** Bridge fee */
  bridgeFee: string;
  /** Estimated time in seconds */
  estimatedTime: number;
  /** Route through chains */
  route: BridgeRoute[];
  /** Transaction to execute */
  tx?: {
    to: string;
    data: string;
    value: string;
  };
}

export interface BridgeRoute {
  /** Source chain */
  fromChainId: ChainId;
  /** Destination chain */
  toChainId: ChainId;
  /** Bridge protocol used */
  bridge: string;
  /** Token being bridged */
  token: string;
}
