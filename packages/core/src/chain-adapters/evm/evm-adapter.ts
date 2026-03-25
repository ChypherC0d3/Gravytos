// ===================================================================
// NEXORA VAULT -- EVM Chain Adapter
// Supports Ethereum, Polygon, Arbitrum, Base, and Optimism
// ===================================================================

import {
  createPublicClient,
  http,
  formatEther,
  formatUnits,
  parseEther,
  parseUnits,
  encodeFunctionData,
  serializeTransaction,
  keccak256,
  type PublicClient,
  type Chain,
  type TransactionSerializable,
  type Hex,
} from 'viem';
import { mainnet, polygon, arbitrum, base, optimism, sepolia } from 'viem/chains';
import type { ChainAdapter } from '../types';
import type {
  ChainConfig,
  ChainFamily,
  ChainId,
  TransactionRequest,
  UnsignedTransaction,
  SignedTransaction,
  TransactionStatus,
  PrivacyCapability,
  PrivacyLevel,
} from '@gravytos/types';
import { RPCError } from '../../errors';
import { ERC20_ABI, isNativeToken } from './erc20';

// ─── Chain ID to viem Chain mapping ──────────────────────────

const CHAIN_MAP: Record<number, Chain> = {
  1: mainnet,
  137: polygon,
  42161: arbitrum,
  8453: base,
  10: optimism,
  11155111: sepolia,
};

/** Native currency symbols by EVM chain ID */
const NATIVE_SYMBOLS: Record<number, string> = {
  1: 'ETH',
  137: 'POL',
  42161: 'ETH',
  8453: 'ETH',
  10: 'ETH',
};

// ─── EVM Adapter ─────────────────────────────────────────────

export class EVMAdapter implements ChainAdapter {
  readonly chainFamily: ChainFamily = 'evm' as ChainFamily;
  readonly chainId: ChainId;

  private client: PublicClient | null = null;
  private config: ChainConfig | null = null;
  private rpcIndex = 0;

  constructor(chainId: ChainId) {
    this.chainId = chainId;
  }

  // ── Lifecycle ────────────────────────────────────────────

  async initialize(config: ChainConfig): Promise<void> {
    this.config = config;
    const evmChainId = config.evmChainId;
    if (evmChainId === undefined) {
      throw new Error(`EVMAdapter requires evmChainId in config for chain ${config.id}`);
    }

    const chain = CHAIN_MAP[evmChainId];
    if (!chain) {
      throw new Error(`Unsupported EVM chain ID: ${evmChainId}`);
    }

    if (config.rpcUrls.length === 0) {
      throw new Error('At least one RPC URL is required');
    }

    this.client = createPublicClient({
      chain,
      transport: http(config.rpcUrls[this.rpcIndex]),
    });
  }

  isInitialized(): boolean {
    return this.client !== null;
  }

  // ── Balance Queries ──────────────────────────────────────

  async getBalance(address: string): Promise<string> {
    const client = this.requireClient();
    try {
      const balance = await client.getBalance({
        address: address as `0x${string}`,
      });
      return formatEther(balance);
    } catch (err) {
      throw this.wrapRPCError('getBalance', err);
    }
  }

  async getTokenBalance(address: string, tokenAddress: string): Promise<string> {
    if (isNativeToken(tokenAddress)) {
      return this.getBalance(address);
    }

    const client = this.requireClient();
    try {
      const [rawBalance, decimals] = await Promise.all([
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address as `0x${string}`],
        }),
        client.readContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'decimals',
        }),
      ]);

      return formatUnits(rawBalance as bigint, Number(decimals));
    } catch (err) {
      throw this.wrapRPCError('getTokenBalance', err);
    }
  }

  // ── Transaction Building ─────────────────────────────────

  async buildTransaction(request: TransactionRequest): Promise<UnsignedTransaction> {
    const client = this.requireClient();
    const evmChainId = this.config!.evmChainId!;
    const nativeSymbol = NATIVE_SYMBOLS[evmChainId] ?? 'ETH';

    try {
      let to: `0x${string}` = request.to as `0x${string}`;
      let value: bigint;
      let data: `0x${string}` | undefined;
      let tokenSymbol = nativeSymbol;

      if (request.tokenAddress && !isNativeToken(request.tokenAddress)) {
        // ERC20 transfer: encode transfer(to, amount) calldata
        const decimals = await client.readContract({
          address: request.tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'decimals',
        });

        const tokenAmount = parseUnits(request.value, Number(decimals));
        data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [request.to as `0x${string}`, tokenAmount],
        });

        // For ERC20 transfers, the "to" is the token contract
        to = request.tokenAddress as `0x${string}`;
        value = 0n;

        try {
          tokenSymbol = (await client.readContract({
            address: request.tokenAddress as `0x${string}`,
            abi: ERC20_ABI,
            functionName: 'symbol',
          })) as string;
        } catch {
          tokenSymbol = 'TOKEN';
        }
      } else {
        // Native ETH/POL transfer
        value = parseEther(request.value);
        data = (request.data as `0x${string}`) ?? undefined;
      }

      // Get nonce and fee data
      const [nonce, gasPrice, block] = await Promise.all([
        client.getTransactionCount({ address: request.from as `0x${string}` }),
        client.getGasPrice(),
        client.getBlock(),
      ]);

      // Estimate gas
      const gasLimit = request.gasLimit
        ? BigInt(request.gasLimit)
        : await client.estimateGas({
            account: request.from as `0x${string}`,
            to,
            value,
            data,
          });

      // Build EIP-1559 tx if possible, otherwise legacy
      const baseFee = block.baseFeePerGas;
      let txObj: TransactionSerializable;

      if (baseFee !== null && baseFee !== undefined) {
        // EIP-1559 transaction
        const maxPriorityFeePerGas = request.maxPriorityFee
          ? BigInt(request.maxPriorityFee)
          : 1500000000n; // 1.5 gwei default
        const maxFeePerGas = baseFee * 2n + maxPriorityFeePerGas;

        txObj = {
          type: 'eip1559' as const,
          chainId: evmChainId,
          nonce,
          to,
          value,
          data,
          gas: gasLimit,
          maxFeePerGas,
          maxPriorityFeePerGas,
        };
      } else {
        // Legacy transaction
        const effectiveGasPrice = request.feeRate ? BigInt(request.feeRate) : gasPrice;
        txObj = {
          type: 'legacy' as const,
          chainId: evmChainId,
          nonce,
          to,
          value,
          data,
          gas: gasLimit,
          gasPrice: effectiveGasPrice,
        };
      }

      // Serialize the unsigned transaction
      const serialized = serializeTransaction(txObj);
      const raw = hexToBytes(serialized);

      // Calculate estimated fee
      const effectiveGasPrice =
        baseFee !== null && baseFee !== undefined
          ? baseFee * 2n + 1500000000n
          : gasPrice;
      const estimatedFee = formatEther(gasLimit * effectiveGasPrice);

      return {
        chainId: this.chainId,
        raw,
        summary: {
          type: 'send',
          from: request.from,
          to: request.to,
          value: request.value,
          tokenSymbol,
          estimatedFee,
          feeTokenSymbol: nativeSymbol,
        },
        estimatedFee,
      };
    } catch (err) {
      if (err instanceof RPCError) throw err;
      throw this.wrapRPCError('buildTransaction', err);
    }
  }

  async signTransaction(
    tx: UnsignedTransaction,
    privateKey?: Uint8Array,
  ): Promise<SignedTransaction> {
    if (!privateKey) {
      throw new Error(
        'EVMAdapter.signTransaction requires a private key. ' +
        'For browser wallet signing, use the wallet connector directly.',
      );
    }

    // Import viem account utilities for signing
    const { privateKeyToAccount } = await import('viem/accounts');

    // Convert private key bytes to hex
    const pkHex = bytesToHex(privateKey);
    const account = privateKeyToAccount(pkHex);

    // Deserialize the raw unsigned tx to get the parameters back
    const serializedUnsigned = bytesToHex(tx.raw);

    // Sign the serialized transaction
    const signature = await account.signTransaction(
      deserializeUnsignedTx(serializedUnsigned, this.config!.evmChainId!),
    );

    // The signed tx hash
    const txHash = keccak256(signature);

    return {
      chainId: tx.chainId,
      raw: hexToBytes(signature),
      txHash,
    };
  }

  async broadcastTransaction(tx: SignedTransaction): Promise<string> {
    const client = this.requireClient();
    try {
      const hex = bytesToHex(tx.raw);
      const txHash = await client.sendRawTransaction({
        serializedTransaction: hex,
      });
      return txHash;
    } catch (err) {
      throw this.wrapRPCError('broadcastTransaction', err);
    }
  }

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    const client = this.requireClient();
    try {
      const receipt = await client.getTransactionReceipt({
        hash: txHash as `0x${string}`,
      });

      if (!receipt) {
        return 'pending';
      }

      if (receipt.status === 'success') {
        return 'confirmed';
      }

      return 'failed';
    } catch (err) {
      // If receipt not found, tx is still pending
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('could not be found') ||
        message.includes('not found')
      ) {
        return 'pending';
      }
      throw this.wrapRPCError('getTransactionStatus', err);
    }
  }

  async estimateFee(request: TransactionRequest): Promise<string> {
    const client = this.requireClient();

    try {
      let to: `0x${string}` = request.to as `0x${string}`;
      let value: bigint;
      let data: `0x${string}` | undefined;

      if (request.tokenAddress && !isNativeToken(request.tokenAddress)) {
        const decimals = await client.readContract({
          address: request.tokenAddress as `0x${string}`,
          abi: ERC20_ABI,
          functionName: 'decimals',
        });

        const tokenAmount = parseUnits(request.value, Number(decimals));
        data = encodeFunctionData({
          abi: ERC20_ABI,
          functionName: 'transfer',
          args: [request.to as `0x${string}`, tokenAmount],
        });
        to = request.tokenAddress as `0x${string}`;
        value = 0n;
      } else {
        value = parseEther(request.value);
        data = (request.data as `0x${string}`) ?? undefined;
      }

      const [gasEstimate, gasPrice] = await Promise.all([
        client.estimateGas({
          account: request.from as `0x${string}`,
          to,
          value,
          data,
        }),
        client.getGasPrice(),
      ]);

      return formatEther(gasEstimate * gasPrice);
    } catch (err) {
      throw this.wrapRPCError('estimateFee', err);
    }
  }

  // ── Privacy ──────────────────────────────────────────────

  getPrivacyCapabilities(): PrivacyCapability[] {
    return [
      {
        id: 'rpc_rotation',
        name: 'RPC Rotation',
        description: 'Rotate between multiple RPC endpoints to avoid tracking',
        minLevel: 'medium' as PrivacyLevel,
        supportedChains: ['evm'],
        active: false,
      },
      {
        id: 'tx_delay',
        name: 'Transaction Delay',
        description: 'Introduce random delay before broadcasting transactions',
        minLevel: 'medium' as PrivacyLevel,
        supportedChains: ['evm'],
        active: false,
      },
      {
        id: 'stealth_addresses',
        name: 'Stealth Addresses',
        description: 'Generate unique one-time addresses per interaction',
        minLevel: 'high' as PrivacyLevel,
        supportedChains: ['evm'],
        active: false,
      },
    ];
  }

  // ── EVM-specific public helpers ──────────────────────────

  async getGasPrice(): Promise<bigint> {
    const client = this.requireClient();
    try {
      return await client.getGasPrice();
    } catch (err) {
      throw this.wrapRPCError('getGasPrice', err);
    }
  }

  async getBlockNumber(): Promise<bigint> {
    const client = this.requireClient();
    try {
      return await client.getBlockNumber();
    } catch (err) {
      throw this.wrapRPCError('getBlockNumber', err);
    }
  }

  async getNonce(address: string): Promise<number> {
    const client = this.requireClient();
    try {
      return await client.getTransactionCount({
        address: address as `0x${string}`,
      });
    } catch (err) {
      throw this.wrapRPCError('getNonce', err);
    }
  }

  /**
   * Rotate to the next RPC endpoint for privacy.
   * Recreates the underlying viem client with the new URL.
   */
  rotateRPC(): void {
    if (!this.config || this.config.rpcUrls.length <= 1) return;

    this.rpcIndex = (this.rpcIndex + 1) % this.config.rpcUrls.length;
    const evmChainId = this.config.evmChainId!;
    const chain = CHAIN_MAP[evmChainId];

    this.client = createPublicClient({
      chain,
      transport: http(this.config.rpcUrls[this.rpcIndex]),
    });
  }

  // ── Internal helpers ─────────────────────────────────────

  private requireClient(): PublicClient {
    if (!this.client) {
      throw new Error(
        'EVMAdapter is not initialized. Call initialize() first.',
      );
    }
    return this.client;
  }

  private wrapRPCError(method: string, err: unknown): RPCError {
    const message =
      err instanceof Error ? err.message : String(err);
    const rpcUrl =
      this.config?.rpcUrls[this.rpcIndex] ?? 'unknown';
    return new RPCError(
      `${method} failed: ${message}`,
      rpcUrl,
    );
  }
}

// ── Byte/Hex conversion utilities ────────────────────────────

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): Hex {
  let hex = '0x';
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, '0');
  }
  return hex as Hex;
}

/**
 * Reconstruct a minimal transaction object from a serialized unsigned tx.
 * This is needed because viem's signTransaction expects the tx parameters,
 * not the raw serialized bytes.
 */
function deserializeUnsignedTx(
  _serialized: string,
  chainId: number,
): TransactionSerializable {
  // viem does not expose a public deserialize for unsigned txs,
  // so we re-parse the RLP. For now, we store the tx params alongside
  // the raw bytes via a side channel. This is a simplified fallback
  // that creates a minimal placeholder; in production the unsigned tx
  // object should be cached and reused rather than re-deserialized.
  //
  // The actual implementation would use the `parseTransaction` utility
  // from viem which handles both legacy and EIP-1559 formats.
  const { parseTransaction } = require('viem') as typeof import('viem');
  const parsed = parseTransaction(_serialized as Hex);
  return { ...parsed, chainId } as TransactionSerializable;
}
