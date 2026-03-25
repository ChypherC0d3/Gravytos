// ===================================================================
// NEXORA VAULT -- Audit Engine
// Hash-chained event log with cryptographic integrity verification
// ===================================================================

import type {
  AuditEvent,
  AuditExport,
  AuditVerificationResult,
  AuditActionType,
  ChainId,
  PrivacyLevel,
} from '@gravytos/types';
import type { AuditStorage } from './audit-storage';
import { InMemoryAuditStorage } from './audit-storage';

const GENESIS_HASH = '0'.repeat(64);

/**
 * Converts a hex string to a Uint8Array.
 */
export function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

/**
 * Converts a Uint8Array to a lowercase hex string.
 */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Compute SHA-256 hash of a string, returning hex.
 * Uses the Web Crypto API (available in browsers and Node 18+).
 */
async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as ArrayBuffer);
  return bytesToHex(new Uint8Array(hashBuffer));
}

/**
 * Generate a UUID v4 using the Web Crypto API.
 */
function generateId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // Set version (4) and variant (RFC 4122)
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytesToHex(bytes);
  return [
    hex.substring(0, 8),
    hex.substring(8, 12),
    hex.substring(12, 16),
    hex.substring(16, 20),
    hex.substring(20, 32),
  ].join('-');
}

/**
 * Compute the proof hash for an event.
 * proofHash = SHA-256(id | timestamp | actionType | JSON(details))
 */
async function computeProofHash(
  id: string,
  timestamp: number,
  actionType: string,
  details: Record<string, unknown>,
): Promise<string> {
  const payload = `${id}|${timestamp}|${actionType}|${JSON.stringify(details)}`;
  return sha256(payload);
}

/**
 * Compute the chain hash that links this event to the previous one.
 * chainHash = SHA-256(proofHash | previousHash)
 */
async function computeChainHash(
  proofHash: string,
  previousHash: string,
): Promise<string> {
  const payload = `${proofHash}|${previousHash}`;
  return sha256(payload);
}

export interface LogEventParams {
  actionType: AuditActionType;
  walletId: string;
  chainId: ChainId;
  privacyLevel: PrivacyLevel;
  txHash?: string;
  details?: Record<string, unknown>;
}

/**
 * AuditEngine maintains a hash-chained, tamper-evident log of all
 * wallet operations. Each event includes a proof hash of its content
 * and a chain hash linking it to the previous event, enabling
 * full integrity verification.
 */
export class AuditEngine {
  private storage: AuditStorage;

  constructor(storage?: AuditStorage) {
    this.storage = storage ?? new InMemoryAuditStorage();
  }

  /**
   * Log a new audit event with hash chaining.
   * @returns The created AuditEvent with computed hashes
   */
  async logEvent(params: LogEventParams): Promise<AuditEvent> {
    const id = generateId();
    const timestamp = Date.now();
    const details = params.details ?? {};

    // Compute proof hash for this event's content
    const proofHash = await computeProofHash(
      id,
      timestamp,
      params.actionType,
      details,
    );

    // Get the previous event's chain hash (or genesis hash)
    const lastEvent = await this.storage.getLast();
    const previousHash = lastEvent
      ? await computeChainHash(lastEvent.proofHash, lastEvent.previousHash)
      : GENESIS_HASH;

    const event: AuditEvent = {
      id,
      timestamp,
      actionType: params.actionType,
      walletId: params.walletId,
      chainId: params.chainId,
      txHash: params.txHash,
      privacyLevel: params.privacyLevel,
      details,
      proofHash,
      previousHash,
    };

    await this.storage.append(event);
    return event;
  }

  /**
   * Verify the integrity of the entire audit chain.
   * Walks through all events in order and checks:
   *   1. Each event's proofHash matches its content
   *   2. Each event's previousHash matches the chain hash of the prior event
   */
  async verifyIntegrity(): Promise<AuditVerificationResult> {
    const events = await this.storage.getAll();

    if (events.length === 0) {
      return {
        valid: true,
        totalChecked: 0,
        verifiedAt: Date.now(),
      };
    }

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Verify proof hash
      const expectedProof = await computeProofHash(
        event.id,
        event.timestamp,
        event.actionType,
        event.details,
      );
      if (expectedProof !== event.proofHash) {
        return {
          valid: false,
          totalChecked: i + 1,
          brokenAtIndex: i,
          brokenAtEventId: event.id,
          verifiedAt: Date.now(),
        };
      }

      // Verify chain link
      if (i === 0) {
        // First event must link to genesis
        if (event.previousHash !== GENESIS_HASH) {
          return {
            valid: false,
            totalChecked: 1,
            brokenAtIndex: 0,
            brokenAtEventId: event.id,
            verifiedAt: Date.now(),
          };
        }
      } else {
        // Subsequent events must link to the chain hash of the previous event
        const prevEvent = events[i - 1];
        const expectedPreviousHash = await computeChainHash(
          prevEvent.proofHash,
          prevEvent.previousHash,
        );
        if (event.previousHash !== expectedPreviousHash) {
          return {
            valid: false,
            totalChecked: i + 1,
            brokenAtIndex: i,
            brokenAtEventId: event.id,
            verifiedAt: Date.now(),
          };
        }
      }
    }

    return {
      valid: true,
      totalChecked: events.length,
      verifiedAt: Date.now(),
    };
  }

  /**
   * Export the audit trail as a JSON-serializable object.
   * Optionally filter by wallet IDs and/or time range.
   */
  async export(options?: {
    walletIds?: string[];
    startDate?: number;
    endDate?: number;
  }): Promise<AuditExport> {
    let events = await this.storage.getAll();

    if (options?.walletIds && options.walletIds.length > 0) {
      const walletSet = new Set(options.walletIds);
      events = events.filter((e) => walletSet.has(e.walletId));
    }

    if (options?.startDate !== undefined) {
      events = events.filter((e) => e.timestamp >= options.startDate!);
    }

    if (options?.endDate !== undefined) {
      events = events.filter((e) => e.timestamp <= options.endDate!);
    }

    const integrity = await this.verifyIntegrity();
    const walletIds = [...new Set(events.map((e) => e.walletId))];

    return {
      version: '1.0.0',
      exportedAt: Date.now(),
      application: 'gravytos',
      totalEvents: events.length,
      integrityVerified: integrity.valid,
      startDate: events.length > 0 ? events[0].timestamp : undefined,
      endDate:
        events.length > 0 ? events[events.length - 1].timestamp : undefined,
      walletIds,
      events,
    };
  }

  /**
   * Get the underlying storage instance.
   */
  getStorage(): AuditStorage {
    return this.storage;
  }
}
