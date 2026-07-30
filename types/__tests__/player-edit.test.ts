import { describe, expect, it } from 'vitest';
import {
  EMPTY_EDITABLE_PLAYER_FIELDS,
  buildPlayerUpdateRequest,
} from '@/types/player-edit';

describe('buildPlayerUpdateRequest', () => {
  it('includes profile fields and password when unlocked', () => {
    const result = buildPlayerUpdateRequest(
      {
        ...EMPTY_EDITABLE_PLAYER_FIELDS,
        email: 'player@example.com',
        first_name: 'Jane',
        last_name: 'Doe',
        password: 'Secret123!',
        confirm_password: 'Secret123!',
        is_active: true,
      },
      { lockProfileFields: false }
    );

    expect(result).toEqual({
      email: 'player@example.com',
      first_name: 'Jane',
      last_name: 'Doe',
      mobile_number: undefined,
      dob: undefined,
      address: undefined,
      city: undefined,
      zip_code: undefined,
      state: undefined,
      country: 'US',
      is_active: true,
      password: 'Secret123!',
      confirm_password: 'Secret123!',
    });
  });

  it('allows password reset and account status when profile fields are locked after KYC', () => {
    const result = buildPlayerUpdateRequest(
      {
        ...EMPTY_EDITABLE_PLAYER_FIELDS,
        email: 'locked@example.com',
        first_name: 'Locked',
        last_name: 'Player',
        password: 'NewPass123!',
        confirm_password: 'NewPass123!',
        is_active: false,
      },
      { lockProfileFields: true }
    );

    expect(result).toEqual({
      password: 'NewPass123!',
      confirm_password: 'NewPass123!',
      is_active: false,
    });
  });

  it('includes account status when locked and no password change', () => {
    const result = buildPlayerUpdateRequest(
      {
        ...EMPTY_EDITABLE_PLAYER_FIELDS,
        email: 'locked@example.com',
        first_name: 'Locked',
        is_active: false,
      },
      { lockProfileFields: true }
    );

    expect(result).toEqual({
      is_active: false,
    });
  });
});
