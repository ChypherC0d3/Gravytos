// ===================================================================
// NEXORA VAULT -- Network Manager
// RPC pool management with rotation, health tracking, and failover
// ===================================================================

import type { ChainId } from '@gravytos/types';

interface RPCEndpoint {
  url: string;
  failures: number;
  lastFailure: number;
  isHealthy: boolean;
}

interface RPCPool {
  endpoints: RPCEndpoint[];
  currentIndex: number;
}

/** Duration after which a failed endpoint is reconsidered (5 minutes) */
const FAILURE_COOLDOWN_MS = 5 * 60 * 1000;

/** Number of consecutive failures before marking an endpoint as unhealthy */
const MAX_FAILURES = 3;

/**
 * NetworkManager maintains RPC endpoint pools for each chain,
 * providing round-robin rotation, health tracking, and automatic
 * failover when endpoints become unhealthy.
 */
export class NetworkManager {
  private pools = new Map<ChainId, RPCPool>();

  /**
   * Initialize the RPC pool for a chain with the given endpoint URLs.
   * Replaces any existing pool for the chain.
   */
  initializePool(chainId: ChainId, rpcUrls: string[]): void {
    if (rpcUrls.length === 0) {
      throw new Error(`Cannot initialize RPC pool for ${chainId} with zero endpoints`);
    }

    this.pools.set(chainId, {
      endpoints: rpcUrls.map((url) => ({
        url,
        failures: 0,
        lastFailure: 0,
        isHealthy: true,
      })),
      currentIndex: 0,
    });
  }

  /**
   * Get the next RPC URL using round-robin rotation.
   * Skips unhealthy endpoints unless all are unhealthy.
   */
  getNextRPC(chainId: ChainId): string {
    const pool = this.getPool(chainId);
    this.recoverEndpoints(pool);

    const healthyEndpoints = pool.endpoints.filter((e) => e.isHealthy);
    const candidates =
      healthyEndpoints.length > 0 ? healthyEndpoints : pool.endpoints;

    // Find the next candidate in round-robin order
    const startIndex = pool.currentIndex % pool.endpoints.length;
    let index = startIndex;

    do {
      const endpoint = pool.endpoints[index];
      if (candidates.includes(endpoint)) {
        pool.currentIndex = (index + 1) % pool.endpoints.length;
        return endpoint.url;
      }
      index = (index + 1) % pool.endpoints.length;
    } while (index !== startIndex);

    // Fallback: return current index endpoint
    pool.currentIndex = (pool.currentIndex + 1) % pool.endpoints.length;
    return pool.endpoints[startIndex].url;
  }

  /**
   * Get a random RPC URL from the healthy endpoints of a chain.
   */
  getRandomRPC(chainId: ChainId): string {
    const pool = this.getPool(chainId);
    this.recoverEndpoints(pool);

    const healthyEndpoints = pool.endpoints.filter((e) => e.isHealthy);
    const candidates =
      healthyEndpoints.length > 0 ? healthyEndpoints : pool.endpoints;

    const randomIndex = Math.floor(Math.random() * candidates.length);
    return candidates[randomIndex].url;
  }

  /**
   * Report a failure for a specific RPC endpoint.
   * After MAX_FAILURES consecutive failures, the endpoint is marked unhealthy.
   */
  reportFailure(chainId: ChainId, rpcUrl: string): void {
    const pool = this.getPool(chainId);
    const endpoint = pool.endpoints.find((e) => e.url === rpcUrl);
    if (!endpoint) return;

    endpoint.failures += 1;
    endpoint.lastFailure = Date.now();

    if (endpoint.failures >= MAX_FAILURES) {
      endpoint.isHealthy = false;
    }
  }

  /**
   * Report a successful request to an endpoint, resetting its failure count.
   */
  reportSuccess(chainId: ChainId, rpcUrl: string): void {
    const pool = this.getPool(chainId);
    const endpoint = pool.endpoints.find((e) => e.url === rpcUrl);
    if (!endpoint) return;

    endpoint.failures = 0;
    endpoint.isHealthy = true;
  }

  /**
   * Get all currently healthy RPC URLs for a chain.
   */
  getHealthyRPCs(chainId: ChainId): string[] {
    const pool = this.getPool(chainId);
    this.recoverEndpoints(pool);
    return pool.endpoints
      .filter((e) => e.isHealthy)
      .map((e) => e.url);
  }

  /**
   * Get all registered RPC URLs for a chain, including unhealthy ones.
   */
  getAllRPCs(chainId: ChainId): string[] {
    const pool = this.getPool(chainId);
    return pool.endpoints.map((e) => e.url);
  }

  /**
   * Check whether a pool has been initialized for a chain.
   */
  hasPool(chainId: ChainId): boolean {
    return this.pools.has(chainId);
  }

  /**
   * Remove the RPC pool for a chain.
   */
  removePool(chainId: ChainId): void {
    this.pools.delete(chainId);
  }

  // ── Private helpers ──────────────────────────────────────────

  private getPool(chainId: ChainId): RPCPool {
    const pool = this.pools.get(chainId);
    if (!pool) {
      throw new Error(
        `No RPC pool initialized for chain: ${chainId}. Call initializePool first.`,
      );
    }
    return pool;
  }

  /**
   * Re-enable endpoints that have been unhealthy longer than the cooldown.
   */
  private recoverEndpoints(pool: RPCPool): void {
    const now = Date.now();
    for (const endpoint of pool.endpoints) {
      if (
        !endpoint.isHealthy &&
        now - endpoint.lastFailure > FAILURE_COOLDOWN_MS
      ) {
        endpoint.isHealthy = true;
        endpoint.failures = 0;
      }
    }
  }
}
