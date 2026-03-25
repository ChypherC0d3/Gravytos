import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyLevel } from '@gravytos/types';
import { PrivacySlider } from '@gravytos/ui';
import { usePrivacyStore } from '@gravytos/state';

// ─── Chain & Token Definitions ───────────────────────────────

const CHAINS = [
  { id: 'ethereum-1', name: 'Ethereum', symbol: 'ETH', color: 'bg-blue-500', textColor: 'text-blue-400' },
  { id: 'polygon-137', name: 'Polygon', symbol: 'MATIC', color: 'bg-violet-500', textColor: 'text-violet-400' },
  { id: 'arbitrum-42161', name: 'Arbitrum', symbol: 'ETH', color: 'bg-sky-500', textColor: 'text-sky-400' },
  { id: 'base-8453', name: 'Base', symbol: 'ETH', color: 'bg-blue-600', textColor: 'text-blue-300' },
  { id: 'optimism-10', name: 'Optimism', symbol: 'ETH', color: 'bg-red-500', textColor: 'text-red-400' },
  { id: 'solana-mainnet', name: 'Solana', symbol: 'SOL', color: 'bg-purple-500', textColor: 'text-purple-400' },
  { id: 'bitcoin-mainnet', name: 'Bitcoin', symbol: 'BTC', color: 'bg-orange-500', textColor: 'text-orange-400' },
];

const BRIDGE_TOKENS: Record<string, string[]> = {
  'ethereum-1': ['ETH', 'USDC', 'USDT', 'WBTC'],
  'polygon-137': ['MATIC', 'USDC', 'USDT', 'WETH'],
  'arbitrum-42161': ['ETH', 'USDC', 'USDT', 'ARB'],
  'base-8453': ['ETH', 'USDC', 'USDT'],
  'optimism-10': ['ETH', 'USDC', 'USDT', 'OP'],
  'solana-mainnet': ['SOL', 'USDC', 'USDT'],
  'bitcoin-mainnet': ['BTC'],
};

// ─── Bridge Progress Steps ───────────────────────────────────

type BridgeStep = 'approving' | 'sending' | 'bridging' | 'confirming' | 'done';

const BRIDGE_STEPS: { key: BridgeStep; label: string }[] = [
  { key: 'approving', label: 'Approving' },
  { key: 'sending', label: 'Sending' },
  { key: 'bridging', label: 'Bridging' },
  { key: 'confirming', label: 'Confirming' },
];

function getStepIndex(step: BridgeStep): number {
  if (step === 'done') return BRIDGE_STEPS.length;
  return BRIDGE_STEPS.findIndex((s) => s.key === step);
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

// ─── Main Bridge Page ────────────────────────────────────────

export function Bridge() {
  const { globalLevel } = usePrivacyStore();

  const [sourceChain, setSourceChain] = useState('ethereum-1');
  const [destChain, setDestChain] = useState('arbitrum-42161');
  const [token, setToken] = useState('ETH');
  const [amount, setAmount] = useState('');
  const [recipientOverride, setRecipientOverride] = useState('');
  const [showRecipient, setShowRecipient] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(globalLevel);
  const [hasQuote, setHasQuote] = useState(false);
  const [loading, setLoading] = useState(false);
  const [bridging, setBridging] = useState(false);
  const [bridgeStep, setBridgeStep] = useState<BridgeStep | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const sourceChainInfo = CHAINS.find((c) => c.id === sourceChain)!;
  const destChainInfo = CHAINS.find((c) => c.id === destChain)!;
  const tokens = BRIDGE_TOKENS[sourceChain] ?? [];
  const destTokens = BRIDGE_TOKENS[destChain] ?? [];
  const commonTokens = tokens.filter((t) => destTokens.includes(t));

  const outputAmount = useMemo(() => {
    if (!amount || Number(amount) <= 0) return '0.00';
    const input = Number(amount);
    return (input * 0.99).toFixed(6); // 1% bridge fee
  }, [amount]);

  const estimatedTime = useMemo(() => {
    if (sourceChain.includes('bitcoin') || destChain.includes('bitcoin')) return '~30 min';
    if (sourceChain.includes('solana') || destChain.includes('solana')) return '~5 min';
    return '~15 min';
  }, [sourceChain, destChain]);

  function swapChains() {
    const temp = sourceChain;
    setSourceChain(destChain);
    setDestChain(temp);
    const newTokens = BRIDGE_TOKENS[destChain] ?? [];
    const newCommon = newTokens.filter((t) => (BRIDGE_TOKENS[temp] ?? []).includes(t));
    if (!newCommon.includes(token) && newCommon.length > 0) {
      setToken(newCommon[0]);
    }
    setHasQuote(false);
  }

  async function getQuote() {
    if (!amount || Number(amount) <= 0) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 1200 + Math.random() * 600));
    setHasQuote(true);
    setLoading(false);
  }

  async function handleBridge() {
    if (!hasQuote) return;
    setBridging(true);
    const steps: BridgeStep[] = ['approving', 'sending', 'bridging', 'confirming'];
    for (const step of steps) {
      setBridgeStep(step);
      const delay = step === 'bridging' ? 1500 : 800;
      await new Promise((r) => setTimeout(r, delay + Math.random() * 500));
    }
    setBridgeStep('done');
    setTxHash('0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
    setBridging(false);
  }

  function resetForm() {
    setAmount('');
    setHasQuote(false);
    setTxHash(null);
    setBridgeStep(null);
    setBridging(false);
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Bridge</h1>

        {/* Success State */}
        {txHash ? (
          <div className="glass-card p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-400">Bridge Initiated</h2>
            <p className="text-sm text-zinc-400">
              Bridging {amount} {token} from {sourceChainInfo.name} to {destChainInfo.name}
            </p>
            <p className="text-xs text-zinc-500">Estimated arrival: {estimatedTime}</p>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Transaction Hash</p>
              <p className="text-sm font-mono text-zinc-300 break-all">{txHash}</p>
            </div>
            <button onClick={resetForm} className="w-full mt-4 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all">
              Bridge Again
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Source Chain */}
            <div className="glass-card p-5 space-y-3">
              <label className="text-xs text-zinc-500">From Network</label>
              <div className="flex flex-wrap gap-2">
                {CHAINS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (c.id === destChain) return;
                      setSourceChain(c.id);
                      const newTokens = BRIDGE_TOKENS[c.id] ?? [];
                      const newCommon = newTokens.filter((t) => (BRIDGE_TOKENS[destChain] ?? []).includes(t));
                      if (!newCommon.includes(token) && newCommon.length > 0) setToken(newCommon[0]);
                      setHasQuote(false);
                    }}
                    disabled={c.id === destChain}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      sourceChain === c.id
                        ? `${c.color} text-white border-transparent`
                        : c.id === destChain
                          ? 'bg-zinc-900/30 text-zinc-600 border-zinc-800 cursor-not-allowed'
                          : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Swap Chains Button */}
            <div className="flex justify-center -my-3 relative z-10">
              <button
                onClick={swapChains}
                className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700 hover:border-zinc-500 flex items-center justify-center text-zinc-400 hover:text-white transition-all hover:rotate-180 duration-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                </svg>
              </button>
            </div>

            {/* Destination Chain */}
            <div className="glass-card p-5 space-y-3">
              <label className="text-xs text-zinc-500">To Network</label>
              <div className="flex flex-wrap gap-2">
                {CHAINS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      if (c.id === sourceChain) return;
                      setDestChain(c.id);
                      const newTokens = BRIDGE_TOKENS[c.id] ?? [];
                      const srcTokens = BRIDGE_TOKENS[sourceChain] ?? [];
                      const newCommon = srcTokens.filter((t) => newTokens.includes(t));
                      if (!newCommon.includes(token) && newCommon.length > 0) setToken(newCommon[0]);
                      setHasQuote(false);
                    }}
                    disabled={c.id === sourceChain}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      destChain === c.id
                        ? `${c.color} text-white border-transparent`
                        : c.id === sourceChain
                          ? 'bg-zinc-900/30 text-zinc-600 border-zinc-800 cursor-not-allowed'
                          : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Token & Amount */}
            <div className="glass-card p-5 space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Token</label>
                <div className="flex gap-2 flex-wrap">
                  {commonTokens.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setToken(t); setHasQuote(false); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        token === t
                          ? 'bg-zinc-700 text-white border-zinc-600'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  {commonTokens.length === 0 && (
                    <p className="text-xs text-zinc-500">No common tokens between these chains</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setHasQuote(false); }}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 pr-24 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => setAmount('0.1')}
                      className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                    >
                      MAX
                    </button>
                    <span className="text-xs text-zinc-500 font-medium">{token}</span>
                  </div>
                </div>
              </div>

              {/* Custom Recipient */}
              <div>
                <button
                  onClick={() => setShowRecipient(!showRecipient)}
                  className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {showRecipient ? 'Use same address' : 'Send to different address'}
                </button>
                {showRecipient && (
                  <input
                    type="text"
                    value={recipientOverride}
                    onChange={(e) => setRecipientOverride(e.target.value)}
                    placeholder="Recipient address on destination chain"
                    className="mt-2 w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 transition-all"
                  />
                )}
              </div>
            </div>

            {/* Privacy Slider */}
            <div className="glass-card p-5">
              <PrivacySlider value={privacyLevel} onChange={setPrivacyLevel} chainId={sourceChain} />
            </div>

            {/* Quote Display */}
            {hasQuote && (
              <div className="glass-card p-5 space-y-3 border-purple-500/20">
                <h3 className="text-sm font-semibold text-zinc-200">Bridge Quote</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">You send</span>
                    <span className="text-zinc-200 font-mono">{amount} {token} on {sourceChainInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">You receive</span>
                    <span className="text-zinc-200 font-mono">{outputAmount} {token} on {destChainInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Bridge fee</span>
                    <span className="text-zinc-300">1.0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Estimated time</span>
                    <span className="text-zinc-300">{estimatedTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Privacy</span>
                    <span className={`font-medium ${
                      privacyLevel === PrivacyLevel.High ? 'text-purple-400' : privacyLevel === PrivacyLevel.Medium ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {privacyLevel.charAt(0).toUpperCase() + privacyLevel.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bridge Progress */}
            {bridging && bridgeStep && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between">
                  {BRIDGE_STEPS.map((step, i) => {
                    const currentIdx = getStepIndex(bridgeStep);
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
                        {i < BRIDGE_STEPS.length - 1 && <div className={`w-4 h-px ${isDone ? 'bg-green-500/30' : 'bg-zinc-700'}`} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            {!hasQuote ? (
              <button
                onClick={getQuote}
                disabled={!amount || Number(amount) <= 0 || loading || commonTokens.length === 0}
                className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                  amount && Number(amount) > 0 && commonTokens.length > 0
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
                    Getting quote...
                  </span>
                ) : 'Get Bridge Quote'}
              </button>
            ) : (
              <button
                onClick={handleBridge}
                disabled={bridging}
                className="w-full py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-600/20 transition-all disabled:opacity-60"
              >
                {bridging ? 'Bridging...' : `Bridge ${amount} ${token}`}
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
