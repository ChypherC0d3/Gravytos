// ===================================================================
// NEXORA VAULT -- Audit Storage
// Pluggable storage backend for the audit event chain
// ===================================================================

import type { AuditEvent } from '@gravytos/types';

/**
 * Abstract storage interface for audit events.
 * Implementations may use in-memory arrays, IndexedDB, SQLite, etc.
 */
export interface AuditStorage {
  /** Append an event to the store */
  append(event: AuditEvent): Promise<void>;

  /** Get all stored events in insertion order */
  getAll(): Promise<AuditEvent[]>;

  /** Get events filtered by wallet ID */
  getByWalletId(walletId: string): Promise<AuditEvent[]>;

  /** Get events within a time range (inclusive) */
  getByTimeRange(startMs: number, endMs: number): Promise<AuditEvent[]>;

  /** Get the last N events */
  getRecent(count: number): Promise<AuditEvent[]>;

  /** Get a single event by its ID */
  getById(id: string): Promise<AuditEvent | undefined>;

  /** Get the most recently appended event */
  getLast(): Promise<AuditEvent | undefined>;

  /** Total number of stored events */
  count(): Promise<number>;

  /** Remove all events (use with caution) */
  clear(): Promise<void>;
}

/**
 * Simple in-memory implementation of AuditStorage.
 * Suitable for development and testing.
 * Events are lost when the process exits.
 */
export class InMemoryAuditStorage implements AuditStorage {
  private events: AuditEvent[] = [];

  async append(event: AuditEvent): Promise<void> {
    this.events.push(event);
  }

  async getAll(): Promise<AuditEvent[]> {
    return [...this.events];
  }

  async getByWalletId(walletId: string): Promise<AuditEvent[]> {
    return this.events.filter((e) => e.walletId === walletId);
  }

  async getByTimeRange(startMs: number, endMs: number): Promise<AuditEvent[]> {
    return this.events.filter(
      (e) => e.timestamp >= startMs && e.timestamp <= endMs,
    );
  }

  async getRecent(count: number): Promise<AuditEvent[]> {
    return this.events.slice(-count);
  }

  async getById(id: string): Promise<AuditEvent | undefined> {
    return this.events.find((e) => e.id === id);
  }

  async getLast(): Promise<AuditEvent | undefined> {
    return this.events.length > 0
      ? this.events[this.events.length - 1]
      : undefined;
  }

  async count(): Promise<number> {
    return this.events.length;
  }

  async clear(): Promise<void> {
    this.events = [];
  }
}
