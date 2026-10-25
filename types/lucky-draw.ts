export type DrawType = 'weekly' | 'monthly';
export type TicketType = 'silver' | 'gold';
export type EarningSource = 'spin' | 'purchase_threshold';
export type PrizeDistribution = 'equal' | 'by_position';
export type PrizeCreditMode = 'auto' | 'approval';
export type DrawMethod = 'automatic' | 'manual';
export type DrawCycleStatus = 'active' | 'completed' | 'cancelled';
export type TicketStatus = 'eligible' | 'won' | 'consumed' | 'void';

export type ManualDrawThresholds = {
  early_manual_enabled: boolean;
  weekly_min_tickets: number;
  weekly_min_players: number;
  monthly_min_tickets: number;
  monthly_min_players: number;
};

export type DrawTypeConfig = {
  enabled: boolean;
  winner_count: number;
  prize_distribution: PrizeDistribution;
  /** Used when prize_distribution === 'equal' */
  prize_amount: string;
  /** Used when prize_distribution === 'by_position'; length === winner_count */
  prize_amounts_by_position: string[];
  allow_multi_win: boolean;
  prize_credit_mode: PrizeCreditMode;
};

export type LuckyDrawCompanyConfig = {
  weekly: DrawTypeConfig;
  monthly: DrawTypeConfig;
};

export type TicketEarningRule = {
  id: number;
  draw_type: DrawType;
  ticket_type: TicketType;
  source: EarningSource;
  /** Purchase USD threshold; null for spin rules */
  threshold_amount: string | null;
  ticket_quantity: number;
  is_enabled: boolean;
};

export type CreateTicketEarningRuleRequest = Omit<TicketEarningRule, 'id'>;

export type ActiveDrawCycle = {
  id: number;
  draw_type: DrawType;
  ticket_type: TicketType;
  status: DrawCycleStatus;
  started_at: string;
  scheduled_at: string;
  ticket_count: number;
  unique_player_count: number;
  winner_count: number;
  prize_distribution: PrizeDistribution;
  prize_amount: string;
  prize_amounts_by_position: string[];
};

export type ManualDrawEligibility = {
  allowed: boolean;
  early_manual_enabled: boolean;
  min_tickets: number;
  min_players: number;
  ticket_count: number;
  unique_player_count: number;
  reasons: string[];
};

export type ActiveCyclesResponse = {
  weekly: ActiveDrawCycle | null;
  monthly: ActiveDrawCycle | null;
  eligibility: {
    weekly: ManualDrawEligibility;
    monthly: ManualDrawEligibility;
  };
};

export type DrawWinner = {
  position: number;
  player_id: number;
  player_username: string;
  ticket_id: number;
  prize_amount: string;
  credited: boolean;
};

export type DrawHistoryEntry = {
  id: number;
  draw_type: DrawType;
  status: DrawCycleStatus;
  method: DrawMethod;
  started_at: string;
  completed_at: string;
  scheduled_at: string;
  ticket_count: number;
  unique_player_count: number;
  winners: DrawWinner[];
};

export type RunManualDrawResponse = {
  cycle: DrawHistoryEntry;
  next_cycle: ActiveDrawCycle;
};
