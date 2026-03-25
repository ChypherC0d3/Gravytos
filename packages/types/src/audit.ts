// ═══════════════════════════════════════════════════════════════
// NEXORA VAULT — Audit Types
// Event sourcing with hash chaining for verifiable audit trail
// Optional auditability / user-controlled transparency
// ═══════════════════════════════════════════════════════════════

import type { ChainId } from './chain';
import type { PrivacyLevel } from './privacy';

// ─── Audit Action Types ──────────────────────────────────────

export enum AuditActionType {
  // Wallet lifecycle
  WalletCreated = 'wallet_created',
  WalletImported = 'wallet_imported',
  WalletUnlocked = 'wallet_unlocked',
  WalletLocked = 'wallet_locked',
  AccountAdded = 'account_added',
  AddressGenerated = 'address_generated',

  // Transactions
  TransactionSent = 'transaction_sent',
  TransactionReceived = 'transaction_received',
  TransactionFailed = 'transaction_failed',

  // DeFi operations
  SwapExecuted = 'swap_executed',
  BridgeExecuted = 'bridge_executed',
  DepositExecuted = 'deposit_executed',
  WithdrawExecuted = 'withdraw_executed',
  ApprovalGranted = 'approval_granted',

  // Privacy
  PrivacyLevelChanged = 'privacy_level_changed',
  CoinControlUsed = 'coin_control_used',
  AddressRotated = 'address_rotated',

  // Settings
  SettingsChanged = 'settings_changed',
  RpcChanged = 'rpc_changed',

  // Audit
  AuditExported = 'audit_exported',
  IntegrityVerified = 'integrity_verified',
}

// ─── Audit Event ─────────────────────────────────────────────

export interface AuditEvent {
  /** Unique event ID (UUID v4) */
  id: string;
  /** Event timestamp (Unix ms) */
  timestamp: number;
  /** Type of action */
  actionType: AuditActionType;
  /** Wallet ID that originated this event */
  walletId: string;
  /** Chain where the action occurred */
  chainId: ChainId;
  /** Transaction hash (if applicable) */
  txHash?: string;
  /** Privacy level at time of action */
  privacyLevel: PrivacyLevel;
  /** Event-specific details */
  details: Record<string, unknown>;
  /**
   * Proof hash: SHA-256(id | timestamp | actionType | JSON(details))
   * Proves the event content hasn't been modified
   */
  proofHash: string;
  /**
   * Previous event's chain hash.
   * Genesis event uses '0'.repeat(64).
   * Chain hash = SHA-256(proofHash | previousHash)
   */
  previousHash: string;
}

// ─── Audit Export ────────────────────────────────────────────

export interface AuditExport {
  /** Export format version */
  version: string;
  /** Export timestamp */
  exportedAt: number;
  /** Application identifier */
  application: 'gravytos';
  /** Total events in export */
  totalEvents: number;
  /** Whether integrity was verified at export time */
  integrityVerified: boolean;
  /** First event timestamp */
  startDate?: number;
  /** Last event timestamp */
  endDate?: number;
  /** Wallet IDs included */
  walletIds: string[];
  /** The events */
  events: AuditEvent[];
}

// ─── Audit Verification ──────────────────────────────────────

export interface AuditVerificationResult {
  /** Whether the entire chain is valid */
  valid: boolean;
  /** Total events checked */
  totalChecked: number;
  /** Index where integrity broke (if invalid) */
  brokenAtIndex?: number;
  /** Event ID where integrity broke */
  brokenAtEventId?: string;
  /** Verification timestamp */
  verifiedAt: number;
}
