import { apiClient } from './client';
import type {
  DrawHistoryEntry,
  DrawType,
  LuckyDrawCompanySettings,
  LuckyDrawGlobalSettings,
  LuckyDrawStatusResponse,
  RunDrawResponse,
} from '@/types/lucky-draw';

type Envelope<T> = {
  status?: string;
  data?: T;
  message?: string;
  code?: string;
};

function unwrap<T>(response: Envelope<T> | T): T {
  if (response && typeof response === 'object' && 'data' in response && response.data !== undefined) {
    return response.data;
  }
  return response as T;
}

function withCompanyQuery(path: string, companyId?: number | null): string {
  if (companyId == null) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}company_id=${companyId}`;
}

export const luckyDrawApi = {
  getGlobalSettings: async () =>
    unwrap(
      await apiClient.get<Envelope<LuckyDrawGlobalSettings>>(
        'api/admin/lucky-draw/global-settings',
      ),
    ),

  patchGlobalSettings: async (data: Partial<LuckyDrawGlobalSettings>) =>
    unwrap(
      await apiClient.patch<Envelope<LuckyDrawGlobalSettings>>(
        'api/admin/lucky-draw/global-settings',
        data,
      ),
    ),

  getSettings: async (companyId?: number | null) =>
    unwrap(
      await apiClient.get<Envelope<LuckyDrawCompanySettings>>(
        withCompanyQuery('api/admin/lucky-draw/settings', companyId),
      ),
    ),

  patchSettings: async (
    data: Partial<LuckyDrawCompanySettings> & { company_id?: number },
    companyId?: number | null,
  ) => {
    const body =
      companyId != null && data.company_id == null
        ? { ...data, company_id: companyId }
        : data;
    return unwrap(
      await apiClient.patch<Envelope<LuckyDrawCompanySettings>>(
        withCompanyQuery('api/admin/lucky-draw/settings', companyId),
        body,
      ),
    );
  },

  getStatus: async (companyId?: number | null) =>
    unwrap(
      await apiClient.get<Envelope<LuckyDrawStatusResponse>>(
        withCompanyQuery('api/admin/lucky-draw/status', companyId),
      ),
    ),

  runDraw: async (drawType: DrawType, companyId?: number | null) =>
    unwrap(
      await apiClient.post<Envelope<RunDrawResponse>>(
        withCompanyQuery('api/admin/lucky-draw/run', companyId),
        { draw_type: drawType, ...(companyId != null ? { company_id: companyId } : {}) },
      ),
    ),

  listHistory: async (opts?: {
    drawType?: DrawType;
    limit?: number;
    companyId?: number | null;
  }) => {
    const params = new URLSearchParams();
    if (opts?.drawType) params.set('draw_type', opts.drawType);
    if (opts?.limit != null) params.set('limit', String(opts.limit));
    if (opts?.companyId != null) params.set('company_id', String(opts.companyId));
    const qs = params.toString();
    return unwrap(
      await apiClient.get<Envelope<DrawHistoryEntry[]>>(
        `api/admin/lucky-draw/history${qs ? `?${qs}` : ''}`,
      ),
    );
  },

  getHistoryDetail: async (cycleId: number, companyId?: number | null) =>
    unwrap(
      await apiClient.get<Envelope<DrawHistoryEntry>>(
        withCompanyQuery(`api/admin/lucky-draw/history/${cycleId}`, companyId),
      ),
    ),

  creditWinner: async (winnerId: number, companyId?: number | null) =>
    unwrap(
      await apiClient.post<Envelope<DrawWinnerCreditResponse>>(
        withCompanyQuery(`api/admin/lucky-draw/winners/${winnerId}/credit`, companyId),
        {},
      ),
    ),
};

type DrawWinnerCreditResponse = {
  id: number;
  prize_status: 'credited';
};
