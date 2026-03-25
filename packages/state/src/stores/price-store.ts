import { create } from 'zustand';

interface PriceState {
  prices: Record<string, number>; // symbol -> USD price
  lastUpdated: number;
  isLoading: boolean;

  setPrices: (prices: Record<string, number>) => void;
  getPrice: (symbol: string) => number;
  getPortfolioValue: (balances: Record<string, { formatted: string; symbol: string }>) => number;
}

export const usePriceStore = create<PriceState>()((set, get) => ({
  prices: {},
  lastUpdated: 0,
  isLoading: false,

  setPrices: (newPrices) =>
    set((state) => ({
      prices: { ...state.prices, ...newPrices },
      lastUpdated: Date.now(),
      isLoading: false,
    })),

  getPrice: (symbol) => get().prices[symbol.toUpperCase()] || 0,

  getPortfolioValue: (balances) => {
    const { prices } = get();
    let total = 0;
    for (const [, bal] of Object.entries(balances)) {
      const price = prices[bal.symbol.toUpperCase()] || 0;
      total += parseFloat(bal.formatted || '0') * price;
    }
    return total;
  },
}));
