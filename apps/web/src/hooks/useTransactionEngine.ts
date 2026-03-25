// ===================================================================
// NEXORA VAULT -- useTransactionEngine Hook
// Wires the core transaction engine to React
// ===================================================================

import { useRef, useCallback } from 'react';
import {
  TransactionEngine,
  PrivacyEngine,
  AuditEngine,
  InMemoryAuditStorage,
  ChainAdapterRegistry,
  EVMAdapter,
  SolanaAdapter,
  BitcoinAdapter,
} from '@gravytos/core';
import { MVP_CHAINS } from '@gravytos/config';
import { useTransactionStore } from '@gravytos/state';
import type { TransactionRequest } from '@gravytos/types';

export function useTransactionEngine() {
  const engineRef = useRef<TransactionEngine | null>(null);
  const auditRef = useRef<AuditEngine | null>(null);
  const { addPending, updateStatus, moveToDone } = useTransactionStore();

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      // Initialize adapters for all MVP chains
      const registry = new ChainAdapterRegistry();

      // Register EVM adapters
      const evmChains = MVP_CHAINS.filter((c) => c.family === ('evm' as string));
      for (const chain of evmChains) {
        const adapter = new EVMAdapter(chain.id);
        adapter.initialize(chain);
        registry.register(adapter);
      }

      // Register Bitcoin adapter
      const btcChain = MVP_CHAINS.find((c) => c.family === ('bitcoin' as string));
      if (btcChain) {
        const btcAdapter = new BitcoinAdapter();
        btcAdapter.initialize(btcChain);
        registry.register(btcAdapter);
      }

      // Register Solana adapter
      const solChain = MVP_CHAINS.find((c) => c.family === ('solana' as string));
      if (solChain) {
        const solAdapter = new SolanaAdapter();
        solAdapter.initialize(solChain);
        registry.register(solAdapter);
      }

      const privacy = new PrivacyEngine();
      const audit = new AuditEngine(new InMemoryAuditStorage());
      auditRef.current = audit;

      engineRef.current = new TransactionEngine(registry, privacy, audit);
    }
    return engineRef.current;
  }, []);

  const sendTransaction = useCallback(
    async (request: TransactionRequest) => {
      const engine = getEngine();

      // Add to pending in store
      addPending({
        txHash: 'pending...',
        status: 'pending',
        chainId: request.chainId,
        fee: '0',
        timestamp: Date.now(),
        type: 'send',
        description: `Send ${request.value} to ${request.to.substring(0, 10)}...`,
      });

      try {
        const result = await engine.send(request);

        // Update store with real hash
        updateStatus(result.txHash, 'broadcasting');

        return result;
      } catch (error) {
        // Update the pending entry to failed
        updateStatus('pending...', 'failed');
        throw error;
      }
    },
    [getEngine, addPending, updateStatus],
  );

  const waitForConfirmation = useCallback(
    async (chainId: string, txHash: string) => {
      const engine = getEngine();
      const result = await engine.waitForConfirmation(chainId, txHash);
      if (result.status === 'confirmed') {
        moveToDone(txHash);
      } else if (result.status === 'failed') {
        updateStatus(txHash, 'failed');
      }
      return result;
    },
    [getEngine, moveToDone, updateStatus],
  );

  const getAuditEngine = useCallback(() => auditRef.current, []);

  return { sendTransaction, getEngine, getAuditEngine, waitForConfirmation };
}
