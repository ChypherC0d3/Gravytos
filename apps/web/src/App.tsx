import { Routes, Route } from 'react-router-dom';
import { useWalletSync } from './hooks/useWalletSync';
import { useTokenBalances } from './hooks/useTokenBalances';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Send } from './pages/Send';
import { Receive } from './pages/Receive';
import { Swap } from './pages/Swap';
import { Bridge } from './pages/Bridge';
import { Settings } from './pages/Settings';
import { History } from './pages/History';

export function App() {
  useWalletSync(); // Sync wallet state to Zustand stores
  useTokenBalances(); // Fetch and sync token balances

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
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
    </div>
  );
}
