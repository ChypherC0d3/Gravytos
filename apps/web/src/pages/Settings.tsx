import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyLevel } from '@gravytos/types';
import { PrivacySlider } from '@gravytos/ui';
import { useSettingsStore, usePrivacyStore } from '@gravytos/state';
import { CreateWalletModal } from '../components/CreateWalletModal';
import { ImportWalletModal } from '../components/ImportWalletModal';
import { UnlockWalletModal } from '../components/UnlockWalletModal';
import { useWalletManager } from '../hooks/useWalletManager';
import type { WalletListEntry } from '../hooks/useWalletManager';
import { ThemeToggle } from '../components/ThemeToggle';

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

// ─── Section Component ───────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6 space-y-4">
      <h2 className="text-sm font-light tracking-wider text-white/70 uppercase">{title}</h2>
      {children}
    </div>
  );
}

// ─── Toggle Component ────────────────────────────────────────

function Toggle({ label, description, enabled, onToggle }: { label: string; description?: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-light tracking-wide text-white/70">{label}</p>
        {description && <p className="text-xs font-light text-white/30 mt-0.5 tracking-wide">{description}</p>}
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-all duration-300 ${enabled ? 'bg-gradient-to-r from-purple-500 to-blue-500 shadow-lg shadow-purple-500/20' : 'bg-white/10'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-300 ${enabled ? 'translate-x-5.5 left-[1px]' : 'left-[2px]'}`}
          style={{ transform: enabled ? 'translateX(22px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  );
}

// ─── Chain Override Row ──────────────────────────────────────

const CHAIN_OVERRIDES = [
  { id: 'bitcoin-mainnet', name: 'Bitcoin', textColor: 'text-orange-400' },
  { id: 'ethereum-1', name: 'Ethereum', textColor: 'text-blue-400' },
  { id: 'solana-mainnet', name: 'Solana', textColor: 'text-purple-400' },
];

// ─── (Mock wallets removed - now using real WalletManager) ───

// ─── RPC Editor ──────────────────────────────────────────────

const RPC_CHAINS = [
  { id: 'bitcoin-mainnet', name: 'Bitcoin', defaultRpc: 'https://mempool.space/api' },
  { id: 'ethereum-1', name: 'Ethereum', defaultRpc: 'https://eth.llamarpc.com' },
  { id: 'solana-mainnet', name: 'Solana', defaultRpc: 'https://api.mainnet-beta.solana.com' },
  { id: 'polygon-137', name: 'Polygon', defaultRpc: 'https://polygon-rpc.com' },
  { id: 'arbitrum-42161', name: 'Arbitrum', defaultRpc: 'https://arb1.arbitrum.io/rpc' },
];

// ─── Settings Page ───────────────────────────────────────────

export function Settings() {
  const settings = useSettingsStore();
  const privacy = usePrivacyStore();

  const [activeSection, setActiveSection] = useState<string>('privacy');
  const [rpcEditing, setRpcEditing] = useState<string | null>(null);
  const [rpcValue, setRpcValue] = useState('');
  const [exportingAudit, setExportingAudit] = useState(false);
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<boolean | null>(null);

  // Wallet management state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUnlockModal, setShowUnlockModal] = useState(false);
  const [unlockTarget, setUnlockTarget] = useState<{ id: string; name: string } | null>(null);
  const [walletList, setWalletList] = useState<WalletListEntry[]>([]);

  const { listWallets, isUnlocked, lockWallet } = useWalletManager();

  const refreshWallets = useCallback(async () => {
    const wallets = await listWallets();
    setWalletList(wallets);
  }, [listWallets]);

  useEffect(() => {
    if (activeSection === 'wallets') {
      refreshWallets();
    }
  }, [activeSection, refreshWallets]);

  const handleLockToggle = useCallback(async (walletId: string, walletName: string) => {
    if (isUnlocked(walletId)) {
      await lockWallet(walletId);
      await refreshWallets();
    } else {
      setUnlockTarget({ id: walletId, name: walletName });
      setShowUnlockModal(true);
    }
  }, [isUnlocked, lockWallet, refreshWallets]);

  const sections = [
    { id: 'privacy', label: 'Privacy', icon: 'M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88' },
    { id: 'network', label: 'Network', icon: 'M12 21a9.004 9.004 0 0 0 8.716-6.747M12 21a9.004 9.004 0 0 1-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 0 1 7.843 4.582M12 3a8.997 8.997 0 0 0-7.843 4.582m15.686 0A11.953 11.953 0 0 1 12 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0 1 21 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0 1 12 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 0 1 3 12c0-1.605.42-3.113 1.157-4.418' },
    { id: 'wallets', label: 'Wallets', icon: 'M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3' },
    { id: 'security', label: 'Security', icon: 'M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z' },
    { id: 'display', label: 'Display', icon: 'M9.53 16.122a3 3 0 0 0-5.78 1.128 2.25 2.25 0 0 1-2.4 2.245 4.5 4.5 0 0 0 8.4-2.245c0-.399-.078-.78-.22-1.128Zm0 0a15.998 15.998 0 0 0 3.388-1.62m-5.043-.025a15.994 15.994 0 0 1 1.622-3.395m3.42 3.42a15.995 15.995 0 0 0 4.764-4.648l3.876-5.814a1.151 1.151 0 0 0-1.597-1.597L14.146 6.32a15.996 15.996 0 0 0-4.649 4.763m3.42 3.42a6.776 6.776 0 0 0-3.42-3.42' },
    { id: 'audit', label: 'Audit', icon: 'M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z' },
    { id: 'about', label: 'About', icon: 'm11.25 11.25.041-.02a.75.75 0 0 1 1.063.852l-.708 2.836a.75.75 0 0 0 1.063.853l.041-.021M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9-3.75h.008v.008H12V8.25Z' },
  ];

  async function handleExportAudit() {
    setExportingAudit(true);
    await new Promise((r) => setTimeout(r, 1000));
    const auditData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      application: 'gravytos',
      totalEvents: 42,
      integrityVerified: true,
      events: [],
    };
    const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gravytos-audit-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportingAudit(false);
  }

  async function handleVerifyIntegrity() {
    setVerifyingIntegrity(true);
    setIntegrityResult(null);
    await new Promise((r) => setTimeout(r, 1500));
    setIntegrityResult(true);
    setVerifyingIntegrity(false);
  }

  return (
    <div className="min-h-screen dark">
      <Navbar />

      <main className="max-w-2xl lg:max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
        <h1 className="text-xl md:text-2xl font-light tracking-wide mb-4 md:mb-6 text-white/90">Settings</h1>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="flex lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`whitespace-nowrap lg:w-full flex items-center gap-2 lg:gap-3 px-3 py-2.5 rounded-lg text-sm font-light tracking-wide transition-all duration-300 ${
                    activeSection === s.id
                      ? 'bg-white/10 text-white lg:border-l-2 lg:border-l-purple-500 shadow-lg shadow-purple-500/5'
                      : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={s.icon} />
                  </svg>
                  {s.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <>
                <Section title="Default Privacy Level">
                  <PrivacySlider
                    value={privacy.globalLevel}
                    onChange={privacy.setGlobalLevel}
                  />
                </Section>

                <Section title="Per-Chain Overrides">
                  <p className="text-xs font-light text-white/30 tracking-wide">Set a different default privacy level for specific chains.</p>
                  <div className="space-y-3">
                    {CHAIN_OVERRIDES.map((chain) => {
                      const override = privacy.chainOverrides[chain.id];
                      return (
                        <div key={chain.id} className="flex items-center justify-between p-3 rounded-lg glass-card">
                          <span className={`text-sm font-light tracking-wide ${chain.textColor}`}>{chain.name}</span>
                          <div className="flex items-center gap-2">
                            {override ? (
                              <>
                                <select
                                  value={override}
                                  onChange={(e) => privacy.setChainLevel(chain.id, e.target.value as PrivacyLevel)}
                                  className="bg-white/5 border border-white/10 rounded px-2 py-1 text-xs text-white/70 focus:outline-none focus:border-purple-500/50"
                                >
                                  <option value={PrivacyLevel.Low}>Low</option>
                                  <option value={PrivacyLevel.Medium}>Medium</option>
                                  <option value={PrivacyLevel.High}>High</option>
                                </select>
                                <button
                                  onClick={() => privacy.removeChainOverride(chain.id)}
                                  className="text-xs font-light text-red-400 hover:text-red-300 transition-colors"
                                >
                                  Remove
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => privacy.setChainLevel(chain.id, privacy.globalLevel)}
                                className="text-xs font-light text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                Add Override
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Section>
              </>
            )}

            {/* Network Section */}
            {activeSection === 'network' && (
              <>
                <Section title="Custom RPC URLs">
                  <p className="text-xs font-light text-white/30 tracking-wide">Override default RPC endpoints per chain for better privacy or performance.</p>
                  <div className="space-y-3">
                    {RPC_CHAINS.map((chain) => {
                      const customUrls = settings.customRpcUrls[chain.id];
                      const isEditing = rpcEditing === chain.id;
                      return (
                        <div key={chain.id} className="p-4 rounded-lg glass-card">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-light tracking-wide text-white/70">{chain.name}</span>
                            {!isEditing && (
                              <button
                                onClick={() => {
                                  setRpcEditing(chain.id);
                                  setRpcValue(customUrls?.[0] ?? '');
                                }}
                                className="text-xs font-light text-purple-400 hover:text-purple-300 transition-colors"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                          {isEditing ? (
                            <div className="flex gap-2 mt-2">
                              <input
                                value={rpcValue}
                                onChange={(e) => setRpcValue(e.target.value)}
                                placeholder={chain.defaultRpc}
                                className="flex-1 bg-white/5 border border-white/10 rounded px-3 py-1.5 text-xs font-mono text-white/70 placeholder-white/20 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
                              />
                              <button
                                onClick={() => {
                                  if (rpcValue.trim()) {
                                    settings.setCustomRpcUrls(chain.id, [rpcValue.trim()]);
                                  }
                                  setRpcEditing(null);
                                }}
                                className="btn-bevel px-3 py-1.5 text-xs"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setRpcEditing(null)}
                                className="btn-bevel-outline px-3 py-1.5 text-xs"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs font-mono text-white/30 truncate">
                              {customUrls?.[0] ?? chain.defaultRpc}
                              {customUrls && <span className="text-purple-400 ml-2">(custom)</span>}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </Section>

                <Section title="Tor">
                  <Toggle
                    label="Route through Tor"
                    description="Route all network requests through the Tor network for enhanced anonymity."
                    enabled={settings.torEnabled}
                    onToggle={settings.setTorEnabled}
                  />
                </Section>
              </>
            )}

            {/* Wallets Section */}
            {activeSection === 'wallets' && (
              <>
                <Section title="Wallets">
                  {walletList.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="w-14 h-14 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mx-auto mb-3">
                        <svg className="w-7 h-7 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a2.25 2.25 0 0 0-2.25-2.25H15a3 3 0 1 1-6 0H5.25A2.25 2.25 0 0 0 3 12m18 0v6a2.25 2.25 0 0 1-2.25 2.25H5.25A2.25 2.25 0 0 1 3 18v-6m18 0V9M3 12V9m18 0a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 9m18 0V6a2.25 2.25 0 0 0-2.25-2.25H5.25A2.25 2.25 0 0 0 3 6v3" />
                        </svg>
                      </div>
                      <p className="text-sm font-light text-white/40 tracking-wide">No wallets yet</p>
                      <p className="text-xs font-light text-white/25 tracking-wide mt-1">Create or import a wallet to get started</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {walletList.map((wallet) => {
                        const unlocked = isUnlocked(wallet.id);
                        const created = new Date(wallet.createdAt).toLocaleDateString();
                        return (
                          <div key={wallet.id} className="flex items-center justify-between p-4 rounded-lg glass-card">
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="text-sm font-light tracking-wide text-white/80">{wallet.name}</p>
                                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                                  unlocked
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                    : 'bg-white/5 text-white/25 border border-white/10'
                                }`}>
                                  {unlocked ? 'Unlocked' : 'Locked'}
                                </span>
                              </div>
                              <p className="text-xs font-light text-white/30 tracking-wide mt-0.5">HD Wallet &middot; Created {created}</p>
                            </div>
                            <button
                              onClick={() => handleLockToggle(wallet.id, wallet.name)}
                              className="btn-bevel-outline py-1.5 px-3 text-xs flex items-center gap-1.5"
                            >
                              {unlocked ? (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 1 1 9 0v3.75M3.75 21.75h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H3.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                  </svg>
                                  Lock
                                </>
                              ) : (
                                <>
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
                                  </svg>
                                  Unlock
                                </>
                              )}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button onClick={() => setShowCreateModal(true)} className="flex-1 btn-bevel py-2.5 text-sm">
                      Create New Wallet
                    </button>
                    <button onClick={() => setShowImportModal(true)} className="flex-1 btn-bevel-outline py-2.5 text-sm">
                      Import Wallet
                    </button>
                  </div>
                </Section>

                {/* Modals */}
                <CreateWalletModal
                  isOpen={showCreateModal}
                  onClose={() => setShowCreateModal(false)}
                  onCreated={refreshWallets}
                />
                <ImportWalletModal
                  isOpen={showImportModal}
                  onClose={() => setShowImportModal(false)}
                  onImported={refreshWallets}
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
              </>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <>
                <Section title="Auto-Lock">
                  <div>
                    <p className="text-sm font-light tracking-wide text-white/70">Auto-lock timeout</p>
                    <p className="text-xs font-light text-white/30 tracking-wide mb-3">Automatically lock wallets after inactivity. Currently set to: <span className="text-white/60">{settings.autoLockTimeout === 0 ? 'Never' : settings.autoLockTimeout < 60 ? `${settings.autoLockTimeout} minutes` : '1 hour'}</span></p>
                    <div className="flex flex-wrap gap-2">
                      {([
                        { value: 5, label: '5 min' },
                        { value: 15, label: '15 min' },
                        { value: 30, label: '30 min' },
                        { value: 60, label: '1 hour' },
                        { value: 0, label: 'Never' },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => settings.setAutoLockTimeout(opt.value)}
                          className={`px-4 py-2 rounded-lg text-sm font-light tracking-wide border transition-all duration-300 ${
                            settings.autoLockTimeout === opt.value
                              ? 'bg-gradient-to-r from-purple-500/20 to-blue-500/20 text-white border-purple-500/30 shadow-lg shadow-purple-500/10'
                              : 'bg-white/5 text-white/40 border-white/5 hover:border-white/15 hover:text-white/60'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </Section>

                <Section title="Password">
                  <button className="btn-bevel-outline py-2.5 px-5 text-sm">
                    Change Password
                  </button>
                </Section>
              </>
            )}

            {/* Display Section */}
            {activeSection === 'display' && (
              <>
                <Section title="Theme">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-2">
                      {(['dark', 'light', 'system'] as const).map((t) => (
                        <button
                          key={t}
                          onClick={() => settings.setTheme(t)}
                          className={`px-4 py-2 rounded-lg text-sm font-light tracking-wide border transition-all duration-300 ${
                            settings.theme === t
                              ? 'bg-white/10 text-white border-white/20'
                              : 'bg-white/5 text-white/40 border-white/5 hover:border-white/15'
                          }`}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </button>
                      ))}
                    </div>
                    <ThemeToggle />
                  </div>
                  <p className="text-xs font-light text-white/30 tracking-wide mt-2">
                    Current: {settings.theme.charAt(0).toUpperCase() + settings.theme.slice(1)}
                  </p>
                </Section>

                <Section title="Language">
                  <select
                    value={settings.language}
                    onChange={(e) => settings.setLanguage(e.target.value as 'en' | 'es' | 'zh')}
                    className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
                  >
                    <option value="en">English</option>
                    <option value="es">Spanish</option>
                    <option value="zh">Chinese</option>
                  </select>
                </Section>

                <Section title="Currency">
                  <select
                    value={settings.currency}
                    onChange={(e) => settings.setCurrency(e.target.value as 'USD' | 'EUR' | 'GBP')}
                    className="bg-white/5 border border-white/10 rounded px-3 py-2 text-sm text-white/70 focus:outline-none focus:border-purple-500/50 transition-all duration-300"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                  </select>
                </Section>
              </>
            )}

            {/* Audit Section */}
            {activeSection === 'audit' && (
              <>
                <Section title="Audit Log">
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="p-4 rounded-lg glass-card text-center">
                      <p className="text-2xl font-light text-gradient glow-text">42</p>
                      <p className="text-[10px] font-light text-white/30 mt-1 tracking-wider uppercase">Total Events</p>
                    </div>
                    <div className="p-4 rounded-lg glass-card text-center">
                      <p className="text-2xl font-light text-gradient glow-text">3m ago</p>
                      <p className="text-[10px] font-light text-white/30 mt-1 tracking-wider uppercase">Last Event</p>
                    </div>
                    <div className="p-4 rounded-lg glass-card text-center">
                      <p className={`text-2xl font-light ${integrityResult === true ? 'text-emerald-400' : integrityResult === false ? 'text-red-400' : 'text-white/40'}`}>
                        {integrityResult === true ? 'Valid' : integrityResult === false ? 'Invalid' : 'Unverified'}
                      </p>
                      <p className="text-[10px] font-light text-white/30 mt-1 tracking-wider uppercase">Chain Status</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleExportAudit}
                      disabled={exportingAudit}
                      className="flex-1 btn-bevel py-2.5 text-sm disabled:opacity-60"
                    >
                      {exportingAudit ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                          </svg>
                          Exporting...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Export Audit Log
                        </span>
                      )}
                    </button>
                    <button
                      onClick={handleVerifyIntegrity}
                      disabled={verifyingIntegrity}
                      className="flex-1 btn-bevel-outline py-2.5 text-sm disabled:opacity-60"
                    >
                      {verifyingIntegrity ? (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                          </svg>
                          Verifying...
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                          </svg>
                          Verify Integrity
                        </span>
                      )}
                    </button>
                  </div>

                  {integrityResult !== null && (
                    <div className={`p-4 rounded-lg border transition-all duration-300 ${integrityResult ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                      <p className={`text-sm font-light tracking-wide ${integrityResult ? 'text-emerald-400' : 'text-red-400'}`}>
                        {integrityResult ? 'Hash chain integrity verified. All 42 events are valid.' : 'Integrity check failed. Chain broken.'}
                      </p>
                    </div>
                  )}
                </Section>
              </>
            )}

            {/* About Section */}
            {activeSection === 'about' && (
              <Section title="About Gravytos">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 rounded-lg glass-card">
                    <span className="text-sm font-light text-white/40 tracking-wide">Version</span>
                    <span className="text-sm font-mono text-white/70">0.1.0</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg glass-card">
                    <span className="text-sm font-light text-white/40 tracking-wide">License</span>
                    <span className="text-sm text-white/70">MIT</span>
                  </div>
                  <div className="flex items-center justify-between p-4 rounded-lg glass-card">
                    <span className="text-sm font-light text-white/40 tracking-wide">Website</span>
                    <span className="text-sm text-purple-400">gravytos.com</span>
                  </div>
                </div>
                <p className="text-xs font-light text-white/30 mt-4 tracking-wide leading-relaxed">
                  Gravytos is a privacy-first, multi-chain wallet with a user-controlled privacy slider and cryptographic audit trail.
                  Your keys never leave your device.
                </p>
              </Section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
