import { describe, it, expect } from 'vitest';
import { PrivacyEngine } from '../privacy-engine/privacy-engine';
import { BitcoinPrivacyEngine } from '../privacy-engine/btc-privacy';
import { PrivacyLevel, ChainFamily } from '@gravytos/types';
import type { TransactionRequest, UTXOInput } from '@gravytos/types';

function makeTx(overrides: Partial<TransactionRequest> = {}): TransactionRequest {
  return {
    chainId: 'bitcoin-mainnet',
    from: 'bc1qsender',
    to: 'bc1qrecipient',
    value: '0.01',
    walletId: 'wallet-1',
    privacyLevel: PrivacyLevel.Low,
    ...overrides,
  };
}

function makeUTXO(value: number, overrides: Partial<UTXOInput> = {}): UTXOInput {
  return {
    txid: Math.random().toString(36).substring(2).padEnd(64, '0'),
    vout: 0,
    value,
    scriptPubKey: '',
    address: 'bc1qtest',
    confirmations: 6,
    ...overrides,
  };
}

describe('Privacy Engine', () => {
  it('should apply no delay for Low privacy on BTC', () => {
    const engine = new PrivacyEngine();
    const tx = makeTx();
    const enhanced = engine.getBtcEngine().enhanceTransaction(tx, PrivacyLevel.Low);
    expect(enhanced.delay).toBe(0);
  });

  it('should apply delay for Medium privacy on EVM', () => {
    const engine = new PrivacyEngine();
    const tx = makeTx({ chainId: 'ethereum-1' });
    const enhanced = engine.getEvmEngine().enhanceTransaction(tx, PrivacyLevel.Medium);
    expect(enhanced.delay).toBeGreaterThan(0);
    expect(enhanced.delay).toBeLessThanOrEqual(30000);
  });

  it('should apply delay for Medium privacy on BTC', () => {
    const engine = new PrivacyEngine();
    const tx = makeTx();
    const enhanced = engine.getBtcEngine().enhanceTransaction(tx, PrivacyLevel.Medium);
    expect(enhanced.delay).toBeGreaterThanOrEqual(5000);
    expect(enhanced.delay).toBeLessThanOrEqual(30000);
  });

  it('should require coin control for High BTC privacy', () => {
    const engine = new PrivacyEngine();
    const tx = makeTx({ utxos: undefined });

    expect(() =>
      engine.getBtcEngine().enhanceTransaction(tx, PrivacyLevel.High),
    ).toThrow('High privacy mode requires manual UTXO selection');
  });

  it('should accept High BTC privacy with UTXOs provided', () => {
    const engine = new PrivacyEngine();
    const tx = makeTx({
      utxos: [makeUTXO(50000), makeUTXO(30000)],
    });

    const enhanced = engine.getBtcEngine().enhanceTransaction(tx, PrivacyLevel.High);
    expect(enhanced.delay).toBeGreaterThanOrEqual(30000);
    expect(enhanced.delay).toBeLessThanOrEqual(300000);
    expect(enhanced.privacyLevel).toBe(PrivacyLevel.High);
  });

  it('should reject frozen UTXOs in High privacy mode', () => {
    const engine = new PrivacyEngine();
    const tx = makeTx({
      utxos: [makeUTXO(50000, { frozen: true })],
    });

    expect(() =>
      engine.getBtcEngine().enhanceTransaction(tx, PrivacyLevel.High),
    ).toThrow('frozen UTXO');
  });

  it('should score UTXOs for privacy', () => {
    const btcEngine = new BitcoinPrivacyEngine();

    const confirmedLabeled = makeUTXO(12345, {
      confirmations: 10,
      label: 'mining',
      address: 'bc1qunique1',
    });
    const unconfirmed = makeUTXO(50000, {
      confirmations: 0,
      address: 'bc1qunique2',
    });
    const roundAmount = makeUTXO(100000, {
      confirmations: 6,
      address: 'bc1qunique3',
    });
    const frozenCoin = makeUTXO(25000, {
      confirmations: 6,
      frozen: true,
      address: 'bc1qunique4',
    });

    const allUtxos = [confirmedLabeled, unconfirmed, roundAmount, frozenCoin];

    const scoreLabeled = btcEngine.scoreUTXO(confirmedLabeled, allUtxos);
    const scoreUnconfirmed = btcEngine.scoreUTXO(unconfirmed, allUtxos);
    const scoreRound = btcEngine.scoreUTXO(roundAmount, allUtxos);
    const scoreFrozen = btcEngine.scoreUTXO(frozenCoin, allUtxos);

    // Confirmed + labeled should score highest
    expect(scoreLabeled).toBeGreaterThan(scoreUnconfirmed);
    // Frozen should score lower
    expect(scoreFrozen).toBeLessThan(scoreLabeled);
    // Round amounts get penalized
    expect(scoreRound).toBeLessThan(scoreLabeled);
  });

  it('should get privacy config for each level', () => {
    const engine = new PrivacyEngine();

    const low = engine.getConfig(PrivacyLevel.Low);
    expect(low.level).toBe(PrivacyLevel.Low);
    expect(low.rpcRotation).toBe(false);

    const medium = engine.getConfig(PrivacyLevel.Medium);
    expect(medium.level).toBe(PrivacyLevel.Medium);
    expect(medium.rpcRotation).toBe(true);

    const high = engine.getConfig(PrivacyLevel.High);
    expect(high.level).toBe(PrivacyLevel.High);
    expect(high.coinControl).toBe(true);
    expect(high.stealthAddresses).toBe(true);
  });

  it('should list active capabilities per chain and level', () => {
    const engine = new PrivacyEngine();

    const btcHigh = engine.getActiveCapabilities(PrivacyLevel.High, ChainFamily.Bitcoin);
    expect(btcHigh.length).toBeGreaterThan(0);
    expect(btcHigh.some((c) => c.includes('CoinJoin'))).toBe(true);

    const evmMedium = engine.getActiveCapabilities(PrivacyLevel.Medium, ChainFamily.EVM);
    expect(evmMedium.some((c) => c.includes('RPC'))).toBe(true);

    const lowAny = engine.getActiveCapabilities(PrivacyLevel.Low, ChainFamily.Bitcoin);
    expect(lowAny.length).toBe(0);
  });

  it('should validate privacy requirements', () => {
    const engine = new PrivacyEngine();

    // Low privacy: always valid
    const lowResult = engine.validatePrivacyRequirements(makeTx(), PrivacyLevel.Low);
    expect(lowResult.valid).toBe(true);

    // High privacy with UTXOs but no change address should warn
    const highTx = makeTx({
      utxos: [makeUTXO(50000)],
      changeAddress: undefined,
    });
    const highResult = engine.validatePrivacyRequirements(highTx, PrivacyLevel.High);
    expect(highResult.valid).toBe(false);
    expect(highResult.issues.length).toBeGreaterThan(0);
  });
});
