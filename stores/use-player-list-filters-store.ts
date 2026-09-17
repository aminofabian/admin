import { create } from 'zustand';
import type { PlayerListFilterValues } from '@/lib/players/player-list-filter-params';

/**
 * Survives list → detail → back soft navigations where the list URL may be
 * empty even though the operator still expects their last applied filters.
 */
export const EMPTY_PLAYER_LIST_FILTERS: Required<
  Pick<
    PlayerListFilterValues,
    | 'username'
    | 'full_name'
    | 'email'
    | 'referred_by'
    | 'agent'
    | 'date_from'
    | 'date_to'
    | 'status'
    | 'state'
    | 'identity_verification_status'
    | 'first_deposit_done'
    | 'company'
  >
> = {
  username: '',
  full_name: '',
  email: '',
  referred_by: '',
  agent: '',
  date_from: '',
  date_to: '',
  status: 'all',
  state: 'all',
  identity_verification_status: 'all',
  first_deposit_done: 'all',
  company: 'all',
};

interface PlayerListFiltersStore {
  appliedFilters: typeof EMPTY_PLAYER_LIST_FILTERS;
  setAppliedFilters: (filters: PlayerListFilterValues) => void;
  clearAppliedFilters: () => void;
}

export const usePlayerListFiltersStore = create<PlayerListFiltersStore>((set) => ({
  appliedFilters: { ...EMPTY_PLAYER_LIST_FILTERS },
  setAppliedFilters: (filters) =>
    set({
      appliedFilters: {
        ...EMPTY_PLAYER_LIST_FILTERS,
        ...filters,
      },
    }),
  clearAppliedFilters: () => set({ appliedFilters: { ...EMPTY_PLAYER_LIST_FILTERS } }),
}));
