// ===================================================================
// NEXORA VAULT -- Bitcoin RPC Client
// Blockstream / Mempool.space REST API client for Bitcoin
// ===================================================================

import { RPCError } from '../../errors';

const BLOCKSTREAM_API = 'https://blockstream.info/api';
const _MEMPOOL_API = 'https://mempool.space/api';
// Prefix to suppress noUnusedLocals while keeping the constant available
void _MEMPOOL_API;

// ─── Types ──────────────────────────────────────────────────────

export interface BlockstreamUTXO {
  txid: string;
  vout: number;
  status: {
    confirmed: boolean;
    block_height: number;
    block_time: number;
  };
  value: number; // satoshis
}

export interface AddressStats {
  address: string;
  chain_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
  mempool_stats: {
    funded_txo_count: number;
    funded_txo_sum: number;
    spent_txo_count: number;
    spent_txo_sum: number;
    tx_count: number;
  };
}

// ─── BitcoinRPC ─────────────────────────────────────────────────

export class BitcoinRPC {
  private baseUrl: string;

  constructor(baseUrl: string = BLOCKSTREAM_API) {
    // Strip trailing slash for consistency
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  /**
   * Fetch the list of UTXOs for a given Bitcoin address.
   * GET /address/{address}/utxo
   */
  async getUTXOs(address: string): Promise<BlockstreamUTXO[]> {
    const data = await this.get<BlockstreamUTXO[]>(
      `/address/${address}/utxo`,
    );
    return data;
  }

  /**
   * Get confirmed and unconfirmed balance for an address.
   * Computes balance from chain_stats and mempool_stats.
   */
  async getBalance(
    address: string,
  ): Promise<{ confirmed: number; unconfirmed: number }> {
    const data = await this.get<AddressStats>(`/address/${address}`);

    const confirmed =
      data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;

    const unconfirmed =
      data.mempool_stats.funded_txo_sum - data.mempool_stats.spent_txo_sum;

    return { confirmed, unconfirmed };
  }

  /**
   * Broadcast a signed transaction to the Bitcoin network.
   * POST /tx with raw hex body.
   * @returns The transaction ID.
   */
  async broadcastTransaction(txHex: string): Promise<string> {
    const url = `${this.baseUrl}/tx`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: txHex,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new RPCError(
        `Broadcast failed: ${errorBody}`,
        url,
        response.status,
      );
    }

    const txid = await response.text();
    return txid.trim();
  }

  /**
   * Get full transaction details by txid.
   * GET /tx/{txid}
   */
  async getTransaction(txid: string): Promise<Record<string, unknown>> {
    return this.get<Record<string, unknown>>(`/tx/${txid}`);
  }

  /**
   * Get fee estimates for various confirmation targets.
   * GET /fee-estimates
   * @returns An object mapping confirmation target (blocks) to fee rate (sat/vB).
   */
  async getFeeEstimates(): Promise<Record<string, number>> {
    return this.get<Record<string, number>>('/fee-estimates');
  }

  /**
   * Get the list of transactions for a given address.
   * GET /address/{address}/txs
   */
  async getAddressTransactions(
    address: string,
  ): Promise<Record<string, unknown>[]> {
    return this.get<Record<string, unknown>[]>(`/address/${address}/txs`);
  }

  // ─── Internal helpers ───────────────────────────────────────

  private async get<T>(path: string): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'Unknown error');
      throw new RPCError(
        `GET ${path} failed: ${errorBody}`,
        url,
        response.status,
      );
    }

    const data = (await response.json()) as T;
    return data;
  }
}
