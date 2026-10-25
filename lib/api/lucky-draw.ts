import { apiClient } from './client';
import type {
  ActiveCyclesResponse,
  CreateTicketEarningRuleRequest,
  DrawHistoryEntry,
  LuckyDrawCompanyConfig,
  ManualDrawThresholds,
  RunManualDrawResponse,
  TicketEarningRule,
} from '@/types/lucky-draw';

type Envelope<T> = { status?: string; data?: T; message?: string };

function unwrap<T>(response: Envelope<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data;
  }
  return response as T;
}

export const luckyDrawApi = {
  getConfig: async () =>
    unwrap(await apiClient.get<Envelope<LuckyDrawCompanyConfig>>('api/admin/lucky-draw/config')),

  patchConfig: async (data: Partial<LuckyDrawCompanyConfig>) =>
    unwrap(
      await apiClient.patch<Envelope<LuckyDrawCompanyConfig>>('api/admin/lucky-draw/config', data),
    ),

  getThresholds: async () =>
    unwrap(
      await apiClient.get<Envelope<ManualDrawThresholds>>('api/admin/lucky-draw/manual-thresholds'),
    ),

  patchThresholds: async (data: Partial<ManualDrawThresholds>) =>
    unwrap(
      await apiClient.patch<Envelope<ManualDrawThresholds>>(
        'api/admin/lucky-draw/manual-thresholds',
        data,
      ),
    ),

  listRules: async () =>
    unwrap(await apiClient.get<Envelope<TicketEarningRule[]>>('api/admin/lucky-draw/earning-rules')),

  createRule: async (data: CreateTicketEarningRuleRequest) =>
    unwrap(
      await apiClient.post<Envelope<TicketEarningRule>>('api/admin/lucky-draw/earning-rules', data),
    ),

  patchRule: async (id: number, data: Partial<CreateTicketEarningRuleRequest>) =>
    unwrap(
      await apiClient.patch<Envelope<TicketEarningRule>>(
        `api/admin/lucky-draw/earning-rules/${id}`,
        data,
      ),
    ),

  deleteRule: async (id: number) =>
    unwrap(await apiClient.delete<Envelope<{ deleted: boolean }>>(`api/admin/lucky-draw/earning-rules/${id}`)),

  getActiveCycles: async () =>
    unwrap(
      await apiClient.get<Envelope<ActiveCyclesResponse>>('api/admin/lucky-draw/cycles/active'),
    ),

  listHistory: async () =>
    unwrap(
      await apiClient.get<Envelope<DrawHistoryEntry[]>>('api/admin/lucky-draw/cycles/history'),
    ),

  runManual: async (cycleId: number) =>
    unwrap(
      await apiClient.post<Envelope<RunManualDrawResponse>>(
        `api/admin/lucky-draw/cycles/${cycleId}/run-manual`,
        {},
      ),
    ),
};
