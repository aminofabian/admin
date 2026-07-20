import { create } from 'zustand';
import { referralPromoCodesApi } from '@/lib/api/referral-promo-codes';
import type {
  CreateReferralPromoCodeRequest,
  ReferralPromoCode,
  UpdateReferralPromoCodeRequest,
} from '@/types';

interface ReferralPromoCodesState {
  promoCodes: ReferralPromoCode[];
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
}

interface ReferralPromoCodesActions {
  fetchPromoCodes: () => Promise<void>;
  createPromoCode: (payload: CreateReferralPromoCodeRequest) => Promise<ReferralPromoCode>;
  updatePromoCode: (
    id: number,
    payload: UpdateReferralPromoCodeRequest,
  ) => Promise<ReferralPromoCode>;
  setPromoCodeActive: (id: number, isActive: boolean) => Promise<ReferralPromoCode>;
  deletePromoCode: (id: number) => Promise<void>;
  reset: () => void;
}

type Store = ReferralPromoCodesState & ReferralPromoCodesActions;

const initialState: ReferralPromoCodesState = {
  promoCodes: [],
  isLoading: false,
  isSaving: false,
  error: null,
};

function parseErrorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'detail' in err) {
    return String((err as { detail: unknown }).detail);
  }
  if (err && typeof err === 'object' && 'message' in err) {
    return String((err as { message: unknown }).message);
  }
  if (err instanceof Error) return err.message;
  return fallback;
}

function sortPromoCodes(codes: ReferralPromoCode[]): ReferralPromoCode[] {
  return [...codes].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return a.code.localeCompare(b.code);
  });
}

export const useReferralPromoCodesStore = create<Store>((set, get) => ({
  ...initialState,

  fetchPromoCodes: async () => {
    set({ isLoading: true, error: null });
    try {
      const promoCodes = sortPromoCodes(await referralPromoCodesApi.list());
      set({ promoCodes, isLoading: false, error: null });
    } catch (err: unknown) {
      set({
        isLoading: false,
        error: parseErrorMessage(err, 'Failed to load promo codes'),
      });
    }
  },

  createPromoCode: async (payload) => {
    set({ isSaving: true, error: null });
    try {
      const created = await referralPromoCodesApi.create(payload);
      set({
        promoCodes: sortPromoCodes([
          created,
          ...get().promoCodes.filter((c) => c.id !== created.id),
        ]),
        isSaving: false,
        error: null,
      });
      return created;
    } catch (err: unknown) {
      const message = parseErrorMessage(err, 'Failed to create promo code');
      set({ isSaving: false, error: message });
      throw new Error(message);
    }
  },

  updatePromoCode: async (id, payload) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await referralPromoCodesApi.update(id, payload);
      set({
        promoCodes: sortPromoCodes(
          get().promoCodes.map((c) => (c.id === id ? updated : c)),
        ),
        isSaving: false,
        error: null,
      });
      return updated;
    } catch (err: unknown) {
      const message = parseErrorMessage(err, 'Failed to update promo code');
      set({ isSaving: false, error: message });
      throw new Error(message);
    }
  },

  setPromoCodeActive: async (id, isActive) => {
    set({ isSaving: true, error: null });
    try {
      const updated = await referralPromoCodesApi.setActive(id, isActive);
      set({
        promoCodes: sortPromoCodes(
          get().promoCodes.map((c) => (c.id === id ? updated : c)),
        ),
        isSaving: false,
        error: null,
      });
      return updated;
    } catch (err: unknown) {
      const message = parseErrorMessage(
        err,
        isActive ? 'Failed to reactivate promo code' : 'Failed to deactivate promo code',
      );
      set({ isSaving: false, error: message });
      throw new Error(message);
    }
  },

  deletePromoCode: async (id) => {
    set({ isSaving: true, error: null });
    try {
      await referralPromoCodesApi.delete(id);
      set({
        promoCodes: get().promoCodes.filter((c) => c.id !== id),
        isSaving: false,
        error: null,
      });
    } catch (err: unknown) {
      const message = parseErrorMessage(err, 'Failed to delete promo code');
      set({ isSaving: false, error: message });
      throw new Error(message);
    }
  },

  reset: () => set(initialState),
}));
