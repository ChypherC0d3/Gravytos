// ===================================================================
// NEXORA VAULT -- Platform Detection
// Detect whether the app is running as a Tauri desktop app or in a browser
// ===================================================================

/**
 * Returns true if running inside a Tauri desktop application.
 */
export function isDesktop(): boolean {
  return typeof window !== 'undefined' && '__TAURI__' in window;
}

/**
 * Returns true if running in a standard web browser.
 */
export function isWeb(): boolean {
  return !isDesktop();
}

/**
 * Get the current runtime platform.
 */
export function getPlatform(): 'desktop' | 'web' {
  return isDesktop() ? 'desktop' : 'web';
}
