// ═══════════════════════════════════════════════════════════════
// GRAVYTOS — Settings Store
// Global application preferences (theme, locale, RPC, etc.)
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

type Theme = 'dark' | 'light' | 'system';
type Language = 'en' | 'es' | 'zh';
type Currency = 'USD' | 'EUR' | 'GBP';

interface SettingsState {
  theme: Theme;
  language: Language;
  currency: Currency;
  autoLockTimeout: number; // minutes, 0 = disabled
  customRpcUrls: Record<string, string[]>;
  torEnabled: boolean;
  analyticsEnabled: boolean;

  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setCurrency: (currency: Currency) => void;
  setAutoLockTimeout: (minutes: number) => void;
  setCustomRpcUrls: (chainId: string, urls: string[]) => void;
  setTorEnabled: (enabled: boolean) => void;
  setAnalyticsEnabled: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      language: 'en',
      currency: 'USD',
      autoLockTimeout: 15,
      customRpcUrls: {},
      torEnabled: false,
      analyticsEnabled: true,

      setTheme: (theme) => set({ theme }),
      setLanguage: (language) => set({ language }),
      setCurrency: (currency) => set({ currency }),
      setAutoLockTimeout: (minutes) => set({ autoLockTimeout: minutes }),
      setCustomRpcUrls: (chainId, urls) =>
        set((state) => ({
          customRpcUrls: { ...state.customRpcUrls, [chainId]: urls },
        })),
      setTorEnabled: (enabled) => set({ torEnabled: enabled }),
      setAnalyticsEnabled: (enabled) => set({ analyticsEnabled: enabled }),
    }),
    { name: 'gravytos-settings-store' },
  ),
);
