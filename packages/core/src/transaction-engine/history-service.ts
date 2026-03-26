// ===================================================================
// GRAVYTOS -- Transaction History Service
// Fetches real transaction history from blockchain explorer APIs
// ===================================================================

/** Request timeout in milliseconds */
const REQUEST_TIMEOUT_MS = 10_000;

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

/** Etherscan-compatible API config per EVM chain */
const EVM_EXPLORER_CONFIG: Record<number, { api: string; explorer: string; symbol: string }> = {
  1: { api: 'https://api.etherscan.io/api', explorer: 'https://etherscan.io', symbol: 'ETH' },
  137: { api: 'https://api.polygonscan.com/api', explorer: 'https://polygonscan.com', symbol: 'POL' },
  42161: { api: 'https://api.arbiscan.io/api', explorer: 'https://arbiscan.io', symbol: 'ETH' },
  8453: { api: 'https://api.basescan.org/api', explorer: 'https://basescan.org', symbol: 'ETH' },
  10: { api: 'https://api-optimistic.etherscan.io/api', explorer: 'https://optimistic.etherscan.io', symbol: 'ETH' },
  11155111: { api: 'https://api-sepolia.etherscan.io/api', explorer: 'https://sepolia.etherscan.io', symbol: 'ETH' },
};

export class TransactionHistoryService {
  /**
   * Fetch ETH transaction history from Etherscan-compatible API.
   * Uses the free API tier (no key required, rate limited to ~5/sec).
   */
  async getEVMHistory(address: string, chainId: number): Promise<HistoricalTransaction[]> {
    const config = EVM_EXPLORER_CONFIG[chainId];
    if (!config) return [];

    try {
      const url = `${config.api}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=25&sort=desc`;
      const res = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      if (!res.ok) return [];
      const data = await res.json();

      if (data.status !== '1' || !Array.isArray(data.result)) return [];

      return data.result.map((tx: any) => {
        const isSent = tx.from.toLowerCase() === address.toLowerCase();
        // Detect approvals (ERC20 approve method signature 0x095ea7b3)
        const isApproval = tx.input && tx.input.startsWith('0x095ea7b3');
        // Detect swaps (common DEX router method signatures)
        const isSwap = tx.input && (
          tx.input.startsWith('0x7ff36ab5') || // swapExactETHForTokens
          tx.input.startsWith('0x38ed1739') || // swapExactTokensForTokens
          tx.input.startsWith('0x18cbafe5') || // swapExactTokensForETH
          tx.input.startsWith('0x5ae401dc') || // Uniswap V3 multicall
          tx.input.startsWith('0x04e45aaf') || // Uniswap V3 exactInputSingle
          tx.input.startsWith('0x414bf389')    // Uniswap V3 exactInputSingle (alt)
        );

        let type: HistoricalTransaction['type'] = isSent ? 'sent' : 'received';
        if (isApproval) type = 'approval';
        else if (isSwap) type = 'swap';

        return {
          txHash: tx.hash,
          chainId: `ethereum-${chainId}`,
          chainSymbol: config.symbol,
          type,
          status: tx.isError === '0' ? 'confirmed' : 'failed',
          from: tx.from,
          to: tx.to || '',
          value: (parseInt(tx.value) / 1e18).toFixed(6),
          tokenSymbol: config.symbol,
          fee: ((parseInt(tx.gasUsed) * parseInt(tx.gasPrice)) / 1e18).toFixed(6),
          timestamp: parseInt(tx.timeStamp) * 1000,
          blockNumber: parseInt(tx.blockNumber),
          explorerUrl: `${config.explorer}/tx/${tx.hash}`,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetch EVM history across all supported chains for a given address.
   */
  async getAllEVMHistory(address: string): Promise<HistoricalTransaction[]> {
    const chainIds = Object.keys(EVM_EXPLORER_CONFIG).map(Number);

    // Fetch from all chains in parallel, with a small stagger to respect rate limits
    const results = await Promise.allSettled(
      chainIds.map((chainId, index) =>
        new Promise<HistoricalTransaction[]>((resolve) => {
          // Stagger requests by 200ms to avoid hitting rate limits
          setTimeout(async () => {
            try {
              const txs = await this.getEVMHistory(address, chainId);
              resolve(txs);
            } catch {
              resolve([]);
            }
          }, index * 200);
        }),
      ),
    );

    return results
      .filter((r): r is PromiseFulfilledResult<HistoricalTransaction[]> => r.status === 'fulfilled')
      .flatMap((r) => r.value);
  }

  /**
   * Fetch BTC transaction history from Blockstream API.
   *
   * Mainnet: GET https://blockstream.info/api/address/{address}/txs
   * Testnet: GET https://blockstream.info/testnet/api/address/{address}/txs
   */
  async getBTCHistory(address: string, testnet = false): Promise<HistoricalTransaction[]> {
    const baseUrl = testnet
      ? 'https://blockstream.info/testnet/api'
      : 'https://blockstream.info/api';

    try {
      const res = await fetch(`${baseUrl}/address/${address}/txs`, {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) return [];
      const txs = await res.json();

      return txs.slice(0, 25).map((tx: any) => {
        const isReceived = tx.vout.some((out: any) => out.scriptpubkey_address === address);
        const isSent = tx.vin.some((inp: any) => inp.prevout?.scriptpubkey_address === address);

        let value = 0;
        if (isReceived && !isSent) {
          // Pure receive: sum outputs to our address
          value = tx.vout
            .filter((out: any) => out.scriptpubkey_address === address)
            .reduce((sum: number, out: any) => sum + out.value, 0);
        } else if (isSent) {
          // Sent: sum outputs NOT to our address (excluding change)
          value = tx.vout
            .filter((out: any) => out.scriptpubkey_address !== address)
            .reduce((sum: number, out: any) => sum + out.value, 0);
        }

        return {
          txHash: tx.txid,
          chainId: testnet ? 'bitcoin-testnet' : 'bitcoin-mainnet',
          chainSymbol: 'BTC',
          type: isSent ? 'sent' : 'received',
          status: tx.status?.confirmed ? 'confirmed' : 'pending',
          from: isSent ? address : tx.vin[0]?.prevout?.scriptpubkey_address || 'unknown',
          to: isReceived && !isSent ? address : tx.vout[0]?.scriptpubkey_address || 'unknown',
          value: (value / 100_000_000).toFixed(8),
          tokenSymbol: 'BTC',
          fee: ((tx.fee || 0) / 100_000_000).toFixed(8),
          timestamp: (tx.status?.block_time || 0) * 1000,
          blockNumber: tx.status?.block_height,
          explorerUrl: `https://mempool.space${testnet ? '/testnet' : ''}/tx/${tx.txid}`,
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetch SOL transaction history via Solana RPC (getSignaturesForAddress).
   */
  async getSOLHistory(address: string, rpcUrl?: string): Promise<HistoricalTransaction[]> {
    const endpoint = rpcUrl || 'https://api.mainnet-beta.solana.com';

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getSignaturesForAddress',
          params: [address, { limit: 25 }],
        }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      if (!res.ok) return [];
      const data = await res.json();

      if (!data.result) return [];

      return data.result.map((sig: any) => ({
        txHash: sig.signature,
        chainId: 'solana-mainnet',
        chainSymbol: 'SOL',
        type: (sig.err ? 'unknown' : 'sent') as HistoricalTransaction['type'],
        status: sig.confirmationStatus === 'finalized'
          ? 'confirmed'
          : sig.err
            ? 'failed'
            : 'pending',
        from: address,
        to: sig.memo || 'unknown',
        value: '0', // Cannot determine value from signatures alone
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
   * Fetch all history for all connected wallets across all chains.
   */
  async getAllHistory(addresses: {
    evm?: { address: string; chainId?: number };
    btc?: string;
    sol?: string;
  }): Promise<HistoricalTransaction[]> {
    const promises: Promise<HistoricalTransaction[]>[] = [];

    if (addresses.evm) {
      if (addresses.evm.chainId) {
        // Fetch from specific chain
        promises.push(this.getEVMHistory(addresses.evm.address, addresses.evm.chainId));
      } else {
        // Fetch from all supported EVM chains
        promises.push(this.getAllEVMHistory(addresses.evm.address));
      }
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
      .flatMap((r) => r.value);

    // Sort by timestamp descending
    return allTxs.sort((a, b) => b.timestamp - a.timestamp);
  }
}
