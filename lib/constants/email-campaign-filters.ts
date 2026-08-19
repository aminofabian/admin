import type {
  EmailCampaignFilterField,
  EmailCampaignFilterOperator,
  EmailCampaignFilterRow,
} from '@/types';

export interface EmailCampaignFilterFieldDef {
  field: EmailCampaignFilterField;
  label: string;
  operators: EmailCampaignFilterOperator[];
  valueType: 'enum' | 'number' | 'date';
  options?: { value: string; label: string }[];
}

export const EMAIL_CAMPAIGN_FILTER_OPERATOR_LABELS: Record<
  EmailCampaignFilterOperator,
  string
> = {
  eq: 'Equals',
  before: 'Before',
  after: 'After',
  between: 'Between',
  last_x_days: 'Last X days',
  never: 'Never',
  gt: 'Greater than',
  lt: 'Less than',
};

export const EMAIL_CAMPAIGN_FILTER_FIELDS: EmailCampaignFilterFieldDef[] = [
  {
    field: 'account_status',
    label: 'Account status',
    operators: ['eq'],
    valueType: 'enum',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
  },
  {
    field: 'registration_date',
    label: 'Registration date',
    operators: ['before', 'after', 'between', 'last_x_days'],
    valueType: 'date',
  },
  {
    field: 'email_verification',
    label: 'Email verification',
    operators: ['eq'],
    valueType: 'enum',
    options: [
      { value: 'verified', label: 'Verified' },
      { value: 'not_verified', label: 'Not verified' },
    ],
  },
  {
    field: 'kyc_status',
    label: 'KYC status',
    operators: ['eq'],
    valueType: 'enum',
    options: [
      { value: 'verified', label: 'Verified' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'pending', label: 'Pending' },
      { value: 'not_submitted', label: 'Not submitted' },
    ],
  },
  {
    field: 'last_active_date',
    label: 'Last active date',
    operators: ['before', 'after', 'between', 'last_x_days', 'never'],
    valueType: 'date',
  },
  {
    field: 'first_purchase',
    label: 'First purchase',
    operators: ['eq'],
    valueType: 'enum',
    options: [
      { value: 'completed', label: 'Completed' },
      { value: 'not_completed', label: 'Not completed' },
    ],
  },
  {
    field: 'last_purchase_date',
    label: 'Last purchase date',
    operators: ['before', 'after', 'between', 'last_x_days', 'never'],
    valueType: 'date',
  },
  {
    field: 'total_purchase_amount',
    label: 'Total purchase amount',
    operators: ['gt', 'lt', 'between'],
    valueType: 'number',
  },
  {
    field: 'number_of_purchases',
    label: 'Number of purchases',
    operators: ['gt', 'lt', 'between', 'eq'],
    valueType: 'number',
  },
  {
    field: 'current_balance',
    label: 'Current balance',
    operators: ['gt', 'lt', 'between'],
    valueType: 'number',
  },
  {
    field: 'marketing_eligibility',
    label: 'Marketing eligibility',
    operators: ['eq'],
    valueType: 'enum',
    options: [
      { value: 'eligible', label: 'Eligible' },
      { value: 'not_eligible', label: 'Not eligible' },
    ],
  },
];

export function getFilterFieldDef(
  field: EmailCampaignFilterField,
): EmailCampaignFilterFieldDef | undefined {
  return EMAIL_CAMPAIGN_FILTER_FIELDS.find((row) => row.field === field);
}

export function createFilterRow(
  field: EmailCampaignFilterField = 'account_status',
): EmailCampaignFilterRow {
  const def = getFilterFieldDef(field) || EMAIL_CAMPAIGN_FILTER_FIELDS[0];
  return {
    id: `filter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    field: def.field,
    operator: def.operators[0],
    value: '',
    value_to: '',
  };
}
