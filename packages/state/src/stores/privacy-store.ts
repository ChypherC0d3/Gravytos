// ═══════════════════════════════════════════════════════════════
// NEXORA VAULT — Privacy Store
// Per-chain privacy level overrides with global default
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { PrivacyLevel, DEFAULT_PRIVACY_CONFIGS } from '@gravytos/types';
import type { PrivacyConfig } from '@gravytos/types';

interface PrivacyState {
  globalLevel: PrivacyLevel;
  chainOverrides: Record<string, PrivacyLevel>;

  setGlobalLevel: (level: PrivacyLevel) => void;
  setChainLevel: (chainId: string, level: PrivacyLevel) => void;
  removeChainOverride: (chainId: string) => void;
  getEffectiveLevel: (chainId: string) => PrivacyLevel;
  getEffectiveConfig: (chainId: string) => PrivacyConfig;
}

export const usePrivacyStore = create<PrivacyState>()(
  persist(
    (set, get) => ({
      globalLevel: PrivacyLevel.Low,
      chainOverrides: {},

      setGlobalLevel: (level) => set({ globalLevel: level }),

      setChainLevel: (chainId, level) =>
        set((state) => ({
          chainOverrides: { ...state.chainOverrides, [chainId]: level },
        })),

      removeChainOverride: (chainId) =>
        set((state) => {
          const { [chainId]: _, ...rest } = state.chainOverrides;
          return { chainOverrides: rest };
        }),

      getEffectiveLevel: (chainId) => {
        const state = get();
        return state.chainOverrides[chainId] ?? state.globalLevel;
      },

      getEffectiveConfig: (chainId) => {
        const level = get().getEffectiveLevel(chainId);
        return { ...DEFAULT_PRIVACY_CONFIGS[level] };
      },
    }),
    { name: 'gravytos-privacy-store' },
  ),
);
