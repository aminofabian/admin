export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
export const API_VERSION = 'v1';
export const API_PREFIX = `/api/${API_VERSION}`;

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/users/login/',
    DASHBOARD_GAMES: '/users/dashboard-games/',
  },
  COMPANIES: {
    LIST: `${API_PREFIX}/companies/`,
    DETAIL: (id: number) => `${API_PREFIX}/companies/${id}/`,
  },
  MANAGERS: {
    LIST: `${API_PREFIX}/managers/`,
    DETAIL: (id: number) => `${API_PREFIX}/managers/${id}/`,
  },
  AGENTS: {
    LIST: `${API_PREFIX}/agents/`,
    DETAIL: (id: number) => `${API_PREFIX}/agents/${id}/`,
  },
  STAFFS: {
    LIST: `${API_PREFIX}/staffs/`,
    DETAIL: (id: number) => `${API_PREFIX}/staffs/${id}/`,
  },
  PLAYERS: {
    LIST: `${API_PREFIX}/players/`,
    DETAIL: (id: number) => `${API_PREFIX}/players/${id}/`,
  },
  GAMES: {
    LIST: `${API_PREFIX}/games/`,
    DETAIL: (id: number) => `${API_PREFIX}/games/${id}/`,
    USER_GAMES: `${API_PREFIX}/user-games/`,
    CHECK_STORE_BALANCE: `${API_PREFIX}/check-store-balance/`,
  },
  TRANSACTIONS: {
    LIST: `${API_PREFIX}/transactions/`,
    QUEUES: `${API_PREFIX}/transaction-queues/`,
  },
  BONUSES: {
    PURCHASE: `${API_PREFIX}/purchase-bonuses/`,
    RECHARGE: `${API_PREFIX}/recharge-bonuses/`,
    TRANSFER: `${API_PREFIX}/transfer-bonuses/`,
    SIGNUP: `${API_PREFIX}/signup-bonuses/`,
  },
  BANNERS: {
    LIST: `${API_PREFIX}/admin-banners/`,
    DETAIL: (id: number) => `${API_PREFIX}/admin-banners/${id}/`,
  },
  AFFILIATES: {
    LIST: `${API_PREFIX}/affiliates/`,
    DETAIL: (id: number) => `${API_PREFIX}/affiliates/${id}/`,
    ADD_MANUAL: `${API_PREFIX}/add-manual-affiliate/`,
    DEFAULTS: `${API_PREFIX}/affiliate-defaults/`,
  },
  DASHBOARD: {
    STATS: `${API_PREFIX}/dashboard/stats/`,
  },
} as const;

export const TOKEN_KEY = 'auth_token';
export const REFRESH_TOKEN_KEY = 'refresh_token';
export const PROJECT_UUID_KEY = 'whitelabel_admin_uuid';
export const PROJECT_DOMAIN = process.env.NEXT_PUBLIC_PROJECT_DOMAIN || 'https://serverhub.biz';

