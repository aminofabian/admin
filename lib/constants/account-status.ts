/** Display labels + badge variants aligned with `<Badge variant="success"|"danger" />`. */

export type AccountBadgeVariant = 'success' | 'danger';

export function getAccountStatusPresentation(isActive: boolean): {
  label: (typeof ACCOUNT_STATUS_LABELS)[keyof typeof ACCOUNT_STATUS_LABELS];
  variant: AccountBadgeVariant;
} {
  return isActive
    ? { label: ACCOUNT_STATUS_LABELS.active, variant: ACCOUNT_STATUS_VARIANTS.active }
    : { label: ACCOUNT_STATUS_LABELS.inactive, variant: ACCOUNT_STATUS_VARIANTS.inactive };
}

export const ACCOUNT_STATUS_LABELS = {
  active: 'Active',
  inactive: 'Inactive',
} as const;

const ACCOUNT_STATUS_VARIANTS = {
  active: 'success',
  inactive: 'danger',
} as const satisfies Record<keyof typeof ACCOUNT_STATUS_LABELS, AccountBadgeVariant>;
