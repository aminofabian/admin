import { describe, expect, it } from 'vitest';
import { USER_ROLES } from '@/lib/constants/roles';
import { groupSettingsForRole } from '../group-settings-for-role';

function itemIds(role: Parameters<typeof groupSettingsForRole>[0]) {
  return groupSettingsForRole(role).flatMap((section) => section.items.map((item) => item.id));
}

describe('groupSettingsForRole', () => {
  it('returns nothing without a role', () => {
    expect(groupSettingsForRole(undefined)).toEqual([]);
  });

  it('shows superadmin platform settings but not email', () => {
    const ids = itemIds(USER_ROLES.SUPERADMIN);
    expect(ids).toContain('company');
    expect(ids).not.toContain('email-templates');
  });

  it('hides company settings from company admins', () => {
    expect(itemIds(USER_ROLES.COMPANY)).not.toContain('company');
  });

  it('drops groups with no visible items', () => {
    const groupIds = groupSettingsForRole(USER_ROLES.SUPERADMIN).map((section) => section.id);
    expect(groupIds).not.toContain('email');
    expect(groupSettingsForRole(USER_ROLES.SUPERADMIN).every((section) => section.items.length > 0)).toBe(true);
  });
});
