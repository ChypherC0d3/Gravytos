import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyLevel } from '@gravytos/types';
import { PrivacySlider } from '@gravytos/ui';
import { usePrivacyStore } from '@gravytos/state';

// ─── Chain & Token Definitions ───────────────────────────────

const CHAINS = [
  { id: 'ethereum-1', name: 'Ethereum', symbol: 'ETH' },
  { id: 'polygon-137', name: 'Polygon', symbol: 'MATIC' },
  { id: 'arbitrum-42161', name: 'Arbitrum', symbol: 'ETH' },
  { id: 'base-8453', name: 'Base', symbol: 'ETH' },
  { id: 'optimism-10', name: 'Optimism', symbol: 'ETH' },
  { id: 'solana-mainnet', name: 'Solana', symbol: 'SOL' },
];

const TOKENS_BY_CHAIN: Record<string, string[]> = {
  'ethereum-1': ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC', 'LINK', 'UNI'],
  'polygon-137': ['MATIC', 'USDC', 'USDT', 'WETH', 'AAVE'],
  'arbitrum-42161': ['ETH', 'USDC', 'USDT', 'ARB', 'GMX'],
  'base-8453': ['ETH', 'USDC', 'USDT', 'AERO'],
  'optimism-10': ['ETH', 'USDC', 'USDT', 'OP', 'SNX'],
  'solana-mainnet': ['SOL', 'USDC', 'USDT', 'RAY', 'JUP', 'BONK'],
};

interface MockQuote {
  provider: string;
  outputAmount: string;
  estimatedGas: string;
  priceImpact: number;
  platformFee: string;
}

// ─── Tx Progress Steps ───────────────────────────────────────

type SwapStep = 'approving' | 'swapping' | 'confirming' | 'done';

const SWAP_STEPS: { key: SwapStep; label: string }[] = [
  { key: 'approving', label: 'Approving' },
  { key: 'swapping', label: 'Swapping' },
  { key: 'confirming', label: 'Confirming' },
];

function getStepIndex(step: SwapStep): number {
  if (step === 'done') return SWAP_STEPS.length;
  return SWAP_STEPS.findIndex((s) => s.key === step);
}

// ─── Navbar ──────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gravytos-500 to-purple-600 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <span className="text-lg font-bold">Gravytos</span>
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
            <Link key={link.to} to={link.to} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50 transition-colors">{link.label}</Link>
          ))}
        </nav>
        <span className="text-xs text-zinc-500 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50">Testnet</span>
      </div>
    </header>
  );
}

// ─── Main Swap Page ──────────────────────────────────────────

export function Swap() {
  const { globalLevel } = usePrivacyStore();

  const [fromChain, setFromChain] = useState('ethereum-1');
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [customSlippage, setCustomSlippage] = useState('');
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(globalLevel);
  const [quotes, setQuotes] = useState<MockQuote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapStep, setSwapStep] = useState<SwapStep | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const tokens = TOKENS_BY_CHAIN[fromChain] ?? [];
  const effectiveSlippage = customSlippage ? Number(customSlippage) : slippage;

  function handleChainChange(newChain: string) {
    setFromChain(newChain);
    const newTokens = TOKENS_BY_CHAIN[newChain] ?? [];
    setFromToken(newTokens[0] ?? 'ETH');
    setToToken(newTokens[1] ?? 'USDC');
    setQuotes([]);
  }

  function flipTokens() {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setQuotes([]);
  }

  async function getQuote() {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    setQuotes([]);

    await new Promise((r) => setTimeout(r, 1000 + Math.random() * 500));

    const inputNum = Number(amount);
    const mockQuotes: MockQuote[] = [
      {
        provider: 'Uniswap V3',
        outputAmount: (inputNum * 2415.5 * 0.997).toFixed(2),
        estimatedGas: '0.0023',
        priceImpact: 0.05,
        platformFee: (inputNum * 0.003).toFixed(6),
      },
      {
        provider: '1inch',
        outputAmount: (inputNum * 2413.8 * 0.997).toFixed(2),
        estimatedGas: '0.0019',
        priceImpact: 0.08,
        platformFee: (inputNum * 0.003).toFixed(6),
      },
      {
        provider: 'SushiSwap',
        outputAmount: (inputNum * 2410.2 * 0.997).toFixed(2),
        estimatedGas: '0.0025',
        priceImpact: 0.12,
        platformFee: (inputNum * 0.003).toFixed(6),
      },
    ];

    setQuotes(mockQuotes);
    setSelectedQuote(0);
    setLoading(false);
  }

  async function handleSwap() {
    if (quotes.length === 0) return;
    setSwapping(true);
    const steps: SwapStep[] = ['approving', 'swapping', 'confirming'];
    for (const step of steps) {
      setSwapStep(step);
      await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));
    }
    setSwapStep('done');
    setTxHash('0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
    setSwapping(false);
  }

  function resetForm() {
    setAmount('');
    setQuotes([]);
    setTxHash(null);
    setSwapStep(null);
    setSwapping(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Swap</h1>

        {/* Success State */}
        {txHash ? (
          <div className="glass-card p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-400">Swap Complete</h2>
            <p className="text-sm text-zinc-400">
              Swapped {amount} {fromToken} for {quotes[selectedQuote]?.outputAmount} {toToken}
            </p>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Transaction Hash</p>
              <p className="text-sm font-mono text-zinc-300 break-all">{txHash}</p>
            </div>
            <button onClick={resetForm} className="w-full mt-4 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all">
              Swap Again
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chain Selector */}
            <div>
              <label className="text-xs text-zinc-500 mb-2 block">Network</label>
              <div className="flex flex-wrap gap-2">
                {CHAINS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleChainChange(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      fromChain === c.id
                        ? 'bg-purple-600 text-white border-transparent'
                        : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* From Token */}
            <div className="glass-card p-5 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs text-zinc-500">From</label>
                <span className="text-xs text-zinc-600">Balance: 0.0100 {fromToken}</span>
              </div>
              <div className="flex gap-3">
                <select
                  value={fromToken}
                  onChange={(e) => { setFromToken(e.target.value); setQuotes([]); }}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500/50"
                >
                  {tokens.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setQuotes([]); }}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2.5 pr-16 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                  <button
                    onClick={() => setAmount('0.01')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold text-purple-400 hover:text-purple-300 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                  >
                    MAX
                  </button>
                </div>
              </div>
            </div>

            {/* Flip Button */}
            <div className="flex justify-center -my-3 relative z-10">
              <button
                onClick={flipTokens}
                className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-400 hover:text-white transition-all hover:rotate-180 duration-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                </svg>
              </button>
            </div>

            {/* To Token */}
            <div className="glass-card p-5 space-y-3">
              <label className="text-xs text-zinc-500">To</label>
              <div className="flex gap-3">
                <select
                  value={toToken}
                  onChange={(e) => { setToToken(e.target.value); setQuotes([]); }}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-200 focus:outline-none focus:border-purple-500/50"
                >
                  {tokens.filter((t) => t !== fromToken).map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
                <div className="flex-1 bg-zinc-800/30 border border-zinc-700/50 rounded-lg px-4 py-2.5 text-sm font-mono text-zinc-400">
                  {quotes.length > 0 ? quotes[selectedQuote].outputAmount : '0.00'}
                </div>
              </div>
            </div>

            {/* Slippage Settings */}
            <div className="glass-card p-5 space-y-3">
              <button
                onClick={() => setShowSlippageSettings(!showSlippageSettings)}
                className="flex items-center justify-between w-full"
              >
                <span className="text-xs text-zinc-500">Slippage Tolerance</span>
                <span className="text-xs text-zinc-300">{effectiveSlippage}%</span>
              </button>
              {showSlippageSettings && (
                <div className="flex items-center gap-2">
                  {[0.1, 0.5, 1].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSlippage(s); setCustomSlippage(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        slippage === s && !customSlippage
                          ? 'bg-zinc-700 text-white border-zinc-600'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {s}%
                    </button>
                  ))}
                  <input
                    type="number"
                    value={customSlippage}
                    onChange={(e) => setCustomSlippage(e.target.value)}
                    placeholder="Custom"
                    min="0.01"
                    max="50"
                    step="0.1"
                    className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
              )}
            </div>

            {/* Privacy Slider */}
            <div className="glass-card p-5">
              <PrivacySlider value={privacyLevel} onChange={setPrivacyLevel} chainId={fromChain} />
            </div>

            {/* Platform Fee Notice */}
            <div className="flex items-center justify-between px-1 text-xs text-zinc-500">
              <span>Platform fee</span>
              <span>0.3%</span>
            </div>

            {/* Get Quote / Route Comparison */}
            {quotes.length === 0 ? (
              <button
                onClick={getQuote}
                disabled={!amount || Number(amount) <= 0 || loading}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  amount && Number(amount) > 0
                    ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-600/20'
                    : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                }`}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Finding best route...
                  </span>
                ) : 'Get Quote'}
              </button>
            ) : (
              <div className="space-y-4">
                {/* Route Comparison */}
                <div>
                  <h3 className="text-xs text-zinc-500 mb-2">Routes</h3>
                  <div className="space-y-2">
                    {quotes.map((q, i) => (
                      <button
                        key={q.provider}
                        onClick={() => setSelectedQuote(i)}
                        className={`w-full p-4 rounded-xl border text-left transition-all ${
                          selectedQuote === i
                            ? 'bg-purple-500/5 border-purple-500/30'
                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-zinc-200">{q.provider}</span>
                          {i === 0 && (
                            <span className="text-[10px] font-semibold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                              BEST
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-zinc-500">Output</p>
                            <p className="text-zinc-200 font-mono">{q.outputAmount} {toToken}</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Gas</p>
                            <p className="text-zinc-200 font-mono">{q.estimatedGas} ETH</p>
                          </div>
                          <div>
                            <p className="text-zinc-500">Impact</p>
                            <p className={`font-mono ${q.priceImpact > 1 ? 'text-red-400' : 'text-zinc-200'}`}>
                              {q.priceImpact}%
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Swap Progress */}
                {swapping && swapStep && (
                  <div className="glass-card p-5">
                    <div className="flex items-center justify-between">
                      {SWAP_STEPS.map((step, i) => {
                        const currentIdx = getStepIndex(swapStep);
                        const isDone = i < currentIdx;
                        const isActive = i === currentIdx;
                        return (
                          <div key={step.key} className="flex items-center gap-2">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                              isDone ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              isActive ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse' :
                              'bg-zinc-800 text-zinc-600 border border-zinc-700'
                            }`}>
                              {isDone ? (
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              ) : i + 1}
                            </div>
                            <span className={`text-[10px] font-medium hidden sm:block ${
                              isDone ? 'text-green-400' : isActive ? 'text-purple-400' : 'text-zinc-600'
                            }`}>{step.label}</span>
                            {i < SWAP_STEPS.length - 1 && <div className={`w-8 h-px ${isDone ? 'bg-green-500/30' : 'bg-zinc-700'}`} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Swap Button */}
                <button
                  onClick={handleSwap}
                  disabled={swapping}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-60"
                >
                  {swapping ? 'Swapping...' : `Swap ${amount} ${fromToken} for ${toToken}`}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
