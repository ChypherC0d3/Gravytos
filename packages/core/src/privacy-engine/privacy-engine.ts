// ===================================================================
// NEXORA VAULT -- Privacy Engine
// Core privacy enhancement logic delegating to chain-specific engines
// ===================================================================

import {
  PrivacyLevel,
  ChainFamily,
  DEFAULT_PRIVACY_CONFIGS,
} from '@gravytos/types';
import type { PrivacyConfig, TransactionRequest } from '@gravytos/types';

import { BitcoinPrivacyEngine } from './btc-privacy';
import { EVMPrivacyEngine } from './evm-privacy';
import { SolanaPrivacyEngine } from './sol-privacy';

/**
 * The PrivacyEngine applies privacy enhancements to transactions
 * based on the user's selected privacy level and chain family.
 *
 * It delegates chain-specific logic to dedicated sub-engines:
 *   - BitcoinPrivacyEngine  -- Coin control, UTXO scoring, CoinJoin proofs
 *   - EVMPrivacyEngine      -- Stealth addresses (ERC-5564), RPC rotation, gas randomization
 *   - SolanaPrivacyEngine   -- Wallet rotation, priority fee randomization, bundling
 */
export class PrivacyEngine {
  private btcEngine = new BitcoinPrivacyEngine();
  private evmEngine = new EVMPrivacyEngine();
  private solEngine = new SolanaPrivacyEngine();

  /**
   * Get the full privacy configuration for a given level.
   * Returns a copy so callers cannot mutate the defaults.
   */
  getConfig(level: PrivacyLevel): PrivacyConfig {
    return { ...DEFAULT_PRIVACY_CONFIGS[level] };
  }

  /**
   * Enhance a transaction request with privacy features appropriate for
   * the specified privacy level and chain family.
   */
  async enhanceTransaction(
    tx: TransactionRequest,
    level: PrivacyLevel,
    chainFamily: ChainFamily,
  ): Promise<TransactionRequest> {
    switch (chainFamily) {
      case ChainFamily.Bitcoin:
        return this.btcEngine.enhanceTransaction(tx, level);
      case ChainFamily.EVM:
        return this.evmEngine.enhanceTransaction(tx, level);
      case ChainFamily.Solana:
        return this.solEngine.enhanceTransaction(tx, level);
      default:
        // Unknown chain family -- apply only the privacy level tag.
        return { ...tx, privacyLevel: level };
    }
  }

  /**
   * Validate that a transaction meets the minimum privacy requirements
   * for the specified level.
   */
  validatePrivacyRequirements(
    tx: TransactionRequest,
    level: PrivacyLevel,
  ): PrivacyValidationResult {
    const issues: string[] = [];

    if (level === PrivacyLevel.High) {
      // High privacy requires coin control for Bitcoin UTXO transactions
      if (tx.utxos && tx.utxos.length > 0 && !tx.changeAddress) {
        issues.push(
          'High privacy level requires a dedicated change address for UTXO transactions',
        );
      }
    }

    return {
      valid: issues.length === 0,
      issues,
      level,
    };
  }

  // ── Sub-engine Accessors ────────────────────────────────────────

  getBtcEngine(): BitcoinPrivacyEngine {
    return this.btcEngine;
  }

  getEvmEngine(): EVMPrivacyEngine {
    return this.evmEngine;
  }

  getSolEngine(): SolanaPrivacyEngine {
    return this.solEngine;
  }

  // ── Capabilities ────────────────────────────────────────────────

  /**
   * Get a human-readable list of active privacy capabilities for a
   * given level on a specific chain family.
   */
  getActiveCapabilities(
    level: PrivacyLevel,
    chainFamily: ChainFamily,
  ): string[] {
    const capabilities: string[] = [];

    // Common capabilities
    if (level === PrivacyLevel.Medium || level === PrivacyLevel.High) {
      capabilities.push('Transaction delay randomization');
    }

    // Chain-specific capabilities
    switch (chainFamily) {
      case ChainFamily.Bitcoin:
        if (level === PrivacyLevel.Medium) {
          capabilities.push('Privacy-optimized UTXO selection');
          capabilities.push('Fresh HD-derived change address');
        }
        if (level === PrivacyLevel.High) {
          capabilities.push('Manual coin control (UTXO selection)');
          capabilities.push('Multiple change outputs');
          capabilities.push('Decoy-like output amounts');
          capabilities.push('CoinJoin readiness');
        }
        break;

      case ChainFamily.EVM:
        if (level === PrivacyLevel.Medium) {
          capabilities.push('RPC endpoint rotation');
          capabilities.push('Nonce gap detection');
        }
        if (level === PrivacyLevel.High) {
          capabilities.push('Stealth address generation (ERC-5564)');
          capabilities.push('RPC endpoint rotation');
          capabilities.push('Gas price randomization');
        }
        break;

      case ChainFamily.Solana:
        if (level === PrivacyLevel.Medium) {
          capabilities.push('Derived wallet account rotation');
          capabilities.push('Priority fee randomization');
        }
        if (level === PrivacyLevel.High) {
          capabilities.push('Fee payer abstraction');
          capabilities.push('Transaction bundling');
          capabilities.push('Derived wallet account rotation');
          capabilities.push('Priority fee randomization');
        }
        break;
    }

    return capabilities;
  }
}

export interface PrivacyValidationResult {
  valid: boolean;
  issues: string[];
  level: PrivacyLevel;
}
