// ═══════════════════════════════════════════════════════════════
// GRAVYTOS — Swap API Client
// Quote and execute token swaps via Supabase Edge Functions
// ═══════════════════════════════════════════════════════════════

import type { SwapQuoteParams, SwapQuote } from '@gravytos/types';
import { getSupabaseClient } from '../supabase';

/** Platform fee in basis points (0.3%). */
const PLATFORM_FEE_BPS = 30;

/**
 * Fetch a swap quote for the given parameters.
 */
export async function getSwapQuote(params: SwapQuoteParams): Promise<SwapQuote> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('swap-quote', {
    body: {
      chainId: params.chainId,
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount,
      slippage: params.slippage,
      userAddress: params.userAddress,
      platformFeeBps: PLATFORM_FEE_BPS,
    },
  });
  if (error) throw new Error(`Swap quote failed: ${error.message}`);
  return data as SwapQuote;
}

/**
 * Build a ready-to-sign swap transaction.
 */
export async function executeSwap(
  params: SwapQuoteParams,
): Promise<{ tx: { to: string; data: string; value: string } }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('swap-execute', {
    body: {
      chainId: params.chainId,
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount,
      slippage: params.slippage,
      userAddress: params.userAddress,
      platformFeeBps: PLATFORM_FEE_BPS,
    },
  });
  if (error) throw new Error(`Swap execute failed: ${error.message}`);
  return data;
}
