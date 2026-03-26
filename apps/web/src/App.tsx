import { Routes, Route } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import { usePrices } from './hooks/usePrices';
import { useBtcBalance } from './hooks/useBtcBalance';
import { useSolBalance } from './hooks/useSolBalance';
import { useAutoLock } from './hooks/useAutoLock';
import { useWalletStore } from '@gravytos/state';
import { MobileNav } from './components/MobileNav';
import ErrorBoundary from './components/ErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';

const Landing = lazy(() => import('./pages/Landing').then(m => ({ default: m.Landing })));
const Dashboard = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.Dashboard })));
const Send = lazy(() => import('./pages/Send').then(m => ({ default: m.Send })));
const Receive = lazy(() => import('./pages/Receive').then(m => ({ default: m.Receive })));
const Swap = lazy(() => import('./pages/Swap').then(m => ({ default: m.Swap })));
const Bridge = lazy(() => import('./pages/Bridge').then(m => ({ default: m.Bridge })));
const Settings = lazy(() => import('./pages/Settings').then(m => ({ default: m.Settings })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));

export function App() {
  usePrices();
  useBtcBalance();
  useSolBalance();

  const disconnectAll = useWalletStore((s) => s.disconnectAll);
  useAutoLock(disconnectAll);

  return (
    <div className="min-h-screen bg-[hsl(220,30%,6%)] text-white pb-20 md:pb-0">
      <ErrorBoundary>
        <Suspense fallback={<LoadingScreen />}>
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
      <MobileNav />
    </div>
  );
}
