import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { useState } from 'react';

export function InstallBanner() {
  const { isInstallable, isInstalled, install } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!isInstallable || isInstalled || dismissed) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 animate-slide-up">
      <div className="bg-gradient-to-r from-purple-600/90 to-blue-600/90 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
            {/* Download icon SVG */}
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium text-sm">Install Gravytos</p>
            <p className="text-white/70 text-xs">Quick access from your home screen</p>
          </div>
          <button
            onClick={install}
            className="px-4 py-2 bg-white text-purple-700 rounded-xl text-sm font-semibold hover:bg-white/90 transition flex-shrink-0"
          >
            Install
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="text-white/50 hover:text-white/80 transition p-1"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
