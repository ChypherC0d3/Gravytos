import { ConnectButton } from '@rainbow-me/rainbowkit';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

export function ConnectWalletButton() {
  return (
    <div className="flex items-center gap-2">
      {/* EVM Connect */}
      <ConnectButton.Custom>
        {({ account, chain, openConnectModal, openAccountModal, mounted }) => {
          const connected = mounted && account && chain;
          return (
            <button
              onClick={connected ? openAccountModal : openConnectModal}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-zinc-700 hover:border-zinc-500 text-zinc-300 hover:text-white transition-colors flex items-center gap-2"
            >
              {connected ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  {account.displayName}
                </>
              ) : (
                'Connect EVM'
              )}
            </button>
          );
        }}
      </ConnectButton.Custom>

      {/* Solana Connect */}
      <WalletMultiButton className="!bg-zinc-800 !border !border-zinc-700 !rounded-lg !h-8 !text-xs !font-medium" />
    </div>
  );
}
