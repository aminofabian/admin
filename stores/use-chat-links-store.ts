import { create } from 'zustand';
import { chatLinksApi } from '@/lib/api';
import type { ChatLink, UpdateChatLinkRequest } from '@/types';

interface ChatLinksState {
  chatLinks: ChatLink[];
  isLoading: boolean;
  error: string | null;
}

interface ChatLinksActions {
  fetchChatLinks: () => Promise<void>;
  updateChatLink: (id: number, data: UpdateChatLinkRequest) => Promise<ChatLink>;
  reset: () => void;
}

type ChatLinksStore = ChatLinksState & ChatLinksActions;

const initialState: ChatLinksState = {
  chatLinks: [],
  isLoading: false,
  error: null,
};

export const useChatLinksStore = create<ChatLinksStore>((set, get) => ({
  ...initialState,

  fetchChatLinks: async () => {
    set({ isLoading: true, error: null });

    try {
      const data = await chatLinksApi.list();

      // Ensure data is always an array
      const linksArray = Array.isArray(data) ? data : [];

      set({
        chatLinks: linksArray,
        isLoading: false,
        error: null,
      });
    } catch (err: unknown) {
      let errorMessage = 'Failed to load chat links';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);

        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to view chat links.';
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

  updateChatLink: async (id: number, data: UpdateChatLinkRequest) => {
    try {
      const chatLink = await chatLinksApi.update(id, data);

      if (!chatLink) {
        throw new Error('No data returned from server');
      }

      const updatedLinks = get().chatLinks.map((link) =>
        link.id === id ? chatLink : link
      );

      set({ chatLinks: updatedLinks });

      return chatLink;
    } catch (err: unknown) {
      let errorMessage = 'Failed to update chat link';

      if (err && typeof err === 'object' && 'detail' in err) {
        errorMessage = String(err.detail);

        if (errorMessage.toLowerCase().includes('permission')) {
          errorMessage = 'Access Denied: You need company or superadmin privileges to update chat links.';
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

