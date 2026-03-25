import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AddressBookEntry {
  id: string;
  label: string;
  address: string;
  chainFamily: 'bitcoin' | 'evm' | 'solana';
  notes?: string;
  createdAt: number;
  lastUsed?: number;
}

interface AddressBookState {
  entries: AddressBookEntry[];

  addEntry: (entry: Omit<AddressBookEntry, 'id' | 'createdAt'>) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, updates: Partial<AddressBookEntry>) => void;
  getByChain: (chainFamily: string) => AddressBookEntry[];
  search: (query: string) => AddressBookEntry[];
  markUsed: (id: string) => void;
}

export const useAddressBookStore = create<AddressBookState>()(
  persist(
    (set, get) => ({
      entries: [],

      addEntry: (entry) => set((state) => ({
        entries: [...state.entries, {
          ...entry,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        }],
      })),

      removeEntry: (id) => set((state) => ({
        entries: state.entries.filter(e => e.id !== id),
      })),

      updateEntry: (id, updates) => set((state) => ({
        entries: state.entries.map(e => e.id === id ? { ...e, ...updates } : e),
      })),

      getByChain: (chainFamily) => get().entries.filter(e => e.chainFamily === chainFamily),

      search: (query) => {
        const q = query.toLowerCase();
        return get().entries.filter(e =>
          e.label.toLowerCase().includes(q) ||
          e.address.toLowerCase().includes(q) ||
          (e.notes?.toLowerCase().includes(q) ?? false)
        );
      },

      markUsed: (id) => set((state) => ({
        entries: state.entries.map(e => e.id === id ? { ...e, lastUsed: Date.now() } : e),
      })),
    }),
    { name: 'gravytos-address-book' }
  )
);
