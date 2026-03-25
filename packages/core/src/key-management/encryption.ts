// ===================================================================
// NEXORA VAULT -- Seed Encryption (AES-256-GCM + PBKDF2)
// Uses the Web Crypto API for all cryptographic operations
// ===================================================================

/**
 * Encrypted vault payload containing all data needed for decryption.
 */
export interface EncryptedVault {
  /** Base64-encoded ciphertext */
  ciphertext: string;
  /** Base64-encoded 12-byte initialization vector */
  iv: string;
  /** Base64-encoded 32-byte salt for PBKDF2 */
  salt: string;
  /** Encryption algorithm identifier */
  algorithm: 'AES-256-GCM';
  /** Key derivation function parameters */
  kdf: {
    algorithm: 'PBKDF2';
    iterations: number;
    hash: 'SHA-256';
  };
  /** Schema version for forward compatibility */
  version: 1;
}

// PBKDF2 iteration count – OWASP 2023 recommendation for SHA-256.
const PBKDF2_ITERATIONS = 600_000;

// ── Helpers ─────────────────────────────────────────────────────

function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis.crypto?.subtle !== 'undefined') {
    return globalThis.crypto.subtle;
  }
  throw new Error(
    'Web Crypto API is not available in this environment. ' +
    'Ensure you are running in a browser or Node >= 20 with the crypto global.',
  );
}

function getRandomBytes(length: number): Uint8Array {
  const buf = new Uint8Array(length);
  globalThis.crypto.getRandomValues(buf);
  return buf;
}

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

function base64ToUint8(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// ── Key Derivation ──────────────────────────────────────────────

async function deriveKey(
  password: string,
  salt: Uint8Array,
  iterations: number,
): Promise<CryptoKey> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const passwordKey = await subtle.importKey(
    'raw',
    encoder.encode(password) as unknown as ArrayBuffer,
    'PBKDF2',
    false,
    ['deriveKey'],
  );

  return subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

// ── Public API ──────────────────────────────────────────────────

/**
 * Encrypt a seed (or any Uint8Array) with a user-provided password.
 *
 * Uses PBKDF2 (600 000 iterations, SHA-256) to derive a 256-bit key,
 * then AES-256-GCM with a random 12-byte IV.
 */
export async function encryptSeed(
  seed: Uint8Array,
  password: string,
): Promise<EncryptedVault> {
  const subtle = getSubtleCrypto();
  const salt = getRandomBytes(32);
  const iv = getRandomBytes(12);

  const key = await deriveKey(password, salt, PBKDF2_ITERATIONS);

  const ciphertextBuf = await subtle.encrypt(
    { name: 'AES-GCM', iv: iv as BufferSource },
    key,
    seed as BufferSource,
  );

  return {
    ciphertext: uint8ToBase64(new Uint8Array(ciphertextBuf)),
    iv: uint8ToBase64(iv),
    salt: uint8ToBase64(salt),
    algorithm: 'AES-256-GCM',
    kdf: {
      algorithm: 'PBKDF2',
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    version: 1,
  };
}

/**
 * Decrypt a previously encrypted vault payload.
 * Throws if the password is wrong (GCM authentication tag check fails).
 */
export async function decryptSeed(
  vault: EncryptedVault,
  password: string,
): Promise<Uint8Array> {
  const subtle = getSubtleCrypto();
  const salt = base64ToUint8(vault.salt);
  const iv = base64ToUint8(vault.iv);
  const ciphertext = base64ToUint8(vault.ciphertext);

  const key = await deriveKey(password, salt, vault.kdf.iterations);

  try {
    const plaintextBuf = await subtle.decrypt(
      { name: 'AES-GCM', iv: iv as BufferSource },
      key,
      ciphertext as BufferSource,
    );
    return new Uint8Array(plaintextBuf);
  } catch {
    throw new Error('Decryption failed – wrong password or corrupted vault');
  }
}
