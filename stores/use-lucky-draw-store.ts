import { create } from 'zustand';
import { luckyDrawApi } from '@/lib/api';
import type {
  ActiveCyclesResponse,
  CreateTicketEarningRuleRequest,
  DrawHistoryEntry,
  LuckyDrawCompanyConfig,
  ManualDrawThresholds,
  TicketEarningRule,
} from '@/types/lucky-draw';

type LuckyDrawState = {
  config: LuckyDrawCompanyConfig | null;
  thresholds: ManualDrawThresholds | null;
  rules: TicketEarningRule[];
  active: ActiveCyclesResponse | null;
  history: DrawHistoryEntry[];
  isLoading: boolean;
  error: string | null;
  fetchAllCompany: () => Promise<void>;
  fetchThresholds: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  saveConfig: (patch: Partial<LuckyDrawCompanyConfig>) => Promise<LuckyDrawCompanyConfig>;
  saveThresholds: (patch: Partial<ManualDrawThresholds>) => Promise<ManualDrawThresholds>;
  createRule: (body: CreateTicketEarningRuleRequest) => Promise<void>;
  patchRule: (id: number, body: Partial<CreateTicketEarningRuleRequest>) => Promise<void>;
  deleteRule: (id: number) => Promise<void>;
  runManual: (cycleId: number) => Promise<void>;
};

export const useLuckyDrawStore = create<LuckyDrawState>((set, get) => ({
  config: null,
  thresholds: null,
  rules: [],
  active: null,
  history: [],
  isLoading: false,
  error: null,

  fetchAllCompany: async () => {
    set({ isLoading: true, error: null });
    try {
      const [config, rules, active] = await Promise.all([
        luckyDrawApi.getConfig(),
        luckyDrawApi.listRules(),
        luckyDrawApi.getActiveCycles(),
      ]);
      set({ config, rules, active, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load lucky draw',
      });
    }
  },

  fetchThresholds: async () => {
    set({ isLoading: true, error: null });
    try {
      const thresholds = await luckyDrawApi.getThresholds();
      set({ thresholds, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load thresholds',
      });
    }
  },

  fetchHistory: async () => {
    set({ isLoading: true, error: null });
    try {
      const history = await luckyDrawApi.listHistory();
      set({ history, isLoading: false });
    } catch (err) {
      set({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to load history',
      });
    }
  },

  saveConfig: async (patch) => {
    const config = await luckyDrawApi.patchConfig(patch);
    set({ config });
    await get().fetchAllCompany();
    return config;
  },

  saveThresholds: async (patch) => {
    const thresholds = await luckyDrawApi.patchThresholds(patch);
    set({ thresholds });
    return thresholds;
  },

  createRule: async (body) => {
    await luckyDrawApi.createRule(body);
    await get().fetchAllCompany();
  },

  patchRule: async (id, body) => {
    await luckyDrawApi.patchRule(id, body);
    await get().fetchAllCompany();
  },

  deleteRule: async (id) => {
    await luckyDrawApi.deleteRule(id);
    await get().fetchAllCompany();
  },

  runManual: async (cycleId) => {
    await luckyDrawApi.runManual(cycleId);
    await Promise.all([get().fetchAllCompany(), get().fetchHistory()]);
  },
}));
