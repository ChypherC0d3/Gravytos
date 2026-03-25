import { describe, it, expect } from 'vitest';
import { UTXOManager } from '../chain-adapters/bitcoin/utxo-manager';
import { UTXOSelectionStrategy } from '@gravytos/types';
import type { UTXOInput } from '@gravytos/types';

// Create a mock RPC that never hits the network
const mockRpc = {
  getUTXOs: async () => [],
  getTransaction: async () => ({}),
  getAddressStats: async () => ({ funded_txo_sum: 0, spent_txo_sum: 0 }),
  broadcastTransaction: async () => '',
  getFeeEstimates: async () => ({}),
} as any;

function makeUTXO(
  value: number,
  address = 'bc1qtest',
  overrides: Partial<UTXOInput> = {},
): UTXOInput {
  return {
    txid: Math.random().toString(36).substring(2, 66).padEnd(64, '0'),
    vout: 0,
    value,
    scriptPubKey: '',
    address,
    confirmations: 6,
    ...overrides,
  };
}

describe('Bitcoin Adapter', () => {
  describe('UTXO Manager', () => {
    it('should select UTXOs with LargestFirst strategy', () => {
      const manager = new UTXOManager(mockRpc);
      const utxos = [
        makeUTXO(10000),
        makeUTXO(50000),
        makeUTXO(30000),
        makeUTXO(20000),
      ];

      const result = manager.selectUTXOs(
        40000,
        10,
        UTXOSelectionStrategy.LargestFirst,
        utxos,
      );

      // LargestFirst should pick 50000 first
      expect(result.selected[0].value).toBe(50000);
      expect(result.selected.length).toBe(1);
    });

    it('should select UTXOs with SmallestFirst strategy', () => {
      const manager = new UTXOManager(mockRpc);
      const utxos = [
        makeUTXO(10000),
        makeUTXO(50000),
        makeUTXO(30000),
        makeUTXO(20000),
      ];

      const result = manager.selectUTXOs(
        5000,
        1,
        UTXOSelectionStrategy.SmallestFirst,
        utxos,
      );

      // SmallestFirst should pick 10000 first
      expect(result.selected[0].value).toBe(10000);
    });

    it('should select UTXOs with PrivacyOptimized strategy', () => {
      const manager = new UTXOManager(mockRpc);
      const utxos = [
        makeUTXO(10000, 'bc1qaddr1'),
        makeUTXO(50000, 'bc1qaddr2'),
        makeUTXO(30000, 'bc1qaddr3'),
      ];

      const result = manager.selectUTXOs(
        25000,
        1,
        UTXOSelectionStrategy.PrivacyOptimized,
        utxos,
      );

      // PrivacyOptimized prefers a single UTXO to avoid address linking
      expect(result.selected.length).toBe(1);
      // Should pick 30000 (smallest sufficient UTXO)
      expect(result.selected[0].value).toBe(30000);
    });

    it('should correctly calculate fees', () => {
      const manager = new UTXOManager(mockRpc);
      // 1 input, 2 outputs, 10 sat/vB
      // Expected: ceil((10.5 + 1*68 + 2*31) * 10) = ceil(140.5 * 10) = ceil(1405) = 1405
      const fee = manager.estimateFee(1, 2, 10);
      expect(fee).toBe(1405);
    });

    it('should freeze and unfreeze UTXOs', () => {
      const manager = new UTXOManager(mockRpc);
      const txid = 'a'.repeat(64);

      manager.freezeUTXO(txid, 0);
      expect(manager.isFrozen(txid, 0)).toBe(true);

      manager.unfreezeUTXO(txid, 0);
      expect(manager.isFrozen(txid, 0)).toBe(false);
    });

    it('should label UTXOs', () => {
      const manager = new UTXOManager(mockRpc);
      const txid = 'b'.repeat(64);

      manager.labelUTXO(txid, 0, 'Coinbase payout');
      expect(manager.getLabel(txid, 0)).toBe('Coinbase payout');
    });

    it('should not select frozen UTXOs', () => {
      const manager = new UTXOManager(mockRpc);
      const frozenUtxo = makeUTXO(100000, 'bc1qfrozen', { frozen: true });
      const normalUtxo = makeUTXO(50000, 'bc1qnormal');

      const result = manager.selectUTXOs(
        40000,
        1,
        UTXOSelectionStrategy.LargestFirst,
        [frozenUtxo, normalUtxo],
      );

      // Should only have the non-frozen UTXO
      expect(result.selected.every((u) => !u.frozen)).toBe(true);
      expect(result.selected[0].value).toBe(50000);
    });

    it('should throw InsufficientBalanceError when funds are not enough', () => {
      const manager = new UTXOManager(mockRpc);
      const utxos = [makeUTXO(1000)];

      expect(() =>
        manager.selectUTXOs(
          999999,
          10,
          UTXOSelectionStrategy.LargestFirst,
          utxos,
        ),
      ).toThrow();
    });
  });

  describe('Fee Estimation', () => {
    it('should estimate segwit transaction size correctly', () => {
      const manager = new UTXOManager(mockRpc);

      // 2 inputs, 2 outputs, 5 sat/vB
      // vbytes = 10.5 + 2*68 + 2*31 = 10.5 + 136 + 62 = 208.5
      // fee = ceil(208.5 * 5) = ceil(1042.5) = 1043
      const fee = manager.estimateFee(2, 2, 5);
      expect(fee).toBe(1043);
    });

    it('should handle dust threshold in UTXO selection', () => {
      const manager = new UTXOManager(mockRpc);
      // A UTXO that barely covers amount + fee should absorb dust change into fee
      // 1 input, 2 outputs (conservative), 1 sat/vB => fee = ceil(140.5) = 141
      // If UTXO = 5141 and amount = 5000, change = 0, exactly enough
      const utxos = [makeUTXO(5141)];

      const result = manager.selectUTXOs(
        5000,
        1,
        UTXOSelectionStrategy.LargestFirst,
        utxos,
      );

      // Change should be 0 or absorbed into fee (within dust threshold)
      expect(result.selected.length).toBe(1);
      expect(result.fee + result.change).toBe(141);
    });
  });
});
