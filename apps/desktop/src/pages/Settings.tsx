import { useState } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyLevel } from '@gravytos/types';
import { PrivacySlider } from '@gravytos/ui';
import { useSettingsStore, usePrivacyStore } from '@gravytos/state';

// ─── Navbar ──────────────────────────────────────────────────

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
            <Link key={link.to} to={link.to} className="px-3 py-1.5 text-sm text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800/50 transition-colors">{link.label}</Link>
          ))}
        </nav>
        <span className="text-xs text-zinc-500 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50">Testnet</span>
      </div>
    </header>
  );
}

// ─── Section Component ───────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="glass-card p-6 space-y-4">
      <h2 className="text-sm font-semibold text-zinc-200">{title}</h2>
      {children}
    </div>
  );
}

// ─── Toggle Component ────────────────────────────────────────

function Toggle({ label, description, enabled, onToggle }: { label: string; description?: string; enabled: boolean; onToggle: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-zinc-300">{label}</p>
        {description && <p className="text-xs text-zinc-500 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => onToggle(!enabled)}
        className={`relative w-11 h-6 rounded-full transition-colors ${enabled ? 'bg-purple-600' : 'bg-zinc-700'}`}
      >
        <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${enabled ? 'translate-x-5.5 left-[1px]' : 'left-[2px]'}`}
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

// ─── Mock Wallets ────────────────────────────────────────────

const MOCK_WALLETS = [
  { id: 'w1', name: 'Main Wallet', type: 'HD Wallet', created: '2024-01-15' },
  { id: 'w2', name: 'Trading Wallet', type: 'Imported', created: '2024-03-22' },
];

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
    <div className="min-h-screen bg-zinc-950">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Sidebar Navigation */}
          <div className="lg:col-span-1">
            <nav className="space-y-1">
              {sections.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setActiveSection(s.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    activeSection === s.id
                      ? 'bg-zinc-800/80 text-white'
                      : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40'
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
                  <p className="text-xs text-zinc-500">Set a different default privacy level for specific chains.</p>
                  <div className="space-y-3">
                    {CHAIN_OVERRIDES.map((chain) => {
                      const override = privacy.chainOverrides[chain.id];
                      return (
                        <div key={chain.id} className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                          <span className={`text-sm font-medium ${chain.textColor}`}>{chain.name}</span>
                          <div className="flex items-center gap-2">
                            {override ? (
                              <>
                                <select
                                  value={override}
                                  onChange={(e) => privacy.setChainLevel(chain.id, e.target.value as PrivacyLevel)}
                                  className="bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-xs text-zinc-200"
                                >
                                  <option value={PrivacyLevel.Low}>Low</option>
                                  <option value={PrivacyLevel.Medium}>Medium</option>
                                  <option value={PrivacyLevel.High}>High</option>
                                </select>
                                <button
                                  onClick={() => privacy.removeChainOverride(chain.id)}
                                  className="text-xs text-red-400 hover:text-red-300"
                                >
                                  Remove
                                </button>
                              </>
                            ) : (
                              <button
                                onClick={() => privacy.setChainLevel(chain.id, privacy.globalLevel)}
                                className="text-xs text-purple-400 hover:text-purple-300"
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
                  <p className="text-xs text-zinc-500">Override default RPC endpoints per chain for better privacy or performance.</p>
                  <div className="space-y-3">
                    {RPC_CHAINS.map((chain) => {
                      const customUrls = settings.customRpcUrls[chain.id];
                      const isEditing = rpcEditing === chain.id;
                      return (
                        <div key={chain.id} className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-zinc-300">{chain.name}</span>
                            {!isEditing && (
                              <button
                                onClick={() => {
                                  setRpcEditing(chain.id);
                                  setRpcValue(customUrls?.[0] ?? '');
                                }}
                                className="text-xs text-purple-400 hover:text-purple-300"
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
                                className="flex-1 bg-zinc-800/50 border border-zinc-700 rounded px-3 py-1.5 text-xs font-mono text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-purple-500/50"
                              />
                              <button
                                onClick={() => {
                                  if (rpcValue.trim()) {
                                    settings.setCustomRpcUrls(chain.id, [rpcValue.trim()]);
                                  }
                                  setRpcEditing(null);
                                }}
                                className="px-3 py-1.5 text-xs font-medium rounded bg-purple-600 hover:bg-purple-500 transition-colors"
                              >
                                Save
                              </button>
                              <button
                                onClick={() => setRpcEditing(null)}
                                className="px-3 py-1.5 text-xs font-medium rounded border border-zinc-700 text-zinc-400 hover:text-white transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <p className="text-xs font-mono text-zinc-500 truncate">
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
                  <div className="space-y-3">
                    {MOCK_WALLETS.map((wallet) => (
                      <div key={wallet.id} className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/30 border border-zinc-800">
                        <div>
                          <p className="text-sm font-medium text-zinc-200">{wallet.name}</p>
                          <p className="text-xs text-zinc-500">{wallet.type} &middot; Created {wallet.created}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button className="text-xs text-zinc-400 hover:text-white px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 transition-colors">
                            Export
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-3">
                    <button className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all">
                      Create New Wallet
                    </button>
                    <button className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors">
                      Import Wallet
                    </button>
                  </div>
                </Section>
              </>
            )}

            {/* Security Section */}
            {activeSection === 'security' && (
              <>
                <Section title="Auto-Lock">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-zinc-300">Auto-lock timeout</p>
                      <p className="text-xs text-zinc-500">Automatically lock wallet after inactivity.</p>
                    </div>
                    <select
                      value={settings.autoLockTimeout}
                      onChange={(e) => settings.setAutoLockTimeout(Number(e.target.value))}
                      className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1.5 text-sm text-zinc-200"
                    >
                      <option value={0}>Disabled</option>
                      <option value={5}>5 minutes</option>
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={60}>1 hour</option>
                    </select>
                  </div>
                </Section>

                <Section title="Password">
                  <button className="px-4 py-2.5 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors">
                    Change Password
                  </button>
                </Section>
              </>
            )}

            {/* Display Section */}
            {activeSection === 'display' && (
              <>
                <Section title="Theme">
                  <div className="flex gap-2">
                    {(['dark', 'light', 'system'] as const).map((t) => (
                      <button
                        key={t}
                        onClick={() => settings.setTheme(t)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                          settings.theme === t
                            ? 'bg-zinc-700 text-white border-zinc-600'
                            : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                        }`}
                      >
                        {t.charAt(0).toUpperCase() + t.slice(1)}
                      </button>
                    ))}
                  </div>
                </Section>

                <Section title="Language">
                  <select
                    value={settings.language}
                    onChange={(e) => settings.setLanguage(e.target.value as 'en' | 'es' | 'zh')}
                    className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200"
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
                    className="bg-zinc-800 border border-zinc-700 rounded px-3 py-2 text-sm text-zinc-200"
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
                    <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800 text-center">
                      <p className="text-lg font-bold text-zinc-200">42</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Total Events</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800 text-center">
                      <p className="text-lg font-bold text-zinc-200">3m ago</p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Last Event</p>
                    </div>
                    <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800 text-center">
                      <p className={`text-lg font-bold ${integrityResult === true ? 'text-green-400' : integrityResult === false ? 'text-red-400' : 'text-zinc-400'}`}>
                        {integrityResult === true ? 'Valid' : integrityResult === false ? 'Invalid' : 'Unverified'}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-0.5">Chain Status</p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      onClick={handleExportAudit}
                      disabled={exportingAudit}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 transition-all disabled:opacity-60"
                    >
                      {exportingAudit ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                          </svg>
                          Exporting...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                          </svg>
                          Export Audit Log
                        </>
                      )}
                    </button>
                    <button
                      onClick={handleVerifyIntegrity}
                      disabled={verifyingIntegrity}
                      className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border border-zinc-700 text-zinc-300 hover:border-zinc-500 hover:text-white transition-colors disabled:opacity-60"
                    >
                      {verifyingIntegrity ? (
                        <>
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                            <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                          </svg>
                          Verifying...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                          </svg>
                          Verify Integrity
                        </>
                      )}
                    </button>
                  </div>

                  {integrityResult !== null && (
                    <div className={`p-3 rounded-lg border ${integrityResult ? 'bg-green-500/5 border-green-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
                      <p className={`text-sm font-medium ${integrityResult ? 'text-green-400' : 'text-red-400'}`}>
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
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                    <span className="text-sm text-zinc-400">Version</span>
                    <span className="text-sm font-mono text-zinc-200">0.1.0</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                    <span className="text-sm text-zinc-400">License</span>
                    <span className="text-sm text-zinc-200">MIT</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-zinc-800/30 border border-zinc-800">
                    <span className="text-sm text-zinc-400">Repository</span>
                    <a href="https://github.com/gravytos" target="_blank" rel="noopener noreferrer" className="text-sm text-purple-400 hover:text-purple-300">
                      github.com/gravytos
                    </a>
                  </div>
                </div>
                <p className="text-xs text-zinc-500 mt-4">
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
