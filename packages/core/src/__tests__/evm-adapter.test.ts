import { describe, it, expect } from 'vitest';
import { EVMAdapter } from '../chain-adapters/evm/evm-adapter';
import { isNativeToken, NATIVE_TOKEN_ADDRESS } from '../chain-adapters/evm/erc20';

describe('EVM Adapter', () => {
  it('should not be initialized before calling initialize()', () => {
    const adapter = new EVMAdapter('ethereum-1');
    expect(adapter.isInitialized()).toBe(false);
  });

  it('should detect native token correctly', () => {
    expect(isNativeToken(NATIVE_TOKEN_ADDRESS)).toBe(true);
    expect(isNativeToken('0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE')).toBe(true);
    expect(isNativeToken('0x0000000000000000000000000000000000000000')).toBe(true);
    expect(isNativeToken('0x0')).toBe(true);
    expect(isNativeToken('')).toBe(true);

    // Real USDC address should NOT be native
    expect(isNativeToken('0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48')).toBe(false);
    expect(isNativeToken('0xdAC17F958D2ee523a2206206994597C13D831ec7')).toBe(false);
  });

  it('should return privacy capabilities', () => {
    const adapter = new EVMAdapter('ethereum-1');
    const caps = adapter.getPrivacyCapabilities();

    expect(caps.length).toBeGreaterThan(0);
    expect(caps.find((c) => c.id === 'rpc_rotation')).toBeDefined();
    expect(caps.find((c) => c.id === 'tx_delay')).toBeDefined();
    expect(caps.find((c) => c.id === 'stealth_addresses')).toBeDefined();
  });

  it('should have correct chain family', () => {
    const adapter = new EVMAdapter('ethereum-1');
    expect(adapter.chainFamily).toBe('evm');
    expect(adapter.chainId).toBe('ethereum-1');
  });

  it('should throw if used without initialization', () => {
    const adapter = new EVMAdapter('ethereum-1');

    expect(() => adapter.getBalance('0x0')).rejects.toThrow('not initialized');
  });

  it('should initialize with valid config', async () => {
    const adapter = new EVMAdapter('ethereum-1');

    await adapter.initialize({
      id: 'ethereum-1',
      family: 'evm' as any,
      name: 'Ethereum',
      symbol: 'ETH',
      decimals: 18,
      color: '#627EEA',
      logoUrl: '',
      rpcUrls: ['https://eth.llamarpc.com'],
      explorerUrl: 'https://etherscan.io',
      evmChainId: 1,
      isTestnet: false,
      blockTimeSeconds: 12,
      enabled: true,
    });

    expect(adapter.isInitialized()).toBe(true);
  });

  it('should throw if initialized without evmChainId', async () => {
    const adapter = new EVMAdapter('custom-chain');

    await expect(
      adapter.initialize({
        id: 'custom-chain',
        family: 'evm' as any,
        name: 'Custom',
        symbol: 'ETH',
        decimals: 18,
        color: '#000',
        logoUrl: '',
        rpcUrls: ['https://rpc.example.com'],
        explorerUrl: '',
        isTestnet: false,
        blockTimeSeconds: 12,
        enabled: true,
      }),
    ).rejects.toThrow('evmChainId');
  });

  it('should throw if initialized without RPC URLs', async () => {
    const adapter = new EVMAdapter('ethereum-1');

    await expect(
      adapter.initialize({
        id: 'ethereum-1',
        family: 'evm' as any,
        name: 'Ethereum',
        symbol: 'ETH',
        decimals: 18,
        color: '#627EEA',
        logoUrl: '',
        rpcUrls: [],
        explorerUrl: 'https://etherscan.io',
        evmChainId: 1,
        isTestnet: false,
        blockTimeSeconds: 12,
        enabled: true,
      }),
    ).rejects.toThrow('RPC URL');
  });
});
