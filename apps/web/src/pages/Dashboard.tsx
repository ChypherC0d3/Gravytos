import { useState, useMemo, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyLevel } from '@gravytos/types';
import { PrivacySlider } from '@gravytos/ui';
import { useWalletStore } from '@gravytos/state';
import { ConnectWalletButton } from '../components/ConnectWalletButton';
import { CreateWalletModal } from '../components/CreateWalletModal';
import { UnlockWalletModal } from '../components/UnlockWalletModal';
import { useWalletManager } from '../hooks/useWalletManager';
import type { WalletListEntry } from '../hooks/useWalletManager';

function truncateAddress(address: string | null): string {
  if (!address) return 'Not connected';
  if (address.length <= 12) return address;
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

const WALLET_DEFS = [
  {
    chain: 'Bitcoin',
    symbol: 'BTC',
    storeKey: 'btcAddress' as const,
    balanceChainKey: 'bitcoin-mainnet',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-l-orange-500',
    glowColor: 'hover:shadow-orange-500/5',
  },
  {
    chain: 'Ethereum',
    symbol: 'ETH',
    storeKey: 'evmAddress' as const,
    balanceChainKey: null,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-l-blue-500',
    glowColor: 'hover:shadow-blue-500/5',
  },
  {
    chain: 'Solana',
    symbol: 'SOL',
    storeKey: 'solanaAddress' as const,
    balanceChainKey: 'solana-mainnet',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-l-purple-500',
    glowColor: 'hover:shadow-purple-500/5',
  },
];

const ACTIONS = [
  { label: 'Send', to: '/send', icon: 'M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5' },
  { label: 'Receive', to: '/receive', icon: 'M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3' },
  { label: 'Swap', to: '/swap', icon: 'M3 7.5 7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5' },
  { label: 'Bridge', to: '/bridge', icon: 'M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.504a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757' },
  { label: 'History', to: '/history', icon: 'M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
];

export function Dashboard() {
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(PrivacyLevel.Medium);
  const { evmAddress, solanaAddress, btcAddress, balances, evmChainId } = useWalletStore();

  // Wallet management for CTA and unlock
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<{ id: string; name: string } | null>(null);
  const [walletList, setWalletList] = useState<WalletListEntry[]>([]);
  const { listWallets, isUnlocked, lockWallet } = useWalletManager();

  const hasWallet = walletList.length > 0;
  const hasConnectedAddress = !!(evmAddress || solanaAddress || btcAddress);

  const refreshWallets = useCallback(async () => {
    const list = await listWallets();
    setWalletList(list);
  }, [listWallets]);

  useEffect(() => {
    refreshWallets();
  }, [refreshWallets]);

  const handleLockToggle = useCallback(async (walletId: string, walletName: string) => {
    if (isUnlocked(walletId)) {
      await lockWallet(walletId);
      await refreshWallets();
    } else {
      setUnlockTarget({ id: walletId, name: walletName });
      setShowUnlockModal(true);
    }
  }, [isUnlocked, lockWallet, refreshWallets]);

  const wallets = useMemo(() => {
    return WALLET_DEFS.map((def) => {
      const address = def.storeKey === 'evmAddress' ? evmAddress : def.storeKey === 'solanaAddress' ? solanaAddress : btcAddress;
      const chainKey = def.storeKey === 'evmAddress' && evmChainId ? `ethereum-${evmChainId}` : def.balanceChainKey;
      const chainBalances = chainKey ? balances[chainKey] : undefined;
      const tokenBalance = chainBalances?.[def.symbol];
      return {
        ...def,
        address: truncateAddress(address),
        balance: tokenBalance?.formatted ?? '0.0000',
        connected: !!address,
      };
    });
  }, [evmAddress, solanaAddress, btcAddress, balances, evmChainId]);

  return (
    <div className="min-h-screen dark">
      {/* Header */}
      <header className="border-b border-white/5 bg-[hsl(220,30%,6%)]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
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

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Wallets */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio Overview */}
            <div className="glass-card p-8 relative overflow-hidden">
              <div className="absolute inset-0 opacity-5 gradient-hero" />
              <div className="relative z-10">
                <h2 className="text-sm font-light tracking-wider text-white/40 mb-2 uppercase">Total Portfolio Value</h2>
                <div className="text-4xl font-light tracking-wide glow-text text-gradient">$0.00</div>
                <p className="text-xs font-light text-white/30 mt-2 tracking-wide">
                  {hasConnectedAddress ? 'Wallet connected' : 'Connect a wallet to get started'}
                </p>
              </div>
            </div>

            {/* Create Your First Wallet CTA */}
            {!hasWallet && (
              <div className="glass-card p-8 gradient-border relative overflow-hidden text-center">
                <div className="absolute inset-0 opacity-[0.03] gradient-hero" />
                <div className="relative z-10">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-light tracking-wide text-white/90 mb-2">Create Your First Wallet</h3>
                  <p className="text-sm font-light text-white/40 tracking-wide mb-6 max-w-sm mx-auto">
                    Generate a secure HD wallet with Bitcoin, Ethereum, and Solana addresses derived from a single recovery phrase.
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="btn-bevel py-3 px-8 text-sm inline-block"
                  >
                    Create Wallet
                  </button>
                </div>
              </div>
            )}

            {/* Wallet Lock/Unlock for existing wallets */}
            {hasWallet && !hasConnectedAddress && (
              <div className="glass-card p-5 border border-amber-500/10">
                <div className="flex items-center gap-3 mb-3">
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                  </svg>
                  <span className="text-sm font-light text-white/70 tracking-wide">Unlock a wallet to view your addresses</span>
                </div>
                <div className="space-y-2">
                  {walletList.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => handleLockToggle(w.id, w.name)}
                      className="w-full btn-bevel-outline py-2 px-4 text-xs text-left flex items-center justify-between"
                    >
                      <span>{w.name}</span>
                      <span className={`text-[10px] ${isUnlocked(w.id) ? 'text-emerald-400' : 'text-white/30'}`}>
                        {isUnlocked(w.id) ? 'Unlocked' : 'Click to unlock'}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Connected Wallets */}
            <div>
              <h3 className="text-sm font-light tracking-wider text-white/40 mb-3 uppercase">Wallets</h3>
              <div className="space-y-3">
                {wallets.map((wallet) => (
                  <div
                    key={wallet.symbol}
                    className={`glass-card p-5 flex items-center justify-between border-l-2 ${wallet.borderColor} hover:border-primary/30 transition-all duration-300 ${wallet.glowColor} hover:shadow-lg`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-11 h-11 rounded-2xl ${wallet.bgColor} flex items-center justify-center`}>
                        <span className={`text-sm font-semibold ${wallet.color}`}>
                          {wallet.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-light tracking-wide text-sm text-white/90">{wallet.chain}</span>
                          {wallet.connected && (
                            <span className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                              <span className="text-[10px] font-light text-emerald-400/70">Connected</span>
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-white/30 font-mono mt-0.5">{wallet.address}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-light tracking-wide text-sm text-white/80">{wallet.balance} {wallet.symbol}</div>
                      <div className="text-xs text-white/25">$0.00</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <h3 className="text-sm font-light tracking-wider text-white/40 mb-3 uppercase">Actions</h3>
              <div className="grid grid-cols-3 lg:grid-cols-5 gap-3">
                {ACTIONS.map((action) => (
                  <Link
                    key={action.label}
                    to={action.to}
                    className="glass-card p-5 text-center group hover:border-purple-500/20 transition-all duration-300"
                  >
                    <div className="w-10 h-10 mx-auto rounded-xl bg-white/5 group-hover:bg-purple-500/10 group-hover:shadow-lg group-hover:shadow-purple-500/10 flex items-center justify-center mb-3 transition-all duration-300">
                      <svg className="w-5 h-5 text-white/30 group-hover:text-purple-400 transition-colors duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d={action.icon} />
                      </svg>
                    </div>
                    <div className="text-sm font-light tracking-wide text-white/50 group-hover:text-white/80 transition-colors duration-300">{action.label}</div>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Privacy & Settings */}
          <div className="space-y-6">
            {/* Privacy Control */}
            <div className="glass-card p-6 gradient-border relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] gradient-hero" />
              <div className="relative z-10">
                <h3 className="text-sm font-light tracking-wider text-white/40 mb-4 uppercase">Privacy Control</h3>
                <PrivacySlider
                  value={privacyLevel}
                  onChange={setPrivacyLevel}
                />
              </div>
            </div>

            {/* Active Protections */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-light tracking-wider text-white/40 mb-4 uppercase">Active Protections</h3>
              <div className="space-y-3">
                <ProtectionItem
                  label="RPC Rotation"
                  active={privacyLevel !== PrivacyLevel.Low}
                />
                <ProtectionItem
                  label="Address Rotation"
                  active={privacyLevel !== PrivacyLevel.Low}
                />
                <ProtectionItem
                  label="Transaction Batching"
                  active={privacyLevel !== PrivacyLevel.Low}
                />
                <ProtectionItem
                  label="Stealth Addresses"
                  active={privacyLevel === PrivacyLevel.High}
                />
                <ProtectionItem
                  label="CoinJoin"
                  active={privacyLevel === PrivacyLevel.High}
                />
                <ProtectionItem
                  label="Coin Control"
                  active={privacyLevel === PrivacyLevel.High}
                />
              </div>
            </div>

            {/* Audit Trail */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-light tracking-wider text-white/40 mb-2 uppercase">Audit Trail</h3>
              <p className="text-xs font-light text-white/30 mb-4 tracking-wide">
                Generate cryptographic proofs to selectively disclose transaction history.
              </p>
              <Link
                to="/history"
                className="btn-bevel-outline w-full py-2.5 text-sm"
              >
                View Audit Trail
              </Link>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateWalletModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={refreshWallets}
      />
      {unlockTarget && (
        <UnlockWalletModal
          isOpen={showUnlockModal}
          walletId={unlockTarget.id}
          walletName={unlockTarget.name}
          onClose={() => { setShowUnlockModal(false); setUnlockTarget(null); }}
          onUnlocked={() => { setShowUnlockModal(false); setUnlockTarget(null); refreshWallets(); }}
        />
      )}
    </div>
  );
}

function ProtectionItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs font-light tracking-wide text-white/60">{label}</span>
      <span
        className={`text-[10px] font-medium px-2 py-0.5 rounded-full transition-all duration-300 ${
          active
            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm shadow-emerald-500/10'
            : 'bg-white/5 text-white/25 border border-white/10'
        }`}
      >
        {active ? 'Active' : 'Off'}
      </span>
    </div>
  );
}
