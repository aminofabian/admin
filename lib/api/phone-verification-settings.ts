import { apiClient } from './client';
import type {
  PhoneVerificationSettings,
  UpdatePhoneVerificationSettingsRequest,
} from '@/types';

export const phoneVerificationSettingsApi = {
  get: () =>
    apiClient.get<PhoneVerificationSettings>('api/admin/phone-verification-settings'),

  update: (data: UpdatePhoneVerificationSettingsRequest) =>
    apiClient.patch<PhoneVerificationSettings>(
      'api/admin/phone-verification-settings',
      data
    ),
};
