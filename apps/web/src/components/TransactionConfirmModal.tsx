// ===================================================================
// GRAVYTOS -- Transaction Confirmation Modal
// Glass-card confirmation dialog shown before sending
// ===================================================================

import { PrivacyLevel } from '@gravytos/types';

export interface TransactionConfirmDetails {
  fromAddress: string;
  toAddress: string;
  amount: string;
  token: string;
  network: string;
  estimatedFee: string;
  feeToken: string;
  privacyLevel: PrivacyLevel;
}

interface TransactionConfirmModalProps {
  open: boolean;
  details: TransactionConfirmDetails;
  onConfirm: () => void;
  onCancel: () => void;
  confirming?: boolean;
}

function privacyDescription(level: PrivacyLevel): string {
  switch (level) {
    case PrivacyLevel.High:
      return 'Maximum privacy protections active. Timing delays, address obfuscation, and chain-specific enhancements applied.';
    case PrivacyLevel.Medium:
      return 'Moderate privacy. RPC rotation and timing randomization enabled.';
    case PrivacyLevel.Low:
    default:
      return 'Standard transaction. No additional privacy features.';
  }
}

function privacyColor(level: PrivacyLevel): string {
  switch (level) {
    case PrivacyLevel.High:
      return 'text-purple-400';
    case PrivacyLevel.Medium:
      return 'text-amber-400';
    case PrivacyLevel.Low:
    default:
      return 'text-emerald-400';
  }
}

function truncateAddress(addr: string): string {
  if (addr.length <= 16) return addr;
  return `${addr.substring(0, 8)}...${addr.substring(addr.length - 6)}`;
}

export function TransactionConfirmModal({
  open,
  details,
  onConfirm,
  onCancel,
  confirming = false,
}: TransactionConfirmModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onCancel}
      />

      {/* Modal */}
      <div className="relative glass-card p-8 max-w-md w-full mx-4 gradient-border space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br from-purple-500/20 to-blue-500/20 border border-purple-500/20 flex items-center justify-center mb-3">
            <svg
              className="w-7 h-7 text-purple-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5"
              />
            </svg>
          </div>
          <h2 className="text-lg font-light tracking-wide text-white/90">
            Confirm Transaction
          </h2>
          <p className="text-xs font-light text-white/30 mt-1">
            Review details before sending
          </p>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs font-light text-white/30 tracking-wide">From</span>
            <span className="text-xs font-mono text-white/60" title={details.fromAddress}>
              {truncateAddress(details.fromAddress)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-light text-white/30 tracking-wide">To</span>
            <span className="text-xs font-mono text-white/60" title={details.toAddress}>
              {truncateAddress(details.toAddress)}
            </span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex justify-between items-center">
            <span className="text-xs font-light text-white/30 tracking-wide">Amount</span>
            <span className="text-sm font-mono text-white/80">
              {details.amount} {details.token}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-light text-white/30 tracking-wide">Network</span>
            <span className="text-xs text-white/60">{details.network}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs font-light text-white/30 tracking-wide">
              Estimated Fee
            </span>
            <span className="text-xs font-mono text-white/50">
              {details.estimatedFee} {details.feeToken}
            </span>
          </div>
          <div className="h-px bg-white/5" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-light text-white/30 tracking-wide">
              Privacy Level
            </span>
            <div className="text-right max-w-[200px]">
              <span
                className={`text-xs font-medium ${privacyColor(details.privacyLevel)}`}
              >
                {details.privacyLevel.charAt(0).toUpperCase() +
                  details.privacyLevel.slice(1)}
              </span>
              <p className="text-[10px] text-white/20 mt-0.5 leading-relaxed">
                {privacyDescription(details.privacyLevel)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={confirming}
            className="flex-1 py-3 rounded-lg text-sm font-light text-white/50 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-white/70 transition-all duration-300 disabled:opacity-40"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={confirming}
            className="flex-1 btn-bevel py-3 text-sm disabled:opacity-60"
          >
            {confirming ? (
              <span className="flex items-center justify-center gap-2">
                <svg
                  className="w-4 h-4 animate-spin"
                  viewBox="0 0 24 24"
                  fill="none"
                >
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
                Sending...
              </span>
            ) : (
              'Confirm Send'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
