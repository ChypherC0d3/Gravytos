// ===================================================================
// GRAVYTOS -- UTXO Manager
// UTXO tracking, labeling, freezing, and coin selection algorithms
// ===================================================================

import type { UTXOInput } from '@gravytos/types';
import { UTXOSelectionStrategy } from '@gravytos/types';
import { InsufficientBalanceError } from '../../errors';
import type { BitcoinRPC, BlockstreamUTXO } from './bitcoin-rpc';

// ─── Constants ──────────────────────────────────────────────────

/** Approximate virtual bytes per P2WPKH input */
const P2WPKH_INPUT_VBYTES = 68;

/** Approximate virtual bytes per P2WPKH output */
const P2WPKH_OUTPUT_VBYTES = 31;

/** Transaction overhead in virtual bytes (version + locktime + segwit marker) */
const TX_OVERHEAD_VBYTES = 10.5;

/** Dust threshold in satoshis (Bitcoin Core default for P2WPKH) */
const DUST_THRESHOLD = 546;

// ─── Helpers ────────────────────────────────────────────────────

function utxoKey(txid: string, vout: number): string {
  return `${txid}:${vout}`;
}

// ─── UTXOManager ────────────────────────────────────────────────

export class UTXOManager {
  private utxoCache: Map<string, UTXOInput[]> = new Map();
  private labels: Map<string, string> = new Map(); // "txid:vout" -> label
  private frozen: Set<string> = new Set(); // "txid:vout"

  constructor(private rpc: BitcoinRPC) {}

  /**
   * Fetch UTXOs for a list of addresses from the API.
   * Merges label and frozen status from the local state.
   */
  async fetchUTXOs(addresses: string[]): Promise<UTXOInput[]> {
    const allUtxos: UTXOInput[] = [];

    for (const address of addresses) {
      const raw: BlockstreamUTXO[] = await this.rpc.getUTXOs(address);

      const mapped: UTXOInput[] = raw.map((u) => {
        const key = utxoKey(u.txid, u.vout);
        return {
          txid: u.txid,
          vout: u.vout,
          value: u.value,
          scriptPubKey: '', // Blockstream API doesn't return scriptPubKey in UTXO list
          address,
          confirmations: u.status.confirmed ? 1 : 0, // Blockstream doesn't give exact confs
          label: this.labels.get(key),
          frozen: this.frozen.has(key),
        };
      });

      this.utxoCache.set(address, mapped);
      allUtxos.push(...mapped);
    }

    return allUtxos;
  }

  /**
   * Select UTXOs to cover a target amount plus fees.
   *
   * @param amount - Target amount in satoshis (sum of recipient outputs)
   * @param feeRate - Fee rate in sat/vB
   * @param strategy - Selection strategy
   * @param availableUtxos - The pool of UTXOs to select from
   * @returns Selected UTXOs, calculated fee, and change amount
   */
  selectUTXOs(
    amount: number,
    feeRate: number,
    strategy: UTXOSelectionStrategy,
    availableUtxos: UTXOInput[],
  ): { selected: UTXOInput[]; fee: number; change: number } {
    // Filter out frozen UTXOs (unless Manual strategy)
    const usable =
      strategy === UTXOSelectionStrategy.Manual
        ? availableUtxos
        : availableUtxos.filter((u) => !u.frozen);

    if (usable.length === 0) {
      throw new InsufficientBalanceError(
        String(amount),
        '0',
        'BTC',
      );
    }

    switch (strategy) {
      case UTXOSelectionStrategy.LargestFirst:
        return this.selectLargestFirst(amount, feeRate, usable);
      case UTXOSelectionStrategy.SmallestFirst:
        return this.selectSmallestFirst(amount, feeRate, usable);
      case UTXOSelectionStrategy.PrivacyOptimized:
        return this.selectPrivacyOptimized(amount, feeRate, usable);
      case UTXOSelectionStrategy.Manual:
        return this.validateManualSelection(amount, feeRate, usable);
      default:
        return this.selectLargestFirst(amount, feeRate, usable);
    }
  }

  // ─── Selection algorithms ───────────────────────────────────

  private selectLargestFirst(
    amount: number,
    feeRate: number,
    utxos: UTXOInput[],
  ): { selected: UTXOInput[]; fee: number; change: number } {
    const sorted = [...utxos].sort((a, b) => b.value - a.value);
    return this.accumulate(sorted, amount, feeRate);
  }

  private selectSmallestFirst(
    amount: number,
    feeRate: number,
    utxos: UTXOInput[],
  ): { selected: UTXOInput[]; fee: number; change: number } {
    const sorted = [...utxos].sort((a, b) => a.value - b.value);
    return this.accumulate(sorted, amount, feeRate);
  }

  private selectPrivacyOptimized(
    amount: number,
    feeRate: number,
    utxos: UTXOInput[],
  ): { selected: UTXOInput[]; fee: number; change: number } {
    // Strategy: prefer a single UTXO that covers the amount to minimize
    // address linkage. If no single UTXO suffices, pick from different
    // addresses and minimize change output.

    // 1. Try to find a single UTXO that covers amount + fee (1 input, 1 output, no change)
    const feeNoChange = this.estimateFee(1, 1, feeRate);
    const singleCandidates = utxos
      .filter((u) => u.value >= amount + feeNoChange)
      .sort((a, b) => a.value - b.value); // smallest sufficient

    if (singleCandidates.length > 0) {
      const chosen = singleCandidates[0];
      const change = chosen.value - amount - feeNoChange;

      // If change is below dust, absorb it into fee
      if (change > 0 && change <= DUST_THRESHOLD) {
        return {
          selected: [chosen],
          fee: feeNoChange + change,
          change: 0,
        };
      }

      // If there's meaningful change, recalculate fee with change output
      if (change > DUST_THRESHOLD) {
        const feeWithChange = this.estimateFee(1, 2, feeRate);
        const actualChange = chosen.value - amount - feeWithChange;
        if (actualChange > DUST_THRESHOLD) {
          return {
            selected: [chosen],
            fee: feeWithChange,
            change: actualChange,
          };
        }
        // Change would be dust with extra output; absorb
        return {
          selected: [chosen],
          fee: feeNoChange + change,
          change: 0,
        };
      }

      return {
        selected: [chosen],
        fee: feeNoChange,
        change: 0,
      };
    }

    // 2. Fall back: select from different addresses to avoid linking
    const byAddress = new Map<string, UTXOInput[]>();
    for (const u of utxos) {
      const list = byAddress.get(u.address) ?? [];
      list.push(u);
      byAddress.set(u.address, list);
    }

    // Pick one UTXO per address (the largest from each), sorted descending
    const diversified: UTXOInput[] = [];
    for (const [, addressUtxos] of byAddress) {
      const best = addressUtxos.reduce((a, b) =>
        a.value > b.value ? a : b,
      );
      diversified.push(best);
    }
    diversified.sort((a, b) => b.value - a.value);

    return this.accumulate(diversified, amount, feeRate);
  }

  private validateManualSelection(
    amount: number,
    feeRate: number,
    utxos: UTXOInput[],
  ): { selected: UTXOInput[]; fee: number; change: number } {
    // Assume 1 recipient output + potential change output
    const fee = this.estimateFee(utxos.length, 2, feeRate);
    const totalInput = this.getTotalBalance(utxos);

    if (totalInput < amount + fee) {
      throw new InsufficientBalanceError(
        String(amount + fee),
        String(totalInput),
        'BTC',
      );
    }

    const change = totalInput - amount - fee;

    // If change is dust, absorb into fee
    if (change > 0 && change <= DUST_THRESHOLD) {
      return {
        selected: utxos,
        fee: fee + change,
        change: 0,
      };
    }

    return { selected: utxos, fee, change };
  }

  /**
   * Accumulate UTXOs from a sorted list until the target amount + fees are covered.
   */
  private accumulate(
    sorted: UTXOInput[],
    amount: number,
    feeRate: number,
  ): { selected: UTXOInput[]; fee: number; change: number } {
    const selected: UTXOInput[] = [];
    let totalInput = 0;

    for (const utxo of sorted) {
      selected.push(utxo);
      totalInput += utxo.value;

      // Estimate fee: assume 1 recipient output + possible change output
      const outputCount = 2; // recipient + change (conservative)
      const fee = this.estimateFee(selected.length, outputCount, feeRate);

      if (totalInput >= amount + fee) {
        const change = totalInput - amount - fee;

        // If change is dust, absorb it into the fee
        if (change > 0 && change <= DUST_THRESHOLD) {
          return {
            selected,
            fee: fee + change,
            change: 0,
          };
        }

        // If no change, recalculate with 1 output
        if (change === 0) {
          const feeNoChange = this.estimateFee(
            selected.length,
            1,
            feeRate,
          );
          return {
            selected,
            fee: feeNoChange,
            change: totalInput - amount - feeNoChange,
          };
        }

        return { selected, fee, change };
      }
    }

    // Not enough funds
    const requiredMin = amount + this.estimateFee(sorted.length, 2, feeRate);
    throw new InsufficientBalanceError(
      String(requiredMin),
      String(totalInput),
      'BTC',
    );
  }

  // ─── Fee estimation ─────────────────────────────────────────

  /**
   * Estimate the transaction fee in satoshis.
   * Formula: ceil((TX_OVERHEAD + inputs * P2WPKH_INPUT + outputs * P2WPKH_OUTPUT) * feeRate)
   */
  estimateFee(
    inputCount: number,
    outputCount: number,
    feeRate: number,
  ): number {
    const vbytes =
      TX_OVERHEAD_VBYTES +
      inputCount * P2WPKH_INPUT_VBYTES +
      outputCount * P2WPKH_OUTPUT_VBYTES;
    return Math.ceil(vbytes * feeRate);
  }

  // ─── Labeling ─────────────────────────────────────────────────

  labelUTXO(txid: string, vout: number, label: string): void {
    this.labels.set(utxoKey(txid, vout), label);

    // Update cached UTXOs
    for (const [, utxos] of this.utxoCache) {
      for (const u of utxos) {
        if (u.txid === txid && u.vout === vout) {
          u.label = label;
        }
      }
    }
  }

  getLabel(txid: string, vout: number): string | undefined {
    return this.labels.get(utxoKey(txid, vout));
  }

  // ─── Freezing ─────────────────────────────────────────────────

  freezeUTXO(txid: string, vout: number): void {
    this.frozen.add(utxoKey(txid, vout));

    for (const [, utxos] of this.utxoCache) {
      for (const u of utxos) {
        if (u.txid === txid && u.vout === vout) {
          u.frozen = true;
        }
      }
    }
  }

  unfreezeUTXO(txid: string, vout: number): void {
    this.frozen.delete(utxoKey(txid, vout));

    for (const [, utxos] of this.utxoCache) {
      for (const u of utxos) {
        if (u.txid === txid && u.vout === vout) {
          u.frozen = false;
        }
      }
    }
  }

  isFrozen(txid: string, vout: number): boolean {
    return this.frozen.has(utxoKey(txid, vout));
  }

  // ─── Queries ──────────────────────────────────────────────────

  getUTXOsForAddress(address: string): UTXOInput[] {
    return this.utxoCache.get(address) ?? [];
  }

  getAllUTXOs(): UTXOInput[] {
    const all: UTXOInput[] = [];
    for (const [, utxos] of this.utxoCache) {
      all.push(...utxos);
    }
    return all;
  }

  getTotalBalance(utxos: UTXOInput[]): number {
    return utxos.reduce((sum, u) => sum + u.value, 0);
  }
}
