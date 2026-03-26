// ═══════════════════════════════════════════════════════════════
// GRAVYTOS — Analytics
// Lightweight event tracking via Google Analytics (gtag)
// ═══════════════════════════════════════════════════════════════

/** Supported analytics event names. */
export type AnalyticsEvent =
  | 'wallet_connected'
  | 'wallet_disconnected'
  | 'swap_initiated'
  | 'swap_success'
  | 'swap_failed'
  | 'bridge_initiated'
  | 'bridge_success'
  | 'bridge_failed'
  | 'send_initiated'
  | 'send_success'
  | 'send_failed'
  | 'privacy_level_changed';

/** Free-form properties attached to an event. */
export type AnalyticsProperties = Record<string, string | number | boolean | undefined>;

// Extend the Window interface so TypeScript knows about gtag.
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Send a custom event to Google Analytics.
 * No-ops silently when gtag is not loaded or when running outside a browser.
 */
export function trackEvent(event: AnalyticsEvent, properties?: AnalyticsProperties): void {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') {
    return;
  }
  window.gtag('event', event, properties);
}

/**
 * Convenience helpers for the most common events.
 */
export const analytics = {
  walletConnected(chainFamily: string, address: string) {
    trackEvent('wallet_connected', { chain_family: chainFamily, address });
  },

  walletDisconnected(chainFamily: string) {
    trackEvent('wallet_disconnected', { chain_family: chainFamily });
  },

  swapInitiated(chainId: string, fromToken: string, toToken: string, amount: string) {
    trackEvent('swap_initiated', { chain_id: chainId, from_token: fromToken, to_token: toToken, amount });
  },

  swapSuccess(chainId: string, txHash: string) {
    trackEvent('swap_success', { chain_id: chainId, tx_hash: txHash });
  },

  swapFailed(chainId: string, reason: string) {
    trackEvent('swap_failed', { chain_id: chainId, reason });
  },

  bridgeInitiated(fromChainId: string, toChainId: string, token: string, amount: string) {
    trackEvent('bridge_initiated', { from_chain_id: fromChainId, to_chain_id: toChainId, token, amount });
  },

  bridgeSuccess(fromChainId: string, toChainId: string, txHash: string) {
    trackEvent('bridge_success', { from_chain_id: fromChainId, to_chain_id: toChainId, tx_hash: txHash });
  },

  bridgeFailed(fromChainId: string, toChainId: string, reason: string) {
    trackEvent('bridge_failed', { from_chain_id: fromChainId, to_chain_id: toChainId, reason });
  },

  privacyLevelChanged(level: string, chainId?: string) {
    trackEvent('privacy_level_changed', { level, chain_id: chainId });
  },
} as const;
