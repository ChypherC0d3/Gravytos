// ===================================================================
// GRAVYTOS -- Bitcoin Chain Adapter
// Full ChainAdapter implementation for the Bitcoin UTXO chain
// ===================================================================

import {
  ChainFamily,
  PrivacyLevel,
  UTXOSelectionStrategy,
} from '@gravytos/types';
import type {
  ChainConfig,
  ChainId,
  TransactionRequest,
  UnsignedTransaction,
  SignedTransaction,
  TransactionStatus,
  PrivacyCapability,
  UTXOInput,
} from '@gravytos/types';
import type { ChainAdapter } from '../types';
import { BitcoinRPC } from './bitcoin-rpc';
import { UTXOManager } from './utxo-manager';
import { BitcoinTransactionBuilder } from './bitcoin-tx-builder';
import { GravytosError } from '../../errors';

// ─── Constants ──────────────────────────────────────────────────

const SATOSHIS_PER_BTC = 100_000_000;

function satsToBtc(sats: number): string {
  return (sats / SATOSHIS_PER_BTC).toFixed(8);
}

function btcToSats(btc: string): number {
  return Math.round(parseFloat(btc) * SATOSHIS_PER_BTC);
}

// ─── BitcoinAdapter ─────────────────────────────────────────────

export class BitcoinAdapter implements ChainAdapter {
  readonly chainFamily = ChainFamily.Bitcoin;
  readonly chainId: ChainId = 'bitcoin-mainnet';

  private rpc!: BitcoinRPC;
  private utxoManager!: UTXOManager;
  private txBuilder!: BitcoinTransactionBuilder;
  private _initialized = false;

  // ─── Lifecycle ──────────────────────────────────────────────

  async initialize(config: ChainConfig): Promise<void> {
    if (this._initialized) return;

    const rpcUrl =
      config.rpcUrls.length > 0
        ? config.rpcUrls[0]
        : 'https://blockstream.info/api';

    const network = config.isTestnet ? 'testnet' : 'mainnet';

    this.rpc = new BitcoinRPC(rpcUrl);
    this.utxoManager = new UTXOManager(this.rpc);
    this.txBuilder = new BitcoinTransactionBuilder(network);

    // Override chainId to match config
    (this as { chainId: string }).chainId = config.id;

    this._initialized = true;
  }

  isInitialized(): boolean {
    return this._initialized;
  }

  // ─── Balance ────────────────────────────────────────────────

  /**
   * Get the native BTC balance for an address.
   * @returns Balance in BTC as a decimal string.
   */
  async getBalance(address: string): Promise<string> {
    this.ensureInitialized();
    const { confirmed, unconfirmed } = await this.rpc.getBalance(address);
    return satsToBtc(confirmed + unconfirmed);
  }

  /**
   * Bitcoin has no token standard -- always returns '0'.
   */
  async getTokenBalance(
    _address: string,
    _tokenAddress: string,
  ): Promise<string> {
    return '0';
  }

  // ─── Transaction building ───────────────────────────────────

  async buildTransaction(
    request: TransactionRequest,
  ): Promise<UnsignedTransaction> {
    this.ensureInitialized();

    const amountSats = btcToSats(request.value);

    // Determine fee rate
    let feeRate: number;
    if (request.feeRate) {
      feeRate = parseFloat(request.feeRate);
    } else {
      const estimates = await this.getFeeEstimates();
      feeRate = estimates.medium;
    }

    // Choose UTXO selection strategy based on privacy level
    const strategy = this.privacyLevelToStrategy(request.privacyLevel);

    // Get available UTXOs
    let availableUtxos: UTXOInput[];
    if (request.utxos && request.utxos.length > 0) {
      availableUtxos = request.utxos;
    } else {
      availableUtxos = await this.utxoManager.fetchUTXOs([request.from]);
    }

    // Select UTXOs
    const { selected } = this.utxoManager.selectUTXOs(
      amountSats,
      feeRate,
      strategy,
      availableUtxos,
    );

    // Build PSBT
    const changeAddress = request.changeAddress ?? request.from;
    const recipients = [{ address: request.to, amount: amountSats }];

    const { psbt, fee: actualFee } = this.txBuilder.buildTransaction({
      utxos: selected,
      recipients,
      changeAddress,
      feeRate,
    });

    // Use the fee from the builder (most accurate)
    const feeBtc = satsToBtc(actualFee);

    // Serialize the PSBT to bytes
    const psbtBytes = psbt.toBuffer();

    return {
      chainId: this.chainId,
      raw: new Uint8Array(psbtBytes),
      summary: {
        type: 'send',
        from: request.from,
        to: request.to,
        value: request.value,
        tokenSymbol: 'BTC',
        estimatedFee: feeBtc,
        feeTokenSymbol: 'BTC',
      },
      estimatedFee: feeBtc,
    };
  }

  async signTransaction(
    tx: UnsignedTransaction,
    privateKey?: Uint8Array,
  ): Promise<SignedTransaction> {
    this.ensureInitialized();

    if (!privateKey) {
      throw new GravytosError(
        'Private key required for Bitcoin transaction signing',
        'MISSING_KEY',
      );
    }

    // Deserialize the PSBT from the raw bytes
    const psbt = bitcoin_Psbt_fromBuffer(tx.raw);

    // Sign with the provided key
    this.txBuilder.signTransaction(psbt, [privateKey]);

    // Finalize and extract the raw transaction hex
    const txHex = this.txBuilder.finalizeAndExtract(psbt);

    // Compute the txid (double-SHA256 of raw tx, reversed)
    // We'll extract it from the bitcoinjs Transaction object
    const txHexBytes = hexToUint8Array(txHex);

    return {
      chainId: this.chainId,
      raw: txHexBytes,
      txHash: '', // Will be set by the network upon broadcast
    };
  }

  async broadcastTransaction(tx: SignedTransaction): Promise<string> {
    this.ensureInitialized();
    const txHex = uint8ArrayToHex(tx.raw);
    const txid = await this.rpc.broadcastTransaction(txHex);
    return txid;
  }

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    this.ensureInitialized();

    try {
      const txData = await this.rpc.getTransaction(txHash);
      const status = txData['status'] as
        | { confirmed: boolean; block_height?: number }
        | undefined;

      if (status?.confirmed) {
        return 'confirmed';
      }
      return 'confirming';
    } catch {
      return 'pending';
    }
  }

  async estimateFee(request: TransactionRequest): Promise<string> {
    this.ensureInitialized();

    let feeRate: number;
    if (request.feeRate) {
      feeRate = parseFloat(request.feeRate);
    } else {
      const estimates = await this.getFeeEstimates();
      feeRate = estimates.medium;
    }

    // Estimate with 1 input, 2 outputs (recipient + change) as a baseline
    const feeSats = this.txBuilder.estimateFee(1, 2, feeRate);
    return satsToBtc(feeSats);
  }

  // ─── Privacy ────────────────────────────────────────────────

  getPrivacyCapabilities(): PrivacyCapability[] {
    return [
      {
        id: 'coin_control',
        name: 'Coin Control',
        description:
          'Manually select which UTXOs to spend, preventing unwanted address linkage.',
        minLevel: PrivacyLevel.Medium,
        supportedChains: [ChainFamily.Bitcoin],
        active: true,
      },
      {
        id: 'address_rotation',
        name: 'Address Rotation',
        description:
          'Generate a new receiving address for each transaction to reduce address reuse.',
        minLevel: PrivacyLevel.Low,
        supportedChains: [ChainFamily.Bitcoin],
        active: true,
      },
      {
        id: 'utxo_labeling',
        name: 'UTXO Labeling',
        description:
          'Attach labels to UTXOs to track their origin and purpose for better coin control.',
        minLevel: PrivacyLevel.Low,
        supportedChains: [ChainFamily.Bitcoin],
        active: true,
      },
      {
        id: 'coinjoin_prep',
        name: 'CoinJoin Preparation',
        description:
          'Prepare UTXOs for CoinJoin rounds by selecting appropriately sized inputs.',
        minLevel: PrivacyLevel.High,
        supportedChains: [ChainFamily.Bitcoin],
        active: false, // Requires external coordinator
      },
    ];
  }

  // ─── Bitcoin-specific public API ────────────────────────────

  /**
   * Fetch UTXOs for a list of addresses.
   */
  async getUTXOs(addresses: string[]): Promise<UTXOInput[]> {
    this.ensureInitialized();
    return this.utxoManager.fetchUTXOs(addresses);
  }

  /**
   * Get fee estimates for fast, medium, and slow confirmation targets.
   * Maps to ~1 block (fast), ~3 blocks (medium), ~6 blocks (slow).
   */
  async getFeeEstimates(): Promise<{
    fast: number;
    medium: number;
    slow: number;
  }> {
    this.ensureInitialized();

    const estimates = await this.rpc.getFeeEstimates();

    // Blockstream returns { "1": x, "3": y, "6": z, ... }
    // Fall back to reasonable defaults if specific targets are missing
    const fast = estimates['1'] ?? estimates['2'] ?? 50;
    const medium = estimates['3'] ?? estimates['6'] ?? 25;
    const slow = estimates['6'] ?? estimates['12'] ?? 10;

    return {
      fast: Math.ceil(fast),
      medium: Math.ceil(medium),
      slow: Math.ceil(slow),
    };
  }

  /**
   * Access the underlying UTXO manager for coin control operations.
   */
  getUTXOManager(): UTXOManager {
    this.ensureInitialized();
    return this.utxoManager;
  }

  // ─── Internal helpers ───────────────────────────────────────

  private ensureInitialized(): void {
    if (!this._initialized) {
      throw new GravytosError(
        'BitcoinAdapter not initialized. Call initialize() first.',
        'NOT_INITIALIZED',
      );
    }
  }

  private privacyLevelToStrategy(
    level: PrivacyLevel,
  ): UTXOSelectionStrategy {
    switch (level) {
      case PrivacyLevel.High:
        return UTXOSelectionStrategy.PrivacyOptimized;
      case PrivacyLevel.Medium:
        return UTXOSelectionStrategy.LargestFirst;
      case PrivacyLevel.Low:
      default:
        return UTXOSelectionStrategy.LargestFirst;
    }
  }
}

// ─── Utility functions ──────────────────────────────────────────

/**
 * Reconstruct a Psbt from a Uint8Array / Buffer.
 * We dynamically import to avoid issues with the Psbt class type.
 */
function bitcoin_Psbt_fromBuffer(raw: Uint8Array): import('bitcoinjs-lib').Psbt {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Psbt } = require('bitcoinjs-lib') as typeof import('bitcoinjs-lib');
  return Psbt.fromBuffer(Buffer.from(raw));
}

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function uint8ArrayToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
