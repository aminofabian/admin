import { describe, expect, it } from 'vitest';
import {
  buildPlayerDetailHref,
  buildPlayerListFilterSearchParams,
  buildPlayersListHref,
  extractPlayerListFilterSearchParams,
  playerListApiParamsFromSearchParams,
  playerListFilterStateFromSearchParams,
} from '../player-list-filter-params';

describe('player-list-filter-params', () => {
  it('serializes only active filter values', () => {
    const params = buildPlayerListFilterSearchParams({
      username: 'john',
      full_name: '',
      email: '  ',
      referred_by: '',
      agent: 'agent1',
      date_from: '2024-01-01',
      date_to: '',
      status: 'all',
      state: 'TX',
      identity_verification_status: 'approved',
      first_deposit_done: 'true',
      company: 'all',
    });

    expect(Object.fromEntries(params.entries())).toEqual({
      username: 'john',
      agent: 'agent1',
      date_from: '2024-01-01',
      state: 'TX',
      identity_verification_status: 'approved',
      first_deposit_done: 'true',
    });
  });

  it('builds player detail href with filter query', () => {
    expect(
      buildPlayerDetailHref(42, {
        username: 'john',
        status: 'active',
      }),
    ).toBe('/dashboard/players/42?username=john&status=active');

    expect(buildPlayerDetailHref(42)).toBe('/dashboard/players/42');
  });

  it('extracts whitelist params and maps them to API params', () => {
    const search = new URLSearchParams({
      username: 'john',
      first_deposit_done: 'true',
      company: '7',
      unrelated: 'ignore-me',
      status: 'all',
    });

    const extracted = extractPlayerListFilterSearchParams(search);
    expect(extracted.get('username')).toBe('john');
    expect(extracted.get('first_deposit_done')).toBe('true');
    expect(extracted.get('company')).toBe('7');
    expect(extracted.get('unrelated')).toBeNull();
    expect(extracted.get('status')).toBeNull();

    expect(playerListApiParamsFromSearchParams(search)).toEqual({
      username: 'john',
      first_deposit_done: true,
      company_id: 7,
    });
  });

  it('builds players list href from detail search params', () => {
    const search = new URLSearchParams({
      agent: 'bob',
      foo: 'bar',
    });
    expect(buildPlayersListHref(search)).toBe('/dashboard/players?agent=bob');
  });

  it('hydrates filter state from search params', () => {
    const search = new URLSearchParams({
      username: 'john',
      state: 'TX',
      company: '12',
    });
    expect(playerListFilterStateFromSearchParams(search)).toMatchObject({
      username: 'john',
      state: 'TX',
      company: '12',
      status: 'all',
      first_deposit_done: 'all',
    });
  });
});
