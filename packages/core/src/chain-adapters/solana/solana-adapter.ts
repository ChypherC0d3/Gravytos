// ===================================================================
// NEXORA VAULT -- Solana Chain Adapter
// Full adapter for Solana mainnet-beta / devnet
// ===================================================================

import {
  Connection,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Keypair,
  VersionedTransaction,
  TransactionMessage,
  TransactionInstruction,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  getAccount,
  createTransferInstruction,
  getMint,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
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

/** Solana native mint address (wrapped SOL) */
const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

// ─── Solana Adapter ──────────────────────────────────────────

export class SolanaAdapter implements ChainAdapter {
  readonly chainFamily: ChainFamily = 'solana' as ChainFamily;
  readonly chainId: ChainId;

  private connection: Connection | null = null;
  private rpcUrls: string[] = [];
  private rpcIndex = 0;

  constructor(chainId: ChainId = 'solana-mainnet') {
    this.chainId = chainId;
  }

  // ── Lifecycle ────────────────────────────────────────────

  async initialize(config: ChainConfig): Promise<void> {
    if (config.rpcUrls.length === 0) {
      throw new Error('At least one RPC URL is required for Solana');
    }

    this.rpcUrls = config.rpcUrls;
    this.rpcIndex = 0;
    this.connection = new Connection(this.rpcUrls[0], 'confirmed');
  }

  isInitialized(): boolean {
    return this.connection !== null;
  }

  // ── Balance Queries ──────────────────────────────────────

  async getBalance(address: string): Promise<string> {
    const conn = this.requireConnection();
    try {
      const pubkey = new PublicKey(address);
      const lamports = await conn.getBalance(pubkey);
      return (lamports / LAMPORTS_PER_SOL).toFixed(9);
    } catch (err) {
      throw this.wrapRPCError('getBalance', err);
    }
  }

  async getTokenBalance(address: string, mintAddress: string): Promise<string> {
    // If requesting the native SOL balance
    if (isNativeSol(mintAddress)) {
      return this.getBalance(address);
    }

    const conn = this.requireConnection();
    try {
      const ownerPubkey = new PublicKey(address);
      const mintPubkey = new PublicKey(mintAddress);

      // Derive the associated token account
      const ata = await getAssociatedTokenAddress(
        mintPubkey,
        ownerPubkey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      );

      // Fetch the token account info
      const account = await getAccount(conn, ata);
      const mint = await getMint(conn, mintPubkey);
      const decimals = mint.decimals;

      // Format the balance
      const raw = account.amount;
      return formatTokenAmount(raw, decimals);
    } catch (err) {
      // If the ATA doesn't exist, balance is zero
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes('could not find account') ||
        message.includes('TokenAccountNotFoundError') ||
        message.includes('Account does not exist')
      ) {
        return '0';
      }
      throw this.wrapRPCError('getTokenBalance', err);
    }
  }

  // ── Transaction Building ─────────────────────────────────

  async buildTransaction(request: TransactionRequest): Promise<UnsignedTransaction> {
    const conn = this.requireConnection();

    try {
      const fromPubkey = new PublicKey(request.from);
      const toPubkey = new PublicKey(request.to);
      let instructions: TransactionInstruction[];
      let tokenSymbol = 'SOL';

      if (request.tokenAddress && !isNativeSol(request.tokenAddress)) {
        // SPL Token transfer
        const mintPubkey = new PublicKey(request.tokenAddress);
        const mint = await getMint(conn, mintPubkey);
        const decimals = mint.decimals;
        const amount = parseTokenAmount(request.value, decimals);

        const fromAta = await getAssociatedTokenAddress(
          mintPubkey,
          fromPubkey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        const toAta = await getAssociatedTokenAddress(
          mintPubkey,
          toPubkey,
          false,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID,
        );

        instructions = [
          createTransferInstruction(
            fromAta,
            toAta,
            fromPubkey,
            amount,
            [],
            TOKEN_PROGRAM_ID,
          ),
        ];

        tokenSymbol = 'SPL';
      } else {
        // Native SOL transfer
        const lamports = Math.round(parseFloat(request.value) * LAMPORTS_PER_SOL);

        instructions = [
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          }),
        ];
      }

      // Get the latest blockhash
      const { blockhash } =
        await conn.getLatestBlockhash('confirmed');

      // Build a versioned transaction (v0)
      const messageV0 = new TransactionMessage({
        payerKey: fromPubkey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);
      const serialized = transaction.serialize();

      // Estimate fee (Solana base fee is typically 5000 lamports per signature)
      let estimatedFee: string;
      try {
        const feeForMessage = await conn.getFeeForMessage(messageV0, 'confirmed');
        estimatedFee = ((feeForMessage.value ?? 5000) / LAMPORTS_PER_SOL).toFixed(9);
      } catch {
        // Fallback to standard 5000 lamport fee
        estimatedFee = (5000 / LAMPORTS_PER_SOL).toFixed(9);
      }

      return {
        chainId: this.chainId,
        raw: serialized,
        summary: {
          type: 'send',
          from: request.from,
          to: request.to,
          value: request.value,
          tokenSymbol,
          estimatedFee,
          feeTokenSymbol: 'SOL',
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
        'SolanaAdapter.signTransaction requires a private key. ' +
        'For browser wallet signing, use the wallet adapter directly.',
      );
    }

    try {
      const keypair = Keypair.fromSecretKey(privateKey);
      const transaction = VersionedTransaction.deserialize(tx.raw);

      transaction.sign([keypair]);

      const signature = transaction.signatures[0];
      if (!signature) {
        throw new Error('Transaction signing produced no signature');
      }

      // Encode the signature as a base58 transaction ID
      const bs58Module = await import('bs58');
      const bs58Codec = bs58Module.default;
      const txHash = bs58Codec.encode(signature);

      return {
        chainId: tx.chainId,
        raw: transaction.serialize(),
        txHash,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new Error(`signTransaction failed: ${message}`);
    }
  }

  async broadcastTransaction(tx: SignedTransaction): Promise<string> {
    const conn = this.requireConnection();
    try {
      const txHash = await conn.sendRawTransaction(tx.raw, {
        skipPreflight: false,
        preflightCommitment: 'confirmed',
      });
      return txHash;
    } catch (err) {
      throw this.wrapRPCError('broadcastTransaction', err);
    }
  }

  async getTransactionStatus(txHash: string): Promise<TransactionStatus> {
    const conn = this.requireConnection();
    try {
      const result = await conn.getSignatureStatus(txHash, {
        searchTransactionHistory: true,
      });

      if (!result || !result.value) {
        return 'pending';
      }

      const status = result.value;

      if (status.err) {
        return 'failed';
      }

      if (status.confirmationStatus === 'finalized' || status.confirmationStatus === 'confirmed') {
        return 'confirmed';
      }

      if (status.confirmationStatus === 'processed') {
        return 'confirming';
      }

      return 'pending';
    } catch (err) {
      throw this.wrapRPCError('getTransactionStatus', err);
    }
  }

  async estimateFee(request: TransactionRequest): Promise<string> {
    const conn = this.requireConnection();

    try {
      const fromPubkey = new PublicKey(request.from);
      const toPubkey = new PublicKey(request.to);
      let instructions: TransactionInstruction[];

      if (request.tokenAddress && !isNativeSol(request.tokenAddress)) {
        const mintPubkey = new PublicKey(request.tokenAddress);
        const mint = await getMint(conn, mintPubkey);
        const amount = parseTokenAmount(request.value, mint.decimals);

        const fromAta = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
        const toAta = await getAssociatedTokenAddress(mintPubkey, toPubkey);

        instructions = [
          createTransferInstruction(fromAta, toAta, fromPubkey, amount),
        ];
      } else {
        const lamports = Math.round(parseFloat(request.value) * LAMPORTS_PER_SOL);
        instructions = [
          SystemProgram.transfer({ fromPubkey, toPubkey, lamports }),
        ];
      }

      const { blockhash } = await conn.getLatestBlockhash('confirmed');
      const messageV0 = new TransactionMessage({
        payerKey: fromPubkey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const feeResult = await conn.getFeeForMessage(messageV0, 'confirmed');
      const feeLamports = feeResult.value ?? 5000;
      return (feeLamports / LAMPORTS_PER_SOL).toFixed(9);
    } catch (err) {
      // Fallback: standard Solana fee
      return (5000 / LAMPORTS_PER_SOL).toFixed(9);
    }
  }

  // ── Privacy ──────────────────────────────────────────────

  getPrivacyCapabilities(): PrivacyCapability[] {
    return [
      {
        id: 'wallet_rotation',
        name: 'Wallet Rotation',
        description: 'Use different derived accounts for each transaction',
        minLevel: 'medium' as PrivacyLevel,
        supportedChains: ['solana'],
        active: false,
      },
      {
        id: 'tx_bundling',
        name: 'Transaction Bundling',
        description: 'Bundle multiple instructions to obscure intent',
        minLevel: 'high' as PrivacyLevel,
        supportedChains: ['solana'],
        active: false,
      },
    ];
  }

  // ── Solana-specific public helpers ───────────────────────

  /**
   * Rotate to the next RPC endpoint.
   */
  rotateRPC(): void {
    if (this.rpcUrls.length <= 1) return;
    this.rpcIndex = (this.rpcIndex + 1) % this.rpcUrls.length;
    this.connection = new Connection(this.rpcUrls[this.rpcIndex], 'confirmed');
  }

  /**
   * Get a recent blockhash from the cluster.
   */
  async getRecentBlockhash(): Promise<string> {
    const conn = this.requireConnection();
    try {
      const { blockhash } = await conn.getLatestBlockhash('confirmed');
      return blockhash;
    } catch (err) {
      throw this.wrapRPCError('getRecentBlockhash', err);
    }
  }

  /**
   * Fetch all SPL token accounts owned by a given address.
   * Returns an array of { mint, balance, decimals } for each token.
   */
  async getSPLTokenAccounts(
    owner: string,
  ): Promise<Array<{ mint: string; balance: string; decimals: number }>> {
    const conn = this.requireConnection();
    try {
      const ownerPubkey = new PublicKey(owner);
      const response = await conn.getParsedTokenAccountsByOwner(ownerPubkey, {
        programId: TOKEN_PROGRAM_ID,
      });

      return response.value.map((item) => {
        const info = item.account.data.parsed.info;
        const decimals: number = info.tokenAmount.decimals;
        const uiAmount: string = info.tokenAmount.uiAmountString ?? '0';
        const mint: string = info.mint;
        return { mint, balance: uiAmount, decimals };
      });
    } catch (err) {
      throw this.wrapRPCError('getSPLTokenAccounts', err);
    }
  }

  // ── Internal helpers ─────────────────────────────────────

  private requireConnection(): Connection {
    if (!this.connection) {
      throw new Error(
        'SolanaAdapter is not initialized. Call initialize() first.',
      );
    }
    return this.connection;
  }

  private wrapRPCError(method: string, err: unknown): RPCError {
    const message = err instanceof Error ? err.message : String(err);
    const rpcUrl = this.rpcUrls[this.rpcIndex] ?? 'unknown';
    return new RPCError(`${method} failed: ${message}`, rpcUrl);
  }
}

// ── Utility functions ────────────────────────────────────────

function isNativeSol(mintAddress: string): boolean {
  return (
    mintAddress === '' ||
    mintAddress === NATIVE_SOL_MINT ||
    mintAddress.toLowerCase() === 'sol'
  );
}

function formatTokenAmount(raw: bigint, decimals: number): string {
  if (decimals === 0) return raw.toString();

  const str = raw.toString().padStart(decimals + 1, '0');
  const intPart = str.slice(0, str.length - decimals) || '0';
  const fracPart = str.slice(str.length - decimals);
  return `${intPart}.${fracPart}`;
}

function parseTokenAmount(value: string, decimals: number): bigint {
  const parts = value.split('.');
  const intPart = parts[0] ?? '0';
  let fracPart = parts[1] ?? '';

  // Pad or truncate to match decimals
  if (fracPart.length > decimals) {
    fracPart = fracPart.slice(0, decimals);
  } else {
    fracPart = fracPart.padEnd(decimals, '0');
  }

  return BigInt(intPart + fracPart);
}
