import { useCallback, useRef } from 'react';

/**
 * Provides a secure way to temporarily hold seed data in memory.
 * Automatically zeroes the array when released.
 */
export function useSecureSeed() {
  const seedRef = useRef<Uint8Array | null>(null);

  const holdSeed = useCallback((seed: Uint8Array) => {
    // Release any existing seed first
    if (seedRef.current) {
      seedRef.current.fill(0);
    }
    // Store a copy (don't hold reference to original)
    seedRef.current = new Uint8Array(seed);
  }, []);

  const getSeed = useCallback((): Uint8Array | null => {
    return seedRef.current;
  }, []);

  const releaseSeed = useCallback(() => {
    if (seedRef.current) {
      // Zero out the bytes
      seedRef.current.fill(0);
      seedRef.current = null;
    }
  }, []);

  return { holdSeed, getSeed, releaseSeed };
}
