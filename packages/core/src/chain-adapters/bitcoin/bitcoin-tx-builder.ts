// ===================================================================
// GRAVYTOS -- Bitcoin Transaction Builder
// PSBT-based transaction construction, signing, and extraction
// ===================================================================

import * as bitcoin from 'bitcoinjs-lib';
import { initEccLib } from 'bitcoinjs-lib';
import ECPairFactory from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import type { UTXOInput } from '@gravytos/types';
import { GravytosError } from '../../errors';

// ─── Initialize ECC library ────────────────────────────────────

initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

// ─── Constants ──────────────────────────────────────────────────

const P2WPKH_INPUT_VBYTES = 68;
const P2WPKH_OUTPUT_VBYTES = 31;
const TX_OVERHEAD_VBYTES = 10.5;
const DUST_THRESHOLD = 546;

// ─── Types ──────────────────────────────────────────────────────

type NetworkType = typeof bitcoin.networks.bitcoin;

export interface BuildTransactionParams {
  utxos: UTXOInput[];
  recipients: Array<{ address: string; amount: number }>; // amount in satoshis
  changeAddress: string;
  feeRate: number; // sat/vB
}

export interface BuildTransactionResult {
  psbt: bitcoin.Psbt;
  fee: number;
}

// ─── BitcoinTransactionBuilder ──────────────────────────────────

export class BitcoinTransactionBuilder {
  private network: NetworkType;

  constructor(network: 'mainnet' | 'testnet' = 'mainnet') {
    this.network =
      network === 'mainnet'
        ? bitcoin.networks.bitcoin
        : bitcoin.networks.testnet;
  }

  /**
   * Build an unsigned PSBT from UTXOs and recipient outputs.
   *
   * Steps:
   * 1. Add all UTXO inputs with witness data
   * 2. Add all recipient outputs
   * 3. Calculate fee based on virtual size
   * 4. Add change output if change exceeds dust threshold
   * 5. Return the unsigned PSBT and the computed fee
   */
  buildTransaction(params: BuildTransactionParams): BuildTransactionResult {
    const { utxos, recipients, changeAddress, feeRate } = params;

    if (utxos.length === 0) {
      throw new GravytosError('No UTXOs provided', 'NO_UTXOS');
    }

    if (recipients.length === 0) {
      throw new GravytosError('No recipients provided', 'NO_RECIPIENTS');
    }

    const psbt = new bitcoin.Psbt({ network: this.network });

    // ── Add inputs ────────────────────────────────────────────
    for (const utxo of utxos) {
      // For P2WPKH inputs we need the witnessUtxo field.
      // If scriptPubKey is provided, use it. Otherwise, derive from address.
      let script: Uint8Array;

      if (utxo.scriptPubKey && utxo.scriptPubKey.length > 0) {
        script = hexToUint8Array(utxo.scriptPubKey);
      } else {
        // Derive the output script from the address
        script = bitcoin.address.toOutputScript(
          utxo.address,
          this.network,
        );
      }

      psbt.addInput({
        hash: utxo.txid,
        index: utxo.vout,
        witnessUtxo: {
          script,
          value: BigInt(utxo.value),
        },
      });
    }

    // ── Add recipient outputs ─────────────────────────────────
    const totalOutput = recipients.reduce((s, r) => s + r.amount, 0);

    for (const recipient of recipients) {
      if (recipient.amount <= 0) {
        throw new GravytosError(
          `Invalid output amount: ${recipient.amount}`,
          'INVALID_AMOUNT',
        );
      }

      psbt.addOutput({
        address: recipient.address,
        value: BigInt(recipient.amount),
      });
    }

    // ── Calculate fee ─────────────────────────────────────────
    const totalInput = utxos.reduce((s, u) => s + u.value, 0);

    // First, estimate fee assuming a change output exists
    const feeWithChange = this.estimateFee(
      utxos.length,
      recipients.length + 1,
      feeRate,
    );

    const changeAmount = totalInput - totalOutput - feeWithChange;

    if (changeAmount < 0) {
      // Even with all UTXOs, can't cover outputs + fee
      throw new GravytosError(
        `Insufficient funds: inputs=${totalInput}, outputs=${totalOutput}, fee=${feeWithChange}`,
        'INSUFFICIENT_FUNDS',
      );
    }

    let actualFee: number;

    if (changeAmount > DUST_THRESHOLD) {
      // Add change output
      psbt.addOutput({
        address: changeAddress,
        value: BigInt(changeAmount),
      });
      actualFee = feeWithChange;
    } else {
      // No change output; recalculate fee without change
      const feeNoChange = this.estimateFee(
        utxos.length,
        recipients.length,
        feeRate,
      );
      // The "excess" goes to miners as additional fee
      actualFee = totalInput - totalOutput;

      // Sanity check: fee should be at least the minimum estimated fee
      if (actualFee < feeNoChange) {
        throw new GravytosError(
          `Insufficient funds: inputs=${totalInput}, outputs=${totalOutput}, minFee=${feeNoChange}`,
          'INSUFFICIENT_FUNDS',
        );
      }
    }

    return { psbt, fee: actualFee };
  }

  /**
   * Sign each input of the PSBT with the corresponding private key.
   * If a single key is provided, it is used for all inputs.
   * If multiple keys are provided, each key signs the corresponding input by index.
   */
  signTransaction(
    psbt: bitcoin.Psbt,
    privateKeys: Uint8Array[],
  ): bitcoin.Psbt {
    const inputCount = psbt.data.inputs.length;

    if (privateKeys.length === 1) {
      // Sign all inputs with the same key
      const keyPair = ECPair.fromPrivateKey(
        Buffer.from(privateKeys[0]),
        { network: this.network },
      );
      for (let i = 0; i < inputCount; i++) {
        psbt.signInput(i, keyPair);
      }
    } else if (privateKeys.length === inputCount) {
      // Sign each input with its corresponding key
      for (let i = 0; i < inputCount; i++) {
        const keyPair = ECPair.fromPrivateKey(
          Buffer.from(privateKeys[i]),
          { network: this.network },
        );
        psbt.signInput(i, keyPair);
      }
    } else {
      throw new GravytosError(
        `Key count mismatch: ${privateKeys.length} keys for ${inputCount} inputs. ` +
          'Provide either 1 key (for all inputs) or exactly one key per input.',
        'KEY_MISMATCH',
      );
    }

    return psbt;
  }

  /**
   * Finalize all inputs and extract the raw signed transaction hex.
   */
  finalizeAndExtract(psbt: bitcoin.Psbt): string {
    psbt.finalizeAllInputs();
    const tx = psbt.extractTransaction();
    return tx.toHex();
  }

  /**
   * Estimate the transaction fee in satoshis given input/output counts and fee rate.
   * Uses P2WPKH weight assumptions.
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
}

// ─── Utility ────────────────────────────────────────────────────

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
