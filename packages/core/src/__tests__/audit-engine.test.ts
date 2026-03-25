import { describe, it, expect } from 'vitest';
import { AuditEngine } from '../audit-engine/audit-engine';
import { InMemoryAuditStorage } from '../audit-engine/audit-storage';
import { AuditActionType, PrivacyLevel } from '@gravytos/types';

function makeLogParams(overrides: Record<string, unknown> = {}) {
  return {
    actionType: AuditActionType.TransactionSent,
    walletId: 'wallet-1',
    chainId: 'bitcoin-mainnet',
    privacyLevel: PrivacyLevel.Low,
    details: { amount: '0.01' },
    ...overrides,
  };
}

describe('Audit Engine', () => {
  it('should log events with hash chaining', async () => {
    const storage = new InMemoryAuditStorage();
    const engine = new AuditEngine(storage);

    const event1 = await engine.logEvent(makeLogParams());
    const event2 = await engine.logEvent(makeLogParams({ details: { amount: '0.02' } }));
    const event3 = await engine.logEvent(makeLogParams({ details: { amount: '0.03' } }));

    // Each event has proofHash and previousHash
    expect(event1.proofHash).toBeTruthy();
    expect(event1.previousHash).toBeTruthy();
    expect(event2.proofHash).toBeTruthy();
    expect(event3.proofHash).toBeTruthy();

    // First event links to genesis hash (64 zeros)
    expect(event1.previousHash).toBe('0'.repeat(64));

    // Subsequent events link to chain hash of previous event
    // event2.previousHash should NOT be the genesis hash
    expect(event2.previousHash).not.toBe('0'.repeat(64));
    expect(event3.previousHash).not.toBe(event2.previousHash);
  });

  it('should verify integrity of valid chain', async () => {
    const storage = new InMemoryAuditStorage();
    const engine = new AuditEngine(storage);

    await engine.logEvent(makeLogParams());
    await engine.logEvent(makeLogParams({ details: { step: 2 } }));
    await engine.logEvent(makeLogParams({ details: { step: 3 } }));

    const result = await engine.verifyIntegrity();
    expect(result.valid).toBe(true);
    expect(result.totalChecked).toBe(3);
  });

  it('should detect tampered events', async () => {
    const storage = new InMemoryAuditStorage();
    const engine = new AuditEngine(storage);

    await engine.logEvent(makeLogParams());
    await engine.logEvent(makeLogParams({ details: { amount: '0.02' } }));
    await engine.logEvent(makeLogParams({ details: { amount: '0.03' } }));

    // Tamper with the second event's details
    const events = await storage.getAll();
    (events[1] as unknown as Record<string, unknown>).details = { amount: 'TAMPERED' };

    const result = await engine.verifyIntegrity();
    expect(result.valid).toBe(false);
    expect(result.brokenAtIndex).toBe(1);
  });

  it('should export events as JSON', async () => {
    const storage = new InMemoryAuditStorage();
    const engine = new AuditEngine(storage);

    await engine.logEvent(makeLogParams({ walletId: 'w1' }));
    await engine.logEvent(makeLogParams({ walletId: 'w2' }));

    const exported = await engine.export();

    expect(exported.version).toBe('1.0.0');
    expect(exported.application).toBe('gravytos');
    expect(exported.totalEvents).toBe(2);
    expect(exported.integrityVerified).toBe(true);
    expect(exported.events.length).toBe(2);
    expect(exported.walletIds).toContain('w1');
    expect(exported.walletIds).toContain('w2');
  });

  it('should verify empty chain as valid', async () => {
    const engine = new AuditEngine();
    const result = await engine.verifyIntegrity();
    expect(result.valid).toBe(true);
    expect(result.totalChecked).toBe(0);
  });

  it('should export with wallet filter', async () => {
    const storage = new InMemoryAuditStorage();
    const engine = new AuditEngine(storage);

    await engine.logEvent(makeLogParams({ walletId: 'w1' }));
    await engine.logEvent(makeLogParams({ walletId: 'w2' }));
    await engine.logEvent(makeLogParams({ walletId: 'w1' }));

    const exported = await engine.export({ walletIds: ['w1'] });
    expect(exported.totalEvents).toBe(2);
    expect(exported.events.every((e) => e.walletId === 'w1')).toBe(true);
  });
});
