import type { Player } from '@/types';

/** Display label for who referred a player or which promo code they used. */
export function getPlayerReferredByDisplay(player: Player): string {
  const fromDisplay = player.referred_by_display?.trim();
  if (fromDisplay) return fromDisplay;

  const fromSource = player.referral_source?.display?.trim();
  if (fromSource) return fromSource;

  return '—';
}
