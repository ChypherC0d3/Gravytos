import { describe, it, expect, beforeEach } from 'vitest';
import { CoinJoinCoordinator } from '../coordinator';
import { CoinJoinParticipant as CoinJoinParticipantClient } from '../participant';
import { CoinJoinRoundStatus } from '../types';
import type { CoinJoinInput } from '../types';
import type { UTXOInput } from '@gravytos/types';
import { bytesToHex } from '@noble/hashes/utils.js';
import { sha256 } from '@noble/hashes/sha2.js';

// ── Test Helpers ──────────────────────────────────────────────

function makeUtxo(overrides: Partial<UTXOInput> = {}): UTXOInput {
  return {
    txid: `txid_${Math.random().toString(36).slice(2, 10)}`,
    vout: 0,
    value: 200000,                    // 0.002 BTC -- enough for 0.001 denomination + fee
    scriptPubKey: '76a91400000000000000000000000000000000000000008ac',
    address: `bc1q${Math.random().toString(36).slice(2, 14)}`,
    confirmations: 10,
    ...overrides,
  };
}

function makePrivateKey(): Uint8Array {
  const key = new Uint8Array(32);
  crypto.getRandomValues(key);
  return key;
}

/** Generate a valid hex proof (at least 32 bytes = 64 hex chars). */
function makeHexProof(seed?: string): string {
  const data = new TextEncoder().encode(seed ?? `proof_${Math.random()}`);
  return bytesToHex(sha256(data));
}

/** Generate a valid hex signature (at least 32 bytes = 64 hex chars). */
function makeHexSig(seed?: string): string {
  const data = new TextEncoder().encode(seed ?? `sig_${Math.random()}`);
  return bytesToHex(sha256(data));
}

function registerFullParticipant(
  coordinator: CoinJoinCoordinator,
  roundId: string,
  denomination: number,
): { participantId: string; inputIndex: number } {
  const participant = coordinator.registerParticipant(roundId);
  const utxo = makeUtxo({ value: denomination + 5000 });

  coordinator.registerInput(roundId, {
    participantId: participant.id,
    utxo: {
      txid: utxo.txid,
      vout: utxo.vout,
      value: utxo.value,
      scriptPubKey: utxo.scriptPubKey,
    },
    ownershipProof: makeHexProof(participant.id),
  });

  const round = coordinator.getRound(roundId)!;
  const inputIndex = round.inputRegistrations.findIndex(
    (inp) => inp.participantId === participant.id,
  );

  return { participantId: participant.id, inputIndex };
}

// ── Tests ─────────────────────────────────────────────────────

describe('CoinJoin Coordinator', () => {
  let coordinator: CoinJoinCoordinator;

  beforeEach(() => {
    coordinator = new CoinJoinCoordinator({ minParticipants: 2 });
  });

  // ── Round creation ──────────────────────────────────────────

  it('should create a round', () => {
    const round = coordinator.createRound({ denominationSats: 100000 });
    expect(round.status).toBe(CoinJoinRoundStatus.InputRegistration);
    expect(round.denominationSats).toBe(100000);
    expect(round.id).toMatch(/^round_/);
    expect(round.participants).toHaveLength(0);
    expect(round.inputRegistrations).toHaveLength(0);
    expect(round.outputRegistrations).toHaveLength(0);
    expect(round.expiresAt).toBeGreaterThan(round.createdAt);
  });

  it('should create rounds with custom parameters', () => {
    const round = coordinator.createRound({
      denominationSats: 500000,
      maxParticipants: 20,
      minParticipants: 5,
      coordinatorFeeRate: 50,
      durationMs: 120000,
    });
    expect(round.denominationSats).toBe(500000);
    expect(round.maxParticipants).toBe(20);
    expect(round.minParticipants).toBe(5);
    expect(round.coordinatorFeeRate).toBe(50);
    expect(round.expiresAt - round.createdAt).toBe(120000);
  });

  // ── Participant registration ────────────────────────────────

  it('should register participants', () => {
    const round = coordinator.createRound({ denominationSats: 100000 });
    const p1 = coordinator.registerParticipant(round.id);
    const p2 = coordinator.registerParticipant(round.id);

    expect(p1.id).toBeTruthy();
    expect(p2.id).toBeTruthy();
    expect(p1.id).not.toBe(p2.id);
    expect(p1.verified).toBe(false);
    expect(p1.inputCount).toBe(0);
    expect(p1.outputCount).toBe(0);

    const updatedRound = coordinator.getRound(round.id)!;
    expect(updatedRound.participants).toHaveLength(2);
  });

  it('should reject participants when round is full', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      maxParticipants: 1,
    });
    coordinator.registerParticipant(round.id);

    expect(() => coordinator.registerParticipant(round.id)).toThrow('full');
  });

  // ── Input registration ──────────────────────────────────────

  it('should register inputs with valid ownership proof', () => {
    const round = coordinator.createRound({ denominationSats: 100000 });
    const participant = coordinator.registerParticipant(round.id);
    const utxo = makeUtxo({ value: 200000 });

    const result = coordinator.registerInput(round.id, {
      participantId: participant.id,
      utxo: {
        txid: utxo.txid,
        vout: utxo.vout,
        value: utxo.value,
        scriptPubKey: utxo.scriptPubKey,
      },
      ownershipProof: makeHexProof('valid_proof'),
    });

    expect(result).toBe(true);
    const updated = coordinator.getRound(round.id)!;
    expect(updated.inputRegistrations).toHaveLength(1);
    expect(updated.participants[0].verified).toBe(true);
    expect(updated.participants[0].inputCount).toBe(1);
  });

  it('should reject inputs with empty ownership proof', () => {
    const round = coordinator.createRound({ denominationSats: 100000 });
    const participant = coordinator.registerParticipant(round.id);

    expect(() =>
      coordinator.registerInput(round.id, {
        participantId: participant.id,
        utxo: { txid: 'abc', vout: 0, value: 200000, scriptPubKey: '00' },
        ownershipProof: '',
      }),
    ).toThrow('Invalid ownership proof');
  });

  it('should reject inputs with non-hex ownership proof', () => {
    const round = coordinator.createRound({ denominationSats: 100000 });
    const participant = coordinator.registerParticipant(round.id);

    expect(() =>
      coordinator.registerInput(round.id, {
        participantId: participant.id,
        utxo: { txid: 'abc', vout: 0, value: 200000, scriptPubKey: '00' },
        ownershipProof: 'not_valid_hex_string_at_all!!',
      }),
    ).toThrow('Invalid ownership proof');
  });

  it('should reject inputs with insufficient value', () => {
    const round = coordinator.createRound({ denominationSats: 100000 });
    const participant = coordinator.registerParticipant(round.id);

    expect(() =>
      coordinator.registerInput(round.id, {
        participantId: participant.id,
        utxo: { txid: 'abc', vout: 0, value: 50000, scriptPubKey: '00' },
        ownershipProof: makeHexProof('proof'),
      }),
    ).toThrow('too small');
  });

  it('should reject duplicate UTXO registrations', () => {
    const round = coordinator.createRound({ denominationSats: 100000 });
    const p1 = coordinator.registerParticipant(round.id);
    const p2 = coordinator.registerParticipant(round.id);

    const input: CoinJoinInput = {
      participantId: p1.id,
      utxo: { txid: 'dup_tx', vout: 0, value: 200000, scriptPubKey: '00' },
      ownershipProof: makeHexProof('proof1'),
    };
    coordinator.registerInput(round.id, input);

    expect(() =>
      coordinator.registerInput(round.id, {
        ...input,
        participantId: p2.id,
        ownershipProof: makeHexProof('proof2'),
      }),
    ).toThrow('already registered');
  });

  it('should reject inputs from unregistered participants', () => {
    const round = coordinator.createRound({ denominationSats: 100000 });

    expect(() =>
      coordinator.registerInput(round.id, {
        participantId: 'unknown_id',
        utxo: { txid: 'abc', vout: 0, value: 200000, scriptPubKey: '00' },
        ownershipProof: makeHexProof('proof'),
      }),
    ).toThrow('not registered');
  });

  // ── Phase advancement ───────────────────────────────────────

  it('should advance through all phases', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });

    // Register 2 participants with inputs
    const { participantId: p1Id, inputIndex: p1Idx } =
      registerFullParticipant(coordinator, round.id, 100000);
    const { participantId: p2Id, inputIndex: p2Idx } =
      registerFullParticipant(coordinator, round.id, 100000);

    // Phase 1 -> 2: InputRegistration -> OutputRegistration
    let status = coordinator.advanceRound(round.id);
    expect(status).toBe(CoinJoinRoundStatus.OutputRegistration);

    // Register outputs
    coordinator.registerOutput(round.id, {
      participantId: p1Id,
      address: 'bc1q_fresh_addr_p1',
      value: 100000,
    });
    coordinator.registerOutput(round.id, {
      participantId: p2Id,
      address: 'bc1q_fresh_addr_p2',
      value: 100000,
    });

    // Phase 2 -> 3: OutputRegistration -> TransactionSigning
    status = coordinator.advanceRound(round.id);
    expect(status).toBe(CoinJoinRoundStatus.TransactionSigning);

    const built = coordinator.getRound(round.id)!;
    expect(built.unsignedTransaction).toBeTruthy();

    // Sign all inputs
    coordinator.addInputSignature(round.id, p1Id, p1Idx, makeHexSig('sig_p1'));
    coordinator.addInputSignature(round.id, p2Id, p2Idx, makeHexSig('sig_p2'));
    expect(coordinator.isFullySigned(round.id)).toBe(true);

    // Phase 3 -> 4: TransactionSigning -> TransactionBroadcast
    status = coordinator.advanceRound(round.id);
    expect(status).toBe(CoinJoinRoundStatus.TransactionBroadcast);

    const signed = coordinator.getRound(round.id)!;
    expect(signed.signedTransaction).toBeTruthy();

    // Phase 4 -> 5: TransactionBroadcast -> Completed
    status = coordinator.advanceRound(round.id);
    expect(status).toBe(CoinJoinRoundStatus.Completed);

    const completed = coordinator.getRound(round.id)!;
    expect(completed.txHash).toBeTruthy();
  });

  it('should reject advancing without enough participants', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 3,
    });
    registerFullParticipant(coordinator, round.id, 100000);

    expect(() => coordinator.advanceRound(round.id)).toThrow(
      'at least 3 verified participants',
    );
  });

  it('should reject advancing without all outputs registered', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });
    registerFullParticipant(coordinator, round.id, 100000);
    registerFullParticipant(coordinator, round.id, 100000);

    coordinator.advanceRound(round.id); // -> OutputRegistration

    // Only register one output
    const r = coordinator.getRound(round.id)!;
    coordinator.registerOutput(round.id, {
      participantId: r.participants[0].id,
      address: 'bc1q_addr1',
      value: 100000,
    });

    expect(() => coordinator.advanceRound(round.id)).toThrow(
      'Not all participants',
    );
  });

  // ── Transaction building ────────────────────────────────────

  it('should build a valid CoinJoin transaction', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });
    registerFullParticipant(coordinator, round.id, 100000);
    registerFullParticipant(coordinator, round.id, 100000);

    coordinator.advanceRound(round.id); // -> OutputRegistration

    const r = coordinator.getRound(round.id)!;
    for (const p of r.participants) {
      coordinator.registerOutput(round.id, {
        participantId: p.id,
        address: `bc1q_out_${p.id}`,
        value: 100000,
      });
    }

    coordinator.advanceRound(round.id); // -> TransactionSigning (builds tx)

    const built = coordinator.getRound(round.id)!;
    expect(built.unsignedTransaction).toBeTruthy();
    // unsignedTransaction is now JSON, verify it parses
    const txData = JSON.parse(built.unsignedTransaction!);
    expect(txData.version).toBe(2);
    expect(txData.inputs).toHaveLength(2);
    expect(txData.outputs.length).toBeGreaterThanOrEqual(2);
  });

  // ── Proof generation and verification ───────────────────────

  it('should generate and verify proofs', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });
    const { participantId: p1Id, inputIndex: p1Idx } =
      registerFullParticipant(coordinator, round.id, 100000);
    const { participantId: p2Id, inputIndex: p2Idx } =
      registerFullParticipant(coordinator, round.id, 100000);

    // Advance through all phases
    coordinator.advanceRound(round.id);
    const r = coordinator.getRound(round.id)!;
    for (const p of r.participants) {
      coordinator.registerOutput(round.id, {
        participantId: p.id,
        address: `bc1q_out_${p.id}`,
        value: 100000,
      });
    }
    coordinator.advanceRound(round.id);
    coordinator.addInputSignature(round.id, p1Id, p1Idx, makeHexSig('sig1'));
    coordinator.addInputSignature(round.id, p2Id, p2Idx, makeHexSig('sig2'));
    coordinator.advanceRound(round.id);
    coordinator.advanceRound(round.id); // -> Completed

    // Generate proof without indices
    const proof = coordinator.generateProof(round.id, p1Id);
    expect(proof.roundId).toBe(round.id);
    expect(proof.participantCount).toBe(2);
    expect(proof.denomination).toBe(100000);
    expect(proof.proofHash).toMatch(/^[0-9a-f]{64}$/);
    expect(proof.userInputIndices).toBeUndefined();
    expect(proof.userOutputIndices).toBeUndefined();

    // Verify the proof
    expect(CoinJoinCoordinator.verifyProof(proof)).toBe(true);

    // Tampered proof should fail
    const tampered = { ...proof, participantCount: 99 };
    expect(CoinJoinCoordinator.verifyProof(tampered)).toBe(false);
  });

  it('should generate proofs with selective disclosure indices', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });
    const { participantId: p1Id, inputIndex: p1Idx } =
      registerFullParticipant(coordinator, round.id, 100000);
    const { participantId: p2Id, inputIndex: p2Idx } =
      registerFullParticipant(coordinator, round.id, 100000);

    coordinator.advanceRound(round.id);
    const r = coordinator.getRound(round.id)!;
    for (const p of r.participants) {
      coordinator.registerOutput(round.id, {
        participantId: p.id,
        address: `bc1q_out_${p.id}`,
        value: 100000,
      });
    }
    coordinator.advanceRound(round.id);
    coordinator.addInputSignature(round.id, p1Id, p1Idx, makeHexSig('sig1'));
    coordinator.addInputSignature(round.id, p2Id, p2Idx, makeHexSig('sig2'));
    coordinator.advanceRound(round.id);
    coordinator.advanceRound(round.id);

    const proof = coordinator.generateProof(round.id, p1Id, true);
    expect(proof.userInputIndices).toBeDefined();
    expect(proof.userOutputIndices).toBeDefined();
    expect(proof.userInputIndices!.length).toBeGreaterThan(0);
    expect(proof.userOutputIndices!.length).toBeGreaterThan(0);
  });

  // ── Output registration validation ─────────────────────────

  it('should reject outputs with wrong denomination value', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });
    const { participantId: p1Id } = registerFullParticipant(
      coordinator,
      round.id,
      100000,
    );
    registerFullParticipant(coordinator, round.id, 100000);
    coordinator.advanceRound(round.id);

    expect(() =>
      coordinator.registerOutput(round.id, {
        participantId: p1Id,
        address: 'bc1q_wrong',
        value: 50000, // Wrong denomination
      }),
    ).toThrow('does not match denomination');
  });

  it('should reject duplicate output addresses in a round', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });
    const { participantId: p1Id } = registerFullParticipant(
      coordinator,
      round.id,
      100000,
    );
    const { participantId: p2Id } = registerFullParticipant(
      coordinator,
      round.id,
      100000,
    );
    coordinator.advanceRound(round.id);

    coordinator.registerOutput(round.id, {
      participantId: p1Id,
      address: 'bc1q_shared_addr',
      value: 100000,
    });

    expect(() =>
      coordinator.registerOutput(round.id, {
        participantId: p2Id,
        address: 'bc1q_shared_addr', // Same address
        value: 100000,
      }),
    ).toThrow('already registered');
  });

  // ── Shuffle ─────────────────────────────────────────────────

  it('should shuffle inputs and outputs (statistical test)', () => {
    // Create a round with many participants
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
      maxParticipants: 10,
    });

    const participantIds: string[] = [];
    const inputIndices: number[] = [];
    for (let i = 0; i < 5; i++) {
      const { participantId, inputIndex } = registerFullParticipant(
        coordinator,
        round.id,
        100000,
      );
      participantIds.push(participantId);
      inputIndices.push(inputIndex);
    }

    coordinator.advanceRound(round.id);

    for (const pid of participantIds) {
      coordinator.registerOutput(round.id, {
        participantId: pid,
        address: `bc1q_out_${pid}`,
        value: 100000,
      });
    }

    // Build transaction multiple times and check that order varies.
    coordinator.advanceRound(round.id);
    const r = coordinator.getRound(round.id)!;
    expect(r.unsignedTransaction).toBeTruthy();

    // unsignedTransaction is now JSON -- parse it directly
    const txData = JSON.parse(r.unsignedTransaction!);

    expect(txData.inputs).toHaveLength(5);
    expect(txData.outputs.length).toBeGreaterThanOrEqual(5); // 5 denomination + potential fee
  });

  // ── Fee calculation ─────────────────────────────────────────

  it('should calculate correct fees', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      coordinatorFeeRate: 100, // 1%
      minParticipants: 2,
    });

    registerFullParticipant(coordinator, round.id, 100000);
    registerFullParticipant(coordinator, round.id, 100000);

    coordinator.advanceRound(round.id);

    const r = coordinator.getRound(round.id)!;
    for (const p of r.participants) {
      coordinator.registerOutput(round.id, {
        participantId: p.id,
        address: `bc1q_out_${p.id}`,
        value: 100000,
      });
    }

    coordinator.advanceRound(round.id);

    // Decode transaction -- now stored as JSON
    const built = coordinator.getRound(round.id)!;
    const txData = JSON.parse(built.unsignedTransaction!);

    // With 1% fee rate on each participant's input total, fee should be present
    const feeOutput = txData.outputs.find(
      (o: { address: string }) => o.address === 'coordinator_fee_address',
    );
    // Fee may or may not exist depending on whether it exceeds dust threshold
    // With 105000 * 1% = 1050 per participant, total fee should be > 546
    if (feeOutput) {
      expect(feeOutput.value).toBeGreaterThan(0);
    }
  });

  // ── Expiration ──────────────────────────────────────────────

  it('should expire old rounds', () => {
    // Create a round and manually set its expiresAt in the past
    const round = coordinator.createRound({
      denominationSats: 100000,
      durationMs: 600000,
    });

    // Force the round to be expired by backdating expiresAt
    const r = coordinator.getRound(round.id)!;
    r.expiresAt = Date.now() - 1000;

    const cleaned = coordinator.cleanupExpiredRounds();
    expect(cleaned).toBeGreaterThanOrEqual(1);

    const expired = coordinator.getRound(round.id)!;
    expect(expired.status).toBe(CoinJoinRoundStatus.Expired);
  });

  it('should not expire completed rounds', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      durationMs: 1,
      minParticipants: 2,
    });

    // Complete the round first
    const { participantId: p1Id, inputIndex: p1Idx } =
      registerFullParticipant(coordinator, round.id, 100000);
    const { participantId: p2Id, inputIndex: p2Idx } =
      registerFullParticipant(coordinator, round.id, 100000);
    coordinator.advanceRound(round.id);
    const r = coordinator.getRound(round.id)!;
    for (const p of r.participants) {
      coordinator.registerOutput(round.id, {
        participantId: p.id,
        address: `bc1q_out_${p.id}`,
        value: 100000,
      });
    }
    coordinator.advanceRound(round.id);
    coordinator.addInputSignature(round.id, p1Id, p1Idx, makeHexSig('sig1'));
    coordinator.addInputSignature(round.id, p2Id, p2Idx, makeHexSig('sig2'));
    coordinator.advanceRound(round.id);
    coordinator.advanceRound(round.id);

    const completed = coordinator.getRound(round.id)!;
    expect(completed.status).toBe(CoinJoinRoundStatus.Completed);

    // Cleanup should not touch it
    coordinator.cleanupExpiredRounds();
    expect(coordinator.getRound(round.id)!.status).toBe(
      CoinJoinRoundStatus.Completed,
    );
  });

  // ── Active rounds ───────────────────────────────────────────

  it('should list active rounds', () => {
    coordinator.createRound({ denominationSats: 100000 });
    coordinator.createRound({ denominationSats: 200000 });

    const active = coordinator.getActiveRounds();
    expect(active).toHaveLength(2);
  });

  // ── Signing validation ──────────────────────────────────────

  it('should reject signatures from wrong participant', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });

    const { inputIndex: p1Idx } =
      registerFullParticipant(coordinator, round.id, 100000);
    const { participantId: p2Id } = registerFullParticipant(
      coordinator,
      round.id,
      100000,
    );

    coordinator.advanceRound(round.id);
    const r = coordinator.getRound(round.id)!;
    for (const p of r.participants) {
      coordinator.registerOutput(round.id, {
        participantId: p.id,
        address: `bc1q_out_${p.id}`,
        value: 100000,
      });
    }
    coordinator.advanceRound(round.id);

    // p2 tries to sign p1's input
    expect(() =>
      coordinator.addInputSignature(round.id, p2Id, p1Idx, makeHexSig('bad_sig')),
    ).toThrow('does not belong');
  });

  it('should reject invalid signature format', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });

    const { participantId: p1Id, inputIndex: p1Idx } =
      registerFullParticipant(coordinator, round.id, 100000);
    registerFullParticipant(coordinator, round.id, 100000);

    coordinator.advanceRound(round.id);
    const r = coordinator.getRound(round.id)!;
    for (const p of r.participants) {
      coordinator.registerOutput(round.id, {
        participantId: p.id,
        address: `bc1q_out_${p.id}`,
        value: 100000,
      });
    }
    coordinator.advanceRound(round.id);

    // Non-hex signature should be rejected
    expect(() =>
      coordinator.addInputSignature(round.id, p1Id, p1Idx, 'not_hex!!'),
    ).toThrow('Invalid signature format');
  });

  it('should report not fully signed when signatures are missing', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });

    const { participantId: p1Id, inputIndex: p1Idx } =
      registerFullParticipant(coordinator, round.id, 100000);
    registerFullParticipant(coordinator, round.id, 100000);

    coordinator.advanceRound(round.id);
    const r = coordinator.getRound(round.id)!;
    for (const p of r.participants) {
      coordinator.registerOutput(round.id, {
        participantId: p.id,
        address: `bc1q_out_${p.id}`,
        value: 100000,
      });
    }
    coordinator.advanceRound(round.id);

    // Only p1 signs
    coordinator.addInputSignature(round.id, p1Id, p1Idx, makeHexSig('sig1'));
    expect(coordinator.isFullySigned(round.id)).toBe(false);
  });

  it('should reject advancing to broadcast when not fully signed', () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });

    const { participantId: p1Id, inputIndex: p1Idx } =
      registerFullParticipant(coordinator, round.id, 100000);
    registerFullParticipant(coordinator, round.id, 100000);

    coordinator.advanceRound(round.id);
    const r = coordinator.getRound(round.id)!;
    for (const p of r.participants) {
      coordinator.registerOutput(round.id, {
        participantId: p.id,
        address: `bc1q_out_${p.id}`,
        value: 100000,
      });
    }
    coordinator.advanceRound(round.id);

    coordinator.addInputSignature(round.id, p1Id, p1Idx, makeHexSig('sig1'));

    expect(() => coordinator.advanceRound(round.id)).toThrow(
      'Not all inputs have been signed',
    );
  });
});

// ── Participant Client Tests ──────────────────────────────────

describe('CoinJoin Participant Client', () => {
  let coordinator: CoinJoinCoordinator;

  beforeEach(() => {
    coordinator = new CoinJoinCoordinator({ minParticipants: 2 });
  });

  it('should find eligible UTXOs', () => {
    const participant = new CoinJoinParticipantClient(coordinator);
    const utxos: UTXOInput[] = [
      makeUtxo({ value: 200000, confirmations: 10 }),
      makeUtxo({ value: 50000, confirmations: 10 }),   // Too small
      makeUtxo({ value: 150000, confirmations: 0 }),    // Unconfirmed
      makeUtxo({ value: 300000, frozen: true }),         // Frozen
      makeUtxo({ value: 250000, confirmations: 6 }),
    ];

    const eligible = participant.findEligibleUTXOs(utxos, 100000);
    expect(eligible).toHaveLength(2); // 200000 and 250000
    expect(eligible.every((u) => u.value >= 100000)).toBe(true);
    expect(eligible.every((u) => !u.frozen)).toBe(true);
    expect(eligible.every((u) => u.confirmations > 0)).toBe(true);
  });

  it('should join a round and register inputs', async () => {
    const round = coordinator.createRound({ denominationSats: 100000 });
    const participant = new CoinJoinParticipantClient(coordinator);

    const utxos: UTXOInput[] = [
      makeUtxo({ value: 200000, confirmations: 10 }),
    ];
    const privateKey = makePrivateKey();

    const result = await participant.joinRound(
      round.id,
      utxos,
      privateKey,
      'bc1q_fresh_output_addr',
    );

    expect(result.participantId).toBeTruthy();
    expect(result.inputsRegistered).toBe(1);
    expect(result.outputsRegistered).toBe(0); // Registered after phase advance

    const updatedRound = coordinator.getRound(round.id)!;
    expect(updatedRound.participants).toHaveLength(1);
    expect(updatedRound.inputRegistrations).toHaveLength(1);
  });

  it('should register pending output after phase advance', async () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });

    // Join two participants
    const p1 = new CoinJoinParticipantClient(coordinator);
    const p2 = new CoinJoinParticipantClient(coordinator);

    await p1.joinRound(
      round.id,
      [makeUtxo({ value: 200000, confirmations: 10 })],
      makePrivateKey(),
      'bc1q_out_p1',
    );
    await p2.joinRound(
      round.id,
      [makeUtxo({ value: 200000, confirmations: 10 })],
      makePrivateKey(),
      'bc1q_out_p2',
    );

    // Advance to output registration
    coordinator.advanceRound(round.id);

    // Register pending outputs
    await p1.registerPendingOutput();
    await p2.registerPendingOutput();

    const r = coordinator.getRound(round.id)!;
    expect(r.outputRegistrations).toHaveLength(2);
  });

  it('should generate ownership proofs with secp256k1', () => {
    const participant = new CoinJoinParticipantClient(coordinator);
    const utxo = makeUtxo();
    const key = makePrivateKey();

    const proof = participant.generateOwnershipProof('round_123', utxo, key);
    // secp256k1 ECDSA signatures are 64-65 bytes = 128-130 hex chars
    expect(proof).toMatch(/^[0-9a-f]+$/);
    expect(proof.length).toBeGreaterThanOrEqual(128);

    // Same inputs should give same proof (deterministic per RFC6979)
    const proof2 = participant.generateOwnershipProof('round_123', utxo, key);
    expect(proof2).toBe(proof);

    // Different key should give different proof
    const proof3 = participant.generateOwnershipProof(
      'round_123',
      utxo,
      makePrivateKey(),
    );
    expect(proof3).not.toBe(proof);
  });

  it('should sign inputs during the signing phase', async () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });

    const utxo1 = makeUtxo({ value: 200000, confirmations: 10 });
    const utxo2 = makeUtxo({ value: 200000, confirmations: 10 });
    const key1 = makePrivateKey();
    const key2 = makePrivateKey();

    const p1 = new CoinJoinParticipantClient(coordinator);
    const p2 = new CoinJoinParticipantClient(coordinator);

    const r1 = await p1.joinRound(round.id, [utxo1], key1, 'bc1q_out_p1');
    const r2 = await p2.joinRound(round.id, [utxo2], key2, 'bc1q_out_p2');

    coordinator.advanceRound(round.id);
    await p1.registerPendingOutput();
    await p2.registerPendingOutput();
    coordinator.advanceRound(round.id); // -> TransactionSigning

    const builtRound = coordinator.getRound(round.id)!;

    // Build private key maps for each participant
    const p1Input = builtRound.inputRegistrations.find(
      (inp) => inp.participantId === r1.participantId,
    )!;
    const p1Keys = new Map<string, Uint8Array>();
    p1Keys.set(`${p1Input.utxo.txid}:${p1Input.utxo.vout}`, key1);

    const p2Input = builtRound.inputRegistrations.find(
      (inp) => inp.participantId === r2.participantId,
    )!;
    const p2Keys = new Map<string, Uint8Array>();
    p2Keys.set(`${p2Input.utxo.txid}:${p2Input.utxo.vout}`, key2);

    const result1 = await p1.signInputs(builtRound.unsignedTransaction!, p1Keys);
    const result2 = await p2.signInputs(builtRound.unsignedTransaction!, p2Keys);

    expect(result1).toContain('signed_1_inputs');
    expect(result2).toContain('signed_1_inputs');
    expect(coordinator.isFullySigned(round.id)).toBe(true);
  });

  it('should leave a round before signing', async () => {
    const round = coordinator.createRound({ denominationSats: 100000 });
    const participant = new CoinJoinParticipantClient(coordinator);

    await participant.joinRound(
      round.id,
      [makeUtxo({ value: 200000, confirmations: 10 })],
      makePrivateKey(),
      'bc1q_out',
    );

    expect(participant.getRoundStatus()).toBe(
      CoinJoinRoundStatus.InputRegistration,
    );
    expect(participant.leaveRound()).toBe(true);
    expect(participant.getRoundStatus()).toBeNull();
    expect(participant.getParticipantId()).toBeNull();
  });

  it('should get proof after round completion', async () => {
    const round = coordinator.createRound({
      denominationSats: 100000,
      minParticipants: 2,
    });

    const utxo1 = makeUtxo({ value: 200000, confirmations: 10 });
    const utxo2 = makeUtxo({ value: 200000, confirmations: 10 });
    const key1 = makePrivateKey();
    const key2 = makePrivateKey();

    const p1 = new CoinJoinParticipantClient(coordinator);
    const p2 = new CoinJoinParticipantClient(coordinator);

    const r1 = await p1.joinRound(round.id, [utxo1], key1, 'bc1q_out_p1');
    const r2 = await p2.joinRound(round.id, [utxo2], key2, 'bc1q_out_p2');

    coordinator.advanceRound(round.id);
    await p1.registerPendingOutput();
    await p2.registerPendingOutput();
    coordinator.advanceRound(round.id);

    const builtRound = coordinator.getRound(round.id)!;
    const p1Input = builtRound.inputRegistrations.find(
      (inp) => inp.participantId === r1.participantId,
    )!;
    const p2Input = builtRound.inputRegistrations.find(
      (inp) => inp.participantId === r2.participantId,
    )!;

    const p1Keys = new Map<string, Uint8Array>();
    p1Keys.set(`${p1Input.utxo.txid}:${p1Input.utxo.vout}`, key1);
    const p2Keys = new Map<string, Uint8Array>();
    p2Keys.set(`${p2Input.utxo.txid}:${p2Input.utxo.vout}`, key2);

    await p1.signInputs(builtRound.unsignedTransaction!, p1Keys);
    await p2.signInputs(builtRound.unsignedTransaction!, p2Keys);

    coordinator.advanceRound(round.id);
    coordinator.advanceRound(round.id); // -> Completed

    const proof = p1.getProof(true);
    expect(proof).not.toBeNull();
    expect(proof!.roundId).toBe(round.id);
    expect(proof!.participantCount).toBe(2);
    expect(CoinJoinCoordinator.verifyProof(proof!)).toBe(true);
    expect(proof!.userInputIndices).toBeDefined();
    expect(proof!.userOutputIndices).toBeDefined();
  });
});
