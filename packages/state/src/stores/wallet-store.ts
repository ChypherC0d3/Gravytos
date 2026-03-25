// ═══════════════════════════════════════════════════════════════
// NEXORA VAULT — Wallet Store
// Connection state, balances, and active addresses per chain
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { TokenBalance, ChainFamily } from '@gravytos/types';

interface WalletState {
  // Connection state per chain family
  evmAddress: string | null;
  evmChainId: number | null;
  solanaAddress: string | null;
  btcAddress: string | null;

  // Balances: chainId -> symbol -> TokenBalance
  balances: Record<string, Record<string, TokenBalance>>;
  isLoadingBalances: boolean;

  // Actions
  setEvmWallet: (address: string | null, chainId: number | null) => void;
  setSolanaWallet: (address: string | null) => void;
  setBtcWallet: (address: string | null) => void;
  updateBalances: (chainId: string, balances: Record<string, TokenBalance>) => void;
  setLoadingBalances: (loading: boolean) => void;
  getActiveAddresses: () => { chainFamily: ChainFamily; address: string }[];
  disconnectAll: () => void;
}

export const useWalletStore = create<WalletState>()(
  persist(
    (set, get) => ({
      evmAddress: null,
      evmChainId: null,
      solanaAddress: null,
      btcAddress: null,
      balances: {},
      isLoadingBalances: false,

      setEvmWallet: (address, chainId) =>
        set({ evmAddress: address, evmChainId: chainId }),

      setSolanaWallet: (address) => set({ solanaAddress: address }),

      setBtcWallet: (address) => set({ btcAddress: address }),

      updateBalances: (chainId, newBalances) =>
        set((state) => ({
          balances: { ...state.balances, [chainId]: newBalances },
        })),

      setLoadingBalances: (loading) => set({ isLoadingBalances: loading }),

      getActiveAddresses: () => {
        const state = get();
        const addresses: { chainFamily: ChainFamily; address: string }[] = [];
        if (state.evmAddress) {
          addresses.push({ chainFamily: 'evm' as ChainFamily, address: state.evmAddress });
        }
        if (state.solanaAddress) {
          addresses.push({ chainFamily: 'solana' as ChainFamily, address: state.solanaAddress });
        }
        if (state.btcAddress) {
          addresses.push({ chainFamily: 'bitcoin' as ChainFamily, address: state.btcAddress });
        }
        return addresses;
      },

      disconnectAll: () =>
        set({
          evmAddress: null,
          evmChainId: null,
          solanaAddress: null,
          btcAddress: null,
          balances: {},
        }),
    }),
    { name: 'gravytos-wallet-store' },
  ),
);
