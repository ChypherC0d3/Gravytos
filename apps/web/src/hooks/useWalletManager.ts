// ===================================================================
// NEXORA VAULT -- useWalletManager Hook
// Wraps WalletManager for React with mnemonic generation & derivation
// ===================================================================

import { useCallback, useRef } from 'react';
import {
  WalletManager,
  WebSecureStorage,
  generateMnemonic as coreMnemonic,
  validateMnemonic as coreValidate,
  mnemonicToSeed,
  deriveBitcoinKey,
  deriveEthereumKey,
  deriveSolanaKey,
} from '@gravytos/core';
import { useWalletStore } from '@gravytos/state';

export interface WalletListEntry {
  id: string;
  name: string;
  createdAt: number;
}

export interface DerivedAddresses {
  btc: string;
  eth: string;
  sol: string;
}

export function useWalletManager() {
  const managerRef = useRef<WalletManager | null>(null);
  const walletStore = useWalletStore();

  const getManager = useCallback(() => {
    if (!managerRef.current) {
      managerRef.current = new WalletManager(new WebSecureStorage());
    }
    return managerRef.current;
  }, []);

  const generateMnemonic = useCallback((strength: 12 | 24 = 12): string => {
    return coreMnemonic(strength);
  }, []);

  const validateMnemonic = useCallback((mnemonic: string): boolean => {
    return coreValidate(mnemonic);
  }, []);

  const deriveAddresses = useCallback(async (mnemonic: string): Promise<DerivedAddresses> => {
    const seed = await mnemonicToSeed(mnemonic);
    const btc = deriveBitcoinKey(seed, 0, 0);
    const eth = deriveEthereumKey(seed, 0);
    const sol = deriveSolanaKey(seed, 0);
    return { btc: btc.address, eth: eth.address, sol: sol.address };
  }, []);

  const createWallet = useCallback(async (name: string, password: string) => {
    const manager = getManager();
    const result = await manager.createWallet(name, password);
    return result; // { walletId, mnemonic }
  }, [getManager]);

  const importWallet = useCallback(async (name: string, mnemonic: string, password: string) => {
    const manager = getManager();
    const walletId = await manager.importWallet(name, mnemonic, password);
    return walletId;
  }, [getManager]);

  const unlockWallet = useCallback(async (walletId: string, password: string) => {
    const manager = getManager();
    await manager.unlockWallet(walletId, password);
  }, [getManager]);

  const lockWallet = useCallback(async (walletId: string) => {
    const manager = getManager();
    await manager.lockWallet(walletId);
    walletStore.disconnectAll();
  }, [getManager, walletStore]);

  const isUnlocked = useCallback((walletId: string): boolean => {
    const manager = getManager();
    return manager.isUnlocked(walletId);
  }, [getManager]);

  const listWallets = useCallback(async (): Promise<WalletListEntry[]> => {
    const manager = getManager();
    return manager.listWallets();
  }, [getManager]);

  const deleteWallet = useCallback(async (walletId: string) => {
    const manager = getManager();
    await manager.deleteWallet(walletId);
  }, [getManager]);

  /** Unlock wallet and set derived addresses into the Zustand store */
  const unlockAndSetAddresses = useCallback(async (walletId: string, password: string) => {
    const manager = getManager();
    await manager.unlockWallet(walletId, password);

    // Derive default accounts for each chain and update store
    const accounts = await manager.getAccounts(walletId);
    const btcAccount = accounts.find((a) => a.chainFamily === 'bitcoin');
    const evmAccount = accounts.find((a) => a.chainFamily === 'evm');
    const solAccount = accounts.find((a) => a.chainFamily === 'solana');

    if (btcAccount) walletStore.setBtcWallet(btcAccount.address);
    if (evmAccount) walletStore.setEvmWallet(evmAccount.address, 1);
    if (solAccount) walletStore.setSolanaWallet(solAccount.address);
  }, [getManager, walletStore]);

  return {
    createWallet,
    importWallet,
    unlockWallet,
    lockWallet,
    isUnlocked,
    listWallets,
    deleteWallet,
    deriveAddresses,
    generateMnemonic,
    validateMnemonic,
    unlockAndSetAddresses,
  };
}
