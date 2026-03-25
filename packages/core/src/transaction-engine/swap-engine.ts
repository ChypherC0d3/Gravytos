// ===================================================================
// NEXORA VAULT -- Swap Engine
// DEX aggregation via Gravytos backend (1inch) and Jupiter (Solana)
// ===================================================================

import type { SwapQuoteParams, SwapQuote } from '@gravytos/types';

/** Platform fee: 0.3 % expressed in basis points */
const PLATFORM_FEE_BPS = 30;

/**
 * SwapEngine provides swap quotes and executable transaction data
 * for EVM chains (via a Supabase edge function proxying 1inch)
 * and Solana (via the Jupiter V6 API).
 */
export class SwapEngine {
  private supabaseUrl: string;
  private supabaseKey: string;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
  }

  // ── EVM swap (1inch via Gravytos) ──────────────────────────────

  /**
   * Get a swap quote from the Gravytos backend (1inch aggregation).
   */
  async getQuote(params: SwapQuoteParams): Promise<SwapQuote> {
    const response = await fetch(
      `${this.supabaseUrl}/functions/v1/swap-quote`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({
          chainId: params.chainId,
          fromToken: params.fromToken,
          toToken: params.toToken,
          amount: params.amount,
          slippage: params.slippage,
          userAddress: params.userAddress,
          platformFeeBps: PLATFORM_FEE_BPS,
        }),
      },
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Swap quote failed: ${error}`);
    }

    const data: unknown = await response.json();
    return this.mapToSwapQuote(data);
  }

  /**
   * Get executable swap transaction data ready to sign and broadcast.
   */
  async getSwapTransaction(
    params: SwapQuoteParams,
  ): Promise<
    SwapQuote & { tx: { to: string; data: string; value: string; gasLimit?: string } }
  > {
    const response = await fetch(
      `${this.supabaseUrl}/functions/v1/swap-execute`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.supabaseKey}`,
        },
        body: JSON.stringify({
          chainId: params.chainId,
          fromToken: params.fromToken,
          toToken: params.toToken,
          amount: params.amount,
          slippage: params.slippage,
          userAddress: params.userAddress,
          platformFeeBps: PLATFORM_FEE_BPS,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Swap execute failed: ${await response.text()}`);
    }

    return response.json() as Promise<
      SwapQuote & { tx: { to: string; data: string; value: string; gasLimit?: string } }
    >;
  }

  // ── Solana swap (Jupiter V6) ───────────────────────────────────

  /**
   * Get a Jupiter V6 swap quote for Solana tokens.
   *
   * @param params.inputMint  - SPL mint address of the source token
   * @param params.outputMint - SPL mint address of the destination token
   * @param params.amount     - Amount in the smallest unit (lamports / token base units)
   * @param params.slippageBps - Slippage tolerance in basis points
   * @param params.userPublicKey - Solana public key of the swapper
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
  }> {
    const url = new URL('https://quote-api.jup.ag/v6/quote');
    url.searchParams.set('inputMint', params.inputMint);
    url.searchParams.set('outputMint', params.outputMint);
    url.searchParams.set('amount', params.amount);
    url.searchParams.set('slippageBps', String(params.slippageBps));
    url.searchParams.set('platformFeeBps', String(PLATFORM_FEE_BPS));

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Jupiter quote failed: ${await response.text()}`);
    }

    return response.json() as Promise<{
      outputAmount: string;
      priceImpact: number;
      routePlan: unknown[];
    }>;
  }

  /**
   * Convert a Jupiter quote response into a serialised swap transaction
   * that can be signed by the user's wallet.
   */
  async getJupiterSwapTransaction(
    quoteResponse: unknown,
    userPublicKey: string,
  ): Promise<{ swapTransaction: string }> {
    const response = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });

    if (!response.ok) {
      throw new Error(`Jupiter swap failed: ${await response.text()}`);
    }

    return response.json() as Promise<{ swapTransaction: string }>;
  }

  // ── Helpers ────────────────────────────────────────────────────

  /* eslint-disable @typescript-eslint/no-explicit-any */
  private mapToSwapQuote(data: any): SwapQuote {
    return {
      provider: data.provider || '1inch',
      inputAmount: data.inputAmount || data.fromAmount || '0',
      outputAmount: data.outputAmount || data.toAmount || '0',
      platformFee: data.platformFee || '0',
      estimatedGas: data.estimatedGas || '0',
      priceImpact: data.priceImpact || 0,
      route: data.route || [],
      tx: data.tx,
      expiresAt: Date.now() + 30_000, // quotes are valid for 30 s
    };
  }
  /* eslint-enable @typescript-eslint/no-explicit-any */
}
