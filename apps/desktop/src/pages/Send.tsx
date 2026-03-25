import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyLevel } from '@gravytos/types';
import { PrivacySlider } from '@gravytos/ui';
import { usePrivacyStore, useWalletStore } from '@gravytos/state';
import { useSendTransaction } from 'wagmi';
import { parseEther } from 'viem';
import { ConnectWalletButton } from '../components/ConnectWalletButton';

// ─── Chain & Token Definitions ───────────────────────────────

const CHAINS = [
  { id: 'bitcoin-mainnet', name: 'Bitcoin', symbol: 'BTC', color: 'bg-orange-500', textColor: 'text-orange-400', family: 'bitcoin', explorer: 'https://mempool.space/tx/' },
  { id: 'ethereum-1', name: 'Ethereum', symbol: 'ETH', color: 'bg-blue-500', textColor: 'text-blue-400', family: 'evm', explorer: 'https://etherscan.io/tx/' },
  { id: 'solana-mainnet', name: 'Solana', symbol: 'SOL', color: 'bg-purple-500', textColor: 'text-purple-400', family: 'solana', explorer: 'https://explorer.solana.com/tx/' },
  { id: 'polygon-137', name: 'Polygon', symbol: 'MATIC', color: 'bg-violet-500', textColor: 'text-violet-400', family: 'evm', explorer: 'https://polygonscan.com/tx/' },
  { id: 'arbitrum-42161', name: 'Arbitrum', symbol: 'ETH', color: 'bg-sky-500', textColor: 'text-sky-400', family: 'evm', explorer: 'https://arbiscan.io/tx/' },
  { id: 'base-8453', name: 'Base', symbol: 'ETH', color: 'bg-blue-600', textColor: 'text-blue-300', family: 'evm', explorer: 'https://basescan.org/tx/' },
  { id: 'optimism-10', name: 'Optimism', symbol: 'ETH', color: 'bg-red-500', textColor: 'text-red-400', family: 'evm', explorer: 'https://optimistic.etherscan.io/tx/' },
];

const TOKENS_BY_CHAIN: Record<string, string[]> = {
  'bitcoin-mainnet': ['BTC'],
  'ethereum-1': ['ETH', 'USDC', 'USDT', 'DAI', 'WBTC'],
  'solana-mainnet': ['SOL', 'USDC', 'USDT', 'RAY', 'JUP'],
  'polygon-137': ['MATIC', 'USDC', 'USDT', 'WETH'],
  'arbitrum-42161': ['ETH', 'USDC', 'USDT', 'ARB'],
  'base-8453': ['ETH', 'USDC', 'USDT'],
  'optimism-10': ['ETH', 'USDC', 'USDT', 'OP'],
};

// ─── Mock UTXOs for Coin Control ─────────────────────────────

const MOCK_UTXOS = [
  { txid: 'a1b2c3d4...f5e6', vout: 0, value: 0.005, address: 'bc1q...x7k2', label: 'Exchange withdrawal', confirmations: 142, frozen: false },
  { txid: 'b2c3d4e5...a1f6', vout: 1, value: 0.012, address: 'bc1q...m3n4', label: 'Payment received', confirmations: 89, frozen: false },
  { txid: 'c3d4e5f6...b2a1', vout: 0, value: 0.0008, address: 'bc1q...p5q6', label: 'Dust from swap', confirmations: 321, frozen: true },
  { txid: 'd4e5f6a7...c3b2', vout: 2, value: 0.025, address: 'bc1q...r7s8', label: 'Mining payout', confirmations: 1024, frozen: false },
  { txid: 'e5f6a7b8...d4c3', vout: 0, value: 0.0015, address: 'bc1q...t9u0', label: '', confirmations: 45, frozen: false },
];

// ─── Tx Progress Steps ───────────────────────────────────────

type TxStep = 'building' | 'signing' | 'broadcasting' | 'confirming' | 'done';

const TX_STEPS: { key: TxStep; label: string }[] = [
  { key: 'building', label: 'Building' },
  { key: 'signing', label: 'Signing' },
  { key: 'broadcasting', label: 'Broadcasting' },
  { key: 'confirming', label: 'Confirming' },
];

function getStepIndex(step: TxStep): number {
  if (step === 'done') return TX_STEPS.length;
  return TX_STEPS.findIndex((s) => s.key === step);
}

// ─── Navbar (shared pattern) ─────────────────────────────────

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
            <Link
              key={link.to}
              to={link.to}
              className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-xs text-zinc-500 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50">
            Testnet
          </span>
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}

// ─── Main Send Page ──────────────────────────────────────────

export function Send() {
  const { globalLevel } = usePrivacyStore();
  const { evmAddress, solanaAddress, balances, evmChainId } = useWalletStore();
  const { sendTransaction } = useSendTransaction();

  const [chain, setChain] = useState('ethereum-1');
  const [token, setToken] = useState('ETH');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(globalLevel);
  const [sending, setSending] = useState(false);
  const [txStep, setTxStep] = useState<TxStep | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [selectedUtxos, setSelectedUtxos] = useState<Set<string>>(new Set());
  const [showSummary, setShowSummary] = useState(false);

  const selectedChain = CHAINS.find((c) => c.id === chain)!;

  // Derive connected address for selected chain
  const connectedAddress = useMemo(() => {
    if (selectedChain.family === 'evm') return evmAddress;
    if (selectedChain.family === 'solana') return solanaAddress;
    return null;
  }, [selectedChain.family, evmAddress, solanaAddress]);

  // Derive balance for selected token on selected chain
  const currentBalance = useMemo(() => {
    const chainKey = selectedChain.family === 'evm' && evmChainId
      ? `ethereum-${evmChainId}`
      : selectedChain.id;
    const chainBalances = balances[chainKey];
    return chainBalances?.[token]?.formatted ?? '0.0000';
  }, [selectedChain, evmChainId, balances, token]);
  const tokens = TOKENS_BY_CHAIN[chain] ?? [selectedChain.symbol];
  const isBitcoin = selectedChain.family === 'bitcoin';
  const showCoinControl = isBitcoin && privacyLevel === PrivacyLevel.High;

  const selectedUtxoTotal = useMemo(() => {
    return MOCK_UTXOS.filter((u) => selectedUtxos.has(u.txid)).reduce((sum, u) => sum + u.value, 0);
  }, [selectedUtxos]);

  const feeEstimate = useMemo(() => {
    const base = isBitcoin ? 0.00002 : 0.001;
    const multiplier = privacyLevel === PrivacyLevel.High ? 3 : privacyLevel === PrivacyLevel.Medium ? 1.5 : 1;
    return (base * multiplier).toFixed(6);
  }, [isBitcoin, privacyLevel]);

  const isValidRecipient = recipient.length > 10;
  const isValidAmount = Number(amount) > 0;
  const canSend = isValidRecipient && isValidAmount && !sending;

  function handleChainChange(newChain: string) {
    setChain(newChain);
    const newTokens = TOKENS_BY_CHAIN[newChain] ?? [];
    setToken(newTokens[0] ?? 'ETH');
    setSelectedUtxos(new Set());
  }

  function toggleUtxo(txid: string) {
    setSelectedUtxos((prev) => {
      const next = new Set(prev);
      if (next.has(txid)) next.delete(txid);
      else next.add(txid);
      return next;
    });
  }

  async function handleSend() {
    if (!canSend) return;
    if (!showSummary) {
      setShowSummary(true);
      return;
    }

    setSending(true);
    setTxStep('building');

    // For EVM native token sends, use wagmi's sendTransaction
    if (selectedChain.family === 'evm' && connectedAddress && (token === 'ETH' || token === 'POL')) {
      try {
        setTxStep('signing');
        sendTransaction(
          {
            to: recipient as `0x${string}`,
            value: parseEther(amount),
          },
          {
            onSuccess: (hash) => {
              setTxStep('done');
              setTxHash(hash);
              setSending(false);
            },
            onError: () => {
              setTxStep(null);
              setSending(false);
            },
          },
        );
      } catch {
        setTxStep(null);
        setSending(false);
      }
      return;
    }

    // Fallback: simulated send for non-EVM or ERC20 tokens
    const steps: TxStep[] = ['building', 'signing', 'broadcasting', 'confirming'];
    for (const step of steps) {
      setTxStep(step);
      await new Promise((r) => setTimeout(r, 800 + Math.random() * 600));
    }
    setTxStep('done');
    setTxHash('0x' + Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''));
    setSending(false);
  }

  function resetForm() {
    setRecipient('');
    setAmount('');
    setTxHash(null);
    setTxStep(null);
    setShowSummary(false);
    setSending(false);
    setSelectedUtxos(new Set());
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="max-w-2xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Send</h1>

        {/* Success State */}
        {txHash ? (
          <div className="glass-card p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-green-400">Transaction Sent</h2>
            <div className="bg-zinc-800/50 rounded-lg p-3">
              <p className="text-xs text-zinc-500 mb-1">Transaction Hash</p>
              <p className="text-sm font-mono text-zinc-300 break-all">{txHash}</p>
            </div>
            <a
              href={`${selectedChain.explorer}${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-purple-400 hover:text-purple-300"
            >
              View on Explorer
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            <button
              onClick={resetForm}
              className="w-full mt-4 px-6 py-3 rounded-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all"
            >
              Send Another
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chain Selector Pills */}
            <div>
              <label className="text-xs text-zinc-500 mb-2 block">Network</label>
              <div className="flex flex-wrap gap-2">
                {CHAINS.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => handleChainChange(c.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      chain === c.id
                        ? `${c.color} text-white border-transparent`
                        : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                    }`}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Token Selector */}
            <div className="glass-card p-5 space-y-4">
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Token</label>
                <div className="flex gap-2 flex-wrap">
                  {tokens.map((t) => (
                    <button
                      key={t}
                      onClick={() => setToken(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        token === t
                          ? 'bg-zinc-700 text-white border-zinc-600'
                          : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recipient */}
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Recipient Address</label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder={isBitcoin ? 'bc1q...' : selectedChain.family === 'solana' ? '7xK...' : '0x...'}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all"
                />
                {recipient.length > 0 && !isValidRecipient && (
                  <p className="text-xs text-red-400 mt-1">Address too short</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs text-zinc-500 mb-1.5 block">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 pr-24 text-sm font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => setAmount('0.01')}
                      className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                    >
                      MAX
                    </button>
                    <span className="text-xs text-zinc-500 font-medium">{token}</span>
                  </div>
                </div>
                <p className="text-xs text-zinc-600 mt-1">Balance: {currentBalance} {token}</p>
              </div>
            </div>

            {/* Privacy Slider */}
            <div className="glass-card p-5">
              <PrivacySlider
                value={privacyLevel}
                onChange={setPrivacyLevel}
                chainId={chain}
              />
            </div>

            {/* Coin Control (BTC + High Privacy) */}
            {showCoinControl && (
              <div className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-zinc-300">Coin Control</h3>
                  <span className="text-xs text-zinc-500">
                    Selected: {selectedUtxoTotal.toFixed(8)} BTC
                  </span>
                </div>
                <p className="text-xs text-zinc-500">Manually select UTXOs for maximum privacy control.</p>
                <div className="space-y-2">
                  {MOCK_UTXOS.map((utxo) => (
                    <label
                      key={utxo.txid}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                        utxo.frozen
                          ? 'bg-zinc-900/30 border-zinc-800 opacity-60'
                          : selectedUtxos.has(utxo.txid)
                            ? 'bg-purple-500/5 border-purple-500/30'
                            : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUtxos.has(utxo.txid)}
                        onChange={() => !utxo.frozen && toggleUtxo(utxo.txid)}
                        disabled={utxo.frozen}
                        className="w-4 h-4 rounded border-zinc-600 bg-zinc-800 text-purple-500 focus:ring-purple-500/25"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-zinc-400 truncate">{utxo.txid}</span>
                          {utxo.frozen && (
                            <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                              FROZEN
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {utxo.label && <span className="text-[10px] text-zinc-500">{utxo.label}</span>}
                          <span className="text-[10px] text-zinc-600">{utxo.confirmations} confs</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-zinc-300 whitespace-nowrap">{utxo.value} BTC</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Fee Estimate */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs text-zinc-500">Estimated fee</span>
              <span className="text-xs text-zinc-300 font-mono">{feeEstimate} {isBitcoin ? 'BTC' : selectedChain.symbol}</span>
            </div>

            {/* Transaction Summary */}
            {showSummary && !sending && (
              <div className="glass-card p-5 space-y-3 border-purple-500/20">
                <h3 className="text-sm font-semibold text-zinc-200">Transaction Summary</h3>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-zinc-500">From</span>
                    <span className="text-zinc-300 font-mono truncate max-w-[200px]">{connectedAddress ?? 'Not connected'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">To</span>
                    <span className="text-zinc-300 font-mono truncate max-w-[200px]">{recipient}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Amount</span>
                    <span className="text-zinc-300 font-mono">{amount} {token}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Network Fee</span>
                    <span className="text-zinc-300 font-mono">{feeEstimate} {selectedChain.symbol}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Privacy Level</span>
                    <span className={`font-medium ${
                      privacyLevel === PrivacyLevel.High ? 'text-purple-400' : privacyLevel === PrivacyLevel.Medium ? 'text-yellow-400' : 'text-green-400'
                    }`}>
                      {privacyLevel.charAt(0).toUpperCase() + privacyLevel.slice(1)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Transaction Progress */}
            {sending && txStep && (
              <div className="glass-card p-5">
                <div className="flex items-center justify-between mb-4">
                  {TX_STEPS.map((step, i) => {
                    const currentIdx = getStepIndex(txStep);
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
                          ) : (
                            i + 1
                          )}
                        </div>
                        <span className={`text-[10px] font-medium hidden sm:block ${
                          isDone ? 'text-green-400' : isActive ? 'text-purple-400' : 'text-zinc-600'
                        }`}>
                          {step.label}
                        </span>
                        {i < TX_STEPS.length - 1 && (
                          <div className={`w-6 h-px ${isDone ? 'bg-green-500/30' : 'bg-zinc-700'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleSend}
              disabled={!canSend}
              className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
                canSend
                  ? 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 shadow-lg shadow-purple-600/20'
                  : 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
              }`}
            >
              {sending ? 'Sending...' : showSummary ? 'Confirm & Send' : 'Review Transaction'}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
