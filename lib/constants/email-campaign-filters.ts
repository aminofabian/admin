import type {
  EmailCampaignFilterField,
  EmailCampaignFilterOperator,
  EmailCampaignFilterRow,
} from '@/types';

export interface EmailCampaignFilterFieldDef {
  field: EmailCampaignFilterField;
  label: string;
  operators: EmailCampaignFilterOperator[];
  valueType: 'enum' | 'number' | 'date' | 'days' | 'states';
  options?: { value: string; label: string }[];
  /** Can map into current broadcast create payload */
  sendSupported: boolean;
  /** Can approximate via players list API */
  previewSupported: boolean;
}

export const EMAIL_CAMPAIGN_FILTER_OPERATOR_LABELS: Record<
  EmailCampaignFilterOperator,
  string
> = {
  is: 'Is',
  is_not: 'Is not',
  before: 'Before',
  after: 'After',
  between: 'Between',
  last_x_days: 'Last X days',
  never: 'Never',
  greater_than: 'Greater than',
  less_than: 'Less than',
  equal_to: 'Equal to',
  in: 'In',
};

export const EMAIL_CAMPAIGN_FILTER_FIELDS: EmailCampaignFilterFieldDef[] = [
  {
    field: 'account_status',
    label: 'Account status',
    operators: ['is'],
    valueType: 'enum',
    options: [
      { value: 'active', label: 'Active' },
      { value: 'inactive', label: 'Inactive' },
    ],
    sendSupported: false,
    previewSupported: true,
  },
  {
    field: 'registration_date',
    label: 'Registration date',
    operators: ['before', 'after', 'between', 'last_x_days'],
    valueType: 'date',
    sendSupported: false,
    previewSupported: true,
  },
  {
    field: 'email_verification',
    label: 'Email verification',
    operators: ['is'],
    valueType: 'enum',
    options: [
      { value: 'verified', label: 'Verified' },
      { value: 'not_verified', label: 'Not verified' },
    ],
    sendSupported: false,
    previewSupported: false,
  },
  {
    field: 'kyc_status',
    label: 'KYC status',
    operators: ['is'],
    valueType: 'enum',
    options: [
      { value: 'approved', label: 'Verified' },
      { value: 'rejected', label: 'Rejected' },
      { value: 'pending', label: 'Pending' },
      { value: 'not_submitted', label: 'Not submitted' },
    ],
    sendSupported: false,
    previewSupported: true,
  },
  {
    field: 'ssn_verified',
    label: 'SSN verification',
    operators: ['is'],
    valueType: 'enum',
    options: [
      { value: 'true', label: 'Verified' },
      { value: 'false', label: 'Unverified' },
    ],
    sendSupported: true,
    previewSupported: false,
  },
  {
    field: 'last_active_date',
    label: 'Last active date',
    operators: ['before', 'after', 'between', 'last_x_days', 'never'],
    valueType: 'date',
    sendSupported: false,
    previewSupported: false,
  },
  {
    field: 'first_purchase',
    label: 'First purchase',
    operators: ['is'],
    valueType: 'enum',
    options: [
      { value: 'completed', label: 'Completed' },
      { value: 'not_completed', label: 'Not completed' },
    ],
    sendSupported: false,
    previewSupported: true,
  },
  {
    field: 'last_purchase_date',
    label: 'Last purchase date',
    operators: ['before', 'after', 'between', 'last_x_days', 'never'],
    valueType: 'date',
    sendSupported: false,
    previewSupported: false,
  },
  {
    field: 'total_purchase_amount',
    label: 'Total purchase amount',
    operators: ['greater_than', 'less_than', 'between'],
    valueType: 'number',
    sendSupported: true,
    previewSupported: false,
  },
  {
    field: 'number_of_purchases',
    label: 'Number of purchases',
    operators: ['greater_than', 'less_than', 'between', 'equal_to'],
    valueType: 'number',
    sendSupported: false,
    previewSupported: false,
  },
  {
    field: 'current_balance',
    label: 'Current balance',
    operators: ['greater_than', 'less_than', 'between'],
    valueType: 'number',
    sendSupported: false,
    previewSupported: false,
  },
  {
    field: 'marketing_eligibility',
    label: 'Marketing eligibility',
    operators: ['is'],
    valueType: 'enum',
    options: [
      { value: 'eligible', label: 'Eligible' },
      { value: 'not_eligible', label: 'Not eligible' },
    ],
    sendSupported: false,
    previewSupported: false,
  },
  {
    field: 'state',
    label: 'State',
    operators: ['in'],
    valueType: 'states',
    sendSupported: true,
    previewSupported: true,
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
