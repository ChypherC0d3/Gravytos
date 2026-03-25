import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { ChainFamily, WalletAccount } from '@gravytos/types';

interface DesktopWalletContextType {
  isUnlocked: boolean;
  walletName: string | null;
  accounts: WalletAccount[];

  createWallet: (name: string, password: string) => Promise<string>;
  importWallet: (name: string, mnemonic: string, password: string) => Promise<void>;
  unlockWallet: (password: string) => Promise<void>;
  lockWallet: () => void;

  deriveAccount: (chainFamily: ChainFamily, label?: string) => Promise<WalletAccount>;
  getAddress: (chainFamily: ChainFamily) => string | null;
}

const DesktopWalletContext = createContext<DesktopWalletContextType | null>(null);

export function DesktopWalletProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [_walletId, setWalletId] = useState<string | null>(null);

  // Use Tauri commands for file storage instead of localStorage
  // invoke('read_file', { path }) / invoke('write_file', { path, content })

  const createWallet = useCallback(async (name: string, _password: string) => {
    // Use WalletManager from @gravytos/core
    // Save encrypted vault via Tauri file system
    // Return mnemonic for user to write down
    setWalletName(name);
    setWalletId(crypto.randomUUID());
    return 'placeholder mnemonic';
  }, []);

  const importWallet = useCallback(async (name: string, _mnemonic: string, _password: string) => {
    // Import using WalletManager
    setWalletName(name);
    setWalletId(crypto.randomUUID());
  }, []);

  const unlockWallet = useCallback(async (_password: string) => {
    // Decrypt vault, set unlocked state
    setIsUnlocked(true);
  }, []);

  const lockWallet = useCallback(() => {
    setIsUnlocked(false);
    setAccounts([]);
  }, []);

  const deriveAccount = useCallback(async (_chainFamily: ChainFamily, _label?: string) => {
    // Use WalletManager.deriveAccount
    return {} as WalletAccount;
  }, []);

  const getAddress = useCallback(
    (chainFamily: ChainFamily) => {
      const account = accounts.find((a) => a.chainFamily === chainFamily);
      return account?.address ?? null;
    },
    [accounts],
  );

  return (
    <DesktopWalletContext.Provider
      value={{
        isUnlocked,
        walletName,
        accounts,
        createWallet,
        importWallet,
        unlockWallet,
        lockWallet,
        deriveAccount,
        getAddress,
      }}
    >
      {children}
    </DesktopWalletContext.Provider>
  );
}

export function useDesktopWallet() {
  const ctx = useContext(DesktopWalletContext);
  if (!ctx) throw new Error('useDesktopWallet must be used within DesktopWalletProvider');
  return ctx;
}
