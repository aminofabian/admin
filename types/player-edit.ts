import type { UpdateUserRequest, Player } from '@/types';
import {
  isPlayerIdentityVerified,
  isPlayerKycComplete,
  isPlayerPhoneVerified,
} from '@/lib/players/player-verification';

export interface EditablePlayerFields {
  email: string;
  first_name: string;
  last_name: string;
  dob: string;
  address: string;
  city: string;
  zip_code: string;
  state: string;
  country: string;
  mobile_number: string;
  password: string;
  confirm_password: string;
  is_active: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
}

export const EMPTY_EDITABLE_PLAYER_FIELDS: EditablePlayerFields = {
  email: '',
  first_name: '',
  last_name: '',
  dob: '',
  address: '',
  city: '',
  zip_code: '',
  state: '',
  country: 'US',
  mobile_number: '',
  password: '',
  confirm_password: '',
  is_active: true,
  phone_verified: false,
  identity_verified: false,
};

export function parseNameFromPlayer(player: Player): { first_name: string; last_name: string } {
  const first = player.first_name?.trim() || '';
  const last = player.last_name?.trim() || '';
  if (first || last) return { first_name: first, last_name: last };

  const legacy = player.full_name?.trim() || '';
  if (!legacy) return { first_name: '', last_name: '' };
  const parts = legacy.split(/\s+/);
  return {
    first_name: parts[0] || '',
    last_name: parts.slice(1).join(' '),
  };
}

export function formatPlayerFullName(fields: Pick<EditablePlayerFields, 'first_name' | 'last_name'>): string {
  return [fields.first_name.trim(), fields.last_name.trim()].filter(Boolean).join(' ');
}

export function buildEditableFieldsFromPlayer(player: Player): EditablePlayerFields {
  const { first_name, last_name } = parseNameFromPlayer(player);

  return {
    email: player.email || '',
    first_name,
    last_name,
    dob: player.dob || '',
    address: player.address?.trim() || player.street?.trim() || '',
    city: player.city?.trim() || '',
    zip_code: player.zip_code?.trim() || player.postal_code?.trim() || '',
    state: player.state || '',
    country: player.country?.trim() || 'US',
    mobile_number: player.mobile_number || '',
    password: '',
    confirm_password: '',
    is_active: player.is_active ?? true,
    phone_verified: isPlayerPhoneVerified(player),
    identity_verified: isPlayerIdentityVerified(player),
  };
}

export function buildPlayerUpdateRequest(
  fields: EditablePlayerFields,
  options?: { lockProfileFields?: boolean }
): UpdateUserRequest {
  const updateData: UpdateUserRequest = {};

  if (!options?.lockProfileFields) {
    Object.assign(updateData, {
      email: fields.email.trim() || undefined,
      first_name: fields.first_name.trim() || undefined,
      last_name: fields.last_name.trim() || undefined,
      mobile_number: fields.mobile_number.trim() || undefined,
      dob: fields.dob.trim() || undefined,
      address: fields.address.trim() || undefined,
      city: fields.city.trim() || undefined,
      zip_code: fields.zip_code.trim() || undefined,
      state: fields.state.trim() || undefined,
      country: fields.country.trim() || undefined,
      is_active: fields.is_active,
      ...(fields.password.trim()
        ? {
            password: fields.password.trim(),
            confirm_password: fields.confirm_password.trim(),
          }
        : {}),
    });
  }

  return updateData;
}

export function isPlayerProfileLocked(player: Player | null | undefined): boolean {
  return isPlayerKycComplete(player);
}

export function applyEditableFieldsToPlayer(player: Player, fields: EditablePlayerFields): Player {
  const full_name = formatPlayerFullName(fields) || player.full_name;

  return {
    ...player,
    email: fields.email.trim() || player.email,
    first_name: fields.first_name.trim() || player.first_name,
    last_name: fields.last_name.trim() || player.last_name,
    full_name,
    dob: fields.dob.trim() || player.dob,
    address: fields.address.trim() || player.address,
    street: fields.address.trim() || player.street,
    city: fields.city.trim() || player.city,
    zip_code: fields.zip_code.trim() || player.zip_code,
    postal_code: fields.zip_code.trim() || player.postal_code,
    state: fields.state.trim() || player.state,
    country: fields.country.trim() || player.country,
    mobile_number: fields.mobile_number.trim() || player.mobile_number,
    is_active: fields.is_active,
  };
}
