import type {
  DrawHistoryEntry,
  DrawType,
  DrawTypeStatus,
  LuckyDrawCompanySettings,
  LuckyDrawCycle,
  LuckyDrawGlobalSettings,
  LuckyDrawStatusResponse,
  ManualDrawInfo,
  RunDrawResponse,
} from '@/types/lucky-draw';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function buildCycle(
  id: number,
  drawType: DrawType,
  scheduledDrawAt: string,
  ticketCount: number,
  playerCount: number,
): LuckyDrawCycle {
  return {
    id,
    draw_type: drawType,
    status: 'active',
    started_at: new Date(
      Date.parse(scheduledDrawAt) - (drawType === 'weekly' ? WEEK_MS : MONTH_MS),
    ).toISOString(),
    scheduled_draw_at: scheduledDrawAt,
    ticket_count: ticketCount,
    player_count: playerCount,
  };
}

function manualDrawFor(
  drawType: DrawType,
  cycle: LuckyDrawCycle | null,
  global: LuckyDrawGlobalSettings,
  settings: LuckyDrawCompanySettings,
): ManualDrawInfo {
  const enabled = drawType === 'weekly' ? settings.weekly_enabled : settings.monthly_enabled;
  const minTickets =
    drawType === 'weekly' ? global.weekly_min_tickets : global.monthly_min_tickets;
  const minPlayers =
    drawType === 'weekly' ? global.weekly_min_players : global.monthly_min_players;
  const ticketCount = cycle?.ticket_count ?? 0;
  const playerCount = cycle?.player_count ?? 0;
  const ticketsMet = ticketCount >= minTickets;
  const playersMet = playerCount >= minPlayers;
  const block_reasons: string[] = [];

  if (!global.early_draw_enabled) block_reasons.push('early_draw_disabled');
  if (!enabled) block_reasons.push('draw_disabled');
  if (!cycle) block_reasons.push('no_active_cycle');
  if (!ticketsMet) block_reasons.push('min_tickets_not_met');
  if (!playersMet) block_reasons.push('min_players_not_met');

  return {
    eligible: block_reasons.length === 0,
    ticket_count: ticketCount,
    player_count: playerCount,
    min_tickets: minTickets,
    min_players: minPlayers,
    tickets_met: ticketsMet,
    players_met: playersMet,
    early_draw_globally_enabled: global.early_draw_enabled,
    block_reasons,
  };
}

function typeStatus(
  drawType: DrawType,
  cycle: LuckyDrawCycle | null,
  global: LuckyDrawGlobalSettings,
  settings: LuckyDrawCompanySettings,
): DrawTypeStatus {
  return {
    cycle: cycle ? structuredClone(cycle) : null,
    manual_draw: manualDrawFor(drawType, cycle, global, settings),
  };
}

type StoreState = {
  global: LuckyDrawGlobalSettings;
  settings: LuckyDrawCompanySettings;
  weekly: LuckyDrawCycle | null;
  monthly: LuckyDrawCycle | null;
  history: DrawHistoryEntry[];
  nextCycleId: number;
  nextWinnerId: number;
};

const globalForMock = globalThis as typeof globalThis & {
  __luckyDrawMockStoreV2?: StoreState;
};

function createInitialState(): StoreState {
  const settings: LuckyDrawCompanySettings = {
    weekly_enabled: true,
    monthly_enabled: true,
    weekly_winner_count: 3,
    monthly_winner_count: 5,
    weekly_prize_mode: 'equal',
    monthly_prize_mode: 'individual',
    weekly_prize_total: '500.00',
    monthly_prize_total: '0.00',
    weekly_prize_amounts: [],
    monthly_prize_amounts: ['1000.00', '500.00', '250.00', '100.00', '50.00'],
    allow_multiple_wins_same_player: false,
    prize_auto_credit: true,
    weekly_purchase_threshold: '50.00',
    weekly_tickets_per_threshold: 1,
    monthly_purchase_threshold: '100.00',
    monthly_tickets_per_threshold: 1,
  };

  const global: LuckyDrawGlobalSettings = {
    early_draw_enabled: true,
    weekly_min_tickets: 500,
    weekly_min_players: 50,
    monthly_min_tickets: 2000,
    monthly_min_players: 150,
  };

  return {
    global,
    settings,
    weekly: buildCycle(12, 'weekly', daysFromNow(3), 620, 78),
    monthly: buildCycle(13, 'monthly', daysFromNow(16), 1840, 132),
    history: [
      {
        id: 90,
        draw_type: 'weekly',
        status: 'completed',
        draw_method: 'automatic',
        started_at: daysFromNow(-14),
        completed_at: daysFromNow(-7),
        scheduled_draw_at: daysFromNow(-7),
        ticket_count: 540,
        player_count: 61,
        prize_status: 'credited',
        winners: [
          {
            id: 901,
            position: 1,
            player_id: 1001,
            player_username: 'lucky_player',
            prize_amount: '166.67',
            prize_status: 'credited',
          },
          {
            id: 902,
            position: 2,
            player_id: 1002,
            player_username: 'spin_queen',
            prize_amount: '166.67',
            prize_status: 'credited',
          },
          {
            id: 903,
            position: 3,
            player_id: 1003,
            player_username: 'goldrush',
            prize_amount: '166.66',
            prize_status: 'credited',
          },
        ],
      },
    ],
    nextCycleId: 14,
    nextWinnerId: 1000,
  };
}

function getStore(): StoreState {
  if (!globalForMock.__luckyDrawMockStoreV2) {
    globalForMock.__luckyDrawMockStoreV2 = createInitialState();
  }
  return globalForMock.__luckyDrawMockStoreV2;
}

export const luckyDrawMock = {
  getGlobalSettings(): LuckyDrawGlobalSettings {
    return { ...getStore().global };
  },

  patchGlobalSettings(patch: Partial<LuckyDrawGlobalSettings>): LuckyDrawGlobalSettings {
    const store = getStore();
    store.global = { ...store.global, ...patch };
    return { ...store.global };
  },

  getSettings(): LuckyDrawCompanySettings {
    return structuredClone(getStore().settings);
  },

  patchSettings(patch: Partial<LuckyDrawCompanySettings>): LuckyDrawCompanySettings {
    const store = getStore();
    store.settings = { ...store.settings, ...patch };
    return structuredClone(store.settings);
  },

  getStatus(): LuckyDrawStatusResponse {
    const store = getStore();
    return {
      settings: structuredClone(store.settings),
      global: { ...store.global },
      weekly: typeStatus('weekly', store.weekly, store.global, store.settings),
      monthly: typeStatus('monthly', store.monthly, store.global, store.settings),
    };
  },

  listHistory(opts?: { drawType?: DrawType; limit?: number }): DrawHistoryEntry[] {
    let rows = structuredClone(getStore().history);
    if (opts?.drawType) {
      rows = rows.filter((r) => r.draw_type === opts.drawType);
    }
    if (opts?.limit != null) {
      rows = rows.slice(0, opts.limit);
    }
    return rows;
  },

  getHistoryDetail(cycleId: number): DrawHistoryEntry | null {
    const entry = getStore().history.find((h) => h.id === cycleId);
    return entry ? structuredClone(entry) : null;
  },

  creditWinner(winnerId: number): { id: number; prize_status: 'credited' } | { error: string; code: string; status: number } {
    const store = getStore();
    for (const entry of store.history) {
      const winner = entry.winners.find((w) => w.id === winnerId);
      if (!winner) continue;
      if (winner.prize_status !== 'pending') {
        return { error: 'Prize is not pending', code: 'prize_not_pending', status: 400 };
      }
      winner.prize_status = 'credited';
      if (entry.winners.every((w) => w.prize_status === 'credited')) {
        entry.prize_status = 'credited';
      }
      return { id: winnerId, prize_status: 'credited' };
    }
    return { error: 'Winner not found', code: 'not_found', status: 404 };
  },

  runDraw(drawType: DrawType): RunDrawResponse | { error: string; code: string; status: number } {
    const store = getStore();
    const cycle = drawType === 'weekly' ? store.weekly : store.monthly;
    const status = typeStatus(drawType, cycle, store.global, store.settings);

    if (!status.manual_draw.eligible) {
      return {
        error: 'Manual draw thresholds not met',
        code: 'manual_thresholds_not_met',
        status: 409,
      };
    }
    if (!cycle) {
      return { error: 'No active cycle', code: 'no_active_cycle', status: 400 };
    }
    if (cycle.ticket_count <= 0) {
      return { error: 'No eligible tickets', code: 'no_eligible_tickets', status: 400 };
    }

    const winnerCount =
      drawType === 'weekly'
        ? store.settings.weekly_winner_count
        : store.settings.monthly_winner_count;
    const prizeMode =
      drawType === 'weekly'
        ? store.settings.weekly_prize_mode
        : store.settings.monthly_prize_mode;
    const prizeTotal =
      drawType === 'weekly'
        ? store.settings.weekly_prize_total
        : store.settings.monthly_prize_total;
    const prizeAmounts =
      drawType === 'weekly'
        ? store.settings.weekly_prize_amounts
        : store.settings.monthly_prize_amounts;

    if (prizeMode === 'individual' && prizeAmounts.length !== winnerCount) {
      return {
        error: 'Prize amounts length must match winner count',
        code: 'invalid_prize_amounts',
        status: 400,
      };
    }

    const equalShare =
      prizeMode === 'equal'
        ? (Number(prizeTotal) / Math.max(1, winnerCount)).toFixed(2)
        : '0.00';
    const autoCredit = store.settings.prize_auto_credit;
    const now = new Date();

    const winners = Array.from({ length: winnerCount }, (_, i) => ({
      id: store.nextWinnerId++,
      position: i + 1,
      player_id: 2000 + i,
      player_username: `winner_${i + 1}`,
      prize_amount: prizeMode === 'individual' ? prizeAmounts[i] ?? '0.00' : equalShare,
      prize_status: (autoCredit ? 'credited' : 'pending') as 'credited' | 'pending',
    }));

    const completed: DrawHistoryEntry = {
      id: cycle.id,
      draw_type: drawType,
      status: 'completed',
      draw_method: 'manual',
      started_at: cycle.started_at,
      completed_at: now.toISOString(),
      scheduled_draw_at: cycle.scheduled_draw_at,
      ticket_count: cycle.ticket_count,
      player_count: cycle.player_count,
      prize_status: autoCredit ? 'credited' : 'pending',
      winners,
    };
    store.history.unshift(completed);

    const nextScheduled = new Date(
      now.getTime() + (drawType === 'weekly' ? WEEK_MS : MONTH_MS),
    ).toISOString();
    const next = buildCycle(store.nextCycleId++, drawType, nextScheduled, 0, 0);
    next.started_at = now.toISOString();

    if (drawType === 'weekly') store.weekly = next;
    else store.monthly = next;

    return {
      cycle: structuredClone(completed),
      next_cycle: structuredClone(next),
      winners: structuredClone(winners),
    };
  },
};
