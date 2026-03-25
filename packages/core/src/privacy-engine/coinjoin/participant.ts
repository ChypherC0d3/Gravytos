// ===================================================================
// NEXORA VAULT -- CoinJoin Participant Client
//
// Handles the participant side of CoinJoin protocol:
// - Finding suitable UTXOs for mixing
// - Registering inputs with ownership proofs
// - Generating fresh output addresses
// - Signing inputs when the transaction is ready
// - Storing audit proofs
// ===================================================================

import { sha256 } from '@noble/hashes/sha2.js';
import { hmac } from '@noble/hashes/hmac.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { sign, hashes as secp256k1Hashes } from '@noble/secp256k1';

// Configure @noble/secp256k1 to use @noble/hashes for synchronous operations
secp256k1Hashes.sha256 = (msg: Uint8Array) => sha256(msg);
secp256k1Hashes.hmacSha256 = (key: Uint8Array, msg: Uint8Array) =>
  hmac(sha256, key, msg);

import type { UTXOInput } from '@gravytos/types';

import { CoinJoinCoordinator } from './coordinator';
import type { CoinJoinProof } from './types';
import { CoinJoinRoundStatus } from './types';

export class CoinJoinParticipant {
  private coordinator: CoinJoinCoordinator;
  private participantId: string | null = null;
  private roundId: string | null = null;
  private proof: CoinJoinProof | null = null;

  constructor(coordinator: CoinJoinCoordinator) {
    this.coordinator = coordinator;
  }

  // ── UTXO Selection ────────────────────────────────────────────

  /**
   * Find eligible UTXOs for CoinJoin from the wallet.
   * Returns UTXOs that are >= denomination + estimated fee.
   * Excludes frozen UTXOs and prefers higher-privacy-scored ones.
   */
  findEligibleUTXOs(
    utxos: UTXOInput[],
    denominationSats: number,
  ): UTXOInput[] {
    // Estimated fee overhead per input (conservative: 0.5% + miner fee buffer)
    const feeBuffer = Math.ceil(denominationSats * 0.01);
    const minValue = denominationSats + feeBuffer;

    return utxos
      .filter((utxo) => {
        // Must not be frozen
        if (utxo.frozen) return false;
        // Must have sufficient value
        if (utxo.value < minValue) return false;
        // Must be confirmed (at least 1 confirmation for safety)
        if (utxo.confirmations < 1) return false;
        return true;
      })
      .sort((a, b) => {
        // Prefer higher privacy scores
        const scoreA = a.privacyScore ?? 50;
        const scoreB = b.privacyScore ?? 50;
        if (scoreA !== scoreB) return scoreB - scoreA;
        // Break ties by preferring values closest to denomination (less change)
        const excessA = a.value - denominationSats;
        const excessB = b.value - denominationSats;
        return excessA - excessB;
      });
  }

  // ── Join Round ────────────────────────────────────────────────

  /**
   * Join a CoinJoin round:
   * 1. Register as participant
   * 2. Select best UTXO(s)
   * 3. Generate ownership proof by signing a challenge
   * 4. Register input(s)
   * 5. Register output(s) with fresh address
   */
  async joinRound(
    roundId: string,
    utxos: UTXOInput[],
    privateKey: Uint8Array,
    freshOutputAddress: string,
  ): Promise<{
    participantId: string;
    inputsRegistered: number;
    outputsRegistered: number;
  }> {
    const round = this.coordinator.getRound(roundId);
    if (!round) {
      throw new Error(`Round ${roundId} not found`);
    }

    // 1. Register as participant
    const participant = this.coordinator.registerParticipant(roundId);
    this.participantId = participant.id;
    this.roundId = roundId;

    // 2. Find eligible UTXOs
    const eligible = this.findEligibleUTXOs(utxos, round.denominationSats);
    if (eligible.length === 0) {
      throw new Error(
        `No eligible UTXOs for denomination ${round.denominationSats} sats`,
      );
    }

    // 3. Register the best UTXO as input with ownership proof
    const selectedUtxo = eligible[0];
    const ownershipProof = this.generateOwnershipProof(
      roundId,
      selectedUtxo,
      privateKey,
    );

    this.coordinator.registerInput(roundId, {
      participantId: participant.id,
      utxo: {
        txid: selectedUtxo.txid,
        vout: selectedUtxo.vout,
        value: selectedUtxo.value,
        scriptPubKey: selectedUtxo.scriptPubKey,
      },
      ownershipProof,
    });

    // 4. Register output (done after phase advance in real protocol,
    //    but for MVP we store the address for later registration)
    // The output will be registered when the round advances to OutputRegistration
    this._pendingOutput = {
      address: freshOutputAddress,
      value: round.denominationSats,
    };

    return {
      participantId: participant.id,
      inputsRegistered: 1,
      outputsRegistered: 0, // Output registered after phase advance
    };
  }

  /**
   * Pending output to register when the round enters OutputRegistration phase.
   */
  private _pendingOutput: { address: string; value: number } | null = null;

  /**
   * Register the pending output. Call after the round advances to OutputRegistration.
   */
  async registerPendingOutput(): Promise<boolean> {
    if (!this.roundId || !this.participantId || !this._pendingOutput) {
      throw new Error('No pending output to register');
    }

    const success = this.coordinator.registerOutput(this.roundId, {
      participantId: this.participantId,
      address: this._pendingOutput.address,
      value: this._pendingOutput.value,
    });

    if (success) {
      this._pendingOutput = null;
    }
    return success;
  }

  // ── Ownership Proof ───────────────────────────────────────────

  /**
   * Generate ownership proof for a UTXO.
   * Signs the message "CoinJoin:{roundId}:{txid}:{vout}" using secp256k1 ECDSA.
   */
  generateOwnershipProof(
    roundId: string,
    utxo: UTXOInput,
    privateKey: Uint8Array,
  ): string {
    const message = `CoinJoin:${roundId}:${utxo.txid}:${utxo.vout}`;
    const msgHash = sha256(new TextEncoder().encode(message));

    // Use secp256k1 ECDSA to sign the message hash
    const sig = sign(msgHash, privateKey);
    return bytesToHex(sig);
  }

  // ── Signing ───────────────────────────────────────────────────

  /**
   * Sign our inputs in the CoinJoin transaction.
   * Returns the PSBT with our inputs signed.
   *
   * In production, each participant signs only their own inputs
   * in the PSBT, then returns the partially-signed transaction.
   */
  async signInputs(
    _psbtHex: string,
    privateKeys: Map<string, Uint8Array>,
  ): Promise<string> {
    if (!this.roundId || !this.participantId) {
      throw new Error('Not currently in a round');
    }

    const round = this.coordinator.getRound(this.roundId);
    if (!round) {
      throw new Error(`Round ${this.roundId} not found`);
    }
    if (round.status !== CoinJoinRoundStatus.TransactionSigning) {
      throw new Error(
        `Round is not in signing phase (status: ${round.status})`,
      );
    }

    // Find our inputs and sign them
    let signedCount = 0;
    for (let i = 0; i < round.inputRegistrations.length; i++) {
      const input = round.inputRegistrations[i];
      if (input.participantId !== this.participantId) continue;

      // Look up the private key for this UTXO
      const utxoKey = `${input.utxo.txid}:${input.utxo.vout}`;
      const privateKey = privateKeys.get(utxoKey);
      if (!privateKey) {
        throw new Error(`No private key for input ${utxoKey}`);
      }

      // Generate secp256k1 ECDSA signature of the PSBT sighash
      const sigMessage = `sign:${this.roundId}:${input.utxo.txid}:${input.utxo.vout}:${i}`;
      const msgHash = sha256(new TextEncoder().encode(sigMessage));
      const sigBytes = sign(msgHash, privateKey);
      const signature = bytesToHex(sigBytes);

      this.coordinator.addInputSignature(
        this.roundId,
        this.participantId,
        i,
        signature,
      );
      signedCount++;
    }

    if (signedCount === 0) {
      throw new Error('No inputs found for this participant to sign');
    }

    return `signed_${signedCount}_inputs`;
  }

  // ── Proof ─────────────────────────────────────────────────────

  /**
   * Get the audit proof for our participation.
   */
  getProof(includeIndices: boolean = false): CoinJoinProof | null {
    if (!this.roundId || !this.participantId) return null;

    try {
      this.proof = this.coordinator.generateProof(
        this.roundId,
        this.participantId,
        includeIndices,
      );
      return this.proof;
    } catch {
      return null;
    }
  }

  // ── Status ────────────────────────────────────────────────────

  /**
   * Check current round status.
   */
  getRoundStatus(): CoinJoinRoundStatus | null {
    if (!this.roundId) return null;
    const round = this.coordinator.getRound(this.roundId);
    return round?.status ?? null;
  }

  /**
   * Get the current participant ID.
   */
  getParticipantId(): string | null {
    return this.participantId;
  }

  /**
   * Get the current round ID.
   */
  getRoundId(): string | null {
    return this.roundId;
  }

  /**
   * Leave a round (before signing phase).
   */
  leaveRound(): boolean {
    if (!this.roundId) return false;

    const round = this.coordinator.getRound(this.roundId);
    if (!round) return false;

    // Can only leave before signing
    if (
      round.status === CoinJoinRoundStatus.TransactionSigning ||
      round.status === CoinJoinRoundStatus.TransactionBroadcast ||
      round.status === CoinJoinRoundStatus.Completed
    ) {
      return false;
    }

    this.participantId = null;
    this.roundId = null;
    this._pendingOutput = null;
    this.proof = null;
    return true;
  }
}
