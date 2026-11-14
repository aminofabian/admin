export const GAME_API_VERSIONS = {
  V1: 'v1',
  V2: 'v2',
} as const;

export type GameApiVersion = (typeof GAME_API_VERSIONS)[keyof typeof GAME_API_VERSIONS];

export interface GameApiVersionOption {
  version: GameApiVersion;
  label: string;
  role: string;
  summary: string;
}

export const GAME_API_VERSION_OPTIONS: readonly GameApiVersionOption[] = [
  {
    version: GAME_API_VERSIONS.V1,
    label: 'API v1',
    role: 'Fallback',
    summary: 'Use while v2 is down or under maintenance.',
  },
  {
    version: GAME_API_VERSIONS.V2,
    label: 'API v2',
    role: 'Primary',
    summary: 'Normal setting when v2 is healthy.',
  },
];

export function toGameApiVersion(useV2: boolean): GameApiVersion {
  return useV2 ? GAME_API_VERSIONS.V2 : GAME_API_VERSIONS.V1;
}
