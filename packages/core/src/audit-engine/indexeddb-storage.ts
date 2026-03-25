// ===================================================================
// NEXORA VAULT -- IndexedDB Audit Storage
// Persistent, browser-based storage for the audit event chain
// ===================================================================

import type { AuditEvent, AuditActionType } from '@gravytos/types';
import type { AuditStorage } from './audit-storage';

const DB_NAME = 'gravytos-audit';
const DB_VERSION = 1;
const STORE_NAME = 'audit_events';

/**
 * Open (or create) the IndexedDB database.
 * Creates the object store and indices on first run / version upgrade.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('walletId', 'walletId', { unique: false });
        store.createIndex('actionType', 'actionType', { unique: false });
        store.createIndex('chainId', 'chainId', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * IndexedDB-backed implementation of AuditStorage.
 *
 * Must call `initialize()` before any other method.
 * All operations are wrapped in proper IDB transactions.
 */
export class IndexedDBAuditStorage implements AuditStorage {
  private db: IDBDatabase | null = null;

  /**
   * Open the database connection. Safe to call multiple times --
   * subsequent calls are no-ops if already initialised.
   */
  async initialize(): Promise<void> {
    if (this.db) return;
    this.db = await openDatabase();
  }

  // ── AuditStorage interface ─────────────────────────────────────

  async append(event: AuditEvent): Promise<void> {
    const store = this.writeStore();
    return new Promise((resolve, reject) => {
      const request = store.add(event);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getAll(): Promise<AuditEvent[]> {
    const store = this.readStore();
    return new Promise((resolve, reject) => {
      const index = store.index('timestamp');
      const request = index.getAll();
      request.onsuccess = () => resolve(request.result as AuditEvent[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getByWalletId(walletId: string): Promise<AuditEvent[]> {
    const store = this.readStore();
    return new Promise((resolve, reject) => {
      const index = store.index('walletId');
      const request = index.getAll(walletId);
      request.onsuccess = () => resolve(request.result as AuditEvent[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getByTimeRange(startMs: number, endMs: number): Promise<AuditEvent[]> {
    const store = this.readStore();
    return new Promise((resolve, reject) => {
      const index = store.index('timestamp');
      const range = IDBKeyRange.bound(startMs, endMs);
      const request = index.getAll(range);
      request.onsuccess = () => resolve(request.result as AuditEvent[]);
      request.onerror = () => reject(request.error);
    });
  }

  async getRecent(count: number): Promise<AuditEvent[]> {
    const store = this.readStore();
    return new Promise((resolve, reject) => {
      const index = store.index('timestamp');
      const results: AuditEvent[] = [];
      const cursorReq = index.openCursor(null, 'prev');

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        if (cursor && results.length < count) {
          results.push(cursor.value as AuditEvent);
          cursor.continue();
        } else {
          // Reverse so oldest is first
          resolve(results.reverse());
        }
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  }

  async getById(id: string): Promise<AuditEvent | undefined> {
    const store = this.readStore();
    return new Promise((resolve, reject) => {
      const request = store.get(id);
      request.onsuccess = () =>
        resolve((request.result as AuditEvent) ?? undefined);
      request.onerror = () => reject(request.error);
    });
  }

  async getLast(): Promise<AuditEvent | undefined> {
    const store = this.readStore();
    return new Promise((resolve, reject) => {
      const index = store.index('timestamp');
      const cursorReq = index.openCursor(null, 'prev');

      cursorReq.onsuccess = () => {
        const cursor = cursorReq.result;
        resolve(cursor ? (cursor.value as AuditEvent) : undefined);
      };
      cursorReq.onerror = () => reject(cursorReq.error);
    });
  }

  async count(): Promise<number> {
    const store = this.readStore();
    return new Promise((resolve, reject) => {
      const request = store.count();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async clear(): Promise<void> {
    const store = this.writeStore();
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // ── Extra query helpers (not part of core AuditStorage) ────────

  /**
   * Get all events of a specific action type.
   */
  async getEventsByType(type: AuditActionType): Promise<AuditEvent[]> {
    const store = this.readStore();
    return new Promise((resolve, reject) => {
      const index = store.index('actionType');
      const request = index.getAll(type as string);
      request.onsuccess = () => resolve(request.result as AuditEvent[]);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get the chain hash of the most recent event, or the genesis hash
   * if the store is empty.
   */
  async getLatestHash(): Promise<string> {
    const last = await this.getLast();
    return last ? last.proofHash : '0'.repeat(64);
  }

  /**
   * Convenience alias for `count()`.
   */
  async getEventCount(): Promise<number> {
    return this.count();
  }

  // ── Internal helpers ───────────────────────────────────────────

  private ensureDb(): IDBDatabase {
    if (!this.db) {
      throw new Error(
        'IndexedDBAuditStorage: database not initialised. Call initialize() first.',
      );
    }
    return this.db;
  }

  private readStore(): IDBObjectStore {
    const db = this.ensureDb();
    const tx = db.transaction(STORE_NAME, 'readonly');
    return tx.objectStore(STORE_NAME);
  }

  private writeStore(): IDBObjectStore {
    const db = this.ensureDb();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    return tx.objectStore(STORE_NAME);
  }
}
