// ===================================================================
// GRAVYTOS -- Solana Privacy Engine
// Wallet rotation, priority fee randomization, transaction bundling
// ===================================================================

import { PrivacyLevel } from '@gravytos/types';
import type { TransactionRequest } from '@gravytos/types';

/**
 * Solana-specific privacy engine.
 *
 * Privacy levels:
 *   Low    - Direct transaction, no enhancements
 *   Medium - Derived wallet rotation, random priority fee
 *   High   - Fee payer abstraction, transaction bundling, timing randomization
 */
export class SolanaPrivacyEngine {
  // ── Transaction Enhancement ─────────────────────────────────────

  /**
   * Enhance a Solana transaction based on privacy level.
   */
  enhanceTransaction(
    tx: TransactionRequest,
    level: PrivacyLevel,
  ): TransactionRequest {
    const enhanced: TransactionRequest = { ...tx, privacyLevel: level };

    switch (level) {
      case PrivacyLevel.Low:
        enhanced.delay = 0;
        break;

      case PrivacyLevel.Medium:
        enhanced.delay = this.randomDelay(5000, 30000);
        // Randomize priority fee to avoid fingerprinting.
        if (enhanced.feeRate) {
          const baseFee = Number(enhanced.feeRate);
          enhanced.feeRate = String(this.randomizePriorityFee(baseFee));
        }
        break;

      case PrivacyLevel.High: {
        enhanced.delay = this.randomDelay(30000, 300000);
        // Randomize priority fee.
        if (enhanced.feeRate) {
          const baseFee = Number(enhanced.feeRate);
          enhanced.feeRate = String(this.randomizePriorityFee(baseFee));
        }
        break;
      }
    }

    return enhanced;
  }

  // ── Address Rotation ────────────────────────────────────────────

  /**
   * Get a different derived account address for wallet rotation.
   *
   * Solana HD derivation path: m/44'/501'/{accountIndex}'/{changeIndex}'
   *
   * Given the base account index and a rotation counter, returns a new
   * derivation index that the caller can use to derive a fresh keypair.
   * The rotation wraps around a pool of 16 sub-accounts per base index
   * to limit the number of accounts that need to be scanned.
   *
   * @param baseIndex     The user's primary account index (e.g. 0).
   * @param rotationIndex A monotonically increasing counter.
   * @returns A new derivation account index.
   */
  getRotatedAddress(baseIndex: number, rotationIndex: number): number {
    // Use a pool of 16 sub-accounts per base address.
    // Rotation produces indices: baseIndex*16 + (rotationIndex % 16)
    const POOL_SIZE = 16;
    return baseIndex * POOL_SIZE + (rotationIndex % POOL_SIZE);
  }

  // ── Priority Fee Randomization ──────────────────────────────────

  /**
   * Randomize the priority fee (in micro-lamports or similar units)
   * to avoid transaction fingerprinting.
   *
   * Adds +/- up to 10 % jitter, with a minimum floor of 1.
   */
  randomizePriorityFee(baseFee: number): number {
    if (baseFee <= 0) return baseFee;

    const maxDelta = Math.max(1, Math.floor(baseFee * 0.1));
    // Random integer in [-maxDelta, +maxDelta]
    const delta =
      Math.floor(Math.random() * (maxDelta * 2 + 1)) - maxDelta;
    return Math.max(1, baseFee + delta);
  }

  // ── Transaction Bundling ────────────────────────────────────────

  /**
   * Prepare transaction for bundling (delay + batch).
   *
   * At Medium level: small delay, no bundling.
   * At High level: larger delay, enable bundling so multiple
   *                transactions can be submitted together.
   */
  prepareBundling(level: PrivacyLevel): {
    delay: number;
    shouldBundle: boolean;
  } {
    switch (level) {
      case PrivacyLevel.Low:
        return { delay: 0, shouldBundle: false };

      case PrivacyLevel.Medium:
        return {
          delay: this.randomDelay(5000, 30000),
          shouldBundle: false,
        };

      case PrivacyLevel.High:
        return {
          delay: this.randomDelay(30000, 300000),
          shouldBundle: true,
        };
    }
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
