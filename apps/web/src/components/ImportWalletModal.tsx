// ===================================================================
// GRAVYTOS -- Import Wallet Modal
// 3-step wizard: Enter Mnemonic -> Name/Password -> Success
// ===================================================================

import { useState, useCallback, useMemo } from 'react';
import { useWalletManager } from '../hooks/useWalletManager';
import type { DerivedAddresses } from '../hooks/useWalletManager';

interface ImportWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function ImportWalletModal({ isOpen, onClose, onImported }: ImportWalletModalProps) {
  const [step, setStep] = useState(1);
  const [mnemonicInput, setMnemonicInput] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [addresses, setAddresses] = useState<DerivedAddresses | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { importWallet, deriveAddresses, validateMnemonic } = useWalletManager();

  const normalizedMnemonic = useMemo(() => {
    return mnemonicInput.trim().replace(/\s+/g, ' ').toLowerCase();
  }, [mnemonicInput]);

  const wordCount = useMemo(() => {
    if (!normalizedMnemonic) return 0;
    return normalizedMnemonic.split(' ').length;
  }, [normalizedMnemonic]);

  const isValidMnemonic = useMemo(() => {
    if (wordCount !== 12 && wordCount !== 24) return false;
    return validateMnemonic(normalizedMnemonic);
  }, [normalizedMnemonic, wordCount, validateMnemonic]);

  const reset = useCallback(() => {
    setStep(1);
    setMnemonicInput('');
    setName('');
    setPassword('');
    setConfirmPassword('');
    setAddresses(null);
    setError('');
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handlePaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      setMnemonicInput(text);
    } catch {
      // clipboard access denied
    }
  }, []);

  const handleStep1 = useCallback(() => {
    setError('');
    if (!isValidMnemonic) {
      setError('Invalid recovery phrase. Please enter a valid 12 or 24 word BIP39 mnemonic.');
      return;
    }
    setStep(2);
  }, [isValidMnemonic]);

  const handleStep2 = useCallback(async () => {
    setError('');
    if (!name.trim()) {
      setError('Please enter a wallet name');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await importWallet(name.trim(), normalizedMnemonic, password);
      const derived = await deriveAddresses(normalizedMnemonic);
      setAddresses(derived);
      setStep(3);
      onImported();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import wallet');
    } finally {
      setLoading(false);
    }
  }, [name, password, confirmPassword, normalizedMnemonic, importWallet, deriveAddresses, onImported]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative glass-card p-8 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Close button */}
        <button onClick={handleClose} className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-lg font-light tracking-wide text-white/90 mb-2">Import Wallet</h2>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-light transition-all duration-300 ${
                  s < step
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : s === step
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg shadow-purple-500/20'
                      : 'bg-white/5 text-white/25 border border-white/10'
                }`}
              >
                {s < step ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                  </svg>
                ) : (
                  s
                )}
              </div>
              {s < 3 && <div className={`w-10 h-px transition-all duration-300 ${s < step ? 'bg-emerald-500/30' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Enter Mnemonic */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-light tracking-wider text-white/40 uppercase">Recovery Phrase</label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-mono ${
                    wordCount === 0
                      ? 'text-white/25'
                      : isValidMnemonic
                        ? 'text-emerald-400'
                        : (wordCount === 12 || wordCount === 24)
                          ? 'text-red-400'
                          : 'text-amber-400'
                  }`}>
                    {wordCount} / {wordCount > 12 ? 24 : 12} words
                  </span>
                  {isValidMnemonic && (
                    <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                  )}
                </div>
              </div>
              <textarea
                value={mnemonicInput}
                onChange={(e) => setMnemonicInput(e.target.value)}
                placeholder="Enter your 12 or 24 word recovery phrase separated by spaces..."
                rows={4}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm font-mono text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all duration-300 resize-none"
              />
            </div>

            <button
              onClick={handlePaste}
              className="w-full btn-bevel-outline py-2.5 text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
              </svg>
              Paste from Clipboard
            </button>

            {error && <p className="text-xs text-red-400 font-light">{error}</p>}

            <button
              onClick={handleStep1}
              disabled={!isValidMnemonic}
              className="w-full btn-bevel py-3 text-sm disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 2: Name & Password */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-light tracking-wider text-white/40 uppercase mb-1.5 block">Wallet Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Imported Wallet"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
              />
            </div>
            <div>
              <label className="text-xs font-light tracking-wider text-white/40 uppercase mb-1.5 block">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
              />
            </div>
            <div>
              <label className="text-xs font-light tracking-wider text-white/40 uppercase mb-1.5 block">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
              />
            </div>

            {error && <p className="text-xs text-red-400 font-light">{error}</p>}

            <div className="flex gap-3">
              <button onClick={() => { setStep(1); setError(''); }} className="flex-1 btn-bevel-outline py-3 text-sm">
                Back
              </button>
              <button
                onClick={handleStep2}
                disabled={loading}
                className="flex-1 btn-bevel py-3 text-sm disabled:opacity-60"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                      <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                    </svg>
                    Importing...
                  </span>
                ) : (
                  'Import Wallet'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Success */}
        {step === 3 && addresses && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-light text-emerald-400 tracking-wide">Wallet imported successfully!</p>
            </div>

            <div className="space-y-3">
              <ImportAddressRow label="Bitcoin" prefix="BTC" address={addresses.btc} color="text-orange-400" bgColor="bg-orange-500/10" />
              <ImportAddressRow label="Ethereum" prefix="ETH" address={addresses.eth} color="text-blue-400" bgColor="bg-blue-500/10" />
              <ImportAddressRow label="Solana" prefix="SOL" address={addresses.sol} color="text-purple-400" bgColor="bg-purple-500/10" />
            </div>

            <button onClick={handleClose} className="w-full btn-bevel py-3 text-sm">
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ImportAddressRow({ label, prefix, address, color, bgColor }: { label: string; prefix: string; address: string; color: string; bgColor: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  };

  const truncated = address.length > 20
    ? `${address.slice(0, 10)}...${address.slice(-8)}`
    : address;

  return (
    <div className="glass-card p-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`w-9 h-9 rounded-xl ${bgColor} flex items-center justify-center`}>
          <span className={`text-xs font-semibold ${color}`}>{prefix.charAt(0)}</span>
        </div>
        <div>
          <p className={`text-xs font-light tracking-wider ${color}`}>{label}</p>
          <p className="text-xs font-mono text-white/50 mt-0.5">{truncated}</p>
        </div>
      </div>
      <button onClick={handleCopy} className="text-white/30 hover:text-white/70 transition-colors p-1">
        {copied ? (
          <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
          </svg>
        )}
      </button>
    </div>
  );
}
