// ═══════════════════════════════════════════════════════════════
// NEXORA VAULT — Supabase Client
// Shared Supabase instance and wallet-authenticated client
// ═══════════════════════════════════════════════════════════════

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { getEnv } from '@gravytos/config';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Return the singleton Supabase client, creating it on first call.
 * Throws if the required env vars are missing.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    const url = getEnv('VITE_SUPABASE_URL');
    const key = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
    if (!url || !key) {
      throw new Error('Supabase configuration missing: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
    }
    supabaseInstance = createClient(url, key);
  }
  return supabaseInstance;
}

/**
 * Create a Supabase client that authenticates via wallet signature.
 * The custom headers are forwarded to Edge Functions for verification.
 */
export function createWalletClient(walletAddress: string, token: string): SupabaseClient {
  const url = getEnv('VITE_SUPABASE_URL');
  const key = getEnv('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!url || !key) {
    throw new Error('Supabase configuration missing: set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
  }
  return createClient(url, key, {
    global: {
      headers: {
        'x-wallet-address': walletAddress,
        'x-wallet-token': token,
      },
    },
  });
}
