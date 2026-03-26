// ===================================================================
// GRAVYTOS -- HD Wallet (BIP39 / BIP44 / BIP84)
// Real key derivation for Bitcoin, Ethereum, and Solana
// ===================================================================

import {
  generateMnemonic as scureGenerateMnemonic,
  validateMnemonic as scureValidateMnemonic,
  mnemonicToSeed as scureMnemonicToSeed,
} from '@scure/bip39';
import { wordlist as english } from '@scure/bip39/wordlists/english.js';
import { HDKey } from '@scure/bip32';
import { sha256 } from '@noble/hashes/sha2.js';
import { ripemd160 } from '@noble/hashes/legacy.js';
import { keccak_256 } from '@noble/hashes/sha3.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import { bech32, base58 } from '@scure/base';
import { hmac } from '@noble/hashes/hmac.js';
import { sha512 } from '@noble/hashes/sha2.js';
import { ed25519 } from '@noble/curves/ed25519.js';

import type { DerivedKey } from '@gravytos/types';
import { ChainFamily } from '@gravytos/types';

// ── BIP39 Mnemonic Helpers ──────────────────────────────────────

/**
 * Generate a BIP39 mnemonic phrase.
 * @param strength - 12 words (128 bits) or 24 words (256 bits). Default 12.
 */
export function generateMnemonic(strength: 12 | 24 = 12): string {
  const bits = strength === 24 ? 256 : 128;
  return scureGenerateMnemonic(english, bits);
}

/**
 * Validate a BIP39 mnemonic phrase against the English wordlist.
 */
export function validateMnemonic(mnemonic: string): boolean {
  return scureValidateMnemonic(mnemonic, english);
}

/**
 * Derive a 64-byte seed from a mnemonic and optional passphrase.
 */
export async function mnemonicToSeed(
  mnemonic: string,
  passphrase?: string,
): Promise<Uint8Array> {
  return scureMnemonicToSeed(mnemonic, passphrase);
}

// ── Bitcoin (BIP84 P2WPKH native SegWit) ────────────────────────

/**
 * Hash160 = RIPEMD160(SHA256(data))
 */
function hash160(data: Uint8Array): Uint8Array {
  return ripemd160(sha256(data));
}

/**
 * Encode a witness program as a bech32 address (P2WPKH).
 * witness version 0, 20-byte key hash.
 */
function encodeBech32Address(pubkeyHash: Uint8Array, prefix: string): string {
  const words = bech32.toWords(pubkeyHash);
  // witness version 0 prepended
  return bech32.encode(prefix, [0, ...words]);
}

/**
 * Derive a BIP84 Bitcoin native SegWit key.
 * Path: m/84'/0'/{accountIndex}'/0/{addressIndex}
 */
export function deriveBitcoinKey(
  seed: Uint8Array,
  accountIndex: number,
  addressIndex: number,
): DerivedKey {
  const master = HDKey.fromMasterSeed(seed);
  const path = `m/84'/0'/${accountIndex}'/0/${addressIndex}`;
  const child = master.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error('Failed to derive Bitcoin key');
  }

  // P2WPKH address: bech32 encode of hash160(compressed pubkey)
  const pubkeyHash = hash160(child.publicKey);
  const address = encodeBech32Address(pubkeyHash, 'bc');

  return {
    publicKey: child.publicKey,
    privateKey: child.privateKey,
    address,
    derivationPath: path,
    chainFamily: ChainFamily.Bitcoin,
  };
}

// ── Ethereum (BIP44) ────────────────────────────────────────────

/**
 * Compute an EIP-55 checksummed Ethereum address.
 */
function toChecksumAddress(address: string): string {
  const lower = address.toLowerCase().replace('0x', '');
  const hashHex = bytesToHex(keccak_256(new TextEncoder().encode(lower)));
  let checksummed = '0x';
  for (let i = 0; i < lower.length; i++) {
    const charCode = parseInt(hashHex[i], 16);
    checksummed += charCode >= 8 ? lower[i].toUpperCase() : lower[i];
  }
  return checksummed;
}

/**
 * Derive a BIP44 Ethereum key.
 * Path: m/44'/60'/0'/0/{accountIndex}
 */
export function deriveEthereumKey(
  seed: Uint8Array,
  accountIndex: number,
): DerivedKey {
  const master = HDKey.fromMasterSeed(seed);
  const path = `m/44'/60'/0'/0/${accountIndex}`;
  const child = master.derive(path);

  if (!child.privateKey || !child.publicKey) {
    throw new Error('Failed to derive Ethereum key');
  }

  // Ethereum address: keccak256 of the uncompressed public key (sans 04 prefix),
  // take last 20 bytes.
  // @scure/bip32 gives us compressed (33 bytes). We need uncompressed (65 bytes).
  // Use the secp256k1 point decompression via HDKey.
  // HDKey exposes the public key in compressed form. We need to decompress it.
  // We can use @noble/curves secp256k1 for this, which is a transitive dependency of @scure/bip32.
  const uncompressedPub = decompressPublicKey(child.publicKey);

  // Remove the 0x04 prefix byte, then keccak256, then take last 20 bytes
  const pubWithoutPrefix = uncompressedPub.slice(1);
  const hash = keccak_256(pubWithoutPrefix);
  const addressBytes = hash.slice(-20);
  const address = toChecksumAddress('0x' + bytesToHex(addressBytes));

  return {
    publicKey: child.publicKey,
    privateKey: child.privateKey,
    address,
    derivationPath: path,
    chainFamily: ChainFamily.EVM,
  };
}

/**
 * Decompress a 33-byte compressed secp256k1 public key to 65-byte uncompressed form.
 * Uses the curve equation y^2 = x^3 + 7 (mod p).
 */
function decompressPublicKey(compressed: Uint8Array): Uint8Array {
  if (compressed.length !== 33) {
    throw new Error('Invalid compressed public key length');
  }

  // secp256k1 field prime
  const p = BigInt('0xFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFEFFFFFC2F');

  const prefix = compressed[0];
  const xBytes = compressed.slice(1);
  let x = BigInt(0);
  for (const b of xBytes) {
    x = (x << BigInt(8)) | BigInt(b);
  }

  // y^2 = x^3 + 7 mod p
  const ySquared = (modPow(x, BigInt(3), p) + BigInt(7)) % p;

  // y = ySquared ^ ((p+1)/4) mod p   (works because p ≡ 3 mod 4)
  let y = modPow(ySquared, (p + BigInt(1)) / BigInt(4), p);

  // Choose the correct y parity based on the prefix byte (0x02 = even, 0x03 = odd)
  const isEven = prefix === 0x02;
  if ((y % BigInt(2) === BigInt(0)) !== isEven) {
    y = p - y;
  }

  const result = new Uint8Array(65);
  result[0] = 0x04;

  const xArr = bigIntToBytes(x, 32);
  const yArr = bigIntToBytes(y, 32);
  result.set(xArr, 1);
  result.set(yArr, 33);

  return result;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = BigInt(1);
  base = base % mod;
  while (exp > BigInt(0)) {
    if (exp % BigInt(2) === BigInt(1)) {
      result = (result * base) % mod;
    }
    exp = exp >> BigInt(1);
    base = (base * base) % mod;
  }
  return result;
}

function bigIntToBytes(value: bigint, length: number): Uint8Array {
  const result = new Uint8Array(length);
  for (let i = length - 1; i >= 0; i--) {
    result[i] = Number(value & BigInt(0xff));
    value = value >> BigInt(8);
  }
  return result;
}

// ── Solana (SLIP-0010 ed25519 derivation — browser-compatible) ───

/**
 * SLIP-0010 ed25519 master key derivation from seed.
 */
function slip10DeriveChild(
  parentKey: Uint8Array,
  parentChainCode: Uint8Array,
  index: number,
): { key: Uint8Array; chainCode: Uint8Array } {
  const data = new Uint8Array(1 + 32 + 4);
  data[0] = 0x00;
  data.set(parentKey, 1);
  const view = new DataView(data.buffer);
  view.setUint32(33, (index | 0x80000000) >>> 0, false);
  const I = hmac(sha512, parentChainCode, data);
  return { key: I.slice(0, 32), chainCode: I.slice(32) };
}

function slip10DerivePath(seed: Uint8Array, path: string): Uint8Array {
  const I = hmac(sha512, new TextEncoder().encode('ed25519 seed'), seed);
  let key = I.slice(0, 32);
  let chainCode = I.slice(32);

  const segments = path.replace("m/", "").split("/");
  for (const seg of segments) {
    const index = parseInt(seg.replace("'", ""), 10);
    const result = slip10DeriveChild(key, chainCode, index);
    key = new Uint8Array(result.key);
    chainCode = new Uint8Array(result.chainCode);
  }
  return key;
}

/**
 * Derive a BIP44 Solana key.
 * Path: m/44'/501'/{accountIndex}'/0'
 */
export function deriveSolanaKey(
  seed: Uint8Array,
  accountIndex: number,
): DerivedKey {
  const path = `m/44'/501'/${accountIndex}'/0'`;
  const privateKeyBytes = slip10DerivePath(seed, path.replace('m/', ''));

  const publicKey = ed25519.getPublicKey(privateKeyBytes);

  // Solana keypair is 64 bytes: privateKey (32) + publicKey (32)
  const keypair = new Uint8Array(64);
  keypair.set(privateKeyBytes, 0);
  keypair.set(publicKey, 32);

  // Solana address = base58-encoded public key
  const address = base58.encode(publicKey);

  return {
    publicKey,
    privateKey: keypair,
    address,
    derivationPath: path,
    chainFamily: ChainFamily.Solana,
  };
}
