import { apiClient } from '@/lib/api/client';

/**
 * Loads player email / phone from GET api/player-details/{id} for payout provider requests.
 * Backend may omit or denormalize these on the transaction row.
 */
export async function fetchPlayerPayoutContact(
  playerId: number
): Promise<{ email?: string; phone?: string } | null> {
  if (!Number.isFinite(playerId) || playerId <= 0) return null;

  try {
    const data = (await apiClient.get<Record<string, unknown>>(
      `api/player-details/${playerId}`
    )) as Record<string, unknown>;
    const raw = data?.player ?? data;
    if (!raw || typeof raw !== 'object') return null;
    const p = raw as Record<string, unknown>;

    const emailRaw = p.email;
    const email =
      typeof emailRaw === 'string' && emailRaw.trim() !== '' ? emailRaw.trim() : undefined;

    const mobileRaw = p.mobile_number ?? p.phone_number;
    const digits =
      mobileRaw != null ? String(mobileRaw).replace(/\D/g, '') : '';
    const phone = digits.length >= 10 ? digits.slice(-10) : undefined;

    if (!email && !phone) return null;
    return { email, phone };
  } catch {
    return null;
  }
}
