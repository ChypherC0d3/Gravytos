// ═══════════════════════════════════════════════════════════════
// NEXORA VAULT — Wallet Types
// HD wallet management, accounts, and key derivation
// ═══════════════════════════════════════════════════════════════

import type { ChainFamily, ChainId } from './chain';

export interface Wallet {
  /** Unique wallet ID */
  id: string;
  /** User-assigned wallet name */
  name: string;
  /** Creation timestamp */
  createdAt: number;
  /** Last unlocked timestamp */
  lastUnlockedAt: number;
  /** Whether the wallet is currently unlocked */
  isUnlocked: boolean;
  /** Accounts belonging to this wallet */
  accounts: WalletAccount[];
}

export interface WalletAccount {
  /** Unique account ID */
  id: string;
  /** Parent wallet ID */
  walletId: string;
  /** Chain family this account belongs to */
  chainFamily: ChainFamily;
  /** Specific chain ID */
  chainId: ChainId;
  /** Public address */
  address: string;
  /** Public key (hex) */
  publicKey: string;
  /** BIP44 derivation path */
  derivationPath: string;
  /** User-assigned label */
  label: string;
  /** Account index in HD derivation */
  accountIndex: number;
  /** Address index (for BTC address rotation) */
  addressIndex: number;
  /** Creation timestamp */
  createdAt: number;
  /** Custom metadata */
  metadata: Record<string, unknown>;
}

export interface DerivedKey {
  /** Public key bytes */
  publicKey: Uint8Array;
  /** Private key bytes (only available when wallet is unlocked) */
  privateKey: Uint8Array;
  /** BIP44 derivation path used */
  derivationPath: string;
  /** Derived address */
  address: string;
  /** Chain family */
  chainFamily: ChainFamily;
}

export interface EncryptedData {
  /** Ciphertext (base64) */
  ciphertext: string;
  /** Initialization vector (base64) */
  iv: string;
  /** Salt for key derivation (base64) */
  salt: string;
  /** Algorithm identifier */
  algorithm: 'AES-256-GCM';
  /** KDF parameters */
  kdf: {
    algorithm: 'PBKDF2';
    iterations: number;
    hash: 'SHA-256';
  };
}

export interface TokenBalance {
  /** Token symbol */
  symbol: string;
  /** Raw balance (as string to avoid precision loss) */
  raw: string;
  /** Formatted balance for display */
  formatted: string;
  /** Token decimals */
  decimals: number;
  /** USD value (if available) */
  usdValue?: number;
  /** Last updated timestamp */
  lastUpdated: number;
}
