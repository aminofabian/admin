const isBrowser = typeof window !== 'undefined';

export const storage = {
  get: (key: string): string | null => {
    if (!isBrowser) return null;
    return localStorage.getItem(key);
  },

  set: (key: string, value: string): void => {
    if (!isBrowser) return;
    localStorage.setItem(key, value);
  },

  remove: (key: string): void => {
    if (!isBrowser) return;
    localStorage.removeItem(key);
  },

  clear: (): void => {
    if (!isBrowser) return;
    localStorage.clear();
  },
};

