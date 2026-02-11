export interface Company {
  id: number;
  username: string;
  email: string;
  project_name: string;
  project_domain: string;
  admin_project_domain: string;
  is_active: boolean;
  service_email?: string | null;
  service_name?: string | null;
  game_api_url?: string | null;
  game_api_key?: string | null;
  btcpay_api_key?: string | null;
  btcpay_store_id?: string | null;
  btcpay_webhook_secret?: string | null;
  binpay_api_key?: string | null;
  binpay_secret_key?: string | null;
  binpay_deposit_secret_key?: string | null;
  binpay_withdrawal_secret_key?: string | null;
  brenzi_merchant_slug?: string | null;
  tierlock_merchant_id?: string | null;
  tierlock_merchant_secret?: string | null;
  tierlock_webhook_secret?: string | null;
  tierlock_payout_shared_secret?: string | null;
  tierlock_payout_client_secret?: string | null;
  created: string;
  modified?: string;
}

export interface CreateCompanyRequest {
  project_name: string;
  project_domain: string;
  admin_project_domain: string;
  username: string;
  password: string;
  email: string;
  service_email: string;
  service_name: string;
  game_api_url?: string;
  game_api_key?: string;
  service_creds?: string;
  btcpay_api_key?: string;
  btcpay_store_id?: string;
  btcpay_webhook_secret?: string;
  binpay_api_key?: string;
  binpay_secret_key?: string;
  binpay_deposit_secret_key?: string;
  binpay_withdrawal_secret_key?: string;
  brenzi_merchant_slug?: string;
  tierlock_merchant_id?: string;
  tierlock_merchant_secret?: string;
  tierlock_webhook_secret?: string;
  tierlock_payout_shared_secret?: string;
  tierlock_payout_client_secret?: string;
  logo?: File;
}

export interface UpdateCompanyRequest {
  project_name?: string;
  project_domain?: string;
  admin_project_domain?: string;
  username?: string;
  email?: string;
  service_email?: string;
  service_name?: string;
  game_api_url?: string;
  game_api_key?: string;
  is_active?: boolean;
  btcpay_api_key?: string;
  btcpay_store_id?: string;
  btcpay_webhook_secret?: string;
  binpay_api_key?: string;
  binpay_secret_key?: string;
  binpay_deposit_secret_key?: string;
  binpay_withdrawal_secret_key?: string;
  brenzi_merchant_slug?: string;
  tierlock_merchant_id?: string;
  tierlock_merchant_secret?: string;
  tierlock_webhook_secret?: string;
  tierlock_payout_shared_secret?: string;
  tierlock_payout_client_secret?: string;
}

