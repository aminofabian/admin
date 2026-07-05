import type { UpdateUserRequest, Player } from '@/types';
import {
  buildPlayerVerificationPatch,
  isPlayerIdentityVerified,
  isPlayerPhoneVerified,
} from '@/lib/players/player-verification';

export interface EditablePlayerFields {
  email: string;
  full_name: string;
  dob: string;
  state: string;
  mobile_number: string;
  password: string;
  confirm_password: string;
  is_active: boolean;
  phone_verified: boolean;
  identity_verified: boolean;
}

export const EMPTY_EDITABLE_PLAYER_FIELDS: EditablePlayerFields = {
  email: '',
  full_name: '',
  dob: '',
  state: '',
  mobile_number: '',
  password: '',
  confirm_password: '',
  is_active: true,
  phone_verified: false,
  identity_verified: false,
};

export function buildEditableFieldsFromPlayer(player: Player): EditablePlayerFields {
  return {
    email: player.email || '',
    full_name: player.full_name || '',
    dob: player.dob || '',
    state: player.state || '',
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
  options?: { includeVerification?: boolean }
): UpdateUserRequest {
  const updateData: UpdateUserRequest = {
    email: fields.email.trim() || undefined,
    full_name: fields.full_name.trim() || undefined,
    mobile_number: fields.mobile_number.trim() || undefined,
    dob: fields.dob.trim() || undefined,
    state: fields.state.trim() || undefined,
    is_active: fields.is_active,
    ...(fields.password.trim()
      ? {
          password: fields.password.trim(),
          confirm_password: fields.confirm_password.trim(),
        }
      : {}),
  };

  if (options?.includeVerification) {
    Object.assign(updateData, buildPlayerVerificationPatch(fields.phone_verified, fields.identity_verified));
  }

  return updateData;
}
