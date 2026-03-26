import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyLevel } from '@gravytos/types';
import { PrivacySlider } from '@gravytos/ui';
import { usePrivacyStore } from '@gravytos/state';
import { useERC20Approval } from '../hooks/useERC20Approval';
import { useAccount } from 'wagmi';
import { getTokenAddress } from '@gravytos/config';

// ─── Chain & Token Definitions ───────────────────────────────

const CHAINS = [
  { id: 'ethereum-1', name: 'Ethereum', symbol: 'ETH', color: 'from-blue-500 to-blue-600', textColor: 'text-blue-400', borderColor: 'border-l-blue-500' },
  { id: 'polygon-137', name: 'Polygon', symbol: 'MATIC', color: 'from-violet-500 to-violet-600', textColor: 'text-violet-400', borderColor: 'border-l-violet-500' },
  { id: 'arbitrum-42161', name: 'Arbitrum', symbol: 'ETH', color: 'from-sky-500 to-sky-600', textColor: 'text-sky-400', borderColor: 'border-l-sky-500' },
  { id: 'base-8453', name: 'Base', symbol: 'ETH', color: 'from-blue-500 to-blue-700', textColor: 'text-blue-300', borderColor: 'border-l-blue-400' },
  { id: 'optimism-10', name: 'Optimism', symbol: 'ETH', color: 'from-red-500 to-red-600', textColor: 'text-red-400', borderColor: 'border-l-red-500' },
  { id: 'solana-mainnet', name: 'Solana', symbol: 'SOL', color: 'from-purple-500 to-purple-600', textColor: 'text-purple-400', borderColor: 'border-l-purple-500' },
  { id: 'bitcoin-mainnet', name: 'Bitcoin', symbol: 'BTC', color: 'from-orange-500 to-orange-600', textColor: 'text-orange-400', borderColor: 'border-l-orange-500' },
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
    <header className="border-b border-white/5 bg-[hsl(220,30%,6%)]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
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

// ─── Main Bridge Page ────────────────────────────────────────

export function Bridge() {
  const { globalLevel } = usePrivacyStore();
  const { address: _walletAddress } = useAccount();

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
  const [bridgePhase, setBridgePhase] = useState<'quote' | 'approve' | 'bridge' | 'tracking'>('quote');
  const [trackingProgress, setTrackingProgress] = useState(0);

  // Determine if the token is native (no approval needed for bridging)
  const NATIVE_SYMBOLS = ['ETH', 'MATIC', 'SOL', 'BTC'];
  const isNativeToken = NATIVE_SYMBOLS.includes(token);

  // ERC20 approval hook for non-native tokens
  const evmChainId = sourceChain.includes('ethereum') ? 1
    : sourceChain.includes('polygon') ? 137
    : sourceChain.includes('arbitrum') ? 42161
    : sourceChain.includes('base') ? 8453
    : sourceChain.includes('optimism') ? 10 : 1;
  const tokenAddress = !isNativeToken ? getTokenAddress(evmChainId, token) : undefined;
  const { needsApproval, requestApproval, isApproving } = useERC20Approval(tokenAddress);

  const sourceChainInfo = CHAINS.find((c) => c.id === sourceChain)!;
  const destChainInfo = CHAINS.find((c) => c.id === destChain)!;
  const tokens = BRIDGE_TOKENS[sourceChain] ?? [];
  const destTokens = BRIDGE_TOKENS[destChain] ?? [];
  const commonTokens = tokens.filter((t) => destTokens.includes(t));

  const outputAmount = useMemo(() => {
    if (!amount || Number(amount) <= 0) return '0.00';
    const input = Number(amount);
    return (input * 0.99).toFixed(6);
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
    setBridgePhase('quote');
    setLoading(false);
  }

  function handleApprove() {
    if (isNativeToken) {
      setBridgePhase('bridge');
      return;
    }
    const decimals = ['USDC', 'USDT'].includes(token) ? 6 : 18;
    if (needsApproval(amount, decimals)) {
      setBridgePhase('approve');
      requestApproval();
    } else {
      setBridgePhase('bridge');
    }
  }

  async function handleBridge() {
    if (!hasQuote) return;

    // If non-native and not yet approved, trigger approval first
    if (!isNativeToken && bridgePhase === 'quote') {
      handleApprove();
      return;
    }

    setBridging(true);
    const steps: BridgeStep[] = isNativeToken
      ? ['sending', 'bridging', 'confirming']
      : ['approving', 'sending', 'bridging', 'confirming'];
    for (const step of steps) {
      setBridgeStep(step);
      const delay = step === 'bridging' ? 1500 : 800;
      await new Promise((r) => setTimeout(r, delay + Math.random() * 500));
    }
    setBridgeStep('done');
    const hash = '0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    setTxHash(hash);
    setBridging(false);

    // Start tracking progress simulation
    setBridgePhase('tracking');
    setTrackingProgress(0);
    const interval = setInterval(() => {
      setTrackingProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 5;
      });
    }, 800);
  }

  function resetForm() {
    setAmount('');
    setHasQuote(false);
    setTxHash(null);
    setBridgeStep(null);
    setBridging(false);
    setBridgePhase('quote');
    setTrackingProgress(0);
  }

  return (
    <div className="min-h-screen dark">
      <Navbar />

      <main className="max-w-md md:max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
        <h1 className="text-xl md:text-2xl font-light tracking-wide mb-4 md:mb-6 text-white/90">Bridge</h1>

        {/* Success State */}
        {txHash ? (
          <div className="glass-card p-10 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse-glow">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-light tracking-wide text-emerald-400">Bridge Initiated</h2>
            <p className="text-sm font-light text-white/40">
              Bridging {amount} {token} from {sourceChainInfo.name} to {destChainInfo.name}
            </p>
            <div className="section-badge mx-auto">{estimatedTime} estimated</div>

            {/* Tracking Progress */}
            {bridgePhase === 'tracking' && trackingProgress < 100 && (
              <div className="glass-card p-4 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-light text-white/40">Bridge progress</span>
                  <span className="font-mono text-purple-400">{trackingProgress}%</span>
                </div>
                <div className="w-full bg-white/5 rounded-full h-1.5">
                  <div
                    className="h-1.5 rounded-full bg-gradient-to-r from-purple-500 to-blue-500 transition-all duration-700"
                    style={{ width: `${trackingProgress}%` }}
                  />
                </div>
                <p className="text-[10px] font-light text-white/25">Waiting for destination chain confirmation...</p>
              </div>
            )}

            {trackingProgress >= 100 && (
              <div className="text-xs font-light text-emerald-400 flex items-center justify-center gap-1">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
                Confirmed on destination chain
              </div>
            )}

            <div className="glass-card p-4">
              <p className="text-xs font-light text-white/30 mb-1">Transaction Hash</p>
              <p className="text-sm font-mono text-white/60 break-all">{txHash}</p>
            </div>
            <button onClick={resetForm} className="btn-bevel w-full py-3">
              Bridge Again
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Source Chain */}
            <div className={`glass-card p-4 md:p-6 space-y-3 border-l-2 ${sourceChainInfo.borderColor}`}>
              <label className="text-xs font-light tracking-wider text-white/30 uppercase">From Network</label>
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
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 ${
                      sourceChain === c.id
                        ? `bg-gradient-to-r ${c.color} text-white border-transparent shadow-lg`
                        : c.id === destChain
                          ? 'bg-white/[0.02] text-white/15 border-white/5 cursor-not-allowed'
                          : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
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
                className="w-11 h-11 rounded-full bg-[hsl(220,28%,12%)] border border-white/10 hover:border-purple-500/30 flex items-center justify-center text-white/40 hover:text-purple-400 transition-all duration-300 hover:rotate-180 hover:shadow-lg hover:shadow-purple-500/10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                </svg>
              </button>
            </div>

            {/* Destination Chain */}
            <div className={`glass-card p-4 md:p-6 space-y-3 border-l-2 ${destChainInfo.borderColor}`}>
              <label className="text-xs font-light tracking-wider text-white/30 uppercase">To Network</label>
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
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 ${
                      destChain === c.id
                        ? `bg-gradient-to-r ${c.color} text-white border-transparent shadow-lg`
                        : c.id === sourceChain
                          ? 'bg-white/[0.02] text-white/15 border-white/5 cursor-not-allowed'
                          : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Token & Amount */}
            <div className="glass-card p-4 md:p-6 space-y-5">
              <div>
                <label className="text-xs font-light tracking-wider text-white/30 mb-2 block uppercase">Token</label>
                <div className="flex gap-2 flex-wrap">
                  {commonTokens.map((t) => (
                    <button
                      key={t}
                      onClick={() => { setToken(t); setHasQuote(false); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-300 ${
                        token === t
                          ? 'bg-white/10 text-white border-white/20'
                          : 'bg-white/5 text-white/40 border-white/5 hover:border-white/15'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                  {commonTokens.length === 0 && (
                    <p className="text-xs font-light text-white/30">No common tokens between these chains</p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-light tracking-wider text-white/30 mb-2 block uppercase">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setHasQuote(false); }}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-24 min-h-12 text-sm font-mono text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all duration-300"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => setAmount('0.1')}
                      className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                    >
                      MAX
                    </button>
                    <span className="text-xs text-white/30 font-medium">{token}</span>
                  </div>
                </div>
              </div>

              {/* Custom Recipient */}
              <div>
                <button
                  onClick={() => setShowRecipient(!showRecipient)}
                  className="text-xs font-light text-purple-400 hover:text-purple-300 transition-colors"
                >
                  {showRecipient ? 'Use same address' : 'Send to different address'}
                </button>
                {showRecipient && (
                  <input
                    type="text"
                    value={recipientOverride}
                    onChange={(e) => setRecipientOverride(e.target.value)}
                    placeholder="Recipient address on destination chain"
                    className="mt-2 w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 min-h-12 text-sm font-mono text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
                  />
                )}
              </div>
            </div>

            {/* Privacy Slider */}
            <div className="glass-card p-4 md:p-6 gradient-border relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.02] gradient-hero" />
              <div className="relative z-10">
                <PrivacySlider value={privacyLevel} onChange={setPrivacyLevel} chainId={sourceChain} />
              </div>
            </div>

            {/* Quote Display */}
            {hasQuote && (
              <div className="glass-card p-6 space-y-3 gradient-border">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-light tracking-wide text-white/80">Bridge Quote</h3>
                  <div className="section-badge text-[10px]">{estimatedTime}</div>
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="font-light text-white/30">You send</span>
                    <span className="text-white/70 font-mono">{amount} {token} on {sourceChainInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-white/30">You receive</span>
                    <span className="text-white/70 font-mono">{outputAmount} {token} on {destChainInfo.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-white/30">Bridge fee</span>
                    <span className="text-white/50">1.0%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="font-light text-white/30">Privacy</span>
                    <span className={`font-medium ${
                      privacyLevel === PrivacyLevel.High ? 'text-purple-400' : privacyLevel === PrivacyLevel.Medium ? 'text-amber-400' : 'text-emerald-400'
                    }`}>
                      {privacyLevel.charAt(0).toUpperCase() + privacyLevel.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Bridge Progress */}
            {bridging && bridgeStep && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between">
                  {BRIDGE_STEPS.map((step, i) => {
                    const currentIdx = getStepIndex(bridgeStep);
                    const isDone = i < currentIdx;
                    const isActive = i === currentIdx;
                    return (
                      <div key={step.key} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${
                          isDone ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                          isActive ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30 animate-pulse shadow-lg shadow-purple-500/20' :
                          'bg-white/5 text-white/20 border border-white/10'
                        }`}>
                          {isDone ? (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          ) : i + 1}
                        </div>
                        <span className={`text-[10px] font-light tracking-wide hidden sm:block ${
                          isDone ? 'text-emerald-400' : isActive ? 'text-purple-400' : 'text-white/20'
                        }`}>{step.label}</span>
                        {i < BRIDGE_STEPS.length - 1 && <div className={`w-4 h-px transition-colors duration-500 ${isDone ? 'bg-emerald-500/30' : 'bg-white/10'}`} />}
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
                className={`w-full py-3.5 rounded-lg font-medium text-sm transition-all duration-300 ${
                  amount && Number(amount) > 0 && commonTokens.length > 0
                    ? 'btn-bevel'
                    : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
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
              <div className="space-y-3">
                {/* Approval Button (for non-native tokens) */}
                {!isNativeToken && bridgePhase === 'quote' && (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="btn-bevel w-full py-3.5 disabled:opacity-60"
                  >
                    {isApproving ? `Approving ${token}...` : `Approve ${token}`}
                  </button>
                )}

                {/* Bridge Button */}
                {(isNativeToken || bridgePhase === 'bridge') && (
                  <button
                    onClick={handleBridge}
                    disabled={bridging}
                    className="btn-bevel w-full py-3.5 disabled:opacity-60"
                  >
                    {bridging ? 'Bridging...' : `Bridge ${amount} ${token}`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
