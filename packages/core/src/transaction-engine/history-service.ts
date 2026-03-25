// ===================================================================
// GRAVYTOS -- Transaction History Service
// Fetches real transaction history from blockchain APIs
// ===================================================================

export interface HistoricalTransaction {
  txHash: string;
  chainId: string;
  chainSymbol: string;
  type: 'sent' | 'received' | 'swap' | 'bridge' | 'approval' | 'unknown';
  status: 'confirmed' | 'pending' | 'failed';
  from: string;
  to: string;
  value: string;
  tokenSymbol: string;
  fee: string;
  timestamp: number;
  blockNumber?: number;
  explorerUrl: string;
}

export class TransactionHistoryService {
  /**
   * Fetch ETH transaction history from Etherscan-compatible API
   * Uses the free API (no key required for basic queries)
   */
  async getEVMHistory(address: string, chainId: number): Promise<HistoricalTransaction[]> {
    const explorerApis: Record<number, { api: string; explorer: string; symbol: string }> = {
      1: { api: 'https://api.etherscan.io/api', explorer: 'https://etherscan.io', symbol: 'ETH' },
      137: { api: 'https://api.polygonscan.com/api', explorer: 'https://polygonscan.com', symbol: 'POL' },
      42161: { api: 'https://api.arbiscan.io/api', explorer: 'https://arbiscan.io', symbol: 'ETH' },
      8453: { api: 'https://api.basescan.org/api', explorer: 'https://basescan.org', symbol: 'ETH' },
      10: { api: 'https://api-optimistic.etherscan.io/api', explorer: 'https://optimistic.etherscan.io', symbol: 'ETH' },
    };

    const config = explorerApis[chainId];
    if (!config) return [];

    try {
      const url = `${config.api}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=20&sort=desc`;
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!res.ok) return [];
      const data = await res.json();

      if (data.status !== '1' || !Array.isArray(data.result)) return [];

      return data.result.map((tx: any) => ({
        txHash: tx.hash,
        chainId: `ethereum-${chainId}`,
        chainSymbol: config.symbol,
        type: tx.from.toLowerCase() === address.toLowerCase() ? 'sent' : 'received',
        status: tx.isError === '0' ? 'confirmed' : 'failed',
        from: tx.from,
        to: tx.to,
        value: (parseInt(tx.value) / 1e18).toFixed(6),
        tokenSymbol: config.symbol,
        fee: ((parseInt(tx.gasUsed) * parseInt(tx.gasPrice)) / 1e18).toFixed(6),
        timestamp: parseInt(tx.timeStamp) * 1000,
        blockNumber: parseInt(tx.blockNumber),
        explorerUrl: `${config.explorer}/tx/${tx.hash}`,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetch BTC transaction history from Blockstream API
   */
  async getBTCHistory(address: string): Promise<HistoricalTransaction[]> {
    try {
      const res = await fetch(`https://blockstream.info/api/address/${address}/txs`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return [];
      const txs = await res.json();

      return txs.slice(0, 20).map((tx: any) => {
        const isReceived = tx.vout.some((out: any) => out.scriptpubkey_address === address);
        const isSent = tx.vin.some((inp: any) => inp.prevout?.scriptpubkey_address === address);

        let value = 0;
        if (isReceived) {
          value = tx.vout
            .filter((out: any) => out.scriptpubkey_address === address)
            .reduce((sum: number, out: any) => sum + out.value, 0);
        }

        return {
          txHash: tx.txid,
          chainId: 'bitcoin-mainnet',
          chainSymbol: 'BTC',
          type: isSent ? 'sent' : 'received',
          status: tx.status?.confirmed ? 'confirmed' : 'pending',
          from: isSent ? address : tx.vin[0]?.prevout?.scriptpubkey_address || 'unknown',
          to: isReceived ? address : tx.vout[0]?.scriptpubkey_address || 'unknown',
          value: (value / 100_000_000).toFixed(8),
          tokenSymbol: 'BTC',
          fee: ((tx.fee || 0) / 100_000_000).toFixed(8),
          timestamp: (tx.status?.block_time || 0) * 1000,
          blockNumber: tx.status?.block_height,
          explorerUrl: `https://mempool.space/tx/${tx.txid}`,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetch SOL transaction history
   */
  async getSOLHistory(address: string): Promise<HistoricalTransaction[]> {
    try {
      const res = await fetch('https://api.mainnet-beta.solana.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [address, { limit: 20 }],
        }),
        signal: AbortSignal.timeout(10000),
      });
      if (!res.ok) return [];
      const data = await res.json();

      if (!data.result) return [];

      return data.result.map((sig: any) => ({
        txHash: sig.signature,
        chainId: 'solana-mainnet',
        chainSymbol: 'SOL',
        type: 'sent' as const, // Can't determine direction from signatures alone
        status: sig.confirmationStatus === 'finalized' ? 'confirmed' : 'pending',
        from: address,
        to: 'unknown',
        value: '0',
        tokenSymbol: 'SOL',
        fee: '0.000005',
        timestamp: (sig.blockTime || 0) * 1000,
        blockNumber: sig.slot,
        explorerUrl: `https://explorer.solana.com/tx/${sig.signature}`,
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetch all history for all connected wallets
   */
  async getAllHistory(addresses: {
    evm?: { address: string; chainId: number };
    btc?: string;
    sol?: string;
  }): Promise<HistoricalTransaction[]> {
    const promises: Promise<HistoricalTransaction[]>[] = [];

    if (addresses.evm) {
      promises.push(this.getEVMHistory(addresses.evm.address, addresses.evm.chainId));
    }
    if (addresses.btc) {
      promises.push(this.getBTCHistory(addresses.btc));
    }
    if (addresses.sol) {
      promises.push(this.getSOLHistory(addresses.sol));
    }

    const results = await Promise.allSettled(promises);
    const allTxs = results
      .filter((r): r is PromiseFulfilledResult<HistoricalTransaction[]> => r.status === 'fulfilled')
      .flatMap(r => r.value);

    // Sort by timestamp descending
    return allTxs.sort((a, b) => b.timestamp - a.timestamp);
  }
}
