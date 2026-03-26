import { Link } from 'react-router-dom';
import { useEffect, useRef } from 'react';

const FEATURES = [
  {
    title: 'Multi-Chain',
    description: 'Native support for Bitcoin, Ethereum, and Solana with unified key management and cross-chain portfolio view.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m9.86-2.504a4.5 4.5 0 0 0-1.242-7.244l4.5-4.5a4.5 4.5 0 0 1 6.364 6.364l-1.757 1.757" />
      </svg>
    ),
  },
  {
    title: 'Privacy Slider',
    description: 'Choose your privacy level per transaction: from fast and cheap to full CoinJoin and stealth addresses.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 1 1-3 0m3 0a1.5 1.5 0 1 0-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m-9.75 0h9.75" />
      </svg>
    ),
  },
  {
    title: 'Audit Trail',
    description: 'Cryptographic audit proofs let you selectively disclose transaction history without exposing your full activity.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
      </svg>
    ),
  },
  {
    title: 'Non-Custodial',
    description: 'Your keys, your coins. All signing happens locally. No server ever sees your private keys or seed phrases.',
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
      </svg>
    ),
  },
];

const STATS = [
  { value: '3', label: 'Chains Supported' },
  { value: '100%', label: 'Non-Custodial' },
  { value: '0', label: 'Keys Exposed' },
  { value: '3', label: 'Privacy Levels' },
];

const CHAINS = [
  { name: 'Bitcoin', abbr: 'BTC', color: 'text-orange-400' },
  { name: 'Ethereum', abbr: 'ETH', color: 'text-blue-400' },
  { name: 'Solana', abbr: 'SOL', color: 'text-purple-400' },
  { name: 'Polygon', abbr: 'MATIC', color: 'text-violet-400' },
  { name: 'Arbitrum', abbr: 'ARB', color: 'text-sky-400' },
  { name: 'Base', abbr: 'BASE', color: 'text-blue-300' },
  { name: 'Optimism', abbr: 'OP', color: 'text-red-400' },
];

function useScrollReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed');
          }
        });
      },
      { threshold: 0.1 }
    );
    const children = el.querySelectorAll('.scroll-reveal');
    children.forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, []);
  return ref;
}

export function Landing() {
  const scrollRef = useScrollReveal();

  return (
    <div className="min-h-screen dark" ref={scrollRef}>
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[hsl(220,30%,6%)]/80 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center shadow-lg shadow-purple-500/20">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
            </div>
            <span className="text-lg font-light tracking-wide text-white">Gravytos</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/download" className="text-sm font-light text-white/50 hover:text-white/80 transition-colors duration-300 tracking-wide hidden sm:block">
              Download
            </Link>
            <Link to="/dashboard" className="btn-bevel text-sm py-2 px-5">
              Launch App
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 md:pt-36 pb-16 md:pb-24 px-4 md:px-6 overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 -z-10 overflow-hidden hidden md:block">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[700px] h-[700px] rounded-full opacity-20 animate-float" style={{ background: 'radial-gradient(circle, hsla(270, 60%, 55%, 0.4) 0%, transparent 70%)' }} />
          <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, hsla(221, 60%, 55%, 0.4) 0%, transparent 70%)', animationDelay: '2s', animation: 'float 8s ease-in-out infinite' }} />
          <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] rounded-full opacity-15" style={{ background: 'radial-gradient(circle, hsla(165, 60%, 45%, 0.3) 0%, transparent 70%)', animationDelay: '4s', animation: 'float 10s ease-in-out infinite' }} />
        </div>

        <div className="max-w-5xl mx-auto text-center">
          <div className="section-badge mb-8 animate-fade-in">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Now supporting Bitcoin, Ethereum & Solana
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-7xl font-light tracking-wide mb-6 md:mb-8 animate-slide-up">
            <span className="text-gradient">Privacy by design.</span>
            <br />
            <span className="text-white/90 font-extralight">Auditability on demand.</span>
          </h1>

          <p className="text-base md:text-lg lg:text-xl font-light tracking-wide text-white/40 max-w-2xl mx-auto mb-8 md:mb-12 leading-relaxed animate-slide-up" style={{ animationDelay: '0.1s' }}>
            The multi-chain wallet that puts you in control. Slide between
            speed and privacy per transaction. Prove what you choose, hide
            what you don&apos;t.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 md:gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
            <Link to="/dashboard" className="btn-bevel py-3.5 px-10 text-base w-full sm:w-auto text-center min-h-12">
              Open Vault
            </Link>
            <Link
              to="/download"
              className="btn-bevel-outline py-3.5 px-10 text-base w-full sm:w-auto text-center min-h-12"
            >
              Download App
            </Link>
          </div>
        </div>
      </section>

      {/* Chain Logos Row */}
      <section className="py-8 md:py-12 px-4 md:px-6 border-y border-white/5">
        <div className="max-w-4xl mx-auto">
          <p className="text-center text-xs font-light tracking-widest text-white/30 uppercase mb-8">Supported Networks</p>
          <div className="flex items-center justify-center gap-4 md:gap-8 lg:gap-12 flex-wrap">
            {CHAINS.map((chain) => (
              <div key={chain.abbr} className="flex items-center gap-2 opacity-40 hover:opacity-80 transition-opacity duration-300">
                <span className={`text-sm font-semibold ${chain.color}`}>{chain.abbr}</span>
                <span className="text-xs font-light text-white/40 hidden sm:block">{chain.name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 md:py-20 px-4 md:px-6 scroll-reveal">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
            {STATS.map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl md:text-4xl lg:text-5xl font-light text-gradient glow-text mb-2">{stat.value}</div>
                <div className="text-sm font-light tracking-wide text-white/40">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 md:py-20 px-4 md:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10 md:mb-16 scroll-reveal">
            <div className="section-badge mb-4">Features</div>
            <h2 className="section-title mb-4">
              Built for the <span className="text-gradient">privacy-conscious</span>
            </h2>
            <p className="section-subtitle max-w-xl mx-auto">
              Every feature designed around a single principle: you decide
              what the world sees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            {FEATURES.map((feature, i) => (
              <div
                key={feature.title}
                className="scroll-reveal glass-card p-5 md:p-8 group hover:border-purple-500/20 transition-all duration-500"
                style={{ transitionDelay: `${i * 0.1}s` }}
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/10 group-hover:border-purple-500/30 group-hover:shadow-lg group-hover:shadow-purple-500/10 flex items-center justify-center text-white/40 group-hover:text-purple-400 transition-all duration-500 mb-5">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-light tracking-wide mb-3 text-white/90">{feature.title}</h3>
                <p className="text-sm font-light leading-relaxed text-white/40">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 md:py-20 px-4 md:px-6 scroll-reveal">
        <div className="max-w-3xl mx-auto text-center glass-card p-8 md:p-16 relative overflow-hidden">
          {/* Decorative gradient */}
          <div className="absolute inset-0 opacity-5 gradient-hero" />
          <div className="relative z-10">
            <div className="section-badge mb-4">Get Started</div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-light tracking-wide mb-4 text-white/90">
              Ready to take control?
            </h2>
            <p className="font-light text-white/40 mb-10 tracking-wide">
              Non-custodial. Open source. Privacy-first. Your keys never
              leave your device.
            </p>
            <Link to="/dashboard" className="btn-bevel py-3.5 px-10 text-base">
              Launch Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 md:py-12 px-4 md:px-6 pb-20 md:pb-12">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded-lg gradient-hero flex items-center justify-center">
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
                </svg>
              </div>
              <span className="text-sm font-light tracking-wide text-white/50">Gravytos v0.1.0</span>
            </div>
            <nav className="flex items-center gap-6">
              <Link to="/download" className="text-xs font-light text-white/30 hover:text-white/60 transition-colors tracking-wide">Download</Link>
              <Link to="/dashboard" className="text-xs font-light text-white/30 hover:text-white/60 transition-colors tracking-wide">Dashboard</Link>
            </nav>
            <p className="text-xs font-light text-white/20 tracking-wide">Privacy is not a feature. It&apos;s a right.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
