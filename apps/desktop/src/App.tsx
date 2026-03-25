import { Routes, Route } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Dashboard } from './pages/Dashboard';
import { Send } from './pages/Send';
import { Receive } from './pages/Receive';
import { Swap } from './pages/Swap';
import { Bridge } from './pages/Bridge';
import { Settings } from './pages/Settings';
import { History } from './pages/History';

export function App() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Desktop indicator */}
      <div className="fixed bottom-4 right-4 z-50 px-3 py-1 rounded-full bg-zinc-800/80 backdrop-blur border border-zinc-700 text-[10px] text-zinc-500 font-mono">
        Desktop v0.1.0
      </div>

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
