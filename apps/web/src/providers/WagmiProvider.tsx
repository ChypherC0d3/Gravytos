import { WagmiProvider as WagmiProviderBase, createConfig, http } from 'wagmi';
import { mainnet, polygon, arbitrum, base, optimism, sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// Create wagmi config — connectors are auto-detected by wagmi v2
// This avoids the "Cannot set properties of undefined" crash in production
const chains = [mainnet, polygon, arbitrum, base, optimism, sepolia] as const;
const config = createConfig({
  chains,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [arbitrum.id]: http(),
    [base.id]: http(),
    [optimism.id]: http(),
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
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
