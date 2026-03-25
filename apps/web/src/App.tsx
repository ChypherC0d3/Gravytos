import { Routes, Route } from 'react-router-dom';
import { Component, lazy, Suspense, type ReactNode } from 'react';
import { usePrices } from './hooks/usePrices';
import { useBtcBalance } from './hooks/useBtcBalance';
import { useSolBalance } from './hooks/useSolBalance';

// Error Boundary
class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ color: '#f87171', background: '#0d1117', padding: 40, fontFamily: 'monospace' }}>
          <h2>Page Error</h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{this.state.error.message}</pre>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#666', marginTop: 10 }}>{this.state.error.stack}</pre>
          <button onClick={() => this.setState({ error: null })} style={{ marginTop: 20, padding: '8px 16px', background: '#7c3aed', color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
            Try Again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Send = lazy(() => import('./pages/Send').then(m => ({ default: m.Send })));
const Receive = lazy(() => import('./pages/Receive').then(m => ({ default: m.Receive })));
const Swap = lazy(() => import('./pages/Swap').then(m => ({ default: m.Swap })));
const Bridge = lazy(() => import('./pages/Bridge').then(m => ({ default: m.Bridge })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));

function Loading() {
  return (
    <div style={{ color: '#a78bfa', background: '#0d1117', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: 32, fontWeight: 300, marginBottom: 8 }}>Gravytos</div>
        <div style={{ fontSize: 14, color: '#666' }}>Loading...</div>
      </div>
    </div>
  );
}

export function App() {
  usePrices();
  useBtcBalance();
  useSolBalance();

  return (
    <div className="min-h-screen bg-[hsl(220,30%,6%)] text-white">
      <ErrorBoundary>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/send" element={<Send />} />
            <Route path="/receive" element={<Receive />} />
            <Route path="/swap" element={<Swap />} />
            <Route path="/bridge" element={<Bridge />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/history" element={<History />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
    </div>
  );
}
