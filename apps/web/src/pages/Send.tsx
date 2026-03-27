import { useState, useMemo, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyLevel, AuditActionType, ChainFamily } from '@gravytos/types';
import type { TransactionRequest } from '@gravytos/types';
import { PrivacySlider } from '@gravytos/ui';
import { usePrivacyStore, useWalletStore } from '@gravytos/state';
import { getTokenAddress, NATIVE_TOKEN_ADDRESS } from '@gravytos/config';
import { ERC20_TRANSFER_ABI } from '@gravytos/core';
import { useSendTransaction, useWriteContract, useAccount } from 'wagmi';
import { parseEther, parseUnits } from 'viem';
import { ConnectWalletButton } from '../components/ConnectWalletButton';
import { AddressBookPicker } from '../components/AddressBookPicker';
import { TransactionConfirmModal } from '../components/TransactionConfirmModal';
import type { TransactionConfirmDetails } from '../components/TransactionConfirmModal';
import { TransactionStatusToast } from '../components/TransactionStatusToast';
import type { ToastData } from '../components/TransactionStatusToast';
import { useTransactionEngine } from '../hooks/useTransactionEngine';
import { useWalletManager } from '../hooks/useWalletManager';
import { QRScanner } from '../components/QRScanner';
import { TokenPicker } from '../components/TokenPicker';
import type { Token } from '../components/TokenPicker';

// ─── Chain & Token Definitions ───────────────────────────────

const CHAINS = [
  { id: 'bitcoin-mainnet', name: 'Bitcoin', symbol: 'BTC', color: 'from-orange-500 to-orange-600', textColor: 'text-orange-400', family: 'bitcoin', explorer: 'https://mempool.space/tx/', evmChainId: undefined as number | undefined },
  { id: 'ethereum-1', name: 'Ethereum', symbol: 'ETH', color: 'from-blue-500 to-blue-600', textColor: 'text-blue-400', family: 'evm', explorer: 'https://etherscan.io/tx/', evmChainId: 1 as number | undefined },
  { id: 'solana-mainnet', name: 'Solana', symbol: 'SOL', color: 'from-purple-500 to-purple-600', textColor: 'text-purple-400', family: 'solana', explorer: 'https://explorer.solana.com/tx/', evmChainId: undefined as number | undefined },
  { id: 'polygon-137', name: 'Polygon', symbol: 'MATIC', color: 'from-violet-500 to-violet-600', textColor: 'text-violet-400', family: 'evm', explorer: 'https://polygonscan.com/tx/', evmChainId: 137 as number | undefined },
  { id: 'arbitrum-42161', name: 'Arbitrum', symbol: 'ETH', color: 'from-sky-500 to-sky-600', textColor: 'text-sky-400', family: 'evm', explorer: 'https://arbiscan.io/tx/', evmChainId: 42161 as number | undefined },
  { id: 'base-8453', name: 'Base', symbol: 'ETH', color: 'from-blue-500 to-blue-700', textColor: 'text-blue-300', family: 'evm', explorer: 'https://basescan.org/tx/', evmChainId: 8453 as number | undefined },
  { id: 'optimism-10', name: 'Optimism', symbol: 'ETH', color: 'from-red-500 to-red-600', textColor: 'text-red-400', family: 'evm', explorer: 'https://optimistic.etherscan.io/tx/', evmChainId: 10 as number | undefined },
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

// Native token symbols for each chain
const NATIVE_TOKENS: Record<string, string> = {
  'ethereum-1': 'ETH',
  'polygon-137': 'MATIC',
  'arbitrum-42161': 'ETH',
  'base-8453': 'ETH',
  'optimism-10': 'ETH',
  'bitcoin-mainnet': 'BTC',
  'solana-mainnet': 'SOL',
};

// ─── UTXO type for Coin Control ──────────────────────────────

interface Utxo {
  txid: string;
  vout: number;
  value: number;
  address?: string;
  label?: string;
  confirmations?: number;
  frozen?: boolean;
  status?: { confirmed: boolean; block_height?: number };
}

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
            <Link
              key={link.to}
              to={link.to}
              className="px-3 py-1.5 text-sm font-light tracking-wide text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-all duration-300"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <span className="text-xs font-light tracking-wider text-white/30 px-3 py-1 rounded-full border border-white/10 bg-white/5">
            Testnet
          </span>
          <ConnectWalletButton />
        </div>
      </div>
    </header>
  );
}

// ─── Helpers ─────────────────────────────────────────────────

function isNativeTokenForChain(chainId: string, tokenSymbol: string): boolean {
  const native = NATIVE_TOKENS[chainId];
  return tokenSymbol === native;
}

// ─── Main Send Page ──────────────────────────────────────────

export function Send() {
  const { globalLevel } = usePrivacyStore();
  const { evmAddress, solanaAddress, btcAddress, activeWalletId, balances, evmChainId } = useWalletStore();
  const { derivePrivateKey } = useWalletManager();
  const { address: wagmiAddress } = useAccount();

  // Wagmi hooks for EVM transactions
  const { sendTransaction: wagmiSendTx } = useSendTransaction();
  const { writeContract: wagmiWriteContract } = useWriteContract();

  // Transaction engine hook (for non-EVM and audit logging)
  const { sendTransaction: engineSendTx, getAuditEngine, waitForConfirmation } = useTransactionEngine();

  const [chain, setChain] = useState('ethereum-1');
  const [token, setToken] = useState('ETH');
  const [recipient, setRecipient] = useState('');
  const [amount, setAmount] = useState('');
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(globalLevel);
  const [sending, setSending] = useState(false);
  const [txStep, setTxStep] = useState<TxStep | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [selectedUtxos, setSelectedUtxos] = useState<Set<string>>(new Set());
  const [availableUtxos, setAvailableUtxos] = useState<Utxo[]>([]);

  // Modal + toast state
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showAddressBook, setShowAddressBook] = useState(false);
  const [toastData, setToastData] = useState<ToastData | null>(null);
  const [txError, setTxError] = useState<string | null>(null);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [showTokenPicker, setShowTokenPicker] = useState(false);

  const selectedChain = CHAINS.find((c) => c.id === chain)!;

  // Fetch real UTXOs when BTC chain is selected
  useEffect(() => {
    if (selectedChain.family === 'bitcoin' && btcAddress) {
      fetch(`https://blockstream.info/api/address/${btcAddress}/utxo`)
        .then((r) => r.json())
        .then((utxos: Utxo[]) => setAvailableUtxos(utxos))
        .catch(() => setAvailableUtxos([]));
    } else {
      setAvailableUtxos([]);
    }
  }, [selectedChain.family, btcAddress]);

  const connectedAddress = useMemo(() => {
    if (selectedChain.family === 'evm') return evmAddress ?? wagmiAddress ?? null;
    if (selectedChain.family === 'bitcoin') return btcAddress ?? null;
    if (selectedChain.family === 'solana') return solanaAddress ?? null;
    return null;
  }, [selectedChain.family, evmAddress, btcAddress, solanaAddress, wagmiAddress]);

  const currentBalance = useMemo(() => {
    const chainKey = selectedChain.family === 'evm' && evmChainId
      ? `ethereum-${evmChainId}`
      : selectedChain.id;
    const chainBalances = balances[chainKey];
    return chainBalances?.[token]?.formatted ?? '0.0000';
  }, [selectedChain, evmChainId, balances, token]);
  const isBitcoin = selectedChain.family === 'bitcoin';
  const showCoinControl = isBitcoin && privacyLevel === PrivacyLevel.High;

  const selectedUtxoTotal = useMemo(() => {
    return availableUtxos.filter((u) => selectedUtxos.has(u.txid)).reduce((sum, u) => sum + u.value, 0);
  }, [availableUtxos, selectedUtxos]);

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

  // Build confirmation details for the modal
  const confirmDetails: TransactionConfirmDetails = useMemo(() => ({
    fromAddress: connectedAddress ?? 'Not connected',
    toAddress: recipient,
    amount,
    token,
    network: selectedChain.name,
    estimatedFee: feeEstimate,
    feeToken: isBitcoin ? 'BTC' : selectedChain.symbol,
    privacyLevel,
  }), [connectedAddress, recipient, amount, token, selectedChain, feeEstimate, isBitcoin, privacyLevel]);

  // Show the confirmation modal
  function handleReviewClick() {
    if (!canSend) return;
    setTxError(null);
    setShowConfirmModal(true);
  }

  // Log the transaction to the audit engine (fire and forget)
  const logToAudit = useCallback(async (hash: string) => {
    try {
      const audit = getAuditEngine();
      if (audit) {
        await audit.logEvent({
          actionType: AuditActionType.TransactionSent,
          walletId: connectedAddress ?? 'unknown',
          chainId: chain,
          txHash: hash,
          privacyLevel,
          details: {
            to: recipient,
            value: amount,
            token,
            chain: selectedChain.name,
          },
        });
      }
    } catch {
      // Audit logging is best-effort
    }
  }, [getAuditEngine, connectedAddress, chain, privacyLevel, recipient, amount, token, selectedChain.name]);

  // Handle confirmed send from modal
  async function handleConfirmSend() {
    setSending(true);
    setTxStep('building');
    setShowConfirmModal(false);
    setTxError(null);

    // Show toast in pending state
    setToastData({ id: Date.now().toString(), status: 'pending' });

    // ─── EVM flow (wagmi-based) ───────────────────────────────
    if (selectedChain.family === 'evm' && connectedAddress) {
      const isNative = isNativeTokenForChain(chain, token);

      if (isNative) {
        // Native ETH/POL send via wagmi
        try {
          setTxStep('signing');
          setToastData((prev) => prev ? { ...prev, status: 'signing' } : null);

          wagmiSendTx(
            {
              to: recipient as `0x${string}`,
              value: parseEther(amount),
            },
            {
              onSuccess: (hash) => {
                setTxStep('broadcasting');
                setToastData({ id: Date.now().toString(), status: 'broadcasting', txHash: hash });

                logToAudit(hash);

                setTimeout(() => {
                  setTxStep('confirming');
                  setToastData({
                    id: Date.now().toString(),
                    status: 'confirming',
                    txHash: hash,
                  });
                }, 1000);

                setTimeout(() => {
                  setTxStep('done');
                  setTxHash(hash);
                  setSending(false);
                  setToastData({
                    id: Date.now().toString(),
                    status: 'confirmed',
                    txHash: hash,
                    explorerUrl: `${selectedChain.explorer}${hash}`,
                  });
                }, 3000);
              },
              onError: (err) => {
                const msg = err instanceof Error ? err.message : String(err);
                setTxStep(null);
                setSending(false);
                setTxError(msg);
                setToastData({
                  id: Date.now().toString(),
                  status: 'failed',
                  errorMessage: msg,
                });
              },
            },
          );
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          setTxStep(null);
          setSending(false);
          setTxError(msg);
          setToastData({
            id: Date.now().toString(),
            status: 'failed',
            errorMessage: msg,
          });
        }
        return;
      }

      // ERC20 token transfer via wagmi writeContract
      const evmId = selectedChain.evmChainId;
      const tokenAddr = evmId ? getTokenAddress(evmId, token) : undefined;

      if (!tokenAddr || tokenAddr === NATIVE_TOKEN_ADDRESS) {
        const msg = `Token address not found for ${token} on ${selectedChain.name}`;
        setTxStep(null);
        setSending(false);
        setTxError(msg);
        setToastData({ id: Date.now().toString(), status: 'failed', errorMessage: msg });
        return;
      }

      try {
        setTxStep('signing');
        setToastData((prev) => prev ? { ...prev, status: 'signing' } : null);

        // Default to 6 decimals for USDC/USDT, 18 for others
        const decimals = ['USDC', 'USDT'].includes(token) ? 6 : 18;
        const parsedAmount = parseUnits(amount, decimals);

        wagmiWriteContract(
          {
            address: tokenAddr as `0x${string}`,
            abi: ERC20_TRANSFER_ABI,
            functionName: 'transfer',
            args: [recipient as `0x${string}`, parsedAmount],
          },
          {
            onSuccess: (hash) => {
              setTxStep('broadcasting');
              setToastData({ id: Date.now().toString(), status: 'broadcasting', txHash: hash });

              logToAudit(hash);

              setTimeout(() => {
                setTxStep('confirming');
                setToastData({
                  id: Date.now().toString(),
                  status: 'confirming',
                  txHash: hash,
                });
              }, 1000);

              setTimeout(() => {
                setTxStep('done');
                setTxHash(hash);
                setSending(false);
                setToastData({
                  id: Date.now().toString(),
                  status: 'confirmed',
                  txHash: hash,
                  explorerUrl: `${selectedChain.explorer}${hash}`,
                });
              }, 3000);
            },
            onError: (err) => {
              const msg = err instanceof Error ? err.message : String(err);
              setTxStep(null);
              setSending(false);
              setTxError(msg);
              setToastData({
                id: Date.now().toString(),
                status: 'failed',
                errorMessage: msg,
              });
            },
          },
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setTxStep(null);
        setSending(false);
        setTxError(msg);
        setToastData({
          id: Date.now().toString(),
          status: 'failed',
          errorMessage: msg,
        });
      }
      return;
    }

    // ─── Bitcoin flow ─────────────────────────────────────────
    if (selectedChain.family === 'bitcoin') {
      if (!activeWalletId || !btcAddress) {
        setTxStep(null);
        setSending(false);
        setTxError('Unlock your wallet first in Settings');
        setToastData({
          id: Date.now().toString(),
          status: 'failed',
          errorMessage: 'Unlock your wallet first in Settings',
        });
        return;
      }

      try {
        setTxStep('signing');
        setToastData((prev) => prev ? { ...prev, status: 'signing' } : null);

        const privateKey = await derivePrivateKey(activeWalletId, ChainFamily.Bitcoin);

        const request: TransactionRequest = {
          chainId: chain,
          from: btcAddress,
          to: recipient,
          value: amount,
          walletId: activeWalletId,
          privacyLevel,
        };

        setTxStep('broadcasting');
        setToastData((prev) => prev ? { ...prev, status: 'broadcasting' } : null);

        const result = await engineSendTx(request, privateKey);

        logToAudit(result.txHash);

        // Wait for confirmation
        setTxStep('confirming');
        setToastData({
          id: Date.now().toString(),
          status: 'confirming',
          txHash: result.txHash,
        });

        const confirmed = await waitForConfirmation(chain, result.txHash);

        if (confirmed.status === 'confirmed') {
          setTxStep('done');
          setTxHash(result.txHash);
          setToastData({
            id: Date.now().toString(),
            status: 'confirmed',
            txHash: result.txHash,
            explorerUrl: `${selectedChain.explorer}${result.txHash}`,
          });
        } else {
          setTxStep('done');
          setTxHash(result.txHash);
          setToastData({
            id: Date.now().toString(),
            status: 'confirming',
            txHash: result.txHash,
            explorerUrl: `${selectedChain.explorer}${result.txHash}`,
          });
        }
        setSending(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setTxStep(null);
        setSending(false);
        setTxError(msg || 'Bitcoin transaction failed');
        setToastData({
          id: Date.now().toString(),
          status: 'failed',
          errorMessage: msg || 'Bitcoin transaction failed',
        });
      }
      return;
    }

    // ─── Solana flow ──────────────────────────────────────────
    if (selectedChain.family === 'solana') {
      if (!activeWalletId || !solanaAddress) {
        setTxStep(null);
        setSending(false);
        setTxError('Unlock your wallet first in Settings');
        setToastData({
          id: Date.now().toString(),
          status: 'failed',
          errorMessage: 'Unlock your wallet first in Settings',
        });
        return;
      }

      try {
        setTxStep('signing');
        setToastData((prev) => prev ? { ...prev, status: 'signing' } : null);

        const privateKey = await derivePrivateKey(activeWalletId, ChainFamily.Solana);

        const request: TransactionRequest = {
          chainId: chain,
          from: solanaAddress,
          to: recipient,
          value: amount,
          walletId: activeWalletId,
          privacyLevel,
        };

        setTxStep('broadcasting');
        setToastData((prev) => prev ? { ...prev, status: 'broadcasting' } : null);

        const result = await engineSendTx(request, privateKey);

        logToAudit(result.txHash);

        // Wait for confirmation
        setTxStep('confirming');
        setToastData({
          id: Date.now().toString(),
          status: 'confirming',
          txHash: result.txHash,
        });

        const confirmed = await waitForConfirmation(chain, result.txHash);

        if (confirmed.status === 'confirmed') {
          setTxStep('done');
          setTxHash(result.txHash);
          setToastData({
            id: Date.now().toString(),
            status: 'confirmed',
            txHash: result.txHash,
            explorerUrl: `${selectedChain.explorer}${result.txHash}`,
          });
        } else {
          setTxStep('done');
          setTxHash(result.txHash);
          setToastData({
            id: Date.now().toString(),
            status: 'confirming',
            txHash: result.txHash,
            explorerUrl: `${selectedChain.explorer}${result.txHash}`,
          });
        }
        setSending(false);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setTxStep(null);
        setSending(false);
        setTxError(msg || 'Solana transaction failed');
        setToastData({
          id: Date.now().toString(),
          status: 'failed',
          errorMessage: msg || 'Solana transaction failed',
        });
      }
      return;
    }

    // ─── Fallback: unsupported chain ──────────────────────────
    setTxError(`Sending on ${selectedChain.name} is not yet supported.`);
    setTxStep(null);
    setSending(false);
    setToastData({
      id: Date.now().toString(),
      status: 'failed',
      errorMessage: `${selectedChain.name} not supported`,
    });
  }

  function resetForm() {
    setRecipient('');
    setAmount('');
    setTxHash(null);
    setTxStep(null);
    setShowConfirmModal(false);
    setSending(false);
    setSelectedUtxos(new Set());
    setTxError(null);
  }

  return (
    <div className="min-h-screen dark">
      <Navbar />

      <main className="max-w-lg md:max-w-2xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
        <h1 className="text-xl md:text-2xl font-light tracking-wide mb-4 md:mb-6 text-white/90">Send</h1>

        {/* Success State */}
        {txHash ? (
          <div className="glass-card p-10 text-center space-y-5">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center animate-pulse-glow">
              <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-light tracking-wide text-emerald-400">Transaction Sent</h2>
            <div className="glass-card p-4">
              <p className="text-xs font-light text-white/30 mb-1 tracking-wide">Transaction Hash</p>
              <p className="text-sm font-mono text-white/60 break-all">{txHash}</p>
            </div>
            <a
              href={`${selectedChain.explorer}${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-light text-purple-400 hover:text-purple-300 transition-colors"
            >
              View on Explorer
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
              </svg>
            </a>
            <button onClick={resetForm} className="btn-bevel w-full py-3">
              Send Another
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Chain Selector Pills */}
            <div>
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

            {/* Token Selector */}
            <div className="glass-card p-6 space-y-5">
              <div>
                <label className="text-xs font-light tracking-wider text-white/30 mb-2 block uppercase">Token</label>
                <button
                  onClick={() => setShowTokenPicker(true)}
                  className="flex items-center gap-3 px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 transition-all duration-300 w-full"
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-xs font-semibold text-white/70">
                    {token.substring(0, 2)}
                  </div>
                  <span className="text-sm font-medium text-white/80 flex-1 text-left">{token}</span>
                  <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
                </button>
              </div>

              {/* Recipient */}
              <div>
                <label className="text-xs font-light tracking-wider text-white/30 mb-2 block uppercase">Recipient Address</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                    placeholder={isBitcoin ? 'bc1q...' : selectedChain.family === 'solana' ? '7xK...' : '0x...'}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 min-h-12 text-sm font-mono text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all duration-300"
                  />
                  <button
                    onClick={() => setShowQRScanner(true)}
                    title="Address Book"
                    className="px-3 py-3 min-h-12 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 text-white/40 hover:text-purple-400 transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setShowQRScanner(true)}
                    title="Scan QR Code"
                    className="px-3 py-3 min-h-12 rounded-lg bg-white/5 border border-white/10 hover:border-purple-500/30 text-white/40 hover:text-purple-400 transition-all duration-300"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5Z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 14.625v2.625m3.375-2.625V21m3.375-7.875v3.375M17.25 14.625h3.375" />
                    </svg>
                  </button>
                </div>
                {recipient.length > 0 && !isValidRecipient && (
                  <p className="text-xs text-red-400 mt-1">Address too short</p>
                )}
              </div>

              {/* Amount */}
              <div>
                <label className="text-xs font-light tracking-wider text-white/30 mb-2 block uppercase">Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min="0"
                    step="any"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 pr-24 min-h-12 text-sm font-mono text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/25 transition-all duration-300"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    <button
                      onClick={() => setAmount('0.01')}
                      className="text-[10px] font-semibold text-purple-400 hover:text-purple-300 px-2 py-1 rounded bg-purple-500/10 hover:bg-purple-500/20 transition-colors"
                    >
                      MAX
                    </button>
                    <span className="text-xs text-white/30 font-medium">{token}</span>
                  </div>
                </div>
                <p className="text-xs font-light text-white/20 mt-1 tracking-wide">Balance: {currentBalance} {token}</p>
              </div>
            </div>

            {/* Privacy Slider */}
            <div className="glass-card p-5 md:p-6 gradient-border relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.02] gradient-hero" />
              <div className="relative z-10">
                <PrivacySlider
                  value={privacyLevel}
                  onChange={setPrivacyLevel}
                  chainId={chain}
                />
              </div>
            </div>

            {/* Coin Control (BTC + High Privacy) */}
            {showCoinControl && (
              <div className="glass-card p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-light tracking-wide text-white/70">Coin Control</h3>
                  <span className="text-xs font-light text-white/30">
                    Selected: {selectedUtxoTotal.toFixed(8)} BTC
                  </span>
                </div>
                <p className="text-xs font-light text-white/30 tracking-wide">Manually select UTXOs for maximum privacy control.</p>
                <div className="space-y-2">
                  {availableUtxos.map((utxo) => (
                    <label
                      key={utxo.txid}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all duration-300 ${
                        utxo.frozen
                          ? 'bg-white/[0.02] border-white/5 opacity-60'
                          : selectedUtxos.has(utxo.txid)
                            ? 'bg-purple-500/5 border-purple-500/30'
                            : 'bg-white/[0.02] border-white/5 hover:border-white/15'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedUtxos.has(utxo.txid)}
                        onChange={() => !utxo.frozen && toggleUtxo(utxo.txid)}
                        disabled={utxo.frozen}
                        className="w-4 h-4 rounded border-white/20 bg-white/5 text-purple-500 focus:ring-purple-500/25"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-white/40 truncate">{utxo.txid}</span>
                          {utxo.frozen && (
                            <span className="text-[10px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded">
                              FROZEN
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          {utxo.label && <span className="text-[10px] text-white/25">{utxo.label}</span>}
                          <span className="text-[10px] text-white/15">{utxo.confirmations} confs</span>
                        </div>
                      </div>
                      <span className="text-xs font-mono text-white/60 whitespace-nowrap">{utxo.value} BTC</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Fee Estimate */}
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-light text-white/25 tracking-wide">Estimated fee</span>
              <span className="text-xs text-white/50 font-mono">{feeEstimate} {isBitcoin ? 'BTC' : selectedChain.symbol}</span>
            </div>

            {/* Error Message */}
            {txError && (
              <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                <p className="text-sm font-light text-red-400 tracking-wide">{txError}</p>
              </div>
            )}

            {/* Transaction Progress */}
            {sending && txStep && (
              <div className="glass-card p-6">
                <div className="flex items-center justify-between mb-4">
                  {TX_STEPS.map((step, i) => {
                    const currentIdx = getStepIndex(txStep);
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
                          ) : (
                            i + 1
                          )}
                        </div>
                        <span className={`text-[10px] font-light tracking-wide hidden sm:block ${
                          isDone ? 'text-emerald-400' : isActive ? 'text-purple-400' : 'text-white/20'
                        }`}>
                          {step.label}
                        </span>
                        {i < TX_STEPS.length - 1 && (
                          <div className={`w-6 h-px transition-colors duration-500 ${isDone ? 'bg-emerald-500/30' : 'bg-white/10'}`} />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Send Button */}
            <button
              onClick={handleReviewClick}
              disabled={!canSend}
              className={`w-full py-3.5 min-h-12 rounded-lg font-medium text-sm transition-all duration-300 ${
                canSend
                  ? 'btn-bevel'
                  : 'bg-white/5 text-white/20 cursor-not-allowed border border-white/5'
              }`}
            >
              {sending ? 'Sending...' : 'Review Transaction'}
            </button>

            {/* Wallet not connected hint */}
            {!connectedAddress && selectedChain.family !== 'bitcoin' && (
              <p className="text-xs font-light text-white/20 text-center tracking-wide">
                Connect a wallet to send transactions on {selectedChain.name}
              </p>
            )}
          </div>
        )}
      </main>

      {/* Confirmation Modal */}
      <TransactionConfirmModal
        open={showConfirmModal}
        details={confirmDetails}
        onConfirm={handleConfirmSend}
        onCancel={() => setShowConfirmModal(false)}
        confirming={sending}
      />

      {/* Status Toast */}
      <TransactionStatusToast
        toast={toastData}
        onDismiss={() => setToastData(null)}
      />

      {/* QR Scanner Modal */}
      {showQRScanner && (
        <QRScanner
          onScan={(data) => {
            setRecipient(data);
            setShowQRScanner(false);
          }}
          onClose={() => setShowQRScanner(false)}
        />
      )}

      {/* Token Picker Modal */}
      {showTokenPicker && (
        <TokenPicker
          chainId={chain}
          selectedToken={token}
          onSelect={(t: Token) => {
            setToken(t.symbol);
            setShowTokenPicker(false);
          }}
          onClose={() => setShowTokenPicker(false)}
        />
      )}

      {/* Address Book Picker Modal */}
      {showAddressBook && (
        <AddressBookPicker
          chainFamily={selectedChain.family as 'bitcoin' | 'evm' | 'solana'}
          onSelect={(address) => {
            setRecipient(address);
            setShowAddressBook(false);
          }}
          onClose={() => setShowAddressBook(false)}
        />
      )}
    </div>
  );
}
