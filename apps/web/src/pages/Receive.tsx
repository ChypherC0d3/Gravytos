import { useState } from 'react';
import { Link } from 'react-router-dom';

// ─── Chain Definitions ───────────────────────────────────────

const CHAINS = [
  { id: 'bitcoin-mainnet', name: 'Bitcoin', symbol: 'BTC', color: 'from-orange-500 to-orange-600', textColor: 'text-orange-400', family: 'bitcoin' },
  { id: 'ethereum-1', name: 'Ethereum', symbol: 'ETH', color: 'from-blue-500 to-blue-600', textColor: 'text-blue-400', family: 'evm' },
  { id: 'solana-mainnet', name: 'Solana', symbol: 'SOL', color: 'from-purple-500 to-purple-600', textColor: 'text-purple-400', family: 'solana' },
  { id: 'polygon-137', name: 'Polygon', symbol: 'MATIC', color: 'from-violet-500 to-violet-600', textColor: 'text-violet-400', family: 'evm' },
  { id: 'arbitrum-42161', name: 'Arbitrum', symbol: 'ETH', color: 'from-sky-500 to-sky-600', textColor: 'text-sky-400', family: 'evm' },
  { id: 'base-8453', name: 'Base', symbol: 'ETH', color: 'from-blue-500 to-blue-700', textColor: 'text-blue-300', family: 'evm' },
  { id: 'optimism-10', name: 'Optimism', symbol: 'ETH', color: 'from-red-500 to-red-600', textColor: 'text-red-400', family: 'evm' },
];

const MOCK_ADDRESSES: Record<string, string[]> = {
  'bitcoin-mainnet': [
    'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    'bc1q9h5yjqka3mvmf5j8m3ryl5fe0cr5yqkf9xaltz',
    'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
    'bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq',
    'bc1q0ht9tyksv2qxdkygqkf8jqtw9gfzdn39hc3r0e',
  ],
  'ethereum-1': ['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38'],
  'solana-mainnet': ['7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU'],
  'polygon-137': ['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38'],
  'arbitrum-42161': ['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38'],
  'base-8453': ['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38'],
  'optimism-10': ['0x742d35Cc6634C0532925a3b844Bc9e7595f2bD38'],
};

// ─── QR Code Placeholder ─────────────────────────────────────

function QRPlaceholder({ value }: { value: string }) {
  const cells = 21;
  const size = 200;
  const cellSize = size / cells;

  const rects: { x: number; y: number }[] = [];
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      const charCode = value.charCodeAt((row * cells + col) % value.length) || 0;
      const show = (charCode + row + col) % 3 !== 0;
      const isFinder =
        (row < 7 && col < 7) ||
        (row < 7 && col >= cells - 7) ||
        (row >= cells - 7 && col < 7);
      if (show || isFinder) {
        rects.push({ x: col * cellSize, y: row * cellSize });
      }
    }
  }

  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-48 h-48 mx-auto" role="img" aria-label="QR code">
      <rect width={size} height={size} fill="white" rx={8} />
      {rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={cellSize} height={cellSize} fill="#18181b" />
      ))}
    </svg>
  );
}

// ─── Navbar ──────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="border-b border-white/5 bg-[hsl(220,30%,6%)]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <span className="text-lg font-light tracking-wide text-white">Gravytos</span>
        </Link>
        <nav className="hidden md:flex items-center gap-1">
          {[
            { to: '/send', label: 'Send' },
            { to: '/receive', label: 'Receive' },
            { to: '/swap', label: 'Swap' },
            { to: '/bridge', label: 'Bridge' },
            { to: '/history', label: 'History' },
            { to: '/settings', label: 'Settings' },
          ].map((link) => (
            <Link key={link.to} to={link.to} className="px-3 py-1.5 text-sm font-light tracking-wide text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300">{link.label}</Link>
          ))}
        </nav>
        <span className="text-xs font-light tracking-wider text-white/30 px-3 py-1 rounded-full border border-white/10 bg-white/5">Testnet</span>
      </div>
    </header>
  );
}

// ─── Receive Page ────────────────────────────────────────────

export function Receive() {
  const [chain, setChain] = useState('bitcoin-mainnet');
  const [addressIndex, setAddressIndex] = useState(0);
  const [copied, setCopied] = useState(false);

  const selectedChain = CHAINS.find((c) => c.id === chain)!;
  const addresses = MOCK_ADDRESSES[chain] ?? [];
  const currentAddress = addresses[addressIndex] ?? 'No address available';
  const isBitcoin = selectedChain.family === 'bitcoin';

  function handleCopy() {
    navigator.clipboard.writeText(currentAddress).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function generateNewAddress() {
    if (addressIndex < addresses.length - 1) {
      setAddressIndex((prev) => prev + 1);
    }
  }

  function handleChainChange(newChain: string) {
    setChain(newChain);
    setAddressIndex(0);
  }

  return (
    <div className="min-h-screen dark">
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-light tracking-wide mb-6 text-white/90">Receive</h1>

        {/* Chain Selector */}
        <div className="mb-6">
          <label className="text-xs font-light tracking-wider text-white/30 mb-2 block uppercase">Network</label>
          <div className="flex flex-wrap gap-2">
            {CHAINS.map((c) => (
              <button
                key={c.id}
                onClick={() => handleChainChange(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 ${
                  chain === c.id
                    ? `bg-gradient-to-r ${c.color} text-white border-transparent shadow-lg`
                    : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* QR Code & Address */}
        <div className="glass-card p-10 text-center space-y-8 animate-pulse-glow">
          <div className="inline-block p-5 bg-white rounded-2xl shadow-lg shadow-purple-500/10">
            <QRPlaceholder value={currentAddress} />
          </div>

          <div>
            <p className="text-xs font-light tracking-wider text-white/30 mb-3 uppercase">Your {selectedChain.name} Address</p>
            <div className="glass-card p-5 gradient-border">
              <p className="text-sm font-mono text-white/70 break-all leading-relaxed tracking-wide">{currentAddress}</p>
            </div>
          </div>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            className={`transition-all duration-300 ${
              copied
                ? 'inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                : 'btn-bevel px-8 py-2.5'
            }`}
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                </svg>
                Copy Address
              </>
            )}
          </button>

          {/* Generate New Address (BTC only) */}
          {isBitcoin && (
            <div className="pt-2">
              <button
                onClick={generateNewAddress}
                disabled={addressIndex >= addresses.length - 1}
                className="btn-bevel-outline py-2 px-5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182" />
                </svg>
                Generate New Address (HD Rotation)
              </button>
            </div>
          )}
        </div>

        {/* BTC Address Reuse Warning */}
        {isBitcoin && (
          <div className="mt-4 flex items-start gap-3 p-5 rounded-xl glass-card border-l-2 border-l-amber-500">
            <svg className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <div>
              <p className="text-sm font-light text-amber-400 tracking-wide">Avoid Address Reuse</p>
              <p className="text-xs font-light text-white/30 mt-1 tracking-wide">
                For better privacy, generate a new Bitcoin address for each transaction.
                Reusing addresses makes it easier to track your transaction history.
              </p>
            </div>
          </div>
        )}

        {/* Address History (BTC) */}
        {isBitcoin && addressIndex > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-light tracking-wider text-white/40 mb-3 uppercase">Recent Addresses</h3>
            <div className="space-y-2">
              {addresses.slice(0, addressIndex + 1).reverse().map((addr, i) => (
                <div
                  key={addr}
                  className={`glass-card p-3 flex items-center justify-between ${i === 0 ? 'gradient-border' : ''}`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    {i === 0 && (
                      <span className="section-badge text-[10px] py-0 px-1.5">
                        CURRENT
                      </span>
                    )}
                    <span className="text-xs font-mono text-white/40 truncate">{addr}</span>
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(addr).catch(() => {});
                    }}
                    className="text-white/20 hover:text-white/60 transition-colors shrink-0 ml-2"
                    title="Copy"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 0 1-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 0 1 1.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 0 0-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 0 1-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H9.75" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
