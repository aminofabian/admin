export type DrawType = 'weekly' | 'monthly';
export type PrizeMode = 'equal' | 'individual';
export type DrawMethod = 'automatic' | 'manual';
export type DrawCycleStatus = 'active' | 'completed' | 'cancelled';
export type PrizeStatus = 'pending' | 'credited' | 'rejected';

/** Super Admin — GET/PATCH /admin/lucky-draw/global-settings/ */
export type LuckyDrawGlobalSettings = {
  early_draw_enabled: boolean;
  weekly_min_tickets: number;
  weekly_min_players: number;
  monthly_min_tickets: number;
  monthly_min_players: number;
};

/** Company Admin — GET/PATCH /admin/lucky-draw/settings/ */
export type LuckyDrawCompanySettings = {
  weekly_enabled: boolean;
  monthly_enabled: boolean;
  weekly_winner_count: number;
  monthly_winner_count: number;
  weekly_prize_mode: PrizeMode;
  monthly_prize_mode: PrizeMode;
  weekly_prize_total: string;
  monthly_prize_total: string;
  weekly_prize_amounts: string[];
  monthly_prize_amounts: string[];
  allow_multiple_wins_same_player: boolean;
  prize_auto_credit: boolean;
  weekly_purchase_threshold: string;
  weekly_tickets_per_threshold: number;
  monthly_purchase_threshold: string;
  monthly_tickets_per_threshold: number;
};

export type LuckyDrawCycle = {
  id: number;
  draw_type: DrawType;
  status: DrawCycleStatus;
  started_at: string;
  scheduled_draw_at: string;
  ticket_count: number;
  player_count: number;
};

export type ManualDrawBlockReason =
  | 'min_tickets_not_met'
  | 'min_players_not_met'
  | 'early_draw_disabled'
  | 'draw_disabled'
  | 'no_active_cycle'
  | string;

export type ManualDrawInfo = {
  eligible: boolean;
  ticket_count: number;
  player_count: number;
  min_tickets: number;
  min_players: number;
  tickets_met: boolean;
  players_met: boolean;
  early_draw_globally_enabled: boolean;
  block_reasons: ManualDrawBlockReason[];
};

export type DrawTypeStatus = {
  cycle: LuckyDrawCycle | null;
  manual_draw: ManualDrawInfo;
};

/** Company Admin — GET /admin/lucky-draw/status/ */
export type LuckyDrawStatusResponse = {
  settings: LuckyDrawCompanySettings;
  global: LuckyDrawGlobalSettings;
  weekly: DrawTypeStatus;
  monthly: DrawTypeStatus;
};

export type DrawWinner = {
  id: number;
  position: number;
  player_id?: number;
  player_username: string;
  ticket_id?: number;
  prize_amount: string;
  prize_status: PrizeStatus;
};

export type DrawHistoryEntry = {
  id: number;
  draw_type: DrawType;
  status: DrawCycleStatus;
  draw_method: DrawMethod;
  started_at: string;
  completed_at: string;
  scheduled_draw_at?: string;
  ticket_count: number;
  player_count: number;
  prize_status?: PrizeStatus;
  winners: DrawWinner[];
};

export type RunDrawResponse = {
  cycle: DrawHistoryEntry;
  next_cycle?: LuckyDrawCycle;
  winners?: DrawWinner[];
};

/** Human-readable copy for manual_draw.block_reasons codes */
export const MANUAL_DRAW_BLOCK_COPY: Record<string, string> = {
  min_tickets_not_met: 'Minimum ticket threshold not met',
  min_players_not_met: 'Minimum unique player threshold not met',
  early_draw_disabled: 'Early/manual draws are disabled globally',
  draw_disabled: 'This draw type is disabled for the company',
  no_active_cycle: 'No active cycle',
  no_eligible_tickets: 'No eligible tickets in the pool',
};
