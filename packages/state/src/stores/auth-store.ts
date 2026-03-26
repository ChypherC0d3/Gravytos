// ═══════════════════════════════════════════════════════════════
// GRAVYTOS — Auth Store
// Supabase + wallet-based authentication state
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WalletAuthData {
  isAuthenticated: boolean;
  token: string | null;
  walletAddress: string | null;
  chain: 'evm' | 'solana' | 'bitcoin' | null;
  expiresAt: number | null;
}

interface AuthState {
  // Supabase auth
  userId: string | null;
  email: string | null;
  isSupabaseAuthenticated: boolean;

  // Wallet-based auth
  walletAuth: WalletAuthData;

  // Actions
  setSupabaseAuth: (userId: string | null, email: string | null) => void;
  setWalletAuth: (auth: Partial<WalletAuthData>) => void;
  clearWalletAuth: () => void;
  signOut: () => void;
  getAuthHeaders: () => Record<string, string>;
  isAuthenticated: () => boolean;
}

const EMPTY_WALLET_AUTH: WalletAuthData = {
  isAuthenticated: false,
  token: null,
  walletAddress: null,
  chain: null,
  expiresAt: null,
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      userId: null,
      email: null,
      isSupabaseAuthenticated: false,
      walletAuth: { ...EMPTY_WALLET_AUTH },

      setSupabaseAuth: (userId, email) =>
        set({
          userId,
          email,
          isSupabaseAuthenticated: !!userId,
        }),

      setWalletAuth: (auth) =>
        set((state) => ({
          walletAuth: { ...state.walletAuth, ...auth },
        })),

      clearWalletAuth: () => set({ walletAuth: { ...EMPTY_WALLET_AUTH } }),

      signOut: () =>
        set({
          userId: null,
          email: null,
          isSupabaseAuthenticated: false,
          walletAuth: { ...EMPTY_WALLET_AUTH },
        }),

      getAuthHeaders: () => {
        const state = get();
        const headers: Record<string, string> = {};
        if (state.walletAuth.token) {
          headers['x-wallet-token'] = state.walletAuth.token;
        }
        if (state.walletAuth.walletAddress) {
          headers['x-wallet-address'] = state.walletAuth.walletAddress;
        }
        return headers;
      },

      isAuthenticated: () => {
        const state = get();
        return state.isSupabaseAuthenticated || state.walletAuth.isAuthenticated;
      },
    }),
    { name: 'gravytos-auth-store' },
  ),
);
