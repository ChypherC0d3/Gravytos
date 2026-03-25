// ===================================================================
// NEXORA VAULT -- CoinJoin Module Barrel Exports
// ===================================================================

export {
  CoinJoinRoundStatus,
  DEFAULT_COINJOIN_CONFIG,
} from './types';

export type {
  CoinJoinRound,
  CoinJoinParticipant,
  CoinJoinInput,
  CoinJoinOutput,
  CoinJoinProof,
  CoinJoinConfig,
} from './types';

export { CoinJoinCoordinator } from './coordinator';
export { CoinJoinParticipant as CoinJoinParticipantClient } from './participant';
