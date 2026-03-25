// ===================================================================
// NEXORA VAULT -- Error Classes
// Typed error hierarchy for structured error handling
// ===================================================================

/**
 * Base error class for all Gravytos errors.
 */
export class GravytosError extends Error {
  /** Machine-readable error code */
  readonly code: string;

  constructor(message: string, code = 'NEXORA_ERROR') {
    super(message);
    this.name = 'GravytosError';
    this.code = code;
    // Restore prototype chain (required for extending built-ins in TS)
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

/**
 * Thrown when a wallet or account has insufficient balance
 * to cover the transaction amount plus fees.
 */
export class InsufficientBalanceError extends GravytosError {
  readonly required: string;
  readonly available: string;
  readonly tokenSymbol: string;

  constructor(required: string, available: string, tokenSymbol: string) {
    super(
      `Insufficient ${tokenSymbol} balance: required ${required}, available ${available}`,
      'INSUFFICIENT_BALANCE',
    );
    this.name = 'InsufficientBalanceError';
    this.required = required;
    this.available = available;
    this.tokenSymbol = tokenSymbol;
  }
}

/**
 * Thrown when a transaction is rejected by the user, the network,
 * or fails validation.
 */
export class TransactionRejectedError extends GravytosError {
  readonly txHash?: string;
  readonly reason: string;

  constructor(reason: string, txHash?: string) {
    super(`Transaction rejected: ${reason}`, 'TRANSACTION_REJECTED');
    this.name = 'TransactionRejectedError';
    this.reason = reason;
    this.txHash = txHash;
  }
}

/**
 * Thrown when an RPC request fails (network error, rate limit, bad response).
 */
export class RPCError extends GravytosError {
  readonly rpcUrl: string;
  readonly statusCode?: number;

  constructor(message: string, rpcUrl: string, statusCode?: number) {
    super(`RPC error (${rpcUrl}): ${message}`, 'RPC_ERROR');
    this.name = 'RPCError';
    this.rpcUrl = rpcUrl;
    this.statusCode = statusCode;
  }
}

/**
 * Thrown when a privacy constraint cannot be satisfied.
 * For example, when a CoinJoin round cannot be formed or
 * stealth address generation fails.
 */
export class PrivacyConstraintError extends GravytosError {
  readonly constraint: string;

  constructor(constraint: string, message: string) {
    super(
      `Privacy constraint '${constraint}' not met: ${message}`,
      'PRIVACY_CONSTRAINT',
    );
    this.name = 'PrivacyConstraintError';
    this.constraint = constraint;
  }
}

/**
 * Thrown when an operation is attempted on a chain that is not
 * supported or not configured.
 */
export class ChainNotSupportedError extends GravytosError {
  readonly chainId: string;

  constructor(chainId: string) {
    super(`Chain not supported: ${chainId}`, 'CHAIN_NOT_SUPPORTED');
    this.name = 'ChainNotSupportedError';
    this.chainId = chainId;
  }
}
