import { create } from 'zustand';
import { luckyDrawApi } from '@/lib/api';
import type {
  DrawHistoryEntry,
  DrawType,
  LuckyDrawCompanySettings,
  LuckyDrawGlobalSettings,
  LuckyDrawStatusResponse,
} from '@/types/lucky-draw';

type LuckyDrawState = {
  settings: LuckyDrawCompanySettings | null;
  global: LuckyDrawGlobalSettings | null;
  status: LuckyDrawStatusResponse | null;
  history: DrawHistoryEntry[];
  historyDetail: DrawHistoryEntry | null;
  isLoading: boolean;
  error: string | null;
  companyId: number | null;
  setCompanyId: (id: number | null) => void;
  fetchStatus: () => Promise<void>;
  fetchGlobalSettings: () => Promise<void>;
  fetchHistory: (opts?: { drawType?: DrawType; limit?: number }) => Promise<void>;
  fetchHistoryDetail: (cycleId: number) => Promise<void>;
  saveSettings: (
    patch: Partial<LuckyDrawCompanySettings>,
  ) => Promise<LuckyDrawCompanySettings>;
  saveGlobalSettings: (
    patch: Partial<LuckyDrawGlobalSettings>,
  ) => Promise<LuckyDrawGlobalSettings>;
  runDraw: (drawType: DrawType) => Promise<void>;
  creditWinner: (winnerId: number) => Promise<void>;
};

export const useLuckyDrawStore = create<LuckyDrawState>((set, get) => ({
  settings: null,
  global: null,
  status: null,
  history: [],
  historyDetail: null,
  isLoading: false,
  error: null,
  companyId: null,

  setCompanyId: (id) => set({ companyId: id }),

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await luckyDrawApi.getStatus(get().companyId);
      set({
        status,
        settings: status.settings,
        global: status.global,
        isLoading: false,
      });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load lucky draw status',
      });
    }
  },

  fetchGlobalSettings: async () => {
    set({ isLoading: true, error: null });
    try {
      const global = await luckyDrawApi.getGlobalSettings();
      set({ global, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load global settings',
      });
    }
  },

  fetchHistory: async (opts) => {
    set({ isLoading: true, error: null });
    try {
      const history = await luckyDrawApi.listHistory({
        ...opts,
        companyId: get().companyId,
      });
      set({ history, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load history',
      });
    }
  },

  fetchHistoryDetail: async (cycleId) => {
    try {
      const historyDetail = await luckyDrawApi.getHistoryDetail(cycleId, get().companyId);
      set({ historyDetail });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to load draw detail',
      });
    }
  },

  saveSettings: async (patch) => {
    const settings = await luckyDrawApi.patchSettings(patch, get().companyId);
    set({ settings });
    await get().fetchStatus();
    return settings;
  },

  saveGlobalSettings: async (patch) => {
    const global = await luckyDrawApi.patchGlobalSettings(patch);
    set({ global });
    return global;
  },

  runDraw: async (drawType) => {
    await luckyDrawApi.runDraw(drawType, get().companyId);
    await Promise.all([get().fetchStatus(), get().fetchHistory({ limit: 20 })]);
  },

  creditWinner: async (winnerId) => {
    await luckyDrawApi.creditWinner(winnerId, get().companyId);
    await get().fetchHistory({ limit: 20 });
    const detail = get().historyDetail;
    if (detail) {
      await get().fetchHistoryDetail(detail.id);
    }
  },
}));
