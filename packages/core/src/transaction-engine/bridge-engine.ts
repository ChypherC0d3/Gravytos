// ===================================================================
// NEXORA VAULT -- Bridge Engine
// Cross-chain bridge via Li.Fi and Gravytos backend
// ===================================================================

import type { BridgeQuoteParams, BridgeQuote, BridgeRoute } from '@gravytos/types';

/** Platform fee: 1 % expressed in basis points */
const PLATFORM_FEE_BPS = 100;

/** Li.Fi REST API base URL */
const LIFI_API = 'https://li.quest/v1';

/**
 * BridgeEngine provides cross-chain bridge quotes and executable
 * transaction data. It tries the Gravytos backend first and falls
 * back to the Li.Fi API directly when that is unavailable.
 */
export class BridgeEngine {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
  }

  // ── Quotes ─────────────────────────────────────────────────────

  /**
   * Get a bridge quote. Tries the Gravytos backend first; falls back
   * to a direct Li.Fi API call on failure.
   */
  async getQuote(params: BridgeQuoteParams): Promise<BridgeQuote> {
    // Try Gravytos backend first
    try {
      const response = await fetch(
        `${this.supabaseUrl}/functions/v1/bridge-quote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.supabaseKey}`,
          },
          body: JSON.stringify({
            fromChainId: params.fromChainId,
            toChainId: params.toChainId,
            fromToken: params.fromToken,
            toToken: params.toToken,
            amount: params.amount,
            userAddress: params.userAddress,
            platformFeeBps: PLATFORM_FEE_BPS,
          }),
        },
      );

      if (response.ok) {
        const data: unknown = await response.json();
        return this.mapToBridgeQuote(data);
      }
    } catch {
      // Gravytos unavailable -- fall through to Li.Fi direct
    }

    // Fallback: direct Li.Fi API
    return this.getLiFiQuote(params);
  }

  /**
   * Get executable bridge transaction data ready to sign and broadcast.
   */
  async getBridgeTransaction(
    params: BridgeQuoteParams,
  ): Promise<BridgeQuote & { tx: { to: string; data: string; value: string } }> {
    const response = await fetch(
      `${this.supabaseUrl}/functions/v1/bridge-execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({
          ...params,
          platformFeeBps: PLATFORM_FEE_BPS,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Bridge execute failed: ${await response.text()}`);
    }

    return response.json() as Promise<
      BridgeQuote & { tx: { to: string; data: string; value: string } }
    >;
  }

  // ── Status tracking ────────────────────────────────────────────

  /**
   * Track the status of a bridge transaction via Li.Fi.
   */
  async getStatus(
    txHash: string,
    fromChainId: string,
  ): Promise<{
    status: string;
    substatus?: string;
    destinationTxHash?: string;
  }> {
    try {
      const url = new URL(`${LIFI_API}/status`);
      url.searchParams.set('txHash', txHash);
      url.searchParams.set('bridge', 'any');
      url.searchParams.set('fromChain', fromChainId);

      const response = await fetch(url.toString());
      if (!response.ok) {
        return { status: 'UNKNOWN' };
      }
      return response.json() as Promise<{
        status: string;
        substatus?: string;
        destinationTxHash?: string;
      }>;
    } catch {
      return { status: 'UNKNOWN' };
    }
  }

  // ── Li.Fi direct fallback ──────────────────────────────────────

  private async getLiFiQuote(params: BridgeQuoteParams): Promise<BridgeQuote> {
    const url = new URL(`${LIFI_API}/quote`);
    url.searchParams.set('fromChain', params.fromChainId);
    url.searchParams.set('toChain', params.toChainId);
    url.searchParams.set('fromToken', params.fromToken);
    url.searchParams.set('toToken', params.toToken);
    url.searchParams.set('fromAmount', params.amount);
    url.searchParams.set('fromAddress', params.userAddress);
    if (params.recipientAddress) {
      url.searchParams.set('toAddress', params.recipientAddress);
    }

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Li.Fi quote failed: ${await response.text()}`);
    }

    const data: unknown = await response.json();
    return this.mapLiFiToBridgeQuote(data);
  }

  // ── Mapping helpers ────────────────────────────────────────────

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private mapToBridgeQuote(data: any): BridgeQuote {
    return {
      provider: data.provider || data.tool || 'lifi',
      inputAmount: data.inputAmount || data.fromAmount || '0',
      outputAmount: data.outputAmount || data.toAmount || '0',
      platformFee: data.platformFee || '0',
      bridgeFee: data.bridgeFee || data.fee || '0',
      estimatedTime: data.estimatedTime || data.estimate?.executionDuration || 0,
      route: this.parseRoute(data.route || data.includedSteps),
      tx: data.tx || data.transactionRequest,
    };
  }

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
      platformFee: '0', // Li.Fi does not expose this separately
      bridgeFee: estimate.feeCosts
        ? String(
            estimate.feeCosts.reduce(
              (sum: number, f: any) => sum + Number(f.amountUSD || 0),
              0,
            ),
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

  private parseRoute(raw: any): BridgeRoute[] {
    if (!raw || !Array.isArray(raw)) return [];
    return raw.map((step: any) => ({
      fromChainId: String(step.fromChainId || ''),
      toChainId: String(step.toChainId || ''),
      bridge: step.bridge || step.tool || 'unknown',
      token: step.token || step.fromToken || '',
    }));
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
