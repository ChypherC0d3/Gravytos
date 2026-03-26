// ===================================================================
// GRAVYTOS -- Swap Engine
// Real DEX aggregation via 1inch (EVM) and Jupiter (Solana)
// ===================================================================

import type { SwapQuoteParams, SwapQuote } from '@gravytos/types';

/** Platform fee: 0.3 % expressed in basis points */
const PLATFORM_FEE_BPS = 30;

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 10_000;

/** 1inch Swap API v6.0 base URL */
const ONEINCH_API_BASE = 'https://api.1inch.dev/swap/v6.0';

/** Jupiter V6 API base URL */
const JUPITER_API_BASE = 'https://quote-api.jup.ag/v6';

/**
 * SwapEngine provides swap quotes and executable transaction data
 * for EVM chains (via the 1inch Aggregation API) and Solana (via Jupiter V6).
 */
export class SwapEngine {
  private oneInchApiKey: string;

  constructor() {
    // Read API key from environment; falls back to empty string
    this.oneInchApiKey =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_ONEINCH_API_KEY) || '';
  }

  // ── EVM swap (1inch Aggregation API v6.0) ──────────────────

  /**
   * Get a swap quote from 1inch Aggregation Protocol.
   *
   * GET https://api.1inch.dev/swap/v6.0/{chainId}/quote
   */
  async getQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    const chainId = this.extractEvmChainId(params.chainId);
    const url = new URL(`${ONEINCH_API_BASE}/${chainId}/quote`);
    url.searchParams.set('src', params.fromToken);
    url.searchParams.set('dst', params.toToken);
    url.searchParams.set('amount', params.amount);
    if (params.slippage) {
      url.searchParams.set('includeGas', 'true');
    }

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.oneInchApiKey) {
      headers['Authorization'] = `Bearer ${this.oneInchApiKey}`;
    }

    try {
      const response = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`1inch quote failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      return {
        provider: '1inch',
        inputAmount: data.fromAmount || params.amount,
        outputAmount: data.toAmount || '0',
        platformFee: String(Math.floor(Number(data.fromAmount || 0) * PLATFORM_FEE_BPS / 10000)),
        estimatedGas: data.gas ? String(data.gas) : data.estimatedGas || '0',
        priceImpact: 0, // 1inch quote endpoint does not return price impact
        route: data.protocols
          ? this.parse1inchRoute(data.protocols)
          : [{ protocol: '1inch', fromToken: params.fromToken, toToken: params.toToken, percentage: 100 }],
        expiresAt: Date.now() + 30_000,
      };
    } catch (error: any) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('1inch quote request timed out. Please try again.');
      }
      throw new Error(`Failed to get swap quote: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Get executable swap transaction data from 1inch.
   *
   * GET https://api.1inch.dev/swap/v6.0/{chainId}/swap
   */
  async executeSwap(
    params: SwapQuoteParams,
  ): Promise<SwapQuote & { tx: { to: string; data: string; value: string; gasLimit?: string } }> {
    const chainId = this.extractEvmChainId(params.chainId);
    const url = new URL(`${ONEINCH_API_BASE}/${chainId}/swap`);
    url.searchParams.set('src', params.fromToken);
    url.searchParams.set('dst', params.toToken);
    url.searchParams.set('amount', params.amount);
    url.searchParams.set('from', params.userAddress);
    url.searchParams.set('slippage', String(params.slippage || 1));
    url.searchParams.set('disableEstimate', 'false');
    url.searchParams.set('allowPartialFill', 'false');

    const headers: Record<string, string> = {
      Accept: 'application/json',
    };
    if (this.oneInchApiKey) {
      headers['Authorization'] = `Bearer ${this.oneInchApiKey}`;
    }

    try {
      const response = await fetch(url.toString(), {
        headers,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`1inch swap failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      return {
        provider: '1inch',
        inputAmount: data.fromAmount || params.amount,
        outputAmount: data.toAmount || '0',
        platformFee: String(Math.floor(Number(data.fromAmount || 0) * PLATFORM_FEE_BPS / 10000)),
        estimatedGas: data.tx?.gas ? String(data.tx.gas) : '0',
        priceImpact: 0,
        route: data.protocols
          ? this.parse1inchRoute(data.protocols)
          : [{ protocol: '1inch', fromToken: params.fromToken, toToken: params.toToken, percentage: 100 }],
        expiresAt: Date.now() + 30_000,
        tx: {
          to: data.tx.to,
          data: data.tx.data,
          value: data.tx.value || '0',
          gasLimit: data.tx.gas ? String(data.tx.gas) : undefined,
        },
      };
    } catch (error: any) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('1inch swap request timed out. Please try again.');
      }
      throw new Error(`Failed to execute swap: ${error.message || 'Unknown error'}`);
    }
  }

  // ── Solana swap (Jupiter V6) ───────────────────────────────

  /**
   * Get a Jupiter V6 swap quote for Solana tokens.
   *
   * GET https://quote-api.jup.ag/v6/quote
   */
  async getJupiterQuote(params: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps: number;
    userPublicKey: string;
  }): Promise<{
    outputAmount: string;
    priceImpact: number;
    routePlan: unknown[];
    quoteResponse: unknown;
  }> {
    const url = new URL(`${JUPITER_API_BASE}/quote`);
    url.searchParams.set('inputMint', params.inputMint);
    url.searchParams.set('outputMint', params.outputMint);
    url.searchParams.set('amount', params.amount);
    url.searchParams.set('slippageBps', String(params.slippageBps));
    url.searchParams.set('platformFeeBps', String(PLATFORM_FEE_BPS));

    try {
      const response = await fetch(url.toString(), {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Jupiter quote failed (${response.status}): ${errorText}`);
      }

      const data = await response.json();

      return {
        outputAmount: data.outAmount || '0',
        priceImpact: data.priceImpactPct ? Number(data.priceImpactPct) : 0,
        routePlan: data.routePlan || [],
        quoteResponse: data, // Preserve the full response for the swap step
      };
    } catch (error: any) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('Jupiter quote request timed out. Please try again.');
      }
      throw new Error(`Failed to get Jupiter quote: ${error.message || 'Unknown error'}`);
    }
  }

  /**
   * Convert a Jupiter quote response into a serialised swap transaction
   * that can be signed by the user's wallet.
   *
   * POST https://quote-api.jup.ag/v6/swap
   */
  async getJupiterSwapTransaction(
    quoteResponse: unknown,
    userPublicKey: string,
  ): Promise<{ swapTransaction: string }> {
    try {
      const response = await fetch(`${JUPITER_API_BASE}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quoteResponse,
          userPublicKey,
          wrapAndUnwrapSol: true,
          dynamicComputeUnitLimit: true,
          prioritizationFeeLamports: 'auto',
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Jupiter swap failed (${response.status}): ${errorText}`);
      }

      return response.json() as Promise<{ swapTransaction: string }>;
    } catch (error: any) {
      if (error.name === 'TimeoutError' || error.name === 'AbortError') {
        throw new Error('Jupiter swap request timed out. Please try again.');
      }
      throw new Error(`Failed to build Jupiter swap transaction: ${error.message || 'Unknown error'}`);
    }
  }

  // ── Helpers ────────────────────────────────────────────────

  /**
   * Extract the numeric EVM chain ID from a Gravytos ChainId string.
   * e.g. "ethereum-1" -> 1, "polygon-137" -> 137
   */
  private extractEvmChainId(chainId: string): number {
    const parts = chainId.split('-');
    const numeric = parseInt(parts[parts.length - 1], 10);
    if (isNaN(numeric)) {
      throw new Error(`Invalid EVM chain ID: ${chainId}`);
    }
    return numeric;
  }

  /**
   * Parse the 1inch protocols array into our SwapRoute format.
   * 1inch returns nested arrays: protocols[routeIdx][hopIdx][splitIdx]
   */
  /* eslint-disable @typescript-eslint/no-explicit-any */
  private parse1inchRoute(protocols: any): SwapQuote['route'] {
    if (!protocols || !Array.isArray(protocols)) return [];

    const routes: SwapQuote['route'] = [];
    try {
      for (const route of protocols) {
        if (!Array.isArray(route)) continue;
        for (const hop of route) {
          if (!Array.isArray(hop)) continue;
          for (const split of hop) {
            routes.push({
              protocol: split.name || 'Unknown',
              fromToken: split.fromTokenAddress || '',
              toToken: split.toTokenAddress || '',
              percentage: split.part || 100,
            });
          }
        }
      }
    } catch {
      // If parsing fails, return a generic route
    }
    return routes;
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
