import { useState } from 'react';

interface WalletInfo {
  id: string;
  name: string;
  isUnlocked: boolean;
  createdAt: number;
}

interface WalletSelectorProps {
  wallets: WalletInfo[];
  activeWalletId: string | null;
  onSelect: (walletId: string) => void;
  onCreate: () => void;
  onImport: () => void;
}

export function WalletSelector({ wallets, activeWalletId, onSelect, onCreate, onImport }: WalletSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const active = wallets.find(w => w.id === activeWalletId);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-white/10 hover:border-white/20 text-sm font-light transition-all"
      >
        <div className="w-5 h-5 rounded-lg bg-gradient-to-br from-purple-500/30 to-blue-500/30 flex items-center justify-center text-[10px] font-semibold">
          {active?.name?.charAt(0) || '?'}
        </div>
        <span className="text-white/70">{active?.name || 'No wallet'}</span>
        <svg className={`w-3 h-3 text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full right-0 mt-2 w-64 glass-card rounded-xl p-2 z-50 border border-white/10">
            {wallets.map(w => (
              <button
                key={w.id}
                onClick={() => { onSelect(w.id); setIsOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
                  w.id === activeWalletId ? 'bg-purple-500/20 border border-purple-500/20' : 'hover:bg-white/5 border border-transparent'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-blue-500/20 flex items-center justify-center text-xs font-semibold text-white/60">
                  {w.name.charAt(0)}
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm text-white/90">{w.name}</div>
                  <div className="text-[10px] text-white/30">
                    {w.isUnlocked ? '🟢 Unlocked' : '🔒 Locked'}
                  </div>
                </div>
              </button>
            ))}

            <div className="border-t border-white/10 mt-2 pt-2 space-y-1">
              <button onClick={() => { onCreate(); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-purple-400 hover:bg-white/5 rounded-lg transition-colors font-light">
                + Create new wallet
              </button>
              <button onClick={() => { onImport(); setIsOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-white/40 hover:bg-white/5 rounded-lg transition-colors font-light">
                ↓ Import wallet
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
