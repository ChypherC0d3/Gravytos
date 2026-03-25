// ===================================================================
// GRAVYTOS -- Stealth Payment Scanner
//
// Scans blockchain events to find stealth payments addressed to the user.
// Based on ERC-5564 standard concepts.
//
// How it works:
// 1. Sender publishes ephemeral public key in an Announcement event
// 2. Scanner computes shared secret with each ephemeral key using viewing private key
// 3. If derived address matches a transaction recipient, it's a stealth payment
// ===================================================================

import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';

export interface StealthPayment {
  txHash: string;
  blockNumber: number;
  stealthAddress: string;
  ephemeralPublicKey: string;
  value: string;
  tokenAddress?: string;
  timestamp: number;
}

export interface ScanResult {
  found: StealthPayment[];
  scannedBlocks: number;
  lastScannedBlock: number;
}

export interface StealthAnnouncement {
  ephemeralPublicKey: string;
  stealthAddress: string;
  viewTag: string;
  txHash: string;
  blockNumber: number;
  value: string;
  timestamp: number;
}

export class StealthScanner {
  private viewingPrivateKey: string;
  private spendingPublicKey: string;
  private lastScannedBlock: number = 0;

  constructor(viewingPrivateKey: string, spendingPublicKey: string) {
    this.viewingPrivateKey = viewingPrivateKey;
    this.spendingPublicKey = spendingPublicKey;
  }

  /**
   * Scan a batch of announcement events for stealth payments.
   * Each announcement contains: ephemeralPubKey, stealthAddress, viewTag.
   */
  scanAnnouncements(announcements: StealthAnnouncement[]): StealthPayment[] {
    const found: StealthPayment[] = [];

    for (const ann of announcements) {
      // Quick filter: check view tag first (1 byte, fast rejection)
      if (!this.checkViewTag(ann.ephemeralPublicKey, ann.viewTag)) continue;

      // Full check: derive the stealth address and compare
      const derived = this.deriveStealthAddress(ann.ephemeralPublicKey);
      if (derived && derived.toLowerCase() === ann.stealthAddress.toLowerCase()) {
        found.push({
          txHash: ann.txHash,
          blockNumber: ann.blockNumber,
          stealthAddress: ann.stealthAddress,
          ephemeralPublicKey: ann.ephemeralPublicKey,
          value: ann.value,
          timestamp: ann.timestamp,
        });
      }
    }

    return found;
  }

  /**
   * Perform a full scan over a range of announcements and return a ScanResult.
   */
  scan(
    announcements: StealthAnnouncement[],
    fromBlock: number,
    toBlock: number,
  ): ScanResult {
    const found = this.scanAnnouncements(announcements);
    this.lastScannedBlock = toBlock;

    return {
      found,
      scannedBlocks: toBlock - fromBlock + 1,
      lastScannedBlock: toBlock,
    };
  }

  /**
   * Check if a view tag matches (fast rejection filter).
   * View tag = first byte of hash(sharedSecret).
   */
  private checkViewTag(ephemeralPubKey: string, viewTag: string): boolean {
    try {
      const sharedSecret = this.computeSharedSecret(ephemeralPubKey);
      if (!sharedSecret) return false;
      const hash = sha256(hexToBytes(sharedSecret));
      const computed = bytesToHex(hash).substring(0, 2);
      return computed === viewTag;
    } catch {
      return false;
    }
  }

  /**
   * Derive the stealth address from an ephemeral public key.
   * stealthAddr = pubKeyToAddr(spendingPubKey + hash(sharedSecret) * G)
   *
   * In a full implementation, this would do elliptic curve point addition:
   *   stealthPubKey = spendingPubKey + secretHash * G
   *   Then convert to an Ethereum address.
   *
   * For the current implementation, we derive a deterministic address
   * from the shared secret and spending public key.
   */
  private deriveStealthAddress(ephemeralPubKey: string): string | null {
    try {
      const sharedSecret = this.computeSharedSecret(ephemeralPubKey);
      if (!sharedSecret) return null;

      // Hash the shared secret to get a scalar
      const secretHash = sha256(hexToBytes(sharedSecret));

      // Derive a deterministic address from secretHash + spendingPubKey
      const addrHash = sha256(
        new TextEncoder().encode(bytesToHex(secretHash) + this.spendingPublicKey),
      );
      const addr = '0x' + bytesToHex(addrHash).substring(24, 64);
      return addr;
    } catch {
      return null;
    }
  }

  /**
   * Compute ECDH shared secret.
   * In a full implementation: sharedSecret = viewingPrivateKey * ephemeralPubKey (ECDH).
   * For the current implementation: hash(viewingKey + ephemeralKey).
   */
  private computeSharedSecret(ephemeralPubKey: string): string | null {
    try {
      const combined = this.viewingPrivateKey + ephemeralPubKey;
      const secret = sha256(new TextEncoder().encode(combined));
      return bytesToHex(secret);
    } catch {
      return null;
    }
  }

  /**
   * Get the spending key needed to spend a found stealth payment.
   * In a full implementation: spendingPrivKey = viewingPrivKey + hash(sharedSecret) (mod n).
   * For the current implementation: hash(viewingPrivKey + secretHash).
   */
  getSpendingKey(ephemeralPubKey: string): string | null {
    const sharedSecret = this.computeSharedSecret(ephemeralPubKey);
    if (!sharedSecret) return null;
    const secretHash = sha256(hexToBytes(sharedSecret));
    return bytesToHex(
      sha256(new TextEncoder().encode(this.viewingPrivateKey + bytesToHex(secretHash))),
    );
  }

  setLastScannedBlock(block: number): void {
    this.lastScannedBlock = block;
  }

  getLastScannedBlock(): number {
    return this.lastScannedBlock;
  }
}
