// ===================================================================
// NEXORA VAULT -- Create Wallet Modal
// 4-step wizard: Name/Password -> Mnemonic -> Confirm -> Success
// ===================================================================

import { useState, useCallback, useMemo } from 'react';
import { useWalletManager } from '../hooks/useWalletManager';
import type { DerivedAddresses } from '../hooks/useWalletManager';

const getRandomPositions = (totalWords: number, count: number): number[] => {
  const positions: number[] = [];
  while (positions.length < count) {
    const pos = Math.floor(Math.random() * totalWords);
    if (!positions.includes(pos)) positions.push(pos);
  }
  return positions.sort((a, b) => a - b);
};

interface CreateWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateWalletModal({ isOpen, onClose, onCreated }: CreateWalletModalProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mnemonic, setMnemonic] = useState('');
  const [addresses, setAddresses] = useState<DerivedAddresses | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifyPositions, setVerifyPositions] = useState<number[]>([]);
  const [verifyInputs, setVerifyInputs] = useState<Record<number, string>>({});

  const { createWallet, deriveAddresses } = useWalletManager();

  const reset = useCallback(() => {
    setStep(1);
    setName('');
    setPassword('');
    setConfirmPassword('');
    setMnemonic('');
    setAddresses(null);
    setError('');
    setLoading(false);
    setCopied(false);
    setVerifyPositions([]);
    setVerifyInputs({});
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleStep1 = useCallback(async () => {
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
      const result = await createWallet(name.trim(), password);
      setMnemonic(result.mnemonic);
      const derived = await deriveAddresses(result.mnemonic);
      setAddresses(derived);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create wallet');
    } finally {
      setLoading(false);
    }
  }, [name, password, confirmPassword, createWallet, deriveAddresses]);

  const handleCopyMnemonic = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(mnemonic);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: select text
    }
  }, [mnemonic]);

  const verifyAllCorrect = useMemo(() => {
    if (verifyPositions.length === 0 || !mnemonic) return false;
    const mnemonicWords = mnemonic.split(' ');
    return verifyPositions.every(
      (pos) => verifyInputs[pos]?.trim().toLowerCase() === mnemonicWords[pos]?.toLowerCase()
    );
  }, [verifyPositions, verifyInputs, mnemonic]);

  const handleStep3 = useCallback(() => {
    if (!verifyAllCorrect) {
      setError('Please enter the correct words to verify your backup');
      return;
    }
    setError('');
    setStep(4);
    onCreated();
  }, [verifyAllCorrect, onCreated]);

  if (!isOpen) return null;

  const words = mnemonic.split(' ');

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
        <h2 className="text-lg font-light tracking-wide text-white/90 mb-2">Create New Wallet</h2>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((s) => (
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
              {s < 4 && <div className={`w-8 h-px transition-all duration-300 ${s < step ? 'bg-emerald-500/30' : 'bg-white/10'}`} />}
            </div>
          ))}
        </div>

        {/* Step 1: Name & Password */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-light tracking-wider text-white/40 uppercase mb-1.5 block">Wallet Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My Wallet"
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
            <button
              onClick={handleStep1}
              disabled={loading}
              className="w-full btn-bevel py-3 text-sm disabled:opacity-60"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                    <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                  </svg>
                  Creating Wallet...
                </span>
              ) : (
                'Continue'
              )}
            </button>
          </div>
        )}

        {/* Step 2: Show Mnemonic */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
                </svg>
                <span className="text-xs font-light tracking-wider text-amber-400 uppercase">Write this down!</span>
              </div>
              <p className="text-xs font-light text-amber-400/70 tracking-wide leading-relaxed">
                This is your recovery phrase. If you lose access to your wallet, this is the only way to recover your funds. Never share it with anyone.
              </p>
            </div>

            {/* Mnemonic Grid */}
            <div className="grid grid-cols-4 gap-2">
              {words.map((word, i) => (
                <div
                  key={i}
                  className="glass-card px-3 py-2 flex items-center gap-2"
                >
                  <span className="text-[10px] text-white/25 font-mono w-4 text-right">{i + 1}</span>
                  <span className="text-sm font-mono text-white/80">{word}</span>
                </div>
              ))}
            </div>

            <button
              onClick={handleCopyMnemonic}
              className="w-full btn-bevel-outline py-2.5 text-sm flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9.75a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184" />
              </svg>
              {copied ? 'Copied!' : 'Copy to Clipboard'}
            </button>

            <button onClick={() => {
              const wordCount = mnemonic.split(' ').length;
              setVerifyPositions(getRandomPositions(wordCount, 3));
              setVerifyInputs({});
              setError('');
              setStep(3);
            }} className="w-full btn-bevel py-3 text-sm">
              I have written it down
            </button>
          </div>
        )}

        {/* Step 3: Verify Seed Phrase */}
        {step === 3 && (
          <div className="space-y-4">
            <p className="text-sm font-light text-white/60 tracking-wide leading-relaxed">
              Verify your recovery phrase by entering the correct words below.
            </p>

            <div className="space-y-3">
              {verifyPositions.map((pos) => {
                const mnemonicWords = mnemonic.split(' ');
                const inputVal = verifyInputs[pos] ?? '';
                const isCorrect = inputVal.trim().toLowerCase() === mnemonicWords[pos]?.toLowerCase();
                const hasInput = inputVal.trim().length > 0;
                return (
                  <div key={pos} className="flex items-center gap-3">
                    <span className="text-xs font-mono text-white/40 w-16 text-right shrink-0">Word #{pos + 1}</span>
                    <div className="relative flex-1">
                      <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setVerifyInputs((prev) => ({ ...prev, [pos]: e.target.value }))}
                        placeholder={`Enter word #${pos + 1}`}
                        className={`w-full glass-card px-4 py-3 text-sm font-mono text-white/80 placeholder-white/20 focus:outline-none transition-all duration-300 ${
                          hasInput
                            ? isCorrect
                              ? 'border-emerald-500/50 bg-emerald-500/5'
                              : 'border-red-500/50 bg-red-500/5'
                            : 'border-white/10'
                        }`}
                      />
                      {hasInput && (
                        <span className="absolute right-3 top-1/2 -translate-y-1/2">
                          {isCorrect ? (
                            <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          ) : (
                            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {error && <p className="text-xs text-red-400 font-light">{error}</p>}

            <button
              onClick={handleStep3}
              disabled={!verifyAllCorrect}
              className="w-full btn-bevel py-3 text-sm disabled:opacity-40"
            >
              Continue
            </button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && addresses && (
          <div className="space-y-4">
            <div className="text-center mb-2">
              <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                </svg>
              </div>
              <p className="text-sm font-light text-emerald-400 tracking-wide">Wallet created successfully!</p>
            </div>

            <div className="space-y-3">
              <AddressRow label="Bitcoin" prefix="BTC" address={addresses.btc} color="text-orange-400" bgColor="bg-orange-500/10" />
              <AddressRow label="Ethereum" prefix="ETH" address={addresses.eth} color="text-blue-400" bgColor="bg-blue-500/10" />
              <AddressRow label="Solana" prefix="SOL" address={addresses.sol} color="text-purple-400" bgColor="bg-purple-500/10" />
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

function AddressRow({ label, prefix, address, color, bgColor }: { label: string; prefix: string; address: string; color: string; bgColor: string }) {
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
