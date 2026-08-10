import {
  mapFilterRowsToBroadcastCriteria,
  mapFilterRowsToPlayerListParams,
  migrateLegacyFiltersToRows,
  validateFilterRows,
} from '../email-campaign-filters';

describe('email campaign filters', () => {
  it('migrates legacy deposit/ssn/state into filter rows', () => {
    const rows = migrateLegacyFiltersToRows({
      deposit_min: '50',
      deposit_max: '500',
      ssn_filter: 'verified',
      states: ['CA', 'TX'],
    });
    expect(rows).toHaveLength(3);
    expect(rows[0].field).toBe('total_purchase_amount');
    expect(rows[0].operator).toBe('between');
    expect(rows[1].field).toBe('ssn_verified');
    expect(rows[2].field).toBe('state');
  });

  it('maps purchase/ssn/state rows to broadcast criteria', () => {
    const rows = migrateLegacyFiltersToRows({
      deposit_min: '50',
      deposit_max: '500',
      ssn_filter: 'verified',
      states: ['CA'],
    });
    const criteria = mapFilterRowsToBroadcastCriteria(rows, 'all');
    expect(criteria.deposit_min).toBe(50);
    expect(criteria.deposit_max).toBe(500);
    expect(criteria.ssn_verified).toBe(true);
    expect(criteria.states).toEqual(['California']);
    expect(criteria.match_mode).toBe('all');
  });

  it('maps preview-supported rows to player list params', () => {
    const { params, unsupported } = mapFilterRowsToPlayerListParams([
      {
        id: '1',
        field: 'account_status',
        operator: 'is',
        value: 'active',
      },
      {
        id: '2',
        field: 'first_purchase',
        operator: 'is',
        value: 'completed',
      },
      {
        id: '3',
        field: 'total_purchase_amount',
        operator: 'greater_than',
        value: '100',
      },
    ]);
    expect(params.status).toBe('active');
    expect(params.first_deposit_done).toBe(true);
    expect(unsupported).toContain('Total purchase amount');
  });

  it('validates required filter values', () => {
    const errors = validateFilterRows([
      { id: '1', field: 'account_status', operator: 'is', value: '' },
    ]);
    expect(errors[0]).toMatch(/value is required/i);
  });
});
