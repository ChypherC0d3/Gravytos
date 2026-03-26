// ===================================================================
// GRAVYTOS -- Secure Storage Abstraction
// Provides a pluggable persistence layer for encrypted wallet data
// ===================================================================

/**
 * Abstract storage interface.
 * Implementations may target localStorage, IndexedDB, filesystem, etc.
 */
export interface SecureStorage {
  /** Persist a string value under the given key. */
  save(key: string, data: string): Promise<void>;
  /** Retrieve a previously stored value, or null if not found. */
  load(key: string): Promise<string | null>;
  /** Remove a stored value. No-op if the key does not exist. */
  delete(key: string): Promise<void>;
  /** Check whether a key exists in storage. */
  exists(key: string): Promise<boolean>;
}

// Storage key namespace to avoid collisions with other apps.
const STORAGE_PREFIX = 'gravytos:';

/**
 * Browser-based SecureStorage backed by `localStorage`.
 *
 * NOTE: localStorage is synchronous and not truly secure – it is readable
 * by any script on the same origin. For production a more hardened backend
 * (e.g. IndexedDB with encryption, or a native secure enclave bridge) is
 * recommended. This implementation provides a working baseline.
 */
export class WebSecureStorage implements SecureStorage {
  private prefix: string;

  constructor(prefix: string = STORAGE_PREFIX) {
    this.prefix = prefix;
  }

  private prefixedKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  async save(key: string, data: string): Promise<void> {
    try {
      localStorage.setItem(this.prefixedKey(key), data);
    } catch (err) {
      throw new Error(
        `SecureStorage.save failed for key "${key}": ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async load(key: string): Promise<string | null> {
    return localStorage.getItem(this.prefixedKey(key));
  }

  async delete(key: string): Promise<void> {
    localStorage.removeItem(this.prefixedKey(key));
  }

  async exists(key: string): Promise<boolean> {
    return localStorage.getItem(this.prefixedKey(key)) !== null;
  }
}

/**
 * In-memory SecureStorage for testing and server-side usage.
 * Data does not survive process restarts.
 */
export class InMemorySecureStorage implements SecureStorage {
  private store = new Map<string, string>();

  async save(key: string, data: string): Promise<void> {
    this.store.set(key, data);
  }

  async load(key: string): Promise<string | null> {
    return this.store.get(key) ?? null;
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async exists(key: string): Promise<boolean> {
    return this.store.has(key);
  }
}
