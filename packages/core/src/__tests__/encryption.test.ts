import { describe, it, expect } from 'vitest';
import { encryptSeed, decryptSeed } from '../key-management/encryption';

describe('Encryption', () => {
  it('should encrypt and decrypt a seed correctly', async () => {
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const password = 'test-password';

    const vault = await encryptSeed(seed, password);
    const decrypted = await decryptSeed(vault, password);

    expect(decrypted).toEqual(seed);
  });

  it('should fail decryption with wrong password', async () => {
    const seed = crypto.getRandomValues(new Uint8Array(32));
    const vault = await encryptSeed(seed, 'correct-password');

    await expect(decryptSeed(vault, 'wrong-password')).rejects.toThrow(
      'Decryption failed',
    );
  });

  it('should produce different ciphertext for same input', async () => {
    const seed = new Uint8Array(32).fill(42);
    const password = 'same-password';

    const vault1 = await encryptSeed(seed, password);
    const vault2 = await encryptSeed(seed, password);

    // Random IV and salt should produce different ciphertexts
    expect(vault1.ciphertext).not.toBe(vault2.ciphertext);
    expect(vault1.iv).not.toBe(vault2.iv);
    expect(vault1.salt).not.toBe(vault2.salt);
  });

  it('should produce a valid vault structure', async () => {
    const seed = crypto.getRandomValues(new Uint8Array(64));
    const vault = await encryptSeed(seed, 'my-password');

    expect(vault.algorithm).toBe('AES-256-GCM');
    expect(vault.version).toBe(1);
    expect(vault.kdf.algorithm).toBe('PBKDF2');
    expect(vault.kdf.iterations).toBe(600_000);
    expect(vault.kdf.hash).toBe('SHA-256');
    expect(typeof vault.ciphertext).toBe('string');
    expect(typeof vault.iv).toBe('string');
    expect(typeof vault.salt).toBe('string');
  });
});
