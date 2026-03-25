import { useState, useMemo } from 'react';

// Token data structure
interface Token {
  symbol: string;
  name: string;
  address: string; // empty for native
  decimals: number;
  logoUrl?: string;
  isNative: boolean;
  chainId?: string;
}

// Default tokens per chain
const CHAIN_TOKENS: Record<string, Token[]> = {
  'bitcoin-mainnet': [
    { symbol: 'BTC', name: 'Bitcoin', address: '', decimals: 8, isNative: true },
  ],
  'ethereum-1': [
    { symbol: 'ETH', name: 'Ethereum', address: '', decimals: 18, isNative: true },
    { symbol: 'USDC', name: 'USD Coin', address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', decimals: 6, isNative: false },
    { symbol: 'USDT', name: 'Tether', address: '0xdAC17F958D2ee523a2206206994597C13D831ec7', decimals: 6, isNative: false },
    { symbol: 'DAI', name: 'Dai', address: '0x6B175474E89094C44Da98b954EedeAC495271d0F', decimals: 18, isNative: false },
    { symbol: 'WBTC', name: 'Wrapped Bitcoin', address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599', decimals: 8, isNative: false },
    { symbol: 'LINK', name: 'Chainlink', address: '0x514910771AF9Ca656af840dff83E8264EcF986CA', decimals: 18, isNative: false },
    { symbol: 'UNI', name: 'Uniswap', address: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984', decimals: 18, isNative: false },
    { symbol: 'AAVE', name: 'Aave', address: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9', decimals: 18, isNative: false },
    { symbol: 'wstETH', name: 'Wrapped stETH', address: '0x7f39C581F595B53c5cb19bD0b3f8dA6c935E2Ca0', decimals: 18, isNative: false },
  ],
  'polygon-137': [
    { symbol: 'POL', name: 'Polygon', address: '', decimals: 18, isNative: true },
    { symbol: 'USDC', name: 'USD Coin', address: '0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359', decimals: 6, isNative: false },
    { symbol: 'USDT', name: 'Tether', address: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F', decimals: 6, isNative: false },
  ],
  'solana-mainnet': [
    { symbol: 'SOL', name: 'Solana', address: '', decimals: 9, isNative: true },
    { symbol: 'USDC', name: 'USD Coin', address: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6, isNative: false },
    { symbol: 'USDT', name: 'Tether', address: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6, isNative: false },
    { symbol: 'JUP', name: 'Jupiter', address: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', decimals: 6, isNative: false },
    { symbol: 'BONK', name: 'Bonk', address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', decimals: 5, isNative: false },
  ],
};

// Copy Ethereum tokens for L2s with native ETH
['arbitrum-42161', 'base-8453', 'optimism-10'].forEach(chain => {
  CHAIN_TOKENS[chain] = [
    { symbol: 'ETH', name: 'Ethereum', address: '', decimals: 18, isNative: true },
    ...CHAIN_TOKENS['ethereum-1'].filter(t => !t.isNative).slice(0, 5), // top 5 tokens
  ];
});

interface TokenPickerProps {
  chainId: string;
  selectedToken: string;
  onSelect: (token: Token) => void;
  onClose: () => void;
}

function TokenPicker({ chainId, selectedToken, onSelect, onClose }: TokenPickerProps) {
  const [search, setSearch] = useState('');
  const [customAddress, setCustomAddress] = useState('');
  const [showCustom, setShowCustom] = useState(false);

  const tokens = CHAIN_TOKENS[chainId] || CHAIN_TOKENS['ethereum-1'];

  const filtered = useMemo(() => {
    if (!search) return tokens;
    const q = search.toLowerCase();
    return tokens.filter(t =>
      t.symbol.toLowerCase().includes(q) ||
      t.name.toLowerCase().includes(q) ||
      t.address.toLowerCase().includes(q)
    );
  }, [tokens, search]);

  const handleCustomImport = () => {
    if (!customAddress) return;
    // Create a custom token entry
    const custom: Token = {
      symbol: 'CUSTOM',
      name: `Custom (${customAddress.substring(0, 8)}...)`,
      address: customAddress,
      decimals: 18, // Default, should be queried
      isNative: false,
    };
    onSelect(custom);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center">
      <div className="glass-card max-w-md w-full mx-4 p-6 rounded-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-light text-white">Select Token</h3>
          <button onClick={onClose} className="text-white/50 hover:text-white text-2xl">&times;</button>
        </div>

        {/* Search */}
        <input
          type="text"
          placeholder="Search name, symbol, or address..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 text-sm font-light focus:border-purple-500/50 focus:outline-none mb-4"
        />

        {/* Token List */}
        <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
          {filtered.map(token => (
            <button
              key={`${token.symbol}-${token.address}`}
              onClick={() => onSelect(token)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                token.symbol === selectedToken
                  ? 'bg-purple-500/20 border border-purple-500/30'
                  : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-xs font-semibold text-white/70">
                {token.symbol.substring(0, 2)}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-medium text-white/90">{token.symbol}</div>
                <div className="text-xs text-white/40 font-light">{token.name}</div>
              </div>
              {token.isNative && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Native</span>
              )}
            </button>
          ))}

          {filtered.length === 0 && (
            <div className="text-center py-8 text-white/30 text-sm">No tokens found</div>
          )}
        </div>

        {/* Custom Token Import */}
        <div className="mt-4 pt-4 border-t border-white/10">
          {showCustom ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Paste token contract address..."
                value={customAddress}
                onChange={e => setCustomAddress(e.target.value)}
                className="w-full px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-sm font-mono focus:border-purple-500/50 focus:outline-none"
              />
              <button
                onClick={handleCustomImport}
                disabled={!customAddress}
                className="w-full py-2 text-sm font-light rounded-xl bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 disabled:opacity-30 transition-all"
              >
                Import Token
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowCustom(true)}
              className="w-full text-center text-xs text-white/30 hover:text-white/60 transition-colors font-light"
            >
              + Import custom token by address
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export { TokenPicker, CHAIN_TOKENS, type Token };
