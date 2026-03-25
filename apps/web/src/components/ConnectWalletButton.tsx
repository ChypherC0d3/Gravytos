import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';

export function ConnectWalletButton() {
  const { address, isConnected } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const displayAddress = address
    ? `${address.slice(0, 6)}...${address.slice(-4)}`
    : '';

  return (
    <div className="flex items-center gap-2">
      {/* EVM Connect */}
      {isConnected ? (
        <button
          onClick={() => disconnect()}
          className="px-3 py-1.5 text-xs font-light tracking-wide rounded-lg border border-white/10 hover:border-white/20 text-white/70 hover:text-white transition-all duration-300 flex items-center gap-2 glass-card"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          {displayAddress}
        </button>
      ) : (
        <button
          onClick={() => connect({ connector: injected() })}
          className="px-3 py-1.5 text-xs font-light tracking-wide rounded-lg border border-purple-500/30 hover:border-purple-500/50 text-white/70 hover:text-white transition-all duration-300"
        >
          Connect EVM
        </button>
      )}
    </div>
  );
}
