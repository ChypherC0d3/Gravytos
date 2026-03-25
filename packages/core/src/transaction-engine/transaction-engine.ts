// ===================================================================
// NEXORA VAULT -- Transaction Engine
// Orchestrates transaction building, privacy enhancement, signing,
// broadcasting, and audit logging across all supported chains
// ===================================================================

import type {
  TransactionRequest,
  TransactionResult,
  TransactionStatus,
} from '@gravytos/types';
import { AuditActionType } from '@gravytos/types';
import { ChainAdapterRegistry } from '../chain-adapters/registry';
import { PrivacyEngine } from '../privacy-engine/privacy-engine';
import { AuditEngine } from '../audit-engine/audit-engine';

/**
 * TransactionEngine ties together chain adapters, privacy enhancements,
 * and audit logging into a single send-and-track workflow.
 */
export class TransactionEngine {
  constructor(
    private adapters: ChainAdapterRegistry,
    private privacyEngine: PrivacyEngine,
    private auditEngine: AuditEngine,
  ) {}

  /**
   * Build, sign, broadcast a transaction with privacy enhancements
   * and audit logging.
   */
  async send(request: TransactionRequest): Promise<TransactionResult> {
    // 1. Resolve the chain adapter
    const adapter = this.adapters.get(request.chainId);

    // 2. Apply privacy enhancements (timing delays, etc.)
    const enhanced = await this.privacyEngine.enhanceTransaction(
      request,
      request.privacyLevel,
      adapter.chainFamily,
    );

    // 3. Build unsigned transaction
    const unsigned = await adapter.buildTransaction(enhanced);

    // 4. Apply privacy delay if the privacy engine added one
    if (enhanced.delay && enhanced.delay > 0) {
      await this.delay(enhanced.delay);
    }

    // 5. Sign
    const signed = await adapter.signTransaction(unsigned);

    // 6. Broadcast
    const txHash = await adapter.broadcastTransaction(signed);

    // 7. Log to audit trail
    await this.auditEngine.logEvent({
      actionType: AuditActionType.TransactionSent,
      walletId: request.walletId,
      chainId: request.chainId,
      txHash,
      privacyLevel: request.privacyLevel,
      details: {
        to: request.to,
        value: request.value,
        tokenAddress: request.tokenAddress || 'native',
        feeEstimate: unsigned.estimatedFee,
      },
    });

    return {
      txHash,
      status: 'broadcasting' as TransactionStatus,
      chainId: request.chainId,
      fee: unsigned.estimatedFee,
      timestamp: Date.now(),
    };
  }

  /**
   * Poll a transaction's status every 3 seconds until it reaches
   * a terminal state ('confirmed' or 'failed') or the timeout expires.
   */
  async waitForConfirmation(
    chainId: string,
    txHash: string,
    maxWaitMs: number = 120_000,
  ): Promise<TransactionResult> {
    const adapter = this.adapters.get(chainId);
    const pollIntervalMs = 3_000;
    const deadline = Date.now() + maxWaitMs;

    while (Date.now() < deadline) {
      const status = await adapter.getTransactionStatus(txHash);

      if (status === 'confirmed' || status === 'failed') {
        return {
          txHash,
          status,
          chainId,
          fee: '0', // fee is only known from the chain after confirmation
          timestamp: Date.now(),
        };
      }

      // Wait before next poll, but don't exceed the deadline
      const remaining = deadline - Date.now();
      if (remaining <= 0) break;
      await this.delay(Math.min(pollIntervalMs, remaining));
    }

    // Timed out -- return the last known status
    return {
      txHash,
      status: 'confirming' as TransactionStatus,
      chainId,
      fee: '0',
      timestamp: Date.now(),
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
