export type BonusType = 'percentage' | 'fixed';
export type BonusCategory = 'game' | 'transfer' | 'signup' | 'purchase';

export interface BaseBonus {
  id: number;
  bonus_type: BonusType;
  bonus: number;
  is_enabled: boolean;
  on_min_deposit: boolean;
  min_deposit_amount: number | null;
  bonus_amount: string;
  display_text: string;
}

export interface PurchaseBonus {
  id: number;
  user: number;
  topup_method: string;
  bonus_type: BonusType;
  bonus: number;
}

export interface RechargeBonus extends BaseBonus {
  category: 'game';
  name: string;
}

export interface TransferBonus extends BaseBonus {
  category: 'transfer';
  name: string;
}

export interface SignupBonus extends BaseBonus {
  category: 'signup';
  name: string;
}

export interface CreatePurchaseBonusRequest {
  user: number;
  topup_method: string;
  bonus_type: BonusType;
  bonus: number;
}

export interface UpdateBonusRequest {
  bonus_type?: BonusType;
  bonus?: number;
  is_enabled?: boolean;
  on_min_deposit?: boolean;
  min_deposit_amount?: number | null;
}

