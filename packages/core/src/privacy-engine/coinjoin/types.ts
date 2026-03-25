// ===================================================================
// NEXORA VAULT -- CoinJoin Coordination Protocol Types
//
// Inspired by WabiSabi (Wasabi Wallet) but adapted for:
// - Non-custodial operation (coordinator never holds funds)
// - Optional audit proofs (user-controlled transparency)
// - Multi-round coordination
//
// IMPORTANT LANGUAGE:
// - "privacy-enhanced transactions" NOT "anonymous"
// - "user-controlled transparency" NOT "untraceable"
// - "optional auditability" NOT "hidden"
// ===================================================================

export interface CoinJoinRound {
  id: string;
  status: CoinJoinRoundStatus;
  createdAt: number;
  expiresAt: number;

  // Parameters
  denominationSats: number;      // Target denomination (e.g., 100000 sats = 0.001 BTC)
  maxParticipants: number;
  minParticipants: number;       // Minimum to proceed (typically 2-5)
  coordinatorFeeRate: number;    // Fee in basis points (e.g., 30 = 0.3%)

  // State
  participants: CoinJoinParticipant[];
  inputRegistrations: CoinJoinInput[];
  outputRegistrations: CoinJoinOutput[];

  // Result
  unsignedTransaction?: string;  // Hex PSBT
  signedTransaction?: string;    // Hex signed tx
  txHash?: string;
}

export enum CoinJoinRoundStatus {
  InputRegistration = 'input_registration',
  OutputRegistration = 'output_registration',
  TransactionSigning = 'transaction_signing',
  TransactionBroadcast = 'transaction_broadcast',
  Completed = 'completed',
  Failed = 'failed',
  Expired = 'expired',
}

export interface CoinJoinParticipant {
  id: string;                    // Anonymous participant ID (not wallet address)
  registeredAt: number;
  inputCount: number;
  outputCount: number;
  verified: boolean;             // Proved ownership of UTXOs
}

export interface CoinJoinInput {
  participantId: string;
  utxo: {
    txid: string;
    vout: number;
    value: number;               // satoshis
    scriptPubKey: string;
  };
  ownershipProof: string;        // Signature proving UTXO ownership
  blindedAmount?: string;        // Blinded amount commitment (Pedersen)
}

export interface CoinJoinOutput {
  participantId: string;         // Must match a registered participant
  address: string;               // Fresh address for the output
  value: number;                 // satoshis
  blindedOutput?: string;        // Blinded output commitment
}

export interface CoinJoinProof {
  roundId: string;
  txHash: string;
  participantCount: number;
  denomination: number;
  timestamp: number;
  proofHash: string;             // SHA-256 of round data
  // Optional disclosure
  userInputIndices?: number[];   // Which inputs were ours (for selective disclosure)
  userOutputIndices?: number[];  // Which outputs were ours
}

export interface CoinJoinConfig {
  enabled: boolean;
  autoJoin: boolean;             // Automatically join rounds when UTXOs available
  targetDenomination: number;    // Target denomination in sats
  maxCoordinatorFee: number;     // Max fee willing to pay (bps)
  minParticipants: number;       // Minimum acceptable anonymity set
  maxRoundWaitTime: number;      // Max wait for a round to fill (ms)
}

export const DEFAULT_COINJOIN_CONFIG: CoinJoinConfig = {
  enabled: false,
  autoJoin: false,
  targetDenomination: 100000,    // 0.001 BTC
  maxCoordinatorFee: 50,         // 0.5%
  minParticipants: 3,
  maxRoundWaitTime: 600000,      // 10 minutes
};
