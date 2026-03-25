// ═══════════════════════════════════════════════════════════════
// NEXORA VAULT — Transaction Store
// Pending + confirmed transaction tracking with history cap
// ═══════════════════════════════════════════════════════════════

import { create } from 'zustand';
import type { TransactionResult, TransactionStatus } from '@gravytos/types';

interface PendingTransaction extends TransactionResult {
  type: 'send' | 'swap' | 'bridge';
  description: string;
}

interface TransactionState {
  pending: PendingTransaction[];
  history: PendingTransaction[];

  addPending: (tx: PendingTransaction) => void;
  updateStatus: (txHash: string, status: TransactionStatus, blockNumber?: number) => void;
  moveToDone: (txHash: string) => void;
  clearHistory: () => void;
  getByChain: (chainId: string) => PendingTransaction[];
}

/** Maximum number of transactions kept in history. */
const MAX_HISTORY = 500;

export const useTransactionStore = create<TransactionState>()((set, get) => ({
  pending: [],
  history: [],

  addPending: (tx) =>
    set((state) => ({
      pending: [tx, ...state.pending],
    })),

  updateStatus: (txHash, status, blockNumber) =>
    set((state) => ({
      pending: state.pending.map((tx) =>
        tx.txHash === txHash
          ? { ...tx, status, blockNumber: blockNumber ?? tx.blockNumber }
          : tx,
      ),
    })),

  moveToDone: (txHash) =>
    set((state) => {
      const tx = state.pending.find((t) => t.txHash === txHash);
      if (!tx) return state;
      return {
        pending: state.pending.filter((t) => t.txHash !== txHash),
        history: [
          { ...tx, status: 'confirmed' as TransactionStatus },
          ...state.history,
        ].slice(0, MAX_HISTORY),
      };
    }),

  clearHistory: () => set({ history: [] }),

  getByChain: (chainId) => {
    const state = get();
    return [...state.pending, ...state.history].filter(
      (tx) => tx.chainId === chainId,
    );
  },
}));
