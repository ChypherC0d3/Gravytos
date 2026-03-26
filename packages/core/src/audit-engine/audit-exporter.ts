// ===================================================================
// GRAVYTOS -- Audit Exporter
// Export and verify audit logs as portable, verifiable JSON
// ===================================================================

import type { AuditExport } from '@gravytos/types';
import type { AuditEngine } from './audit-engine';

/**
 * AuditExporter produces downloadable, verifiable JSON exports
 * of the audit trail. Supports filtering by wallet and date range.
 */
export class AuditExporter {
  constructor(private auditEngine: AuditEngine) {}

  // ── Export helpers ──────────────────────────────────────────────

  /**
   * Export all events as a structured JSON object.
   */
  async exportAll(): Promise<AuditExport> {
    return this.auditEngine.export();
  }

  /**
   * Export events for a specific wallet.
   */
  async exportByWallet(walletId: string): Promise<AuditExport> {
    return this.auditEngine.export({ walletIds: [walletId] });
  }

  /**
   * Export events that fall within a date range (inclusive).
   */
  async exportByDateRange(start: Date, end: Date): Promise<AuditExport> {
    return this.auditEngine.export({
      startDate: start.getTime(),
      endDate: end.getTime(),
    });
  }

  /**
   * Export filtered events as a formatted JSON string suitable for
   * file download or clipboard copy.
   */
  async exportAsString(options?: {
    walletId?: string;
    startDate?: Date;
    endDate?: Date;
  }): Promise<string> {
    const exportData = await this.auditEngine.export({
      walletIds: options?.walletId ? [options.walletId] : undefined,
      startDate: options?.startDate?.getTime(),
      endDate: options?.endDate?.getTime(),
    });

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Trigger a browser file download of the given JSON string.
   *
   * NOTE: This method uses the DOM and only works in a browser context.
   */
  downloadExport(jsonString: string, filename?: string): void {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      filename ||
      `gravytos-audit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Verification ───────────────────────────────────────────────

  /**
   * Verify the integrity of a previously exported audit trail.
   *
   * Checks:
   *   1. Each event's proofHash matches SHA-256(id|timestamp|actionType|JSON(details))
   *   2. Chain linking: each event's previousHash matches the chain hash
   *      of the preceding event (genesis hash for the first event)
   */
  async verifyExport(
    exportData: AuditExport,
  ): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    const events = exportData.events;

    if (!events || events.length === 0) {
      return { valid: true, errors: [] };
    }

    const genesisHash = '0'.repeat(64);

    for (let i = 0; i < events.length; i++) {
      const event = events[i];

      // Verify proof hash
      const expectedProof = await this.computeProofHash(
        event.id,
        event.timestamp,
        event.actionType,
        event.details,
      );
      if (expectedProof !== event.proofHash) {
        errors.push(
          `Event ${i} (${event.id}): proofHash mismatch. ` +
            `Expected ${expectedProof}, got ${event.proofHash}`,
        );
      }

      // Verify chain link
      if (i === 0) {
        if (event.previousHash !== genesisHash) {
          errors.push(
            `Event 0 (${event.id}): first event must link to genesis hash`,
          );
        }
      } else {
        const prevEvent = events[i - 1];
        const expectedPrevious = await this.computeChainHash(
          prevEvent.proofHash,
          prevEvent.previousHash,
        );
        if (event.previousHash !== expectedPrevious) {
          errors.push(
            `Event ${i} (${event.id}): chain link broken. ` +
              `Expected previousHash ${expectedPrevious}, got ${event.previousHash}`,
          );
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  // ── Crypto helpers (mirror audit-engine logic) ─────────────────

  private async sha256(input: string): Promise<string> {
    const data = new TextEncoder().encode(input);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data as unknown as ArrayBuffer);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private async computeProofHash(
    id: string,
    timestamp: number,
    actionType: string,
    details: Record<string, unknown>,
  ): Promise<string> {
    return this.sha256(
      `${id}|${timestamp}|${actionType}|${JSON.stringify(details)}`,
    );
  }

  private async computeChainHash(
    proofHash: string,
    previousHash: string,
  ): Promise<string> {
    return this.sha256(`${proofHash}|${previousHash}`);
  }
}
