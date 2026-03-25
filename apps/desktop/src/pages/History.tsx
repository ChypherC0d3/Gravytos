import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';

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
  { id: '1', type: 'send', chain: 'ethereum', chainIcon: 'E', chainColor: 'text-blue-400', amount: '0.5', token: 'ETH', status: 'confirmed', timestamp: Date.now() - 1800000, txHash: '0xabc1...def4', to: '0x742d...bD38' },
  { id: '2', type: 'receive', chain: 'bitcoin', chainIcon: 'B', chainColor: 'text-orange-400', amount: '0.012', token: 'BTC', status: 'confirmed', timestamp: Date.now() - 3600000, txHash: 'a1b2c3...f5e6', from: 'bc1q...x7k2' },
  { id: '3', type: 'swap', chain: 'ethereum', chainIcon: 'E', chainColor: 'text-blue-400', amount: '1.0', token: 'ETH', status: 'confirmed', timestamp: Date.now() - 7200000, txHash: '0xdef5...abc8', swapTo: { amount: '2415.50', token: 'USDC' } },
  { id: '4', type: 'bridge', chain: 'arbitrum', chainIcon: 'A', chainColor: 'text-sky-400', amount: '500', token: 'USDC', status: 'pending', timestamp: Date.now() - 10800000, txHash: '0x123a...789f' },
  { id: '5', type: 'send', chain: 'solana', chainIcon: 'S', chainColor: 'text-purple-400', amount: '25', token: 'SOL', status: 'confirmed', timestamp: Date.now() - 86400000, txHash: '7xKX...AsU', to: '9aB3...mPQ' },
  { id: '6', type: 'receive', chain: 'ethereum', chainIcon: 'E', chainColor: 'text-blue-400', amount: '1000', token: 'USDC', status: 'confirmed', timestamp: Date.now() - 86400000 * 2, txHash: '0x456b...cde9', from: '0x1234...5678' },
  { id: '7', type: 'send', chain: 'polygon', chainIcon: 'P', chainColor: 'text-violet-400', amount: '100', token: 'MATIC', status: 'failed', timestamp: Date.now() - 86400000 * 2, txHash: '0x789c...012f', to: '0xabcd...ef01' },
  { id: '8', type: 'swap', chain: 'solana', chainIcon: 'S', chainColor: 'text-purple-400', amount: '10', token: 'SOL', status: 'confirmed', timestamp: Date.now() - 86400000 * 3, txHash: '3bCd...xYz', swapTo: { amount: '1540.25', token: 'USDC' } },
  { id: '9', type: 'bridge', chain: 'ethereum', chainIcon: 'E', chainColor: 'text-blue-400', amount: '0.25', token: 'ETH', status: 'confirmed', timestamp: Date.now() - 86400000 * 5, txHash: '0xfed9...876a' },
  { id: '10', type: 'receive', chain: 'bitcoin', chainIcon: 'B', chainColor: 'text-orange-400', amount: '0.005', token: 'BTC', status: 'confirmed', timestamp: Date.now() - 86400000 * 7, txHash: 'e5f6a7...d4c3', from: 'bc1q...r7s8' },
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
    case 'receive': return 'text-green-400';
    case 'swap': return 'text-blue-400';
    case 'bridge': return 'text-purple-400';
  }
}

function statusBadge(status: TxStatus) {
  switch (status) {
    case 'confirmed':
      return <span className="text-[10px] font-semibold text-green-400 bg-green-500/10 px-1.5 py-0.5 rounded border border-green-500/20">Confirmed</span>;
    case 'pending':
      return <span className="text-[10px] font-semibold text-yellow-400 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20">Pending</span>;
    case 'failed':
      return <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">Failed</span>;
  }
}

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

// ─── History Page ────────────────────────────────────────────

export function History() {
  const [chainFilter, setChainFilter] = useState<ChainFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [exportingAudit, setExportingAudit] = useState(false);
  const [verifyingIntegrity, setVerifyingIntegrity] = useState(false);
  const [integrityResult, setIntegrityResult] = useState<boolean | null>(null);

  const filteredTxs = useMemo(() => {
    return MOCK_HISTORY.filter((tx) => {
      if (chainFilter !== 'all' && tx.chain !== chainFilter) return false;
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      return true;
    });
  }, [chainFilter, typeFilter]);

  const grouped = useMemo(() => groupByDate(filteredTxs), [filteredTxs]);

  async function handleExportAudit() {
    setExportingAudit(true);
    await new Promise((r) => setTimeout(r, 1000));
    const auditData = {
      version: '1.0.0',
      exportedAt: Date.now(),
      application: 'gravytos',
      totalEvents: MOCK_HISTORY.length,
      integrityVerified: true,
      events: MOCK_HISTORY,
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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Transaction History</h1>
          <span className="text-xs text-zinc-500">{MOCK_HISTORY.length} transactions</span>
        </div>

        {/* Filters */}
        <div className="space-y-4 mb-6">
          {/* Chain Filter */}
          <div>
            <label className="text-xs text-zinc-500 mb-2 block">Chain</label>
            <div className="flex flex-wrap gap-2">
              {([['all', 'All'], ['bitcoin', 'Bitcoin'], ['ethereum', 'Ethereum'], ['solana', 'Solana'], ['polygon', 'Polygon'], ['arbitrum', 'Arbitrum']] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setChainFilter(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    chainFilter === value
                      ? 'bg-zinc-700 text-white border-zinc-600'
                      : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Type Filter */}
          <div>
            <label className="text-xs text-zinc-500 mb-2 block">Type</label>
            <div className="flex flex-wrap gap-2">
              {([['all', 'All'], ['send', 'Sent'], ['receive', 'Received'], ['swap', 'Swaps'], ['bridge', 'Bridges']] as const).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setTypeFilter(value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    typeFilter === value
                      ? 'bg-zinc-700 text-white border-zinc-600'
                      : 'bg-zinc-900/50 text-zinc-400 border-zinc-800 hover:border-zinc-600'
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
              <h3 className="text-xs font-medium text-zinc-500 mb-2 px-1">{dateLabel}</h3>
              <div className="space-y-2">
                {txs.map((tx) => (
                  <div key={tx.id} className="glass-card p-4 flex items-center justify-between hover:border-zinc-700 transition-colors">
                    <div className="flex items-center gap-3">
                      {/* Chain Icon */}
                      <div className={`w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center`}>
                        <span className={`text-sm font-bold ${tx.chainColor}`}>{tx.chainIcon}</span>
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium ${txTypeColor(tx.type)}`}>
                            {txTypeLabel(tx.type)}
                          </span>
                          {statusBadge(tx.status)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-mono text-zinc-500">{tx.txHash}</span>
                          <span className="text-[10px] text-zinc-600">{formatTime(tx.timestamp)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="flex items-center gap-1">
                        <span className={`text-sm font-medium ${tx.type === 'receive' ? 'text-green-400' : 'text-zinc-200'}`}>
                          {tx.type === 'receive' ? '+' : tx.type === 'send' ? '-' : ''}{tx.amount} {tx.token}
                        </span>
                      </div>
                      {tx.swapTo && (
                        <p className="text-xs text-zinc-500 mt-0.5">
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
            <div className="glass-card p-12 text-center">
              <p className="text-zinc-500">No transactions found</p>
            </div>
          )}
        </div>

        {/* Audit Section */}
        <div className="glass-card p-6 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-200">Audit Trail</h2>

          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800 text-center">
              <p className="text-lg font-bold text-zinc-200">{MOCK_HISTORY.length}</p>
              <p className="text-[10px] text-zinc-500 mt-0.5">Total Events</p>
            </div>
            <div className="p-3 rounded-lg bg-zinc-800/30 border border-zinc-800 text-center">
              <p className="text-lg font-bold text-zinc-200">30m ago</p>
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
                {integrityResult
                  ? `Hash chain integrity verified. All ${MOCK_HISTORY.length} events are valid.`
                  : 'Integrity check failed. Chain broken at event #5.'}
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
