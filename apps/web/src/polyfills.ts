// Node.js polyfills for crypto libraries running in browser
// Must be imported BEFORE any other modules
import { Buffer } from 'buffer';

globalThis.Buffer = Buffer;

if (typeof globalThis.process === 'undefined') {
  // @ts-expect-error - minimal process shim for Node.js libraries
  globalThis.process = { env: {}, browser: true, version: 'v20.0.0', nextTick: (fn: () => void) => setTimeout(fn, 0) };
}

if (typeof globalThis.global === 'undefined') {
  globalThis.global = globalThis;
}
