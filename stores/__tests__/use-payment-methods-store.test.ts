import { beforeEach, describe, expect, it, vi } from 'vitest';
import { paymentMethodsApi } from '@/lib/api';
import { usePaymentMethodsStore } from '@/stores';
import type { PaymentMethod, PurchasePaymentMethod } from '@/types';

vi.mock('@/lib/api', () => ({
  paymentMethodsApi: {
    list: vi.fn(),
    patch: vi.fn(),
  },
}));

const METHOD_ID = 7;
const METHOD_CODE = 'alchemypay';
const METHOD_DISPLAY_NAME = 'Alchemypay';
const METHOD_TYPE = 'brenzi';
const CREATED_AT = '2025-10-31T18:56:33.718748Z';
const MODIFIED_AT = '2025-11-08T01:57:48.591264Z';

const createMethod = (overrides: Partial<PaymentMethod> = {}): PaymentMethod => ({
  id: METHOD_ID,
  payment_method: METHOD_CODE,
  payment_method_display: METHOD_DISPLAY_NAME,
  method_type: METHOD_TYPE,
  is_enabled_for_cashout: false,
  is_enabled_for_purchase: true,
  created: CREATED_AT,
  modified: MODIFIED_AT,
  ...overrides,
});

describe('usePaymentMethodsStore', () => {
  const apiMock = vi.mocked(paymentMethodsApi);

  beforeEach(() => {
    vi.clearAllMocks();
    usePaymentMethodsStore.getState().reset();
  });

  it('fetchPaymentMethods stores normalized cashout and purchase lists', async () => {
    apiMock.list.mockResolvedValue({
      cashout: [
        createMethod({ is_enabled_for_cashout: false }),
      ],
      purchase: [
        createMethod({
          id: METHOD_ID + 1,
          is_enabled_for_cashout: true,
          is_enabled_for_purchase: true,
        }),
      ],
    });

    await usePaymentMethodsStore.getState().fetchPaymentMethods();

    const state = usePaymentMethodsStore.getState();
    expect(apiMock.list).toHaveBeenCalledTimes(1);
    expect(state.paymentMethods).not.toBeNull();
    expect(state.paymentMethods?.cashout).toHaveLength(1);
    expect(state.paymentMethods?.purchase).toHaveLength(1);
    expect(state.paymentMethods?.cashout[0].is_enabled_for_cashout).toBe(false);
    expect(state.paymentMethods?.purchase[0].is_enabled_for_purchase).toBe(true);
    expect(state.isLoading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('updatePaymentMethod toggles status for targeted action and keeps other flags intact', async () => {
    const cashoutMethod = createMethod({ is_enabled_for_cashout: false });
    const purchaseMethod = createMethod({
      is_enabled_for_cashout: false,
      is_enabled_for_purchase: true,
    });

    usePaymentMethodsStore.setState({
      paymentMethods: {
        cashout: [cashoutMethod],
        purchase: [purchaseMethod],
      },
      isLoading: false,
      error: null,
    });

    apiMock.patch.mockResolvedValue(createMethod());

    await usePaymentMethodsStore.getState().updatePaymentMethod({
      id: METHOD_ID,
      action: 'cashout',
      value: true,
    });

    const state = usePaymentMethodsStore.getState();
    expect(apiMock.patch).toHaveBeenCalledWith(METHOD_ID, { is_enabled_for_cashout: true });
    expect(state.paymentMethods?.cashout[0].is_enabled_for_cashout).toBe(true);
    expect(state.paymentMethods?.purchase[0].is_enabled_for_cashout).toBe(true);
    expect(state.paymentMethods?.purchase[0].is_enabled_for_purchase).toBe(true);
  });

  it('fetchPaymentMethods excludes purchase subcategories when superadmin has not enabled purchase', async () => {
    const nestedPurchase: PurchasePaymentMethod[] = [
      {
        payment_method: 'card',
        payment_method_display: 'Card',
        enabled_for_purchase_by_superadmin: true,
        has_subcategories: true,
        subcategories: [
          {
            id: 101,
            payment_method: 'banxa',
            payment_method_display: 'Banxa',
            is_configured: true,
            enabled_for_purchase_by_superadmin: false,
            is_enabled_for_purchase: false,
          },
          {
            id: 102,
            payment_method: 'moonpay',
            payment_method_display: 'Moonpay',
            is_configured: true,
            enabled_for_purchase_by_superadmin: true,
            is_enabled_for_purchase: true,
          },
        ],
      },
    ];

    apiMock.list.mockResolvedValue({
      cashout: [],
      purchase: nestedPurchase,
    });

    await usePaymentMethodsStore.getState().fetchPaymentMethods();

    const state = usePaymentMethodsStore.getState();
    expect(state.paymentMethods?.purchase).toHaveLength(1);
    expect(state.paymentMethods?.purchase[0].id).toBe(102);
    expect(state.purchaseCategories?.[0].subcategories).toHaveLength(1);
    expect(state.purchaseCategories?.[0].subcategories[0].id).toBe(102);
  });
});

