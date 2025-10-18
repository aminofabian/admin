import type { BonusType } from './bonus';
import type { CreateCompanyRequest, UpdateCompanyRequest } from './company';

// Company Settings Types
export interface CompanySettings {
  id: number;
  username: string;
  email: string;
  project_name: string;
  project_domain: string;
  admin_project_domain: string;
  is_active: boolean;
  created: string;
  modified: string;
}

// Bonus Settings Types

export interface BaseBonusSettings {
  id: number;
  bonus_type: BonusType;
  bonus: number;
  is_enabled: boolean;
  on_min_deposit: boolean;
  min_deposit_amount: number | null;
}

export interface RechargeBonusSettings extends BaseBonusSettings {
  // Game-specific recharge bonuses (one per game)
}

export interface TransferBonusSettings extends BaseBonusSettings {
  // Balance transfer bonus settings (one per admin/project)
}

export interface SignupBonusSettings extends BaseBonusSettings {
  // New user registration bonus settings (one per admin/project)
}

export interface PurchaseBonusSettings {
  id: number;
  user: number;
  topup_method: string;
  bonus_type: BonusType;
  bonus: number;
}

export interface UpdateBonusSettingsRequest {
  bonus_type?: BonusType;
  bonus?: number;
  is_enabled?: boolean;
  on_min_deposit?: boolean;
  min_deposit_amount?: number | null;
}

// Affiliate Settings Types
export interface AffiliateDefaultSettings {
  id: number;
  default_affiliation_percentage: string; // Decimal as string
  default_fee_percentage: string; // Decimal as string
  default_payment_method_fee_percentage: string; // Decimal as string
}

// Game Settings Types
export interface GameSettings {
  id: number;
  title: string;
  code: string;
  game_category: string;
  game_status: boolean;
  dashboard_url?: string;
}

export interface UpdateGameSettingsRequest {
  title?: string;
  game_status?: boolean;
  dashboard_url?: string;
}

// API Response Types
export interface CompanyCreateResponse {
  status: string;
  message: string;
  data: CompanySettings;
}

export interface CompanyUpdateResponse {
  status: string;
  message: string;
  data: CompanySettings;
}
