// ===================================================================
// GRAVYTOS -- Key Management barrel export
// ===================================================================

export {
  generateMnemonic,
  validateMnemonic,
  mnemonicToSeed,
  deriveBitcoinKey,
  deriveEthereumKey,
  deriveSolanaKey,
} from './hd-wallet';

export { encryptSeed, decryptSeed } from './encryption';
export type { EncryptedVault } from './encryption';

export { WebSecureStorage, InMemorySecureStorage } from './secure-storage';
export type { SecureStorage } from './secure-storage';
