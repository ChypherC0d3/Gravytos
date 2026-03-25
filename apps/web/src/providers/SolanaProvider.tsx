import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import type { FC, ReactNode } from 'react';
import '@solana/wallet-adapter-react-ui/styles.css';

const endpoint = clusterApiUrl('mainnet-beta');
const wallets = [new PhantomWalletAdapter(), new SolflareWalletAdapter()];

// Cast to work around React 18/19 type mismatch in @solana/wallet-adapter-react
const Connection = ConnectionProvider as unknown as FC<{ endpoint: string; children: ReactNode }>;
const Wallet = WalletProvider as unknown as FC<{ wallets: typeof wallets; autoConnect: boolean; children: ReactNode }>;
const WalletModal = WalletModalProvider as unknown as FC<{ children: ReactNode }>;

export function SolanaWalletProvider({ children }: { children: ReactNode }) {
  return (
    <Connection endpoint={endpoint}>
      <Wallet wallets={wallets} autoConnect>
        <WalletModal>
          {children}
        </WalletModal>
      </Wallet>
    </Connection>
  );
}
