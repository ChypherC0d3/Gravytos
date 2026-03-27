// ===================================================================
// GRAVYTOS -- useTransactionEngine Hook
// Wires the core transaction engine, swap engine, and bridge engine to React
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
  SwapEngine,
  BridgeEngine,
} from '@gravytos/core';
import { MVP_CHAINS } from '@gravytos/config';
import { useTransactionStore } from '@gravytos/state';
import type { TransactionRequest, SwapQuoteParams, SwapQuote, BridgeQuoteParams, BridgeQuote } from '@gravytos/types';

export function useTransactionEngine() {
  const engineRef = useRef<TransactionEngine | null>(null);
  const auditRef = useRef<AuditEngine | null>(null);
  const swapEngineRef = useRef<SwapEngine | null>(null);
  const bridgeEngineRef = useRef<BridgeEngine | null>(null);
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

  const getSwapEngine = useCallback(() => {
    if (!swapEngineRef.current) {
      swapEngineRef.current = new SwapEngine();
    }
    return swapEngineRef.current;
  }, []);

  const getBridgeEngine = useCallback(() => {
    if (!bridgeEngineRef.current) {
      bridgeEngineRef.current = new BridgeEngine();
    }
    return bridgeEngineRef.current;
  }, []);

  // ── Send Transaction ──────────────────────────────────────

  const sendTransaction = useCallback(
    async (request: TransactionRequest, privateKey?: Uint8Array) => {
      const engine = getEngine();

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
        const result = await engine.send(request, privateKey);
        updateStatus(result.txHash, 'broadcasting');
        return result;
      } catch (error) {
        updateStatus('pending...', 'failed');
        throw error;
      }
    },
    [getEngine, addPending, updateStatus],
  );

  // ── Swap: Get Quote ───────────────────────────────────────

  const getSwapQuote = useCallback(
    async (params: SwapQuoteParams): Promise<SwapQuote> => {
      const swap = getSwapEngine();
      return swap.getQuote(params);
    },
    [getSwapEngine],
  );

  // ── Swap: Execute ─────────────────────────────────────────

  const executeSwap = useCallback(
    async (params: SwapQuoteParams): Promise<SwapQuote & { tx: { to: string; data: string; value: string; gasLimit?: string } }> => {
      const swap = getSwapEngine();

      addPending({
        txHash: 'pending...',
        status: 'pending',
        chainId: params.chainId,
        fee: '0',
        timestamp: Date.now(),
        type: 'swap',
        description: `Swap ${params.fromToken} to ${params.toToken}`,
      });

      try {
        const result = await swap.executeSwap(params);
        return result;
      } catch (error) {
        updateStatus('pending...', 'failed');
        throw error;
      }
    },
    [getSwapEngine, addPending, updateStatus],
  );

  // ── Swap: Jupiter (Solana) ────────────────────────────────

  const getJupiterQuote = useCallback(
    async (params: {
      inputMint: string;
      outputMint: string;
      amount: string;
      slippageBps: number;
      userPublicKey: string;
    }) => {
      const swap = getSwapEngine();
      return swap.getJupiterQuote(params);
    },
    [getSwapEngine],
  );

  const getJupiterSwapTransaction = useCallback(
    async (quoteResponse: unknown, userPublicKey: string) => {
      const swap = getSwapEngine();
      return swap.getJupiterSwapTransaction(quoteResponse, userPublicKey);
    },
    [getSwapEngine],
  );

  // ── Bridge: Get Quote ─────────────────────────────────────

  const getBridgeQuote = useCallback(
    async (params: BridgeQuoteParams): Promise<BridgeQuote> => {
      const bridge = getBridgeEngine();
      return bridge.getQuote(params);
    },
    [getBridgeEngine],
  );

  // ── Bridge: Execute ───────────────────────────────────────

  const executeBridge = useCallback(
    async (params: BridgeQuoteParams): Promise<BridgeQuote & { tx: { to: string; data: string; value: string } }> => {
      const bridge = getBridgeEngine();

      addPending({
        txHash: 'pending...',
        status: 'pending',
        chainId: params.fromChainId,
        fee: '0',
        timestamp: Date.now(),
        type: 'bridge',
        description: `Bridge ${params.fromToken} from ${params.fromChainId} to ${params.toChainId}`,
      });

      try {
        const result = await bridge.getBridgeTransaction(params);
        return result;
      } catch (error) {
        updateStatus('pending...', 'failed');
        throw error;
      }
    },
    [getBridgeEngine, addPending, updateStatus],
  );

  // ── Bridge: Track Status ──────────────────────────────────

  const trackBridgeStatus = useCallback(
    async (
      txHash: string,
      fromChainId: string,
      toChainId: string,
      onUpdate?: (status: { status: string; substatus?: string; destinationTxHash?: string }) => void,
    ) => {
      const bridge = getBridgeEngine();
      return bridge.trackStatus(txHash, fromChainId, toChainId, onUpdate);
    },
    [getBridgeEngine],
  );

  // ── Confirmation ──────────────────────────────────────────

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

  return {
    // Core send
    sendTransaction,
    getEngine,
    getAuditEngine,
    waitForConfirmation,
    // Swap
    getSwapQuote,
    executeSwap,
    getJupiterQuote,
    getJupiterSwapTransaction,
    // Bridge
    getBridgeQuote,
    executeBridge,
    trackBridgeStatus,
  };
}
