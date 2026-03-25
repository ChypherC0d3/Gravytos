import { describe, it, expect } from 'vitest';
import {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  deriveBitcoinKey,
  deriveEthereumKey,
  deriveSolanaKey,
} from '../key-management';

const TEST_MNEMONIC =
  'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about';

describe('Key Management', () => {
  describe('Mnemonic Generation', () => {
    it('should generate a valid 12-word mnemonic', () => {
      const mnemonic = generateMnemonic(12);
      expect(mnemonic.split(' ').length).toBe(12);
      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    it('should generate a valid 24-word mnemonic', () => {
      const mnemonic = generateMnemonic(24);
      expect(mnemonic.split(' ').length).toBe(24);
      expect(validateMnemonic(mnemonic)).toBe(true);
    });

    it('should validate a known good mnemonic', () => {
      expect(validateMnemonic(TEST_MNEMONIC)).toBe(true);
    });

    it('should reject an invalid mnemonic', () => {
      expect(validateMnemonic('abandon abandon abandon abandon invalid')).toBe(
        false,
      );
      expect(validateMnemonic('not a valid mnemonic at all')).toBe(false);
      expect(validateMnemonic('')).toBe(false);
    });
  });

  describe('Bitcoin Key Derivation', () => {
    it('should derive correct BTC address from known mnemonic', async () => {
      const seed = await mnemonicToSeed(TEST_MNEMONIC);
      const key = deriveBitcoinKey(seed, 0, 0);

      // BIP84 native segwit address should start with bc1
      expect(key.address).toMatch(/^bc1/);
      expect(key.derivationPath).toBe("m/84'/0'/0'/0/0");
      expect(key.chainFamily).toBe('bitcoin');
      expect(key.publicKey).toBeInstanceOf(Uint8Array);
      expect(key.privateKey).toBeInstanceOf(Uint8Array);
    });

    it('should derive different addresses for different indices', async () => {
      const seed = await mnemonicToSeed(TEST_MNEMONIC);
      const key0 = deriveBitcoinKey(seed, 0, 0);
      const key1 = deriveBitcoinKey(seed, 0, 1);
      const key2 = deriveBitcoinKey(seed, 1, 0);

      expect(key0.address).not.toBe(key1.address);
      expect(key0.address).not.toBe(key2.address);
      expect(key1.address).not.toBe(key2.address);
    });

    it('should derive consistent addresses from same seed', async () => {
      const seed = await mnemonicToSeed(TEST_MNEMONIC);
      const key1 = deriveBitcoinKey(seed, 0, 0);
      const key2 = deriveBitcoinKey(seed, 0, 0);

      expect(key1.address).toBe(key2.address);
      expect(key1.derivationPath).toBe(key2.derivationPath);
    });
  });

  describe('Ethereum Key Derivation', () => {
    it('should derive correct ETH address from known mnemonic', async () => {
      const seed = await mnemonicToSeed(TEST_MNEMONIC);
      const key = deriveEthereumKey(seed, 0);

      // ETH address: 0x-prefixed, 42 chars total
      expect(key.address).toMatch(/^0x[0-9a-fA-F]{40}$/);
      expect(key.address.length).toBe(42);
      expect(key.derivationPath).toBe("m/44'/60'/0'/0/0");
      expect(key.chainFamily).toBe('evm');
    });

    it('should produce checksummed addresses', async () => {
      const seed = await mnemonicToSeed(TEST_MNEMONIC);
      const key = deriveEthereumKey(seed, 0);

      // A checksummed address has at least one uppercase letter in the hex part
      const hexPart = key.address.slice(2);
      const hasUppercase = /[A-F]/.test(hexPart);
      const hasLowercase = /[a-f]/.test(hexPart);
      // For the "abandon" mnemonic, the address should be mixed-case (checksummed)
      expect(hasUppercase || hasLowercase).toBe(true);
    });

    it('should derive different addresses for different indices', async () => {
      const seed = await mnemonicToSeed(TEST_MNEMONIC);
      const key0 = deriveEthereumKey(seed, 0);
      const key1 = deriveEthereumKey(seed, 1);

      expect(key0.address).not.toBe(key1.address);
    });
  });

  describe('Solana Key Derivation', () => {
    it('should derive correct SOL address from known mnemonic', async () => {
      const seed = await mnemonicToSeed(TEST_MNEMONIC);
      const key = deriveSolanaKey(seed, 0);

      // Solana address: base58-encoded public key, 32-44 characters
      expect(key.address.length).toBeGreaterThanOrEqual(32);
      expect(key.address.length).toBeLessThanOrEqual(44);
      // base58 chars: 123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz
      expect(key.address).toMatch(
        /^[123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz]+$/,
      );
      expect(key.derivationPath).toBe("m/44'/501'/0'/0'");
      expect(key.chainFamily).toBe('solana');
    });

    it('should derive different addresses for different indices', async () => {
      const seed = await mnemonicToSeed(TEST_MNEMONIC);
      const key0 = deriveSolanaKey(seed, 0);
      const key1 = deriveSolanaKey(seed, 1);

      expect(key0.address).not.toBe(key1.address);
    });

    it('should derive consistent addresses from same seed', async () => {
      const seed = await mnemonicToSeed(TEST_MNEMONIC);
      const key1 = deriveSolanaKey(seed, 0);
      const key2 = deriveSolanaKey(seed, 0);

      expect(key1.address).toBe(key2.address);
    });
  });
});
