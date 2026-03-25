// ===================================================================
// NEXORA VAULT -- Environment Variable Access
// Unified accessor for Vite-prefixed environment variables
// ===================================================================

declare const __VITE_ENV__: Record<string, string> | undefined;

/**
 * Retrieve an environment variable, checking the VITE_ prefix convention.
 * Works in both Vite dev/build contexts and plain Node.js.
 *
 * @param key - The variable name without the VITE_ prefix (e.g., 'SUPABASE_URL')
 * @param defaultValue - Fallback value if the variable is not set
 * @returns The resolved environment variable value or the default
 */
export function getEnv(key: string, defaultValue = ''): string {
  const viteKey = `VITE_${key}`;

  // Try Vite's import.meta.env (available at runtime in Vite-built apps)
  try {
    const viteEnv = import.meta.env;
    if (viteEnv && typeof viteEnv === 'object') {
      const val = viteEnv[viteKey];
      if (val !== undefined && val !== '') return String(val);
    }
  } catch {
    // Not in Vite context
  }

  // Node.js / Tauri process.env fallback
  if (typeof process !== 'undefined' && process.env) {
    const nodeVal = process.env[viteKey] ?? process.env[key];
    if (nodeVal !== undefined && nodeVal !== '') return nodeVal;
  }

  return defaultValue;
}

/**
 * Like `getEnv` but throws if the variable is missing or empty.
 */
export function requireEnv(key: string): string {
  const value = getEnv(key);
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

// ── Convenience accessors for common variables ─────────────────

export function getSupabaseUrl(): string {
  return getEnv('SUPABASE_URL', 'http://localhost:54321');
}

export function getSupabaseAnonKey(): string {
  return getEnv('SUPABASE_ANON_KEY', '');
}

export function getWalletConnectProjectId(): string {
  return getEnv('WALLETCONNECT_PROJECT_ID', '');
}

export function getAlchemyApiKey(): string {
  return getEnv('ALCHEMY_API_KEY', '');
}

export function getInfuraApiKey(): string {
  return getEnv('INFURA_API_KEY', '');
}

export function isProduction(): boolean {
  return getEnv('MODE', 'development') === 'production';
}

export function isDevelopment(): boolean {
  return !isProduction();
}
