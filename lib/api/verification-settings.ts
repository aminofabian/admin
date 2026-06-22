import { apiClient } from './client';
import type {
  VerificationSettings,
  UpdateVerificationSettingsRequest,
} from '@/types';

export const verificationSettingsApi = {
  get: () => apiClient.get<VerificationSettings>('api/admin/verification-settings'),

  update: (data: UpdateVerificationSettingsRequest) =>
    apiClient.patch<VerificationSettings>('api/admin/verification-settings', data),
};
