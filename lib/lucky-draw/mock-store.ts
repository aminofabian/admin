import type {
  ActiveCyclesResponse,
  ActiveDrawCycle,
  CreateTicketEarningRuleRequest,
  DrawHistoryEntry,
  DrawType,
  LuckyDrawCompanyConfig,
  ManualDrawEligibility,
  ManualDrawThresholds,
  RunManualDrawResponse,
  TicketEarningRule,
} from '@/types/lucky-draw';

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function daysFromNow(days: number): string {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
}

function buildCycle(
  id: number,
  drawType: DrawType,
  scheduledAt: string,
  ticketCount: number,
  uniquePlayers: number,
  config: LuckyDrawCompanyConfig,
): ActiveDrawCycle {
  const typeConfig = config[drawType];
  return {
    id,
    draw_type: drawType,
    ticket_type: drawType === 'weekly' ? 'silver' : 'gold',
    status: 'active',
    started_at: new Date(Date.parse(scheduledAt) - (drawType === 'weekly' ? WEEK_MS : MONTH_MS)).toISOString(),
    scheduled_at: scheduledAt,
    ticket_count: ticketCount,
    unique_player_count: uniquePlayers,
    winner_count: typeConfig.winner_count,
    prize_distribution: typeConfig.prize_distribution,
    prize_amount: typeConfig.prize_amount,
    prize_amounts_by_position: [...typeConfig.prize_amounts_by_position],
  };
}

function eligibilityFor(
  drawType: DrawType,
  cycle: ActiveDrawCycle | null,
  thresholds: ManualDrawThresholds,
): ManualDrawEligibility {
  const minTickets =
    drawType === 'weekly' ? thresholds.weekly_min_tickets : thresholds.monthly_min_tickets;
  const minPlayers =
    drawType === 'weekly' ? thresholds.weekly_min_players : thresholds.monthly_min_players;
  const ticketCount = cycle?.ticket_count ?? 0;
  const uniquePlayerCount = cycle?.unique_player_count ?? 0;
  const reasons: string[] = [];

  if (!thresholds.early_manual_enabled) {
    reasons.push('Early/manual draws are disabled globally by Superadmin.');
  }
  if (!cycle) {
    reasons.push(`No active ${drawType} cycle.`);
  }
  if (ticketCount < minTickets) {
    reasons.push(`Need at least ${minTickets} tickets (have ${ticketCount}).`);
  }
  if (uniquePlayerCount < minPlayers) {
    reasons.push(`Need at least ${minPlayers} unique players (have ${uniquePlayerCount}).`);
  }

  return {
    allowed: reasons.length === 0,
    early_manual_enabled: thresholds.early_manual_enabled,
    min_tickets: minTickets,
    min_players: minPlayers,
    ticket_count: ticketCount,
    unique_player_count: uniquePlayerCount,
    reasons,
  };
}

type StoreState = {
  thresholds: ManualDrawThresholds;
  config: LuckyDrawCompanyConfig;
  rules: TicketEarningRule[];
  weekly: ActiveDrawCycle | null;
  monthly: ActiveDrawCycle | null;
  history: DrawHistoryEntry[];
  nextRuleId: number;
  nextCycleId: number;
};

const globalForMock = globalThis as typeof globalThis & {
  __luckyDrawMockStore?: StoreState;
};

function createInitialState(): StoreState {
  const config: LuckyDrawCompanyConfig = {
    weekly: {
      enabled: true,
      winner_count: 3,
      prize_distribution: 'equal',
      prize_amount: '50.00',
      prize_amounts_by_position: ['100.00', '50.00', '25.00'],
      allow_multi_win: false,
      prize_credit_mode: 'auto',
    },
    monthly: {
      enabled: true,
      winner_count: 5,
      prize_distribution: 'by_position',
      prize_amount: '200.00',
      prize_amounts_by_position: ['500.00', '250.00', '150.00', '75.00', '50.00'],
      allow_multi_win: false,
      prize_credit_mode: 'auto',
    },
  };

  const thresholds: ManualDrawThresholds = {
    early_manual_enabled: true,
    weekly_min_tickets: 500,
    weekly_min_players: 50,
    monthly_min_tickets: 2000,
    monthly_min_players: 150,
  };

  return {
    thresholds,
    config,
    rules: [
      {
        id: 1,
        draw_type: 'weekly',
        ticket_type: 'silver',
        source: 'purchase_threshold',
        threshold_amount: '50.00',
        ticket_quantity: 1,
        is_enabled: true,
      },
      {
        id: 2,
        draw_type: 'weekly',
        ticket_type: 'silver',
        source: 'spin',
        threshold_amount: null,
        ticket_quantity: 1,
        is_enabled: true,
      },
      {
        id: 3,
        draw_type: 'monthly',
        ticket_type: 'gold',
        source: 'purchase_threshold',
        threshold_amount: '100.00',
        ticket_quantity: 1,
        is_enabled: true,
      },
    ],
    weekly: buildCycle(101, 'weekly', daysFromNow(3), 620, 78, config),
    monthly: buildCycle(102, 'monthly', daysFromNow(16), 1840, 132, config),
    history: [
      {
        id: 90,
        draw_type: 'weekly',
        status: 'completed',
        method: 'automatic',
        started_at: daysFromNow(-14),
        completed_at: daysFromNow(-7),
        scheduled_at: daysFromNow(-7),
        ticket_count: 540,
        unique_player_count: 61,
        winners: [
          {
            position: 1,
            player_id: 1001,
            player_username: 'lucky_player',
            ticket_id: 9001,
            prize_amount: '50.00',
            credited: true,
          },
          {
            position: 2,
            player_id: 1002,
            player_username: 'spin_queen',
            ticket_id: 9002,
            prize_amount: '50.00',
            credited: true,
          },
          {
            position: 3,
            player_id: 1003,
            player_username: 'goldrush',
            ticket_id: 9003,
            prize_amount: '50.00',
            credited: true,
          },
        ],
      },
    ],
    nextRuleId: 4,
    nextCycleId: 103,
  };
}

function getStore(): StoreState {
  if (!globalForMock.__luckyDrawMockStore) {
    globalForMock.__luckyDrawMockStore = createInitialState();
  }
  return globalForMock.__luckyDrawMockStore;
}

export const luckyDrawMock = {
  getThresholds(): ManualDrawThresholds {
    return { ...getStore().thresholds };
  },

  patchThresholds(patch: Partial<ManualDrawThresholds>): ManualDrawThresholds {
    const store = getStore();
    store.thresholds = { ...store.thresholds, ...patch };
    return { ...store.thresholds };
  },

  getConfig(): LuckyDrawCompanyConfig {
    const store = getStore();
    return structuredClone(store.config);
  },

  patchConfig(patch: Partial<LuckyDrawCompanyConfig>): LuckyDrawCompanyConfig {
    const store = getStore();
    if (patch.weekly) {
      store.config.weekly = { ...store.config.weekly, ...patch.weekly };
    }
    if (patch.monthly) {
      store.config.monthly = { ...store.config.monthly, ...patch.monthly };
    }
    if (store.weekly) {
      store.weekly.winner_count = store.config.weekly.winner_count;
      store.weekly.prize_distribution = store.config.weekly.prize_distribution;
      store.weekly.prize_amount = store.config.weekly.prize_amount;
      store.weekly.prize_amounts_by_position = [
        ...store.config.weekly.prize_amounts_by_position,
      ];
    }
    if (store.monthly) {
      store.monthly.winner_count = store.config.monthly.winner_count;
      store.monthly.prize_distribution = store.config.monthly.prize_distribution;
      store.monthly.prize_amount = store.config.monthly.prize_amount;
      store.monthly.prize_amounts_by_position = [
        ...store.config.monthly.prize_amounts_by_position,
      ];
    }
    return structuredClone(store.config);
  },

  listRules(): TicketEarningRule[] {
    return structuredClone(getStore().rules);
  },

  createRule(body: CreateTicketEarningRuleRequest): TicketEarningRule {
    const store = getStore();
    const rule: TicketEarningRule = { ...body, id: store.nextRuleId++ };
    store.rules.push(rule);
    return structuredClone(rule);
  },

  patchRule(id: number, patch: Partial<CreateTicketEarningRuleRequest>): TicketEarningRule | null {
    const store = getStore();
    const idx = store.rules.findIndex((r) => r.id === id);
    if (idx < 0) return null;
    store.rules[idx] = { ...store.rules[idx], ...patch };
    return structuredClone(store.rules[idx]);
  },

  deleteRule(id: number): boolean {
    const store = getStore();
    const before = store.rules.length;
    store.rules = store.rules.filter((r) => r.id !== id);
    return store.rules.length < before;
  },

  getActiveCycles(): ActiveCyclesResponse {
    const store = getStore();
    return {
      weekly: store.weekly ? structuredClone(store.weekly) : null,
      monthly: store.monthly ? structuredClone(store.monthly) : null,
      eligibility: {
        weekly: eligibilityFor('weekly', store.weekly, store.thresholds),
        monthly: eligibilityFor('monthly', store.monthly, store.thresholds),
      },
    };
  },

  listHistory(): DrawHistoryEntry[] {
    return structuredClone(getStore().history);
  },

  runManual(cycleId: number): RunManualDrawResponse | { error: string; status: number } {
    const store = getStore();
    const drawType: DrawType | null =
      store.weekly?.id === cycleId ? 'weekly' : store.monthly?.id === cycleId ? 'monthly' : null;
    if (!drawType) {
      return { error: 'Active cycle not found', status: 404 };
    }

    const cycle = drawType === 'weekly' ? store.weekly : store.monthly;
    if (!cycle) {
      return { error: 'Active cycle not found', status: 404 };
    }

    const elig = eligibilityFor(drawType, cycle, store.thresholds);
    if (!elig.allowed) {
      return { error: elig.reasons.join(' '), status: 400 };
    }

    const typeConfig = store.config[drawType];
    const now = new Date();
    const winners = Array.from({ length: typeConfig.winner_count }, (_, i) => {
      const amount =
        typeConfig.prize_distribution === 'by_position'
          ? typeConfig.prize_amounts_by_position[i] ?? typeConfig.prize_amount
          : typeConfig.prize_amount;
      return {
        position: i + 1,
        player_id: 2000 + i,
        player_username: `winner_${i + 1}`,
        ticket_id: cycle.id * 1000 + i,
        prize_amount: amount,
        credited: typeConfig.prize_credit_mode === 'auto',
      };
    });

    const completed: DrawHistoryEntry = {
      id: cycle.id,
      draw_type: drawType,
      status: 'completed',
      method: 'manual',
      started_at: cycle.started_at,
      completed_at: now.toISOString(),
      scheduled_at: cycle.scheduled_at,
      ticket_count: cycle.ticket_count,
      unique_player_count: cycle.unique_player_count,
      winners,
    };
    store.history.unshift(completed);

    const nextScheduled = new Date(
      now.getTime() + (drawType === 'weekly' ? WEEK_MS : MONTH_MS),
    ).toISOString();
    const next = buildCycle(
      store.nextCycleId++,
      drawType,
      nextScheduled,
      0,
      0,
      store.config,
    );
    next.started_at = now.toISOString();

    if (drawType === 'weekly') store.weekly = next;
    else store.monthly = next;

    return {
      cycle: structuredClone(completed),
      next_cycle: structuredClone(next),
    };
  },
};
