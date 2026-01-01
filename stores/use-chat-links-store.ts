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
      // Don't set error state if it's an auth error (redirect is happening)
      if (err && typeof err === 'object' && '_isAuthError' in err && (err as { _isAuthError?: boolean })._isAuthError) {
        set({ isLoading: false });
        return;
      }

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
    const currentLinks = get().chatLinks;
    const existingLink = currentLinks.find((link) => link.id === id);

    if (!existingLink) {
      throw new Error('Chat link not found');
    }

    // Optimistic update - update UI immediately
    const optimisticLinks = currentLinks.map((link) =>
      link.id === id ? { ...link, ...data } : link
    );
    set({ chatLinks: optimisticLinks });

    try {
      const chatLink = await chatLinksApi.update(id, data);

      if (!chatLink) {
        throw new Error('No data returned from server');
      }

      // Merge the updated fields with the existing chat link to preserve all fields
      const updatedLinks = optimisticLinks.map((link) =>
        link.id === id ? { ...link, ...chatLink } : link
      );

      set({ chatLinks: updatedLinks });

      // Return the merged chat link
      const mergedChatLink = updatedLinks.find((link) => link.id === id);
      return mergedChatLink || chatLink;
    } catch (err: unknown) {
      // Don't set error state if it's an auth error (redirect is happening)
      if (err && typeof err === 'object' && '_isAuthError' in err && (err as { _isAuthError?: boolean })._isAuthError) {
        // Revert optimistic update
        set({ chatLinks: currentLinks });
        // Re-throw to allow callers to handle it (though redirect is happening)
        throw err;
      }

      // Revert optimistic update on error
      set({ chatLinks: currentLinks });

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

