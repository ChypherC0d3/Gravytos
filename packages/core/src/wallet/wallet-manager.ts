// ===================================================================
// NEXORA VAULT -- Wallet Manager
// Complete wallet lifecycle: create, import, lock/unlock, derive
// ===================================================================

import type { WalletAccount } from '@gravytos/types';
import { ChainFamily } from '@gravytos/types';

import type { SecureStorage } from '../key-management/secure-storage';
import type { EncryptedVault } from '../key-management/encryption';
import { encryptSeed, decryptSeed } from '../key-management/encryption';
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  deriveBitcoinKey,
  deriveEthereumKey,
  deriveSolanaKey,
} from '../key-management/hd-wallet';
import { bytesToHex } from '@noble/hashes/utils.js';

// ── Storage key conventions ─────────────────────────────────────

const WALLET_LIST_KEY = 'wallets';
const vaultKey = (id: string) => `vault:${id}`;
const metaKey = (id: string) => `meta:${id}`;

// ── Internal types ──────────────────────────────────────────────

interface WalletMeta {
  id: string;
  name: string;
  createdAt: number;
  accounts: WalletAccount[];
  /** Next derivation index per chain family */
  nextIndex: Record<string, number>;
  /** Next BTC address index (for receive address rotation) */
  nextBtcAddressIndex: number;
}

interface WalletListEntry {
  id: string;
  name: string;
  createdAt: number;
}

// ── WalletManager ───────────────────────────────────────────────

export class WalletManager {
  /** In-memory decrypted seeds, keyed by wallet ID. Cleared on lock. */
  private unlockedSeeds = new Map<string, Uint8Array>();

  constructor(private storage: SecureStorage) {}

  // ── Wallet Creation ─────────────────────────────────────────

  /**
   * Create a new HD wallet.
   * Generates a fresh 12-word mnemonic, derives the seed, encrypts it,
   * and persists the encrypted vault + metadata.
   *
   * @returns The wallet ID and the mnemonic (show it once, then discard).
   */
  async createWallet(
    name: string,
    password: string,
  ): Promise<{ walletId: string; mnemonic: string }> {
    const mnemonic = generateMnemonic(12);
    const walletId = await this.importWallet(name, mnemonic, password);
    return { walletId, mnemonic };
  }

  /**
   * Import a wallet from an existing mnemonic.
   * Validates the mnemonic, derives the seed, encrypts, and stores.
   *
   * @returns The wallet ID.
   */
  async importWallet(
    name: string,
    mnemonic: string,
    password: string,
  ): Promise<string> {
    if (!validateMnemonic(mnemonic)) {
      throw new Error('Invalid mnemonic phrase');
    }

    const seed = await mnemonicToSeed(mnemonic);
    const vault = await encryptSeed(seed, password);
    const walletId = generateId();

    // Persist encrypted vault
    await this.storage.save(vaultKey(walletId), JSON.stringify(vault));

    // Persist metadata
    const meta: WalletMeta = {
      id: walletId,
      name,
      createdAt: Date.now(),
      accounts: [],
      nextIndex: {},
      nextBtcAddressIndex: 0,
    };
    await this.storage.save(metaKey(walletId), JSON.stringify(meta));

    // Update wallet list
    const list = await this.loadWalletList();
    list.push({ id: walletId, name, createdAt: meta.createdAt });
    await this.storage.save(WALLET_LIST_KEY, JSON.stringify(list));

    // Auto-unlock after creation
    this.unlockedSeeds.set(walletId, seed);

    return walletId;
  }

  // ── Lock / Unlock ───────────────────────────────────────────

  /**
   * Unlock a wallet by decrypting its seed into memory.
   * Throws if the password is wrong.
   */
  async unlockWallet(walletId: string, password: string): Promise<void> {
    const raw = await this.storage.load(vaultKey(walletId));
    if (!raw) {
      throw new Error(`Wallet ${walletId} not found`);
    }
    const vault: EncryptedVault = JSON.parse(raw);
    const seed = await decryptSeed(vault, password);
    this.unlockedSeeds.set(walletId, seed);
  }

  /**
   * Lock a wallet – securely wipe the seed from memory.
   */
  async lockWallet(walletId: string): Promise<void> {
    const seed = this.unlockedSeeds.get(walletId);
    if (seed) {
      // Zero out the seed bytes before discarding the reference
      seed.fill(0);
      this.unlockedSeeds.delete(walletId);
    }
  }

  /**
   * Check whether a wallet is currently unlocked (seed in memory).
   */
  isUnlocked(walletId: string): boolean {
    return this.unlockedSeeds.has(walletId);
  }

  // ── Account Derivation ──────────────────────────────────────

  /**
   * Derive a new account for a given chain family.
   * The wallet must be unlocked. Account index auto-increments per chain.
   */
  async deriveAccount(
    walletId: string,
    chainFamily: ChainFamily,
    label?: string,
  ): Promise<WalletAccount> {
    const seed = this.requireUnlocked(walletId);
    const meta = await this.loadMeta(walletId);

    const chainKey = chainFamily as string;
    const index = meta.nextIndex[chainKey] ?? 0;

    let derivedKey;
    switch (chainFamily) {
      case ChainFamily.Bitcoin:
        derivedKey = deriveBitcoinKey(seed, 0, index);
        break;
      case ChainFamily.EVM:
        derivedKey = deriveEthereumKey(seed, index);
        break;
      case ChainFamily.Solana:
        derivedKey = deriveSolanaKey(seed, index);
        break;
      default:
        throw new Error(`Unsupported chain family: ${chainFamily}`);
    }

    const account: WalletAccount = {
      id: `${walletId}-${chainKey}-${index}`,
      walletId,
      chainFamily,
      chainId: defaultChainId(chainFamily),
      address: derivedKey.address,
      publicKey: bytesToHex(derivedKey.publicKey),
      derivationPath: derivedKey.derivationPath,
      label: label ?? `${chainFamily} Account ${index}`,
      accountIndex: chainFamily === ChainFamily.Bitcoin ? 0 : index,
      addressIndex: chainFamily === ChainFamily.Bitcoin ? index : 0,
      createdAt: Date.now(),
      metadata: {},
    };

    meta.accounts.push(account);
    meta.nextIndex[chainKey] = index + 1;
    await this.storage.save(metaKey(walletId), JSON.stringify(meta));

    return account;
  }

  /**
   * Get all derived accounts for a wallet.
   */
  async getAccounts(walletId: string): Promise<WalletAccount[]> {
    const meta = await this.loadMeta(walletId);
    return meta.accounts;
  }

  /**
   * Get the next unused Bitcoin receive address.
   * Derives a fresh BIP84 address, bumps the internal address counter.
   */
  async getNextBtcReceiveAddress(walletId: string): Promise<string> {
    const seed = this.requireUnlocked(walletId);
    const meta = await this.loadMeta(walletId);

    const addressIndex = meta.nextBtcAddressIndex;
    const derived = deriveBitcoinKey(seed, 0, addressIndex);

    meta.nextBtcAddressIndex = addressIndex + 1;
    await this.storage.save(metaKey(walletId), JSON.stringify(meta));

    return derived.address;
  }

  // ── Wallet Listing & Deletion ─────────────────────────────

  /**
   * List all wallets (id, name, createdAt).
   */
  async listWallets(): Promise<WalletListEntry[]> {
    return this.loadWalletList();
  }

  /**
   * Permanently delete a wallet and all its stored data.
   */
  async deleteWallet(walletId: string): Promise<void> {
    // Lock first to wipe seed
    await this.lockWallet(walletId);

    // Remove vault and metadata
    await this.storage.delete(vaultKey(walletId));
    await this.storage.delete(metaKey(walletId));

    // Update wallet list
    const list = await this.loadWalletList();
    const updated = list.filter((w) => w.id !== walletId);
    await this.storage.save(WALLET_LIST_KEY, JSON.stringify(updated));
  }

  // ── Private Helpers ───────────────────────────────────────

  private requireUnlocked(walletId: string): Uint8Array {
    const seed = this.unlockedSeeds.get(walletId);
    if (!seed) {
      throw new Error(
        `Wallet ${walletId} is locked. Call unlockWallet() first.`,
      );
    }
    return seed;
  }

  private async loadMeta(walletId: string): Promise<WalletMeta> {
    const raw = await this.storage.load(metaKey(walletId));
    if (!raw) {
      throw new Error(`Wallet metadata not found for ${walletId}`);
    }
    return JSON.parse(raw) as WalletMeta;
  }

  private async loadWalletList(): Promise<WalletListEntry[]> {
    const raw = await this.storage.load(WALLET_LIST_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as WalletListEntry[];
  }
}

// ── Utilities ───────────────────────────────────────────────────

function generateId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  // Format as UUID v4-like string
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

function defaultChainId(family: ChainFamily): string {
  switch (family) {
    case ChainFamily.Bitcoin:
      return 'bitcoin-mainnet';
    case ChainFamily.EVM:
      return 'ethereum-1';
    case ChainFamily.Solana:
      return 'solana-mainnet';
  }
}
