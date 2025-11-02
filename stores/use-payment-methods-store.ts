import { create } from 'zustand';
import { paymentMethodsApi } from '@/lib/api';
import type { 
  PaymentMethod,
  UpdatePaymentMethodRequest,
  PaginatedResponse,
} from '@/types';

interface PaymentMethodsState {
  paymentMethods: PaginatedResponse<PaymentMethod> | null;
  isLoading: boolean;
  error: string | null;
}

interface PaymentMethodsActions {
  fetchPaymentMethods: () => Promise<void>;
  updatePaymentMethod: (id: number, data: UpdatePaymentMethodRequest) => Promise<void>;
  reset: () => void;
}

type PaymentMethodsStore = PaymentMethodsState & PaymentMethodsActions;

const initialState: PaymentMethodsState = {
  paymentMethods: null,
  isLoading: false,
  error: null,
};

export const usePaymentMethodsStore = create<PaymentMethodsStore>((set, get) => ({
  ...initialState,

  fetchPaymentMethods: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await paymentMethodsApi.list();
      
      set({ 
        paymentMethods: data, 
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

  updatePaymentMethod: async (id: number, data: UpdatePaymentMethodRequest) => {
    try {
      await paymentMethodsApi.patch(id, data);
      
      // Optimistically update local state
      const currentPaymentMethods = get().paymentMethods;
      if (currentPaymentMethods) {
        set({
          paymentMethods: {
            ...currentPaymentMethods,
            results: currentPaymentMethods.results.map(method => {
              if (method.id === id) {
                return { ...method, ...data };
              }
              return method;
            }),
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

