import React from 'react';
import { Link } from 'react-router-dom';

const FEATURES = [
  {
    title: 'Multi-Chain',
    description: 'Native support for Bitcoin, Ethereum, and Solana with unified key management and cross-chain portfolio view.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.504a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757" />
      </svg>
    ),
  },
  {
    title: 'Privacy Slider',
    description: 'Choose your privacy level per transaction: from fast and cheap to full CoinJoin and stealth addresses.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
  {
    title: 'Audit Trail',
    description: 'Cryptographic audit proofs let you selectively disclose transaction history without exposing your full activity.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  {
    title: 'Non-Custodial',
    description: 'Your keys, your coins. All signing happens locally. No server ever sees your private keys or seed phrases.',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
      </svg>
    ),
  },
];

export function Landing() {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-zinc-800/50 bg-zinc-950/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-gravytos-500 to-purple-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <span className="text-lg font-bold">Gravytos</span>
          </div>
          <Link
            to="/dashboard"
            className="px-4 py-2 text-sm font-medium rounded-lg bg-gravytos-600 hover:bg-gravytos-500 transition-colors"
          >
            Launch App
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gravytos-600/10 blur-[120px]" />
          <div className="absolute top-1/3 left-1/3 w-[400px] h-[400px] rounded-full bg-purple-600/10 blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-800 bg-zinc-900/50 text-xs text-zinc-400 mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Now supporting Bitcoin, Ethereum & Solana
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <span className="gradient-text">Privacy by design.</span>
            <br />
            <span className="text-zinc-100">Auditability on demand.</span>
          </h1>

          <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            The multi-chain wallet that puts you in control. Slide between
            speed and privacy per transaction. Prove what you choose, hide
            what you don't.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link
              to="/dashboard"
              className="px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-gravytos-600 to-purple-600 hover:from-gravytos-500 hover:to-purple-500 transition-all shadow-lg shadow-gravytos-600/25"
            >
              Open Vault
            </Link>
            <a
              href="https://github.com/gravytos"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 rounded-xl font-semibold border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-all"
            >
              View Source
            </a>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Built for the privacy-conscious
            </h2>
            <p className="text-zinc-400 max-w-xl mx-auto">
              Every feature designed around a single principle: you decide
              what the world sees.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="glass-card p-6 hover:border-zinc-700 transition-colors group"
              >
                <div className="w-12 h-12 rounded-xl bg-zinc-800 group-hover:bg-gravytos-600/20 flex items-center justify-center text-zinc-400 group-hover:text-gravytos-400 transition-colors mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-3xl mx-auto text-center glass-card p-12">
          <h2 className="text-2xl md:text-3xl font-bold mb-4">
            Ready to take control?
          </h2>
          <p className="text-zinc-400 mb-8">
            Non-custodial. Open source. Privacy-first. Your keys never
            leave your device.
          </p>
          <Link
            to="/dashboard"
            className="inline-flex px-8 py-3 rounded-xl font-semibold bg-gradient-to-r from-gravytos-600 to-purple-600 hover:from-gravytos-500 hover:to-purple-500 transition-all shadow-lg shadow-gravytos-600/25"
          >
            Launch Dashboard
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between text-sm text-zinc-500">
          <span>Gravytos v0.1.0</span>
          <span>Privacy is not a feature. It's a right.</span>
        </div>
      </footer>
    </div>
  );
}
