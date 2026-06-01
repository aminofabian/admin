/**
 * Normalized spin allowance snapshot from backend `spin_allowance` (or legacy `usage`).
 */
export type PlayerRouletteSpinInfo = {
  date?: string;
  spins_per_day?: number;
  daily_free_spins?: number;
  used_spins?: number;
  remaining_spins?: number;
  spin_balance?: number;
  is_unlimited?: boolean;
  has_completed_purchase?: boolean;
  daily_grant_awarded?: boolean;
  allowance_source?: 'player' | 'company' | string;
  allowance_id?: number | null;
  player_allowance_id?: number | null;
  company_allowance_id?: number | null;
  company_id?: number;
};

function readNum(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

function readBool(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (value === 1 || value === '1' || value === 'true') return true;
  if (value === 0 || value === '0' || value === 'false') return false;
  return undefined;
}

/** Parse backend `spin_allowance` / `usage` object. */
export function parsePlayerRouletteSpinInfo(raw: unknown): PlayerRouletteSpinInfo | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;

  const spins_per_day = readNum(o.spins_per_day);
  const daily_free_spins = readNum(o.daily_free_spins);
  const used_spins = readNum(o.used_spins);
  const remaining_spins = readNum(o.remaining_spins);
  const spin_balance = readNum(o.spin_balance ?? o.balance);

  const hasAny =
    spins_per_day !== undefined ||
    daily_free_spins !== undefined ||
    used_spins !== undefined ||
    remaining_spins !== undefined ||
    spin_balance !== undefined ||
    readBool(o.is_unlimited) !== undefined;

  if (!hasAny && typeof o.date !== 'string' && typeof o.allowance_source !== 'string') {
    return null;
  }

  return {
    date: typeof o.date === 'string' ? o.date : undefined,
    spins_per_day,
    daily_free_spins,
    used_spins,
    remaining_spins,
    spin_balance,
    is_unlimited: readBool(o.is_unlimited),
    has_completed_purchase: readBool(o.has_completed_purchase),
    daily_grant_awarded: readBool(o.daily_grant_awarded),
    allowance_source:
      typeof o.allowance_source === 'string' ? o.allowance_source : undefined,
    allowance_id: readNum(o.allowance_id) ?? null,
    player_allowance_id: readNum(o.player_allowance_id) ?? null,
    company_allowance_id: readNum(o.company_allowance_id) ?? null,
    company_id: readNum(o.company_id),
  };
}

/** Extract spin snapshot from an allowance row or list envelope. */
export function pickPlayerRouletteSpinInfo(source: unknown): PlayerRouletteSpinInfo | null {
  if (!source || typeof source !== 'object') return null;
  const obj = source as Record<string, unknown>;
  return (
    parsePlayerRouletteSpinInfo(obj.spin_allowance) ??
    parsePlayerRouletteSpinInfo(obj.usage) ??
    parsePlayerRouletteSpinInfo(obj)
  );
}

export function dailyAccrualFromSpinInfo(info: PlayerRouletteSpinInfo | null): number {
  if (!info) return 0;
  return info.daily_free_spins ?? info.spins_per_day ?? 0;
}
