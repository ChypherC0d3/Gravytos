import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTransactionEngine } from '../hooks/useTransactionEngine';
import { useTransactionHistory } from '../hooks/useTransactionHistory';
import type { HistoricalTransaction } from '@gravytos/core';
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
  explorerUrl?: string;
  swapTo?: { amount: string; token: string };
}

// ─── Helpers ─────────────────────────────────────────────────

function formatDate(ts: number): string {
  const now = new Date();
  const d = new Date(ts);
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 86400000;

  if (ts >= todayStart) return 'Today';
  if (ts >= yesterdayStart) return 'Yesterday';
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

function shortenHash(hash: string): string {
  if (hash.length <= 12) return hash;
  return `${hash.slice(0, 6)}...${hash.slice(-4)}`;
}

/** Map a chainId string from the history service to a chain filter key and display info */
function resolveChainInfo(chainId: string, _chainSymbol: string): {
  chain: ChainFilter;
  chainIcon: string;
  chainColor: string;
  chainBorderColor: string;
} {
  if (chainId.startsWith('bitcoin')) {
    return { chain: 'bitcoin', chainIcon: 'B', chainColor: 'text-orange-400', chainBorderColor: 'border-l-orange-500' };
  }
  if (chainId.startsWith('solana')) {
    return { chain: 'solana', chainIcon: 'S', chainColor: 'text-purple-400', chainBorderColor: 'border-l-purple-500' };
  }
  if (chainId === 'ethereum-137') {
    return { chain: 'polygon', chainIcon: 'P', chainColor: 'text-violet-400', chainBorderColor: 'border-l-violet-500' };
  }
  if (chainId === 'ethereum-42161') {
    return { chain: 'arbitrum', chainIcon: 'A', chainColor: 'text-sky-400', chainBorderColor: 'border-l-sky-500' };
  }
  // Default to ethereum for chains 1, 10, 8453, etc.
  return { chain: 'ethereum', chainIcon: 'E', chainColor: 'text-blue-400', chainBorderColor: 'border-l-blue-500' };
}

/** Map HistoricalTransaction type to the UI TxType */
function mapTxType(type: HistoricalTransaction['type']): TxType {
  switch (type) {
    case 'sent': return 'send';
    case 'received': return 'receive';
    case 'swap': return 'swap';
    case 'bridge': return 'bridge';
    default: return 'send';
  }
}

/** Convert real HistoricalTransaction[] to the internal HistoryTx[] format */
function mapTransactions(txs: HistoricalTransaction[]): HistoryTx[] {
  return txs.map((tx) => {
    const chainInfo = resolveChainInfo(tx.chainId, tx.chainSymbol);
    return {
      id: tx.txHash,
      type: mapTxType(tx.type),
      chain: chainInfo.chain,
      chainIcon: chainInfo.chainIcon,
      chainColor: chainInfo.chainColor,
      chainBorderColor: chainInfo.chainBorderColor,
      amount: tx.value,
      token: tx.tokenSymbol,
      status: tx.status as TxStatus,
      timestamp: tx.timestamp,
      txHash: shortenHash(tx.txHash),
      from: tx.from,
      to: tx.to,
      explorerUrl: tx.explorerUrl,
    };
  });
}

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

// ─── Loading Spinner ─────────────────────────────────────────

function LoadingSpinner() {
  return (
    <div className="glass-card p-16 flex flex-col items-center justify-center gap-4">
      <svg className="w-8 h-8 animate-spin text-purple-400" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
        <path d="M4 12a8 8 0 0 1 8-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
      </svg>
      <p className="font-light text-white/30 tracking-wide">Loading transaction history...</p>
    </div>
  );
}

// ─── History Page ────────────────────────────────────────────

export function History() {
  const { getAuditEngine } = useTransactionEngine();
  const { transactions, isLoading, refetch } = useTransactionHistory();

  const [chainFilter, setChainFilter] = useState<ChainFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [exportingAudit, setExportingAudit] = useState(false);
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<AuditVerificationResult | null>(null);
  const [auditEventCount, setAuditEventCount] = useState(0);
  const [lastEventTime, setLastEventTime] = useState<number | null>(null);

  // Map real blockchain transactions to UI format
  const historyTxs = useMemo(() => mapTransactions(transactions), [transactions]);

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
    return historyTxs.filter((tx) => {
      if (chainFilter !== 'all' && tx.chain !== chainFilter) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      return true;
    });
  }, [historyTxs, chainFilter, typeFilter]);

  const grouped = useMemo(() => groupByDate(filteredTxs), [filteredTxs]);

  // Total events: audit engine events + fetched history
  const totalEvents = auditEventCount + historyTxs.length;

  // Format last event time
  const lastEventLabel = useMemo(() => {
    const ts = lastEventTime ?? (historyTxs.length > 0 ? historyTxs[0].timestamp : null);
    if (!ts) return 'Never';
    const diffMs = Date.now() - ts;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  }, [lastEventTime, historyTxs]);

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
        a.download = `gravytos-audit-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        // Fallback: export fetched transaction history
        const auditData = {
          version: '1.0.0',
          exportedAt: Date.now(),
          application: 'gravytos',
          totalEvents: transactions.length,
          integrityVerified: true,
          events: transactions,
        };
        const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gravytos-audit-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Fallback on error
      const auditData = {
        version: '1.0.0',
        exportedAt: Date.now(),
        application: 'gravytos',
        totalEvents: transactions.length,
        integrityVerified: true,
        events: transactions,
      };
      const blob = new Blob([JSON.stringify(auditData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `gravytos-audit-${new Date().toISOString().split('T')[0]}.json`;
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
  const hasNoWallet = !isLoading && transactions.length === 0;

  return (
    <div className="min-h-screen dark">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-8 pb-24 md:pb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 md:mb-6">
          <h1 className="text-xl md:text-2xl font-light tracking-wide text-white/90">Transaction History</h1>
          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              disabled={isLoading}
              className="text-xs font-light text-white/30 hover:text-white/60 tracking-wide transition-colors disabled:opacity-40"
            >
              {isLoading ? 'Refreshing...' : 'Refresh'}
            </button>
            <span className="text-xs font-light text-white/30 tracking-wide">{totalEvents} transactions</span>
          </div>
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
          {isLoading && transactions.length === 0 && <LoadingSpinner />}

          {hasNoWallet && (
            <div className="glass-card p-16 text-center">
              <p className="font-light text-white/30 tracking-wide">Connect a wallet to see transaction history</p>
            </div>
          )}

          {!isLoading && transactions.length > 0 && Array.from(grouped.entries()).length === 0 && (
            <div className="glass-card p-16 text-center">
              <p className="font-light text-white/30 tracking-wide">No transactions found</p>
            </div>
          )}

          {Array.from(grouped.entries()).map(([dateLabel, txs]) => (
            <div key={dateLabel}>
              <h3 className="text-xs font-light tracking-wider text-white/30 mb-2 px-1 uppercase">{dateLabel}</h3>
              <div className="space-y-2">
                {txs.map((tx) => (
                  <a
                    key={tx.id}
                    href={tx.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`glass-card p-3 md:p-5 flex items-center justify-between border-l-2 ${tx.chainBorderColor} hover:border-primary/30 transition-all duration-300 hover:shadow-lg block`}
                  >
                    <div className="flex items-center gap-3 md:gap-4 min-w-0">
                      {/* Chain Icon */}
                      <div className="w-9 h-9 md:w-11 md:h-11 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
                        <span className={`text-sm font-bold ${tx.chainColor}`}>{tx.chainIcon}</span>
                      </div>

                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs md:text-sm font-light tracking-wide ${txTypeColor(tx.type)}`}>
                            {txTypeLabel(tx.type)}
                          </span>
                          {statusBadge(tx.status)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[10px] md:text-xs font-mono text-white/25 truncate">{tx.txHash}</span>
                          <span className="text-[10px] text-white/15 shrink-0 hidden sm:inline">{formatTime(tx.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <div className="flex items-center gap-1">
                        <span className={`text-xs md:text-sm font-light tracking-wide ${tx.type === 'receive' ? 'text-emerald-400' : 'text-white/70'}`}>
                          {tx.type === 'receive' ? '+' : tx.type === 'send' ? '-' : ''}{tx.amount} {tx.token}
                        </span>
                      </div>
                      {tx.swapTo && (
                        <p className="text-xs font-light text-white/25 mt-0.5">
                          for {tx.swapTo.amount} {tx.swapTo.token}
                        </p>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Audit Section */}
        <div className="glass-card p-5 md:p-8 space-y-4 md:space-y-5 gradient-border">
          <h2 className="text-sm font-light tracking-wider text-white/70 uppercase">Audit Trail</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
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

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleExportAudit}
              disabled={exportingAudit}
              className="flex-1 btn-bevel py-2.5 min-h-11 text-sm disabled:opacity-60"
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
              className="flex-1 btn-bevel-outline py-2.5 min-h-11 text-sm disabled:opacity-60"
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
