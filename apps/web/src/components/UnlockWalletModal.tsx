// ===================================================================
// GRAVYTOS -- Unlock Wallet Modal
// Simple password prompt to unlock (decrypt) a wallet
// ===================================================================

import { useState, useCallback } from 'react';
import { useWalletManager } from '../hooks/useWalletManager';

interface UnlockWalletModalProps {
  isOpen: boolean;
  walletId: string;
  walletName: string;
  onClose: () => void;
  onUnlocked: () => void;
}

export function UnlockWalletModal({ isOpen, walletId, walletName, onClose, onUnlocked }: UnlockWalletModalProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { unlockAndSetAddresses } = useWalletManager();

  const reset = useCallback(() => {
    setPassword('');
    setError('');
    setLoading(false);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleUnlock = useCallback(async () => {
    setError('');
    if (!password) {
      setError('Please enter your password');
      return;
    }
    setLoading(true);
    try {
      await unlockAndSetAddresses(walletId, password);
      reset();
      onUnlocked();
    } catch (err) {
      if (err instanceof Error && err.message.includes('wrong password')) {
        setError('Incorrect password. Please try again.');
      } else {
        setError(err instanceof Error ? err.message : 'Failed to unlock wallet');
      }
    } finally {
      setLoading(false);
    }
  }, [password, walletId, unlockAndSetAddresses, reset, onUnlocked]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock();
    }
  }, [handleUnlock]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative glass-card p-8 w-full max-w-md mx-4">
        {/* Close button */}
        <button onClick={handleClose} className="absolute top-4 right-4 text-white/30 hover:text-white/70 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Lock icon */}
        <div className="w-14 h-14 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-7 h-7 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>

        <h2 className="text-lg font-light tracking-wide text-white/90 text-center mb-1">Unlock Wallet</h2>
        <p className="text-xs font-light text-white/40 text-center mb-6 tracking-wide">{walletName}</p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-light tracking-wider text-white/40 uppercase mb-1.5 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter your wallet password"
              autoFocus
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white/80 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg border border-red-500/20 bg-red-500/5">
              <p className="text-xs text-red-400 font-light">{error}</p>
            </div>
          )}

          <button
            onClick={handleUnlock}
            disabled={loading || !password}
            className="w-full btn-bevel py-3 text-sm disabled:opacity-60"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                Decrypting...
              </span>
            ) : (
              'Unlock'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
