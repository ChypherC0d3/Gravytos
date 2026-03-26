// ===================================================================
// GRAVYTOS -- EVM Privacy Engine
// Stealth addresses (ERC-5564 compatible), RPC rotation, gas randomization
// ===================================================================

import { Point, etc, getSharedSecret } from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha2.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

import { PrivacyLevel } from '@gravytos/types';
import type { TransactionRequest } from '@gravytos/types';

/**
 * EVM-specific privacy engine.
 *
 * Capabilities by level:
 *   Low    - Direct transaction, standard RPC
 *   Medium - RPC rotation, random delay, nonce gap avoidance
 *   High   - Stealth address generation (ERC-5564), RPC rotation,
 *            gas price randomization to defeat fingerprinting
 */
export class EVMPrivacyEngine {
  /** Tracks per-chain RPC rotation index. */
  private rpcRotationIndex: Map<string, number> = new Map();

  // ── Transaction Enhancement ─────────────────────────────────────

  /**
   * Enhance an EVM transaction based on privacy level.
   */
  enhanceTransaction(
    tx: TransactionRequest,
    level: PrivacyLevel,
  ): TransactionRequest {
    const enhanced: TransactionRequest = { ...tx, privacyLevel: level };

    switch (level) {
      case PrivacyLevel.Low:
        // No enhancements.
        enhanced.delay = 0;
        break;

      case PrivacyLevel.Medium:
        enhanced.delay = this.randomDelay(5000, 30000);
        break;

      case PrivacyLevel.High:
        enhanced.delay = this.randomDelay(30000, 300000);
        // Randomize gas price to avoid fingerprinting.
        if (enhanced.feeRate) {
          const base = BigInt(enhanced.feeRate);
          enhanced.feeRate = this.randomizeGasPrice(base).toString();
        }
        if (enhanced.maxPriorityFee) {
          const base = BigInt(enhanced.maxPriorityFee);
          enhanced.maxPriorityFee = this.randomizeGasPrice(base).toString();
        }
        break;
    }

    return enhanced;
  }

  // ── Stealth Addresses (ERC-5564 simplified) ─────────────────────

  /**
   * Generate a stealth address for receiving funds.
   *
   * ERC-5564 simplified flow:
   * 1. Sender generates an ephemeral keypair (r, R = r*G).
   * 2. Sender computes shared secret S = r * viewingPubKey.
   * 3. Stealth public key = spendingPubKey + hash(S) * G.
   * 4. Stealth address = keccak256(stealthPubKey)[12..32].
   * 5. View tag = first byte of hash(S) -- lets receiver quickly filter.
   *
   * @param receiverSpendingPubKey Hex-encoded compressed public key (33 bytes).
   * @param receiverViewingPubKey  Hex-encoded compressed public key (33 bytes).
   */
  generateStealthAddress(
    receiverSpendingPubKey: string,
    receiverViewingPubKey: string,
  ): {
    stealthAddress: string;
    ephemeralPublicKey: string;
    viewTag: string;
  } {
    // 1. Generate ephemeral keypair
    const ephemeralPrivKey = etc.randomBytes(32);
    const ephemeralPubKey = Point.BASE.multiply(
      bytesToScalar(ephemeralPrivKey),
    );

    // 2. ECDH shared secret with receiver's viewing key
    const sharedSecretRaw = getSharedSecret(
      ephemeralPrivKey,
      hexToBytes(receiverViewingPubKey),
      true, // compressed
    );

    // 3. Hash the shared secret to produce a scalar
    const sharedHash = sha256(sharedSecretRaw);
    const sharedScalar = bytesToScalar(sharedHash);

    // View tag = first byte of the hash
    const viewTag = bytesToHex(sharedHash.slice(0, 1));

    // 4. Stealth public key = spendingPubKey + sharedScalar * G
    const spendingPoint = Point.fromHex(receiverSpendingPubKey);
    const offset = Point.BASE.multiply(sharedScalar);
    const stealthPoint = spendingPoint.add(offset);

    // 5. Derive Ethereum address: keccak256(uncompressed_pub_without_prefix)[12..]
    const uncompressed = stealthPoint.toHex(false); // 04 || x || y
    const pubBytes = hexToBytes(uncompressed.slice(2)); // drop '04' prefix
    const addressHash = keccak_256(pubBytes);
    const stealthAddress =
      '0x' + bytesToHex(addressHash.slice(12));

    return {
      stealthAddress,
      ephemeralPublicKey: ephemeralPubKey.toHex(true),
      viewTag,
    };
  }

  /**
   * Scan for stealth payments addressed to us.
   *
   * For each ephemeral public key published on-chain:
   * 1. Compute shared secret S = viewingPrivKey * ephemeralPubKey
   * 2. Compute stealth public key = spendingPubKey + hash(S) * G
   * 3. Derive the Ethereum address and return it so the caller
   *    can check if any on-chain transfer was sent to that address.
   *
   * @param viewingPrivateKey   Hex-encoded 32-byte private key.
   * @param spendingPublicKey   Hex-encoded compressed public key.
   * @param ephemeralPubKeys    Array of hex-encoded compressed ephemeral public keys.
   * @returns Array of stealth addresses that belong to us.
   */
  scanForStealthPayments(
    viewingPrivateKey: string,
    spendingPublicKey: string,
    ephemeralPubKeys: string[],
  ): string[] {
    const viewKeyBytes = hexToBytes(viewingPrivateKey);
    const spendingPoint = Point.fromHex(spendingPublicKey);
    const addresses: string[] = [];

    for (const ephPubHex of ephemeralPubKeys) {
      // ECDH: shared secret = viewingPrivKey * ephemeralPubKey
      const sharedSecretRaw = getSharedSecret(
        viewKeyBytes,
        hexToBytes(ephPubHex),
        true,
      );

      const sharedHash = sha256(sharedSecretRaw);
      const sharedScalar = bytesToScalar(sharedHash);

      // Stealth pubkey = spendingPubKey + hash(S) * G
      const offset = Point.BASE.multiply(sharedScalar);
      const stealthPoint = spendingPoint.add(offset);

      const uncompressed = stealthPoint.toHex(false);
      const pubBytes = hexToBytes(uncompressed.slice(2));
      const addressHash = keccak_256(pubBytes);
      const addr = '0x' + bytesToHex(addressHash.slice(12));

      addresses.push(addr);
    }

    return addresses;
  }

  // ── Gas Price Randomization ─────────────────────────────────────

  /**
   * Randomize gas price slightly to avoid fingerprinting.
   * Adds or subtracts up to 5 % of the base gas price.
   */
  randomizeGasPrice(baseGasPrice: bigint): bigint {
    if (baseGasPrice <= 0n) return baseGasPrice;

    // +/- up to 5 %
    const maxDelta = baseGasPrice / 20n; // 5 %
    if (maxDelta === 0n) return baseGasPrice;

    // Generate random value in range [0, 2*maxDelta] then shift to [-maxDelta, +maxDelta]
    const randomBytes = etc.randomBytes(8);
    const randomValue =
      bytesToBigInt(randomBytes) % (maxDelta * 2n + 1n) - maxDelta;

    return baseGasPrice + randomValue;
  }

  // ── RPC Rotation ────────────────────────────────────────────────

  /**
   * Get the next RPC URL from the rotation pool for a given chain.
   * Uses a simple round-robin strategy.
   */
  getNextRPC(chainId: string, rpcUrls: string[]): string {
    if (rpcUrls.length === 0) {
      throw new Error(`No RPC URLs configured for chain ${chainId}`);
    }
    if (rpcUrls.length === 1) {
      return rpcUrls[0];
    }

    const current = this.rpcRotationIndex.get(chainId) ?? 0;
    const nextIndex = (current + 1) % rpcUrls.length;
    this.rpcRotationIndex.set(chainId, nextIndex);

    return rpcUrls[nextIndex];
  }

  // ── Helpers ─────────────────────────────────────────────────────

  private randomDelay(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}

// ── Module-level helpers ──────────────────────────────────────────

/** secp256k1 curve order */
const SECP256K1_ORDER =
  0xfffffffffffffffffffffffffffffffebaaedce6af48a03bbfd25e8cdn * 0x1000000n +
  0x0364141n;

/**
 * Convert a 32-byte hash/key into a valid secp256k1 scalar (1 <= s < n).
 */
function bytesToScalar(bytes: Uint8Array): bigint {
  let scalar = bytesToBigInt(bytes);
  // Reduce modulo n and ensure non-zero
  scalar = scalar % SECP256K1_ORDER;
  if (scalar === 0n) {
    scalar = 1n;
  }
  return scalar;
}

/**
 * Convert a Uint8Array to a bigint (big-endian).
 */
function bytesToBigInt(bytes: Uint8Array): bigint {
  let result = 0n;
  for (const byte of bytes) {
    result = (result << 8n) | BigInt(byte);
  }
  return result;
}
