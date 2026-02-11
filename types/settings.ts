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
  btcpay_api_key?: string | null;
  btcpay_store_id?: string | null;
  btcpay_webhook_secret?: string | null;
  binpay_withdrawal_secret_key?: string | null;
  tierlock_merchant_id?: string | null;
  tierlock_merchant_secret?: string | null;
  tierlock_webhook_secret?: string | null;
  tierlock_payout_shared_secret?: string | null;
  tierlock_payout_client_secret?: string | null;
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
  is_active?: boolean;
}

export interface UpdateBonusSettingsRequest {
  bonus_type?: BonusType;
  bonus?: number;
  is_enabled?: boolean;
  is_active?: boolean;
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

// Payment Methods Settings Types
export interface PaymentMethod {
  id: number;
  payment_method: string;
  payment_method_display: string;
  method_type: string;
  is_enabled_for_cashout?: boolean;
  is_enabled_for_purchase?: boolean;
  enabled_for_cashout_by_superadmin?: boolean;
  enabled_for_purchase_by_superadmin?: boolean;
  // Admin-level limits (per company/admin)
  min_amount_cashout?: string | null;
  max_amount_cashout?: string | null;
  min_amount_purchase?: string | null;
  max_amount_purchase?: string | null;
  // Global limits configured by superadmin
  superadmin_min_amount_cashout?: string | null;
  superadmin_max_amount_cashout?: string | null;
  superadmin_min_amount_purchase?: string | null;
  superadmin_max_amount_purchase?: string | null;
  created: string;
  modified: string;
}

export interface UpdatePaymentMethodRequest {
  payment_method?: string;
  payment_method_display?: string;
  method_type?: string;
  is_enabled_for_cashout?: boolean;
  is_enabled_for_purchase?: boolean;
  min_amount_cashout?: number | null;
  max_amount_cashout?: number | null;
  min_amount_purchase?: number | null;
  max_amount_purchase?: number | null;
  superadmin_min_amount_cashout?: number | null;
  superadmin_max_amount_cashout?: number | null;
  superadmin_min_amount_purchase?: number | null;
  superadmin_max_amount_purchase?: number | null;
}

export interface PaymentMethodsListResponse {
  cashout: PaymentMethod[];
  purchase: PaymentMethod[];
}

export type PaymentMethodAction = keyof PaymentMethodsListResponse;

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

// Chat Links Types
export interface ChatLink {
  id: number;
  platform: string;
  platform_display: string;
  link_url: string;
  is_enabled_for_dashboard: boolean;
  is_enabled_for_landing_page: boolean;
  created: string;
  modified: string;
}

export interface UpdateChatLinkRequest {
  link_url?: string;
  is_enabled_for_dashboard?: boolean;
  is_enabled_for_landing_page?: boolean;
}
