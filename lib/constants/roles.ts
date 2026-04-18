export const USER_ROLES = {
  SUPERADMIN: 'superadmin',
  COMPANY: 'company',
  MANAGER: 'manager',
  AGENT: 'agent',
  STAFF: 'staff',
  PLAYER: 'player',
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const ADMIN_ROLES: UserRole[] = [
  USER_ROLES.SUPERADMIN,
  USER_ROLES.COMPANY,
];

export const STAFF_ROLES: UserRole[] = [
  USER_ROLES.MANAGER,
  USER_ROLES.AGENT,
  USER_ROLES.STAFF,
];

/** Company/superadmin (admin) and managers may edit player cashout limit; staff/agents may not. */
export function canEditPlayerCashoutLimit(role: UserRole | undefined): boolean {
  if (!role) return false;
  return role === USER_ROLES.MANAGER || ADMIN_ROLES.includes(role);
}

