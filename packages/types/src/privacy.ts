// ═══════════════════════════════════════════════════════════════
// NEXORA VAULT — Privacy Types
// "Privacy by design + auditability on demand"
// User-controlled transparency / privacy-enhanced transactions
// ═══════════════════════════════════════════════════════════════

export enum PrivacyLevel {
  /** Fast, cheap. Standard transaction. */
  Low = 'low',
  /** Routing + batching + RPC rotation. */
  Medium = 'medium',
  /** CoinJoin / stealth addresses / full privacy suite. */
  High = 'high',
}

export interface PrivacyConfig {
  /** Current privacy level */
  level: PrivacyLevel;
  /** Rotate RPC endpoints between requests */
  rpcRotation: boolean;
  /** Generate new addresses for each transaction (BTC) */
  addressRotation: boolean;
  /** Random delay before broadcasting (ms), 0 = no delay */
  transactionDelay: number;
  /** Enable coin control UI for manual UTXO selection (BTC) */
  coinControl: boolean;
  /** Enable stealth address generation (ETH) */
  stealthAddresses: boolean;
  /** Enable transaction batching */
  transactionBatching: boolean;
  /** Use Tor for network requests (optional) */
  torEnabled: boolean;
  /** Custom RPC endpoints */
  customRpcUrls: Record<string, string[]>;
}

export interface PrivacyCapability {
  /** Capability identifier */
  id: string;
  /** Human-readable name */
  name: string;
  /** Description */
  description: string;
  /** Minimum privacy level that enables this */
  minLevel: PrivacyLevel;
  /** Chain families that support this */
  supportedChains: string[];
  /** Whether it's currently active */
  active: boolean;
}

/** Default privacy configs per level */
export const DEFAULT_PRIVACY_CONFIGS: Record<PrivacyLevel, PrivacyConfig> = {
  [PrivacyLevel.Low]: {
    level: PrivacyLevel.Low,
    rpcRotation: false,
    addressRotation: false,
    transactionDelay: 0,
    coinControl: false,
    stealthAddresses: false,
    transactionBatching: false,
    torEnabled: false,
    customRpcUrls: {},
  },
  [PrivacyLevel.Medium]: {
    level: PrivacyLevel.Medium,
    rpcRotation: true,
    addressRotation: true,
    transactionDelay: 15000, // 15 seconds average
    coinControl: false,
    stealthAddresses: false,
    transactionBatching: true,
    torEnabled: false,
    customRpcUrls: {},
  },
  [PrivacyLevel.High]: {
    level: PrivacyLevel.High,
    rpcRotation: true,
    addressRotation: true,
    transactionDelay: 120000, // Up to 2 minutes
    coinControl: true,
    stealthAddresses: true,
    transactionBatching: true,
    torEnabled: false, // Optional, not forced
    customRpcUrls: {},
  },
};
