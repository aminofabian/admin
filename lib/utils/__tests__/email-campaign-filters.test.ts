import {
  mapFilterRowsToBroadcastPayload,
  migrateLegacyFiltersToRows,
  validateFilterRows,
} from '../email-campaign-filters';

describe('email campaign filters', () => {
  it('migrates legacy deposit criteria into total purchase amount rows', () => {
    const rows = migrateLegacyFiltersToRows({
      deposit_min: '50',
      deposit_max: '500',
    });
    expect(rows).toHaveLength(1);
    expect(rows[0].field).toBe('total_purchase_amount');
    expect(rows[0].operator).toBe('between');
    expect(rows[0].value).toBe('50');
    expect(rows[0].value_to).toBe('500');
  });

  it('drops legacy ssn/state rows that have no new backend equivalent', () => {
    const rows = migrateLegacyFiltersToRows({
      filter_rows: [
        { id: '1', field: 'ssn_verified', operator: 'is', value: 'true' },
        { id: '2', field: 'state', operator: 'in', value: 'CA' },
        { id: '3', field: 'account_status', operator: 'is', value: 'active' },
      ],
    } as never);
    expect(rows).toHaveLength(1);
    expect(rows[0].field).toBe('account_status');
    expect(rows[0].operator).toBe('eq');
  });

  it('upgrades legacy operator names to the new wire operators', () => {
    const rows = migrateLegacyFiltersToRows({
      filter_rows: [
        { id: '1', field: 'total_purchase_amount', operator: 'greater_than', value: '100' },
        { id: '2', field: 'kyc_status', operator: 'is', value: 'approved' },
      ],
    } as never);
    expect(rows[0].operator).toBe('gt');
    expect(rows[0].value).toBe('100');
    expect(rows[1].field).toBe('kyc_status');
    expect(rows[1].value).toBe('verified');
  });

  it('maps rows to the { field, op, value } wire format', () => {
    const rows = migrateLegacyFiltersToRows({
      deposit_min: '50',
      deposit_max: '500',
    });
    rows.push(
      { id: '2', field: 'account_status', operator: 'eq', value: 'active' },
      { id: '3', field: 'last_active_date', operator: 'never', value: '' },
      { id: '4', field: 'registration_date', operator: 'last_x_days', value: '30' },
    );
    const payload = mapFilterRowsToBroadcastPayload(rows, 'all');
    expect(payload.filter_match).toBe('all');
    expect(payload.filters).toEqual([
      { field: 'total_purchase_amount', op: 'between', value: [50, 500] },
      { field: 'account_status', op: 'eq', value: 'active' },
      { field: 'last_active_date', op: 'never', value: null },
      { field: 'registration_date', op: 'last_x_days', value: 30 },
    ]);
  });

  it('skips incomplete between rows when building the payload', () => {
    const payload = mapFilterRowsToBroadcastPayload(
      [
        { id: '1', field: 'total_purchase_amount', operator: 'between', value: '50', value_to: '' },
      ],
      'any',
    );
    expect(payload.filters).toEqual([]);
    expect(payload.filter_match).toBe('any');
  });

  it('validates required filter values', () => {
    const errors = validateFilterRows([
      { id: '1', field: 'account_status', operator: 'eq', value: '' },
    ]);
    expect(errors[0]).toMatch(/value is required/i);
  });

  it('validates between ranges', () => {
    const errors = validateFilterRows([
      { id: '1', field: 'total_purchase_amount', operator: 'between', value: '50', value_to: '' },
    ]);
    expect(errors[0]).toMatch(/both values are required/i);
  });
});
