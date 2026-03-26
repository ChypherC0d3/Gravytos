import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyLevel } from '@gravytos/types';
import { PrivacySlider } from '@gravytos/ui';
import { usePrivacyStore } from '@gravytos/state';
import { useERC20Approval } from '../hooks/useERC20Approval';
import { useTransactionEngine } from '../hooks/useTransactionEngine';
import { useAccount, useSendTransaction } from 'wagmi';
import { getTokenAddress, NATIVE_TOKEN_ADDRESS } from '@gravytos/config';
import { TokenPicker } from '../components/TokenPicker';
import type { Token } from '../components/TokenPicker';
import type { SwapQuote } from '@gravytos/types';

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

// ─── Main Swap Page ──────────────────────────────────────────

export function Swap() {
  const { globalLevel } = usePrivacyStore();
  const { address: walletAddress } = useAccount();
  const { sendTransactionAsync } = useSendTransaction();
  const { getSwapQuote, executeSwap } = useTransactionEngine();

  const [fromChain, setFromChain] = useState('ethereum-1');
  const [fromToken, setFromToken] = useState('ETH');
  const [toToken, setToToken] = useState('USDC');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(0.5);
  const [customSlippage, setCustomSlippage] = useState('');
  const [showSlippageSettings, setShowSlippageSettings] = useState(false);
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(globalLevel);
  const [quote, setQuote] = useState<SwapQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [swapStep, setSwapStep] = useState<SwapStep | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [swapPhase, setSwapPhase] = useState<'quote' | 'approve' | 'swap' | 'done'>('quote');
  const [showFromTokenPicker, setShowFromTokenPicker] = useState(false);
  const [showToTokenPicker, setShowToTokenPicker] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine if the fromToken is native (no approval needed)
  const NATIVE_SYMBOLS = ['ETH', 'MATIC', 'SOL', 'BTC'];
  const isNativeFrom = NATIVE_SYMBOLS.includes(fromToken);

  // ERC20 approval hook for non-native tokens
  const evmChainId = fromChain.includes('ethereum') ? 1
    : fromChain.includes('polygon') ? 137
    : fromChain.includes('arbitrum') ? 42161
    : fromChain.includes('base') ? 8453
    : fromChain.includes('optimism') ? 10 : 1;
  const fromTokenAddress = !isNativeFrom ? getTokenAddress(evmChainId, fromToken) : undefined;
  const { needsApproval, requestApproval, isApproving } = useERC20Approval(fromTokenAddress);

  const effectiveSlippage = customSlippage ? Number(customSlippage) : slippage;

  const isSolana = fromChain === 'solana-mainnet';

  function handleChainChange(newChain: string) {
    setFromChain(newChain);
    const newTokens = TOKENS_BY_CHAIN[newChain] ?? [];
    setFromToken(newTokens[0] ?? 'ETH');
    setToToken(newTokens[1] ?? 'USDC');
    setQuote(null);
    setError(null);
  }

  function flipTokens() {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setQuote(null);
    setError(null);
  }

  /**
   * Fetch a real swap quote from 1inch (EVM) or Jupiter (Solana).
   */
  async function getQuote() {
    if (!amount || parseFloat(amount) <= 0) return;
    if (!walletAddress && !isSolana) {
      setError('Please connect your wallet first.');
      return;
    }

    setLoading(true);
    setQuote(null);
    setError(null);

    try {
      // Resolve token addresses
      const fromAddr = getTokenAddress(evmChainId, fromToken) || NATIVE_TOKEN_ADDRESS;
      const toAddr = getTokenAddress(evmChainId, toToken) || NATIVE_TOKEN_ADDRESS;

      // Convert amount to smallest unit (wei for 18 decimals, or 6 for stablecoins)
      const decimals = ['USDC', 'USDT'].includes(fromToken) ? 6 : 18;
      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals)).toString();

      const result = await getSwapQuote({
        chainId: fromChain,
        fromToken: fromAddr,
        toToken: toAddr,
        amount: amountInSmallestUnit,
        slippage: effectiveSlippage,
        userAddress: walletAddress || '',
      });

      setQuote(result);
      setSwapPhase('quote');
    } catch (err: any) {
      setError(err.message || 'Failed to get quote. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleApprove() {
    if (isNativeFrom) {
      setSwapPhase('swap');
      return;
    }
    const decimals = ['USDC', 'USDT'].includes(fromToken) ? 6 : 18;
    if (needsApproval(amount, decimals)) {
      setSwapPhase('approve');
      requestApproval();
    } else {
      setSwapPhase('swap');
    }
  }

  /**
   * Execute the real swap via 1inch API + wagmi sendTransaction.
   */
  async function handleSwap() {
    if (!quote) return;
    if (!walletAddress) {
      setError('Please connect your wallet first.');
      return;
    }

    // If non-native and not yet approved, trigger approval first
    if (!isNativeFrom && swapPhase === 'quote') {
      handleApprove();
      return;
    }

    setSwapping(true);
    setError(null);

    try {
      // Step 1: Get executable swap data from 1inch
      const fromAddr = getTokenAddress(evmChainId, fromToken) || NATIVE_TOKEN_ADDRESS;
      const toAddr = getTokenAddress(evmChainId, toToken) || NATIVE_TOKEN_ADDRESS;
      const decimals = ['USDC', 'USDT'].includes(fromToken) ? 6 : 18;
      const amountInSmallestUnit = BigInt(Math.floor(parseFloat(amount) * 10 ** decimals)).toString();

      const steps: SwapStep[] = isNativeFrom
        ? ['swapping', 'confirming']
        : ['approving', 'swapping', 'confirming'];

      // If approval needed, show approval step
      if (!isNativeFrom && steps.includes('approving')) {
        setSwapStep('approving');
      }

      setSwapStep('swapping');

      const swapResult = await executeSwap({
        chainId: fromChain,
        fromToken: fromAddr,
        toToken: toAddr,
        amount: amountInSmallestUnit,
        slippage: effectiveSlippage,
        userAddress: walletAddress,
      });

      if (!swapResult.tx) {
        throw new Error('No transaction data returned from 1inch.');
      }

      // Step 2: Send the transaction via wagmi
      setSwapStep('confirming');

      const txResult = await sendTransactionAsync({
        to: swapResult.tx.to as `0x${string}`,
        data: swapResult.tx.data as `0x${string}`,
        value: BigInt(swapResult.tx.value || '0'),
      });

      setSwapStep('done');
      setSwapPhase('done');
      setTxHash(txResult);
    } catch (err: any) {
      const message = err.message || 'Swap failed';
      // User-friendly error messages
      if (message.includes('rejected') || message.includes('denied')) {
        setError('Transaction was rejected in wallet.');
      } else if (message.includes('insufficient')) {
        setError('Insufficient balance for this swap.');
      } else if (message.includes('timed out')) {
        setError('Request timed out. Please try again.');
      } else {
        setError(message.length > 200 ? message.substring(0, 200) + '...' : message);
      }
    } finally {
      setSwapping(false);
    }
  }

  function resetForm() {
    setAmount('');
    setQuote(null);
    setTxHash(null);
    setSwapStep(null);
    setSwapping(false);
    setSwapPhase('quote');
    setError(null);
  }

  /** Format output amount from smallest unit to human-readable */
  function formatOutputAmount(): string {
    if (!quote) return '0.00';
    const toDecimals = ['USDC', 'USDT'].includes(toToken) ? 6 : 18;
    try {
      const raw = BigInt(quote.outputAmount);
      const divisor = BigInt(10 ** toDecimals);
      const whole = raw / divisor;
      const frac = raw % divisor;
      const fracStr = frac.toString().padStart(toDecimals, '0').slice(0, 6);
      return `${whole}.${fracStr}`;
    } catch {
      return quote.outputAmount;
    }
  }

  /** Format gas estimate to readable ETH amount */
  function formatGasEstimate(): string {
    if (!quote || !quote.estimatedGas || quote.estimatedGas === '0') return 'N/A';
    try {
      // Gas is in gas units; estimate cost at ~30 gwei
      const gasUnits = Number(quote.estimatedGas);
      const gasCostWei = gasUnits * 30e9; // 30 gwei
      return (gasCostWei / 1e18).toFixed(6) + ' ETH';
    } catch {
      return quote.estimatedGas;
    }
  }

  return (
    <div className="min-h-screen dark">
      <Navbar />

      <main className="max-w-md md:max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
        <h1 className="text-xl md:text-2xl font-light tracking-wide mb-4 md:mb-6 text-white/90">Swap</h1>

        {/* Error Toast */}
        {error && (
          <div className="mb-4 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-light">
            <div className="flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError(null)} className="text-red-400 hover:text-red-300 ml-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Success State */}
        {txHash ? (
          <div className="glass-card p-10 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse-glow">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-light tracking-wide text-emerald-400">Swap Complete</h2>
            <p className="text-sm font-light text-white/40">
              Swapped {amount} {fromToken} for {formatOutputAmount()} {toToken}
            </p>
            <div className="glass-card p-4">
              <p className="text-xs font-light text-white/30 mb-1">Transaction Hash</p>
              <p className="text-sm font-mono text-white/60 break-all">{txHash}</p>
            </div>
            <button onClick={resetForm} className="btn-bevel w-full py-3">
              Swap Again
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chain Selector */}
            <div>
              <label className="text-xs font-light tracking-wider text-white/30 mb-2 block uppercase">Network</label>
              <div className="flex flex-wrap gap-2">
                {CHAINS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleChainChange(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 ${
                      fromChain === c.id
                        ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-transparent shadow-lg shadow-purple-500/20'
                        : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* From Token */}
            <div className="glass-card p-4 md:p-6 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-light tracking-wider text-white/30 uppercase">From</label>
                <span className="text-xs font-light text-white/20">Balance: 0.0100 {fromToken}</span>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowFromTokenPicker(true)}
                  className="flex items-center gap-2 px-4 py-2.5 min-h-12 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all duration-300 min-w-[120px]"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-[10px] font-semibold text-white/70">
                    {fromToken.substring(0, 2)}
                  </div>
                  <span className="text-sm font-medium text-white/80">{fromToken}</span>
                  <svg className="w-3 h-3 text-white/30 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <div className="relative flex-1">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setQuote(null); setError(null); }}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 pr-16 min-h-12 text-sm font-mono text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
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
                className="w-11 h-11 rounded-full bg-[hsl(220,28%,12%)] border border-white/10 hover:border-purple-500/30 flex items-center justify-center text-white/40 hover:text-purple-400 transition-all duration-300 hover:rotate-180 hover:shadow-lg hover:shadow-purple-500/10"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
                </svg>
              </button>
            </div>

            {/* To Token */}
            <div className="glass-card p-4 md:p-6 space-y-3">
              <label className="text-xs font-light tracking-wider text-white/30 uppercase">To</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => setShowToTokenPicker(true)}
                  className="flex items-center gap-2 px-4 py-2.5 min-h-12 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all duration-300 min-w-[120px]"
                >
                  <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-[10px] font-semibold text-white/70">
                    {toToken.substring(0, 2)}
                  </div>
                  <span className="text-sm font-medium text-white/80">{toToken}</span>
                  <svg className="w-3 h-3 text-white/30 ml-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
                <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-lg px-4 py-2.5 min-h-12 text-sm font-mono text-white/40 flex items-center">
                  {quote ? formatOutputAmount() : '0.00'}
                </div>
              </div>
            </div>

            {/* Slippage Settings */}
            <div className="glass-card p-4 md:p-6 space-y-3">
              <button
                onClick={() => setShowSlippageSettings(!showSlippageSettings)}
                className="flex items-center justify-between w-full"
              >
                <span className="text-xs font-light tracking-wider text-white/30 uppercase">Slippage Tolerance</span>
                <span className="text-xs font-light text-white/60">{effectiveSlippage}%</span>
              </button>
              {showSlippageSettings && (
                <div className="flex items-center gap-2">
                  {[0.1, 0.5, 1].map((s) => (
                    <button
                      key={s}
                      onClick={() => { setSlippage(s); setCustomSlippage(''); }}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-300 ${
                        slippage === s && !customSlippage
                          ? 'bg-white/10 text-white border-white/20'
                          : 'bg-white/5 text-white/40 border-white/5 hover:border-white/15'
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
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs font-mono text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
                  />
                </div>
              )}
            </div>

            {/* Privacy Slider */}
            <div className="glass-card p-4 md:p-6 gradient-border relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.02] gradient-hero" />
              <div className="relative z-10">
                <PrivacySlider value={privacyLevel} onChange={setPrivacyLevel} chainId={fromChain} />
              </div>
            </div>

            {/* Platform Fee Notice */}
            <div className="flex items-center justify-between px-1 text-xs font-light text-white/25 tracking-wide">
              <span>Platform fee</span>
              <span>0.3%</span>
            </div>

            {/* Get Quote / Quote Details */}
            {!quote ? (
              <button
                onClick={getQuote}
                disabled={!amount || Number(amount) <= 0 || loading}
                className={`w-full py-3.5 rounded-lg font-medium text-sm transition-all duration-300 ${
                  amount && Number(amount) > 0
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
                    Getting real-time quote...
                  </span>
                ) : 'Get Quote'}
              </button>
            ) : (
              <div className="space-y-4">
                {/* Quote Details */}
                <div className="glass-card p-6 space-y-3 gradient-border">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-light tracking-wide text-white/80">Quote from {quote.provider}</h3>
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      LIVE
                    </span>
                  </div>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span className="font-light text-white/30">You pay</span>
                      <span className="text-white/70 font-mono">{amount} {fromToken}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-light text-white/30">You receive</span>
                      <span className="text-white/70 font-mono">{formatOutputAmount()} {toToken}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-light text-white/30">Est. Gas</span>
                      <span className="text-white/50 font-mono">{formatGasEstimate()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-light text-white/30">Slippage</span>
                      <span className="text-white/50">{effectiveSlippage}%</span>
                    </div>
                    {quote.priceImpact > 0 && (
                      <div className="flex justify-between">
                        <span className="font-light text-white/30">Price Impact</span>
                        <span className={`font-mono ${quote.priceImpact > 1 ? 'text-red-400' : 'text-white/50'}`}>
                          {quote.priceImpact.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Route info */}
                  {quote.route && quote.route.length > 0 && (
                    <div className="pt-2 border-t border-white/5">
                      <p className="text-[10px] font-light text-white/25 mb-1">Route</p>
                      <div className="flex flex-wrap gap-1">
                        {quote.route.map((r, i) => (
                          <span key={i} className="text-[10px] font-mono text-white/40 bg-white/5 px-2 py-0.5 rounded">
                            {r.protocol} ({r.percentage}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* New Quote Button */}
                <button
                  onClick={getQuote}
                  disabled={loading}
                  className="w-full text-xs font-light text-white/30 hover:text-white/60 tracking-wide transition-colors py-1"
                >
                  {loading ? 'Refreshing...' : 'Refresh Quote'}
                </button>

                {/* Swap Progress */}
                {swapping && swapStep && (
                  <div className="glass-card p-6">
                    <div className="flex items-center justify-between">
                      {SWAP_STEPS.map((step, i) => {
                        const currentIdx = getStepIndex(swapStep);
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
                            {i < SWAP_STEPS.length - 1 && <div className={`w-8 h-px transition-colors duration-500 ${isDone ? 'bg-emerald-500/30' : 'bg-white/10'}`} />}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Approval Button (for non-native tokens) */}
                {!isNativeFrom && swapPhase === 'quote' && (
                  <button
                    onClick={handleApprove}
                    disabled={isApproving}
                    className="btn-bevel w-full py-3.5 disabled:opacity-60"
                  >
                    {isApproving ? `Approving ${fromToken}...` : `Approve ${fromToken}`}
                  </button>
                )}

                {/* Swap Button */}
                {(isNativeFrom || swapPhase === 'swap' || swapPhase === 'done') && (
                  <button
                    onClick={handleSwap}
                    disabled={swapping}
                    className="btn-bevel w-full py-3.5 disabled:opacity-60"
                  >
                    {swapping ? 'Swapping...' : `Swap ${amount} ${fromToken} for ${toToken}`}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* From Token Picker Modal */}
      {showFromTokenPicker && (
        <TokenPicker
          chainId={fromChain}
          selectedToken={fromToken}
          onSelect={(t: Token) => {
            setFromToken(t.symbol);
            setQuote(null);
            setShowFromTokenPicker(false);
          }}
          onClose={() => setShowFromTokenPicker(false)}
        />
      )}

      {/* To Token Picker Modal */}
      {showToTokenPicker && (
        <TokenPicker
          chainId={fromChain}
          selectedToken={toToken}
          onSelect={(t: Token) => {
            setToToken(t.symbol);
            setQuote(null);
            setShowToTokenPicker(false);
          }}
          onClose={() => setShowToTokenPicker(false)}
        />
      )}
    </div>
  );
}
