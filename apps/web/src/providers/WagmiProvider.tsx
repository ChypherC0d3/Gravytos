import { WagmiProvider as WagmiProviderBase, createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, base, optimism } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { injected, coinbaseWallet } from 'wagmi/connectors';
import type { ReactNode } from 'react';

// Create wagmi config WITHOUT WalletConnect (avoids projectId requirement)
// Users can still connect via MetaMask (injected) and Coinbase Wallet
const config = createConfig({
  chains: [mainnet, polygon, arbitrum, base, optimism],
  connectors: [
    injected(),
    coinbaseWallet({ appName: 'Gravytos' }),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
  },
});

const queryClient = new QueryClient();

export function EVMProvider({ children }: { children: ReactNode }) {
  return (
    <WagmiProviderBase config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProviderBase>
  );
}

export { config as wagmiConfig };
