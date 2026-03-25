// ═══════════════════════════════════════════════════════════════
// NEXORA VAULT — Bridge API Client
// Quote and execute cross-chain bridges via Supabase Edge Functions
// ═══════════════════════════════════════════════════════════════

import type { BridgeQuoteParams, BridgeQuote } from '@gravytos/types';
import { getSupabaseClient } from '../supabase';

/** Platform fee in basis points (1%). */
const PLATFORM_FEE_BPS = 100;

/**
 * Fetch a bridge quote for the given parameters.
 */
export async function getBridgeQuote(params: BridgeQuoteParams): Promise<BridgeQuote> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('bridge-quote', {
    body: {
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount,
      userAddress: params.userAddress,
      recipientAddress: params.recipientAddress,
      platformFeeBps: PLATFORM_FEE_BPS,
    },
  });
  if (error) throw new Error(`Bridge quote failed: ${error.message}`);
  return data as BridgeQuote;
}

/**
 * Build a ready-to-sign bridge transaction.
 */
export async function executeBridge(
  params: BridgeQuoteParams,
): Promise<{ tx: { to: string; data: string; value: string } }> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.functions.invoke('bridge-execute', {
    body: {
      fromChainId: params.fromChainId,
      toChainId: params.toChainId,
      fromToken: params.fromToken,
      toToken: params.toToken,
      amount: params.amount,
      userAddress: params.userAddress,
      recipientAddress: params.recipientAddress,
      platformFeeBps: PLATFORM_FEE_BPS,
    },
  });
  if (error) throw new Error(`Bridge execute failed: ${error.message}`);
  return data;
}
