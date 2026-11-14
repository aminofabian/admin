import { describe, expect, it } from 'vitest';
import { readCategory2V2Api } from '../game-api-settings';

describe('readCategory2V2Api', () => {
  it('reads the flag from the top-level payload', () => {
    expect(readCategory2V2Api({ category2_v2_api: true })).toBe(true);
    expect(readCategory2V2Api({ category2_v2_api: false })).toBe(false);
  });

  it('reads the flag from a data wrapper', () => {
    expect(readCategory2V2Api({ data: { category2_v2_api: false } })).toBe(false);
  });

  it('rejects a payload that does not include the flag', () => {
    expect(() => readCategory2V2Api({ status: 'success' })).toThrow(
      /category2_v2_api/,
    );
  });
});
