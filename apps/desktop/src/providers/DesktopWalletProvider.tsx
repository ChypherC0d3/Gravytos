import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { invoke } from '@tauri-apps/api/core';
import type { ChainFamily, WalletAccount } from '@gravytos/types';

interface DesktopWalletContextType {
  isUnlocked: boolean;
  walletName: string | null;
  accounts: WalletAccount[];
  appDataDir: string | null;

  createWallet: (name: string, password: string) => Promise<string>;
  importWallet: (name: string, mnemonic: string, password: string) => Promise<void>;
  unlockWallet: (password: string) => Promise<void>;
  lockWallet: () => void;

  deriveAccount: (chainFamily: ChainFamily, label?: string) => Promise<WalletAccount>;
  getAddress: (chainFamily: ChainFamily) => string | null;
}

const DesktopWalletContext = createContext<DesktopWalletContextType | null>(null);

// Helper: read JSON from Tauri filesystem
async function readJsonFile<T>(path: string): Promise<T | null> {
  try {
    const exists: boolean = await invoke('file_exists', { path });
    if (!exists) return null;
    const content: string = await invoke('read_file', { path });
    return JSON.parse(content) as T;
  } catch {
    return null;
  }
}

// Helper: write JSON to Tauri filesystem
async function writeJsonFile(path: string, data: unknown): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  await invoke('write_file', { path, content });
}

export function DesktopWalletProvider({ children }: { children: ReactNode }) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [walletName, setWalletName] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<WalletAccount[]>([]);
  const [_walletId, setWalletId] = useState<string | null>(null);
  const [appDataDir, setAppDataDir] = useState<string | null>(null);

  // Resolve the app data directory on mount
  useEffect(() => {
    invoke<string>('get_app_data_dir')
      .then((dir) => setAppDataDir(dir))
      .catch((err) => console.error('Failed to get app data dir:', err));
  }, []);

  // Build a file path within the app data directory
  const getFilePath = useCallback(
    (filename: string): string | null => {
      if (!appDataDir) return null;
      // Use forward slash for cross-platform compat (Tauri normalizes)
      return `${appDataDir}/${filename}`;
    },
    [appDataDir],
  );

  const createWallet = useCallback(
    async (name: string, _password: string) => {
      // Use WalletManager from @gravytos/core to generate mnemonic
      // Encrypt vault with password and save via Tauri FS
      const walletId = crypto.randomUUID();
      const vaultPath = getFilePath('vault.json');

      if (vaultPath) {
        await writeJsonFile(vaultPath, {
          id: walletId,
          name,
          createdAt: new Date().toISOString(),
          accounts: [],
        });
      }

      setWalletName(name);
      setWalletId(walletId);
      return 'placeholder mnemonic';
    },
    [getFilePath],
  );

  const importWallet = useCallback(
    async (name: string, _mnemonic: string, _password: string) => {
      // Import using WalletManager, encrypt and persist
      const walletId = crypto.randomUUID();
      const vaultPath = getFilePath('vault.json');

      if (vaultPath) {
        await writeJsonFile(vaultPath, {
          id: walletId,
          name,
          createdAt: new Date().toISOString(),
          accounts: [],
        });
      }

      setWalletName(name);
      setWalletId(walletId);
    },
    [getFilePath],
  );

  const unlockWallet = useCallback(
    async (_password: string) => {
      // Read encrypted vault from Tauri FS, decrypt with password
      const vaultPath = getFilePath('vault.json');
      if (vaultPath) {
        const vault = await readJsonFile<{
          id: string;
          name: string;
          accounts: WalletAccount[];
        }>(vaultPath);

        if (vault) {
          setWalletName(vault.name);
          setWalletId(vault.id);
          setAccounts(vault.accounts || []);
        }
      }
      setIsUnlocked(true);
    },
    [getFilePath],
  );

  const lockWallet = useCallback(() => {
    setIsUnlocked(false);
    setAccounts([]);
  }, []);

  const deriveAccount = useCallback(
    async (_chainFamily: ChainFamily, _label?: string) => {
      // Use WalletManager.deriveAccount, persist updated accounts to vault
      const account = {} as WalletAccount;

      const vaultPath = getFilePath('vault.json');
      if (vaultPath) {
        const vault = await readJsonFile<{
          id: string;
          name: string;
          accounts: WalletAccount[];
        }>(vaultPath);

        if (vault) {
          vault.accounts = [...(vault.accounts || []), account];
          await writeJsonFile(vaultPath, vault);
          setAccounts(vault.accounts);
        }
      }

      return account;
    },
    [getFilePath],
  );

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
        appDataDir,
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
