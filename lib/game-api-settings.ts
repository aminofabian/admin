/**
 * Read `category2_v2_api` from a game-api-settings payload.
 * Accepts the flag at the top level or under a `data` wrapper.
 */
export function readCategory2V2Api(data: unknown): boolean {
  const value = findCategory2V2Api(data);
  if (typeof value !== 'boolean') {
    throw new Error('Game API settings response is missing category2_v2_api');
  }
  return value;
}

function findCategory2V2Api(data: unknown): unknown {
  if (!data || typeof data !== 'object') return undefined;
  const record = data as Record<string, unknown>;
  if ('category2_v2_api' in record) return record.category2_v2_api;
  if (record.data && typeof record.data === 'object') {
    const nested = record.data as Record<string, unknown>;
    if ('category2_v2_api' in nested) return nested.category2_v2_api;
  }
  return undefined;
}
