import { describe, expect, it } from 'vitest';
import {
  buildPlayerDetailHref,
  buildPlayerListFilterSearchParams,
  buildPlayersListHref,
  extractPlayerListFilterSearchParams,
  playerListApiParamsFromSearchParams,
  playerListFilterStateFromSearchParams,
  playerListFiltersHaveActiveValues,
  resolvePlayerDetailBackHref,
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

  it('resolves back href to chat when from=chat', () => {
    const search = new URLSearchParams({
      from: 'chat',
      username: 'ignored-for-chat',
    });
    expect(resolvePlayerDetailBackHref(42, search)).toBe('/dashboard/chat?playerId=42');
  });

  it('resolves back href to filtered players list otherwise', () => {
    const search = new URLSearchParams({
      agent: 'bob',
      from: 'elsewhere',
    });
    expect(resolvePlayerDetailBackHref(42, search)).toBe('/dashboard/players?agent=bob');
    expect(resolvePlayerDetailBackHref(42)).toBe('/dashboard/players');
  });

  it('resolves back href from fallback filters when detail URL has none', () => {
    const search = new URLSearchParams({ from: 'elsewhere' });
    expect(
      resolvePlayerDetailBackHref(42, search, {
        username: 'john',
        status: 'active',
      }),
    ).toBe('/dashboard/players?username=john&status=active');
  });

  it('detects active filter values', () => {
    expect(playerListFiltersHaveActiveValues({ username: 'john' })).toBe(true);
    expect(playerListFiltersHaveActiveValues({ status: 'all' })).toBe(false);
  });
});
