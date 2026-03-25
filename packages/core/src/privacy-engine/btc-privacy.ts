// ===================================================================
// NEXORA VAULT -- Bitcoin Privacy Engine
// Coin Control, UTXO privacy scoring, address rotation
// ===================================================================

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

import { PrivacyLevel } from '@gravytos/types';
import type { UTXOInput, TransactionRequest } from '@gravytos/types';

import { CoinJoinCoordinator } from './coinjoin/coordinator';
import { CoinJoinParticipant as CoinJoinParticipantClient } from './coinjoin/participant';
import type { CoinJoinRound, CoinJoinConfig } from './coinjoin/types';
import { DEFAULT_COINJOIN_CONFIG } from './coinjoin/types';

/**
 * Bitcoin-specific privacy engine implementing Coin Control and address rotation.
 *
 * Privacy levels:
 *   Low    - Largest-first UTXO selection, single change address, no delay
 *   Medium - Privacy-optimized selection, fresh HD change address, small delay
 *   High   - Manual coin control required, multiple change outputs, large delay
 */
export class BitcoinPrivacyEngine {
  private coinJoinConfig: CoinJoinConfig;
  private coinJoinCoordinator: CoinJoinCoordinator | null = null;

  constructor(coinJoinConfig?: Partial<CoinJoinConfig>) {
    this.coinJoinConfig = { ...DEFAULT_COINJOIN_CONFIG, ...coinJoinConfig };
    if (this.coinJoinConfig.enabled) {
      this.coinJoinCoordinator = new CoinJoinCoordinator(this.coinJoinConfig);
    }
  }

  /**
   * Enhance a Bitcoin transaction based on privacy level.
   */
  enhanceTransaction(
    tx: TransactionRequest,
    level: PrivacyLevel,
  ): TransactionRequest {
    const enhanced: TransactionRequest = { ...tx, privacyLevel: level };

    switch (level) {
      case PrivacyLevel.Low:
        // Standard: let the UTXO manager pick with LargestFirst.
        // Clear any manually-set UTXOs so the manager handles it.
        enhanced.utxos = undefined;
        enhanced.delay = 0;
        break;

      case PrivacyLevel.Medium:
        enhanced.delay = this.randomDelay(5000, 30000);
        // If UTXOs are provided, re-sort them by privacy score (descending)
        // so that the most private coins are consumed first.
        if (enhanced.utxos && enhanced.utxos.length > 0) {
          enhanced.utxos = [...enhanced.utxos].sort(
            (a, b) => (b.privacyScore ?? 0) - (a.privacyScore ?? 0),
          );
        }
        break;

      case PrivacyLevel.High:
        enhanced.delay = this.randomDelay(30000, 300000);
        // Coin control -- the user MUST have pre-selected UTXOs.
        if (!enhanced.utxos || enhanced.utxos.length === 0) {
          throw new Error(
            'High privacy mode requires manual UTXO selection (Coin Control)',
          );
        }
        // Verify none of the selected UTXOs are frozen.
        const frozenCount = enhanced.utxos.filter((u) => u.frozen).length;
        if (frozenCount > 0) {
          throw new Error(
            `${frozenCount} frozen UTXO(s) included in selection. Un-freeze them or remove them.`,
          );
        }
        break;
    }

    return enhanced;
  }

  // ── UTXO Privacy Scoring ────────────────────────────────────────

  /**
   * Score a UTXO for privacy (0-100, higher = more private).
   *
   * Factors:
   *   - Address reuse: fewer reuses = better privacy
   *   - Confirmation depth: older UTXOs are harder to trace in real-time analysis
   *   - Value commonality: round-number values are more fingerprintable
   *   - Label presence: labelled coins are intentionally segregated (bonus)
   */
  scoreUTXO(utxo: UTXOInput, allUTXOs: UTXOInput[]): number {
    let score = 100;

    // --- Address reuse penalty ---
    const addressCount = allUTXOs.filter(
      (u) => u.address === utxo.address,
    ).length;
    // Each reuse beyond the first costs 15 points, max 45.
    const reusePenalty = Math.min((addressCount - 1) * 15, 45);
    score -= reusePenalty;

    // --- Confirmation depth bonus ---
    // Well-confirmed UTXOs (6+) get full marks. Unconfirmed = -20.
    if (utxo.confirmations === 0) {
      score -= 20;
    } else if (utxo.confirmations < 6) {
      score -= 10;
    }
    // else: no penalty

    // --- Round-number penalty ---
    // Values that are exact multiples of 10 000 sats look like human-chosen amounts.
    if (utxo.value > 0 && utxo.value % 10000 === 0) {
      score -= 10;
    }

    // --- Label bonus ---
    if (utxo.label && utxo.label.length > 0) {
      score += 5;
    }

    // --- Frozen penalty ---
    if (utxo.frozen) {
      score -= 15;
    }

    return Math.max(0, Math.min(100, score));
  }

  // ── CoinJoin Proof ──────────────────────────────────────────────

  /**
   * Generate a CoinJoin-ready proof hash.
   *
   * This creates an audit proof that attests:
   *   - The transaction hash that participated
   *   - The number of participants (anonymity set)
   *   - A timestamp for when the proof was generated
   *
   * The proofHash = SHA-256(txHash || participantCount || timestamp).
   */
  generateCoinJoinProof(
    txHash: string,
    participantCount: number,
  ): { proofHash: string; metadata: Record<string, unknown> } {
    const timestamp = Date.now();
    const preimage = new TextEncoder().encode(
      `${txHash}:${participantCount}:${timestamp}`,
    );
    const hash = sha256(preimage);
    const proofHash = bytesToHex(hash);

    return {
      proofHash,
      metadata: {
        txHash,
        participantCount,
        timestamp,
        version: 1,
      },
    };
  }

  // ── Privacy Risk Analysis ───────────────────────────────────────

  /**
   * Analyse whether a set of UTXOs would compromise privacy when spent
   * together. Common risks:
   *
   *   - Mixing labelled and unlabelled UTXOs
   *   - Combining UTXOs from many distinct addresses (common-input heuristic)
   *   - Spending unconfirmed outputs (chain analysis can track in real-time)
   *   - Including frozen UTXOs (user explicitly flagged them)
   */
  analyzePrivacyRisk(
    utxos: UTXOInput[],
  ): { risk: 'low' | 'medium' | 'high'; reasons: string[] } {
    const reasons: string[] = [];

    if (utxos.length === 0) {
      return { risk: 'low', reasons: [] };
    }

    // 1. Distinct addresses -- common-input ownership heuristic
    const uniqueAddresses = new Set(utxos.map((u) => u.address));
    if (uniqueAddresses.size > 3) {
      reasons.push(
        `Spending from ${uniqueAddresses.size} distinct addresses reveals common ownership (common-input heuristic)`,
      );
    }

    // 2. Mixed labelled / unlabelled
    const labelled = utxos.filter(
      (u) => u.label !== undefined && u.label !== '',
    );
    const unlabelled = utxos.filter(
      (u) => u.label === undefined || u.label === '',
    );
    if (labelled.length > 0 && unlabelled.length > 0) {
      reasons.push(
        'Mixing labelled and unlabelled UTXOs may link segregated coin pools',
      );
    }

    // 3. Label diversity -- multiple distinct labels indicate separate sources
    const distinctLabels = new Set(
      labelled.map((u) => u.label).filter(Boolean),
    );
    if (distinctLabels.size > 1) {
      reasons.push(
        `UTXOs span ${distinctLabels.size} distinct labels, suggesting different funding sources`,
      );
    }

    // 4. Unconfirmed UTXOs
    const unconfirmed = utxos.filter((u) => u.confirmations === 0);
    if (unconfirmed.length > 0) {
      reasons.push(
        `${unconfirmed.length} unconfirmed UTXO(s) can be tracked in real-time by chain analysis`,
      );
    }

    // 5. Frozen UTXOs should not be spent
    const frozen = utxos.filter((u) => u.frozen);
    if (frozen.length > 0) {
      reasons.push(
        `${frozen.length} frozen UTXO(s) are included -- these were explicitly excluded by the user`,
      );
    }

    // Determine overall risk level
    let risk: 'low' | 'medium' | 'high';
    if (reasons.length === 0) {
      risk = 'low';
    } else if (reasons.length <= 2) {
      risk = 'medium';
    } else {
      risk = 'high';
    }

    return { risk, reasons };
  }

  // ── CoinJoin Integration ───────────────────────────────────────

  /**
   * Prepare a CoinJoin round. When privacy level is High and CoinJoin is
   * enabled, the caller should offer to create or join a CoinJoin round
   * instead of a standard transaction.
   *
   * Returns eligible UTXOs, estimated fee, whether joining is possible,
   * and any active rounds that can be joined.
   */
  async prepareCoinJoin(
    utxos: UTXOInput[],
    denominationSats: number,
  ): Promise<{
    eligible: UTXOInput[];
    estimatedFee: number;
    canJoin: boolean;
    activeRounds: CoinJoinRound[];
  }> {
    if (!this.coinJoinConfig.enabled) {
      return {
        eligible: [],
        estimatedFee: 0,
        canJoin: false,
        activeRounds: [],
      };
    }

    // Ensure coordinator is initialised
    if (!this.coinJoinCoordinator) {
      this.coinJoinCoordinator = new CoinJoinCoordinator(this.coinJoinConfig);
    }

    const participant = new CoinJoinParticipantClient(this.coinJoinCoordinator);
    const eligible = participant.findEligibleUTXOs(utxos, denominationSats);

    // Estimated fee: coordinator fee on the denomination
    const feeRate = this.coinJoinConfig.maxCoordinatorFee;
    const estimatedFee = Math.ceil((denominationSats * feeRate) / 10000);

    const activeRounds = this.coinJoinCoordinator.getActiveRounds();
    const canJoin = eligible.length > 0;

    return {
      eligible,
      estimatedFee,
      canJoin,
      activeRounds,
    };
  }

  /**
   * Get the CoinJoin coordinator instance (creates one if needed).
   */
  getCoinJoinCoordinator(): CoinJoinCoordinator {
    if (!this.coinJoinCoordinator) {
      this.coinJoinCoordinator = new CoinJoinCoordinator(this.coinJoinConfig);
    }
    return this.coinJoinCoordinator;
  }

  // ── Helpers ─────────────────────────────────────────────────────

  /**
   * Generate a random delay between `min` and `max` milliseconds (inclusive).
   */
  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
