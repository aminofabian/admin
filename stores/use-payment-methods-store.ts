import { create } from 'zustand';
import { paymentMethodsApi } from '@/lib/api';
import type {
  PaymentMethod,
  PaymentMethodAction,
  PaymentMethodsListResponse,
  UpdatePaymentMethodRequest,
} from '@/types';

interface PaymentMethodsState {
  paymentMethods: PaymentMethodsListResponse | null;
  isLoading: boolean;
  error: string | null;
}

interface UpdatePaymentMethodParams {
  id: number;
  action: PaymentMethodAction;
  value: boolean;
}

interface PaymentMethodsActions {
  fetchPaymentMethods: () => Promise<void>;
  updatePaymentMethod: (params: UpdatePaymentMethodParams) => Promise<void>;
  reset: () => void;
}

type PaymentMethodsStore = PaymentMethodsState & PaymentMethodsActions;

const initialState: PaymentMethodsState = {
  paymentMethods: null,
  isLoading: false,
  error: null,
};

const normalizeMethods = (methods: PaymentMethod[]): PaymentMethod[] =>
  methods.map((method) => ({
    ...method,
    is_enabled_for_cashout: Boolean(method.is_enabled_for_cashout),
    is_enabled_for_purchase: Boolean(method.is_enabled_for_purchase),
  }));

export const usePaymentMethodsStore = create<PaymentMethodsStore>((set, get) => ({
  ...initialState,

  fetchPaymentMethods: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await paymentMethodsApi.list();

      set({
        paymentMethods: {
          cashout: normalizeMethods(data.cashout ?? []),
          purchase: normalizeMethods(data.purchase ?? []),
        },
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load payment methods';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);

        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need proper privileges to view payment methods.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      set({
        error: errorMessage,
        isLoading: false,
      });
    }
  },

  updatePaymentMethod: async ({ id, action, value }: UpdatePaymentMethodParams) => {
    try {
      const payload: UpdatePaymentMethodRequest =
        action === 'cashout'
          ? { is_enabled_for_cashout: value }
          : { is_enabled_for_purchase: value };

      await paymentMethodsApi.patch(id, payload);

      const currentPaymentMethods = get().paymentMethods;
      if (currentPaymentMethods) {
        const updateList = (methods: PaymentMethod[]) =>
          methods.map((method) => {
            if (method.id !== id) {
              return method;
            }

            if (action === 'cashout') {
              return { ...method, is_enabled_for_cashout: value };
            }

            return { ...method, is_enabled_for_purchase: value };
          });

        set({
          paymentMethods: {
            cashout: updateList(currentPaymentMethods.cashout),
            purchase: updateList(currentPaymentMethods.purchase),
          },
        });
      }
    } catch (err: unknown) {
      let errorMessage = 'Failed to update payment method';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);

        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need proper privileges to update payment methods.';
        }
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }

      set({ error: errorMessage });
      throw new Error(errorMessage);
    }
  },

  reset: () => {
    set(initialState);
  },
}));

