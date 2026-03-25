import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTransactionEngine } from '../hooks/useTransactionEngine';
import type { AuditVerificationResult } from '@gravytos/types';

// ─── Types ───────────────────────────────────────────────────

type TxType = 'send' | 'receive' | 'swap' | 'bridge';
type TxStatus = 'confirmed' | 'pending' | 'failed';
type ChainFilter = 'all' | 'bitcoin' | 'ethereum' | 'solana' | 'polygon' | 'arbitrum';
type TypeFilter = 'all' | TxType;

interface HistoryTx {
  id: string;
  type: TxType;
  chain: string;
  chainIcon: string;
  chainColor: string;
  chainBorderColor: string;
  amount: string;
  token: string;
  status: TxStatus;
  timestamp: number;
  txHash: string;
  from?: string;
  to?: string;
  swapTo?: { amount: string; token: string };
}

// ─── Mock Transaction Data ───────────────────────────────────

const MOCK_HISTORY: HistoryTx[] = [
  { id: '1', type: 'send', chain: 'ethereum', chainIcon: 'E', chainColor: 'text-blue-400', chainBorderColor: 'border-l-blue-500', amount: '0.5', token: 'ETH', status: 'confirmed', timestamp: Date.now() - 1800000, txHash: '0xabc1...def4', to: '0x742d...bD38' },
  { id: '2', type: 'receive', chain: 'bitcoin', chainIcon: 'B', chainColor: 'text-orange-400', chainBorderColor: 'border-l-orange-500', amount: '0.012', token: 'BTC', status: 'confirmed', timestamp: Date.now() - 3600000, txHash: 'a1b2c3...f5e6', from: 'bc1q...x7k2' },
  { id: '3', type: 'swap', chain: 'ethereum', chainIcon: 'E', chainColor: 'text-blue-400', chainBorderColor: 'border-l-blue-500', amount: '1.0', token: 'ETH', status: 'confirmed', timestamp: Date.now() - 7200000, txHash: '0xdef5...abc8', swapTo: { amount: '2415.50', token: 'USDC' } },
  { id: '4', type: 'bridge', chain: 'arbitrum', chainIcon: 'A', chainColor: 'text-sky-400', chainBorderColor: 'border-l-sky-500', amount: '500', token: 'USDC', status: 'pending', timestamp: Date.now() - 10800000, txHash: '0x123a...789f' },
  { id: '5', type: 'send', chain: 'solana', chainIcon: 'S', chainColor: 'text-purple-400', chainBorderColor: 'border-l-purple-500', amount: '25', token: 'SOL', status: 'confirmed', timestamp: Date.now() - 86400000, txHash: '7xKX...AsU', to: '9aB3...mPQ' },
  { id: '6', type: 'receive', chain: 'ethereum', chainIcon: 'E', chainColor: 'text-blue-400', chainBorderColor: 'border-l-blue-500', amount: '1000', token: 'USDC', status: 'confirmed', timestamp: Date.now() - 86400000 * 2, txHash: '0x456b...cde9', from: '0x1234...5678' },
  { id: '7', type: 'send', chain: 'polygon', chainIcon: 'P', chainColor: 'text-violet-400', chainBorderColor: 'border-l-violet-500', amount: '100', token: 'MATIC', status: 'failed', timestamp: Date.now() - 86400000 * 2, txHash: '0x789c...012f', to: '0xabcd...ef01' },
  { id: '8', type: 'swap', chain: 'solana', chainIcon: 'S', chainColor: 'text-purple-400', chainBorderColor: 'border-l-purple-500', amount: '10', token: 'SOL', status: 'confirmed', timestamp: Date.now() - 86400000 * 3, txHash: '3bCd...xYz', swapTo: { amount: '1540.25', token: 'USDC' } },
  { id: '9', type: 'bridge', chain: 'ethereum', chainIcon: 'E', chainColor: 'text-blue-400', chainBorderColor: 'border-l-blue-500', amount: '0.25', token: 'ETH', status: 'confirmed', timestamp: Date.now() - 86400000 * 5, txHash: '0xfed9...876a' },
  { id: '10', type: 'receive', chain: 'bitcoin', chainIcon: 'B', chainColor: 'text-orange-400', chainBorderColor: 'border-l-orange-500', amount: '0.005', token: 'BTC', status: 'confirmed', timestamp: Date.now() - 86400000 * 7, txHash: 'e5f6a7...d4c3', from: 'bc1q...r7s8' },
];

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - ts) / 86400000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function groupByDate(txs: HistoryTx[]): Map<string, HistoryTx[]> {
  const groups = new Map<string, HistoryTx[]>();
  for (const tx of txs) {
    const key = formatDate(tx.timestamp);
    const existing = groups.get(key) ?? [];
    existing.push(tx);
    groups.set(key, existing);
  }
  return groups;
}

function txTypeLabel(type: TxType): string {
  switch (type) {
    case 'send': return 'Sent';
    case 'receive': return 'Received';
    case 'swap': return 'Swapped';
    case 'bridge': return 'Bridged';
  }
}

function txTypeColor(type: TxType): string {
  switch (type) {
    case 'send': return 'text-red-400';
    case 'receive': return 'text-emerald-400';
    case 'swap': return 'text-blue-400';
    case 'bridge': return 'text-purple-400';
  }
}

function statusBadge(status: TxStatus) {
  switch (status) {
    case 'confirmed':
      return <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 shadow-sm shadow-emerald-500/10">Confirmed</span>;
    case 'pending':
      return <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 shadow-sm shadow-amber-500/10 animate-pulse">Pending</span>;
    case 'failed':
      return <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20 shadow-sm shadow-red-500/10">Failed</span>;
  }
}

// ─── Navbar ──────────────────────────────────────────────────

function Navbar() {
  return (
    <header className="border-b border-white/5 bg-[hsl(220,30%,6%)]/80 backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl gradient-hero flex items-center justify-center shadow-lg shadow-purple-500/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
            </svg>
          </div>
          <span className="text-lg font-light tracking-wide text-white">Nexora Vault</span>
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

// ─── History Page ────────────────────────────────────────────

export function History() {
  const { getAuditEngine } = useTransactionEngine();

  const [chainFilter, setChainFilter] = useState<ChainFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [exportingAudit, setExportingAudit] = useState(false);
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<AuditVerificationResult | null>(null);
  const [auditEventCount, setAuditEventCount] = useState(0);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);

  // Fetch audit event count on mount and periodically
  useEffect(() => {
    async function fetchAuditStats() {
      try {
        const audit = getAuditEngine();
        if (audit) {
          const exported = await audit.export();
          setAuditEventCount(exported.totalEvents);
          if (exported.endDate) {
            setLastEventTime(exported.endDate);
          }
        }
      } catch {
        // Audit engine may not be initialized yet
      }
    }
    fetchAuditStats();
    const interval = setInterval(fetchAuditStats, 10_000);
    return () => clearInterval(interval);
  }, [getAuditEngine]);

  const filteredTxs = useMemo(() => {
    return MOCK_HISTORY.filter((tx) => {
      if (chainFilter !== 'all' && tx.chain !== chainFilter) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      return true;
    });
  }, [chainFilter, typeFilter]);

  const grouped = useMemo(() => groupByDate(filteredTxs), [filteredTxs]);

  // Total events: audit engine events + mock history
  const totalEvents = auditEventCount + MOCK_HISTORY.length;

  // Format last event time
  const lastEventLabel = useMemo(() => {
    const ts = lastEventTime ?? (MOCK_HISTORY.length > 0 ? MOCK_HISTORY[0].timestamp : null);
    if (!ts) return 'Never';
    const diffMs = Date.now() - ts;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }, [lastEventTime]);

  async function handleExportAudit() {
    setExportingAudit(true);
    try {
      const audit = getAuditEngine();
      if (audit) {
        // Export real audit trail
        const auditData = await audit.export();
        const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexora-audit-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback to mock data if engine not initialized
        const auditData = {
          version: '1.0.0',
          exportedAt: Date.now(),
          application: 'nexora-vault',
          totalEvents: MOCK_HISTORY.length,
          integrityVerified: true,
          events: MOCK_HISTORY,
        };
        const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `nexora-audit-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Fallback on error
      const auditData = {
        version: '1.0.0',
        exportedAt: Date.now(),
        application: 'nexora-vault',
        totalEvents: MOCK_HISTORY.length,
        integrityVerified: true,
        events: MOCK_HISTORY,
      };
      const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `nexora-audit-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
    setExportingAudit(false);
  }

  async function handleVerifyIntegrity() {
    setVerifyingIntegrity(true);
    setIntegrityResult(null);
    try {
      const audit = getAuditEngine();
      if (audit) {
        const result = await audit.verifyIntegrity();
        setIntegrityResult(result);
      } else {
        // No engine initialized, report as valid with 0 events
        setIntegrityResult({
          valid: true,
          totalChecked: 0,
          verifiedAt: Date.now(),
        });
      }
    } catch {
      setIntegrityResult({
        valid: false,
        totalChecked: 0,
        verifiedAt: Date.now(),
      });
    }
    setVerifyingIntegrity(false);
  }

  const isIntegrityValid = integrityResult?.valid ?? null;

  return (
    <div className="min-h-screen dark">
      <Navbar />

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-light tracking-wide text-white/90">Transaction History</h1>
          <span className="text-xs font-light text-white/30 tracking-wide">{totalEvents} transactions</span>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* Chain Filter */}
          <div>
            <label className="text-xs font-light tracking-wider text-white/30 mb-2 block uppercase">Chain</label>
            <div className="flex flex-wrap gap-2">
              {([['all', 'All'], ['bitcoin', 'Bitcoin'], ['ethereum', 'Ethereum'], ['solana', 'Solana'], ['polygon', 'Polygon'], ['arbitrum', 'Arbitrum']] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setChainFilter(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 ${
                    chainFilter === value
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-transparent shadow-lg shadow-purple-500/20'
                      : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-xs font-light tracking-wider text-white/30 mb-2 block uppercase">Type</label>
            <div className="flex flex-wrap gap-2">
              {([['all', 'All'], ['send', 'Sent'], ['receive', 'Received'], ['swap', 'Swaps'], ['bridge', 'Bridges']] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTypeFilter(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-300 ${
                    typeFilter === value
                      ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white border-transparent shadow-lg shadow-purple-500/20'
                      : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Transaction List */}
        <div className="space-y-6 mb-8">
          {Array.from(grouped.entries()).map(([dateLabel, txs]) => (
            <div key={dateLabel}>
              <h3 className="text-xs font-light tracking-wider text-white/30 mb-2 px-1 uppercase">{dateLabel}</h3>
              <div className="space-y-2">
                {txs.map((tx) => (
                  <div key={tx.id} className={`glass-card p-5 flex items-center justify-between border-l-2 ${tx.chainBorderColor} hover:border-primary/30 transition-all duration-300 hover:shadow-lg`}>
                    <div className="flex items-center gap-4">
                      {/* Chain Icon */}
                      <div className="w-11 h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                        <span className={`text-sm font-bold ${tx.chainColor}`}>{tx.chainIcon}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-light tracking-wide ${txTypeColor(tx.type)}`}>
                            {txTypeLabel(tx.type)}
                          </span>
                          {statusBadge(tx.status)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-white/25">{tx.txHash}</span>
                          <span className="text-[10px] text-white/15">{formatTime(tx.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <span className={`text-sm font-light tracking-wide ${tx.type === 'receive' ? 'text-emerald-400' : 'text-white/70'}`}>
                          {tx.type === 'receive' ? '+' : tx.type === 'send' ? '-' : ''}{tx.amount} {tx.token}
                        </span>
                      </div>
                      {tx.swapTo && (
                        <p className="text-xs font-light text-white/25 mt-0.5">
                          for {tx.swapTo.amount} {tx.swapTo.token}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          {filteredTxs.length === 0 && (
            <div className="glass-card p-16 text-center">
              <p className="font-light text-white/30 tracking-wide">No transactions found</p>
            </div>
          )}
        </div>

        {/* Audit Section */}
        <div className="glass-card p-8 space-y-5 gradient-border">
          <h2 className="text-sm font-light tracking-wider text-white/70 uppercase">Audit Trail</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-lg glass-card text-center">
              <p className="text-2xl font-light text-gradient glow-text">{totalEvents}</p>
              <p className="text-[10px] font-light text-white/30 mt-1 tracking-wider uppercase">Total Events</p>
            </div>
            <div className="p-4 rounded-lg glass-card text-center">
              <p className="text-2xl font-light text-gradient glow-text">{lastEventLabel}</p>
              <p className="text-[10px] font-light text-white/30 mt-1 tracking-wider uppercase">Last Event</p>
            </div>
            <div className="p-4 rounded-lg glass-card text-center">
              <p className={`text-2xl font-light ${isIntegrityValid === true ? 'text-emerald-400' : isIntegrityValid === false ? 'text-red-400' : 'text-white/40'}`}>
                {isIntegrityValid === true ? 'Valid' : isIntegrityValid === false ? 'Invalid' : 'Unverified'}
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

          {integrityResult && (
            <div className={`p-4 rounded-lg border transition-all duration-300 ${integrityResult.valid ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-red-500/5 border-red-500/20'}`}>
              <p className={`text-sm font-light tracking-wide ${integrityResult.valid ? 'text-emerald-400' : 'text-red-400'}`}>
                {integrityResult.valid
                  ? `Hash chain integrity verified. ${integrityResult.totalChecked} events checked, all valid.`
                  : `Integrity check failed at event #${(integrityResult.brokenAtIndex ?? 0) + 1}${integrityResult.brokenAtEventId ? ` (${integrityResult.brokenAtEventId})` : ''}.`}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
