import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PrivacyLevel } from '@gravytos/types';
import { PrivacySlider } from '@gravytos/ui';

const WALLETS = [
  {
    chain: 'Bitcoin',
    symbol: 'BTC',
    address: 'bc1q...x7k2',
    balance: '0.0000',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
  },
  {
    chain: 'Ethereum',
    symbol: 'ETH',
    address: '0x...3f8a',
    balance: '0.0000',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/20',
  },
  {
    chain: 'Solana',
    symbol: 'SOL',
    address: '7xK...m9p',
    balance: '0.0000',
    color: 'text-purple-400',
    bgColor: 'bg-purple-500/10',
    borderColor: 'border-purple-500/20',
  },
];

const COMING_SOON = ['Send', 'Swap', 'Bridge'];

export function Dashboard() {
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevel>(PrivacyLevel.Medium);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gravytos-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <span className="text-lg font-bold">Gravytos</span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="text-xs text-zinc-500 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50">
              Testnet
            </span>
            <button className="px-4 py-2 text-sm font-medium rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-colors">
              Connect Wallet
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column: Wallets */}
          <div className="lg:col-span-2 space-y-6">
            {/* Portfolio Overview */}
            <div className="glass-card p-6">
              <h2 className="text-sm font-medium text-zinc-400 mb-1">Total Portfolio Value</h2>
              <div className="text-3xl font-bold">$0.00</div>
              <p className="text-xs text-zinc-500 mt-1">Connect a wallet to get started</p>
            </div>

            {/* Connected Wallets */}
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Wallets</h3>
              <div className="space-y-3">
                {WALLETS.map((wallet) => (
                  <div
                    key={wallet.symbol}
                    className={`glass-card p-4 flex items-center justify-between hover:border-zinc-700 transition-colors`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${wallet.bgColor} border ${wallet.borderColor} flex items-center justify-center`}>
                        <span className={`text-sm font-bold ${wallet.color}`}>
                          {wallet.symbol.charAt(0)}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{wallet.chain}</div>
                        <div className="text-xs text-zinc-500 font-mono">{wallet.address}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-sm">{wallet.balance} {wallet.symbol}</div>
                      <div className="text-xs text-zinc-500">$0.00</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Coming Soon */}
            <div>
              <h3 className="text-sm font-medium text-zinc-400 mb-3">Actions</h3>
              <div className="grid grid-cols-3 gap-3">
                {COMING_SOON.map((action) => (
                  <button
                    key={action}
                    disabled
                    className="glass-card p-4 text-center opacity-50 cursor-not-allowed"
                  >
                    <div className="text-sm font-medium text-zinc-400">{action}</div>
                    <div className="text-[10px] text-zinc-600 mt-1">Coming soon</div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Privacy & Settings */}
          <div className="space-y-6">
            {/* Privacy Control */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">Privacy Control</h3>
              <PrivacySlider
                value={privacyLevel}
                onChange={setPrivacyLevel}
              />
            </div>

            {/* Active Protections */}
            <div className="glass-card p-6">
              <h3 className="text-sm font-medium text-zinc-400 mb-4">Active Protections</h3>
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
              <h3 className="text-sm font-medium text-zinc-400 mb-2">Audit Trail</h3>
              <p className="text-xs text-zinc-500 mb-4">
                Generate cryptographic proofs to selectively disclose transaction history.
              </p>
              <button
                disabled
                className="w-full px-4 py-2 text-sm font-medium rounded-lg border border-zinc-700 text-zinc-400 opacity-50 cursor-not-allowed"
              >
                Generate Proof (Coming Soon)
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function ProtectionItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-zinc-300">{label}</span>
      <span
        className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
          active
            ? 'bg-green-500/10 text-green-400 border border-green-500/20'
            : 'bg-zinc-800 text-zinc-500 border border-zinc-700'
        }`}
      >
        {active ? 'Active' : 'Off'}
      </span>
    </div>
  );
}
