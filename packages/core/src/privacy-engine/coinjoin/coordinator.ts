// ===================================================================
// NEXORA VAULT -- CoinJoin Coordinator
//
// This implements a local coordinator for CoinJoin transactions.
// In production, this would be a server or P2P network.
// For MVP, it coordinates locally for testing and demonstrates the protocol.
//
// Protocol flow:
// 1. INPUT REGISTRATION: Participants register UTXOs with ownership proofs
// 2. OUTPUT REGISTRATION: Participants register fresh output addresses
// 3. TRANSACTION CONSTRUCTION: Coordinator builds the combined transaction
// 4. SIGNING: Each participant signs their inputs
// 5. BROADCAST: Coordinator broadcasts the fully signed transaction
// 6. PROOF GENERATION: Optional audit proof created for each participant
// ===================================================================

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

import type {
  CoinJoinRound,
  CoinJoinInput,
  CoinJoinOutput,
  CoinJoinParticipant,
  CoinJoinProof,
  CoinJoinConfig,
} from './types';
import { CoinJoinRoundStatus, DEFAULT_COINJOIN_CONFIG } from './types';

/**
 * Map of roundId -> participantId -> inputIndex -> signature hex.
 */
type SignatureStore = Map<string, Map<string, Map<number, string>>>;

export class CoinJoinCoordinator {
  private rounds: Map<string, CoinJoinRound> = new Map();
  private signatures: SignatureStore = new Map();
  private config: CoinJoinConfig;

  constructor(config?: Partial<CoinJoinConfig>) {
    this.config = { ...DEFAULT_COINJOIN_CONFIG, ...config };
  }

  // ── Round Lifecycle ───────────────────────────────────────────

  /**
   * Create a new CoinJoin round.
   */
  createRound(params: {
    denominationSats: number;
    maxParticipants?: number;
    minParticipants?: number;
    coordinatorFeeRate?: number;
    durationMs?: number;
  }): CoinJoinRound {
    const now = Date.now();
    const durationMs = params.durationMs ?? this.config.maxRoundWaitTime;

    const round: CoinJoinRound = {
      id: this.generateRoundId(),
      status: CoinJoinRoundStatus.InputRegistration,
      createdAt: now,
      expiresAt: now + durationMs,
      denominationSats: params.denominationSats,
      maxParticipants: params.maxParticipants ?? 10,
      minParticipants: params.minParticipants ?? this.config.minParticipants,
      coordinatorFeeRate: params.coordinatorFeeRate ?? 30, // 0.3% default
      participants: [],
      inputRegistrations: [],
      outputRegistrations: [],
    };

    this.rounds.set(round.id, round);
    this.signatures.set(round.id, new Map());
    return round;
  }

  // ── Participant Registration ──────────────────────────────────

  /**
   * Register as a participant in a round.
   * Returns a participant with a fresh anonymous ID.
   */
  registerParticipant(roundId: string): CoinJoinParticipant {
    const round = this.requireRound(roundId);

    if (round.status !== CoinJoinRoundStatus.InputRegistration) {
      throw new Error(
        `Round ${roundId} is not accepting participants (status: ${round.status})`,
      );
    }
    if (round.participants.length >= round.maxParticipants) {
      throw new Error(`Round ${roundId} is full`);
    }

    const participant: CoinJoinParticipant = {
      id: this.generateParticipantId(),
      registeredAt: Date.now(),
      inputCount: 0,
      outputCount: 0,
      verified: false,
    };

    round.participants.push(participant);
    return participant;
  }

  // ── Input Registration ────────────────────────────────────────

  /**
   * Register an input (UTXO) for a round.
   * Requires ownership proof (signature of a challenge message).
   */
  registerInput(roundId: string, input: CoinJoinInput): boolean {
    const round = this.requireRound(roundId);

    if (round.status !== CoinJoinRoundStatus.InputRegistration) {
      throw new Error(
        `Round ${roundId} is not accepting inputs (status: ${round.status})`,
      );
    }

    // Validate participant is registered
    const participant = round.participants.find(
      (p) => p.id === input.participantId,
    );
    if (!participant) {
      throw new Error(
        `Participant ${input.participantId} is not registered in round ${roundId}`,
      );
    }

    // Validate UTXO value >= denomination + estimated fee
    const fee = this.calculateFee(
      input.utxo.value,
      round.coordinatorFeeRate,
    );
    if (input.utxo.value < round.denominationSats + fee) {
      throw new Error(
        `UTXO value ${input.utxo.value} is too small. Need at least ${round.denominationSats + fee} sats (denomination + fee)`,
      );
    }

    // Validate ownership proof is present
    if (!this.validateOwnershipProof(input)) {
      throw new Error('Invalid ownership proof');
    }

    // Check for duplicate UTXO registration
    const isDuplicate = round.inputRegistrations.some(
      (r) => r.utxo.txid === input.utxo.txid && r.utxo.vout === input.utxo.vout,
    );
    if (isDuplicate) {
      throw new Error(
        `UTXO ${input.utxo.txid}:${input.utxo.vout} is already registered`,
      );
    }

    round.inputRegistrations.push(input);
    participant.inputCount += 1;
    participant.verified = true;
    return true;
  }

  // ── Output Registration ───────────────────────────────────────

  /**
   * Register an output address for a round.
   * This is where the participant's denominated coins will go.
   */
  registerOutput(roundId: string, output: CoinJoinOutput): boolean {
    const round = this.requireRound(roundId);

    if (round.status !== CoinJoinRoundStatus.OutputRegistration) {
      throw new Error(
        `Round ${roundId} is not accepting outputs (status: ${round.status})`,
      );
    }

    // Validate participant has registered inputs
    const participant = round.participants.find(
      (p) => p.id === output.participantId,
    );
    if (!participant) {
      throw new Error(
        `Participant ${output.participantId} is not registered in round ${roundId}`,
      );
    }
    if (participant.inputCount === 0) {
      throw new Error(
        `Participant ${output.participantId} has not registered any inputs`,
      );
    }

    // Validate output value matches denomination
    if (output.value !== round.denominationSats) {
      throw new Error(
        `Output value ${output.value} does not match denomination ${round.denominationSats}`,
      );
    }

    // Validate address hasn't been used before in this round
    const addressUsed = round.outputRegistrations.some(
      (r) => r.address === output.address,
    );
    if (addressUsed) {
      throw new Error(
        `Address ${output.address} is already registered in this round`,
      );
    }

    round.outputRegistrations.push(output);
    participant.outputCount += 1;
    return true;
  }

  // ── Phase Advancement ─────────────────────────────────────────

  /**
   * Advance the round to the next phase.
   */
  advanceRound(roundId: string): CoinJoinRoundStatus {
    const round = this.requireRound(roundId);

    switch (round.status) {
      case CoinJoinRoundStatus.InputRegistration: {
        // Need at least minParticipants with verified inputs
        const verifiedCount = round.participants.filter((p) => p.verified).length;
        if (verifiedCount < round.minParticipants) {
          throw new Error(
            `Need at least ${round.minParticipants} verified participants, have ${verifiedCount}`,
          );
        }
        round.status = CoinJoinRoundStatus.OutputRegistration;
        break;
      }

      case CoinJoinRoundStatus.OutputRegistration: {
        // All participants with inputs must have registered outputs
        const participantsWithInputs = round.participants.filter(
          (p) => p.inputCount > 0,
        );
        const allHaveOutputs = participantsWithInputs.every(
          (p) => p.outputCount > 0,
        );
        if (!allHaveOutputs) {
          throw new Error(
            'Not all participants have registered outputs yet',
          );
        }
        // Build the transaction (sets round.unsignedTransaction internally)
        this.buildCoinJoinTransaction(roundId);
        round.status = CoinJoinRoundStatus.TransactionSigning;
        break;
      }

      case CoinJoinRoundStatus.TransactionSigning: {
        if (!this.isFullySigned(roundId)) {
          throw new Error('Not all inputs have been signed');
        }
        round.signedTransaction = this.finalizeTransaction(roundId);
        round.status = CoinJoinRoundStatus.TransactionBroadcast;
        break;
      }

      case CoinJoinRoundStatus.TransactionBroadcast: {
        // In production, the coordinator would broadcast the tx here.
        // For MVP, we mark it as completed and generate a mock txHash.
        round.txHash = this.generateTxHash(round);
        round.status = CoinJoinRoundStatus.Completed;
        break;
      }

      default:
        throw new Error(
          `Round ${roundId} cannot be advanced from status: ${round.status}`,
        );
    }

    return round.status;
  }

  // ── Transaction Construction ──────────────────────────────────

  /**
   * Build the CoinJoin transaction (PSBT-like hex).
   * Combines all inputs and outputs into a single transaction.
   *
   * Critical: shuffle inputs and outputs to break linkability.
   */
  buildCoinJoinTransaction(roundId: string): string {
    const round = this.requireRound(roundId);

    if (round.inputRegistrations.length === 0) {
      throw new Error('No inputs registered');
    }
    if (round.outputRegistrations.length === 0) {
      throw new Error('No outputs registered');
    }

    // Shuffle inputs and outputs to break linkability
    const shuffledInputs = this.shuffleArray([...round.inputRegistrations]);
    const shuffledOutputs = this.shuffleArray([...round.outputRegistrations]);

    // Calculate coordinator fee
    const totalInputValue = shuffledInputs.reduce(
      (sum, inp) => sum + inp.utxo.value,
      0,
    );
    const totalOutputValue = shuffledOutputs.reduce(
      (sum, out) => sum + out.value,
      0,
    );
    const coordinatorFee = this.calculateFee(
      totalInputValue,
      round.coordinatorFeeRate,
    );

    // Build transaction data structure
    const txData = {
      version: 2,
      inputs: shuffledInputs.map((inp) => ({
        txid: inp.utxo.txid,
        vout: inp.utxo.vout,
        value: inp.utxo.value,
        scriptPubKey: inp.utxo.scriptPubKey,
        participantId: inp.participantId,
      })),
      outputs: [
        // Denomination outputs for each participant
        ...shuffledOutputs.map((out) => ({
          address: out.address,
          value: out.value,
        })),
        // Coordinator fee output (if > dust threshold of 546 sats)
        ...(coordinatorFee > 546
          ? [
              {
                address: 'coordinator_fee_address',
                value: coordinatorFee,
              },
            ]
          : []),
      ],
      // Change outputs: remaining value per participant minus denomination and fee
      changeOutputs: this.calculateChangeOutputs(round, coordinatorFee),
      coordinatorFee,
      totalInput: totalInputValue,
      totalOutput: totalOutputValue,
      change: totalInputValue - totalOutputValue - coordinatorFee,
      locktime: 0,
    };

    // Store the unsigned transaction data for signing
    round.unsignedTransaction = JSON.stringify(txData);

    // Return a hash of the transaction for signing
    const txHash = bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(txData))));
    return txHash;
  }

  // ── Signing ───────────────────────────────────────────────────

  /**
   * Add a signature for an input.
   */
  addInputSignature(
    roundId: string,
    participantId: string,
    inputIndex: number,
    signature: string,
  ): boolean {
    const round = this.requireRound(roundId);

    if (round.status !== CoinJoinRoundStatus.TransactionSigning) {
      throw new Error(
        `Round ${roundId} is not in signing phase (status: ${round.status})`,
      );
    }

    // Validate participant
    const participant = round.participants.find(
      (p) => p.id === participantId,
    );
    if (!participant) {
      throw new Error(
        `Participant ${participantId} is not registered in round ${roundId}`,
      );
    }

    // Validate input index
    if (inputIndex < 0 || inputIndex >= round.inputRegistrations.length) {
      throw new Error(
        `Invalid input index ${inputIndex}. Round has ${round.inputRegistrations.length} inputs.`,
      );
    }

    // Validate the participant owns this input
    const input = round.inputRegistrations[inputIndex];
    if (input.participantId !== participantId) {
      throw new Error(
        `Input at index ${inputIndex} does not belong to participant ${participantId}`,
      );
    }

    // Validate signature is proper hex and has sufficient length (at least 32 bytes)
    try {
      const sigBytes = hexToBytes(signature);
      if (sigBytes.length < 32) {
        throw new Error('Signature too short');
      }
    } catch (e) {
      throw new Error(
        `Invalid signature format: ${e instanceof Error ? e.message : 'not valid hex'}`,
      );
    }

    // Store signature
    let roundSigs = this.signatures.get(roundId);
    if (!roundSigs) {
      roundSigs = new Map();
      this.signatures.set(roundId, roundSigs);
    }
    let participantSigs = roundSigs.get(participantId);
    if (!participantSigs) {
      participantSigs = new Map();
      roundSigs.set(participantId, participantSigs);
    }
    participantSigs.set(inputIndex, signature);
    return true;
  }

  /**
   * Check if all inputs have been signed.
   */
  isFullySigned(roundId: string): boolean {
    const round = this.requireRound(roundId);
    const roundSigs = this.signatures.get(roundId);
    if (!roundSigs) return false;

    for (let i = 0; i < round.inputRegistrations.length; i++) {
      const input = round.inputRegistrations[i];
      const participantSigs = roundSigs.get(input.participantId);
      if (!participantSigs || !participantSigs.has(i)) {
        return false;
      }
    }
    return true;
  }

  /**
   * Finalize and get the raw transaction hex for broadcasting.
   */
  finalizeTransaction(roundId: string): string {
    const round = this.requireRound(roundId);

    if (!round.unsignedTransaction) {
      throw new Error('Transaction has not been built yet');
    }
    if (!this.isFullySigned(roundId)) {
      throw new Error('Transaction is not fully signed');
    }

    // Collect all signatures
    const roundSigs = this.signatures.get(roundId)!;
    const allSignatures: Array<{ participantId: string; inputIndex: number; signature: string }> = [];
    for (const [pid, sigMap] of roundSigs) {
      for (const [idx, sig] of sigMap) {
        allSignatures.push({ participantId: pid, inputIndex: idx, signature: sig });
      }
    }

    // Compute final transaction hash from tx data + signatures
    const txData = JSON.parse(round.unsignedTransaction);
    const finalData = { ...txData, signatures: allSignatures };
    const txHash = bytesToHex(sha256(new TextEncoder().encode(JSON.stringify(finalData))));

    round.txHash = txHash;
    round.signedTransaction = JSON.stringify(finalData);

    return round.signedTransaction;
  }

  // ── Proof Generation ──────────────────────────────────────────

  /**
   * Generate an audit proof for a participant.
   * This allows selective disclosure of participation.
   */
  generateProof(
    roundId: string,
    participantId: string,
    includeIndices: boolean = false,
  ): CoinJoinProof {
    const round = this.requireRound(roundId);

    if (
      round.status !== CoinJoinRoundStatus.Completed &&
      round.status !== CoinJoinRoundStatus.TransactionBroadcast
    ) {
      throw new Error(
        `Round ${roundId} has not completed (status: ${round.status})`,
      );
    }

    const participant = round.participants.find(
      (p) => p.id === participantId,
    );
    if (!participant) {
      throw new Error(
        `Participant ${participantId} is not registered in round ${roundId}`,
      );
    }

    const txHash = round.txHash ?? 'pending';
    const timestamp = Date.now();

    // Build the proof hash from round data
    const proofPreimage = new TextEncoder().encode(
      `${roundId}:${txHash}:${round.participants.length}:${round.denominationSats}:${timestamp}`,
    );
    const proofHash = bytesToHex(sha256(proofPreimage));

    const proof: CoinJoinProof = {
      roundId,
      txHash,
      participantCount: round.participants.length,
      denomination: round.denominationSats,
      timestamp,
      proofHash,
    };

    // Optional selective disclosure: reveal which inputs/outputs are ours
    if (includeIndices) {
      proof.userInputIndices = [];
      proof.userOutputIndices = [];
      for (let i = 0; i < round.inputRegistrations.length; i++) {
        if (round.inputRegistrations[i].participantId === participantId) {
          proof.userInputIndices.push(i);
        }
      }
      for (let i = 0; i < round.outputRegistrations.length; i++) {
        if (round.outputRegistrations[i].participantId === participantId) {
          proof.userOutputIndices.push(i);
        }
      }
    }

    return proof;
  }

  /**
   * Verify a CoinJoin proof.
   * Checks that the proofHash matches the expected value.
   */
  static verifyProof(proof: CoinJoinProof): boolean {
    const proofPreimage = new TextEncoder().encode(
      `${proof.roundId}:${proof.txHash}:${proof.participantCount}:${proof.denomination}:${proof.timestamp}`,
    );
    const expectedHash = bytesToHex(sha256(proofPreimage));
    return expectedHash === proof.proofHash;
  }

  // ── Queries ───────────────────────────────────────────────────

  /**
   * Get a round by ID.
   */
  getRound(roundId: string): CoinJoinRound | undefined {
    return this.rounds.get(roundId);
  }

  /**
   * List active rounds (not completed, failed, or expired).
   */
  getActiveRounds(): CoinJoinRound[] {
    const terminalStatuses: CoinJoinRoundStatus[] = [
      CoinJoinRoundStatus.Completed,
      CoinJoinRoundStatus.Failed,
      CoinJoinRoundStatus.Expired,
    ];
    return [...this.rounds.values()].filter(
      (r) => !terminalStatuses.includes(r.status),
    );
  }

  /**
   * Clean up expired rounds. Returns the number of rounds cleaned.
   */
  cleanupExpiredRounds(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, round] of this.rounds) {
      if (
        round.expiresAt < now &&
        round.status !== CoinJoinRoundStatus.Completed
      ) {
        round.status = CoinJoinRoundStatus.Expired;
        this.signatures.delete(id);
        cleaned++;
      }
    }

    return cleaned;
  }

  // ── Private Helpers ───────────────────────────────────────────

  /**
   * Fisher-Yates shuffle using cryptographically random values.
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      // Use crypto.getRandomValues for unbiased random index
      const randomBytes = new Uint32Array(1);
      crypto.getRandomValues(randomBytes);
      const j = randomBytes[0] % (i + 1);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  /**
   * Generate a unique round ID using random bytes and SHA-256.
   */
  private generateRoundId(): string {
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const hash = sha256(randomBytes);
    return `round_${bytesToHex(hash).slice(0, 16)}`;
  }

  /**
   * Generate an anonymous participant ID.
   */
  private generateParticipantId(): string {
    const randomBytes = new Uint8Array(16);
    crypto.getRandomValues(randomBytes);
    return `p_${bytesToHex(randomBytes).slice(0, 12)}`;
  }

  /**
   * Generate a mock transaction hash for completed rounds.
   */
  private generateTxHash(round: CoinJoinRound): string {
    const preimage = new TextEncoder().encode(
      `${round.id}:${round.signedTransaction ?? round.unsignedTransaction}:${Date.now()}`,
    );
    return bytesToHex(sha256(preimage));
  }

  /**
   * Calculate coordinator fee given an input value and fee rate in basis points.
   */
  private calculateFee(inputValue: number, feeRate: number): number {
    return Math.ceil((inputValue * feeRate) / 10000);
  }

  /**
   * Calculate change outputs for each participant.
   * Change = sum(participant inputs) - denomination - fee per participant.
   */
  private calculateChangeOutputs(
    round: CoinJoinRound,
    _totalCoordinatorFee: number,
  ): Array<{ address: string; value: number }> {
    const changeOutputs: Array<{ address: string; value: number }> = [];

    // Group inputs by participant
    const inputsByParticipant = new Map<string, CoinJoinInput[]>();
    for (const input of round.inputRegistrations) {
      const existing = inputsByParticipant.get(input.participantId) ?? [];
      existing.push(input);
      inputsByParticipant.set(input.participantId, existing);
    }

    for (const [participantId, inputs] of inputsByParticipant) {
      const totalInputValue = inputs.reduce(
        (sum, inp) => sum + inp.utxo.value,
        0,
      );
      const feePerParticipant = this.calculateFee(
        totalInputValue,
        round.coordinatorFeeRate,
      );
      const change =
        totalInputValue - round.denominationSats - feePerParticipant;

      // Only include change output if above dust threshold (546 sats)
      if (change > 546) {
        changeOutputs.push({
          address: `change_${participantId}`,
          value: change,
        });
      }
    }

    return changeOutputs;
  }

  /**
   * Validate an ownership proof for a UTXO registration.
   * Verifies the proof is a valid hex-encoded value of at least 32 bytes.
   * In production, this would verify a secp256k1 signature against the UTXO's public key.
   */
  private validateOwnershipProof(input: CoinJoinInput): boolean {
    if (!input.ownershipProof || input.ownershipProof.length < 10) {
      return false;
    }

    // Verify the proof is valid hex and has sufficient length (at least 32 bytes)
    try {
      const proofBytes = hexToBytes(input.ownershipProof);
      return proofBytes.length >= 32;
    } catch {
      return false;
    }
  }

  /**
   * Get the round or throw if not found.
   */
  private requireRound(roundId: string): CoinJoinRound {
    const round = this.rounds.get(roundId);
    if (!round) {
      throw new Error(`Round ${roundId} not found`);
    }
    return round;
  }
}
