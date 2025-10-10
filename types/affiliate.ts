export interface Affiliate {
  id: number;
  name: string;
  email: string;
  affiliate_percentage: string;
  affiliate_fee: string;
  payment_method_fee: string;
  affiliate_link: string;
  total_players: number;
  total_earnings: number;
  total_topup: number;
  total_cashout: number;
  created: string;
}

export interface UpdateAffiliateRequest {
  affiliation_percentage?: number;
  affiliation_fee_percentage?: number;
  payment_method_fee_percentage?: number;
}

export interface AddManualAffiliateRequest {
  agent_id: number;
  player_id: number;
}

export interface AffiliateDefaults {
  id: number;
  default_affiliation_percentage: number;
  default_fee_percentage: number;
  default_payment_method_fee_percentage: number;
}

export interface UpdateAffiliateDefaultsRequest {
  default_affiliation_percentage?: number;
  default_fee_percentage?: number;
  default_payment_method_fee_percentage?: number;
}

