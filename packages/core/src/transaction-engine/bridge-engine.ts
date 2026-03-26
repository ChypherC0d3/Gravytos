// ===================================================================
// GRAVYTOS -- Bridge Engine
// Real cross-chain bridge via Li.Fi API
// ===================================================================

import type { BridgeQuoteParams, BridgeQuote, BridgeRoute } from '@gravytos/types';

/** Platform fee: 1 % expressed in basis points */
const PLATFORM_FEE_BPS = 100;

/** Li.Fi REST API base URL */
const LIFI_API = 'https://li.quest/v1';

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 10_000;

/** Polling interval for status tracking (ms) */
const STATUS_POLL_INTERVAL_MS = 5_000;

/**
 * BridgeEngine provides cross-chain bridge quotes and executable
 * transaction data using the Li.Fi aggregation API.
 */
export class BridgeEngine {
  private lifiApiKey: string;

  constructor() {
    this.lifiApiKey =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_LIFI_API_KEY) || '';
  }

  // ── Quotes ─────────────────────────────────────────────────

  /**
   * Get a bridge quote from the Li.Fi API.
   *
   * GET https://li.quest/v1/quote
   */
  async getQuote(params: BridgeQuoteParams): Promise<BridgeQuote> {
    const fromChainId = this.extractChainId(params.fromChainId);
    const toChainId = this.extractChainId(params.toChainId);

    const url = new URL(`${LIFI_API}/quote`);
    url.searchParams.set('fromChain', String(fromChainId));
    url.searchParams.set('toChain', String(toChainId));
    url.searchParams.set('fromToken', params.fromToken);
    url.searchParams.set('toToken', params.toToken);
    url.searchParams.set('fromAmount', params.amount);
    url.searchParams.set('fromAddress', params.userAddress);
    if (params.recipientAddress) {
      url.searchParams.set('toAddress', params.recipientAddress);
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.lifiApiKey) {
      headers['x-lifi-api-key'] = this.lifiApiKey;
    }

    try {
      const response = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Li.Fi quote failed (${response.status}): ${errorText}`);
      }

      const data: unknown = await response.json();
      return this.mapLiFiToBridgeQuote(data);
    } catch (error: any) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('Bridge quote request timed out. Please try again.');
      }
      throw new Error(`Failed to get bridge quote: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get executable bridge transaction data from Li.Fi.
   * This calls the same quote endpoint but ensures transactionRequest is included.
   */
  async getBridgeTransaction(
    params: BridgeQuoteParams,
  ): Promise<BridgeQuote & { tx: { to: string; data: string; value: string } }> {
    const quote = await this.getQuote(params);

    if (!quote.tx) {
      throw new Error(
        'Li.Fi did not return transaction data. The route may not support direct execution.',
      );
    }

    return quote as BridgeQuote & { tx: { to: string; data: string; value: string } };
  }

  // ── Status tracking ────────────────────────────────────────

  /**
   * Track the status of a bridge transaction via Li.Fi.
   *
   * GET https://li.quest/v1/status
   */
  async getStatus(
    txHash: string,
    fromChainId: string,
    toChainId?: string,
  ): Promise<{
    status: string;
    substatus?: string;
    destinationTxHash?: string;
    bridgeExplorerUrl?: string;
  }> {
    try {
      const url = new URL(`${LIFI_API}/status`);
      url.searchParams.set('txHash', txHash);
      url.searchParams.set('bridge', 'any');
      url.searchParams.set('fromChain', String(this.extractChainId(fromChainId)));
      if (toChainId) {
        url.searchParams.set('toChain', String(this.extractChainId(toChainId)));
      }

      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (this.lifiApiKey) {
        headers['x-lifi-api-key'] = this.lifiApiKey;
      }

      const response = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        return { status: 'UNKNOWN' };
      }

      const data: any = await response.json();
      return {
        status: data.status || 'UNKNOWN',
        substatus: data.substatus,
        destinationTxHash: data.receiving?.txHash,
        bridgeExplorerUrl: data.bridgeExplorerLink,
      };
    } catch {
      return { status: 'UNKNOWN' };
    }
  }

  /**
   * Poll the bridge status until it reaches a terminal state.
   * Returns status updates via a callback function.
   *
   * Terminal states: DONE, FAILED
   */
  async trackStatus(
    txHash: string,
    fromChainId: string,
    toChainId: string,
    onUpdate?: (status: {
      status: string;
      substatus?: string;
      destinationTxHash?: string;
    }) => void,
  ): Promise<{
    status: string;
    destinationTxHash?: string;
  }> {
    const maxAttempts = 120; // ~10 min at 5s intervals
    let attempts = 0;

    while (attempts < maxAttempts) {
      const result = await this.getStatus(txHash, fromChainId, toChainId);

      if (onUpdate) {
        onUpdate(result);
      }

      if (result.status === 'DONE' || result.status === 'FAILED') {
        return {
          status: result.status,
          destinationTxHash: result.destinationTxHash,
        };
      }

      attempts++;
      await new Promise((r) => setTimeout(r, STATUS_POLL_INTERVAL_MS));
    }

    return { status: 'TIMEOUT' };
  }

  // ── Mapping helpers ────────────────────────────────────────

  /**
   * Extract numeric chain ID from Gravytos ChainId string.
   */
  private extractChainId(chainId: string): number {
    const parts = chainId.split('-');
    const numeric = parseInt(parts[parts.length - 1], 10);
    if (isNaN(numeric)) {
      // Handle named chains
      if (chainId.includes('solana')) return 1151111081099710; // Li.Fi Solana chain ID
      if (chainId.includes('bitcoin')) return 0; // Not supported by Li.Fi
      throw new Error(`Invalid chain ID: ${chainId}`);
    }
    return numeric;
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private mapLiFiToBridgeQuote(data: any): BridgeQuote {
    const estimate = data.estimate || {};
    const action = data.action || {};
    const steps: BridgeRoute[] = [];

    if (data.includedSteps && Array.isArray(data.includedSteps)) {
      for (const step of data.includedSteps) {
        steps.push({
          fromChainId: String(step.action?.fromChainId || action.fromChainId || ''),
          toChainId: String(step.action?.toChainId || action.toChainId || ''),
          bridge: step.tool || step.type || 'unknown',
          token: step.action?.fromToken?.symbol || action.fromToken?.symbol || '',
        });
      }
    }

    // If no steps were parsed, create a single-hop route
    if (steps.length === 0) {
      steps.push({
        fromChainId: String(action.fromChainId || ''),
        toChainId: String(action.toChainId || ''),
        bridge: data.tool || 'lifi',
        token: action.fromToken?.symbol || '',
      });
    }

    return {
      provider: data.tool || 'lifi',
      inputAmount: action.fromAmount || estimate.fromAmount || '0',
      outputAmount: estimate.toAmount || '0',
      platformFee: String(Math.floor(Number(action.fromAmount || 0) * PLATFORM_FEE_BPS / 10000)),
      bridgeFee: estimate.feeCosts
        ? String(
            estimate.feeCosts.reduce(
              (sum: number, f: any) => sum + Number(f.amountUSD || 0),
              0,
            ).toFixed(2),
          )
        : '0',
      estimatedTime: estimate.executionDuration || 0,
      route: steps,
      tx: data.transactionRequest
        ? {
            to: data.transactionRequest.to,
            data: data.transactionRequest.data,
            value: data.transactionRequest.value || '0',
          }
        : undefined,
    };
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
