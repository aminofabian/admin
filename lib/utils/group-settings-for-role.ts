import type { UserRole } from '@/lib/constants/roles';
import {
  SETTING_GROUPS,
  SETTING_ITEMS,
  type SettingGroup,
  type SettingItem,
} from '@/lib/constants/settings-catalog';

export interface SettingSection extends SettingGroup {
  items: SettingItem[];
}

export function groupSettingsForRole(role: UserRole | undefined): SettingSection[] {
  if (!role) return [];
  const visibleItems = SETTING_ITEMS.filter((item) => item.roles.includes(role));
  return SETTING_GROUPS.map((group) => ({
    ...group,
    items: visibleItems.filter((item) => item.group === group.id),
  })).filter((section) => section.items.length > 0);
}
