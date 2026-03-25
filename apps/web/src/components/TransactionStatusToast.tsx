// ===================================================================
// NEXORA VAULT -- Transaction Status Toast
// Bottom-right notification showing real-time transaction progress
// ===================================================================

import { useEffect, useState } from 'react';
import type { TransactionStatus } from '@gravytos/types';

export interface ToastData {
  id: string;
  status: TransactionStatus | 'signing';
  txHash?: string;
  explorerUrl?: string;
  errorMessage?: string;
}

interface TransactionStatusToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: 'spinner' | 'check' | 'x'; color: string }
> = {
  pending: {
    label: 'Building transaction...',
    icon: 'spinner',
    color: 'border-purple-500/30',
  },
  signing: {
    label: 'Waiting for signature...',
    icon: 'spinner',
    color: 'border-amber-500/30',
  },
  broadcasting: {
    label: 'Broadcasting to network...',
    icon: 'spinner',
    color: 'border-blue-500/30',
  },
  confirming: {
    label: 'Waiting for confirmation...',
    icon: 'spinner',
    color: 'border-sky-500/30',
  },
  confirmed: {
    label: 'Transaction confirmed!',
    icon: 'check',
    color: 'border-emerald-500/30',
  },
  failed: {
    label: 'Transaction failed',
    icon: 'x',
    color: 'border-red-500/30',
  },
};

function Spinner() {
  return (
    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        className="opacity-25"
      />
      <path
        d="M4 12a8 8 0 0 1 8-8"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="opacity-75"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      className="w-5 h-5 text-emerald-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="m4.5 12.75 6 6 9-13.5"
      />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
      className="w-5 h-5 text-red-400"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 18 18 6M6 6l12 12"
      />
    </svg>
  );
}

export function TransactionStatusToast({
  toast,
  onDismiss,
}: TransactionStatusToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (toast) {
      setVisible(true);

      // Auto-dismiss on success after 10 seconds
      if (toast.status === 'confirmed') {
        const timer = setTimeout(() => {
          setVisible(false);
          setTimeout(onDismiss, 300);
        }, 10_000);
        return () => clearTimeout(timer);
      }

      // Auto-dismiss on failure after 8 seconds
      if (toast.status === 'failed') {
        const timer = setTimeout(() => {
          setVisible(false);
          setTimeout(onDismiss, 300);
        }, 8_000);
        return () => clearTimeout(timer);
      }
    } else {
      setVisible(false);
    }
  }, [toast, toast?.status, onDismiss]);

  if (!toast) return null;

  const config = STATUS_CONFIG[toast.status] ?? STATUS_CONFIG['pending'];

  return (
    <div
      className={`fixed bottom-6 right-6 z-[200] transition-all duration-300 ${
        visible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-4 opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`glass-card p-4 min-w-[320px] max-w-[400px] border-l-2 ${config.color} shadow-2xl`}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            {config.icon === 'spinner' && (
              <div className="text-purple-400">
                <Spinner />
              </div>
            )}
            {config.icon === 'check' && <CheckIcon />}
            {config.icon === 'x' && <XIcon />}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-light tracking-wide text-white/80">
              {config.label}
            </p>

            {/* Error message */}
            {toast.status === 'failed' && toast.errorMessage && (
              <p className="text-xs font-light text-red-400/70 mt-1 truncate">
                {toast.errorMessage}
              </p>
            )}

            {/* Tx hash + explorer link */}
            {toast.txHash && toast.txHash !== 'pending...' && (
              <div className="mt-1.5">
                <p className="text-[10px] font-mono text-white/30 truncate">
                  {toast.txHash}
                </p>
                {toast.explorerUrl && toast.status === 'confirmed' && (
                  <a
                    href={toast.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[10px] font-light text-purple-400 hover:text-purple-300 transition-colors mt-1"
                  >
                    View on Explorer
                    <svg
                      className="w-3 h-3"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                      />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          <button
            onClick={() => {
              setVisible(false);
              setTimeout(onDismiss, 300);
            }}
            className="flex-shrink-0 text-white/20 hover:text-white/50 transition-colors"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18 18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
