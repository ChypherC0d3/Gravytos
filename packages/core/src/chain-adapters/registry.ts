// ===================================================================
// NEXORA VAULT -- Chain Adapter Registry
// Central registry for managing chain adapter instances
// ===================================================================

import type { ChainFamily, ChainId } from '@gravytos/types';
import type { ChainAdapter } from './types';

/**
 * Registry that manages ChainAdapter instances.
 * Provides lookup by chain ID or chain family.
 */
export class ChainAdapterRegistry {
  private adapters = new Map<ChainId, ChainAdapter>();

  /**
   * Register an adapter for a specific chain.
   * Overwrites any existing adapter for the same chain ID.
   */
  register(adapter: ChainAdapter): void {
    this.adapters.set(adapter.chainId, adapter);
  }

  /**
   * Remove an adapter from the registry.
   */
  unregister(chainId: ChainId): boolean {
    return this.adapters.delete(chainId);
  }

  /**
   * Get an adapter by its chain ID.
   * @throws Error if no adapter is registered for the given chain ID
   */
  get(chainId: ChainId): ChainAdapter {
    const adapter = this.adapters.get(chainId);
    if (!adapter) {
      throw new Error(
        `No chain adapter registered for chain ID: ${chainId}`,
      );
    }
    return adapter;
  }

  /**
   * Get an adapter by chain ID, returning undefined if not found.
   */
  find(chainId: ChainId): ChainAdapter | undefined {
    return this.adapters.get(chainId);
  }

  /**
   * Get all adapters belonging to a specific chain family.
   */
  getByFamily(family: ChainFamily): ChainAdapter[] {
    const result: ChainAdapter[] = [];
    for (const adapter of this.adapters.values()) {
      if (adapter.chainFamily === family) {
        result.push(adapter);
      }
    }
    return result;
  }

  /**
   * Get all adapters that have been successfully initialized.
   */
  getAllInitialized(): ChainAdapter[] {
    const result: ChainAdapter[] = [];
    for (const adapter of this.adapters.values()) {
      if (adapter.isInitialized()) {
        result.push(adapter);
      }
    }
    return result;
  }

  /**
   * Get all registered chain IDs.
   */
  getRegisteredChainIds(): ChainId[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Check whether an adapter is registered for a given chain ID.
   */
  has(chainId: ChainId): boolean {
    return this.adapters.has(chainId);
  }

  /**
   * Get the total number of registered adapters.
   */
  get size(): number {
    return this.adapters.size;
  }

  /**
   * Remove all registered adapters.
   */
  clear(): void {
    this.adapters.clear();
  }
}
